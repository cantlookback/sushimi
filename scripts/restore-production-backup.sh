#!/bin/sh
set -eu

if [ "${1:-}" != "--confirm-replace" ] || [ -z "${2:-}" ] || [ -z "${3:-}" ]; then
  echo "Usage: sh scripts/restore-production-backup.sh --confirm-replace DATABASE.sql.gz MEDIA.tar.gz" >&2
  echo "This replaces the production database and imports the supplied media archive." >&2
  exit 1
fi

database_backup=$2
media_backup=$3
compose="docker compose -f docker-compose.prod.yml"

if [ ! -s "$database_backup" ]; then
  echo "Missing or empty database backup: $database_backup" >&2
  exit 1
fi

if [ ! -s "$media_backup" ]; then
  echo "Missing or empty media backup: $media_backup" >&2
  exit 1
fi

$compose up -d postgres object-storage
echo "Backing up the current target server before restore..."
sh scripts/backup.sh ./backups/pre-restore

app_container=$($compose ps -q app)
if [ -n "$app_container" ]; then
  $compose stop app
fi
$compose stop object-storage
$compose cp "$database_backup" postgres:/tmp/sushimi-restore.sql.gz
$compose exec -T postgres sh -c 'dropdb --if-exists -U "$POSTGRES_USER" "$POSTGRES_DB" && createdb -U "$POSTGRES_USER" "$POSTGRES_DB" && gzip -dc /tmp/sushimi-restore.sql.gz | psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
$compose exec -T postgres rm -f /tmp/sushimi-restore.sql.gz

$compose start object-storage
$compose cp "$media_backup" object-storage:/tmp/sushimi-media.tar.gz
$compose exec -T object-storage sh -c 'tar -xzf /tmp/sushimi-media.tar.gz -C /data && rm -f /tmp/sushimi-media.tar.gz'

$compose up -d
echo "Production database and media restore completed."
