#!/bin/sh
set -eu

backup_dir="${1:-./backups}"
timestamp="$(date -u +%Y%m%d-%H%M%S)"
mkdir -p "$backup_dir"
compose="docker compose -f docker-compose.prod.yml"

$compose exec -T postgres sh -c 'pg_dump --no-owner --no-privileges -U "$POSTGRES_USER" "$POSTGRES_DB"' | gzip > "$backup_dir/database-$timestamp.sql.gz"
$compose run --rm --no-deps -T --entrypoint tar object-storage -czf - -C /data . > "$backup_dir/media-$timestamp.tar.gz"

echo "Backup created in $backup_dir ($timestamp UTC)."
