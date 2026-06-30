//! Add rename_count column to minecraft_profiles for tracking profile name changes.

use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .alter_table(
                Table::alter()
                    .table(MinecraftProfiles::Table)
                    .add_column(
                        ColumnDef::new(MinecraftProfiles::RenameCount)
                            .integer()
                            .not_null()
                            .default(0),
                    )
                    .to_owned(),
            )
            .await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .alter_table(
                Table::alter()
                    .table(MinecraftProfiles::Table)
                    .drop_column(MinecraftProfiles::RenameCount)
                    .to_owned(),
            )
            .await
    }
}

#[derive(DeriveIden)]
enum MinecraftProfiles {
    Table,
    RenameCount,
}
