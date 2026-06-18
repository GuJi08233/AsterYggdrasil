# Yggdrasil Textures

AsterYggdrasil has two texture entrypoints.

For launchers and authlib-injector-compatible tools, use the Yggdrasil texture API:

```text
PUT    /api/yggdrasil/api/user/profile/{uuid}/{skin|cape}
DELETE /api/yggdrasil/api/user/profile/{uuid}/{skin|cape}
GET    /api/yggdrasil/textures/{hash}
```

For site users, use wardrobe plus profile binding:

```text
GET    /api/v1/wardrobe/textures
POST   /api/v1/wardrobe/textures/{skin|cape}
PUT    /api/v1/profiles/minecraft/{uuid}/textures/{skin|cape}
DELETE /api/v1/profiles/minecraft/{uuid}/textures/{skin|cape}
```

Yggdrasil protocol endpoints return the protocol response shape and do not use the project API envelope. `/api/v1/...` site and admin APIs continue to use the standard envelope.

## Wardrobe and Public Texture Library

Wardrobe is the user's personal texture library. Textures uploaded to wardrobe belong to the current user by default. Users can bind a wardrobe texture to their Minecraft profile, or make it public and submit it to the public texture library.

The public texture library is controlled by runtime config:

- `texture_library_enabled`: whether the public texture library is enabled.
- `texture_library_review_required`: whether user submissions require administrator review before publishing.

Typical user flow:

1. Upload a skin/cape to wardrobe.
2. Change texture visibility to `public`.
3. Submit it to the public texture library.
4. If review is required, wait for an administrator to approve it; otherwise the submission becomes `published` immediately.
5. Other signed-in users can copy the public texture into their own wardrobe.

The public texture library only lists published public textures. Private textures, pending submissions, rejected submissions, and unpublished textures are not returned by public list or detail APIs.

Public texture library site APIs:

```text
GET    /api/v1/texture-library/tags
GET    /api/v1/texture-library/textures
GET    /api/v1/texture-library/textures/{texture_id}
POST   /api/v1/texture-library/textures/{texture_id}/copy
POST   /api/v1/texture-library/textures/{texture_id}/reports
POST   /api/v1/wardrobe/textures/{texture_id}/library-submission
DELETE /api/v1/wardrobe/textures/{texture_id}/library-submission
```

Copying a public texture requires sign-in. The copied texture is created or reused in the current user's wardrobe and stays private by default; it is not automatically republished.

## Review, Unpublish, and Reports

Public library state is represented by `library_status`. Main values are:

- `private`: not in the public texture library.
- `pending_review`: submitted and waiting for administrator review.
- `published`: visible in the public texture library.
- `rejected`: rejected by an administrator.

Administrators can moderate submissions through the texture library admin API:

```text
GET  /api/v1/admin/texture-library/textures
GET  /api/v1/admin/texture-library/textures/{texture_id}
POST /api/v1/admin/texture-library/textures/{texture_id}/approve
POST /api/v1/admin/texture-library/textures/{texture_id}/reject
POST /api/v1/admin/texture-library/textures/{texture_id}/unpublish
```

Signed-in users can report published public textures. Reports require sign-in. Users cannot report their own textures, and cannot report private, pending, rejected, or unpublished textures. A user can only have one pending report for the same texture.

Reports have their own status and do not reuse texture `library_status`:

- `pending`: waiting for administrator handling.
- `accepted`: report accepted.
- `rejected`: report rejected.

Administrators can handle reports through the report queue:

```text
GET  /api/v1/admin/texture-library/reports
GET  /api/v1/admin/texture-library/reports/{report_id}
POST /api/v1/admin/texture-library/reports/{report_id}/accept
POST /api/v1/admin/texture-library/reports/{report_id}/reject
```

Accepting a report unpublishes the texture from the public library and writes the handling note to the texture review note. The texture owner can see the unpublished state and note in wardrobe.

If an administrator does not handle a report from the report queue and instead directly unpublishes an already published texture from the texture management page, the system marks existing pending reports for that texture as `accepted` and reuses the unpublish note as the report handling note. This keeps the report queue from retaining pending reports that were already resolved by direct moderation.

## Upload Validation

The uploaded file must be `image/png`. The server reads the PNG header to obtain image dimensions before decoding the full image, so oversized PNG bombs are rejected before the bitmap is loaded.

Accepted dimensions:

- skin: multiples of `64x32`, or multiples of `64x64`.
- cape: multiples of `64x32`, or multiples of `22x17`.

Invalid dimensions return a Yggdrasil protocol error with `IllegalArgumentException`.

## Legacy 22x17 Cape Compatibility

The authlib-injector specification allows legacy capes sized as multiples of `22x17`, but that is not the standard cape canvas. AsterYggdrasil normalizes those capes during upload by padding them with transparent pixels to the matching standard `64x32` canvas:

- `22x17` is stored as `64x32`.
- `44x34` is stored as `128x64`.
- Original pixels are kept from the top-left corner.
- Newly added pixels are fully transparent.

This normalization happens before storage, so metadata, public reads, hashes, reference counting, and orphan cleanup all operate on the processed PNG. Clients always receive a sanitized PNG from the public texture URL.

## Re-encoding and Hashes

The server decodes uploaded PNG files to RGBA and writes them back as PNG. This strips non-bitmap PNG metadata and prevents clients from receiving extra data embedded in user uploads.

The texture hash is calculated from the processed PNG bytes and is used as the final path segment of the public URL:

```text
/api/yggdrasil/textures/{sha256}
```

Minecraft/authlib-injector clients treat the URL filename as the texture identifier for caching, so the same processed image maps to a stable hash.

## Public URL and skinDomains

The texture URL inside the `textures` property must be an absolute URL reachable by clients. For normal deployments, configure `public_site_url`; the server derives `{public_site_url}/api/yggdrasil/textures/{hash}`. If the advanced `yggdrasil_public_base_url` override is configured, the server uses the first valid http/https URL instead. A publicly readable object store or CDN can also set `yggdrasil_texture_public_base_url` so uploaded textures use `{base}/{storage_key}`; default skins still use the Yggdrasil API.

When `yggdrasil_texture_public_base_url` is configured, the admin and account frontend previews also load that object-storage/CDN URL directly. The bucket or CDN must allow anonymous `GET`/`HEAD` CORS reads from public site origins. Uploads do not need browser CORS because AsterYggdrasil always uploads to object storage by server-side streaming.

authlib-injector validates that texture URL domains are included in metadata `skinDomains`. Metadata automatically includes Mojang's official domains `.minecraft.net` and `.mojang.com`, plus the current effective texture URL host. `yggdrasil_skin_domains` is only for additional CDN or external texture domains.

## Storage and Maintenance

Local, S3, and MinIO object storage are supported and selected through the static `object_storage` config. After a successful upload, only the processed PNG is stored; the raw upload is not retained.

Runtime maintenance tasks include:

- `yggdrasil-texture-cleanup`: deletes texture objects that have no database reference.
- `yggdrasil-storage-consistency-check`: checks whether database texture rows point to missing objects, and whether object storage keys still match database hashes.
- `yggdrasil-token-cleanup`: removes expired or revoked Yggdrasil tokens.

Texture deletion removes the database reference first, then deletes the object only when the reference count reaches zero. If multiple profiles reference the same hash, the object remains available until the last reference is removed.
