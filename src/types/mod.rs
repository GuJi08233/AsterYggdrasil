//! Shared domain types.
//!
//! Concrete submodules make type ownership explicit. Callers import domain
//! types from their owning modules instead of using a root compatibility
//! facade.

pub mod audit;
pub mod auth;
pub mod config;
pub mod external_auth;
pub mod passkey;
pub mod task;
pub mod user;
pub mod yggdrasil;
