#!/bin/sh
# On first boot the mounted volume is empty — install the pre-seeded demo
# database (3 users + 18 claims) so the app is usable immediately. On every
# later boot the volume already holds live data, so we leave it untouched and
# the migrate-on-boot plugin applies any pending schema changes.
set -e

if [ ! -f "$DB_PATH" ]; then
  mkdir -p "$(dirname "$DB_PATH")"
  cp /app/seed.sqlite "$DB_PATH"
  echo "[entrypoint] installed seed database at $DB_PATH"
fi

exec "$@"
