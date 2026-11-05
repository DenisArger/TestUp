#!/usr/bin/env bash
cd "$(dirname "$0")"
./pocketbase serve --http=0.0.0.0:8090 &
PB_PID=$!

if command -v python3 >/dev/null 2>&1; then
    python3 admin_panel/proxy.py &
    python3 quiz_client/proxy.py &
else
    echo "python3 не найден."
fi

echo "PocketBase: http://localhost:8090"
echo "Админ-панель: http://localhost:8082"
echo "Клиент тестов: http://localhost:8083"

wait $PB_PID
