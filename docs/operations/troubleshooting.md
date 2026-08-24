# Troubleshooting

Статус: in progress

## Диагностика

```bash
docker compose -p chat ps                  # статусы и health
docker compose -p chat logs -f api         # логи компонента
curl -s https://<домен>/api/v1/readiness   # какой компонент degraded
```

## Типовые проблемы

- **`readiness` → `database: fail`** — проверьте `DB_*` в `.env` и health
  контейнера postgres.
- **`queue: fail (horizon is not running)`** — упал worker-контейнер:
  `docker compose -p chat logs worker`.
- **`websocket: fail`** — Reverb не слушает порт; проверьте `REVERB_APP_*`
  и `docker compose -p chat logs reverb`.
- **SPA не подключается к WebSocket** — проверьте `REVERB_PUBLIC_*` и
  `REVERB_ALLOWED_ORIGINS` (wildcard запрещён), а также проксирование
  `/app/*` в конфиге proxy.
- **После deploy исполняется старый код** — выполните `./tools/chat deploy reload`
  (octane:reload + horizon:terminate + reverb:restart).
