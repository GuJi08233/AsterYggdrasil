//! 外部认证 URL 校验辅助。

use url::Url;

use crate::errors::{AsterError, MapAsterErr, Result};

pub(crate) fn parse_url(
    value: &str,
    context: &str,
    error_fn: fn(String) -> AsterError,
) -> Result<Url> {
    Url::parse(value).map_aster_err_ctx(context, error_fn)
}
