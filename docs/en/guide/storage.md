# Object Storage

AsterYggdrasil stores processed PNG textures and uploaded avatars through an object storage backend. Raw uploads are temporary inputs and are not retained after processing. Avatars no longer have a separate local-directory setting; they follow the same `object_storage` backend.

## Local Storage

To use the local backend:

```toml
[object_storage]
backend = "local"
local_root = "storage"
```

When the config file lives at `data/config.toml`, relative paths resolve under `data/`, so the default effective path is:

```text
data/storage
```

Texture objects are sharded by hash, and uploaded avatars use the `avatar/` prefix, for example:

```text
data/storage/ab/abcdef...png
data/storage/avatar/user/1/v1/512.webp
```

The public URL does not expose filesystem paths directly. It is served through:

```text
GET /api/yggdrasil/textures/{hash}
```

## S3/minio

The `s3` and `minio` backends upload processed PNG files through server-side streaming. Client presigned uploads are not exposed:

```toml
[object_storage]
backend = "s3"

[object_storage.s3]
endpoint = ""
region = ""
bucket = ""
base_path = ""
access_key_id = ""
secret_access_key = ""
force_path_style = false
```

`base_path` is an optional object prefix such as `env/production/textures`. Object storage keys stored in the database do not include this prefix; the server prepends it when talking to S3.

## Relation to Public URL

Object storage decides where objects are stored. `yggdrasil_public_base_url` decides the default texture API URL clients see.

For example:

```json
["https://skin.example.com/api/yggdrasil"]
```

generates URLs like:

```text
https://skin.example.com/api/yggdrasil/textures/{hash}
```

When `yggdrasil_public_base_url` is not configured, the server derives texture URLs from `public_site_url`. Production protocol responses require absolute URLs; if public URL settings are unusable, Yggdrasil profile texture responses return a configuration error.

For a publicly readable, privately writable S3 bucket or CDN, set the runtime config `yggdrasil_texture_public_base_url` to return object-storage/CDN URLs for uploaded textures:

```text
https://cdn.example.com/env/production/textures
```

The generated URL appends the object storage key, for example:

```text
https://cdn.example.com/env/production/textures/ab/abcdef...png
```

Default skins are embedded resources and are not stored in S3, so default skin URLs still use `/api/yggdrasil/textures/{hash}`.

Browser texture previews load these CDN/bucket URLs in anonymous CORS mode. After enabling `yggdrasil_texture_public_base_url`, configure the object-storage bucket or CDN to allow site origins to read PNGs, otherwise the 3D preview can fail. A minimal rule is:

- Allowed origins: public site origins from `public_site_url`.
- Allowed methods: `GET`, `HEAD`.
- Allowed headers: `*`, or at least the headers needed for normal reads.
- Exposed headers: `Content-Type`, `Content-Length`, `ETag`.
- Do not enable browser upload CORS for this feature. AsterYggdrasil only performs server-side streaming uploads and does not expose presigned uploads.

## Cleanup and Consistency

Runtime tasks:

- `yggdrasil-texture-cleanup`: deletes texture objects that have no database reference.
- `yggdrasil-storage-consistency-check`: checks for missing texture objects and mismatches between database hashes and object storage keys without reading object bytes.

When deleting a profile or texture, or when switching away from an uploaded avatar, the service updates database state first and then deletes objects according to reference counts or avatar version keys. Do not delete object storage files directly outside the service layer; consistency checks or avatar reads will report missing objects.
