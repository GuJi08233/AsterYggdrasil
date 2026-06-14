---
layout: home
description: AsterYggdrasil 是自建 Minecraft 皮肤站与 Yggdrasil/authlib-injector 认证服务器。

hero:
  name: AsterYggdrasil
  text: Minecraft 皮肤站 + 认证服务器
  tagline: 自建 Yggdrasil API、authlib-injector 接入、启动器登录、玩家档案、皮肤/披风材质管理、签名密钥、审计和后台维护任务。
  actions:
    - theme: brand
      text: 快速开始
      link: /guide/getting-started
    - theme: alt
      text: 接入 authlib-injector
      link: /guide/yggdrasil-api
    - theme: alt
      text: 部署
      link: /deployment/docker

features:
  - title: Yggdrasil API
    details: "`/api/yggdrasil` 提供 metadata、authenticate、refresh、validate、invalidate、signout、join、hasJoined 和 profile 查询。"
    link: /guide/yggdrasil-api
  - title: 启动器登录
    details: 支持 accessToken/clientToken、selectedProfile、refresh、profile name 登录开关和 authlib-injector profile 属性。
    link: /guide/launcher-login
  - title: 玩家档案
    details: Minecraft profile 独立建模，名称唯一，创建后不可改名；删除会回收材质引用并吊销相关 token。
    link: /guide/profiles
  - title: 材质系统
    details: 支持 skin/cape 上传、PNG 安全重编码、22x17 cape 自动补透明、公开 hash URL、metadata 和管理删除。
    link: /guide/yggdrasil-textures
  - title: 配置和密钥
    details: "Yggdrasil 运行时配置走 system_config，签名私钥只能通过 config action 轮换，敏感配置不会从 API 泄露。"
    link: /guide/configuration
  - title: 维护任务
    details: 后台任务负责过期 token 清理、孤儿材质对象清理、存储一致性检查、审计和 task artifact 清理。
    link: /guide/audit-tasks
---

AsterYggdrasil 的产品定位是自建 Minecraft 皮肤站和 Yggdrasil/authlib-injector 认证服务器。文档围绕真实皮肤站部署、启动器接入、玩家档案、材质管理和管理员运维展开。

## 核心入口

认证服务器根路径是：

```text
/api/yggdrasil
```

站点首页会返回 `X-Authlib-Injector-API-Location: /api/yggdrasil/`，支持 authlib-injector 的启动器可以通过 ALI 从站点首页发现 API 地址。

常用公开端点：

```text
GET  /api/yggdrasil
POST /api/yggdrasil/authserver/authenticate
POST /api/yggdrasil/authserver/refresh
POST /api/yggdrasil/sessionserver/session/minecraft/join
GET  /api/yggdrasil/sessionserver/session/minecraft/hasJoined
GET  /api/yggdrasil/sessionserver/session/minecraft/profile/{uuid}
GET  /api/yggdrasil/textures/{hash}
```

站点和管理 API 仍在 `/api/v1` 下，例如 profile 管理、材质 metadata、配置、审计和后台任务。

## 推荐阅读顺序

1. [快速开始](./guide/getting-started.md)：本地启动、创建首个管理员、确认 Yggdrasil metadata。
2. [Yggdrasil API](./guide/yggdrasil-api.md)：API 根路径、ALI、metadata、签名和协议错误。
3. [启动器登录](./guide/launcher-login.md)：authenticate/refresh/clientToken/selectedProfile 的兼容行为。
4. [玩家档案](./guide/profiles.md)：profile 创建、删除、不可改名和管理 API。
5. [材质处理](./guide/yggdrasil-textures.md)：skin/cape 上传、22x17 cape、hash、公开读取和 skinDomains。
6. [配置和密钥](./guide/configuration.md)：system_config、public base URL、skinDomains、签名 key rotate。
7. [材质存储](./guide/storage.md)：local backend、未来 S3 schema 和一致性检查。
8. [审计与后台任务](./guide/audit-tasks.md)：管理员可见的审计、runtime task 和维护策略。
9. [部署](./deployment/docker.md)：反向代理、公开 URL、可信代理和容器持久化。

## 当前边界

- Minecraft profile name 创建后不可改名。需要换名时删除并重新创建 profile。
- profile 禁用不在当前版本里直接加字段，后续会通过统一封禁系统定义登录、join、hasJoined 和材质访问语义。
- 当前 texture storage 生产可用 backend 是 local。S3/minio 配置形状已预留，但 backend 实现还需要后续接入。
- 前端管理面板仍在重写中，文档优先描述稳定后端能力和部署语义。
