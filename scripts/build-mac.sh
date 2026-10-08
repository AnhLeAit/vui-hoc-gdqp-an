#!/usr/bin/env bash
# Build app macOS (universal: Apple Silicon + Intel) -> dist/
# Cách dùng:  ./scripts/build-mac.sh          (universal)
#             ./scripts/build-mac.sh --native  (chỉ kiến trúc máy hiện tại, build nhanh hơn)
set -euo pipefail

cd "$(dirname "$0")/.."
ROOT="$(pwd)"
VERSION="$(node -p "require('./src-tauri/tauri.conf.json').version")"

command -v node  >/dev/null || { echo "Lỗi: chưa cài Node.js";  exit 1; }
command -v cargo >/dev/null || { echo "Lỗi: chưa cài Rust (https://rustup.rs)"; exit 1; }

if [[ "${1:-}" == "--native" ]]; then
  TARGET_ARGS=()
  BUNDLE_DIR="src-tauri/target/release/bundle"
else
  rustup target add aarch64-apple-darwin x86_64-apple-darwin >/dev/null
  TARGET_ARGS=(--target universal-apple-darwin)
  BUNDLE_DIR="src-tauri/target/universal-apple-darwin/release/bundle"
fi

echo "==> Cài dependencies"
if [[ -f package-lock.json ]]; then npm ci; else npm install; fi

echo "==> Build v$VERSION"
npx tauri build "${TARGET_ARGS[@]}" --bundles app,dmg

echo "==> Gom file vào dist/"
rm -rf dist/mac && mkdir -p dist/mac
cp "$BUNDLE_DIR"/dmg/*.dmg dist/mac/
ditto -c -k --keepParent "$BUNDLE_DIR"/macos/*.app "dist/mac/Vui Hoc GDQP-AN_${VERSION}_mac.zip"

echo
echo "Xong! File nằm trong: $ROOT/dist/mac"
ls -lh dist/mac
