# infra/docker/web

Образ web (`Dockerfile`, `nginx.conf`, `entrypoint.sh`) создаётся на этапе 2 (задача 2.3).
Entrypoint рендерит `config.json` из `apps/chat-web/public/config.template.json`.
