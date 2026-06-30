//! Allow externally provisioned users without an email address.

use sea_orm_migration::prelude::*;
use sea_orm_migration::sea_orm::DatabaseBackend;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        match manager.get_database_backend() {
            DatabaseBackend::Sqlite => rebuild_sqlite_users(manager, true).await,
            DatabaseBackend::MySql | DatabaseBackend::Postgres => {
                modify_email_nullability(manager, true).await
            }
            backend => Err(DbErr::Migration(format!(
                "unsupported database backend for nullable user email: {backend:?}"
            ))),
        }
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        match manager.get_database_backend() {
            DatabaseBackend::Sqlite => rebuild_sqlite_users(manager, false).await,
            DatabaseBackend::MySql | DatabaseBackend::Postgres => {
                fill_missing_emails_for_rollback(manager).await?;
                modify_email_nullability(manager, false).await
            }
            backend => Err(DbErr::Migration(format!(
                "unsupported database backend for nullable user email rollback: {backend:?}"
            ))),
        }
    }
}

async fn modify_email_nullability(
    manager: &SchemaManager<'_>,
    nullable: bool,
) -> Result<(), DbErr> {
    let mut email = ColumnDef::new(Users::Email);
    email.string_len(255);
    if !nullable {
        email.not_null();
    }

    manager
        .alter_table(
            Table::alter()
                .table(Users::Table)
                .modify_column(email)
                .to_owned(),
        )
        .await
}

async fn rebuild_sqlite_users(manager: &SchemaManager<'_>, nullable: bool) -> Result<(), DbErr> {
    manager
        .get_connection()
        .execute_unprepared("PRAGMA foreign_keys=OFF")
        .await?;

    create_sqlite_users_rebuild_table(manager, nullable).await?;
    let email_expr = if nullable {
        "email"
    } else {
        "'rollback-user-' || id || '@local.invalid'"
    };
    manager
        .get_connection()
        .execute_unprepared(&format!(
            "INSERT INTO users_rebuild (
                id, public_uuid, username, email, password_hash, role, status,
                must_change_password, session_version, email_verified_at,
                pending_email, created_at, updated_at
             )
             SELECT
                id, public_uuid, username, COALESCE(email, {email_expr}), password_hash,
                role, status, must_change_password, session_version, email_verified_at,
                pending_email, created_at, updated_at
             FROM users"
        ))
        .await?;
    manager
        .get_connection()
        .execute_unprepared("DROP TABLE users")
        .await?;
    manager
        .get_connection()
        .execute_unprepared("ALTER TABLE users_rebuild RENAME TO users")
        .await?;
    create_user_indexes(manager).await?;
    manager
        .get_connection()
        .execute_unprepared("PRAGMA foreign_keys=ON")
        .await?;
    Ok(())
}

async fn create_sqlite_users_rebuild_table(
    manager: &SchemaManager<'_>,
    nullable_email: bool,
) -> Result<(), DbErr> {
    let mut email = ColumnDef::new(Users::Email);
    email.string_len(255);
    if !nullable_email {
        email.not_null();
    }

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
                .col(email)
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
    ] {
        manager.create_index(index).await?;
    }
    Ok(())
}

async fn fill_missing_emails_for_rollback(manager: &SchemaManager<'_>) -> Result<(), DbErr> {
    match manager.get_database_backend() {
        DatabaseBackend::MySql | DatabaseBackend::Postgres => {
            manager
                .get_connection()
                .execute_unprepared(
                    "UPDATE users
                     SET email = CONCAT('rollback-user-', id, '@local.invalid')
                     WHERE email IS NULL",
                )
                .await?;
        }
        DatabaseBackend::Sqlite => {
            manager
                .get_connection()
                .execute_unprepared(
                    "UPDATE users
                 SET email = 'rollback-user-' || id || '@local.invalid'
                 WHERE email IS NULL",
                )
                .await?;
        }
        backend => {
            return Err(DbErr::Migration(format!(
                "unsupported database backend for nullable user email rollback fill: {backend:?}"
            )));
        }
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
    #[sea_orm(iden = "users_rebuild")]
    Table,
}
