# 对象存储

AsterYggdrasil 通过 object storage backend 保存处理后的 PNG 材质和上传头像。上传原文件只作为临时输入，处理完成后不会持久保存。头像不再有单独的本地目录配置，会跟随同一个 `object_storage` backend。

## 本地存储

使用本地后端时配置为：

```toml
[object_storage]
backend = "local"
local_root = "storage"
```

当配置文件位于 `data/config.toml` 时，相对路径会按 `data/` 解析，所以默认实际路径是：

```text
data/storage
```

材质对象按 hash 分片保存，上传头像使用 `avatar/` 前缀，例如：

```text
data/storage/ab/abcdef...png
data/storage/avatar/user/1/v1/512.webp
```

公开 URL 不直接暴露文件系统路径，而是通过：

```text
GET /api/yggdrasil/textures/{hash}
```

## S3/minio

`s3` 和 `minio` backend 使用服务端 streaming 上传处理后的 PNG，不提供客户端 presigned 上传入口：

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

`base_path` 是桶内前缀，例如 `env/production/textures`。数据库里的 object storage key 不包含这个前缀，服务端会在访问 S3 时自动拼接。

## Public URL 的关系

object storage 决定对象保存在哪里；`yggdrasil_public_base_url` 决定默认情况下客户端看到的材质 API URL。

例如：

```json
["https://skin.example.com/api/yggdrasil"]
```

会生成类似：

```text
https://skin.example.com/api/yggdrasil/textures/{hash}
```

未单独配置 `yggdrasil_public_base_url` 时，服务端会优先从 `public_site_url` 派生材质 URL。生产协议响应需要绝对 URL；如果公开 URL 配置都不可用，Yggdrasil profile textures 会返回配置错误。

如果 S3 bucket 或前置 CDN 是公开读、私有写，可以额外设置运行时配置 `yggdrasil_texture_public_base_url`，让已上传材质的 Yggdrasil `textures` property 直接返回对象存储/CDN URL：

```text
https://cdn.example.com/env/production/textures
```

生成的 URL 会拼接 object storage key，例如：

```text
https://cdn.example.com/env/production/textures/ab/abcdef...png
```

默认皮肤是内置资源，不在对象存储里；默认皮肤 URL 仍走 `/api/yggdrasil/textures/{hash}`。

浏览器里的材质预览会以匿名 CORS 模式加载这些 CDN/桶 URL。启用 `yggdrasil_texture_public_base_url` 后，需要在对象存储 bucket 或 CDN 上允许站点来源读取 PNG，否则 3D 预览可能加载失败。最小规则是：

- Allowed origins: `public_site_url` 中对外服务的站点来源。
- Allowed methods: `GET`, `HEAD`。
- Allowed headers: `*` 或至少允许普通读取所需头。
- Exposed headers: `Content-Type`, `Content-Length`, `ETag`。
- 不需要为上传开放浏览器 CORS；AsterYggdrasil 只做服务端 streaming 上传，不提供 presigned 上传。

## 清理和一致性

运行时任务：

- `yggdrasil-texture-cleanup`: 删除 object storage 中没有数据库引用的材质对象。
- `yggdrasil-storage-consistency-check`: 检查数据库 texture 记录是否指向缺失对象，以及 object storage key 是否和数据库 hash 一致，不读取对象内容。

删除 profile、texture 或切换上传头像来源时，服务端会先更新数据库状态，再按引用计数或头像版本删除对象。不要绕过服务层直接删 object storage 文件，否则一致性检查或头像读取会报告 missing object。
