#!/bin/sh
set -eu

if [ -n "${POSTGRES_PASSWORD_FILE:-}" ] && [ -f "$POSTGRES_PASSWORD_FILE" ]; then
    POSTGRES_PASSWORD="$(tr -d '\r\n' < "$POSTGRES_PASSWORD_FILE")"
    export POSTGRES_PASSWORD
fi

exec java -jar /app/app.jar "$@"
