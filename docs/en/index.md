---
layout: home
description: AsterYggdrasil is a self-hosted Minecraft skin site and Yggdrasil/authlib-injector authentication server.

hero:
  name: AsterYggdrasil
  text: Minecraft skin site and auth server
  tagline: Self-hosted Yggdrasil API, authlib-injector integration, launcher login, Minecraft profiles, skin/cape texture management, signing keys, audit logs, and maintenance tasks.
  actions:
    - theme: brand
      text: Getting Started
      link: /en/guide/getting-started
    - theme: alt
      text: authlib-injector
      link: /en/guide/yggdrasil-api
    - theme: alt
      text: Deployment
      link: /en/deployment/docker

features:
  - title: Yggdrasil API
    details: "`/api/yggdrasil` serves metadata, authenticate, refresh, validate, invalidate, signout, join, hasJoined, and profile lookup."
    link: /en/guide/yggdrasil-api
  - title: Launcher Login
    details: Supports accessToken/clientToken, selectedProfile, refresh, profile-name login policy, and authlib-injector profile properties.
    link: /en/guide/launcher-login
  - title: Minecraft Profiles
    details: Profiles are modeled independently, names are unique and immutable, and deletion revokes related tokens and cleans texture references.
    link: /en/guide/profiles
  - title: Texture System
    details: Supports skin/cape upload, PNG sanitization, 22x17 cape transparent padding, public hash URLs, metadata, and admin deletion.
    link: /en/guide/yggdrasil-textures
  - title: Config and Keys
    details: "Yggdrasil runtime config lives in system_config; signing private keys rotate through config actions and sensitive values are not exposed."
    link: /en/guide/configuration
  - title: Maintenance
    details: Runtime tasks clean expired tokens, orphan texture objects, storage consistency issues, audit logs, and task artifacts.
    link: /en/guide/audit-tasks
---

AsterYggdrasil is a self-hosted Minecraft skin site and Yggdrasil/authlib-injector authentication server. This documentation focuses on operating that service.

## Main Entrypoint

The authentication server root is:

```text
/api/yggdrasil
```

The site homepage returns `X-Authlib-Injector-API-Location: /api/yggdrasil/`, so launchers that support authlib-injector ALI can discover the API from the site URL.

Common public endpoints:

```text
GET  /api/yggdrasil
POST /api/yggdrasil/authserver/authenticate
POST /api/yggdrasil/authserver/refresh
POST /api/yggdrasil/sessionserver/session/minecraft/join
GET  /api/yggdrasil/sessionserver/session/minecraft/hasJoined
GET  /api/yggdrasil/sessionserver/session/minecraft/profile/{uuid}
GET  /api/yggdrasil/textures/{hash}
```

Site and admin APIs remain under `/api/v1`, including profile management, texture metadata, config, audit logs, and background tasks.

## Recommended Reading

1. [Getting Started](./guide/getting-started.md): start locally, create the first admin, and verify Yggdrasil metadata.
2. [Yggdrasil API](./guide/yggdrasil-api.md): API root, ALI, metadata, signatures, and protocol errors.
3. [Launcher Login](./guide/launcher-login.md): authenticate, refresh, clientToken, and selectedProfile behavior.
4. [Minecraft Profiles](./guide/profiles.md): profile creation, deletion, immutability, and admin APIs.
5. [Textures](./guide/yggdrasil-textures.md): skin/cape upload, 22x17 capes, hashes, public reads, and skinDomains.
6. [Config and Keys](./guide/configuration.md): system_config, public base URLs, skinDomains, and signing key rotation.
7. [Texture Storage](./guide/storage.md): local backend, future S3 schema, and consistency checks.
8. [Audit and Tasks](./guide/audit-tasks.md): admin-visible audit logs, runtime tasks, and maintenance policy.
9. [Deployment](./deployment/docker.md): reverse proxy, public URL, trusted proxies, and container persistence.

## Current Boundaries

- Minecraft profile names cannot be changed after creation. Rename flows should delete and recreate the profile.
- Profile disabling is intentionally left for a future ban system that defines login, join, hasJoined, and texture access semantics together.
- The current production texture storage backend is local. S3/minio config shape is reserved, but the backend still needs implementation.
- The admin frontend is being rewritten; docs describe stable backend behavior and deployment semantics first.
