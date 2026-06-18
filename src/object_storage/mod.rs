//! Minecraft object storage abstraction.

mod local;
mod s3;

use crate::errors::Result;
use async_trait::async_trait;
use std::path::Path;
use std::sync::Arc;
use tokio::io::AsyncRead;

pub use local::LocalObjectStorage;
pub use s3::S3ObjectStorage;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ObjectBlobMetadata {
    pub size: u64,
    pub content_type: &'static str,
}

#[async_trait]
pub trait ObjectStorage: Send + Sync {
    fn backend_name(&self) -> &'static str;
    async fn put_file(&self, storage_key: &str, local_path: &Path) -> Result<String>;
    async fn get_stream(&self, storage_key: &str) -> Result<Box<dyn AsyncRead + Unpin + Send>>;
    async fn delete(&self, storage_key: &str) -> Result<()>;
    async fn exists(&self, storage_key: &str) -> Result<bool>;
    async fn metadata(&self, storage_key: &str) -> Result<ObjectBlobMetadata>;
    async fn list_keys(&self, prefix: &str) -> Result<Vec<String>>;
}

pub fn create_object_storage(
    config: &crate::config::ObjectStorageConfig,
) -> Result<Arc<dyn ObjectStorage>> {
    match config.backend.trim() {
        "" | "local" => Ok(Arc::new(LocalObjectStorage::new(&config.local_root))),
        "s3" | "minio" => Ok(Arc::new(S3ObjectStorage::new(&config.s3)?)),
        backend => Err(crate::errors::AsterError::config_error(format!(
            "unsupported object_storage backend '{backend}'"
        ))),
    }
}

#[cfg(test)]
mod tests {
    use super::create_object_storage;
    use crate::config::ObjectStorageConfig;

    #[test]
    fn creates_local_backend_from_explicit_config() {
        let config = ObjectStorageConfig {
            backend: "local".to_string(),
            local_root: "target/test-objects".to_string(),
            ..ObjectStorageConfig::default()
        };

        let storage = create_object_storage(&config).expect("local object storage should init");

        assert_eq!(storage.backend_name(), "local");
    }

    #[test]
    fn rejects_incomplete_s3_config() {
        let config = ObjectStorageConfig {
            backend: "s3".to_string(),
            ..ObjectStorageConfig::default()
        };

        let error = match create_object_storage(&config) {
            Ok(_) => panic!("s3 object storage should reject incomplete config"),
            Err(error) => error,
        };

        assert!(error.message().contains("object_storage.s3.bucket"));
    }

    #[test]
    fn rejects_unknown_backend() {
        let config = ObjectStorageConfig {
            backend: "ftp".to_string(),
            ..ObjectStorageConfig::default()
        };

        let error = match create_object_storage(&config) {
            Ok(_) => panic!("unknown object storage backend should be rejected"),
            Err(error) => error,
        };

        assert!(
            error
                .message()
                .contains("unsupported object_storage backend")
        );
    }
}
