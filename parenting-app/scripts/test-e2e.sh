#!/usr/bin/env bash
# Builds the web bundle, serves it locally and drives the real UI in headless Chromium.
# Requires Playwright with a Chromium browser available to `require('playwright')`.
set -euo pipefail
cd "$(dirname "$0")/.."
OUT="$(mktemp -d)"
# Force on-device mode even when a local .env points at a Supabase project.
EXPO_PUBLIC_SUPABASE_URL= EXPO_PUBLIC_SUPABASE_ANON_KEY= CI=1 npx expo export --platform web --output-dir "$OUT/web" >/dev/null
node e2e/serve.js "$OUT/web" & SERVER=$!
trap 'kill $SERVER 2>/dev/null || true' EXIT
sleep 1
mkdir -p "$OUT/shots"
SHOTS_DIR="$OUT/shots" node e2e/tracking-flow.js
echo "screenshots: $OUT/shots"
