//! S3-compatible texture storage.

use super::{TextureBlobMetadata, TextureStorage};
use crate::config::S3TextureStorageConfig;
use crate::errors::{AsterError, MapAsterErr, Result};
use async_trait::async_trait;
use aws_credential_types::Credentials;
use aws_sdk_s3::config::{BehaviorVersion, Region, timeout::TimeoutConfig};
use aws_sdk_s3::error::{ProvideErrorMetadata, SdkError};
use aws_sdk_s3::primitives::ByteStream;
use std::error::Error as StdError;
use std::path::Path;
use std::time::Duration;
use tokio::io::AsyncRead;

const TEXTURE_CONTENT_TYPE: &str = "image/png";
const DEFAULT_REGION: &str = "us-east-1";
const CONNECT_TIMEOUT: Duration = Duration::from_secs(5);
const READ_TIMEOUT: Duration = Duration::from_secs(30);
const OPERATION_TIMEOUT: Duration = Duration::from_secs(60);

pub struct S3TextureStorage {
    client: aws_sdk_s3::Client,
    bucket: String,
    base_path: String,
    endpoint: Option<String>,
    force_path_style: bool,
}

impl S3TextureStorage {
    pub fn new(config: &S3TextureStorageConfig) -> Result<Self> {
        validate_config(config)?;

        let credentials = Credentials::new(
            config.access_key_id.trim(),
            config.secret_access_key.trim(),
            None,
            None,
            "asteryggdrasil-texture-storage",
        );
        let region = if config.region.trim().is_empty() {
            DEFAULT_REGION
        } else {
            config.region.trim()
        };

        let mut builder = aws_sdk_s3::Config::builder()
            .behavior_version(BehaviorVersion::latest())
            .region(Region::new(region.to_string()))
            .credentials_provider(credentials)
            .timeout_config(
                TimeoutConfig::builder()
                    .connect_timeout(CONNECT_TIMEOUT)
                    .read_timeout(READ_TIMEOUT)
                    .operation_timeout(OPERATION_TIMEOUT)
                    .build(),
            )
            .force_path_style(config.force_path_style);

        let endpoint = normalize_endpoint(&config.endpoint)?;
        if let Some(endpoint) = endpoint.as_deref() {
            builder = builder.endpoint_url(endpoint);
        }

        Ok(Self {
            client: aws_sdk_s3::Client::from_conf(builder.build()),
            bucket: config.bucket.trim().to_string(),
            base_path: sanitize_base_path(&config.base_path)?,
            endpoint,
            force_path_style: config.force_path_style,
        })
    }

    fn full_key(&self, storage_key: &str) -> Result<String> {
        let key = sanitize_storage_key(storage_key)?;
        Ok(join_key_prefix(&self.base_path, &key))
    }

    fn full_prefix(&self, prefix: &str) -> Result<String> {
        let prefix = sanitize_storage_prefix(prefix)?;
        if self.base_path.is_empty() {
            return Ok(prefix);
        }
        if prefix.is_empty() {
            return Ok(format!("{}/", self.base_path));
        }
        Ok(join_key_prefix(&self.base_path, &prefix))
    }

    fn strip_base_path<'a>(&self, key: &'a str) -> Option<&'a str> {
        if self.base_path.is_empty() {
            return Some(key);
        }
        key.strip_prefix(&format!("{}/", self.base_path))
    }
}

#[async_trait]
impl TextureStorage for S3TextureStorage {
    fn backend_name(&self) -> &'static str {
        "s3"
    }

    async fn put_file(&self, storage_key: &str, local_path: &Path) -> Result<String> {
        let key = sanitize_storage_key(storage_key)?;
        let full_key = self.full_key(&key)?;
        let body = ByteStream::from_path(local_path)
            .await
            .map_aster_err_ctx("open texture for S3 upload", AsterError::internal_error)?;

        self.client
            .put_object()
            .bucket(&self.bucket)
            .key(&full_key)
            .content_type(TEXTURE_CONTENT_TYPE)
            .body(body)
            .send()
            .await
            .map_err(|error| {
                self.map_sdk_error(
                    "put_object",
                    Some(&full_key),
                    "S3 texture upload failed",
                    error,
                )
            })?;

        Ok(key)
    }

    async fn get_stream(&self, storage_key: &str) -> Result<Box<dyn AsyncRead + Unpin + Send>> {
        let key = self.full_key(storage_key)?;
        let response = self
            .client
            .get_object()
            .bucket(&self.bucket)
            .key(&key)
            .send()
            .await
            .map_err(|error| {
                self.map_not_found_or_sdk_error(
                    "get_object",
                    Some(&key),
                    "S3 texture download failed",
                    error,
                )
            })?;

        Ok(Box::new(response.body.into_async_read()))
    }

    async fn delete(&self, storage_key: &str) -> Result<()> {
        let key = self.full_key(storage_key)?;
        self.client
            .delete_object()
            .bucket(&self.bucket)
            .key(&key)
            .send()
            .await
            .map_err(|error| {
                self.map_sdk_error(
                    "delete_object",
                    Some(&key),
                    "S3 texture delete failed",
                    error,
                )
            })?;
        Ok(())
    }

    async fn exists(&self, storage_key: &str) -> Result<bool> {
        let key = self.full_key(storage_key)?;
        match self
            .client
            .head_object()
            .bucket(&self.bucket)
            .key(&key)
            .send()
            .await
        {
            Ok(_) => Ok(true),
            Err(error) if is_not_found(&error) => Ok(false),
            Err(error) => Err(self.map_sdk_error(
                "head_object",
                Some(&key),
                "S3 texture exists check failed",
                error,
            )),
        }
    }

    async fn metadata(&self, storage_key: &str) -> Result<TextureBlobMetadata> {
        let key = self.full_key(storage_key)?;
        let response = self
            .client
            .head_object()
            .bucket(&self.bucket)
            .key(&key)
            .send()
            .await
            .map_err(|error| {
                self.map_not_found_or_sdk_error(
                    "head_object",
                    Some(&key),
                    "S3 texture metadata failed",
                    error,
                )
            })?;
        let size = response
            .content_length
            .map(|value| crate::utils::numbers::i64_to_u64(value, "S3 texture content_length"))
            .transpose()?
            .unwrap_or(0);

        Ok(TextureBlobMetadata {
            size,
            content_type: TEXTURE_CONTENT_TYPE,
        })
    }

    async fn list_keys(&self, prefix: &str) -> Result<Vec<String>> {
        let prefix = self.full_prefix(prefix)?;
        let mut continuation_token: Option<String> = None;
        let mut keys = Vec::new();

        loop {
            let mut request = self.client.list_objects_v2().bucket(&self.bucket);
            if !prefix.is_empty() {
                request = request.prefix(prefix.clone());
            }
            if let Some(token) = continuation_token.as_deref() {
                request = request.continuation_token(token);
            }

            let response = request.send().await.map_err(|error| {
                self.map_sdk_error(
                    "list_objects_v2",
                    Some(&prefix),
                    "S3 texture list failed",
                    error,
                )
            })?;

            for object in response.contents() {
                let Some(key) = object.key() else {
                    continue;
                };
                if let Some(storage_key) = self.strip_base_path(key) {
                    keys.push(storage_key.to_string());
                }
            }

            let truncated = response.is_truncated().unwrap_or(false);
            continuation_token = response.next_continuation_token().map(ToOwned::to_owned);
            if !truncated || continuation_token.is_none() {
                break;
            }
        }

        keys.sort();
        Ok(keys)
    }
}

impl S3TextureStorage {
    fn map_not_found_or_sdk_error<E>(
        &self,
        operation: &'static str,
        key: Option<&str>,
        context: &'static str,
        error: SdkError<E>,
    ) -> AsterError
    where
        E: StdError + ProvideErrorMetadata + Send + Sync + 'static,
    {
        if is_not_found(&error) {
            AsterError::record_not_found(format!("{context}: object not found"))
        } else {
            self.map_sdk_error(operation, key, context, error)
        }
    }

    fn map_sdk_error<E>(
        &self,
        operation: &'static str,
        key: Option<&str>,
        context: &'static str,
        error: SdkError<E>,
    ) -> AsterError
    where
        E: StdError + ProvideErrorMetadata + Send + Sync + 'static,
    {
        let formatted = format_sdk_error(&error);
        tracing::warn!(
            operation,
            bucket = %self.bucket,
            key = key.unwrap_or(""),
            endpoint = self.endpoint.as_deref().unwrap_or("aws-default"),
            force_path_style = self.force_path_style,
            error = %formatted,
            "S3 texture storage request failed"
        );
        AsterError::internal_error(format!("{context}: {formatted}"))
    }
}

fn validate_config(config: &S3TextureStorageConfig) -> Result<()> {
    if config.bucket.trim().is_empty() {
        return Err(AsterError::config_error(
            "texture_storage.s3.bucket cannot be empty",
        ));
    }
    if config.access_key_id.trim().is_empty() {
        return Err(AsterError::config_error(
            "texture_storage.s3.access_key_id cannot be empty",
        ));
    }
    if config.secret_access_key.trim().is_empty() {
        return Err(AsterError::config_error(
            "texture_storage.s3.secret_access_key cannot be empty",
        ));
    }
    normalize_endpoint(&config.endpoint)?;
    Ok(())
}

fn normalize_endpoint(endpoint: &str) -> Result<Option<String>> {
    crate::utils::url::normalize_http_base_url(
        endpoint,
        "texture_storage.s3.endpoint",
        true,
        true,
        AsterError::config_error,
    )
}

fn sanitize_base_path(base_path: &str) -> Result<String> {
    Ok(sanitize_storage_prefix(base_path)?
        .trim_end_matches('/')
        .to_string())
}

fn sanitize_storage_key(storage_key: &str) -> Result<String> {
    if storage_key.ends_with('/') {
        return Err(AsterError::validation_error(
            "texture storage key must not end with slash",
        ));
    }
    let key = sanitize_key_components(storage_key, false)?;
    Ok(key)
}

fn sanitize_storage_prefix(prefix: &str) -> Result<String> {
    if prefix.trim().is_empty() {
        return Ok(String::new());
    }
    let mut sanitized = sanitize_key_components(prefix, true)?;
    if prefix.ends_with('/') && !sanitized.ends_with('/') {
        sanitized.push('/');
    }
    Ok(sanitized)
}

fn sanitize_key_components(value: &str, allow_empty: bool) -> Result<String> {
    if value.trim().is_empty() {
        return if allow_empty {
            Ok(String::new())
        } else {
            Err(AsterError::validation_error("texture storage key is empty"))
        };
    }
    if value.starts_with('/') {
        return Err(AsterError::validation_error(
            "texture storage key must be relative",
        ));
    }
    if value.contains('\\') {
        return Err(AsterError::validation_error(
            "texture storage key contains invalid path separator",
        ));
    }

    let mut parts = Vec::new();
    for part in value.split('/') {
        match part {
            "" | "." => {}
            ".." => {
                return Err(AsterError::validation_error(
                    "texture storage key contains invalid path component",
                ));
            }
            part => parts.push(part),
        }
    }

    if parts.is_empty() {
        return if allow_empty {
            Ok(String::new())
        } else {
            Err(AsterError::validation_error("texture storage key is empty"))
        };
    }

    Ok(parts.join("/"))
}

fn join_key_prefix(prefix: &str, key: &str) -> String {
    if prefix.is_empty() {
        key.to_string()
    } else {
        format!("{prefix}/{key}")
    }
}

fn is_not_found<E>(error: &SdkError<E>) -> bool
where
    E: StdError + ProvideErrorMetadata + Send + Sync + 'static,
{
    matches!(error.code(), Some("NoSuchKey" | "NotFound"))
        || error.raw_response().map(|raw| raw.status().as_u16()) == Some(404)
}

fn format_sdk_error<E>(error: &SdkError<E>) -> String
where
    E: StdError + ProvideErrorMetadata + Send + Sync + 'static,
{
    let mut details = Vec::new();
    if let Some(status) = error.raw_response().map(|raw| raw.status().as_u16()) {
        details.push(format!("http_status={status}"));
    }
    if let Some(code) = error.code() {
        details.push(format!("code={code}"));
    }
    if let Some(message) = error.message() {
        details.push(format!("message={message}"));
    }
    let source_chain = format_error_source_chain(error);
    if !source_chain.is_empty() {
        details.push(format!("source={source_chain}"));
    }

    if details.is_empty() {
        error.to_string()
    } else {
        details.join(", ")
    }
}

fn format_error_source_chain(error: &dyn StdError) -> String {
    let mut sources = Vec::new();
    let mut current = error.source();
    while let Some(source) = current {
        sources.push(source.to_string());
        current = source.source();
    }
    sources.join(": ")
}

#[cfg(test)]
mod tests {
    use super::{
        S3TextureStorage, format_sdk_error, normalize_endpoint, sanitize_base_path,
        sanitize_storage_key, sanitize_storage_prefix,
    };
    use crate::config::{S3TextureStorageConfig, TextureStorageConfig};
    use crate::texture_storage::{TextureStorage, create_texture_storage};
    use aws_credential_types::Credentials;
    use aws_sdk_s3::error::ProvideErrorMetadata;
    use aws_sdk_s3::error::SdkError;
    use aws_sdk_s3::operation::put_object::PutObjectError;
    use testcontainers::{GenericImage, ImageExt, runners::AsyncRunner};
    use tokio::io::AsyncReadExt;

    const RUSTFS_ACCESS_KEY: &str = "rustfsadmin";
    const RUSTFS_SECRET_KEY: &str = "rustfsadmin123";
    const RUSTFS_PORT: u16 = 9000;

    fn valid_config() -> S3TextureStorageConfig {
        S3TextureStorageConfig {
            endpoint: "http://127.0.0.1:9000".to_string(),
            region: "us-east-1".to_string(),
            bucket: "textures".to_string(),
            base_path: String::new(),
            access_key_id: RUSTFS_ACCESS_KEY.to_string(),
            secret_access_key: RUSTFS_SECRET_KEY.to_string(),
            force_path_style: true,
        }
    }

    #[test]
    fn initializes_without_network_io() {
        let storage = S3TextureStorage::new(&valid_config()).unwrap();

        assert_eq!(storage.bucket, "textures");
        assert_eq!(storage.base_path, "");
        assert_eq!(storage.endpoint.as_deref(), Some("http://127.0.0.1:9000"));
        assert!(storage.force_path_style);
    }

    #[test]
    fn endpoint_is_normalized_and_validated() {
        assert_eq!(normalize_endpoint("").unwrap(), None);
        assert_eq!(
            normalize_endpoint(" http://127.0.0.1:9000/ ").unwrap(),
            Some("http://127.0.0.1:9000".to_string())
        );
        assert_eq!(
            normalize_endpoint("https://s3.example.test/root/").unwrap(),
            Some("https://s3.example.test/root".to_string())
        );
        assert!(normalize_endpoint("ftp://s3.example.test").is_err());
        assert!(normalize_endpoint("http://").is_err());
        assert!(normalize_endpoint("https://s3.example.test/root?x=1").is_err());
        assert!(normalize_endpoint("https://s3.example.test/root#fragment").is_err());
    }

    #[test]
    fn sdk_error_format_includes_source_chain_for_transport_failures() {
        let error: SdkError<PutObjectError> = SdkError::construction_failure(std::io::Error::new(
            std::io::ErrorKind::ConnectionRefused,
            "connection refused",
        ));

        let formatted = format_sdk_error(&error);

        assert!(formatted.contains("failed to construct request") || formatted.contains("source="));
        assert!(formatted.contains("connection refused"));
    }

    #[test]
    fn rejects_incomplete_config() {
        for (config, expected) in [
            {
                let mut config = valid_config();
                config.bucket.clear();
                (config, "texture_storage.s3.bucket cannot be empty")
            },
            {
                let mut config = valid_config();
                config.access_key_id = "  ".to_string();
                (config, "texture_storage.s3.access_key_id cannot be empty")
            },
            {
                let mut config = valid_config();
                config.secret_access_key.clear();
                (
                    config,
                    "texture_storage.s3.secret_access_key cannot be empty",
                )
            },
        ] {
            let error = match S3TextureStorage::new(&config) {
                Ok(_) => panic!("S3 texture storage should reject incomplete config"),
                Err(error) => error,
            };

            assert!(error.message().contains(expected));
        }
    }

    #[test]
    fn storage_key_rejects_absolute_parent_or_backslash_paths() {
        assert!(sanitize_storage_key("").is_err());
        assert!(sanitize_storage_key("  ").is_err());
        assert!(sanitize_storage_key("/textures/a.png").is_err());
        assert!(sanitize_storage_key("../a.png").is_err());
        assert!(sanitize_storage_key("textures/../../a.png").is_err());
        assert!(sanitize_storage_key("textures\\a.png").is_err());
        assert!(sanitize_storage_key("textures/").is_err());
        assert!(sanitize_storage_key("textures/a.png").is_ok());
    }

    #[test]
    fn storage_prefix_preserves_trailing_slash() {
        assert_eq!(
            sanitize_storage_prefix("textures/ab/").unwrap(),
            "textures/ab/"
        );
        assert_eq!(sanitize_storage_prefix("").unwrap(), "");
    }

    #[test]
    fn storage_prefix_rejects_dangerous_paths() {
        assert!(sanitize_storage_prefix("/textures").is_err());
        assert!(sanitize_storage_prefix("textures/../other").is_err());
        assert!(sanitize_storage_prefix("textures\\ab").is_err());
    }

    #[test]
    fn base_path_is_normalized_and_validated() {
        assert_eq!(sanitize_base_path("").unwrap(), "");
        assert_eq!(sanitize_base_path("textures").unwrap(), "textures");
        assert_eq!(sanitize_base_path("textures/").unwrap(), "textures");
        assert_eq!(
            sanitize_base_path("env/production/textures/").unwrap(),
            "env/production/textures"
        );
        assert!(sanitize_base_path("/textures").is_err());
        assert!(sanitize_base_path("textures/../other").is_err());
    }

    #[test]
    fn base_path_is_applied_without_leaking_to_storage_keys() {
        let storage = S3TextureStorage::new(&S3TextureStorageConfig {
            base_path: "env/textures/".to_string(),
            ..valid_config()
        })
        .unwrap();

        assert_eq!(storage.base_path, "env/textures");
        assert_eq!(
            storage.full_key("aa/bb.png").unwrap(),
            "env/textures/aa/bb.png"
        );
        assert_eq!(storage.full_prefix("").unwrap(), "env/textures/");
        assert_eq!(storage.full_prefix("aa/").unwrap(), "env/textures/aa/");
        assert_eq!(
            storage.strip_base_path("env/textures/aa/bb.png"),
            Some("aa/bb.png")
        );
        assert_eq!(
            storage.strip_base_path("env/textures-other/aa/bb.png"),
            None
        );
    }

    #[test]
    fn s3_and_minio_backends_initialize_without_network_io() {
        for backend in ["s3", "minio"] {
            let config = TextureStorageConfig {
                backend: backend.to_string(),
                s3: valid_config(),
                ..TextureStorageConfig::default()
            };

            let storage = create_texture_storage(&config).unwrap();

            assert_eq!(storage.backend_name(), "s3");
        }
    }

    #[tokio::test]
    async fn s3_backend_satisfies_streaming_texture_storage_contract() {
        let (_container, endpoint) = start_rustfs().await;
        let bucket = format!("textures-{}", uuid::Uuid::new_v4());
        create_bucket(&endpoint, &bucket).await;
        let storage = S3TextureStorage::new(&S3TextureStorageConfig {
            endpoint: endpoint.clone(),
            bucket: bucket.clone(),
            base_path: "env/production/textures".to_string(),
            ..valid_config()
        })
        .unwrap();

        let temp_dir = std::env::temp_dir().join(format!(
            "asteryggdrasil-s3-storage-contract-{}",
            uuid::Uuid::new_v4()
        ));
        tokio::fs::create_dir_all(&temp_dir).await.unwrap();
        let source = temp_dir.join("source.png");
        tokio::fs::write(&source, b"png-bytes").await.unwrap();

        let prefix = format!("contract/{}/", uuid::Uuid::new_v4());
        let key = format!("{prefix}skin.png");
        let sibling_key = format!("{prefix}cape.png");
        assert_eq!(storage.put_file(&key, &source).await.unwrap(), key);
        assert_eq!(
            storage.put_file(&sibling_key, &source).await.unwrap(),
            sibling_key
        );

        assert!(storage.exists(&key).await.unwrap());
        assert!(
            !storage
                .exists(&format!("{prefix}missing.png"))
                .await
                .unwrap()
        );

        let metadata = storage.metadata(&key).await.unwrap();
        assert_eq!(metadata.size, 9);
        assert_eq!(metadata.content_type, "image/png");

        let mut stream = storage.get_stream(&key).await.unwrap();
        let mut bytes = Vec::new();
        stream.read_to_end(&mut bytes).await.unwrap();
        assert_eq!(bytes, b"png-bytes");

        let mut keys = storage.list_keys(&prefix).await.unwrap();
        keys.sort();
        assert_eq!(keys, vec![sibling_key.clone(), key.clone()]);

        let raw_client = s3_test_client(&endpoint);
        let uploaded = raw_client
            .get_object()
            .bucket(&bucket)
            .key(format!("env/production/textures/{key}"))
            .send()
            .await
            .unwrap()
            .body
            .collect()
            .await
            .unwrap()
            .into_bytes();
        assert_eq!(uploaded.as_ref(), b"png-bytes");

        storage.delete(&key).await.unwrap();
        storage.delete(&key).await.unwrap();
        assert!(!storage.exists(&key).await.unwrap());
        assert!(storage.exists(&sibling_key).await.unwrap());
        storage.delete(&sibling_key).await.unwrap();
        tokio::fs::remove_dir_all(temp_dir).await.unwrap();
    }

    #[tokio::test]
    async fn s3_backend_reports_missing_objects_without_failing_exists() {
        let (_container, endpoint) = start_rustfs().await;
        let bucket = format!("textures-{}", uuid::Uuid::new_v4());
        create_bucket(&endpoint, &bucket).await;
        let storage = S3TextureStorage::new(&S3TextureStorageConfig {
            endpoint,
            bucket,
            ..valid_config()
        })
        .unwrap();

        assert!(!storage.exists("missing/skin.png").await.unwrap());
        assert!(storage.metadata("missing/skin.png").await.is_err());
        assert!(storage.get_stream("missing/skin.png").await.is_err());
    }

    async fn start_rustfs() -> (
        testcontainers::ContainerAsync<testcontainers::GenericImage>,
        String,
    ) {
        let container = GenericImage::new("rustfs/rustfs", "latest")
            .with_exposed_port(testcontainers::core::IntoContainerPort::tcp(RUSTFS_PORT))
            .with_env_var("RUSTFS_ACCESS_KEY", RUSTFS_ACCESS_KEY)
            .with_env_var("RUSTFS_SECRET_KEY", RUSTFS_SECRET_KEY)
            .start()
            .await
            .expect("failed to start rustfs container");

        let port = container
            .get_host_port_ipv4(testcontainers::core::IntoContainerPort::tcp(RUSTFS_PORT))
            .await
            .expect("rustfs test port should be exposed");

        (container, format!("http://127.0.0.1:{port}"))
    }

    async fn create_bucket(endpoint: &str, bucket: &str) {
        let client = s3_test_client(endpoint);
        let mut last_error = None;
        let ready = tokio::time::timeout(std::time::Duration::from_secs(45), async {
            loop {
                match tokio::time::timeout(
                    std::time::Duration::from_secs(3),
                    client.create_bucket().bucket(bucket).send(),
                )
                .await
                {
                    Ok(Ok(_)) => break,
                    Ok(Err(error)) => {
                        let code = error
                            .as_service_error()
                            .and_then(|service_error| service_error.code());
                        if matches!(
                            code,
                            Some("BucketAlreadyOwnedByYou" | "BucketAlreadyExists")
                        ) {
                            break;
                        }
                        last_error = Some(error.to_string());
                    }
                    Err(_) => {
                        last_error = Some("create_bucket attempt timed out".to_string());
                    }
                }
                tokio::time::sleep(std::time::Duration::from_millis(250)).await;
            }
        })
        .await;

        if ready.is_err() {
            panic!(
                "timed out waiting for S3 bucket {bucket} at {endpoint}: {}",
                last_error.unwrap_or_else(|| "unknown error".to_string())
            );
        }
    }

    fn s3_test_client(endpoint: &str) -> aws_sdk_s3::Client {
        let credentials = Credentials::new(
            RUSTFS_ACCESS_KEY,
            RUSTFS_SECRET_KEY,
            None,
            None,
            "asteryggdrasil-s3-test",
        );
        let config = aws_sdk_s3::Config::builder()
            .behavior_version(aws_sdk_s3::config::BehaviorVersion::latest())
            .region(aws_sdk_s3::config::Region::new("us-east-1"))
            .credentials_provider(credentials)
            .endpoint_url(endpoint)
            .force_path_style(true)
            .build();
        aws_sdk_s3::Client::from_conf(config)
    }
}
