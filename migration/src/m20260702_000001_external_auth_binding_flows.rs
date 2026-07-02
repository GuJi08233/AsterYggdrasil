//! Add one-shot external auth binding flows for current-user account linking.

use sea_orm_migration::prelude::*;

use crate::time::utc_date_time_column;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .create_table(
                Table::create()
                    .table(ExternalAuthBindingFlows::Table)
                    .if_not_exists()
                    .col(big_integer_pk(ExternalAuthBindingFlows::Id))
                    .col(
                        ColumnDef::new(ExternalAuthBindingFlows::UserId)
                            .big_integer()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(ExternalAuthBindingFlows::ProviderId)
                            .big_integer()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(ExternalAuthBindingFlows::StateHash)
                            .string_len(64)
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(ExternalAuthBindingFlows::Nonce)
                            .string_len(512)
                            .null(),
                    )
                    .col(
                        ColumnDef::new(ExternalAuthBindingFlows::PkceVerifier)
                            .string_len(256)
                            .null(),
                    )
                    .col(
                        ColumnDef::new(ExternalAuthBindingFlows::RedirectUri)
                            .text()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(ExternalAuthBindingFlows::ReturnPath)
                            .text()
                            .null(),
                    )
                    .col(
                        utc_date_time_column(manager, ExternalAuthBindingFlows::CreatedAt)
                            .not_null(),
                    )
                    .col(
                        utc_date_time_column(manager, ExternalAuthBindingFlows::ExpiresAt)
                            .not_null(),
                    )
                    .col(utc_date_time_column(manager, ExternalAuthBindingFlows::ConsumedAt).null())
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_external_auth_binding_flows_user")
                            .from(
                                ExternalAuthBindingFlows::Table,
                                ExternalAuthBindingFlows::UserId,
                            )
                            .to(Users::Table, Users::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_external_auth_binding_flows_provider")
                            .from(
                                ExternalAuthBindingFlows::Table,
                                ExternalAuthBindingFlows::ProviderId,
                            )
                            .to(ExternalAuthProviders::Table, ExternalAuthProviders::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .to_owned(),
            )
            .await?;

        for index in [
            Index::create()
                .name("idx_external_auth_binding_flows_state_hash")
                .table(ExternalAuthBindingFlows::Table)
                .col(ExternalAuthBindingFlows::StateHash)
                .unique()
                .if_not_exists()
                .to_owned(),
            Index::create()
                .name("idx_external_auth_binding_flows_expires_at")
                .table(ExternalAuthBindingFlows::Table)
                .col(ExternalAuthBindingFlows::ExpiresAt)
                .if_not_exists()
                .to_owned(),
        ] {
            manager.create_index(index).await?;
        }

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        for name in [
            "idx_external_auth_binding_flows_expires_at",
            "idx_external_auth_binding_flows_state_hash",
        ] {
            manager
                .drop_index(
                    Index::drop()
                        .name(name)
                        .table(ExternalAuthBindingFlows::Table)
                        .if_exists()
                        .to_owned(),
                )
                .await?;
        }
        manager
            .drop_table(
                Table::drop()
                    .table(ExternalAuthBindingFlows::Table)
                    .if_exists()
                    .to_owned(),
            )
            .await
    }
}

fn big_integer_pk<T>(column: T) -> ColumnDef
where
    T: IntoIden,
{
    let mut def = ColumnDef::new(column);
    def.big_integer().not_null().auto_increment().primary_key();
    def
}

#[derive(DeriveIden)]
enum ExternalAuthBindingFlows {
    Table,
    Id,
    UserId,
    ProviderId,
    StateHash,
    Nonce,
    PkceVerifier,
    RedirectUri,
    ReturnPath,
    CreatedAt,
    ExpiresAt,
    ConsumedAt,
}

#[derive(DeriveIden)]
enum Users {
    Table,
    Id,
}

#[derive(DeriveIden)]
enum ExternalAuthProviders {
    Table,
    Id,
}
