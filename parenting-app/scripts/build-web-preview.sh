#!/usr/bin/env bash
# Builds the web version for hosting under <site>/parents and copies it into the
# static site folder. Uses the Supabase project configured in .env.
set -euo pipefail
cd "$(dirname "$0")/.."
OUT="$(mktemp -d)"
EXPO_BASE_URL=/parents CI=1 npx expo export --platform web --output-dir "$OUT" >/dev/null
rm -rf ../mokesh-vercel/parents
mkdir -p ../mokesh-vercel/parents
cp -r "$OUT"/. ../mokesh-vercel/parents/
rm -f ../mokesh-vercel/parents/metadata.json
echo "copied to mokesh-vercel/parents"
