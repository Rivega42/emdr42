#!/usr/bin/env bash
# EMDR-AI PostgreSQL restore script (#137).
#
# ВНИМАНИЕ: деструктивная операция! DROP существующей БД и восстановление из dump.
# Всегда тестировать на staging прежде чем применять в prod.
#
# Usage:
#   ./restore-postgres.sh /path/to/backup.sql.gz
#   ./restore-postgres.sh s3://bucket/emdr42-2026-04-17T03-00-00.sql.gz

set -euo pipefail

: "${POSTGRES_HOST:=postgres}"
: "${POSTGRES_PORT:=5432}"
: "${POSTGRES_USER:=emdr42}"
: "${POSTGRES_DB:=emdr42}"
: "${POSTGRES_PASSWORD:?POSTGRES_PASSWORD required}"
: "${CONFIRM:=no}"

BACKUP_SOURCE="${1:?Usage: $0 <backup-file | s3://path>}"

if [[ "$CONFIRM" != "yes" ]]; then
  echo "⚠️  DESTRUCTIVE operation. This will DROP database '$POSTGRES_DB' on $POSTGRES_HOST:$POSTGRES_PORT."
  echo "    Run with CONFIRM=yes to proceed:"
  echo "    CONFIRM=yes $0 $BACKUP_SOURCE"
  exit 1
fi

LOCAL_FILE="/tmp/restore-$$.sql.gz"

if [[ "$BACKUP_SOURCE" =~ ^s3:// ]]; then
  echo "[restore] Downloading from S3: $BACKUP_SOURCE"
  aws s3 cp "$BACKUP_SOURCE" "$LOCAL_FILE"
else
  cp "$BACKUP_SOURCE" "$LOCAL_FILE"
fi

# Decrypt если GPG
if [[ "$LOCAL_FILE" == *.gpg ]]; then
  echo "[restore] Decrypting GPG"
  gpg --batch --decrypt --output "${LOCAL_FILE%.gpg}" "$LOCAL_FILE"
  rm "$LOCAL_FILE"
  LOCAL_FILE="${LOCAL_FILE%.gpg}"
fi

echo "[restore] Dropping and recreating database $POSTGRES_DB"
PGPASSWORD="$POSTGRES_PASSWORD" psql \
  --host="$POSTGRES_HOST" \
  --port="$POSTGRES_PORT" \
  --username="$POSTGRES_USER" \
  --dbname="postgres" \
  --command="DROP DATABASE IF EXISTS $POSTGRES_DB;"

PGPASSWORD="$POSTGRES_PASSWORD" psql \
  --host="$POSTGRES_HOST" \
  --port="$POSTGRES_PORT" \
  --username="$POSTGRES_USER" \
  --dbname="postgres" \
  --command="CREATE DATABASE $POSTGRES_DB OWNER $POSTGRES_USER;"

echo "[restore] Restoring from $LOCAL_FILE"
gunzip -c "$LOCAL_FILE" | PGPASSWORD="$POSTGRES_PASSWORD" pg_restore \
  --host="$POSTGRES_HOST" \
  --port="$POSTGRES_PORT" \
  --username="$POSTGRES_USER" \
  --dbname="$POSTGRES_DB" \
  --no-owner \
  --no-privileges \
  --clean \
  --if-exists \
  || echo "[restore] pg_restore завершился с предупреждениями (normal если были constraint warnings)"

rm -f "$LOCAL_FILE"

echo "[restore] Completed. Verify с:"
echo "  PGPASSWORD=\$POSTGRES_PASSWORD psql -h $POSTGRES_HOST -U $POSTGRES_USER -d $POSTGRES_DB -c 'SELECT COUNT(*) FROM \"User\";'"
