#!/usr/bin/env node
/**
 * verify.mjs — assert the generated collection is a valid Postman v2.1 document
 * with the expected surfaces and a known operation. Exits non-zero on failure.
 *   node tools/postman/verify.mjs
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const fail = (m) => {
  console.error('FAIL: ' + m);
  process.exit(1);
};

const c = JSON.parse(readFileSync(join(HERE, 'atlas.postman_collection.json'), 'utf8'));

// 1. Valid v2.1 envelope.
if (!/collection\/v2\.1\.0/.test(c.info?.schema || '')) fail('schema is not Postman collection v2.1.0');
if (!c.info?._postman_id) fail('missing info._postman_id');
if (!Array.isArray(c.item)) fail('item is not an array');
if (!Array.isArray(c.variable) || !c.variable.find((v) => v.key === 'baseUrl'))
  fail('missing {{baseUrl}} collection variable');

// 2. Expected top-level folders (surfaces).
const EXPECTED = ['BAPI', 'FAPI', 'OIDC', 'SCIM', 'PLATFORM', 'PUBLIC'];
const names = c.item.map((f) => f.name);
for (const e of EXPECTED) if (!names.includes(e)) fail(`missing top-level folder "${e}" (got ${names.join(', ')})`);

// 3. Auth is wired per surface.
const bapi = c.item.find((f) => f.name === 'BAPI');
if (bapi.auth?.type !== 'bearer') fail('BAPI folder is not bearer-authed');
if (bapi.auth.bearer?.[0]?.value !== '{{secretKey}}') fail('BAPI bearer is not {{secretKey}}');
const fapi = c.item.find((f) => f.name === 'FAPI');
if (fapi.auth?.type !== 'apikey') fail('FAPI folder is not apikey-authed');

// 4. A known operation exists, with its body/url wired.
function* walk(items) {
  for (const it of items) {
    if (it.item) yield* walk(it.item);
    else yield it;
  }
}
const all = [...walk(c.item)];
const createUser = all.find(
  (r) => r.request?.method === 'POST' && (r.request.url?.path || []).join('/') === 'v1/users',
);
if (!createUser) fail('could not find POST /v1/users operation');
if (!createUser.request.body?.raw) fail('POST /v1/users has no example body');
JSON.parse(createUser.request.body.raw); // body example must be valid JSON
if (createUser.request.url.raw !== '{{baseUrl}}/v1/users') fail('POST /v1/users url not templated with {{baseUrl}}');

// 5. Every request references {{baseUrl}} and has a method.
let count = 0;
for (const r of all) {
  if (!r.request?.method) fail(`request "${r.name}" has no method`);
  if (!(r.request.url?.host || []).includes('{{baseUrl}}')) fail(`request "${r.name}" not templated with {{baseUrl}}`);
  count++;
}

// 6. Environment template parses and carries the key variables.
const env = JSON.parse(readFileSync(join(HERE, 'atlas.postman_environment.json'), 'utf8'));
if (env._postman_variable_scope !== 'environment') fail('environment scope wrong');
for (const k of ['baseUrl', 'secretKey', 'publishableKey', 'platformKey', 'scimToken'])
  if (!env.values.find((v) => v.key === k)) fail(`environment missing "${k}"`);

console.log(`PASS: valid Postman v2.1 collection — ${EXPECTED.length} surfaces, ${count} operations, env template OK.`);
