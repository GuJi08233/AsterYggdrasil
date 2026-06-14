# Texture Storage

AsterYggdrasil stores processed PNG files through a texture storage backend. Raw uploads are temporary inputs and are not retained after processing.

## Local Storage

The current production backend is `local`:

```toml
[texture_storage]
backend = "local"
local_root = "textures"
```

When the config file lives at `data/config.toml`, relative paths resolve under `data/`, so the default effective path is:

```text
data/textures
```

Texture objects are sharded by hash, for example:

```text
data/textures/ab/abcdef...png
```

The public URL does not expose filesystem paths directly. It is served through:

```text
GET /api/yggdrasil/textures/{hash}
```

## Reserved S3/minio Shape

The config file already reserves an S3 schema:

```toml
[texture_storage.s3]
endpoint = ""
region = ""
bucket = ""
access_key_id = ""
secret_access_key = ""
force_path_style = false
```

The S3/minio backend is not implemented yet. The schema is reserved so future object-storage support can be added without breaking deployment config.

## Relation to Public URL

Texture storage decides where objects are stored. `yggdrasil_public_base_url` decides which URL clients see.

For example:

```json
["https://skin.example.com/api/yggdrasil"]
```

generates URLs like:

```text
https://skin.example.com/api/yggdrasil/textures/{hash}
```

When `yggdrasil_public_base_url` is not configured, the server derives texture URLs from `public_site_url`. Production protocol responses require absolute URLs; if both public URL settings are unusable, Yggdrasil profile texture responses return a configuration error.

## Cleanup and Consistency

Runtime tasks:

- `yggdrasil-texture-cleanup`: deletes storage objects that have no database reference.
- `yggdrasil-storage-consistency-check`: checks for missing objects and hash mismatches between database rows and stored object bytes.

When deleting a profile or texture, the service removes the database reference first, then deletes the object only if its reference count reaches zero. Do not delete storage files directly outside the service layer; consistency checks will report missing objects.
