//! Build metadata injected by `build.rs`.

pub const VERSION: &str = env!("ASTER_BUILD_VERSION");
pub const REPOSITORY: &str = env!("CARGO_PKG_REPOSITORY");

#[inline]
pub fn build_time() -> &'static str {
    option_env!("ASTER_BUILD_TIME").unwrap_or("unknown")
}
