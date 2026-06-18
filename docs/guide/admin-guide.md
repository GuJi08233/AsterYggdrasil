---
description: AsterYggdrasil 管理员指南，说明管理员需要维护的用户、profile、材质、配置、审计和后台任务。
---

# 管理员指南

::: tip 这一篇覆盖什么
这页按管理员日常工作组织，不替代具体配置页。配置细节看 [配置和密钥](/guide/configuration)。
:::

## 管理员要管什么

管理员主要维护六类对象：

| 对象 | 你要关心什么 |
| --- | --- |
| 用户 | 谁能登录站点，谁是管理员，会话是否需要吊销 |
| Minecraft profile | 玩家名、UUID、所属用户、改名和删除 |
| 材质 | skin/cape 上传、绑定、公开读取和孤儿清理 |
| Yggdrasil 配置 | 公开 URL、profile name 登录、上传开关、token 策略 |
| 签名密钥 | metadata 公钥、textures property 签名、key rotate |
| 审计和任务 | 管理操作、登录协议行为、清理任务和失败重试 |

## 第一次管理员账号

第一次运行时，通过 setup 流程创建首个账号：

```text
POST /api/v1/auth/setup
```

第一个账号会成为管理员。之后管理员可以管理用户、运行时配置、Minecraft profiles、审计日志和后台任务。

## 管理员和 operator

`admin` 拥有全部管理权限。`operator` 是分权管理角色，只能访问授予的 scope。当前 scope 包括：

- `overview`
- `users`
- `profiles`
- `texture_library`
- `audit`
- `tasks`
- `settings`
- `external_auth`

创建或更新用户时可以设置角色和 operator scopes。没有对应 scope 的 operator 不能访问相关管理 API，也不会在前端看到对应管理入口。

## 管用户和 profile

用户是站点登录身份，Minecraft profile 是进服身份。一个用户可以拥有多个 profile。

常用管理员 API：

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

改 profile name 必须走 API。直接改数据库会让 token、启动器缓存、白名单、材质属性和审计互相不一致。

## 管材质

材质分两层：

- wardrobe：用户自己的材质库。
- profile texture：绑定到某个 Minecraft profile 的 skin/cape 槽位。

管理员可以查看 profile 绑定的材质，也可以删除绑定或按 hash 删除材质引用：

```text
GET    /api/v1/admin/minecraft-profiles/{uuid}/textures
DELETE /api/v1/admin/minecraft-profiles/{uuid}/textures/{skin|cape}
DELETE /api/v1/admin/minecraft-textures/{hash}
```

删除会走服务层引用计数。不要直接删 storage 文件，否则一致性检查会报告 missing object。

## 管公共材质库

公共材质库是 wardrobe 之上的发布层。用户先把材质上传到自己的 wardrobe，再把材质设置为公开并提交到公共库。

管理员后台目前分成几类页面：

- 全部材质：查看用户上传到系统的材质，按公开库状态、可见性、是否发布等条件筛选。
- 审核队列：处理用户提交的待审核材质。
- 举报队列：处理登录用户对已发布公共材质的举报。
- 标签管理：维护公共材质库标签。

管理员 API：

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

审核通过会把材质设为 `published`。审核打回会把材质设为 `rejected`，并把审核意见展示给材质所有者。下架会把已发布材质移出公共库，用户 wardrobe 中仍保留该材质，并能看到下架说明。

举报成立会下架对应材质；举报驳回不会改变材质发布状态。如果管理员直接下架一个已发布材质，系统会把该材质尚未处理的 pending 举报同步标记为成立，避免举报队列残留过期记录。

## 管配置

运行时配置通过 Admin Config API 修改：

```text
GET    /api/v1/admin/config
GET    /api/v1/admin/config/schema
PUT    /api/v1/admin/config/{key}
DELETE /api/v1/admin/config/{key}
POST   /api/v1/admin/config/{key}/action
```

上线前优先确认：

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

签名私钥不应手动修改。轮换应使用 action：

```text
rotate_yggdrasil_signature_key
```

## 看审计和后台任务

管理员操作、Yggdrasil 登录行为、材质上传/删除、profile 创建/删除/改名都会写入审计。

```text
GET /api/v1/admin/audit-logs
GET /api/v1/admin/tasks
POST /api/v1/admin/tasks/cleanup
POST /api/v1/admin/tasks/{id}/retry
```

重点关注：

- `yggdrasil-token-cleanup`
- `yggdrasil-texture-cleanup`
- `yggdrasil-storage-consistency-check`

如果一致性检查失败，先确认数据库和 object storage 是否被人工改动或只恢复了一半备份。
