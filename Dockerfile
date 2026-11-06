# Версию PocketBase уточните на github.com/pocketbase/pocketbase/releases
ARG PB_VERSION=0.40.6

FROM debian:bookworm-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 nginx curl ca-certificates unzip \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# бинарь PocketBase
RUN curl -fsSL "https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_amd64.zip" -o /tmp/pb.zip \
    && unzip /tmp/pb.zip -d /usr/local/bin \
    && rm /tmp/pb.zip \
    && chmod +x /usr/local/bin/pocketbase

# код проекта
COPY . /app

# конфиг nginx (точка входа Amvera — порт 8080)
COPY nginx.conf /etc/nginx/nginx.conf

# скрипт запуска
COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

EXPOSE 8080

# постоянное хранилище Amvera монтируется сюда — данные PocketBase не пропадут при перезапуске
VOLUME ["/app/pb_data"]

ENTRYPOINT ["/app/entrypoint.sh"]
