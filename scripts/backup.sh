#!/bin/sh
set -eu

backup_dir="${1:-./backups}"
timestamp="$(date -u +%Y%m%d-%H%M%S)"
mkdir -p "$backup_dir"

docker compose -f docker-compose.prod.yml exec -T postgres sh -c 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' | gzip > "$backup_dir/database-$timestamp.sql.gz"
docker compose -f docker-compose.prod.yml exec -T object-storage tar -czf - -C /data . > "$backup_dir/media-$timestamp.tar.gz"

echo "Backup created in $backup_dir ($timestamp UTC)."
