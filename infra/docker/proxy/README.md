# infra/docker/proxy

Примеры конфигурации reverse proxy (`Caddyfile.example`, `nginx.proxy.conf.example`)
создаются на этапе 2 (задача 2.3). Proxy выполняет TLS и WebSocket termination;
внутренний порт Reverb наружу не публикуется.
