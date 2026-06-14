#![cfg(all(debug_assertions, feature = "openapi"))]
//! OpenAPI 生成测试。

use aster_yggdrasil::api::openapi::ApiDoc;
use std::fs;
#[cfg(all(debug_assertions, feature = "openapi"))]
use utoipa::OpenApi;

#[test]
fn generate_openapi() {
    let doc = ApiDoc::openapi();
    let json = serde_json::to_string_pretty(&doc).unwrap();
    fs::create_dir_all("./frontend-panel/generated").expect("Unable to create directory");
    fs::write("./frontend-panel/generated/openapi.json", json)
        .expect("Unable to write OpenAPI spec");
}

#[test]
fn external_auth_provider_openapi_hides_immutable_fields() {
    let doc = ApiDoc::openapi();
    let value = serde_json::to_value(&doc).expect("openapi json value");

    let create = &value["components"]["schemas"]["CreateExternalAuthProviderReq"]["properties"];
    assert!(create.get("provider_kind").is_some());
    assert!(create.get("key").is_none());
    assert!(create.get("slug").is_none());
    assert!(create.get("kind").is_none());

    let create_required =
        value["components"]["schemas"]["CreateExternalAuthProviderReq"]["required"]
            .as_array()
            .expect("create required array");
    assert!(create_required.iter().any(|item| item == "provider_kind"));

    let update = &value["components"]["schemas"]["UpdateExternalAuthProviderReq"]["properties"];
    assert!(update.get("provider_kind").is_none());
    assert!(update.get("key").is_none());
    assert!(update.get("slug").is_none());
    assert!(update.get("kind").is_none());
}
