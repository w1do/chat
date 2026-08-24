# ADR-005: Sanctum cookie-based SPA аутентификация

- Статус: accepted
- Дата: 2026-08-24

## Контекст

SPA (`chat-web`) и API (`chat-api`) поставляются вместе в одном self-hosted
стеке за общим reverse proxy (ADR-007). Нужна аутентификация браузерного
клиента без хранения токенов в JS и с защитой от XSS-кражи учётных данных.

## Решение

Laravel Sanctum в режиме SPA cookie:

- сессионная cookie `httpOnly`+`secure`+`SameSite`, XSRF-cookie для CSRF;
- handshake: `GET /sanctum/csrf-cookie` → мутации с заголовком `X-XSRF-TOKEN`;
- stateful-домены — явный список `SANCTUM_STATEFUL_DOMAINS`;
- CORS — явный allowlist `CORS_ALLOWED_ORIGINS` c `supports_credentials`;
- guard `web`, маршруты пакета identity под `auth:sanctum`;
- 401 → `unauthenticated`, 419 → повтор handshake на клиенте
  (`@vendor/api-client` обрабатывает оба).

## Альтернативы

- **Bearer personal access tokens** — отвергнуто для браузера: токен в
  localStorage уязвим к XSS; остаётся возможным для будущих
  интеграций/мобильных клиентов (таблица `personal_access_tokens` уже есть).
- **JWT** — отвергнуто: инвалидация и ротация сложнее, выгоды для
  single-origin self-hosted нет.
- **OAuth2 (Passport)** — избыточен без третьесторонних клиентов.

## Последствия

- SPA и API должны быть same-site (поддерживается стеком ADR-007); мульти-домен
  потребует пересмотра.
- Все мутации из SPA несут CSRF-заголовок; тесты покрывают 419-путь.
- Логин/регистрация регенерируют session id (fixation), logout инвалидирует.

## Критерии пересмотра

- Появление мобильного клиента или внешнего API-потребителя → включение
  token-based flows рядом с cookie.
- Требование SSO/OIDC у клиентов self-hosted.
