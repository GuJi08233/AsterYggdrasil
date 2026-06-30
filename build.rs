//! Build script: inject build time and provide fallback frontend assets.

use std::env;
use std::fs;
use std::io;
use std::path::Path;
use std::process::Command;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    println!("cargo:rerun-if-changed=frontend-panel/dist");
    println!("cargo:rerun-if-env-changed=ASTER_BUILD_VERSION");

    let now = chrono::Utc::now().format("%Y-%m-%dT%H:%M:%SZ");
    println!("cargo:rustc-env=ASTER_BUILD_TIME={now}");

    let manifest_dir = env::var("CARGO_MANIFEST_DIR")
        .map_err(|error| io::Error::other(format!("missing CARGO_MANIFEST_DIR: {error}")))?;
    emit_git_rerun_paths(Path::new(&manifest_dir));
    let version = env::var("ASTER_BUILD_VERSION")
        .ok()
        .filter(|value| !value.trim().is_empty())
        .unwrap_or_else(|| git_describe(Path::new(&manifest_dir)).unwrap_or_else(package_version));
    println!("cargo:rustc-env=ASTER_BUILD_VERSION={version}");

    let dist_path = Path::new(&manifest_dir).join("frontend-panel/dist");

    if !dist_path.exists() {
        create_fallback_files(&dist_path)?;
    }

    Ok(())
}

fn emit_git_rerun_paths(manifest_dir: &Path) {
    let git_dir = manifest_dir.join(".git");
    println!("cargo:rerun-if-changed={}", git_dir.display());

    if git_dir.is_dir() {
        println!("cargo:rerun-if-changed={}", git_dir.join("HEAD").display());
        println!(
            "cargo:rerun-if-changed={}",
            git_dir.join("packed-refs").display()
        );
        println!(
            "cargo:rerun-if-changed={}",
            git_dir.join("refs/heads").display()
        );
        println!(
            "cargo:rerun-if-changed={}",
            git_dir.join("refs/tags").display()
        );
    }
}

fn git_describe(manifest_dir: &Path) -> Option<String> {
    let output = Command::new("git")
        .args(["describe", "--tags", "--dirty", "--always"])
        .current_dir(manifest_dir)
        .output()
        .ok()?;

    if !output.status.success() {
        return None;
    }

    let version = String::from_utf8(output.stdout).ok()?.trim().to_string();
    (!version.is_empty()).then_some(version)
}

fn package_version() -> String {
    env::var("CARGO_PKG_VERSION").unwrap_or_else(|_| "unknown".to_string())
}

fn create_fallback_files(dist_path: &Path) -> io::Result<()> {
    fs::create_dir_all(dist_path)?;

    let fallback_html = r#"<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="icon" type="image/svg+xml" href="%ASTERYGGDRASIL_FAVICON_URL%" />
    <link rel="apple-touch-icon" href="%ASTERYGGDRASIL_FAVICON_URL%" />
    <meta name="description" content="%ASTERYGGDRASIL_DESCRIPTION%" />
    <meta http-equiv="Content-Security-Policy" content="%ASTERYGGDRASIL_CSP%" />
    <meta name="asteryggdrasil-version" content="%ASTERYGGDRASIL_VERSION%" />
    <meta name="asteryggdrasil-wordmark-dark" content="%ASTERYGGDRASIL_WORDMARK_DARK_URL%" />
    <meta name="asteryggdrasil-wordmark-light" content="%ASTERYGGDRASIL_WORDMARK_LIGHT_URL%" />
    <meta name="asteryggdrasil-csrf-cookie-name" content="%ASTERYGGDRASIL_CSRF_COOKIE_NAME%" />
    <meta name="asteryggdrasil-csrf-header-name" content="%ASTERYGGDRASIL_CSRF_HEADER_NAME%" />
    <title>%ASTERYGGDRASIL_TITLE% - Frontend Not Built</title>
    <style>
        :root { color-scheme: dark; }
        body {
            margin: 0;
            min-height: 100vh;
            display: grid;
            place-items: center;
            background: #111827;
            color: #f8fafc;
            font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }
        main {
            width: min(560px, calc(100vw - 48px));
            border: 1px solid #334155;
            border-radius: 8px;
            padding: 28px;
            background: #0f172a;
        }
        h1 { margin: 0 0 10px; font-size: 28px; letter-spacing: 0; }
        p { color: #cbd5e1; line-height: 1.6; }
        code {
            background: #1e293b;
            border: 1px solid #334155;
            border-radius: 6px;
            padding: 2px 6px;
        }
    </style>
</head>
<body>
    <main>
        <h1>%ASTERYGGDRASIL_TITLE%</h1>
        <p>The embedded frontend has not been built yet.</p>
        <p>Run <code>cd frontend-panel && bun install && bun run build</code>, then restart the server.</p>
        <p>API health remains available at <code>/health</code> and <code>/health/ready</code>.</p>
    </main>
</body>
</html>"#;

    fs::write(dist_path.join("index.html"), fallback_html)?;
    fs::create_dir_all(dist_path.join("assets"))?;
    Ok(())
}
