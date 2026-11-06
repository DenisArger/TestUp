#!/usr/bin/env bash
set -e
cd /app

mkdir -p pb_data

# PocketBase REST API (внутри контейнера)
./pocketbase serve --http=0.0.0.0:8090 &

# статические прокси + прокси /api (как в локальном start.sh)
python3 admin_panel/proxy.py &
python3 quiz_client/proxy.py &

# точка входа Amvera — порт 8080
exec nginx -g 'daemon off;'
