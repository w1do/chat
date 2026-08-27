## Purpose

Определяет безопасную token-based сессию Android/iOS-клиента рядом с
существующей cookie-сессией PWA и правила хранения и отзыва credentials.

## ADDED Requirements

### Requirement: Мобильный вход использует отдельный token-based контракт

API SHALL предоставлять мобильные register/login endpoints, которые после
успешной проверки credentials возвращают пользователя, короткоживущий access
token и одноразово ротируемый refresh token. Access token SHALL жить не более
48 часов, refresh token SHALL иметь конечный срок не более 30 дней, а каждый
токен SHALL быть ограничен mobile abilities. Browser login/register endpoints
SHALL сохранять cookie-based поведение без изменения.

#### Scenario: Успешный мобильный вход

- **WHEN** пользователь передаёт корректные login и password в mobile login
- **THEN** API возвращает user envelope, access token, refresh token и точные
  сроки их действия без создания browser cookie-сессии

#### Scenario: Неверные credentials

- **WHEN** login или password неверны
- **THEN** API возвращает единый unauthenticated error без признака
  существования аккаунта и применяет auth rate limit

#### Scenario: PWA входит после появления mobile endpoints

- **WHEN** браузер вызывает прежний login endpoint
- **THEN** он получает прежнюю защищённую cookie-сессию и не получает mobile
  tokens в JSON

### Requirement: Refresh token ротируется и защищён от повторного использования

Refresh endpoint SHALL принимать только действующий refresh token, выдавать
новую пару и атомарно отзывать использованный token. Повторное предъявление
уже использованного refresh token SHALL считаться replay и SHALL отзывать
связанную mobile session.

#### Scenario: Нормальное обновление access token

- **WHEN** access token истёк, а refresh token ещё действителен
- **THEN** клиент получает новую пару, старая пара больше не авторизует запросы

#### Scenario: Два параллельных refresh запроса

- **WHEN** два запроса одновременно используют один refresh token
- **THEN** ровно один запрос успешно ротирует пару, второй получает
  unauthenticated error, а сервер не оставляет две активные цепочки

#### Scenario: Replay использованного refresh token

- **WHEN** ранее ротированный refresh token предъявляется снова
- **THEN** связанная mobile session отзывается и требует повторного входа

### Requirement: Секреты сессии хранятся только в системном secure storage

Мобильный клиент MUST хранить access/refresh tokens только в iOS Keychain или
Android Keystore-backed storage. Tokens MUST NOT попадать в localStorage,
sessionStorage, SQLite без дополнительного device-bound encryption, URL,
логи, analytics, crash reports или bundled environment.

#### Scenario: Приложение перезапущено

- **WHEN** пользователь снова открывает приложение до истечения mobile session
- **THEN** клиент читает tokens из системного secure storage, проверяет сессию
  серверным запросом и не просит пароль повторно

#### Scenario: Logout завершён

- **WHEN** сервер подтвердил logout текущей mobile session
- **THEN** клиент удаляет оба token из secure storage и очищает приватный
  in-memory/cache state

#### Scenario: Secure storage недоступен

- **WHEN** системное защищённое хранилище нельзя использовать
- **THEN** клиент не сохраняет credentials менее безопасным способом и
  блокирует постоянный вход с понятной ошибкой

### Requirement: Отзыв сессии прекращает HTTP и real-time доступ

Mobile access token SHALL авторизовать разрешённые HTTP endpoints и
private/presence channel auth через Bearer header без CSRF. Logout SHALL
отзывать текущую пару; смена/сброс пароля или security-операция SHALL отзывать
все соответствующие mobile sessions и регистрации native push согласно
политике безопасности.

#### Scenario: Авторизация private room channel

- **WHEN** участник комнаты передаёт действующий mobile access token на
  endpoint авторизации real-time канала
- **THEN** сервер применяет те же membership/policy rules, что для PWA, и
  разрешает только доступный канал

#### Scenario: Access token отозван

- **WHEN** приложение выполняет HTTP-запрос или channel auth с отозванным
  access token
- **THEN** сервер возвращает unauthenticated error, клиент прекращает
  real-time подписки и пытается один безопасный refresh либо переводит на вход

#### Scenario: Пароль сброшен после компрометации

- **WHEN** пароль пользователя успешно сброшен или администратор выполняет
  security reset
- **THEN** ранее выданные mobile access/refresh sessions больше не действуют

### Requirement: Mobile auth ошибки соблюдают публичный API-контракт

Mobile auth endpoints SHALL использовать единый JSON error envelope, OpenAPI
3.1, idempotent-safe logout и отдельные rate limits для login, register и
refresh. Ответы и логи MUST NOT содержать plaintext tokens, password или
приватные данные сверх контракта.

#### Scenario: Refresh token истёк

- **WHEN** клиент предъявляет просроченный refresh token
- **THEN** API возвращает 401 с документированным code и trace_id, а клиент
  очищает локальную сессию и показывает вход

#### Scenario: Logout повторён сетью

- **WHEN** клиент повторяет logout после неизвестного результата первого
  запроса
- **THEN** сервер возвращает безопасный успешный результат и session остаётся
  отозванной

