#!/usr/bin/env node
/**
 * API-only Stripe smoke (no Playwright).
 * Requires: Supabase local, `npm run functions:serve`, Stripe test keys in env.
 * See docs/STRIPE_LOCAL.md — CI (nightly).
 */
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

const REQUIRED_ENV = [
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'STRIPE_PRICE_TEAM',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_ANON_KEY',
];

/** Trim; strip wrapping quotes (Windows `supabase status -o env`). */
function envValue(key) {
  const raw = process.env[key];
  if (raw == null) {
    return '';
  }
  return raw.trim().replace(/^["']|["']$/g, '');
}

function resolveSupabaseEnv() {
  const url = envValue('SUPABASE_URL') || envValue('API_URL');
  const serviceRoleKey =
    envValue('SUPABASE_SERVICE_ROLE_KEY') || envValue('SERVICE_ROLE_KEY');
  const anonKey = envValue('SUPABASE_ANON_KEY') || envValue('ANON_KEY');
  return { url, serviceRoleKey, anonKey };
}

function fail(message) {
  console.error(`stripe-ci-smoke: ${message}`);
  process.exit(1);
}

function assert(condition, message) {
  if (!condition) {
    fail(message);
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForFunctions(supabaseUrl, attempts = 45) {
  // stripe-webhook is POST-only (no CORS OPTIONS); probe a billing function instead.
  const healthUrl = `${supabaseUrl}/functions/v1/billing-create-checkout`;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(healthUrl, { method: 'OPTIONS' });
      if (res.ok) {
        return;
      }
    } catch {
      // retry
    }
    await sleep(2000);
  }
  fail(
    `Edge Functions not reachable at ${healthUrl}. Run: npm run functions:serve`,
  );
}

function buildStripeEvent({ id, type, dataObject, apiVersion }) {
  const now = Math.floor(Date.now() / 1000);
  return {
    id,
    object: 'event',
    api_version: apiVersion ?? '2024-11-20.acacia',
    created: now,
    data: { object: dataObject },
    livemode: false,
    pending_webhooks: 1,
    request: { id: `req_ci_${now}`, idempotency_key: null },
    type,
  };
}

async function postWebhookRaw(webhookUrl, { headers = {}, body }) {
  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body,
  });
  return { status: res.status, text: await res.text() };
}

function assertWebhookRejected({ status, text }, label) {
  assert(status === 400, `${label}: expected 400, got ${status}: ${text}`);
}

async function invokeEdgeFunction(
  supabaseUrl,
  anonKey,
  accessToken,
  functionName,
  body,
) {
  const res = await fetch(`${supabaseUrl}/functions/v1/${functionName}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      apikey: anonKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return { status: res.status, text, json };
}

async function postSignedWebhook(
  stripe,
  webhookUrl,
  webhookSecret,
  event,
  { expectDuplicate = false } = {},
) {
  const payload = JSON.stringify(event);
  const signature = stripe.webhooks.generateTestHeaderString({
    payload,
    secret: webhookSecret,
  });

  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Stripe-Signature': signature,
    },
    body: payload,
  });

  const text = await res.text();
  if (!res.ok) {
    fail(`stripe-webhook returned ${res.status}: ${text}`);
  }

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    fail(`stripe-webhook response not JSON: ${text}`);
  }

  if (expectDuplicate) {
    assert(
      parsed.received === true && parsed.duplicate === true,
      `expected duplicate webhook response: ${text}`,
    );
  } else {
    assert(parsed.received === true, `unexpected webhook response: ${text}`);
    assert(
      parsed.duplicate !== true,
      `expected first delivery, got duplicate: ${text}`,
    );
  }

  return parsed;
}

function buildSubscriptionUpdatedEvent(subscription, { eventId, statusOverride }) {
  const dataObject = statusOverride
    ? { ...subscription, status: statusOverride }
    : subscription;
  return buildStripeEvent({
    id: eventId,
    type: 'customer.subscription.updated',
    dataObject,
    apiVersion: subscription.api_version,
  });
}

async function postSubscriptionUpdated(
  stripe,
  webhookUrl,
  webhookSecret,
  subscription,
  options = {},
) {
  const event = buildSubscriptionUpdatedEvent(subscription, options);
  return postSignedWebhook(stripe, webhookUrl, webhookSecret, event, {
    expectDuplicate: options.expectDuplicate ?? false,
  });
}

async function fetchBillingSnapshot(userClient, organizationId) {
  const { data, error } = await userClient.rpc('get_organization_billing_snapshot', {
    p_organization_id: organizationId,
  });
  if (error) {
    fail(`get_organization_billing_snapshot: ${error.message}`);
  }
  return data;
}

async function main() {
  for (const key of REQUIRED_ENV) {
    if (key.startsWith('SUPABASE_')) {
      continue;
    }
    if (!envValue(key)) {
      fail(`missing env ${key}. See docs/STRIPE_LOCAL.md (CI section).`);
    }
  }

  const { url, serviceRoleKey, anonKey } = resolveSupabaseEnv();
  if (!url || !serviceRoleKey || !anonKey) {
    fail(
      'missing Supabase URL/keys. Set SUPABASE_* or run: supabase status -o env',
    );
  }

  const supabaseUrl = url.replace(/\/$/, '');
  const webhookUrl = `${supabaseUrl}/functions/v1/stripe-webhook`;

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2024-11-20.acacia',
  });
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const priceTeam = process.env.STRIPE_PRICE_TEAM;

  console.log('Waiting for Edge Functions…');
  await waitForFunctions(supabaseUrl);

  const probeEvent = buildStripeEvent({
    id: `evt_ci_smoke_unsigned_${Date.now()}`,
    type: 'customer.subscription.updated',
    dataObject: { id: 'sub_ci_probe', object: 'subscription', status: 'active' },
  });
  const probePayload = JSON.stringify(probeEvent);

  console.log('Posting unsigned stripe-webhook (expect 400)…');
  const unsigned = await postWebhookRaw(webhookUrl, { body: probePayload });
  assertWebhookRejected(unsigned, 'unsigned webhook');
  console.log('Unsigned webhook rejected OK.');

  const badSignature = stripe.webhooks.generateTestHeaderString({
    payload: probePayload,
    secret: 'whsec_ci_wrong_secret_for_smoke',
  });
  console.log('Posting stripe-webhook with invalid signature (expect 400)…');
  const badSig = await postWebhookRaw(webhookUrl, {
    headers: { 'Stripe-Signature': badSignature },
    body: probePayload,
  });
  assertWebhookRejected(badSig, 'invalid signature webhook');
  console.log('Invalid signature webhook rejected OK.');

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const runId = Date.now();
  const email = `stripe-ci-${runId}@example.com`;
  const password = 'StripeCiSmoke2026!';

  const { data: createdUser, error: createUserError } =
    await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
  if (createUserError) {
    fail(`createUser: ${createUserError.message}`);
  }

  const anon = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: signIn, error: signInError } =
    await anon.auth.signInWithPassword({ email, password });
  if (signInError || !signIn.session) {
    fail(`signIn: ${signInError?.message ?? 'no session'}`);
  }

  const accessToken = signIn.session.access_token;
  const userClient = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });

  const slug = `stripe-ci-${runId}`;
  const { data: org, error: orgError } = await userClient.rpc('create_organization', {
    p_name: 'Stripe CI Smoke',
    p_slug: slug,
  });
  if (orgError) {
    fail(`create_organization: ${orgError.message}`);
  }
  const organizationId = org?.id;
  assert(organizationId, 'create_organization returned no id');

  const emailB = `stripe-ci-b-${runId}@example.com`;
  const { error: createUserBError } = await admin.auth.admin.createUser({
    email: emailB,
    password,
    email_confirm: true,
  });
  if (createUserBError) {
    fail(`createUser B: ${createUserBError.message}`);
  }

  const { data: signInB, error: signInBError } =
    await anon.auth.signInWithPassword({ email: emailB, password });
  if (signInBError || !signInB.session) {
    fail(`signIn B: ${signInBError?.message ?? 'no session'}`);
  }

  const accessTokenB = signInB.session.access_token;
  const userClientB = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${accessTokenB}` } },
  });

  const slugB = `stripe-ci-b-${runId}`;
  const { error: orgBError } = await userClientB.rpc('create_organization', {
    p_name: 'Stripe CI Smoke B',
    p_slug: slugB,
  });
  if (orgBError) {
    fail(`create_organization B: ${orgBError.message}`);
  }

  console.log(
    'Invoking billing-update-subscription for foreign org (expect 403)…',
  );
  const crossOrg = await invokeEdgeFunction(
    supabaseUrl,
    anonKey,
    accessTokenB,
    'billing-update-subscription',
    { organization_id: organizationId, seat_quantity: 2 },
  );
  assert(
    crossOrg.status === 403,
    `cross-org update: expected 403, got ${crossOrg.status}: ${crossOrg.text}`,
  );
  assert(
    crossOrg.json?.error === 'forbidden',
    `cross-org update: expected forbidden error: ${crossOrg.text}`,
  );
  console.log('Cross-org billing-update-subscription forbidden OK.');

  console.log('Creating Stripe customer + Team subscription…');
  const customer = await stripe.customers.create({
    metadata: { organization_id: organizationId },
  });

  let defaultPaymentMethodId;
  try {
    const attached = await stripe.paymentMethods.attach('pm_card_visa', {
      customer: customer.id,
    });
    defaultPaymentMethodId = attached.id;
  } catch (err) {
    fail(`attach pm_card_visa: ${err instanceof Error ? err.message : err}`);
  }

  await stripe.customers.update(customer.id, {
    invoice_settings: { default_payment_method: defaultPaymentMethodId },
  });

  const subscription = await stripe.subscriptions.create({
    customer: customer.id,
    items: [{ price: priceTeam, quantity: 1 }],
    metadata: {
      organization_id: organizationId,
      plan_id: 'team',
    },
  });

  console.log('Posting signed customer.subscription.updated webhook…');
  const subscriptionFresh = await stripe.subscriptions.retrieve(subscription.id);
  const syncEventId = `evt_ci_smoke_sync_${runId}`;
  const syncEvent = buildSubscriptionUpdatedEvent(subscriptionFresh, {
    eventId: syncEventId,
  });
  await postSignedWebhook(stripe, webhookUrl, webhookSecret, syncEvent);

  await sleep(500);

  let snapshot = await fetchBillingSnapshot(userClient, organizationId);
  assert(
    String(snapshot.plan_id).toLowerCase() === 'team',
    `expected plan_id team, got ${snapshot.plan_id}`,
  );
  assert(
    Number(snapshot.seats_limit) === 1,
    `expected seats_limit 1 after webhook, got ${snapshot.seats_limit}`,
  );
  console.log('Webhook sync OK (Team, seats_limit=1).');

  console.log('Replaying same webhook event id (idempotency)…');
  await postSignedWebhook(stripe, webhookUrl, webhookSecret, syncEvent, {
    expectDuplicate: true,
  });
  const afterDuplicate = await fetchBillingSnapshot(userClient, organizationId);
  assert(
    String(afterDuplicate.plan_id).toLowerCase() === 'team',
    `idempotent replay changed plan_id: ${afterDuplicate.plan_id}`,
  );
  assert(
    Number(afterDuplicate.seats_limit) === 1,
    `idempotent replay changed seats_limit: ${afterDuplicate.seats_limit}`,
  );
  console.log('Webhook idempotency OK.');

  if (process.env.STRIPE_PRICE_PRO) {
    const { data: checkoutData, error: checkoutError } =
      await userClient.functions.invoke('billing-create-checkout', {
        body: {
          organization_id: organizationId,
          plan_id: 'pro',
          return_url: 'http://localhost:4201/workspace/settings/billing',
          seat_quantity: 1,
        },
      });
    if (checkoutError) {
      fail(`billing-create-checkout: ${checkoutError.message}`);
    }
    const checkoutPayload = checkoutData;
    assert(
      checkoutPayload?.url && String(checkoutPayload.url).includes('stripe.com'),
      `billing-create-checkout missing url: ${JSON.stringify(checkoutPayload)}`,
    );
    console.log('billing-create-checkout returned Checkout URL.');
  }

  console.log('Invoking billing-update-subscription (quantity 2)…');
  const { data: bumpData, error: bumpError } = await userClient.functions.invoke(
    'billing-update-subscription',
    {
      body: {
        organization_id: organizationId,
        seat_quantity: 2,
      },
    },
  );
  if (bumpError) {
    fail(`billing-update-subscription: ${bumpError.message}`);
  }
  const bumpPayload = bumpData;
  assert(bumpPayload?.ok === true, `bump failed: ${JSON.stringify(bumpPayload)}`);

  snapshot = await fetchBillingSnapshot(userClient, organizationId);
  assert(
    Number(snapshot.seats_limit) === 2,
    `expected seats_limit 2 after bump, got ${snapshot.seats_limit}`,
  );

  console.log('billing-update-subscription OK (seats_limit=2).');

  console.log('Posting customer.subscription.updated (past_due)…');
  await postSubscriptionUpdated(
    stripe,
    webhookUrl,
    webhookSecret,
    subscriptionFresh,
    {
      eventId: `evt_ci_smoke_past_due_${runId}`,
      statusOverride: 'past_due',
    },
  );
  await sleep(300);
  const pastDueSnapshot = await fetchBillingSnapshot(userClient, organizationId);
  assert(
    String(pastDueSnapshot.subscription_status).toLowerCase() === 'past_due',
    `expected subscription_status past_due, got ${pastDueSnapshot.subscription_status}`,
  );
  console.log('past_due webhook sync OK.');

  console.log('stripe-ci-smoke passed.');
}

main().catch((err) => {
  fail(err instanceof Error ? err.message : String(err));
});
