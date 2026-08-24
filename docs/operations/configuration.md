# Конфигурация

Статус: in progress

Все параметры задаются через environment (`infra/compose/.env.example` —
полный список с комментариями). Секреты не коммитятся; используйте secrets
manager или файл `.env` с правами 0600.

Ключевые группы:

- **Приложение**: `APP_NAME`, `APP_KEY`, `APP_URL`;
- **База/кэш**: `DB_*`, `REDIS_*`;
- **WebSocket**: `REVERB_APP_*` (серверные), `REVERB_PUBLIC_*` (адрес для SPA),
  `REVERB_ALLOWED_ORIGINS` — явный allowlist, wildcard запрещён;
- **Почта**: `MAIL_*`;
- **Поиск**: `TYPESENSE_API_KEY`;
- **AI**: `AI_ENABLED`, `AI_PROVIDER`, `AI_API_KEY` (этап 10);
- **Хранилище**: `S3_*` (опционально, профиль `s3`).

Runtime-конфигурация SPA рендерится entrypoint'ом web-контейнера в
`/config.json` — образ web не пересобирается при смене параметров.
