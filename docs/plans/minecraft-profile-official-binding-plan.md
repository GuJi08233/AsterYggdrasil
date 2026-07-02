# Minecraft 档案创建与正版绑定补充计划

## 目标

本计划用于补齐当前皮肤站用户主流程：

- 浏览器端注册和登录只使用 LinuxDo。
- Microsoft OAuth 只在创建/绑定正版 Minecraft 档案时出现。
- 普通用户默认只能拥有 1 个 Minecraft 档案，管理员可拥有多个。
- 自建档案创建前必须检测正版用户名占用，再检测站内占用。
- Microsoft 正版档案使用官方 UUID 和官方名称，不允许在皮肤站侧手动改名。
- Microsoft 正版绑定不可解绑。
- 个人设置中的启动器登录密码输入框需要对齐。

当前 `yggdrasil_max_profile_renames` 默认已经是 1，先不调整。后续再单独做管理员给用户增加或重置改名次数。


## 当前状态

已经完成或基本具备：

- LinuxDo 外部认证登录/自动注册用户。
- 外部认证 provider 支持 `allow_login` 和 `allow_unlink`。
- Microsoft 绑定流程已能获取 Minecraft Services profile，并创建/复用档案。
- Microsoft provider 可以设置 `allow_login=false`、`allow_unlink=false`。
- 普通用户默认 `yggdrasil_max_profiles_per_user=1`，管理员绕过数量限制。
- 档案默认最多改名 1 次。
- 外部认证用户可通过 `PUT /api/v1/auth/password/local` 设置启动器登录密码。

仍需补齐：

- 自建档案创建前缺少 Mojang 用户名占用检测。
- `minecraft_profiles` 缺少档案来源标记，当前只能通过 external identity 间接判断。
- Microsoft 正版档案还没有后端强制“禁止皮肤站侧改名”的明确规则。
- Microsoft 绑定不可解绑目前依赖 provider 配置，需要补充更硬的后端保护。
- 登录/注册“仅 LinuxDo”需要补齐默认配置、前端入口和后端防绕过校验。
- 个人设置密码输入框对齐问题需要修复。


## 用户流程

### 1. 新用户登录/注册

```text
用户打开站点
  -> 只看到 LinuxDo 登录入口
  -> LinuxDo OAuth 授权
  -> 自动创建站内用户
  -> 不自动创建 Minecraft 档案
  -> 进入工作台/账号设置，引导用户设置启动器密码和创建档案
```

要求：

- 站点本地账号密码登录默认关闭。
- 站点本地注册默认关闭。
- Microsoft 不出现在登录页，不参与站点注册/登录。
- 启动器/Yggdrasil 密码登录不受站点本地登录开关影响。


### 2. 用户设置启动器登录密码

```text
账号设置
  -> 启动器登录密码
  -> 输入新密码
  -> 再次确认新密码
  -> 保存
```

要求：

- 外部认证用户首次设置本地密码不需要当前密码。
- 两个新密码输入框在桌面和移动端都保持同宽、同列边界。
- 密码只用于本地/Yggdrasil 凭据，不能因此重新打开浏览器本地登录入口。


### 3. 创建皮肤站本地档案

```text
用户选择“创建皮肤站档案”
  -> 输入玩家名
  -> 校验格式
  -> 请求 Mojang API 检查正版用户名是否存在
  -> 若正版存在，拒绝创建并提示使用 Microsoft 正版绑定
  -> 若正版不存在，再检查站内档案名/用户名占用
  -> 都未占用，创建 source=local 档案
```

Mojang API 行为参考：

```text
GET https://api.mojang.com/users/profiles/minecraft/Gu___ji
```

存在时：

```json
{
  "id": "da54e3cc2d59409e8bf00267c4460117",
  "name": "Gu___ji"
}
```

不存在时：

```json
{
  "path": "/users/profiles/minecraft/Gu___ji1",
  "errorMessage": "Couldn't find any profile with name Gu___ji1"
}
```

实现决策：

- `200` 且包含 `id/name`：视为正版用户名已存在，拒绝本地创建。
- `404` 或 Mojang 返回明确 not found：视为正版用户名不存在。
- 网络超时、5xx、解析异常：先 fail-closed，返回“暂时无法验证正版用户名”，避免 Mojang 故障时抢占正版名。
- 测试使用 mock server，不直接依赖真实 Mojang 网络。


### 4. 绑定 Microsoft 正版档案

```text
用户选择“绑定正版账号”
  -> 跳转 Microsoft OAuth
  -> Xbox Live / XSTS / Minecraft Services
  -> 获取正版 UUID 和名称
  -> 写入 external_auth_identities
  -> 创建或复用 source=microsoft 档案
  -> 禁止解绑，禁止皮肤站侧改名
```

要求：

- Microsoft provider 不允许用于登录注册。
- Microsoft 绑定只允许已登录用户发起。
- 同一个正版 UUID 只能绑定到一个站内用户。
- 普通用户已拥有本地档案时，再绑定正版应受 1 档案限制约束。
- 普通用户已拥有正版档案时，再创建本地档案也应被 1 档案限制拒绝。
- 管理员可拥有多个档案，但 Microsoft UUID 仍必须全站唯一。


## UUID 与档案来源

Yggdrasil/authlib-injector 兼容要求 profile id 是 32 位无横线十六进制 UUID。

因此不使用前缀、不改 UUID 格式。使用字段区分来源：

```text
minecraft_profiles.uuid
  -> 始终是 32 位无横线 UUID

minecraft_profiles.source
  -> local      皮肤站本地档案
  -> microsoft  Microsoft 正版绑定档案
```

UUID 生成规则：

- `source=local`：使用随机 UUID v4，保存为 simple 格式。
- `source=microsoft`：使用 Minecraft Services 返回的官方 UUID，保存为 simple 格式。

需要新增强类型：

```rust
pub enum MinecraftProfileSource {
    Local,
    Microsoft,
}
```

数据库迁移：

- 给 `minecraft_profiles` 增加 `source` 字段，默认 `local`。
- 对已有数据做一次回填：
  - 如果存在 `external_auth_identities.identity_namespace =
    "https://api.minecraftservices.com/minecraft/profile"`
  - 且 `external_auth_identities.subject = minecraft_profiles.uuid`
  - 则标记为 `microsoft`


## 后端改动计划

### 1. Mojang 用户名检测服务

新增服务函数：

```text
yggdrasil_service::check_mojang_profile_name(name)
```

职责：

- 只接受已经通过本地格式校验的 Minecraft name。
- 调用 Mojang API。
- 返回 `Exists { uuid, name }` 或 `NotFound`。
- 统一 timeout、User-Agent、错误映射。

建议配置：

- `yggdrasil_mojang_name_check_enabled=true`
- `yggdrasil_mojang_name_check_timeout_secs=3`
- 后续可加缓存 TTL，避免频繁请求 Mojang。


### 2. 本地档案创建校验顺序

调整 `create_profile`：

```text
格式校验
  -> 用户封禁/数量限制
  -> Mojang 正版名检测
  -> 本地档案名/用户名占用检测
  -> 创建 source=local 档案
```

新增错误码建议：

```text
minecraft_profile.name_reserved_by_mojang
minecraft_profile.mojang_lookup_failed
```


### 3. 档案来源字段

新增 entity、migration、DTO 输出字段：

```text
source: local | microsoft
```

影响范围：

- `minecraft_profile` entity
- migration
- profile DTO
- admin profile list/detail
- OpenAPI
- 前端类型生成


### 4. Microsoft 正版档案禁止改名

调整 `rename_profile`：

```text
if profile.source == microsoft:
  reject minecraft_profile.official_name_readonly
```

注意：

- 这只禁止用户/管理员通过皮肤站 API 手动改名。
- 如果后续需要同步正版名，应做单独的“刷新正版信息”流程，不消耗改名次数。


### 5. Microsoft 绑定强制策略

在后端补硬校验：

- `start_login`：Microsoft provider 若配置为绑定用途，不能用于登录。
- `start_minecraft_binding`：只允许 Microsoft kind。
- `finish_minecraft_binding`：创建档案时写 `source=microsoft`。
- `delete_link`：Microsoft Minecraft namespace 的 identity 永远不可解绑，即使 provider 配置误设为 `allow_unlink=true`。

这样即使管理端配置错误，也不会让正版绑定被解绑或用于登录。


### 6. 官方名称同步预留

正版用户名可能在 Mojang/Microsoft 侧变化。

本轮先禁止皮肤站侧手动改名。后续建议补一个独立能力：

```text
POST /api/v1/profiles/minecraft/{uuid}/official-profile/refresh
```

行为：

- 重新走 Microsoft 授权或使用可用凭据获取官方 profile。
- 如果名称变化，更新 `minecraft_profiles.name`。
- 不增加 `rename_count`。
- 临时失效相关 Yggdrasil token，让启动器 refresh 后拿到新名称。


## 前端改动计划

### 1. 登录页

- 默认只展示 LinuxDo 登录入口。
- 当 `allow_local_login=false` 时隐藏账号密码登录表单。
- 当没有可用 LinuxDo provider 时显示明确错误状态。
- 不展示 Microsoft 登录入口。


### 2. 档案创建入口

在角色档案区域提供两个明确操作：

```text
创建皮肤站档案
绑定正版账号
```

创建皮肤站档案：

- 输入玩家名。
- 提交后由后端检查 Mojang 和本地占用。
- 如果 Mojang 已存在，提示“该名称属于正版账号，请使用正版绑定”。

绑定正版账号：

- 只调用 Microsoft binding provider 列表。
- 绑定成功后展示正版档案。
- 不提供解绑按钮。


### 3. 档案来源展示

在档案列表/详情中展示来源：

- `皮肤站档案`
- `正版 Microsoft`

对 `source=microsoft`：

- 隐藏或禁用改名入口。
- 显示“正版名称由 Microsoft/Mojang 管理”。


### 4. 启动器密码输入框对齐

修复账号设置页密码区域：

- 新密码和确认密码使用同一 grid 容器。
- 两个输入框使用相同宽度约束。
- 移动端单列，桌面端可双列，但 label/input/error 区块必须对齐。
- 避免一个字段因为说明文本导致输入框宽度或起点偏移。


## 测试计划

后端：

- LinuxDo provider 可登录注册，Microsoft provider 不出现在登录 provider 列表。
- Microsoft provider 调普通登录 start 被拒绝。
- 外部认证用户可设置本地/启动器密码。
- Mojang 返回存在时，本地档案创建被拒绝。
- Mojang 返回不存在时，再检查本地重复。
- Mojang 超时/5xx 时，本地档案创建 fail-closed。
- 本地档案创建后 `source=local`。
- Microsoft 绑定后 `source=microsoft`，UUID 等于官方 UUID。
- Microsoft 正版档案改名被拒绝。
- Microsoft Minecraft identity 删除被拒绝。
- 普通用户最多 1 个档案，管理员可多个。

前端：

- 登录页只展示 LinuxDo 登录。
- 账号设置页能展示 Microsoft 绑定入口。
- Microsoft 已绑定时不展示解绑按钮。
- 正版档案不展示改名操作。
- 密码输入框在桌面和移动端截图检查不偏移。


## 风险与补充建议

- Mojang API 可能限流或故障，建议后续增加缓存。
- 如果已有数据里已经有 Microsoft 绑定，需要 migration 回填 `source=microsoft`。
- 如果站点允许管理员手动创建任意档案，也应默认执行 Mojang 名称保护，除非后续明确增加管理员 override。
- 正版名称同步要单独设计，不能复用普通改名次数。
- `hasJoined` 访问控制当前依赖本地档案存在性，仍符合“正版用户必须先注册并绑定才能进服”的目标。
