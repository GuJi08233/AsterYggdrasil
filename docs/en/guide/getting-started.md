# Getting Started

This page starts AsterYggdrasil locally and verifies the admin API, Yggdrasil metadata, and texture storage path.

## Requirements

- Rust stable toolchain.
- SQLite. The default config uses local SQLite and needs no separate database service.
- Bun. Required only for the docs site or the admin frontend.

## Start the Backend

```bash
cargo run
```

The first startup creates runtime files and the default static config:

```text
data/config.toml
```

Default address:

```text
http://127.0.0.1:3000
```

Health checks:

```text
GET /health
GET /health/ready
```

## Initialize an Admin

AsterYggdrasil keeps the local auth and admin capability from the base service. On first run, create an admin account through the setup/register/login flow, then use the admin API to configure Yggdrasil behavior.

Admin capabilities include:

- View and update runtime config.
- Execute the Yggdrasil signing key rotation action.
- View audit logs.
- View and retry background tasks.
- Manage Minecraft profiles and textures.

## Verify Yggdrasil Metadata

After startup, request:

```text
GET /api/yggdrasil
GET /api/yggdrasil/
```

The response is authlib-injector metadata and does not use the project API envelope. It should include:

- `meta.serverName`
- `skinDomains`
- `signaturePublickey`
- `feature`

The site homepage `/` returns:

```text
X-Authlib-Injector-API-Location: /api/yggdrasil/
```

Launchers that support ALI can use the site URL and discover the real Yggdrasil API root automatically.

## Create a Minecraft Profile

After logging into the site account, users can create Minecraft profiles:

```text
POST /api/v1/profiles/minecraft
GET  /api/v1/profiles/minecraft
```

Profile names cannot be changed after creation. To change a name, delete the profile and create a new one.

## Upload Textures

Yggdrasil texture upload endpoints:

```text
PUT    /api/yggdrasil/api/user/profile/{uuid}/skin
PUT    /api/yggdrasil/api/user/profile/{uuid}/cape
DELETE /api/yggdrasil/api/user/profile/{uuid}/skin
DELETE /api/yggdrasil/api/user/profile/{uuid}/cape
```

Upload requires a Yggdrasil access token. The server validates token state, profile ownership, upload switches, MIME type, PNG dimensions, and then re-encodes the image as a safe PNG.

Public read:

```text
GET /api/yggdrasil/textures/{hash}
```

## Local Docs Site

```bash
cd docs
bun install
bun run docs:dev
```

Build docs:

```bash
cd docs
bun run docs:build
```

## Next

- [Yggdrasil API](./yggdrasil-api.md)
- [Launcher Login](./launcher-login.md)
- [Minecraft Profiles](./profiles.md)
- [Textures](./yggdrasil-textures.md)
- [Config and Keys](./configuration.md)
