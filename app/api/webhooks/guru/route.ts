import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { sendAccessEmail } from '@/lib/email/access-email';

export const dynamic = 'force-dynamic';

type GuruPayload = Record<string, unknown>;

const APPROVED_STATUSES = new Set(['approved', 'paid', 'payment_approved', 'completed', 'active']);
// Status que REVOGAM o acesso (reembolso efetivado, chargeback, cancelamento, disputa).
// "Reembolso solicitado" (refund requested) NAO entra aqui de proposito.
const REVOKE_STATUSES = new Set(['refunded', 'chargeback', 'canceled', 'cancelled', 'dispute', 'in_dispute']);

function readPath(payload: GuruPayload, paths: string[]) {
  for (const path of paths) {
    const value = path.split('.').reduce<unknown>((current, key) => {
      if (!current || typeof current !== 'object') return undefined;
      return (current as Record<string, unknown>)[key];
    }, payload);

    if ((typeof value === 'string' || typeof value === 'number') && String(value).trim()) {
      return String(value).trim();
    }
  }

  return null;
}

function getStatus(payload: GuruPayload) {
  return readPath(payload, ['status', 'transaction.status', 'order.status', 'payment.status']);
}

function getEventId(payload: GuruPayload) {
  return readPath(payload, ['id', 'transaction.id', 'order.id', 'sale.id', 'purchase.id']);
}

function getEmail(payload: GuruPayload) {
  return readPath(payload, ['contact.email', 'customer.email', 'buyer.email', 'email'])?.toLowerCase();
}

function getName(payload: GuruPayload) {
  return readPath(payload, ['contact.name', 'customer.name', 'buyer.name', 'name']);
}

function getPhone(payload: GuruPayload) {
  const number = readPath(payload, [
    'contact.phone_number',
    'contact.phone',
    'customer.phone',
    'buyer.phone',
    'phone'
  ]);
  if (!number) return null;

  const digits = number.replace(/\D/g, '');
  const countryCode = readPath(payload, ['contact.phone_local_code'])?.replace(/\D/g, '') || '55';
  return digits.startsWith(countryCode) ? digits : `${countryCode}${digits}`;
}

function getProduct(payload: GuruPayload) {
  return {
    id: readPath(payload, ['product.id', 'product.marketplace_id', 'items.0.id']),
    internalId: readPath(payload, ['product.internal_id', 'items.0.internal_id']),
    name: readPath(payload, ['product.name', 'items.0.name', 'offer.name']) || 'Produto Guru'
  };
}

// Varre o payload INTEIRO e coleta os ids de oferta de TODOS os produtos comprados
// (principal + order bumps + upsells). Antes olhava so o produto principal e o
// primeiro item, por isso o bump nao era liberado.
function collectOfferCandidates(payload: GuruPayload) {
  const found = new Set<string>();
  const add = (value: unknown) => {
    if (typeof value === 'string' || typeof value === 'number') {
      const texto = String(value).trim();
      if (texto) found.add(texto);
    }
  };

  const walk = (node: unknown) => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    const obj = node as Record<string, unknown>;
    // Um no e "produto" quando tem oferta/marketplace_id, ou nome + id.
    // Ignoramos nos de contato (tem email/telefone) pra nao coletar id de pessoa.
    const pareceContato = 'email' in obj || 'phone' in obj || 'phone_number' in obj || 'doc' in obj;
    const pareceProduto =
      'offer' in obj || 'offer_id' in obj || 'marketplace_id' in obj || ('name' in obj && 'id' in obj);
    if (pareceProduto && !pareceContato) {
      add(obj.id);
      add(obj.marketplace_id);
      add(obj.internal_id);
      add(obj.offer_id);
      if (obj.offer && typeof obj.offer === 'object') {
        const offer = obj.offer as Record<string, unknown>;
        add(offer.id);
        add(offer.marketplace_id);
        add(offer.internal_id);
      }
    }
    for (const value of Object.values(obj)) {
      if (value && typeof value === 'object') walk(value);
    }
  };

  walk(payload);
  return Array.from(found);
}

function getCourseSlug(payload: GuruPayload) {
  const product = getProduct(payload);
  const configuredMap = process.env.GURU_PRODUCT_COURSE_MAP?.trim();

  if (configuredMap) {
    try {
      const map = JSON.parse(configuredMap) as Record<string, string>;
      const mapped = (product.id && map[product.id]) || (product.internalId && map[product.internalId]);
      if (mapped) return mapped;
    } catch {
      throw new Error('GURU_PRODUCT_COURSE_MAP is not valid JSON.');
    }
  }

  const normalizedName = product.name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  if (normalizedName.includes('evs') || normalizedName.includes('equipe que vende sozinha')) {
    return 'evs';
  }

  return process.env.DEFAULT_COURSE_SLUG?.trim() || null;
}

function isAuthorized(payload: GuruPayload) {
  const expectedToken = process.env.GURU_WEBHOOK_TOKEN?.trim();
  const receivedToken = readPath(payload, ['api_token']);
  return Boolean(expectedToken && receivedToken && expectedToken === receivedToken);
}

function academyUrl() {
  return (process.env.ACADEMY_URL || 'https://academia.suzanazatorre.com.br').replace(/\/$/, '');
}

function firstName(fullName: string | null) {
  return fullName?.trim().split(/\s+/)[0] || 'Aluna';
}

// Remove dados sensiveis antes de gravar o payload cru (so pra diagnostico).
const SENSITIVE_KEYS = new Set([
  'api_token', 'token', 'secret', 'password', 'senha',
  'document', 'doc', 'cpf', 'cnpj', 'rg',
  'email', 'phone', 'phone_number', 'phone_local_code',
  'ip', 'address', 'zip_code', 'zipcode', 'cep',
  'card', 'card_number', 'credit_card', 'holder', 'holder_name'
]);
function redactSensitive(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactSensitive);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      out[key] = SENSITIVE_KEYS.has(key.toLowerCase()) ? '[redacted]' : redactSensitive(val);
    }
    return out;
  }
  return value;
}

async function markEvent(
  supabase: NonNullable<ReturnType<typeof createSupabaseAdminClient>>,
  eventLogId: string | undefined,
  values: { processed?: boolean; error?: string | null }
) {
  if (eventLogId) await supabase.from('webhook_events').update(values).eq('id', eventLogId);
}

export async function POST(request: Request) {
  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: 'Supabase admin credentials are missing.' }, { status: 500 });
  }

  let payload: GuruPayload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON payload.' }, { status: 400 });
  }

  if (!isAuthorized(payload)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized webhook.' }, { status: 401 });
  }

  const status = getStatus(payload)?.toLowerCase();
  const eventId = getEventId(payload);
  const email = getEmail(payload);
  const name = getName(payload);
  const phone = getPhone(payload);
  const product = getProduct(payload);
  const offerCandidates = collectOfferCandidates(payload);

  if (!eventId) return NextResponse.json({ ok: false, error: 'Guru transaction id was not found.' }, { status: 400 });

  let dedupQuery = supabase
    .from('webhook_events')
    .select('id')
    .eq('source', 'guru')
    .eq('external_id', eventId)
    .eq('processed', true);
  // Deduplica por (id da transacao + status): o 'approved' e o 'refunded' da mesma
  // venda sao eventos distintos, mas um mesmo status repetido continua barrado.
  if (status) dedupQuery = dedupQuery.eq('event_type', status);
  const { data: previousEvent } = await dedupQuery.maybeSingle();

  if (previousEvent) {
    return NextResponse.json({ ok: true, duplicate: true, transaction_id: eventId });
  }

  // Deliberately avoid storing Guru's token, CPF, address, IP or payment details.
  const { data: eventLog } = await supabase
    .from('webhook_events')
    .insert({
      source: 'guru',
      event_type: status,
      external_id: eventId,
      payload: { email, phone, product_id: product.id, product_name: product.name, status, offer_candidates: offerCandidates, raw: redactSensitive(payload) },
      processed: false
    })
    .select('id')
    .single();

  // Reembolso / chargeback / cancelamento / disputa -> revoga o acesso e encerra.
  // Nao cria usuaria nem dispara Pabbly.
  if (status && REVOKE_STATUSES.has(status)) {
    const revokedAt = new Date().toISOString();
    let refundProfileId: string | null = null;
    if (email) {
      const { data: refundProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .maybeSingle();
      refundProfileId = refundProfile?.id || null;
    }

    let revokedCount = 0;

    // Caminho 1: revoga pelas matriculas com este id de transacao (external_order_id).
    const { data: revokedByOrder } = await supabase
      .from('enrollments')
      .update({ status: 'revoked', updated_at: revokedAt })
      .eq('external_order_id', eventId)
      .eq('status', 'active')
      .select('id');
    revokedCount += (revokedByOrder || []).length;

    // Caminho 2 (rede de seguranca): por e-mail + cursos dos planos das ofertas reembolsadas.
    if (!revokedCount && refundProfileId && offerCandidates.length) {
      const { data: plansRefund } = await supabase
        .from('plans')
        .select('plan_courses(course_id)')
        .in('offer_id', offerCandidates);
      const courseIds = Array.from(
        new Set(
          (plansRefund || [])
            .flatMap((plan: any) => (plan.plan_courses || []).map((row: any) => row.course_id))
            .filter(Boolean)
        )
      );
      if (courseIds.length) {
        const { data: revokedByPlan } = await supabase
          .from('enrollments')
          .update({ status: 'revoked', updated_at: revokedAt })
          .eq('profile_id', refundProfileId)
          .in('course_id', courseIds)
          .eq('status', 'active')
          .select('id');
        revokedCount += (revokedByPlan || []).length;
      }
    }

    await markEvent(supabase, eventLog?.id, { processed: true, error: null });
    return NextResponse.json({
      ok: true,
      action: 'revoked',
      status,
      transaction_id: eventId,
      revoked: revokedCount
    });
  }

  if (!status || !APPROVED_STATUSES.has(status)) {
    await markEvent(supabase, eventLog?.id, { processed: true });
    return NextResponse.json({ ok: true, ignored: true, reason: 'Payment is not approved.' });
  }

  if (!email) {
    await markEvent(supabase, eventLog?.id, { error: 'Buyer email was not found.' });
    return NextResponse.json({ ok: false, error: 'Buyer email was not found.' }, { status: 400 });
  }

  // 1) Acha TODOS os planos das ofertas compradas (principal + bumps/upsells) e
  //    junta os cursos de todos, cada curso com a validade do seu proprio plano.
  let planName: string | null = null;
  let matchedPlanIds: string[] = [];
  let targetCourses: { id: string; slug: string; title: string; expiresAt: string | null }[] = [];

  if (offerCandidates.length) {
    const { data: plans } = await supabase
      .from('plans')
      .select('id, name, period_days, plan_courses(courses(id, slug, title))')
      .in('offer_id', offerCandidates);

    if (plans && plans.length) {
      const byCourse = new Map<string, { id: string; slug: string; title: string; expiresAt: string | null }>();
      const nomes: string[] = [];
      for (const plan of plans as any[]) {
        matchedPlanIds.push(plan.id);
        if (plan.name) nomes.push(plan.name);
        const exp = plan.period_days
          ? new Date(Date.now() + plan.period_days * 24 * 60 * 60 * 1000).toISOString()
          : null;
        for (const planCourse of plan.plan_courses || []) {
          const course = planCourse.courses;
          if (!course || !course.id) continue;
          const prev = byCourse.get(course.id);
          if (!prev) {
            byCourse.set(course.id, { id: course.id, slug: course.slug, title: course.title, expiresAt: exp });
          } else {
            // Curso em mais de um plano: fica com a validade mais generosa.
            const later =
              prev.expiresAt === null || exp === null
                ? null
                : new Date(exp) > new Date(prev.expiresAt)
                ? exp
                : prev.expiresAt;
            byCourse.set(course.id, { ...prev, expiresAt: later });
          }
        }
      }
      if (byCourse.size) {
        targetCourses = Array.from(byCourse.values());
        planName = nomes.join(' + ') || null;
      }
    }
  }

  // 2) Rede de seguranca: sem plano (ou plano sem cursos), usa o mapeamento antigo (1 curso).
  if (!targetCourses.length) {
    let courseSlug: string | null;
    try {
      courseSlug = getCourseSlug(payload);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid product mapping.';
      await markEvent(supabase, eventLog?.id, { error: message });
      return NextResponse.json({ ok: false, error: message }, { status: 500 });
    }

    if (!courseSlug) {
      const message = `Guru product is not mapped: ${product.id || product.name}`;
      await markEvent(supabase, eventLog?.id, { error: message });
      return NextResponse.json({ ok: false, error: message }, { status: 422 });
    }

    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('id, slug, title')
      .eq('slug', courseSlug)
      .single();

    if (courseError || !course) {
      const message = `Course not found: ${courseSlug}`;
      await markEvent(supabase, eventLog?.id, { error: message });
      return NextResponse.json({ ok: false, error: message }, { status: 404 });
    }

    targetCourses = [{ id: course.id, slug: course.slug, title: course.title, expiresAt: null }];
  }

  const primaryCourse = targetCourses[0];

  // A six-digit numeric password is easier to type from email or WhatsApp.
  // Generate it with Web Crypto and keep the first digit non-zero.
  const randomValue = crypto.getRandomValues(new Uint32Array(1))[0];
  const temporaryPassword = String(100000 + (randomValue % 900000));
  const { data: createdUser, error: createError } = await supabase.auth.admin.createUser({
    email,
    password: temporaryPassword,
    email_confirm: true,
    user_metadata: { name, phone, source: 'guru' }
  });

  if (createError && !createError.message.toLowerCase().includes('already registered')) {
    await markEvent(supabase, eventLog?.id, { error: createError.message });
    return NextResponse.json({ ok: false, error: createError.message }, { status: 500 });
  }

  const isNewUser = Boolean(createdUser.user);

  const { data: recovery, error: recoveryError } = await supabase.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: { redirectTo: `${academyUrl()}/recuperar-senha` }
  });

  if (recoveryError || !recovery?.properties?.action_link) {
    const message = recoveryError?.message || 'Could not generate the password setup link.';
    await markEvent(supabase, eventLog?.id, { error: message });
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }

  const profileId = createdUser.user?.id || recovery.user?.id;
  if (!profileId) {
    await markEvent(supabase, eventLog?.id, { error: 'Could not identify the Supabase user.' });
    return NextResponse.json({ ok: false, error: 'Could not identify the Supabase user.' }, { status: 409 });
  }

  const { error: profileError } = await supabase.from('profiles').upsert({
    id: profileId,
    email,
    name,
    phone,
    role: 'student',
    status: 'active'
  });

  if (profileError) {
    await markEvent(supabase, eventLog?.id, { error: profileError.message });
    return NextResponse.json({ ok: false, error: profileError.message }, { status: 500 });
  }

  const purchasedAt = new Date().toISOString();
  const enrollmentRows = targetCourses.map((item) => {
    const row: Record<string, unknown> = {
      profile_id: profileId,
      course_id: item.id,
      status: 'active',
      source: 'guru',
      external_order_id: eventId,
      purchased_at: purchasedAt
    };
    if (item.expiresAt) row.expires_at = item.expiresAt;
    return row;
  });

  const { error: enrollmentError } = await supabase
    .from('enrollments')
    .upsert(enrollmentRows, { onConflict: 'profile_id,course_id' });

  if (enrollmentError) {
    await markEvent(supabase, eventLog?.id, { error: enrollmentError.message });
    return NextResponse.json({ ok: false, error: enrollmentError.message }, { status: 500 });
  }

  // O acesso ja foi liberado (matriculas acima). Agora avisamos a aluna.
  // Nem o e-mail nem o WhatsApp sao fatais: se um falhar, o outro cobre e o acesso continua valendo.

  // 1) E-mail de acesso via Brevo (rede de seguranca principal). So para aluna nova.
  let emailStatus: 'sent' | 'failed' | 'skipped' = 'skipped';
  if (isNewUser && temporaryPassword) {
    const envio = await sendAccessEmail({
      email,
      name,
      tempPassword: temporaryPassword,
      courseName: planName || primaryCourse.title
    });
    emailStatus = envio.ok ? 'sent' : 'failed';
  }

  // 2) WhatsApp via Pabbly. Nao-fatal.
  let pabblyStatus: 'sent' | 'failed' | 'skipped' = 'skipped';
  const pabblyUrl = process.env.PABBLY_ACCESS_WEBHOOK_URL?.trim();
  if (pabblyUrl) {
    try {
      const pabblyResponse = await fetch(pabblyUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          event: 'academy_access_created',
          transaction_id: eventId,
          first_name: firstName(name),
          full_name: name,
          email,
          phone,
          product_id: product.id,
          product_name: product.name,
          plan_id: matchedPlanIds[0] || null,
          plan_name: planName,
          plan_ids: matchedPlanIds,
          course_slug: primaryCourse.slug,
          course_name: primaryCourse.title,
          courses: targetCourses.map((item) => ({ slug: item.slug, name: item.title })),
          access_expires_at: primaryCourse.expiresAt,
          academy_url: `${academyUrl()}/login`,
          is_new_user: isNewUser,
          temporary_password: isNewUser ? temporaryPassword : null,
          password_setup_url: recovery.properties.action_link
        }),
        cache: 'no-store'
      });
      pabblyStatus = pabblyResponse.ok ? 'sent' : 'failed';
    } catch {
      pabblyStatus = 'failed';
    }
  }

  await markEvent(supabase, eventLog?.id, { processed: true, error: null });

  return NextResponse.json({
    ok: true,
    transaction_id: eventId,
    plan: planName,
    courses: targetCourses.map((item) => item.slug),
    enrollment: 'active',
    pabbly: pabblyStatus,
    email: emailStatus
  });
}
