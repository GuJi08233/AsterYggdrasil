//! Yggdrasil-facing registry boundary over shared Forge external-auth drivers.

use std::sync::{Arc, OnceLock};

use aster_forge_external_auth::ExternalAuthProviderDriver;

use crate::errors::Result;
use crate::types::external_auth::ExternalAuthProviderKind;

use super::{
    ExternalAuthProviderDescriptor, map_external_auth_error, map_external_auth_provider_descriptor,
};

/// LinuxDo fixed-connection descriptor.
fn linuxdo_descriptor() -> ExternalAuthProviderDescriptor {
    ExternalAuthProviderDescriptor {
        kind: ExternalAuthProviderKind::LinuxDo,
        protocol: super::ExternalAuthProtocol::OAuth2,
        display_name: "LinuxDo",
        description: "Sign in with LinuxDo community account",
        default_scopes: "user",
        issuer_url_required: false,
        manual_endpoint_configuration_supported: false,
        authorization_url_required: false,
        token_url_required: false,
        userinfo_url_required: false,
        supports_discovery: false,
        supports_pkce: false,
        supports_email_verified_claim: false,
    }
}

/// Registry boundary for feature-enabled external authentication provider drivers.
pub struct ExternalAuthProviderRegistry {
    inner: aster_forge_external_auth::ExternalAuthProviderRegistry,
}

impl ExternalAuthProviderRegistry {
    /// Creates a registry populated with all Forge drivers enabled for Yggdrasil.
    pub fn new() -> Self {
        Self {
            inner: aster_forge_external_auth::ExternalAuthProviderRegistry::new(),
        }
    }

    /// Returns registered provider kinds including Yggdrasil-local kinds.
    pub fn supported_kinds(&self) -> impl Iterator<Item = ExternalAuthProviderKind> + '_ {
        self.inner
            .supported_kinds()
            .map(Into::into)
            .chain(std::iter::once(ExternalAuthProviderKind::LinuxDo))
    }

    /// Returns registered provider descriptors sorted by provider kind.
    pub fn descriptors(&self) -> Vec<ExternalAuthProviderDescriptor> {
        let mut result: Vec<ExternalAuthProviderDescriptor> = self
            .inner
            .descriptors()
            .into_iter()
            .map(map_external_auth_provider_descriptor)
            .collect();
        result.push(linuxdo_descriptor());
        result
    }

    /// Returns whether a provider kind is registered.
    pub fn contains(&self, kind: ExternalAuthProviderKind) -> bool {
        match kind {
            ExternalAuthProviderKind::LinuxDo => true,
            _ => self.inner.contains(kind.into()),
        }
    }

    /// Returns a provider descriptor by provider kind.
    pub fn descriptor_for(
        &self,
        kind: ExternalAuthProviderKind,
    ) -> Result<ExternalAuthProviderDescriptor> {
        match kind {
            ExternalAuthProviderKind::LinuxDo => Ok(linuxdo_descriptor()),
            _ => self
                .inner
                .descriptor_for(kind.into())
                .map(map_external_auth_provider_descriptor)
                .map_err(map_external_auth_error),
        }
    }

    /// Returns a registered Forge provider driver by provider kind.
    pub fn get_driver(
        &self,
        kind: ExternalAuthProviderKind,
    ) -> Result<Arc<dyn ExternalAuthProviderDriver>> {
        // LinuxDo uses the GenericOAuth2 driver
        let forge_kind = match kind {
            ExternalAuthProviderKind::LinuxDo => {
                aster_forge_external_auth::ExternalAuthProviderKind::GenericOAuth2
            }
            other => other.into(),
        };
        self.inner
            .get_driver(forge_kind)
            .map_err(map_external_auth_error)
    }

    /// Returns the registered OIDC provider driver.
    pub fn oidc(&self) -> Result<Arc<dyn ExternalAuthProviderDriver>> {
        self.get_driver(ExternalAuthProviderKind::Oidc)
    }
}

impl Default for ExternalAuthProviderRegistry {
    fn default() -> Self {
        Self::new()
    }
}

/// Returns the process-wide default external-auth provider registry.
pub fn default_registry() -> &'static ExternalAuthProviderRegistry {
    static REGISTRY: OnceLock<ExternalAuthProviderRegistry> = OnceLock::new();
    REGISTRY.get_or_init(ExternalAuthProviderRegistry::new)
}
