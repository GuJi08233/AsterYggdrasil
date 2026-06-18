# 材质存储

AsterYggdrasil 通过 texture storage backend 保存处理后的 PNG。上传原文件只作为临时输入，处理完成后不会持久保存。

## 本地存储

使用本地后端时配置为：

```toml
[texture_storage]
backend = "local"
local_root = "textures"
```

当配置文件位于 `data/config.toml` 时，相对路径会按 `data/` 解析，所以默认实际路径是：

```text
data/textures
```

材质对象按 hash 分片保存，例如：

```text
data/textures/ab/abcdef...png
```

公开 URL 不直接暴露文件系统路径，而是通过：

```text
GET /api/yggdrasil/textures/{hash}
```

## S3/minio

`s3` 和 `minio` backend 使用服务端 streaming 上传处理后的 PNG，不提供客户端 presigned 上传入口：

```toml
[texture_storage]
backend = "s3"

[texture_storage.s3]
endpoint = ""
region = ""
bucket = ""
base_path = ""
access_key_id = ""
secret_access_key = ""
force_path_style = false
```

`base_path` 是桶内前缀，例如 `env/production/textures`。数据库里的 texture storage key 不包含这个前缀，服务端会在访问 S3 时自动拼接。

## Public URL 的关系

texture storage 决定对象保存在哪里；`yggdrasil_public_base_url` 决定默认情况下客户端看到的材质 API URL。

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

生成的 URL 会拼接 texture storage key，例如：

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

- `yggdrasil-texture-cleanup`: 删除 storage 中没有数据库引用的对象。
- `yggdrasil-storage-consistency-check`: 检查数据库 texture 记录是否指向缺失对象，以及 storage key 是否和数据库 hash 一致，不读取对象内容。

删除 profile 或 texture 时，服务端会先删除数据库引用，再按引用计数决定是否删除对象。不要绕过服务层直接删 storage 文件，否则一致性检查会报告 missing object。
