#!/usr/bin/env bash
# Layout + interaction audit: every screen and form on an iPhone-sized touch screen, with
# real taps and key presses. Fails on off-screen or covered controls, tiny tap targets,
# clipped text, and fields that do not hold what was typed.
set -euo pipefail
cd "$(dirname "$0")/.."
OUT="$(mktemp -d)"
# The audit covers the sign-in screens too, so it needs a cloud-mode build (any URL works; nothing is sent).
EXPO_PUBLIC_SUPABASE_URL="${EXPO_PUBLIC_SUPABASE_URL:-https://audit.invalid}" EXPO_PUBLIC_SUPABASE_ANON_KEY="${EXPO_PUBLIC_SUPABASE_ANON_KEY:-audit-placeholder-key-000000}" \
  CI=1 npx expo export --platform web --output-dir "$OUT/web" >/dev/null
node e2e/serve.js "$OUT/web" & SERVER=$!
trap 'kill $SERVER 2>/dev/null || true' EXIT
sleep 1
mkdir -p "$OUT/shots"
RESULT="$(SHOTS_DIR="$OUT/shots" node e2e/audit.js)"
echo "$RESULT"
echo "screenshots: $OUT/shots"
[ "$RESULT" = "NO PROBLEMS FOUND" ]
