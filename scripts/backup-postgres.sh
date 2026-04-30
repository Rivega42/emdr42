#!/usr/bin/env bash
# EMDR-AI PostgreSQL backup script (#137).
# Запускать через cron daily или как K8s CronJob.
#
# Env:
#   POSTGRES_HOST      — по умолчанию "postgres"
#   POSTGRES_PORT      — 5432
#   POSTGRES_USER      — "emdr42"
#   POSTGRES_DB        — "emdr42"
#   POSTGRES_PASSWORD  — обязательно
#   BACKUP_DIR         — local staging, по умолчанию /var/backups/emdr42
#   S3_BUCKET          — (опц) s3://bucket-name/prefix/
#   GPG_RECIPIENT      — (опц) email or keyid для шифрования
#   RETENTION_DAYS     — по умолчанию 30 (локально)

set -euo pipefail

: "${POSTGRES_HOST:=postgres}"
: "${POSTGRES_PORT:=5432}"
: "${POSTGRES_USER:=emdr42}"
: "${POSTGRES_DB:=emdr42}"
: "${POSTGRES_PASSWORD:?POSTGRES_PASSWORD required}"
: "${BACKUP_DIR:=/var/backups/emdr42}"
: "${RETENTION_DAYS:=30}"

TS=$(date -u +%Y-%m-%dT%H-%M-%S)
BACKUP_FILE="$BACKUP_DIR/emdr42-$TS.sql.gz"

mkdir -p "$BACKUP_DIR"

echo "[backup] Starting pg_dump at $TS"

PGPASSWORD="$POSTGRES_PASSWORD" pg_dump \
  --host="$POSTGRES_HOST" \
  --port="$POSTGRES_PORT" \
  --username="$POSTGRES_USER" \
  --dbname="$POSTGRES_DB" \
  --format=custom \
  --no-owner \
  --no-privileges \
  --compress=9 \
  | gzip --fast > "$BACKUP_FILE"

FILESIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo "[backup] Done. Size: $FILESIZE, path: $BACKUP_FILE"

# Optional GPG encryption
if [[ -n "${GPG_RECIPIENT:-}" ]]; then
  echo "[backup] Encrypting with GPG recipient=$GPG_RECIPIENT"
  gpg --batch --yes --recipient "$GPG_RECIPIENT" --encrypt "$BACKUP_FILE"
  rm "$BACKUP_FILE"
  BACKUP_FILE="${BACKUP_FILE}.gpg"
fi

# Optional S3 upload
if [[ -n "${S3_BUCKET:-}" ]]; then
  echo "[backup] Uploading to $S3_BUCKET"
  # Требует aws cli с configured credentials (IAM role / ACCESS_KEY)
  aws s3 cp "$BACKUP_FILE" "$S3_BUCKET/" \
    --storage-class STANDARD_IA \
    --metadata "backup-ts=$TS,backup-db=$POSTGRES_DB"
fi

# Cleanup старых локальных бэкапов
find "$BACKUP_DIR" -type f \
  \( -name 'emdr42-*.sql.gz' -o -name 'emdr42-*.sql.gz.gpg' \) \
  -mtime +"$RETENTION_DAYS" -delete

echo "[backup] Completed successfully"
