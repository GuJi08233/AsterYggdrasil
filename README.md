# AsterYggdrasil

Self-hosted Minecraft identity infrastructure in Rust: a skin site, player profile service, and Yggdrasil-compatible authentication server for launchers and Minecraft servers that need identity control without depending on Mojang/Microsoft session services for private deployments.

The project is built as one MIT-licensed Rust + React service with SQLite by default, optional MySQL/PostgreSQL compatibility, runtime configuration, audit logs, cache-backed launcher sessions, and admin APIs.

- Chinese README: [README.zh.md](README.zh.md)
- Public docs: [docs/index.md](docs/index.md)
- Developer docs: [developer-docs/README.md](developer-docs/README.md)
- Docker guide: [docs/deployment/docker.md](docs/deployment/docker.md)
- Example config: [config.example.toml](config.example.toml)
- Frontend panel: [frontend-panel/](frontend-panel/)

## What is AsterYggdrasil?

AsterYggdrasil is a self-hosted Minecraft skin site and authentication server. It implements the project-side account system, external login foundation, Minecraft profile records, Yggdrasil launcher authentication, session join checks, runtime feature switches, and audit surfaces needed to operate a private Minecraft identity service.

It is not a file drive, private cloud, or generic SaaS template anymore. The old React panel is still useful as a technical reference for Vite, service generation, and shadcn/ui wiring, but the product domain is Minecraft/Yggdrasil: users, player profiles, skins, capes, launcher login, session server compatibility, keys, cache, and admin operations.

The current `0.0.0-alpha` line is early product work. The backend foundation is already substantial, but the Minecraft texture system and final frontend experience are still evolving.

## Where it fits

AsterYggdrasil is a good fit when you want:

- a single self-hosted service for Minecraft accounts, player profiles, and launcher authentication
- Yggdrasil/authlib-injector compatible protocol endpoints
- SQLite out of the box, with PostgreSQL or MySQL as deployment grows
- local account auth plus external auth provider infrastructure
- runtime feature switches stored in `system_config`
- cache-backed join/hasJoined session checks instead of storing temporary launcher joins in the database
- structured audit logs for profile creation and authentication/session write actions
- a Rust codebase with explicit DTO validation, service/repository boundaries, migrations, and OpenAPI support

AsterYggdrasil is probably not the right first choice when you need:

- a public Minecraft account provider that replaces official online-mode auth for arbitrary clients
- a complete game server management panel
- a generic file storage, WebDAV, WOPI, team share, or cloud-drive system
- a finished visual skin marketplace today
- multi-primary clustering, automatic failover, or enterprise compliance guarantees
- a vendor-managed SaaS where someone else owns the deployment and data responsibility

## Design focus

- **Protocol compatibility first** - Yggdrasil/authlib-injector endpoints return protocol-native response bodies and status codes, not the project API envelope.
- **Clear product boundaries** - Minecraft profiles, textures, Yggdrasil tokens, and launcher sessions are first-class domain concepts. Old file-drive concepts do not belong here.
- **Runtime control** - feature switches such as profile-name login and upload capability are stored in `system_config` so operators can change behavior without editing `config.toml`.
- **Safe token handling** - Yggdrasil access tokens are hashed before storage. Client tokens, selected profiles, expiry, revocation, and active-token limits are handled in the token repository/service layer.
- **Cache where the protocol expects cache** - temporary join records use the shared cache system with a short TTL; they are not persisted as durable database state.
- **Structured errors** - project APIs use `AsterError` and stable `AsterErrorCode`; Yggdrasil APIs use a dedicated structured protocol error mapping.
- **Auditability** - security-relevant write actions use `audit_service::log_with_details(...)` with presentation metadata for admin display.
- **Hackable core** - Actix Web, SeaORM, React, shadcn/ui, DTO validation, migrations, and tests are kept explicit and readable.

## Quick start

### Run with Docker

For a local HTTP trial, prepare a writable data directory and start the service:

```bash
mkdir -p ./data

docker run -d \
  --name asteryggdrasil \
  -p 3000:3000 \
  -e ASTER__SERVER__HOST=0.0.0.0 \
  -e ASTER__AUTH__BOOTSTRAP_INSECURE_COOKIES=true \
  -e "ASTER__DATABASE__URL=sqlite:///data/asteryggdrasil.db?mode=rwc" \
  -v "$(pwd)/data:/data" \
  ghcr.io/astercommunity/asteryggdrasil:latest
```

Open:

```text
http://127.0.0.1:3000
```

`ASTER__AUTH__BOOTSTRAP_INSECURE_COOKIES=true` is only for local or internal HTTP testing. For production, put AsterYggdrasil behind HTTPS and keep secure cookies enabled.

You can also use the included Compose file:

```bash
mkdir -p ./data
docker compose up -d
```

See [docs/deployment/docker.md](docs/deployment/docker.md) for deployment notes.

### Run from source

```bash
git clone https://github.com/AsterCommunity/AsterYggdrasil.git
cd AsterYggdrasil

cd frontend-panel
bun install
bun run build
cd ..

cargo run
```

On first startup, AsterYggdrasil will automatically:

- generate `data/config.toml` if it does not exist
- create the default SQLite database when using the default database URL
- run all database migrations
- initialize built-in runtime configuration rows in `system_config`
- start the HTTP service on `127.0.0.1:3000`

Create the first admin user:

```bash
curl -X POST http://127.0.0.1:3000/api/v1/auth/setup \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","email":"admin@example.com","password":"change-me-please"}'
```

## Production notes

- Do not expose `:3000` directly to the public Internet. Put it behind a reverse proxy that handles HTTPS, upload limits, real client IP forwarding, and security headers.
- Configure a stable public base URL before handing launcher metadata to users.
- Use strong `auth.jwt_secret` and secure cookie settings in production.
- Plan backups for the database, config, uploaded texture blobs, and any external identity-provider secrets.
- If Redis is configured, monitor it. If cache is disabled or Redis is unavailable, the service falls back to memory cache where configured, but join sessions are then node-local.
- Treat Yggdrasil signing keys as sensitive operational material. Public-key export and texture signing should be tested before enabling strict authlib-injector clients.

## Core capabilities

### Accounts and login

- first-admin setup, registration, login, refresh, logout, current user, and session management
- password hashing with Argon2
- external auth provider administration and callback foundation
- runtime registration/auth feature switches through `system_config`
- project API errors using stable `AsterErrorCode` values

### Minecraft profiles

- separate Minecraft profile records bound to users
- 32-character unsigned Minecraft UUIDs
- validated profile names: 3-16 ASCII letters, numbers, or underscores
- user profile list and create APIs under `/api/v1/profiles/minecraft`
- profile-name login controlled by runtime config

### Yggdrasil protocol API

- service metadata at `/`
- authserver endpoints:
  - `POST /authserver/authenticate`
  - `POST /authserver/refresh`
  - `POST /authserver/validate`
  - `POST /authserver/invalidate`
  - `POST /authserver/signout`
- sessionserver endpoints:
  - `POST /sessionserver/session/minecraft/join`
  - `GET /sessionserver/session/minecraft/hasJoined`
  - `GET /sessionserver/session/minecraft/profile/{uuid}`
- batch profile lookup:
  - `POST /api/profiles/minecraft`
- protocol-native error bodies for launcher compatibility
- access token hashing, revocation, expiry, refresh rotation, and per-user active-token pruning

### Textures

- domain model for Minecraft textures is being added separately from old file-storage concepts
- skin/cape upload capability is controlled by runtime Yggdrasil config
- texture storage is modeled through a dedicated texture storage abstraction
- future work includes MIME/dimension validation, public read cache headers, and signed texture properties

### Administration and operations

- admin runtime configuration APIs backed by `system_config`
- audit log query APIs with presentation metadata
- background task records, dispatch, retry, cleanup, lease/heartbeat, and runtime task presentation
- mail runtime configuration, durable outbox, test mail, and mail audit records
- health endpoints: `/health`, `/health/ready`, optional `/health/metrics`
- memory and Redis cache implementations behind a shared cache trait
- primary/follower startup mode for separating primary-only maintenance loops from common runtime initialization

## Important endpoints

```text
GET  /

POST /authserver/authenticate
POST /authserver/refresh
POST /authserver/validate
POST /authserver/invalidate
POST /authserver/signout

POST /sessionserver/session/minecraft/join
GET  /sessionserver/session/minecraft/hasJoined
GET  /sessionserver/session/minecraft/profile/{uuid}

POST /api/profiles/minecraft

GET  /health
GET  /health/ready
GET  /health/metrics                    # with --features metrics

GET  /api/v1/system/info

POST /api/v1/auth/setup
POST /api/v1/auth/register
POST /api/v1/auth/login
POST /api/v1/auth/refresh
POST /api/v1/auth/logout
GET  /api/v1/auth/me
GET  /api/v1/auth/sessions

GET  /api/v1/profiles/minecraft
POST /api/v1/profiles/minecraft

GET    /api/v1/admin/config
GET    /api/v1/admin/config/schema
GET    /api/v1/admin/config/template-variables
GET    /api/v1/admin/config/{key}
PUT    /api/v1/admin/config/{key}
DELETE /api/v1/admin/config/{key}
POST   /api/v1/admin/config/mail/action

GET  /api/v1/admin/audit-logs

GET  /api/v1/admin/tasks
POST /api/v1/admin/tasks/cleanup
POST /api/v1/admin/tasks/{id}/retry

GET    /api/v1/admin/external-auth/provider-kinds
GET    /api/v1/admin/external-auth/providers
POST   /api/v1/admin/external-auth/providers
GET    /api/v1/admin/external-auth/providers/{id}
PATCH  /api/v1/admin/external-auth/providers/{id}
DELETE /api/v1/admin/external-auth/providers/{id}
POST   /api/v1/admin/external-auth/providers/test
POST   /api/v1/admin/external-auth/providers/{id}/test
```

Debug builds with the `openapi` feature can export a static OpenAPI document:

```bash
cargo test --features openapi generate_openapi
cd frontend-panel
bun run generate-api
```

## Configuration model

Static config is loaded from `data/config.toml` by default and can be overridden with `ASTER__...` environment variables:

```bash
ASTER__SERVER__HOST=0.0.0.0
ASTER__SERVER__PORT=3000
ASTER__SERVER__START_MODE=primary
ASTER__DATABASE__URL='sqlite:///data/asteryggdrasil.db?mode=rwc'
ASTER__AUTH__JWT_SECRET='replace-with-a-long-random-secret'
```

See [config.example.toml](config.example.toml) for the full static config shape.

Runtime config lives in `system_config` and is edited through the Admin Config API/UI. Use runtime config for feature switches and values that should change without editing `config.toml`; use static config for boot-critical settings such as database URL, bind address, and secrets.

Yggdrasil runtime config currently includes:

- `yggdrasil_server_name`
- `yggdrasil_allow_profile_name_login`
- `yggdrasil_allow_skin_upload`
- `yggdrasil_allow_cape_upload`
- `yggdrasil_token_ttl_days`
- `yggdrasil_max_active_tokens`
- `yggdrasil_skin_domains`
- `yggdrasil_signature_public_key`

## Development

### Requirements

- Rust `1.94.0+`
- Bun
- Node.js for frontend tooling
- SQLite by default

### Common commands

```bash
# Backend
cargo fmt
cargo check
cargo test
cargo test --lib
cargo test --test test_yggdrasil
cargo test --test test_audit
cargo test --test test_cache
cargo test --test test_config
cargo test --features openapi --test generate_openapi
cargo test --features metrics
cargo run

# Frontend
cd frontend-panel
bun install
bun run dev
bun run build
bun run check
bun run test
bun run test:e2e
```

### Frontend notes

- The current `frontend-panel/` is still template/demo-grade UI.
- Keep the stack: React, Vite, TypeScript, Tailwind CSS, shadcn/ui, Biome, Vitest, and Playwright.
- Do not preserve the old page structure, visual style, or information architecture when building the real product UI.
- The real UI should focus on login/registration, player profiles, texture upload and preview, authlib-injector setup, admin config, users, and audit logs.
- TypeScript `enum` is not allowed; use `as const` objects.
- Type-only imports must use `import type`.

## Project structure

```text
src/                         Rust backend
src/api/                     Routes, DTOs, OpenAPI registration, middleware, response envelope
src/cache/                   Cache trait plus memory/Redis implementations
src/config/                  Static config, runtime config definitions, normalizers
src/db/                      Connections, retry helpers, transactions, repositories
src/entities/                SeaORM entity models
src/metrics/                 Prometheus implementation behind the metrics feature
src/runtime/                 App state, startup, shutdown, logging, background task loops
src/services/                Auth, external auth, config, mail, audit, task, health, Yggdrasil
src/texture_storage/         Minecraft texture storage abstraction
src/types/                   Shared domain enums and stored DB wrapper types
src/utils/                   Crypto, ID, path, number, email, and RAII helpers
migration/                   SeaORM migration crate
api-docs-macros/             OpenAPI helper macro crate
frontend-panel/              React admin panel, currently demo-grade
developer-docs/              Developer-facing notes
docs/                        User/deployment docs site
tests/                       Integration tests and OpenAPI export test
tmp/authlib-injector/wiki/   Local authlib-injector/Yggdrasil reference wiki clone
```

## Testing focus

Recent Yggdrasil tests cover:

- authenticate, validate, refresh, invalidate, and signout flows
- no-profile, single-profile, and multi-profile selection behavior
- profile-name login runtime configuration
- DTO validation and protocol error body shape
- project profile API validation and response envelope
- join/hasJoined cache-backed session behavior, including memory fallback
- batch profile lookup edge cases
- token hashing and active-token pruning
- audit records and audit presentation codes for profile/auth/session write actions

## License

MIT. See [LICENSE](LICENSE).
