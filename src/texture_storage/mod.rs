//! Minecraft texture storage abstraction.

mod local;

use crate::errors::Result;
use async_trait::async_trait;
use std::path::Path;
use std::sync::Arc;
use tokio::io::AsyncRead;

pub use local::LocalTextureStorage;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct TextureBlobMetadata {
    pub size: u64,
    pub content_type: &'static str,
}

#[async_trait]
pub trait TextureStorage: Send + Sync {
    fn backend_name(&self) -> &'static str;
    async fn put_file(&self, storage_key: &str, local_path: &Path) -> Result<String>;
    async fn get_stream(&self, storage_key: &str) -> Result<Box<dyn AsyncRead + Unpin + Send>>;
    async fn delete(&self, storage_key: &str) -> Result<()>;
    async fn exists(&self, storage_key: &str) -> Result<bool>;
    async fn metadata(&self, storage_key: &str) -> Result<TextureBlobMetadata>;
    async fn list_keys(&self, prefix: &str) -> Result<Vec<String>>;
}

pub fn create_texture_storage(
    config: &crate::config::TextureStorageConfig,
) -> Result<Arc<dyn TextureStorage>> {
    match config.backend.trim() {
        "" | "local" => Ok(Arc::new(LocalTextureStorage::new(&config.local_root))),
        "s3" | "minio" => Err(crate::errors::AsterError::config_error(
            "texture_storage backend 's3' is reserved but not implemented yet",
        )),
        backend => Err(crate::errors::AsterError::config_error(format!(
            "unsupported texture_storage backend '{backend}'"
        ))),
    }
}

#[cfg(test)]
mod tests {
    use super::create_texture_storage;
    use crate::config::{S3TextureStorageConfig, TextureStorageConfig};
    use tokio::io::AsyncReadExt;

    #[test]
    fn creates_local_backend_from_explicit_config() {
        let config = TextureStorageConfig {
            backend: "local".to_string(),
            local_root: "target/test-textures".to_string(),
            ..TextureStorageConfig::default()
        };

        let storage = create_texture_storage(&config).expect("local texture storage should init");

        assert_eq!(storage.backend_name(), "local");
    }

    #[test]
    fn rejects_reserved_s3_backend_until_implemented() {
        let config = TextureStorageConfig {
            backend: "s3".to_string(),
            ..TextureStorageConfig::default()
        };

        let error = match create_texture_storage(&config) {
            Ok(_) => panic!("s3 texture storage should not initialize before implementation"),
            Err(error) => error,
        };

        assert!(error.message().contains("reserved but not implemented"));
    }

    #[test]
    fn rejects_unknown_backend() {
        let config = TextureStorageConfig {
            backend: "ftp".to_string(),
            ..TextureStorageConfig::default()
        };

        let error = match create_texture_storage(&config) {
            Ok(_) => panic!("unknown texture storage backend should be rejected"),
            Err(error) => error,
        };

        assert!(
            error
                .message()
                .contains("unsupported texture_storage backend")
        );
    }

    fn todo_s3_config(backend: &str) -> TextureStorageConfig {
        TextureStorageConfig {
            backend: backend.to_string(),
            s3: S3TextureStorageConfig {
                endpoint: "http://127.0.0.1:9000".to_string(),
                region: "us-east-1".to_string(),
                bucket: "asteryggdrasil-texture-test".to_string(),
                access_key_id: "minioadmin".to_string(),
                secret_access_key: "minioadmin".to_string(),
                force_path_style: true,
            },
            ..TextureStorageConfig::default()
        }
    }

    #[tokio::test]
    #[ignore = "TODO(storage): enable after implementing S3/minio TextureStorage backend and provisioning a test bucket"]
    async fn s3_backend_satisfies_texture_storage_crud_metadata_and_listing_contract() {
        let storage = create_texture_storage(&todo_s3_config("s3"))
            .expect("S3 texture storage should initialize after implementation");
        assert_eq!(storage.backend_name(), "s3");

        let temp_dir = std::env::temp_dir().join(format!(
            "asteryggdrasil-s3-storage-contract-{}",
            uuid::Uuid::new_v4()
        ));
        tokio::fs::create_dir_all(&temp_dir).await.unwrap();
        let source = temp_dir.join("source.png");
        tokio::fs::write(&source, b"png-bytes").await.unwrap();

        let key = format!("contract/{}/skin.png", uuid::Uuid::new_v4());
        let sibling_key = key.replace("skin.png", "cape.png");
        storage.put_file(&key, &source).await.unwrap();
        storage.put_file(&sibling_key, &source).await.unwrap();

        assert!(storage.exists(&key).await.unwrap());
        let metadata = storage.metadata(&key).await.unwrap();
        assert_eq!(metadata.size, 9);
        assert_eq!(metadata.content_type, "image/png");

        let mut stream = storage.get_stream(&key).await.unwrap();
        let mut bytes = Vec::new();
        stream.read_to_end(&mut bytes).await.unwrap();
        assert_eq!(bytes, b"png-bytes");

        let mut keys = storage
            .list_keys(key.strip_suffix("skin.png").unwrap())
            .await
            .unwrap();
        keys.sort();
        assert_eq!(keys, vec![sibling_key.clone(), key.clone()]);

        storage.delete(&key).await.unwrap();
        storage.delete(&key).await.unwrap();
        assert!(!storage.exists(&key).await.unwrap());
        assert!(storage.exists(&sibling_key).await.unwrap());
        storage.delete(&sibling_key).await.unwrap();
        tokio::fs::remove_dir_all(temp_dir).await.unwrap();
    }

    #[test]
    #[ignore = "TODO(storage): enable after minio alias maps to the S3-compatible backend"]
    fn minio_backend_alias_initializes_s3_compatible_storage() {
        let storage = create_texture_storage(&todo_s3_config("minio"))
            .expect("minio texture storage alias should initialize after implementation");

        assert_eq!(storage.backend_name(), "s3");
    }
}
