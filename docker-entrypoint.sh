#!/bin/sh
# Entrypoint untuk container production:
# 1) Pastikan SESSION_PASSWORD valid (validasi runtime jg ada di session.ts)
# 2) Jalankan migrasi DB idempoten (init-db). Aman dieksekusi tiap start.
# 3) Bila SEED_ON_START=1 dan DB kosong, jalankan seed.
# 4) Start server.

set -e

if [ -z "$SESSION_PASSWORD" ] || [ "${#SESSION_PASSWORD}" -lt 32 ]; then
  echo "[entrypoint] FATAL: SESSION_PASSWORD wajib diisi (≥32 karakter)."
  echo "             Generate: openssl rand -base64 48"
  exit 1
fi

# Migrasi DB (CREATE IF NOT EXISTS + ALTER ADD COLUMN idempoten)
echo "[entrypoint] Menjalankan migrasi database..."
node node_modules/tsx/dist/cli.mjs scripts/init-db.ts || {
  echo "[entrypoint] Migrasi gagal."
  exit 1
}

# Seed pertama kali — hanya jika dosen belum ada
if [ "$SEED_ON_START" = "1" ]; then
  echo "[entrypoint] SEED_ON_START=1 — menjalankan seed (idempoten)..."
  node node_modules/tsx/dist/cli.mjs scripts/seed.ts || {
    echo "[entrypoint] Seed gagal (mungkin sudah pernah seed). Lanjut..."
  }
fi

echo "[entrypoint] Memulai server di port ${PORT:-3000}..."
exec "$@"
