#!/bin/sh
set -e

echo "Waiting for PostgreSQL at ${DB_HOST}:${DB_PORT}..."
until pg_isready -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" >/dev/null 2>&1; do
  sleep 1
done

if [ -n "${REDIS_URL}" ]; then
  echo "Waiting for Redis at ${REDIS_URL}..."
  until redis-cli -u "${REDIS_URL}" ping >/dev/null 2>&1; do
    sleep 1
  done
fi

rm -f "${CELERY_BEAT_PIDFILE:-/tmp/celerybeat.pid}"

exec celery -A avocent_backend beat \
  -l "${CELERY_LOG_LEVEL:-info}" \
  --pidfile "${CELERY_BEAT_PIDFILE:-/tmp/celerybeat.pid}"
