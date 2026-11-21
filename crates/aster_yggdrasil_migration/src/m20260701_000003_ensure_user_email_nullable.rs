//! Ensure users.email remains nullable for external-auth-only accounts.

use sea_orm_migration::prelude::*;
use sea_orm_migration::sea_orm::DatabaseBackend;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        match manager.get_database_backend() {
            DatabaseBackend::Sqlite => rebuild_sqlite_users(manager).await,
            DatabaseBackend::MySql => {
                manager
                    .get_connection()
                    .execute_unprepared("ALTER TABLE users MODIFY COLUMN email VARCHAR(255) NULL")
                    .await?;
                Ok(())
            }
            DatabaseBackend::Postgres => {
                manager
                    .get_connection()
                    .execute_unprepared("ALTER TABLE users ALTER COLUMN email DROP NOT NULL")
                    .await?;
                Ok(())
            }
            backend => Err(DbErr::Migration(format!(
                "unsupported database backend for users.email nullability repair: {backend:?}"
            ))),
        }
    }

    async fn down(&self, _manager: &SchemaManager) -> Result<(), DbErr> {
        Ok(())
    }
}

async fn rebuild_sqlite_users(manager: &SchemaManager<'_>) -> Result<(), DbErr> {
    manager
        .get_connection()
        .execute_unprepared("PRAGMA foreign_keys=OFF")
        .await?;
    manager
        .get_connection()
        .execute_unprepared("DROP TABLE IF EXISTS users_email_nullable_rebuild")
        .await?;

    create_sqlite_users_rebuild_table(manager).await?;
    manager
        .get_connection()
        .execute_unprepared(
            "INSERT INTO users_email_nullable_rebuild (
                id, public_uuid, username, email, password_hash, role, status,
                must_change_password, session_version, email_verified_at,
                pending_email, created_at, updated_at
             )
             SELECT
                id, public_uuid, username, email, password_hash, role, status,
                must_change_password, session_version, email_verified_at,
                pending_email, created_at, updated_at
             FROM users",
        )
        .await?;
    manager
        .get_connection()
        .execute_unprepared("DROP TABLE users")
        .await?;
    manager
        .get_connection()
        .execute_unprepared("ALTER TABLE users_email_nullable_rebuild RENAME TO users")
        .await?;
    create_user_indexes(manager).await?;
    manager
        .get_connection()
        .execute_unprepared("PRAGMA foreign_keys=ON")
        .await?;
    Ok(())
}

async fn create_sqlite_users_rebuild_table(manager: &SchemaManager<'_>) -> Result<(), DbErr> {
    manager
        .create_table(
            Table::create()
                .table(UsersRebuild::Table)
                .col(
                    ColumnDef::new(Users::Id)
                        .big_integer()
                        .not_null()
                        .auto_increment()
                        .primary_key(),
                )
                .col(ColumnDef::new(Users::PublicUuid).string_len(32).not_null())
                .col(ColumnDef::new(Users::Username).string_len(128).not_null())
                .col(ColumnDef::new(Users::Email).string_len(255).null())
                .col(
                    ColumnDef::new(Users::PasswordHash)
                        .string_len(255)
                        .not_null(),
                )
                .col(
                    ColumnDef::new(Users::Role)
                        .string_len(32)
                        .not_null()
                        .default("user"),
                )
                .col(
                    ColumnDef::new(Users::Status)
                        .string_len(32)
                        .not_null()
                        .default("active"),
                )
                .col(
                    ColumnDef::new(Users::MustChangePassword)
                        .boolean()
                        .not_null()
                        .default(false),
                )
                .col(
                    ColumnDef::new(Users::SessionVersion)
                        .big_integer()
                        .not_null()
                        .default(1),
                )
                .col(crate::time::utc_date_time_column(manager, Users::EmailVerifiedAt).null())
                .col(ColumnDef::new(Users::PendingEmail).string_len(255).null())
                .col(crate::time::utc_date_time_column(manager, Users::CreatedAt).not_null())
                .col(crate::time::utc_date_time_column(manager, Users::UpdatedAt).not_null())
                .to_owned(),
        )
        .await
}

async fn create_user_indexes(manager: &SchemaManager<'_>) -> Result<(), DbErr> {
    for index in [
        Index::create()
            .name("idx_users_public_uuid_unique")
            .table(Users::Table)
            .col(Users::PublicUuid)
            .unique()
            .if_not_exists()
            .to_owned(),
        Index::create()
            .name("idx_users_username_unique")
            .table(Users::Table)
            .col(Users::Username)
            .unique()
            .if_not_exists()
            .to_owned(),
        Index::create()
            .name("idx_users_email_unique")
            .table(Users::Table)
            .col(Users::Email)
            .unique()
            .if_not_exists()
            .to_owned(),
        Index::create()
            .name("idx_users_pending_email")
            .table(Users::Table)
            .col(Users::PendingEmail)
            .unique()
            .if_not_exists()
            .to_owned(),
        Index::create()
            .name("idx_users_created_id")
            .table(Users::Table)
            .col(Users::CreatedAt)
            .col(Users::Id)
            .if_not_exists()
            .to_owned(),
        Index::create()
            .name("idx_users_role_created_id")
            .table(Users::Table)
            .col(Users::Role)
            .col(Users::CreatedAt)
            .col(Users::Id)
            .if_not_exists()
            .to_owned(),
        Index::create()
            .name("idx_users_status_created_id")
            .table(Users::Table)
            .col(Users::Status)
            .col(Users::CreatedAt)
            .col(Users::Id)
            .if_not_exists()
            .to_owned(),
    ] {
        manager.create_index(index).await?;
    }
    Ok(())
}

#[derive(DeriveIden)]
enum Users {
    Table,
    Id,
    PublicUuid,
    Username,
    Email,
    PasswordHash,
    Role,
    Status,
    MustChangePassword,
    SessionVersion,
    EmailVerifiedAt,
    PendingEmail,
    CreatedAt,
    UpdatedAt,
}

#[derive(DeriveIden)]
enum UsersRebuild {
    #[sea_orm(iden = "users_email_nullable_rebuild")]
    Table,
}
