//! Product-local path for shared transaction helpers.
//!
//! `aster_forge_db::transaction` owns transaction tracing, rollback guarding, and commit/rollback
//! behavior. This module keeps the existing Yggdrasil import path while mapping manual transaction
//! boundary errors into `AsterError`.

use crate::errors::Result;

/// Begins and returns a transaction with Yggdrasil's product error type.
pub async fn begin<C: sea_orm::TransactionTrait>(db: &C) -> Result<C::Transaction> {
    aster_forge_db::transaction::begin(db)
        .await
        .map_err(Into::into)
}

/// Commits a transaction with Yggdrasil's product error type.
pub async fn commit<T: sea_orm::TransactionSession>(txn: T) -> Result<()> {
    aster_forge_db::transaction::commit(txn)
        .await
        .map_err(Into::into)
}

/// Rolls back a transaction with Yggdrasil's product error type.
pub async fn rollback<T: sea_orm::TransactionSession>(txn: T) -> Result<()> {
    aster_forge_db::transaction::rollback(txn)
        .await
        .map_err(Into::into)
}

/// Runs a transaction callback through Forge with Yggdrasil's product error type.
pub async fn with_transaction<C, F, T>(db: &C, operation: F) -> Result<T>
where
    C: sea_orm::TransactionTrait,
    F: for<'txn> AsyncFnOnce(&'txn C::Transaction) -> Result<T>,
{
    aster_forge_db::transaction::with_transaction(db, operation).await
}

/// Runs a transaction callback through Forge while preserving a subsystem error type.
pub async fn with_transaction_error<C, F, T, E>(db: &C, operation: F) -> std::result::Result<T, E>
where
    C: sea_orm::TransactionTrait,
    F: for<'txn> AsyncFnOnce(&'txn C::Transaction) -> std::result::Result<T, E>,
    E: From<aster_forge_db::DbError> + std::fmt::Display,
{
    aster_forge_db::transaction::with_transaction(db, operation).await
}
