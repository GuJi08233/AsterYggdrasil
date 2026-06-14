//! Compatibility wrapper for the config service.

use crate::errors::Result;
use sea_orm::ConnectionTrait;

pub async fn ensure_defaults<C: ConnectionTrait>(db: &C) -> Result<()> {
    crate::services::config_service::ensure_defaults(db).await
}

pub async fn bootstrap_insecure_cookies<C: ConnectionTrait>(
    db: &C,
    bootstrap_insecure_cookies: bool,
) -> Result<()> {
    crate::services::config_service::bootstrap_insecure_cookies(db, bootstrap_insecure_cookies)
        .await
}
