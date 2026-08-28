# ADR-005: Sanctum cookie-based SPA аутентификация

- Статус: superseded (заменён ADR-012, 2026-08-28)
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

## Ревизия 2026-08-24: вход по логину

Идентификатором входа стал `username`, а не email: регистрация — логин и
пароль, почта необязательна и задаётся в настройках (design decision 1b).
Транспорт аутентификации не изменился (cookie-сессия Sanctum, CSRF, allowlist
origin'ов); изменились поля запросов `/auth/register` и `/auth/login`, ключ
rate limiter (логин+IP) и доступность восстановления пароля — оно работает
только при сохранённой почте.

## Замена: ADR-012 (2026-08-28)

Решение отменено. Cookie-схема не пережила реальную установку: клиент и API
отдаются по `http` (`APP_URL: http://localhost`, `SESSION_SECURE_COOKIE=false`),
cookie с префиксом `__Host-` браузер обязан отбросить без атрибута `Secure`, и
авторизация фактически оставалась сессионной — через `SESSION_LIFETIME` человека
раз за разом просили войти заново. Клиент авторизуется бессрочным bearer-токеном
Sanctum: [ADR-012](ADR-012-bearer-token-authentication.md).

## Критерии пересмотра

Пересмотру не подлежит: решение заменено. Возврат к cookie-схеме потребует
нового ADR, отменяющего ADR-012.
