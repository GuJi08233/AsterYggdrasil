//! Track whether a Minecraft profile is local or bound to an official Microsoft account.

use sea_orm_migration::prelude::*;

const MINECRAFT_IDENTITY_NAMESPACE: &str = "https://api.minecraftservices.com/minecraft/profile";

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
                        ColumnDef::new(MinecraftProfiles::Source)
                            .string_len(16)
                            .not_null()
                            .default("local"),
                    )
                    .to_owned(),
            )
            .await?;

        backfill_microsoft_profile_sources(manager).await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .alter_table(
                Table::alter()
                    .table(MinecraftProfiles::Table)
                    .drop_column(MinecraftProfiles::Source)
                    .to_owned(),
            )
            .await
    }
}

async fn backfill_microsoft_profile_sources(manager: &SchemaManager<'_>) -> Result<(), DbErr> {
    let namespace = MINECRAFT_IDENTITY_NAMESPACE.replace('\'', "''");
    let sql = format!(
        "UPDATE minecraft_profiles \
         SET source = 'microsoft' \
         WHERE EXISTS ( \
             SELECT 1 \
             FROM external_auth_identities \
             WHERE external_auth_identities.identity_namespace = '{namespace}' \
               AND external_auth_identities.subject = minecraft_profiles.uuid \
         )"
    );
    manager.get_connection().execute_unprepared(&sql).await?;
    Ok(())
}

#[derive(DeriveIden)]
enum MinecraftProfiles {
    Table,
    Source,
}
