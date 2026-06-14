# 材质存储

AsterYggdrasil 通过 texture storage backend 保存处理后的 PNG。上传原文件只作为临时输入，处理完成后不会持久保存。

## 本地存储

当前生产可用 backend 是 `local`：

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

## S3/minio 预留

配置文件中已经预留 S3 schema：

```toml
[texture_storage.s3]
endpoint = ""
region = ""
bucket = ""
access_key_id = ""
secret_access_key = ""
force_path_style = false
```

当前 S3/minio backend 尚未实现。保留 schema 是为了后续接入对象存储时不破坏部署配置。

## Public URL 的关系

texture storage 决定对象保存在哪里；`yggdrasil_public_base_url` 决定客户端看到的材质 URL。

例如：

```json
["https://skin.example.com/api/yggdrasil"]
```

会生成类似：

```text
https://skin.example.com/api/yggdrasil/textures/{hash}
```

未单独配置 `yggdrasil_public_base_url` 时，服务端会优先从 `public_site_url` 派生材质 URL。生产协议响应需要绝对 URL；如果两个公开 URL 配置都不可用，Yggdrasil profile textures 会返回配置错误。

## 清理和一致性

运行时任务：

- `yggdrasil-texture-cleanup`: 删除 storage 中没有数据库引用的对象。
- `yggdrasil-storage-consistency-check`: 检查数据库 texture 记录是否指向缺失对象，以及对象内容 hash 是否和数据库 hash 一致。

删除 profile 或 texture 时，服务端会先删除数据库引用，再按引用计数决定是否删除对象。不要绕过服务层直接删 storage 文件，否则一致性检查会报告 missing object。
