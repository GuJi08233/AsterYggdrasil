# 快速开始

这一页用于在本地启动 AsterYggdrasil，并确认管理 API、Yggdrasil metadata 和材质存储都能工作。

## 前置条件

- Rust stable toolchain。
- SQLite。默认配置使用本地 SQLite，不需要额外数据库服务。
- Bun。只有运行文档站或前端管理面板时需要。

## 启动后端

```bash
cargo run
```

首次启动会创建运行时目录和默认静态配置。默认配置文件位置是：

```text
data/config.toml
```

默认监听地址：

```text
http://127.0.0.1:3000
```

健康检查：

```text
GET /health
GET /health/ready
```

## 初始化管理员

站点内置本地认证和管理员能力。第一次运行时，通过 setup/register/login 流程创建管理员账号，然后使用管理 API 配置 Yggdrasil 行为。

管理员能力包括：

- 查看和更新运行时配置。
- 执行 Yggdrasil 签名密钥轮换 action。
- 查看 audit logs。
- 查看和重试后台任务。
- 管理 Minecraft profiles 和 textures。

## 验证 Yggdrasil metadata

启动后访问：

```text
GET /api/yggdrasil
GET /api/yggdrasil/
```

响应是 authlib-injector metadata，不使用项目 API envelope。它应该包含：

- `meta.serverName`
- `skinDomains`
- `signaturePublickey`
- `feature`

站点首页 `/` 会返回：

```text
X-Authlib-Injector-API-Location: /api/yggdrasil/
```

支持 ALI 的启动器可以只填写站点地址，再自动发现真正的 Yggdrasil API 根路径。

## 创建 Minecraft profile

登录站点账号后，用户可以创建自己的 Minecraft profile：

```text
POST /api/v1/profiles/minecraft
GET  /api/v1/profiles/minecraft
```

profile name 创建后不可改名。需要换名时删除旧 profile 并重新创建。

## 上传材质

Yggdrasil 材质上传端点：

```text
PUT    /api/yggdrasil/api/user/profile/{uuid}/skin
PUT    /api/yggdrasil/api/user/profile/{uuid}/cape
DELETE /api/yggdrasil/api/user/profile/{uuid}/skin
DELETE /api/yggdrasil/api/user/profile/{uuid}/cape
```

上传请求需要 Yggdrasil access token。服务端会校验 token、profile 所属关系、上传开关、MIME、PNG 尺寸，并把图片重编码为安全 PNG。

公开读取：

```text
GET /api/yggdrasil/textures/{hash}
```

## 本地文档站

```bash
cd docs
bun install
bun run docs:dev
```

构建文档：

```bash
cd docs
bun run docs:build
```

## 下一步

- [Yggdrasil API](./yggdrasil-api.md)
- [启动器登录](./launcher-login.md)
- [玩家档案](./profiles.md)
- [材质处理](./yggdrasil-textures.md)
- [配置和密钥](./configuration.md)
