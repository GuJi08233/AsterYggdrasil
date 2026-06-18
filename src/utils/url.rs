//! URL normalization helpers.

use crate::errors::{AsterError, Result};

pub fn normalize_http_base_url(
    value: &str,
    label: &str,
    allow_empty: bool,
    forbid_query_fragment: bool,
    error_fn: fn(String) -> AsterError,
) -> Result<Option<String>> {
    let normalized = value.trim().trim_end_matches('/').to_string();
    if normalized.is_empty() {
        if allow_empty {
            return Ok(None);
        }
        return Err(error_fn(format!("{label} cannot be empty")));
    }

    let parsed = ::url::Url::parse(&normalized).map_err(|error| {
        error_fn(format!(
            "{label} must be an absolute http/https URL: {error}"
        ))
    })?;
    if !matches!(parsed.scheme(), "http" | "https") || parsed.host_str().is_none() {
        return Err(error_fn(format!(
            "{label} must use http or https and include a host"
        )));
    }
    if forbid_query_fragment && (parsed.query().is_some() || parsed.fragment().is_some()) {
        return Err(error_fn(format!(
            "{label} cannot include query or fragment"
        )));
    }

    Ok(Some(normalized))
}

#[cfg(test)]
mod tests {
    use super::normalize_http_base_url;
    use crate::errors::AsterError;

    fn validation_error(message: String) -> AsterError {
        AsterError::validation_error(message)
    }

    #[test]
    fn http_base_url_normalization_trims_and_removes_trailing_slashes() {
        assert_eq!(
            normalize_http_base_url(
                " https://example.test/root// ",
                "demo_url",
                false,
                true,
                validation_error,
            )
            .unwrap(),
            Some("https://example.test/root".to_string())
        );
    }

    #[test]
    fn http_base_url_normalization_handles_empty_values() {
        assert_eq!(
            normalize_http_base_url("  ", "demo_url", true, true, validation_error).unwrap(),
            None
        );
        assert!(normalize_http_base_url("  ", "demo_url", false, true, validation_error).is_err());
    }

    #[test]
    fn http_base_url_normalization_rejects_bad_scheme_and_query_fragment() {
        assert!(
            normalize_http_base_url(
                "ftp://example.test/root",
                "demo_url",
                false,
                true,
                validation_error,
            )
            .is_err()
        );
        assert!(
            normalize_http_base_url(
                "https://example.test/root?x=1",
                "demo_url",
                false,
                true,
                validation_error,
            )
            .is_err()
        );
        assert!(
            normalize_http_base_url(
                "https://example.test/root#frag",
                "demo_url",
                false,
                true,
                validation_error,
            )
            .is_err()
        );
    }
}
