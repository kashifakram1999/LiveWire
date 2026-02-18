#!/usr/bin/env sh
set -eu

cd /app

if [ "${DB_WAIT_ENABLED:-true}" = "true" ] \
  && [ -n "${DB_NAME:-}" ] \
  && [ -n "${DB_USER:-}" ] \
  && [ -n "${DB_PASSWORD:-}" ] \
  && [ -n "${DB_HOST:-}" ] \
  && [ -n "${DB_PORT:-}" ]; then
  echo "Waiting for PostgreSQL at ${DB_HOST}:${DB_PORT}..."
  python - <<'PY'
import os
import socket
import time
import sys

host = os.environ.get("DB_HOST", "")
port = int(os.environ.get("DB_PORT", "5432"))
timeout_seconds = int(os.environ.get("DB_WAIT_TIMEOUT", "60"))
start = time.time()

while True:
    try:
        with socket.create_connection((host, port), timeout=2):
            print("PostgreSQL is available.")
            break
    except OSError:
        if time.time() - start >= timeout_seconds:
            print(f"Timed out waiting for PostgreSQL ({host}:{port}).", file=sys.stderr)
            sys.exit(1)
        time.sleep(1)
PY
fi

echo "Applying migrations..."
python manage.py migrate --noinput

echo "Starting ASGI server on 0.0.0.0:8000..."
exec daphne -b 0.0.0.0 -p 8000 core.asgi:application
