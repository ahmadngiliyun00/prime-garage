#!/usr/bin/env bash
# Update production from GitHub main and restart (docs/DEPLOYMENT.md section 3).
# Run from anywhere on the server:
#   bash /www/wwwroot/primegarage.ngiliyun.my.id/scripts/deploy.sh
# Options:
#   --skip-web   keep the current web build (for example when the web was built elsewhere)
#   --no-pull    deploy the code that is already checked out
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SKIP_WEB=0
PULL=1
for arg in "$@"; do
  case "$arg" in
    --skip-web) SKIP_WEB=1 ;;
    --no-pull) PULL=0 ;;
    *) echo "Opsi tidak dikenal: $arg" >&2; exit 2 ;;
  esac
done

step() { printf '\n==> %s\n' "$*"; }
fail() { printf '\nGAGAL: %s\n' "$*" >&2; exit 1; }
env_value() { grep -E "^$2=" "$1" | tail -n1 | cut -d= -f2- | tr -d '"' | tr -d "'" ; }

cd "$ROOT"

step "Memeriksa prasyarat"
command -v node >/dev/null || fail "Node.js tidak ditemukan"
command -v pm2 >/dev/null || fail "PM2 tidak ditemukan (npm install -g pm2)"
NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
[ "$NODE_MAJOR" -ge 22 ] || fail "Butuh Node.js 22 atau lebih baru, terpasang $(node -v)"
NPM_MAJOR="$(npm -v | cut -d. -f1)"
[ "$NPM_MAJOR" -ge 11 ] || fail "Butuh npm 11 atau lebih baru (npm install -g npm@11), terpasang $(npm -v)"

API_ENV="$ROOT/apps/api/.env"
WEB_ENV="$ROOT/apps/mobile/.env"
[ -f "$API_ENV" ] || fail "apps/api/.env belum ada (salin dari apps/api/.env.example, lihat DEPLOYMENT.md bagian 1.1)"
[ "$(env_value "$API_ENV" NODE_ENV)" = "production" ] || fail "apps/api/.env harus berisi NODE_ENV=production"
[ "$(env_value "$API_ENV" AUTH_DEV_LOGIN_ENABLED)" != "true" ] || fail "AUTH_DEV_LOGIN_ENABLED harus false di production"
[ "$(env_value "$API_ENV" HOST)" = "127.0.0.1" ] || echo "Peringatan: HOST bukan 127.0.0.1; API bisa diakses langsung tanpa Nginx."
if [ "$SKIP_WEB" -eq 0 ]; then
  [ -f "$WEB_ENV" ] || fail "apps/mobile/.env belum ada (lihat DEPLOYMENT.md bagian 1.2)"
  [ "$(env_value "$WEB_ENV" EXPO_PUBLIC_DEV_LOGIN)" != "true" ] || fail "EXPO_PUBLIC_DEV_LOGIN harus false untuk build production"
fi

STORAGE_DIR="$(env_value "$API_ENV" STORAGE_DIR)"
if [ -n "$STORAGE_DIR" ]; then
  case "$STORAGE_DIR" in /*) ;; *) STORAGE_DIR="$ROOT/apps/api/$STORAGE_DIR" ;; esac
  mkdir -p "$STORAGE_DIR"
fi

if [ "$PULL" -eq 1 ]; then
  step "Mengambil kode terbaru (git pull)"
  git pull --ff-only origin main
fi

step "Memasang dependency (npm ci)"
npm ci --no-audit --no-fund

step "Build API (Prisma Client dan NestJS)"
npm run build:api

step "Migrasi database dan katalog"
(cd apps/api && npx prisma migrate deploy)
# Idempotent: adds new brands, models and parts, never touches user data.
(cd apps/api && npm run db:seed)

if [ "$SKIP_WEB" -eq 0 ]; then
  step "Build web (SPA)"
  # Build into a temporary folder and swap, so Nginx never serves a half-written dist/.
  rm -rf apps/mobile/dist-next
  (cd apps/mobile && npx expo export -p web --output-dir dist-next)
  rm -rf apps/mobile/dist-prev
  [ -d apps/mobile/dist ] && mv apps/mobile/dist apps/mobile/dist-prev
  mv apps/mobile/dist-next apps/mobile/dist
  rm -rf apps/mobile/dist-prev
fi

step "Menjalankan ulang API dan worker (PM2)"
(cd apps/api && pm2 startOrReload ecosystem.config.cjs --update-env)
pm2 save >/dev/null

step "Cek kesehatan API"
PORT="$(env_value "$API_ENV" PORT)"
for _ in $(seq 1 20); do
  if curl -fsS "http://127.0.0.1:${PORT:-3000}/api/health" >/dev/null 2>&1; then
    curl -fsS "http://127.0.0.1:${PORT:-3000}/api/health"; echo
    printf '\nSelesai. Web: apps/mobile/dist, API: pm2 status\n'
    exit 0
  fi
  sleep 1
done
pm2 logs prime-garage-api --lines 30 --nostream || true
fail "API tidak menjawab /api/health. Lihat log di atas (pm2 logs prime-garage-api)."
