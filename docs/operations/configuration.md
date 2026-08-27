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
- **Push-уведомления**: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`
  (генерируются командой `php artisan chat:push-keys`; пусто — push выключены);
- **AI**: `AI_ENABLED`, `AI_PROVIDER`, `AI_API_KEY` (этап 10);
- **Вложения**: `ATTACHMENT_MAX_FILES`, `ATTACHMENT_MAX_KB`,
  `ATTACHMENT_PER_MINUTE`, `ATTACHMENT_UNSENT_TTL_HOURS`;
  `ATTACHMENT_PREVIEW_SYNC_MAX_KB` (по умолчанию 4096) — до какого размера
  файла миниатюра готовится прямо в запросе загрузки; файл крупнее уходит в
  очередь `media`, а приложение добирает миниатюру повторным запросом
  сообщения. Больший порог убирает ожидание у тяжёлых снимков ценой более
  долгой загрузки, меньший — наоборот;
- **Кеш изображений на устройстве**: пределы заданы в
  `apps/chat-web/public/sw.js` — `IMAGE_CACHE_MAX_ENTRIES` (400 записей) и
  `IMAGE_CACHE_MAX_ENTRY_KB` (2048 КБ на запись). Это часть собираемого
  образа web, а не environment: кеш живёт у человека в браузере, установка им
  не управляет;
- **Сессия**: `AUTH_SILENT_RECOVERY` — одна тихая попытка восстановить
  истёкшую сессию вместо экрана «Сессия истекла»; по умолчанию `false`;
- **Хранилище**: `S3_*` (опционально, профиль `s3`).

Runtime-конфигурация SPA рендерится entrypoint'ом web-контейнера в
`/config.json` — образ web не пересобирается при смене параметров.
