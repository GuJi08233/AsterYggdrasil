# AsterYggdrasil 皮肤站功能计划

## 一、需求概述

### 1.1 登录注册
- **唯一登录方式**：LinuxDo OAuth
- 不支持本地注册（用户名/密码注册）
- Microsoft OAuth **仅用于绑定正版**，不用于登录

### 1.2 角色档案创建
- 登录后**不自动创建** Minecraft 档案
- 用户手动创建档案时，提供两种选择：
  1. **自行创建档案**：输入玩家名，校验唯一性（含正版检查）
  2. **绑定正版账号**：通过 Microsoft OAuth 获取正版 UUID
- **绑定后不可解绑**（防止 UUID 泄露/滥用）

### 1.3 服务器访问控制
- **要求**：正版用户必须先在皮肤站注册并绑定正版，才能进入服务器
- **实现**：`hasJoined` 接口验证该 UUID 是否在皮肤站有档案
- **效果**：未绑定的正版用户无法进入服务器

### 1.4 个人设置
- 设置启动器登录密码（用于 Yggdrasil 外置登录）
- 修复密码输入框对齐问题

---

## 二、技术方案

### 2.1 外部认证标记方案

#### 2.1.1 配置结构扩展

在外部认证配置中添加两个标记字段：

```rust
// src/types/external_auth.rs
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct ExternalAuthProviderOptions {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub microsoft: Option<MicrosoftExternalAuthProviderOptions>,
    
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub linuxdo: Option<LinuxDoExternalAuthProviderOptions>,
    
    // 新增字段
    /// 是否允许用于登录（默认 true）
    /// false = 只用于绑定，不显示在登录页
    #[serde(default = "default_true")]
    pub allow_login: bool,
    
    /// 是否允许解绑（默认 true）
    /// false = 绑定后不可解绑（如正版绑定）
    #[serde(default = "default_true")]
    pub allow_unlink: bool,
}

fn default_true() -> bool {
    true
}
```

#### 2.1.2 Provider 配置示例

| Provider | allow_login | allow_unlink | 用途 |
|----------|-------------|--------------|------|
| LinuxDo | ✅ true | ✅ true | 登录/注册 |
| Microsoft | ❌ false | ❌ false | 绑定正版（不可解绑） |
| GitHub | ✅ true | ✅ true | 登录/注册（可选） |

#### 2.1.3 代码修改点

**1. 登录时检查 `allow_login`**

文件：`src/services/external_auth_service/login.rs`

```rust
pub async fn start_login(
    state: &impl SharedRuntimeState,
    req: &actix_web::HttpRequest,
    provider_kind: ExternalAuthProviderKind,
    provider_key: &str,
    return_path: Option<&str>,
) -> Result<ExternalAuthStartLoginResponse> {
    let provider = external_auth_provider_repo::find_by_kind_key(...).await?;
    
    // 新增检查：是否允许登录
    let options = parse_external_auth_provider_options(provider.options.as_ref());
    if !options.allow_login {
        tracing::debug!(
            provider_id = provider.id,
            provider_kind = ?provider.provider_kind,
            "external auth login rejected because provider does not allow login"
        );
        return Err(AsterError::auth_forbidden(
            "该认证源不允许用于登录，仅支持绑定"
        ));
    }
    
    // ... 继续原有逻辑
}
```

**2. 列表时过滤 `allow_login`**

文件：`src/services/external_auth_service/providers.rs`

```rust
pub async fn list_public_providers(
    state: &impl SharedRuntimeState,
) -> Result<Vec<ExternalAuthPublicProvider>> {
    Ok(external_auth_provider_repo::find_enabled(state.writer_db())
        .await?
        .into_iter()
        .filter(|provider| {
            // 过滤：只返回允许登录的 provider
            let options = parse_external_auth_provider_options(provider.options.as_ref());
            options.allow_login
        })
        .filter(|provider| registry::default_registry().contains(provider.provider_kind))
        .map(provider_to_public)
        .collect())
}
```

**3. 解绑时检查 `allow_unlink`**

文件：`src/services/external_auth_service/links.rs`

```rust
pub async fn delete_link(
    state: &impl SharedRuntimeState,
    user_id: i64,
    identity_id: i64,
) -> Result<bool> {
    let identity = external_auth_identity_repo::find_by_id_for_user(
        state.writer_db(),
        identity_id,
        user_id,
    ).await?;
    
    let Some(identity) = identity else {
        return Ok(false);
    };
    
    // 新增检查：是否允许解绑
    let provider = external_auth_provider_repo::find_by_id(
        state.writer_db(),
        identity.provider_id,
    ).await?;
    let options = parse_external_auth_provider_options(provider.options.as_ref());
    if !options.allow_unlink {
        tracing::debug!(
            identity_id = identity.id,
            provider_id = provider.id,
            "external auth unlink rejected because provider does not allow unlink"
        );
        return Err(AsterError::auth_forbidden(
            "该绑定不可解绑"
        ));
    }
    
    // ... 继续原有逻辑
}
```

**4. 绑定时不限制（允许绑定任何 provider）**

文件：`src/api/routes/auth_external_auth.rs`

```rust
// 绑定流程不检查 allow_login，允许绑定任何已启用的 provider
pub async fn start_binding(
    state: web::Data<AppState>,
    req: HttpRequest,
    path: web::Path<(String, String)>,
    body: web::Json<StartExternalAuthReq>,
) -> Result<HttpResponse> {
    // 不检查 allow_login，允许绑定
    // ...
}
```

---

### 2.2 登录流程

```
用户访问皮肤站
    ↓
点击"L站登录"（只显示 allow_login=true 的 provider）
    ↓
LinuxDo OAuth 授权
    ↓
系统创建用户（无 Minecraft 档案）
    ↓
跳转到设置页面 / 首次引导页
```

#### 修改点

| 文件 | 修改内容 |
|-----|---------|
| `src/types/external_auth.rs` | 添加 `allow_login` 和 `allow_unlink` 字段 |
| `src/services/external_auth_service/login.rs` | 检查 `allow_login` |
| `src/services/external_auth_service/providers.rs` | 列表过滤 `allow_login` |
| `src/services/external_auth_service/links.rs` | 检查 `allow_unlink` |
| 前端登录页 | 只显示 `allow_login=true` 的 provider |

### 2.3 档案创建流程

```
用户进入设置页面
    ↓
点击"创建我的角色"
    ↓
选择创建方式：
├── 自行创建 ──→ 输入玩家名 ──→ 校验 ──→ 创建成功
└── 绑定正版 ──→ Microsoft OAuth ──→ 绑定成功（不可解绑）
```

#### 2.3.1 自行创建档案

**API**: `POST /api/v1/profiles/mine`

**请求体**:
```json
{
  "name": "Steve",
  "check_mojang": true
}
```

**校验逻辑**:
1. 玩家名格式校验（3-16 字符，只允许字母、数字、下划线）
2. 本地数据库查重（`minecraft_profiles` 表）
3. **正版用户名检查**（可选，`check_mojang: true`）

**Mojang API 检查**:
```
GET https://api.mojang.com/users/profiles/minecraft/{username}
```

- 存在：返回 `{"id": "da54e3cc2d59409e8bf00267c4460117", "name": "Gu___ji"}`
- 不存在：返回 `{"errorMessage": "Couldn't find any profile with name xxx"}`

**实现代码**:
```rust
pub async fn check_mojang_username_exists(username: &str) -> Result<Option<String>> {
    let url = format!(
        "https://api.mojang.com/users/profiles/minecraft/{}",
        urlencoding::encode(username)
    );
    
    let http_client = reqwest::Client::builder()
        .user_agent(OUTBOUND_HTTP_USER_AGENT)
        .timeout(std::time::Duration::from_secs(3))
        .build()?;
    
    let response = http_client.get(&url).send().await?;
    
    match response.status() {
        reqwest::StatusCode::OK => {
            let profile: MojangProfile = response.json().await?;
            Ok(Some(profile.id))
        }
        _ => Ok(None),
    }
}
```

#### 2.3.2 绑定正版账号

**流程**:
1. 用户点击"绑定正版账号"
2. 跳转到 Microsoft OAuth 授权页（使用 `allow_login=false` 的 provider）
3. 授权成功后，获取正版 UUID
4. 创建档案，使用正版 UUID
5. 记录绑定关系（`external_auth_identities` 表）
6. 标记为不可解绑（`allow_unlink=false`）

**关键点**:
- 绑定后**不可解绑**（`allow_unlink: false`）
- 正版 UUID 来自 Microsoft Xbox Live 认证
- 绑定后该用户的档案 UUID 固定为正版 UUID

**实现**:
```rust
// 创建档案时，如果绑定了正版，使用正版 UUID
pub async fn create_profile_with_mojang_uuid(
    state: &impl SharedRuntimeState,
    user_id: i64,
    mojang_uuid: &str,
    profile_name: &str,
) -> Result<minecraft_profile::Model> {
    // 使用正版 UUID 创建档案
    create_profile_inner(state, user_id, profile_name, mojang_uuid).await
}
```

---

### 2.4 服务器访问控制（hasJoined 验证）

#### 2.4.1 需求说明

**要求**：正版用户必须先在皮肤站注册并绑定正版，才能进入服务器。

**效果**：
- ✅ 皮肤站用户（有档案）→ 可以进入服务器
- ✅ 正版用户（已绑定，有档案）→ 可以进入服务器
- ❌ 正版用户（未绑定，无档案）→ 无法进入服务器

#### 2.4.2 技术原理

当前 `hasJoined` 逻辑已经支持这个功能：

```rust
// src/services/yggdrasil_service/session.rs

async fn local_has_joined<S>(
    state: &S,
    username: &str,
    server_id: &str,
    ip: Option<&str>,
) -> std::result::Result<Option<YggdrasilProfile>, YggdrasilError>
{
    // 1. 查询缓存中的 join session
    let Some(session) = super::cache::get_join_session(state, server_id).await else {
        return Ok(None);  // 没有 join 记录，返回 204
    };
    
    // 2. 验证用户名和 server_id 匹配
    if session.server_id != server_id || session.profile_name != username {
        return Ok(None);  // 不匹配，返回 204
    }
    
    // 3. 查询档案
    let profile = minecraft_profile_repo::find_by_id(state.reader_db(), session.profile_id).await?;
    
    // 4. 返回档案（只有有档案的用户才会被返回）
    Ok(Some(properties::profile_with_properties(state, &profile, true).await?))
}
```

**关键点**：
- `hasJoined` 只返回在 `minecraft_profiles` 表中有档案的用户
- 没有档案的用户（包括未绑定的正版用户）会返回 204
- 服务器收到 204 会拒绝该用户进入

#### 2.4.3 验证流程

```
正版用户尝试进入服务器
    ↓
启动器调用 join（使用正版 token）
    ↓
服务器调用 hasJoined(username, serverId)
    ↓
检查该用户名对应的 UUID 是否在皮肤站有档案
    ↓
┌───┴───┐
↓       ↓
有档案   无档案
↓       ↓
返回     返回 204
profile  ↓
↓       服务器拒绝进入
服务器允许进入
```

#### 2.4.4 实现状态

**当前状态**：✅ **已经实现**

无需额外修改代码，当前逻辑已经满足需求：
- 只有在皮肤站有档案的用户才会被 `hasJoined` 返回
- 未绑定的正版用户没有档案，会被返回 204
- 服务器会拒绝返回 204 的用户

**配置建议**：
- 确保 `auto_create_profile: false`（不自动创建档案）
- 用户必须手动创建档案或绑定正版

---

### 2.5 启动器密码设置

**API**: `POST /api/v1/auth/change-password`

**请求体**:
```json
{
  "current_password": "old_password",  // 首次设置时可为空
  "new_password": "new_password"
}
```

**前端修复**:
- 确保两个密码输入框宽度一致
- 使用 Flexbox 或 Grid 布局对齐

---

## 三、数据库设计

### 3.1 现有表结构

无需新增表，使用现有表：

| 表名 | 用途 |
|-----|------|
| `users` | 用户账号 |
| `minecraft_profiles` | Minecraft 档案 |
| `external_auth_identities` | 外部认证绑定（L站、Microsoft） |
| `external_auth_providers` | 外部认证配置 |

### 3.2 external_auth_providers 表扩展

在 `options` JSON 字段中添加新配置：

```json
{
  "microsoft": { "tenant": "consumers" },
  "allow_login": false,
  "allow_unlink": false
}
```

### 3.3 绑定关系示例

```
用户 ID: 123
├── external_auth_identities:
│   ├── provider: LinuxDo, subject: "linuxdo_user_123"
│   │   └── allow_unlink: true (可解绑)
│   └── provider: Microsoft, subject: "msa_xxx"
│       └── allow_unlink: false (不可解绑)
└── minecraft_profiles:
    └── name: "Steve", uuid: "da54e3cc-..." (正版 UUID)
```

---

## 四、API 设计

### 4.1 认证相关

| 方法 | 路径 | 说明 |
|-----|------|------|
| POST | `/api/v1/auth/external-auth/linuxdo/{provider}/start` | 开始 L站登录 |
| GET | `/api/v1/auth/external-auth/linuxdo/{provider}/callback` | L站登录回调 |
| POST | `/api/v1/auth/change-password` | 设置启动器密码 |

### 4.2 档案相关

| 方法 | 路径 | 说明 |
|-----|------|------|
| POST | `/api/v1/profiles/mine` | 创建我的档案 |
| GET | `/api/v1/profiles/mine` | 获取我的档案 |
| PUT | `/api/v1/profiles/mine` | 更新我的档案 |

### 4.3 绑定相关

| 方法 | 路径 | 说明 |
|-----|------|------|
| POST | `/api/v1/auth/external-auth/microsoft/{provider}/start` | 开始绑定正版 |
| GET | `/api/v1/auth/external-auth/microsoft/{provider}/callback` | 绑定正版回调 |
| GET | `/api/v1/auth/external-auth/links` | 获取绑定列表 |
| DELETE | `/api/v1/auth/external-auth/links/{id}` | 解绑（Microsoft 不可解绑） |

---

## 五、前端页面

### 5.1 登录页

```
┌─────────────────────────────────┐
│         AsterYggdrasil          │
│                                 │
│    ┌───────────────────────┐    │
│    │   🐧 L站登录          │    │
│    └───────────────────────┘    │
│                                 │
│    使用 LinuxDo 账号登录         │
│    （只显示 allow_login=true）   │
└─────────────────────────────────┘
```

### 5.2 首次引导页（无档案时）

```
┌─────────────────────────────────┐
│       创建你的游戏角色           │
│                                 │
│    ┌───────────────────────┐    │
│    │   自行创建档案         │    │
│    │   输入玩家名           │    │
│    └───────────────────────┘    │
│                                 │
│    ┌───────────────────────┐    │
│    │   绑定正版账号         │    │
│    │   使用 Microsoft 登录  │    │
│    └───────────────────────┘    │
│                                 │
│    ⚠️ 绑定正版后不可解绑        │
└─────────────────────────────────┘
```

### 5.3 自行创建档案

```
┌─────────────────────────────────┐
│         创建角色档案             │
│                                 │
│    玩家名: [_______________]    │
│                                 │
│    ☑️ 检查正版用户名占用         │
│                                 │
│    [取消]  [创建]               │
└─────────────────────────────────┘
```

### 5.4 个人设置页

```
┌─────────────────────────────────┐
│         个人设置                 │
│                                 │
│    ┌───────────────────────┐    │
│    │   角色档案             │    │
│    │   Steve (da54e3cc...)  │    │
│    └───────────────────────┘    │
│                                 │
│    ┌───────────────────────┐    │
│    │   绑定账号             │    │
│    │   ✅ L站账号           │    │
│    │   ✅ 正版账号 (不可解绑)│    │
│    └───────────────────────┘    │
│                                 │
│    ┌───────────────────────┐    │
│    │   启动器密码           │    │
│    │   新密码: [________]   │    │
│    │   确认:   [________]   │    │
│    │   [保存]              │    │
│    └───────────────────────┘    │
└─────────────────────────────────┘
```

---

## 六、实现步骤

### Phase 1: 基础功能（1-2 天）

- [ ] 修改外部认证配置，添加 `allow_login` 和 `allow_unlink` 字段
- [ ] 修改 LinuxDo 配置，关闭自动创建档案
- [ ] 修改登录逻辑，检查 `allow_login`
- [ ] 修改列表逻辑，过滤 `allow_login`
- [ ] 添加 `check_mojang_username_exists` 函数
- [ ] 添加 `POST /api/v1/profiles/mine` API
- [ ] 前端：登录页只显示 `allow_login=true` 的 provider
- [ ] 前端：首次引导页

### Phase 2: 正版绑定（2-3 天）

- [ ] 配置 Microsoft OAuth provider（`allow_login=false`, `allow_unlink=false`）
- [ ] 实现绑定正版流程
- [ ] 创建档案时支持正版 UUID
- [ ] 修改解绑逻辑，检查 `allow_unlink`
- [ ] 前端：绑定正版 UI

### Phase 3: 个人设置（1 天）

- [ ] 修复密码输入框对齐问题
- [ ] 添加绑定列表展示
- [ ] 完善个人设置页

### Phase 4: 测试与优化（1 天）

- [ ] 测试完整流程
- [ ] 测试服务器访问控制：
  - [ ] 皮肤站用户（有档案）→ 可以进入服务器
  - [ ] 正版用户（已绑定，有档案）→ 可以进入服务器
  - [ ] 正版用户（未绑定，无档案）→ 被拒绝进入服务器
- [ ] 处理边界情况
- [ ] 性能优化（Mojang API 缓存）

---

## 七、注意事项

### 7.1 安全性

- Microsoft OAuth 绑定后**不可解绑**（`allow_unlink: false`）
- 正版 UUID 一旦绑定，不可更改
- 启动器密码使用 Argon2 哈希存储

### 7.2 性能

- Mojang API 调用添加缓存（TTL 24h）
- 避免频繁调用外部 API

### 7.3 服务器访问控制

- **核心逻辑**：`hasJoined` 只返回有档案的用户
- **实现状态**：✅ 已经实现，无需额外修改
- **效果**：未绑定的正版用户无法进入服务器
- **配置要求**：确保 `auto_create_profile: false`

### 7.4 用户体验

- 首次登录强制引导创建档案
- 明确提示"绑定正版后不可解绑"
- 错误信息友好提示

### 7.5 兼容性

- 保持 Yggdrasil 协议兼容
- 正版 UUID 格式：无连字符 32 位十六进制
- 皮肤站 UUID 格式：标准 UUID 格式

### 7.6 数据迁移

- 现有 provider 配置需要添加默认值：
  - `allow_login: true`
  - `allow_unlink: true`
- 使用 `serde(default)` 确保向后兼容

---

## 八、配置示例

### 8.1 LinuxDo 配置（管理后台）

```json
{
  "provider_kind": "linuxdo",
  "display_name": "LinuxDo",
  "enabled": true,
  "options": {
    "linuxdo": {
      "min_trust_level": 1,
      "auto_create_profile": false
    },
    "allow_login": true,
    "allow_unlink": true
  }
}
```

### 8.2 Microsoft 配置（管理后台）

```json
{
  "provider_kind": "microsoft",
  "display_name": "Microsoft (正版绑定)",
  "enabled": true,
  "client_id": "your-client-id",
  "client_secret": "your-client-secret",
  "options": {
    "microsoft": {
      "tenant": "consumers"
    },
    "allow_login": false,
    "allow_unlink": false
  }
}
```

---

## 九、参考资料

- Mojang API: `https://api.mojang.com/users/profiles/minecraft/{username}`
- Microsoft OAuth: Xbox Live 认证流程
- authlib-injector: Yggdrasil 协议规范
- LinuxDo OAuth: `https://connect.linux.do`
