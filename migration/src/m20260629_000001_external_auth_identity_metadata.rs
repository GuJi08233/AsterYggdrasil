//! Add metadata column to external_auth_identities for provider-specific data.

use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .alter_table(
                Table::alter()
                    .table(ExternalAuthIdentities::Table)
                    .add_column(
                        ColumnDef::new(ExternalAuthIdentities::Metadata)
                            .text()
                            .null(),
                    )
                    .to_owned(),
            )
            .await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .alter_table(
                Table::alter()
                    .table(ExternalAuthIdentities::Table)
                    .drop_column(ExternalAuthIdentities::Metadata)
                    .to_owned(),
            )
            .await
    }
}

#[derive(DeriveIden)]
enum ExternalAuthIdentities {
    Table,
    Metadata,
}
