use crate::api::dto::yggdrasil::{YggdrasilMeta, YggdrasilMetaResp};
use crate::config::yggdrasil::RuntimeYggdrasilPolicy;
use crate::runtime::RuntimeConfigRuntimeState;
use crate::services::yggdrasil_signature;

pub fn metadata<S: RuntimeConfigRuntimeState>(state: &S) -> YggdrasilMetaResp {
    let policy = RuntimeYggdrasilPolicy::from_runtime_config(state.runtime_config());
    let signature_publickey =
        yggdrasil_signature::signature_public_key(&policy).unwrap_or_else(|error| {
            tracing::warn!(
                error = %error,
                "failed to resolve yggdrasil signature public key; using configured public key fallback"
            );
            policy.signature_public_key.clone()
        });
    YggdrasilMetaResp {
        meta: YggdrasilMeta {
            server_name: policy.server_name,
            implementation_name: "AsterYggdrasil".to_string(),
            implementation_version: env!("CARGO_PKG_VERSION").to_string(),
            feature_non_email_login: policy.allow_profile_name_login,
        },
        skin_domains: policy.skin_domains,
        signature_publickey,
    }
}
