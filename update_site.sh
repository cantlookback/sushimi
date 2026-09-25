#!/bin/sh
set -eu

docker compose -f docker-compose.prod.yml pull app
docker compose -f docker-compose.prod.yml up -d
