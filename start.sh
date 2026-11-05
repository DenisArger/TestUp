#!/usr/bin/env bash
cd "$(dirname "$0")"
./pocketbase serve --http=0.0.0.0:8090 &
PB_PID=$!

# Статический сервер с API-прокси для админ-панели (порт 8082; 8080 занят Adminer)
if command -v python3 >/dev/null 2>&1; then
    python3 admin_panel/proxy.py &
    HTTP_PID=$!
else
    echo "python3 не найден. Запустите админ-панель вручную: python3 admin_panel/proxy.py"
fi

echo "PocketBase: http://localhost:8090"
echo "Админ-панель: http://localhost:8082"

wait $PB_PID
