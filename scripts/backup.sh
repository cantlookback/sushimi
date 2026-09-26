#!/bin/sh
set -eu

timestamp="$(date -u +%Y%m%d-%H%M%S)"
backup_dir="${1:-./backups/production-$timestamp}"
compose="docker compose -f docker-compose.prod.yml"
media_dir="$(mktemp -d)"
app_was_running="$($compose ps --status running -q app)"

cleanup() {
  rm -rf "$media_dir"
  if [ -n "$app_was_running" ]; then
    $compose up -d app
  fi
}
trap cleanup EXIT
trap 'exit 130' INT TERM

if [ -e "$backup_dir" ]; then
  echo "Backup destination already exists: $backup_dir" >&2
  exit 1
fi

mkdir -p "$backup_dir"
$compose up -d postgres object-storage
if [ -n "$app_was_running" ]; then
  $compose stop app
fi

$compose exec -T postgres sh -c 'pg_dump -Fc --no-owner --no-privileges -U "$POSTGRES_USER" "$POSTGRES_DB" -f /tmp/sushimi-backup.dump'
$compose cp postgres:/tmp/sushimi-backup.dump "$backup_dir/database.dump"
$compose exec -T postgres rm -f /tmp/sushimi-backup.dump

$compose run --rm --no-deps -T --user 0:0 -v "$media_dir:/transfer" --entrypoint node app scripts/transfer-media.mjs export /transfer
tar -czf "$backup_dir/media.tar.gz" -C "$media_dir" .

echo "Backup created: $backup_dir"
echo "Files: database.dump, media.tar.gz"
