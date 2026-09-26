#!/bin/sh
set -eu

if [ "${1:-}" != "--confirm-replace" ] || [ -z "${2:-}" ]; then
  echo "Usage: sh scripts/import-production-data.sh --confirm-replace PATH_TO_TRANSFER_DIRECTORY" >&2
  echo "This replaces the production PostgreSQL database with the supplied local dump." >&2
  exit 1
fi

transfer_dir=$2
database_dump="$transfer_dir/database.dump"
media_archive="$transfer_dir/media.tar.gz"
compose="docker compose -f docker-compose.prod.yml"

if [ ! -f "$database_dump" ] || [ ! -s "$database_dump" ]; then
  echo "Missing or empty database dump: $database_dump" >&2
  exit 1
fi

if [ ! -f "$media_archive" ] || [ ! -s "$media_archive" ]; then
  echo "Missing or empty media archive: $media_archive" >&2
  exit 1
fi

echo "Creating a backup of the current production data..."
$compose up -d postgres
$compose stop app object-storage
sh scripts/backup.sh

$compose cp "$database_dump" postgres:/tmp/sushimi-import.dump
$compose exec -T postgres sh -c 'dropdb --if-exists -U "$POSTGRES_USER" "$POSTGRES_DB" && createdb -U "$POSTGRES_USER" "$POSTGRES_DB" && pg_restore --no-owner --no-privileges -U "$POSTGRES_USER" -d "$POSTGRES_DB" /tmp/sushimi-import.dump'
$compose exec -T postgres rm -f /tmp/sushimi-import.dump

$compose run --rm --no-deps -T --entrypoint sh object-storage -c 'find /data -mindepth 1 -maxdepth 1 -exec rm -rf -- {} +'
$compose run --rm --no-deps -T -v "$media_archive:/tmp/sushimi-media.tar.gz:ro" --entrypoint tar object-storage -xzf /tmp/sushimi-media.tar.gz -C /data

$compose up -d
echo "Local database and media were imported into production."
