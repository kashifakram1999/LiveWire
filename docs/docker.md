# Docker Setup (Backend + Redis + Optional Postgres)

This setup runs Django Channels backend with Redis in Docker.
PostgreSQL is optional; if DB variables are not set, Django uses SQLite automatically.

## 1) Prepare environment

```bash
cp .env.example .env
```

Edit `.env` as needed.

## 2) Run backend + redis

```bash
docker compose up --build
```
Services:
- Backend (ASGI / Daphne): `http://localhost:8000`
- Redis: `localhost:6379`

Code is bind-mounted (`./backend:/app`) so backend code changes are reflected without rebuilding.

## 3) Enable Postgres (optional)

Set all DB vars in `.env`:
- `DB_NAME`
- `DB_USER`
- `DB_PASSWORD`
- `DB_HOST`
- `DB_PORT`

When using the compose Postgres container, recommended values:

```env
DB_NAME=livewire_db
DB_USER=postgres
DB_PASSWORD=postgres
DB_HOST=postgres
DB_PORT=5432
```

Then start with the postgres profile:

```bash
docker compose --profile postgres up --build
```

Entrypoint waits for Postgres (when DB vars are present), runs migrations, then starts Daphne.

## 4) SQLite fallback behavior

If DB vars are missing/empty, settings fall back to:
- SQLite database at `backend/db.sqlite3`

This works in Docker and local non-Docker runs.

## 5) Redis channel layer behavior

- If `REDIS_URL` is set, Channels uses Redis.
- If `REDIS_URL` is not set, Channels uses in-memory layer.

In Docker compose, `REDIS_URL` defaults to `redis://redis:6379/0`, so Redis is used by default.

## 6) Troubleshooting

- Port already in use:
  - Change host-side mappings in `docker-compose.yml`.
- Migrations failing:
  - Check DB env values in `.env`.
  - If using Postgres profile, ensure `DB_HOST=postgres`.
- Redis connection errors:
  - Confirm `redis` service is healthy: `docker compose ps`.
  - Check `REDIS_URL` format.
- Backend not reflecting changes:
  - Confirm bind mount exists (`./backend:/app`) and container restarted after dependency changes.
