#!/usr/bin/env sh

set -eu

if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
  exec docker compose -f docker-compose.testdb.yml "$@"
fi

if command -v docker-compose >/dev/null 2>&1; then
  exec docker-compose -f docker-compose.testdb.yml "$@"
fi

echo "Neither 'docker compose' nor 'docker-compose' is available." >&2
echo "Install Docker Desktop or docker-compose, then rerun the test DB command." >&2
exit 1