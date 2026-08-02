import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

type GuruPayload = Record<string, unknown>;

const APPROVED_STATUSES = new Set(['approved', 'paid', 'payment_approved', 'completed', 'active']);

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

  if (!eventId) return NextResponse.json({ ok: false, error: 'Guru transaction id was not found.' }, { status: 400 });

  const { data: previousEvent } = await supabase
    .from('webhook_events')
    .select('id')
    .eq('source', 'guru')
    .eq('external_id', eventId)
    .eq('processed', true)
    .maybeSingle();

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
      payload: { email, phone, product_id: product.id, product_name: product.name, status },
      processed: false
    })
    .select('id')
    .single();

  if (!status || !APPROVED_STATUSES.has(status)) {
    await markEvent(supabase, eventLog?.id, { processed: true });
    return NextResponse.json({ ok: true, ignored: true, reason: 'Payment is not approved.' });
  }

  if (!email) {
    await markEvent(supabase, eventLog?.id, { error: 'Buyer email was not found.' });
    return NextResponse.json({ ok: false, error: 'Buyer email was not found.' }, { status: 400 });
  }

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

  const temporaryPassword = `${crypto.randomUUID()}-${crypto.randomUUID()}`;
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

  const { error: enrollmentError } = await supabase.from('enrollments').upsert(
    {
      profile_id: profileId,
      course_id: course.id,
      status: 'active',
      source: 'guru',
      external_order_id: eventId,
      purchased_at: new Date().toISOString()
    },
    { onConflict: 'profile_id,course_id' }
  );

  if (enrollmentError) {
    await markEvent(supabase, eventLog?.id, { error: enrollmentError.message });
    return NextResponse.json({ ok: false, error: enrollmentError.message }, { status: 500 });
  }

  const pabblyUrl = process.env.PABBLY_ACCESS_WEBHOOK_URL?.trim();
  if (!pabblyUrl) {
    await markEvent(supabase, eventLog?.id, { error: 'PABBLY_ACCESS_WEBHOOK_URL is missing.' });
    return NextResponse.json({ ok: false, error: 'Pabbly webhook is not configured.' }, { status: 500 });
  }

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
      course_slug: course.slug,
      course_name: course.title,
      academy_url: `${academyUrl()}/login`,
      password_setup_url: recovery.properties.action_link
    }),
    cache: 'no-store'
  });

  if (!pabblyResponse.ok) {
    const message = `Pabbly returned HTTP ${pabblyResponse.status}.`;
    await markEvent(supabase, eventLog?.id, { error: message });
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }

  await markEvent(supabase, eventLog?.id, { processed: true, error: null });

  return NextResponse.json({
    ok: true,
    transaction_id: eventId,
    course: course.slug,
    enrollment: 'active',
    pabbly: 'sent'
  });
}
