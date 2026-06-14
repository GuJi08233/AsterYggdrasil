# Minecraft Profiles

A Minecraft profile is the player's identity in the Yggdrasil protocol. AsterYggdrasil stores profiles in a separate table instead of mixing them into the site user table.

## Create and List

Current-user APIs:

```text
GET    /api/v1/profiles/minecraft
POST   /api/v1/profiles/minecraft
GET    /api/v1/profiles/minecraft/{uuid}/textures
DELETE /api/v1/profiles/minecraft/{uuid}
```

Admin APIs:

```text
GET    /api/v1/admin/minecraft-profiles
GET    /api/v1/admin/users/{user_id}/minecraft-profiles
GET    /api/v1/admin/minecraft-profiles/{uuid}/textures
DELETE /api/v1/admin/minecraft-profiles/{uuid}
```

The admin list supports filtering by name, uuid, and user-related conditions.

## Name Rules

Profile names cannot be changed after creation. Do not update them directly in the database; launcher caches, tokens, audit logs, server allowlists, and texture properties can all be affected.

To change a name:

1. Delete the old profile.
2. Create a new profile.
3. Log in again from the launcher.

There is no name history table in the current model.

## Deletion Semantics

Deleting a profile:

- Deletes the profile row.
- Deletes texture rows linked to the profile.
- Deletes unreferenced texture objects by reference count.
- Revokes Yggdrasil tokens whose selectedProfile points to the profile.
- Writes an audit log entry.

If multiple profiles reference the same texture hash, deleting one profile does not remove an object that is still referenced by another profile.

## Disable and Ban

The current version intentionally does not provide a simple `profile.disabled` field. Disabling profiles affects login, join, hasJoined, texture reads, admin display, and audit policy; it should be defined by a future unified ban system.

Do not add temporary disable fields or bypass the deletion flow before that system exists.
