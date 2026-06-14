use crate::db::repository::minecraft_texture_repo;
use crate::errors::{AsterError, Result};
use crate::runtime::{DatabaseRuntimeState, TextureStorageRuntimeState};
use sha2::Digest;
use tokio::io::AsyncReadExt;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct OrphanTextureCleanupResult {
    pub scanned: u64,
    pub deleted: u64,
    pub skipped: u64,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct TextureStorageConsistencyIssue {
    pub texture_id: i64,
    pub storage_key: String,
    pub hash: String,
    pub kind: TextureStorageConsistencyIssueKind,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum TextureStorageConsistencyIssueKind {
    MissingObject,
    HashMismatch,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct TextureStorageConsistencyReport {
    pub checked: u64,
    pub missing: u64,
    pub hash_mismatched: u64,
    pub issues: Vec<TextureStorageConsistencyIssue>,
}

pub async fn cleanup_orphan_texture_blobs<S>(state: &S) -> Result<OrphanTextureCleanupResult>
where
    S: DatabaseRuntimeState + TextureStorageRuntimeState,
{
    let storage_keys = state.texture_storage().list_keys("").await?;
    let mut result = OrphanTextureCleanupResult {
        scanned: crate::utils::numbers::usize_to_u64(
            storage_keys.len(),
            "orphan texture cleanup scanned count",
        )?,
        deleted: 0,
        skipped: 0,
    };

    for storage_key in storage_keys {
        let references = count_texture_storage_references(state, &storage_key).await?;
        if references > 0 {
            result.skipped += 1;
            continue;
        }

        state.texture_storage().delete(&storage_key).await?;
        result.deleted += 1;
    }

    Ok(result)
}

pub async fn check_texture_storage_consistency<S>(
    state: &S,
) -> Result<TextureStorageConsistencyReport>
where
    S: DatabaseRuntimeState + TextureStorageRuntimeState,
{
    let textures = minecraft_texture_repo::list_all(state.reader_db()).await?;
    let mut report = TextureStorageConsistencyReport {
        checked: crate::utils::numbers::usize_to_u64(
            textures.len(),
            "texture storage consistency checked count",
        )?,
        missing: 0,
        hash_mismatched: 0,
        issues: Vec::new(),
    };

    for texture in textures {
        if !state.texture_storage().exists(&texture.storage_key).await? {
            report.missing += 1;
            report.issues.push(TextureStorageConsistencyIssue {
                texture_id: texture.id,
                storage_key: texture.storage_key,
                hash: texture.hash,
                kind: TextureStorageConsistencyIssueKind::MissingObject,
            });
            continue;
        }

        let actual_hash = hash_texture_storage_object(state, &texture.storage_key).await?;
        if actual_hash != texture.hash {
            report.hash_mismatched += 1;
            report.issues.push(TextureStorageConsistencyIssue {
                texture_id: texture.id,
                storage_key: texture.storage_key,
                hash: texture.hash,
                kind: TextureStorageConsistencyIssueKind::HashMismatch,
            });
        }
    }

    Ok(report)
}

pub(super) async fn cleanup_texture_blob_if_unreferenced<S>(
    state: &S,
    storage_key: &str,
    reason: &str,
) where
    S: DatabaseRuntimeState + TextureStorageRuntimeState,
{
    let ref_count = match count_texture_storage_references(state, storage_key).await {
        Ok(ref_count) => ref_count,
        Err(error) => {
            tracing::warn!(
                error = %error,
                storage_key,
                reason,
                "failed to count texture blob references before cleanup"
            );
            return;
        }
    };
    if ref_count != 0 {
        tracing::debug!(
            storage_key,
            ref_count,
            reason,
            "skipping texture blob cleanup because it is still referenced"
        );
        return;
    }

    match state.texture_storage().delete(storage_key).await {
        Ok(()) => {}
        Err(error) => match state.texture_storage().exists(storage_key).await {
            Ok(false) => {
                tracing::warn!(
                    error = %error,
                    storage_key,
                    reason,
                    "texture blob delete failed but object is already absent"
                );
            }
            Ok(true) => {
                tracing::warn!(
                    error = %error,
                    storage_key,
                    reason,
                    "failed to delete unreferenced texture blob"
                );
            }
            Err(exists_error) => {
                tracing::warn!(
                    error = %error,
                    exists_error = %exists_error,
                    storage_key,
                    reason,
                    "failed to delete unreferenced texture blob and verify existence"
                );
            }
        },
    }
}

async fn count_texture_storage_references<S>(state: &S, storage_key: &str) -> Result<u64>
where
    S: DatabaseRuntimeState,
{
    minecraft_texture_repo::count_by_storage_key(state.writer_db(), storage_key).await
}

async fn hash_texture_storage_object<S>(state: &S, storage_key: &str) -> Result<String>
where
    S: TextureStorageRuntimeState,
{
    let mut stream = state.texture_storage().get_stream(storage_key).await?;
    let mut hasher = sha2::Sha256::new();
    let mut buffer = [0_u8; 8192];
    loop {
        let read = stream.read(&mut buffer).await.map_err(|error| {
            AsterError::internal_error(format!("read texture storage object for hash: {error}"))
        })?;
        if read == 0 {
            break;
        }
        hasher.update(&buffer[..read]);
    }
    Ok(hex::encode(hasher.finalize()))
}
