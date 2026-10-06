# Atlas Postman Collection

A [Postman Collection v2.1](https://schema.getpostman.com/json/collection/v2.1.0/collection.json)
covering the entire public Atlas API, generated from the **same code-derived OpenAPI
document** the server serves at `/v1/openapi.json`. Because it is generated, it never
drifts from the API.

## Files

| File | What it is |
| --- | --- |
| `atlas.postman_collection.json` | The collection — import this into Postman. |
| `atlas.postman_environment.json` | An environment template — import and fill in your keys. |
| `verify.mjs` | Structural test (see below). |

## Import into Postman

1. **Import** → drag in `atlas.postman_collection.json`.
2. **Import** → drag in `atlas.postman_environment.json`, then select the
   **"Atlas (template)"** environment (top-right in Postman).
3. Set the environment variables:
   - `baseUrl` — your Atlas API origin (default `https://api.atlasauth.net`).
   - `secretKey` — a `sk_...` key (authorizes the **BAPI** folder).
   - `publishableKey` — a `pk_...` key (authorizes the **FAPI** folder).
   - `platformKey` — a `psk_...` key (authorizes the **PLATFORM** folder).
   - `scimToken` — a `scim_...` token (authorizes the **SCIM** folder).
4. Open any request and hit **Send**. Auth, path/query params, and a request-body
   example are already wired.

## Structure

Top-level folders are the API **surfaces**; each is auth-wired as a folder so every
request inside inherits it:

| Folder | Auth | Credential variable |
| --- | --- | --- |
| **BAPI** | Bearer | `{{secretKey}}` |
| **FAPI** | API key header `x-publishable-key` | `{{publishableKey}}` |
| **OIDC** | none at folder level (varies per endpoint) | — |
| **SCIM** | Bearer | `{{scimToken}}` |
| **PLATFORM** | Bearer | `{{platformKey}}` |
| **PUBLIC** | none | — |

Within each surface, requests are grouped into sub-folders by resource (e.g.
`users`, `organizations`, `sessions`) so the hundreds of operations stay navigable.
Each request carries:

- the HTTP method and a `{{baseUrl}}`-templated URL,
- path parameters as Postman path variables (`:id`),
- query parameters (optional ones start disabled) with their descriptions,
- a JSON (or form-encoded) request-body example synthesized from the schema,
- a description with the summary, required scope, and deprecation notice.

## Regenerate

```bash
pnpm gen:postman        # from the repo root
```

The generator (`scripts/gen-postman.mjs`) runs Atlas's real OpenAPI generator
(`apps/api/src/openapi/generate.ts`) in-process using Node's native TypeScript
support — no monorepo install or build required (needs **Node ≥ 22.15 / 23.5**).
Output is deterministic (sorted, fixed ids, no timestamps), so re-running produces an
identical file unless the API actually changed.

## Verify

```bash
node tools/postman/verify.mjs    # or: pnpm verify:dx
```

Asserts the collection is a valid v2.1 document, has the six expected surface folders,
is auth-wired correctly, contains a known operation (`POST /v1/users`) with a valid
JSON body example, and that the environment template carries the key variables.
