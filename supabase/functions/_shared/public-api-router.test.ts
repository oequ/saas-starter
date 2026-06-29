import {
  matchPublicApiRoute,
  publicApiPathAfterFunction,
} from './public-api-router.ts';

Deno.test('publicApiPathAfterFunction strips function prefix', () => {
  const full = publicApiPathAfterFunction('/functions/v1/public-v1/v1/account');
  if (full !== '/v1/account') {
    throw new Error(full);
  }
});

Deno.test('matchPublicApiRoute maps account', () => {
  const account = matchPublicApiRoute('GET', '/v1/account');
  if (account.kind !== 'account') {
    throw new Error(JSON.stringify(account));
  }
});

Deno.test('matchPublicApiRoute maps demo runs create and get', () => {
  const create = matchPublicApiRoute('POST', '/v1/demo-runs');
  if (create.kind !== 'create_demo_run') {
    throw new Error(JSON.stringify(create));
  }
  const get = matchPublicApiRoute('GET', '/v1/demo-runs/abc-123');
  if (get.kind !== 'get_demo_run' || get.id !== 'abc-123') {
    throw new Error(JSON.stringify(get));
  }
});

Deno.test('matchPublicApiRoute returns not_found for AI-only paths', () => {
  const models = matchPublicApiRoute('GET', '/v1/models');
  if (models.kind !== 'not_found') {
    throw new Error(JSON.stringify(models));
  }
});

Deno.test('matchPublicApiRoute returns method_not_allowed', () => {
  const route = matchPublicApiRoute('POST', '/v1/account');
  if (route.kind !== 'method_not_allowed' || route.allowed !== 'GET') {
    throw new Error(JSON.stringify(route));
  }
});
