//! Integration tests for administrator config routes.

#[macro_use]
mod common;

use actix_web::test;
use aster_yggdrasil::config::definitions::{
    BRANDING_TITLE_KEY, YGGDRASIL_PUBLIC_BASE_URL_KEY, YGGDRASIL_SIGNATURE_PRIVATE_KEY_KEY,
    YGGDRASIL_SIGNATURE_PUBLIC_KEY_KEY, YGGDRASIL_SKIN_DOMAINS_KEY,
};
use serde_json::Value;

#[actix_web::test]
async fn admin_config_requires_authentication() {
    let state = common::setup().await;
    let app = create_test_app!(state);

    let req = test::TestRequest::get()
        .uri("/api/v1/admin/config")
        .to_request();
    assert_service_status!(app, req, 401);
}

#[actix_web::test]
async fn admin_config_lists_schema_and_updates_runtime_value() {
    let state = common::setup().await;
    let state_for_assert = state.clone();
    let app = create_test_app!(state);
    let token = setup_admin!(app);

    let req = test::TestRequest::get()
        .uri("/api/v1/admin/config")
        .insert_header(common::bearer_header(&token))
        .to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 200);
    let body: Value = test::read_body_json(resp).await;
    assert!(
        body["data"]["items"]
            .as_array()
            .is_some_and(|items| !items.is_empty())
    );

    let req = test::TestRequest::get()
        .uri("/api/v1/admin/config/schema")
        .insert_header(common::bearer_header(&token))
        .to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 200);
    let body: Value = test::read_body_json(resp).await;
    assert!(
        body["data"]
            .as_array()
            .expect("schema should be an array")
            .iter()
            .any(|item| item["key"] == BRANDING_TITLE_KEY)
    );

    let req = test::TestRequest::put()
        .uri(&format!("/api/v1/admin/config/{BRANDING_TITLE_KEY}"))
        .insert_header(common::bearer_header(&token))
        .set_json(serde_json::json!({
            "value": "Template Title"
        }))
        .to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 200);
    let body: Value = test::read_body_json(resp).await;
    assert_eq!(body["data"]["config"]["key"], BRANDING_TITLE_KEY);
    assert_eq!(body["data"]["config"]["value"], "Template Title");
    assert_eq!(body["data"]["warnings"].as_array().unwrap().len(), 0);

    assert_eq!(
        state_for_assert
            .runtime_config
            .get(BRANDING_TITLE_KEY)
            .as_deref(),
        Some("Template Title")
    );
}

#[actix_web::test]
async fn admin_config_validates_yggdrasil_values_and_auto_covers_texture_domains() {
    let state = common::setup().await;
    let app = create_test_app!(state);
    let token = setup_admin!(app);

    let req = test::TestRequest::put()
        .uri(&format!(
            "/api/v1/admin/config/{YGGDRASIL_PUBLIC_BASE_URL_KEY}"
        ))
        .insert_header(common::bearer_header(&token))
        .set_json(serde_json::json!({
            "value": ["https://skin.example.test/yggdrasil/"]
        }))
        .to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 200);
    let body: Value = test::read_body_json(resp).await;
    assert_eq!(
        body["data"]["config"]["value"],
        serde_json::json!(["https://skin.example.test/yggdrasil"])
    );
    assert_eq!(body["data"]["warnings"].as_array().unwrap().len(), 0);

    let req = test::TestRequest::put()
        .uri(&format!(
            "/api/v1/admin/config/{YGGDRASIL_SKIN_DOMAINS_KEY}"
        ))
        .insert_header(common::bearer_header(&token))
        .set_json(serde_json::json!({
            "value": [".minecraft.net", ".mojang.com", "skin.example.test"]
        }))
        .to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 200);
    let body: Value = test::read_body_json(resp).await;
    assert_eq!(body["data"]["warnings"].as_array().unwrap().len(), 0);

    let req = test::TestRequest::put()
        .uri(&format!(
            "/api/v1/admin/config/{YGGDRASIL_PUBLIC_BASE_URL_KEY}"
        ))
        .insert_header(common::bearer_header(&token))
        .set_json(serde_json::json!({
            "value": ["ftp://skin.example.test"]
        }))
        .to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 400);
    let body: Value = test::read_body_json(resp).await;
    assert_eq!(body["code"], "bad_request");
    assert!(
        body["msg"]
            .as_str()
            .unwrap()
            .contains("must use http or https")
    );

    let req = test::TestRequest::put()
        .uri(&format!(
            "/api/v1/admin/config/{YGGDRASIL_SKIN_DOMAINS_KEY}"
        ))
        .insert_header(common::bearer_header(&token))
        .set_json(serde_json::json!({
            "value": ["https://skin.example.test"]
        }))
        .to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 400);
    let body: Value = test::read_body_json(resp).await;
    assert_eq!(body["code"], "bad_request");
    assert!(
        body["msg"]
            .as_str()
            .unwrap()
            .contains("must be a host rule")
    );
}

#[actix_web::test]
async fn admin_config_rotates_yggdrasil_signature_key_by_action_only() {
    let state = common::setup().await;
    let state_for_assert = state.clone();
    let app = create_test_app!(state);
    let token = setup_admin!(app);

    let req = test::TestRequest::put()
        .uri(&format!(
            "/api/v1/admin/config/{YGGDRASIL_SIGNATURE_PRIVATE_KEY_KEY}"
        ))
        .insert_header(common::bearer_header(&token))
        .set_json(serde_json::json!({
            "value": "not a pem"
        }))
        .to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 400);
    let body: Value = test::read_body_json(resp).await;
    assert_eq!(body["code"], "bad_request");
    assert!(
        body["msg"]
            .as_str()
            .unwrap()
            .contains("cannot be updated directly")
    );

    let before = state_for_assert
        .runtime_config()
        .get(YGGDRASIL_SIGNATURE_PRIVATE_KEY_KEY)
        .expect("startup should generate signature key");
    let before_public = state_for_assert
        .runtime_config()
        .get(YGGDRASIL_SIGNATURE_PUBLIC_KEY_KEY)
        .expect("startup should derive signature public key");
    assert!(before_public.contains("BEGIN PUBLIC KEY"));

    let req = test::TestRequest::post()
        .uri("/api/v1/admin/config/yggdrasil/action")
        .insert_header(common::bearer_header(&token))
        .set_json(serde_json::json!({
            "action": "rotate_yggdrasil_signature_key"
        }))
        .to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 200);
    let body: Value = test::read_body_json(resp).await;
    assert_eq!(
        body["data"]["message"],
        "Yggdrasil signature key rotated; new profile and hasJoined texture properties will be signed with the new key"
    );
    assert!(body["data"]["value"].is_null());

    let after = state_for_assert
        .runtime_config()
        .get(YGGDRASIL_SIGNATURE_PRIVATE_KEY_KEY)
        .expect("rotated signature key should be in runtime config");
    assert_ne!(before, after);
    assert!(after.contains("BEGIN PRIVATE KEY"));
    let after_public = state_for_assert
        .runtime_config()
        .get(YGGDRASIL_SIGNATURE_PUBLIC_KEY_KEY)
        .expect("rotated signature public key should be in runtime config");
    assert_ne!(before_public, after_public);
    assert!(after_public.contains("BEGIN PUBLIC KEY"));

    let req = test::TestRequest::get().uri("/api/yggdrasil/").to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 200);
    let metadata: Value = test::read_body_json(resp).await;
    assert!(
        metadata["signaturePublickey"]
            .as_str()
            .unwrap()
            .contains("BEGIN PUBLIC KEY")
    );
    assert_eq!(
        metadata["signaturePublickey"].as_str().unwrap(),
        after_public
    );
}
