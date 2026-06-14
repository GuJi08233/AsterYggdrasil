//! AsterYggdrasil database migrations.
#![deny(clippy::cast_possible_truncation, clippy::cast_sign_loss)]
#![cfg_attr(not(test), deny(clippy::unwrap_used))]

pub use sea_orm_migration::prelude::*;

mod m20260606_000001_foundation_schema;
mod m20260615_000001_yggdrasil_profiles;
mod m20260615_000002_minecraft_textures;
mod m20260615_000003_passkeys;
mod time;

pub struct Migrator;

impl Migrator {
    pub async fn up(
        db: &sea_orm_migration::sea_orm::DatabaseConnection,
        steps: Option<u32>,
    ) -> Result<(), DbErr> {
        <Self as MigratorTrait>::up(db, steps).await
    }
}

#[async_trait::async_trait]
impl MigratorTrait for Migrator {
    fn migrations() -> Vec<Box<dyn MigrationTrait>> {
        vec![
            Box::new(m20260606_000001_foundation_schema::Migration),
            Box::new(m20260615_000001_yggdrasil_profiles::Migration),
            Box::new(m20260615_000002_minecraft_textures::Migration),
            Box::new(m20260615_000003_passkeys::Migration),
        ]
    }
}
