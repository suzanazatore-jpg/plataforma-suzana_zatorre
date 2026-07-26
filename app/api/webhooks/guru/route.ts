import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

type CheckoutPayload = Record<string, unknown>;

const APPROVED_STATUSES = new Set([
  'approved',
  'paid',
  'payment_approved',
  'completed',
  'complete',
  'active',
  'aprovado',
  'pago'
]);

function readPath(payload: CheckoutPayload, paths: string[]) {
  for (const path of paths) {
    const value = path.split('.').reduce<unknown>((current, key) => {
      if (!current || typeof current !== 'object') {
        return undefined;
      }

      return (current as Record<string, unknown>)[key];
    }, payload);

    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  return null;
}

function getEventId(payload: CheckoutPayload) {
  return readPath(payload, [
    'id',
    'event_id',
    'transaction_id',
    'transaction.id',
    'order_id',
    'order.id',
    'sale.id',
    'purchase.id'
  ]);
}

function getEventType(payload: CheckoutPayload) {
  return readPath(payload, [
    'event',
    'event_type',
    'type',
    'status',
    'transaction.status',
    'order.status',
    'sale.status',
    'purchase.status',
    'payment.status'
  ]);
}

function getBuyerEmail(payload: CheckoutPayload) {
  return readPath(payload, [
    'email',
    'customer.email',
    'client.email',
    'buyer.email',
    'user.email',
    'contact.email'
  ])?.toLowerCase();
}

function getBuyerName(payload: CheckoutPayload) {
  return readPath(payload, [
    'name',
    'customer.name',
    'client.name',
    'buyer.name',
    'user.name',
    'contact.name'
  ]);
}

function getBuyerPhone(payload: CheckoutPayload) {
  return readPath(payload, [
    'phone',
    'customer.phone',
    'client.phone',
    'buyer.phone',
    'user.phone',
    'contact.phone'
  ]);
}

function getProductSlug(payload: CheckoutPayload) {
  const product = readPath(payload, [
    'product.slug',
    'product.code',
    'product.name',
    'offer.slug',
    'offer.code',
    'offer.name'
  ]);

  if (!product) {
    return process.env.DEFAULT_COURSE_SLUG?.trim() || 'evs';
  }

  const normalized = product
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  if (normalized.includes('evs') || normalized.includes('equipe')) {
    return 'evs';
  }

  return process.env.DEFAULT_COURSE_SLUG?.trim() || 'evs';
}

function isApproved(payload: CheckoutPayload) {
  const status = getEventType(payload)?.toLowerCase();

  if (!status) {
    return false;
  }

  return APPROVED_STATUSES.has(status) || status.includes('approved') || status.includes('paid');
}

function getExpectedSecret() {
  return process.env.CHECKOUT_WEBHOOK_SECRET?.trim();
}

function isAuthorized(request: Request, payload: CheckoutPayload) {
  const expectedSecret = getExpectedSecret();

  if (!expectedSecret) {
    return true;
  }

  const headerSecret =
    request.headers.get('x-webhook-secret') ||
    request.headers.get('x-guru-secret') ||
    request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  const payloadSecret = readPath(payload, ['secret', 'webhook_secret']);

  return headerSecret === expectedSecret || payloadSecret === expectedSecret;
}

function makeTemporaryPassword(email: string) {
  const random = crypto.randomUUID().replace(/-/g, '').slice(0, 16);
  return `${email.split('@')[0].slice(0, 4)}-${random}-SZ`;
}

export async function POST(request: Request) {
  const supabase = createSupabaseAdminClient();

  if (!supabase) {
    return NextResponse.json(
      { ok: false, error: 'Supabase admin credentials are missing.' },
      { status: 500 }
    );
  }

  let payload: CheckoutPayload;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON payload.' }, { status: 400 });
  }

  if (!isAuthorized(request, payload)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized webhook.' }, { status: 401 });
  }

  const eventType = getEventType(payload);
  const eventId = getEventId(payload);

  const { data: eventLog } = await supabase
    .from('webhook_events')
    .insert({
      source: 'guru',
      event_type: eventType,
      external_id: eventId,
      payload,
      processed: false
    })
    .select('id')
    .single();

  if (!isApproved(payload)) {
    if (eventLog?.id) {
      await supabase
        .from('webhook_events')
        .update({ processed: true })
        .eq('id', eventLog.id);
    }

    return NextResponse.json({ ok: true, ignored: true, reason: 'Payment is not approved.' });
  }

  const email = getBuyerEmail(payload);
  const name = getBuyerName(payload);
  const phone = getBuyerPhone(payload);
  const courseSlug = getProductSlug(payload);

  if (!email) {
    const error = 'Buyer email was not found in payload.';

    if (eventLog?.id) {
      await supabase.from('webhook_events').update({ error }).eq('id', eventLog.id);
    }

    return NextResponse.json({ ok: false, error }, { status: 400 });
  }

  const { data: course, error: courseError } = await supabase
    .from('courses')
    .select('id, slug')
    .eq('slug', courseSlug)
    .single();

  if (courseError || !course) {
    const error = `Course not found: ${courseSlug}`;

    if (eventLog?.id) {
      await supabase.from('webhook_events').update({ error }).eq('id', eventLog.id);
    }

    return NextResponse.json({ ok: false, error }, { status: 404 });
  }

  const { data: authUser, error: userError } = await supabase.auth.admin.createUser({
    email,
    password: makeTemporaryPassword(email),
    email_confirm: true,
    user_metadata: {
      name,
      phone,
      source: 'guru'
    }
  });

  if (userError && !userError.message.toLowerCase().includes('already registered')) {
    if (eventLog?.id) {
      await supabase.from('webhook_events').update({ error: userError.message }).eq('id', eventLog.id);
    }

    return NextResponse.json({ ok: false, error: userError.message }, { status: 500 });
  }

  let profileId = authUser.user?.id;

  if (!profileId) {
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .single();

    profileId = existingProfile?.id;
  }

  if (!profileId) {
    const error = 'User already exists in auth, but profile was not found.';

    if (eventLog?.id) {
      await supabase.from('webhook_events').update({ error }).eq('id', eventLog.id);
    }

    return NextResponse.json({ ok: false, error }, { status: 409 });
  }

  const { error: profileError } = await supabase
    .from('profiles')
    .upsert({
      id: profileId,
      email,
      name,
      phone,
      role: 'student',
      status: 'active'
    });

  if (profileError) {
    if (eventLog?.id) {
      await supabase.from('webhook_events').update({ error: profileError.message }).eq('id', eventLog.id);
    }

    return NextResponse.json({ ok: false, error: profileError.message }, { status: 500 });
  }

  const { error: enrollmentError } = await supabase
    .from('enrollments')
    .upsert(
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
    if (eventLog?.id) {
      await supabase.from('webhook_events').update({ error: enrollmentError.message }).eq('id', eventLog.id);
    }

    return NextResponse.json({ ok: false, error: enrollmentError.message }, { status: 500 });
  }

  if (eventLog?.id) {
    await supabase
      .from('webhook_events')
      .update({ processed: true })
      .eq('id', eventLog.id);
  }

  return NextResponse.json({
    ok: true,
    email,
    course: course.slug,
    enrollment: 'active'
  });
}
