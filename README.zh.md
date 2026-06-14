# AsterYggdrasil

用 Rust 写的自托管 Minecraft 身份基础设施：皮肤站、玩家档案服务，以及兼容 Yggdrasil/authlib-injector 的认证服务器。它面向需要自己控制账号、角色、材质和启动器登录链路的私有 Minecraft 部署。

项目是一个 MIT 协议的 Rust + React 单体服务：默认 SQLite，可兼容 MySQL/PostgreSQL；带运行时配置、审计日志、cache 驱动的启动器会话、管理员 API 和内嵌前端资源。

- English README: [README.md](README.md)
- 公开文档: [docs/index.md](docs/index.md)
- 开发者文档: [developer-docs/README.md](developer-docs/README.md)
- Docker 说明: [docs/deployment/docker.md](docs/deployment/docker.md)
- 配置示例: [config.example.toml](config.example.toml)
- 前端面板: [frontend-panel/](frontend-panel/)

## AsterYggdrasil 是什么？

AsterYggdrasil 是一个自托管 Minecraft 皮肤站和认证服务器。它实现项目自己的账号系统、外部登录地基、Minecraft 玩家档案、Yggdrasil 启动器认证、session join 检查、运行时功能开关，以及运营私有 Minecraft 身份服务需要的审计能力。

它不是云盘、私有云或通用 SaaS 模板。当前 React 面板仍然可以当成 Vite、service 生成和 shadcn/ui 接线方式的技术参考，但产品域已经明确是 Minecraft/Yggdrasil：用户、玩家档案、皮肤、披风、启动器登录、sessionserver 兼容、密钥、cache 和管理后台。

当前 `0.0.0-alpha` 仍是早期产品线。后端地基已经比较完整，但 Minecraft 材质系统和最终前端体验还在继续落地。

## 适合什么场景

AsterYggdrasil 适合这些需求：

- 想要一个自托管服务来管理 Minecraft 账号、玩家档案和启动器认证
- 需要兼容 Yggdrasil/authlib-injector 协议端点
- 默认用 SQLite 起步，后续按需要切到 PostgreSQL 或 MySQL
- 需要本地账号认证，也需要外部认证 provider 地基
- 功能开关要存进 `system_config`，可以运行时调整
- join/hasJoined 临时会话应该放 cache，而不是写成持久数据库状态
- profile 创建、认证和 session 写操作需要结构化审计日志
- 希望 Rust 代码边界清楚：DTO validate、service/repository、migration、OpenAPI 和测试都摆在明面上

AsterYggdrasil 目前不适合这些需求：

- 给任意公网客户端替代官方 online-mode 的通用 Minecraft 账号服务
- 完整游戏服务器管理面板
- 文件存储、WebDAV、WOPI、团队分享或云盘系统
- 现在就要一个完成度很高的视觉化皮肤市场
- 多主集群、自动故障切换或企业合规保证
- 希望别人托管一切、自己不承担部署和数据责任的 SaaS

## 设计重点

- **协议兼容优先** - Yggdrasil/authlib-injector 端点返回协议原生响应体和状态码，不套项目 API envelope。
- **产品边界清楚** - Minecraft profile、texture、Yggdrasil token 和 launcher session 是一等领域概念，旧云盘概念不要混进来。
- **运行时可控** - 角色名登录、材质上传等功能开关存在 `system_config`，运营时不需要改 `config.toml`。
- **Token 安全** - Yggdrasil access token 入库前会 hash；client token、selected profile、过期、撤销和用户活跃 token 上限都在 token repo/service 层处理。
- **该用 cache 就用 cache** - join 临时记录通过共享 cache 系统保存短 TTL，不作为持久数据库状态。
- **结构化错误** - 项目 API 使用 `AsterError` 和稳定 `AsterErrorCode`；Yggdrasil API 有单独的结构化协议错误映射。
- **审计可展示** - 安全相关写操作使用 `audit_service::log_with_details(...)`，并提供 admin 前端可直接展示的 presentation metadata。
- **方便二开** - Actix Web、SeaORM、React、shadcn/ui、DTO validate、migration 和测试都保持显式、可读。

## 快速开始

### 使用 Docker 运行

本地 HTTP 试用时，先准备可写数据目录，再启动服务：

```bash
mkdir -p ./data

docker run -d \
  --name asteryggdrasil \
  -p 3000:3000 \
  -e ASTER__SERVER__HOST=0.0.0.0 \
  -e ASTER__AUTH__BOOTSTRAP_INSECURE_COOKIES=true \
  -e "ASTER__DATABASE__URL=sqlite:///data/asteryggdrasil.db?mode=rwc" \
  -v "$(pwd)/data:/data" \
  ghcr.io/astercommunity/asteryggdrasil:latest
```

打开：

```text
http://127.0.0.1:3000
```

`ASTER__AUTH__BOOTSTRAP_INSECURE_COOKIES=true` 只适合本地或内网 HTTP 测试。正式环境请放到 HTTPS 后面，并保持安全 Cookie 开启。

也可以直接使用仓库里的 Compose 文件：

```bash
mkdir -p ./data
docker compose up -d
```

部署说明见 [docs/deployment/docker.md](docs/deployment/docker.md)。

### 从源码运行

```bash
git clone https://github.com/AsterCommunity/AsterYggdrasil.git
cd AsterYggdrasil

cd frontend-panel
bun install
bun run build
cd ..

cargo run
```

首次启动时，AsterYggdrasil 会自动：

- 如果缺失则生成 `data/config.toml`
- 使用默认数据库地址时创建 SQLite 数据库
- 执行全部数据库迁移
- 初始化写入 `system_config` 的内置运行时配置项
- 在 `127.0.0.1:3000` 启动 HTTP 服务

创建首个管理员：

```bash
curl -X POST http://127.0.0.1:3000/api/v1/auth/setup \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","email":"admin@example.com","password":"change-me-please"}'
```

## 生产部署提醒

- 不要直接把 `:3000` 暴露到公网。请放在反向代理后面，由代理处理 HTTPS、上传限制、真实客户端 IP 和安全响应头。
- 在把 launcher metadata 发给用户前，先配置稳定的公开访问地址。
- 正式环境必须使用强 `auth.jwt_secret` 和安全 Cookie 配置。
- 提前规划数据库、配置、上传材质 blob 和外部身份 provider 密钥的备份。
- 如果配置 Redis，要监控 Redis。cache disabled 或 Redis 不可用时可以退回 memory cache，但 join session 会变成节点本地状态。
- Yggdrasil 签名密钥属于敏感运维材料。开启严格 authlib-injector 客户端前，要先测试公钥导出和 texture property 签名。

## 核心能力

### 账号与登录

- 首个管理员初始化、注册、登录、刷新、登出、当前用户和会话管理
- Argon2 密码 hash
- 外部认证 provider 管理和回调地基
- 注册/认证相关运行时开关通过 `system_config` 管理
- 项目 API 使用稳定 `AsterErrorCode`

### Minecraft 玩家档案

- 单独的 Minecraft profile 表，绑定到用户
- 32 位 unsigned Minecraft UUID
- 玩家名校验：3-16 位 ASCII 字母、数字或下划线
- 当前用户 profile 列表和创建接口：`/api/v1/profiles/minecraft`
- 角色名登录由运行时配置控制

### Yggdrasil 协议 API

- 服务 metadata：`GET /`
- authserver 端点：
  - `POST /authserver/authenticate`
  - `POST /authserver/refresh`
  - `POST /authserver/validate`
  - `POST /authserver/invalidate`
  - `POST /authserver/signout`
- sessionserver 端点：
  - `POST /sessionserver/session/minecraft/join`
  - `GET /sessionserver/session/minecraft/hasJoined`
  - `GET /sessionserver/session/minecraft/profile/{uuid}`
- 批量 profile 查询：
  - `POST /api/profiles/minecraft`
- 协议原生错误体，保证 launcher 兼容
- access token hash 入库、撤销、过期、refresh 轮换和按用户裁剪活跃 token

### 材质系统

- Minecraft texture 领域模型正在以独立方式接入，不复用旧文件存储概念
- skin/cape 上传能力由 Yggdrasil 运行时配置控制
- texture storage 走专门的材质存储抽象
- 后续会继续补 MIME/尺寸校验、公开读取 Cache-Control 和签名 texture property

### 管理与运维

- 基于 `system_config` 的管理员运行时配置 API
- 带 presentation metadata 的审计日志查询 API
- 后台任务记录、dispatch、retry、cleanup、lease/heartbeat 和 runtime task presentation
- 邮件运行时配置、持久 outbox、测试邮件和邮件审计
- 健康检查接口：`/health`、`/health/ready`，以及可选 `/health/metrics`
- memory 和 Redis cache 实现，统一挂在 cache trait 后面
- primary/follower 启动模式，用来区分 primary-only 周期任务和公共运行时初始化

## 重要接口

```text
GET  /

POST /authserver/authenticate
POST /authserver/refresh
POST /authserver/validate
POST /authserver/invalidate
POST /authserver/signout

POST /sessionserver/session/minecraft/join
GET  /sessionserver/session/minecraft/hasJoined
GET  /sessionserver/session/minecraft/profile/{uuid}

POST /api/profiles/minecraft

GET  /health
GET  /health/ready
GET  /health/metrics                    # 需要 --features metrics

GET  /api/v1/system/info

POST /api/v1/auth/setup
POST /api/v1/auth/register
POST /api/v1/auth/login
POST /api/v1/auth/refresh
POST /api/v1/auth/logout
GET  /api/v1/auth/me
GET  /api/v1/auth/sessions

GET  /api/v1/profiles/minecraft
POST /api/v1/profiles/minecraft

GET    /api/v1/admin/config
GET    /api/v1/admin/config/schema
GET    /api/v1/admin/config/template-variables
GET    /api/v1/admin/config/{key}
PUT    /api/v1/admin/config/{key}
DELETE /api/v1/admin/config/{key}
POST   /api/v1/admin/config/mail/action

GET  /api/v1/admin/audit-logs

GET  /api/v1/admin/tasks
POST /api/v1/admin/tasks/cleanup
POST /api/v1/admin/tasks/{id}/retry

GET    /api/v1/admin/external-auth/provider-kinds
GET    /api/v1/admin/external-auth/providers
POST   /api/v1/admin/external-auth/providers
GET    /api/v1/admin/external-auth/providers/{id}
PATCH  /api/v1/admin/external-auth/providers/{id}
DELETE /api/v1/admin/external-auth/providers/{id}
POST   /api/v1/admin/external-auth/providers/test
POST   /api/v1/admin/external-auth/providers/{id}/test
```

debug 构建加 `openapi` feature 时，可以导出静态 OpenAPI：

```bash
cargo test --features openapi generate_openapi
cd frontend-panel
bun run generate-api
```

## 配置模型

静态配置默认从 `data/config.toml` 读取，可以用 `ASTER__...` 环境变量覆盖：

```bash
ASTER__SERVER__HOST=0.0.0.0
ASTER__SERVER__PORT=3000
ASTER__SERVER__START_MODE=primary
ASTER__DATABASE__URL='sqlite:///data/asteryggdrasil.db?mode=rwc'
ASTER__AUTH__JWT_SECRET='replace-with-a-long-random-secret'
```

完整静态配置见 [config.example.toml](config.example.toml)。

运行时配置存在 `system_config`，通过 Admin Config API/UI 修改。功能开关和无需改 `config.toml` 就要热调整的值放运行时配置；数据库 URL、监听地址、密钥这类启动关键值放静态配置。

当前 Yggdrasil 运行时配置包括：

- `yggdrasil_server_name`
- `yggdrasil_allow_profile_name_login`
- `yggdrasil_allow_skin_upload`
- `yggdrasil_allow_cape_upload`
- `yggdrasil_token_ttl_days`
- `yggdrasil_max_active_tokens`
- `yggdrasil_skin_domains`
- `yggdrasil_signature_public_key`

## 开发

### 环境要求

- Rust `1.94.0+`
- Bun
- Node.js，用于前端工具链
- 默认 SQLite

### 常用命令

```bash
# 后端
cargo fmt
cargo check
cargo test
cargo test --lib
cargo test --test test_yggdrasil
cargo test --test test_audit
cargo test --test test_cache
cargo test --test test_config
cargo test --features openapi --test generate_openapi
cargo test --features metrics
cargo run

# 前端
cd frontend-panel
bun install
bun run dev
bun run build
bun run check
bun run test
bun run test:e2e
```

### 前端说明

- 当前 `frontend-panel/` 仍然是模板/demo 级 UI。
- 技术栈可以保留：React、Vite、TypeScript、Tailwind CSS、shadcn/ui、Biome、Vitest、Playwright。
- 做真实产品前端时，不要继承旧页面结构、视觉风格或信息架构。
- 新 UI 应围绕登录/注册、玩家档案、材质上传和预览、authlib-injector 接入、管理员配置、用户和审计日志来设计。
- 禁止 TypeScript `enum`，请使用 `as const` 对象。
- 类型导入必须使用 `import type`。

## 项目结构

```text
src/                         Rust 后端
src/api/                     路由、DTO、OpenAPI 注册、middleware、响应 envelope
src/cache/                   Cache trait 和 memory/Redis 实现
src/config/                  静态配置、运行时配置定义、normalizer
src/db/                      数据库连接、重试、事务、repository
src/entities/                SeaORM entity model
src/metrics/                 metrics feature 下的 Prometheus 实现
src/runtime/                 App state、启动、关闭、日志、后台任务 loop
src/services/                auth、external auth、config、mail、audit、task、health、Yggdrasil
src/texture_storage/         Minecraft 材质存储抽象
src/types/                   共享 domain enum 和 DB wrapper type
src/utils/                   crypto、ID、path、number、email、RAII helper
migration/                   SeaORM migration crate
api-docs-macros/             OpenAPI helper macro crate
frontend-panel/              React 管理面板，目前仍是 demo 级
developer-docs/              开发者文档
docs/                        用户/部署文档站
tests/                       集成测试和 OpenAPI 导出测试
tmp/authlib-injector/wiki/   本地 clone 的 authlib-injector/Yggdrasil 参考 wiki
```

## 测试覆盖重点

这轮新增/扩展的 Yggdrasil 测试覆盖：

- authenticate、validate、refresh、invalidate、signout 完整流程
- 无 profile、单 profile、多 profile 的 selectedProfile 行为
- profile-name login 运行时配置
- DTO validate 和协议错误体格式
- 项目 profile API 的 validate 和 envelope 格式
- join/hasJoined cache 会话，包括 memory fallback
- 批量 profile 查询边界
- token hash 入库和活跃 token 裁剪
- profile/auth/session 写操作的 audit 记录和 presentation code

## License

MIT. See [LICENSE](LICENSE).
