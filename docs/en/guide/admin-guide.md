---
description: AsterYggdrasil administrator guide covering users, profiles, textures, config, audit logs, and background tasks.
---

# Admin Guide

::: tip What this covers
This page follows administrator workflows. It does not replace detailed configuration docs; for config details, read [Config and Keys](/en/guide/configuration).
:::

## What Admins Manage

Administrators mainly maintain six kinds of state:

| Object | What matters |
| --- | --- |
| Users | Who can sign in, who is admin, and whether sessions must be revoked |
| Minecraft profiles | Player names, UUIDs, owners, renames, and deletion |
| Textures | Skin/cape upload, binding, public reads, and orphan cleanup |
| Yggdrasil config | Public URLs, profile-name login, upload switches, token policy |
| Signing keys | Metadata public key, textures property signatures, key rotation |
| Audit and tasks | Admin actions, protocol login behavior, cleanup tasks, retries |

## First Admin Account

On first run, create the initial account through setup:

```text
POST /api/v1/auth/setup
```

The first account becomes administrator. Administrators can manage users, runtime config, Minecraft profiles, audit logs, and background tasks.

## Administrators and Operators

`admin` has full administration access. `operator` is a scoped administration role and can only access granted scopes. Current scopes are:

- `overview`
- `users`
- `profiles`
- `texture_library`
- `audit`
- `tasks`
- `settings`
- `external_auth`

When creating or updating users, administrators can set role and operator scopes. Operators without the required scope cannot access the related admin API and will not see the corresponding frontend navigation entry.

## Users and Profiles

Users are site login identities. Minecraft profiles are in-game identities. One user can own multiple profiles.

Common admin APIs:

```text
GET    /api/v1/admin/users
GET    /api/v1/admin/users/{id}
PATCH  /api/v1/admin/users/{id}
POST   /api/v1/admin/users/{id}/sessions/revoke
GET    /api/v1/admin/users/{user_id}/minecraft-profiles
GET    /api/v1/admin/minecraft-profiles
GET    /api/v1/admin/minecraft-profiles/{uuid}
PUT    /api/v1/admin/minecraft-profiles/{uuid}/name
DELETE /api/v1/admin/minecraft-profiles/{uuid}
```

Rename profiles through the API. Direct database edits can desynchronize tokens, launcher caches, server allowlists, texture properties, and audit records.

## Textures

Textures have two layers:

- wardrobe: a user's personal texture library.
- profile texture: the skin/cape slot bound to a Minecraft profile.

Admins can inspect profile-bound textures, delete a slot, or delete texture references by hash:

```text
GET    /api/v1/admin/minecraft-profiles/{uuid}/textures
DELETE /api/v1/admin/minecraft-profiles/{uuid}/textures/{skin|cape}
DELETE /api/v1/admin/minecraft-textures/{hash}
```

Deletion goes through service-layer reference counting. Do not delete storage files directly, or the consistency check will report missing objects.

## Public Texture Library

The public texture library is the publishing layer on top of wardrobe. Users upload textures to their own wardrobe first, then make a texture public and submit it to the public library.

The admin UI is split into several workflows:

- All textures: inspect textures uploaded to the system and filter by public library status, visibility, published state, and related fields.
- Review queue: handle user submissions waiting for administrator review.
- Report queue: handle signed-in user reports against published public textures.
- Tags: maintain public texture library tags.

Admin APIs:

```text
GET  /api/v1/admin/texture-library/textures
GET  /api/v1/admin/texture-library/textures/{texture_id}
POST /api/v1/admin/texture-library/textures/{texture_id}/approve
POST /api/v1/admin/texture-library/textures/{texture_id}/reject
POST /api/v1/admin/texture-library/textures/{texture_id}/unpublish

GET  /api/v1/admin/texture-library/reports
GET  /api/v1/admin/texture-library/reports/{report_id}
POST /api/v1/admin/texture-library/reports/{report_id}/accept
POST /api/v1/admin/texture-library/reports/{report_id}/reject

GET    /api/v1/admin/texture-library/tags
POST   /api/v1/admin/texture-library/tags
PATCH  /api/v1/admin/texture-library/tags/{tag_id}
DELETE /api/v1/admin/texture-library/tags/{tag_id}
```

Approval sets a texture to `published`. Rejection sets it to `rejected` and exposes the review note to the texture owner. Unpublishing removes a published texture from the public library, while the owner's wardrobe texture remains available with the unpublish note.

Accepting a report unpublishes the reported texture. Rejecting a report does not change the texture publish state. If an administrator directly unpublishes a published texture, the system also marks that texture's unresolved pending reports as accepted, so the report queue does not retain stale pending records.

## Config

Runtime config is changed through the Admin Config API:

```text
GET    /api/v1/admin/config
GET    /api/v1/admin/config/schema
PUT    /api/v1/admin/config/{key}
DELETE /api/v1/admin/config/{key}
POST   /api/v1/admin/config/{key}/action
```

Before launch, check:

- `public_site_url`
- `yggdrasil_public_base_url`
- `yggdrasil_skin_domains`
- `texture_library_enabled`
- `texture_library_review_required`
- `auth_captcha_enabled`
- `yggdrasil_allow_skin_upload`
- `yggdrasil_allow_cape_upload`
- `yggdrasil_token_ttl_days`
- `yggdrasil_max_active_tokens`

Do not manually edit the signing private key. Rotate it through the action:

```text
rotate_yggdrasil_signature_key
```

## Audit and Tasks

Admin actions, Yggdrasil login behavior, texture upload/deletion, and profile create/delete/rename operations are audited.

```text
GET /api/v1/admin/audit-logs
GET /api/v1/admin/tasks
POST /api/v1/admin/tasks/cleanup
POST /api/v1/admin/tasks/{id}/retry
```

Watch especially:

- `yggdrasil-token-cleanup`
- `yggdrasil-texture-cleanup`
- `yggdrasil-storage-consistency-check`

If the consistency check fails, first verify whether the database or object storage was edited manually or restored only partially.
