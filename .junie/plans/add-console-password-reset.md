---
sessionId: session-260826-154349-17tk
---

# Предложение

### Why (зачем)

В self-hosted установке нет способа сбросить пароль пользователя с сервера. Если человек забыл пароль, а email-восстановление недоступно (SMTP не настроен, у гостевого аккаунта нет почты), администратор оказывается заблокирован. Кроме того, у оператора установки нет единого консольного «входа» для служебных действий над установкой — назначение первого админа живёт в `chat:grant-admin`, но следующие операции добавлять некуда.

Нужна отдельная консольная точка `admin:*` — набор служебных команд, которыми оператор управляет установкой без админ-панели. Первая команда — сброс пароля пользователю; дальше сюда же добавляются другие операции.

### What Changes (что меняется)

- **Новый консольный namespace `admin:`** — дом для служебных операций оператора установки; команды автоматически обнаруживаются Laravel в `apps/chat-api/app/Console/Commands`.
- **Новая команда `admin:reset-password {username} {password}`** — задаёт пользователю новый пароль (хэшируется, помечается как заданный, сбрасываются remember-сессии); после неё человек сразу входит с новым паролем.
- **Пароль проверяется на минимальную длину** из конфигурации `identity.password.min_length`; слишком короткий пароль отклоняется с понятным сообщением, команда завершается с ненулевым кодом.
- **Неизвестный логин** → команда сообщает об этом и завершается ненулевым кодом, ничего не меняя.
- **Существующая команда `chat:grant-admin` не трогается** и продолжает работать как раньше.
- **Документация** обновляется: пример вида `docker compose exec api php artisan admin:reset-password {username} {password}`.

> Замечание об именовании: пользователь просил форму `admin {username} {password}`. По согласованию выбран вариант «action-подкоманды» с namespace `admin:` (как существующие `chat:` / `storage:`), поэтому первая команда — `admin:reset-password {username} {password}`. Это делает набор `admin:*` расширяемым под будущие операции без переделки сигнатуры.

### Capabilities

**Modified Capabilities**

- `identity/authentication-and-profile` — к способам задать пароль (регистрация, смена в настройках, восстановление по email) добавляется административный сброс пароля из консоли сервера.

### Impact (затрагиваемое)

- `apps/chat-api/app/Console/Commands/AdminResetPasswordCommand.php` — **новый файл** с командой `admin:reset-password`.
- `apps/chat-api/tests/Feature/AdminResetPasswordCommandTest.php` — **новый** feature-тест команды (успешный сброс, короткий пароль, несуществующий логин).
- `README.md`, `docs/features/administration.md`, `docs/security/hardening.md`, `CHANGELOG.md`, `SUMMARY.md` — пример и описание сброса пароля из консоли; упоминание расширяемого namespace `admin:*`.
- OpenAPI/HTTP API **не затрагиваются**: это чисто серверная консольная операция, сбросить чужой пароль через API по-прежнему нельзя (сохраняется инвариант threat-model).
- `chat:grant-admin` и его тесты **не изменяются**.

# Спецификация

Дельта к capability `identity/authentication-and-profile` (формат OpenSpec `spec.md`, стиль репозитория — SHALL + сценарии).

```markdown
## ADDED Requirements

### Requirement: Пароль можно сбросить из консоли сервера

Оператор установки SHALL иметь возможность задать пользователю новый пароль
командой `php artisan admin:reset-password {username} {password}`. Пароль SHALL
передаваться только как аргумент консольной команды на сервере; через HTTP API
сбросить чужой пароль по-прежнему НЕ SHALL быть возможно.

Команда SHALL задавать пользователю переданный пароль (с хэшированием),
помечать пароль как заданный человеком (`password_set_at`) и инвалидировать
прежние remember-сессии. Пароль SHALL проверяться на минимальную длину из
конфигурации `identity.password.min_length`.

Команды служебного namespace `admin:*` SHALL быть доступны только из консоли
сервера и НЕ SHALL расширять публичный HTTP API.

#### Scenario: Сброс пароля существующему пользователю

- **WHEN** оператор выполняет `admin:reset-password ivan НовыйПароль`
- **THEN** пользователю `ivan` задаётся новый пароль, и он может войти с ним
- **AND** прежние remember-сессии перестают действовать

#### Scenario: Слишком короткий пароль

- **WHEN** переданный пароль короче минимальной длины из конфигурации
- **THEN** команда отклоняет ввод с понятным сообщением и завершается ошибкой,
  пароль не меняется

#### Scenario: Неизвестный логин

- **WHEN** пользователя с таким логином не существует
- **THEN** команда сообщает об этом и завершается ненулевым кодом, ничего не меняя
```

# Технический дизайн

### Current Implementation (как сейчас)

В `apps/chat-api/app/Console/Commands` уже живут команды с namespace-префиксами: `storage:ensure-bucket`, `storage:smoke`, `chat:grant-admin`. Все обнаруживаются Laravel автоматически — регистрировать ничего не нужно.

`GrantAdminCommand` ищет пользователя по `username` и выдаёт роль:

```php
protected $signature = 'chat:grant-admin {login : Логин пользователя}';

public function handle(): int
{
    $user = User::query()->where('username', $this->argument('login'))->first();
    if ($user === null) { $this->error(...); return self::FAILURE; }
    // ... выдача роли super-admin
    return self::SUCCESS;
}
```

Модель `Vendor\Identity\Domain\Models\User` (наследуется `App\Models\User`) кастует `password` как `hashed`, а `password_set_at` как `datetime`. Установка пароля в проекте уже выполняется единообразно в `ChangePasswordHandler` и `ResetPasswordHandler`:

```php
$user->forceFill([
    'password' => $newPassword,          // хэшируется каст 'hashed'
    'password_set_at' => now(),
    'remember_token' => Str::random(60), // разлогинивает украденные «запомнить меня»
])->save();
```

Минимальная длина пароля — `config('identity.password.min_length')` (по умолчанию `1`, env `PASSWORD_MIN_LENGTH`). HTTP-форма `ResetPasswordRequest` валидирует его правилом `Password::min((int) config('identity.password.min_length', 10))`.

### Key Decisions (ключевые решения)

- **Отдельный namespace `admin:` с одной командой на действие** (согласовано с пользователем). Первая команда — `admin:reset-password {username} {password}`; будущие операции добавляются как соседние команды `admin:*` без переделки сигнатуры. Соответствует конвенции проекта (`chat:` / `storage:`) и правилу выбора сложности CLAUDE.md §20 (стандартные средства Laravel, легко объяснить и тестировать).
- **Новая команда, а не расширение `chat:grant-admin`.** Сброс пароля и назначение админа — независимые операторские действия; смешивать их в одной команде хуже для расширяемости.
- **Установка пароля повторяет паттерн `ChangePasswordHandler`/`ResetPasswordHandler`** (`forceFill` + `password_set_at` + новый `remember_token`), а не пишет свой хэш — единый способ во всём проекте.
- **Валидация длины через правило `Password::min((int) config('identity.password.min_length'))`** — та же граница, что в HTTP-формах, но без FormRequest (в консоли его нет), через `Validator::make`.
- **API не расширяется** — инвариант threat-model «сбросить чужой пароль через API нельзя» сохраняется.

### Proposed Changes (предлагаемые изменения)

Новый класс `App\Console\Commands\AdminResetPasswordCommand`:

1. `protected $signature = 'admin:reset-password {username : Логин пользователя} {password : Новый пароль}';` и понятный `$description`.
2. В `handle()`:
   - найти пользователя `User::query()->where('username', $this->argument('username'))->first()`; если `null` — `$this->error(...)` и `return self::FAILURE`;
   - провалидировать пароль: `Validator::make(['password' => $password], ['password' => ['required', 'string', Password::min((int) config('identity.password.min_length'))]])`; при провале вывести первое сообщение и `return self::FAILURE`;
   - `$user->forceFill(['password' => $password, 'password_set_at' => now(), 'remember_token' => Str::random(60)])->save();`
   - `$this->info("Пароль пользователя {$user->username} обновлён.")` и `return self::SUCCESS`.
3. Не логировать значение пароля.

### Data Models / Contracts

Без изменений схемы БД и без новых DTO. Используются существующие столбцы `users.password`, `users.password_set_at`, `users.remember_token`.

### File Structure

- Добавляется: `apps/chat-api/app/Console/Commands/AdminResetPasswordCommand.php`
- Добавляется: `apps/chat-api/tests/Feature/AdminResetPasswordCommandTest.php`
- Обновляются: `README.md`, `docs/features/administration.md`, `docs/security/hardening.md`, `CHANGELOG.md`, `SUMMARY.md`
- Не изменяются: `GrantAdminCommand.php` и его тесты

### Risks (риски)

- **Пароль в истории shell.** Пароль передаётся аргументом и попадёт в историю команд — отметить это в документации (это осознанный операторский инструмент на сервере).
- **Логи.** Не логировать значение пароля (соблюдение §11 CLAUDE.md — приватный текст в журналы не пишем).

# Тестирование

### Validation Approach

Feature-тест консольной команды в `apps/chat-api/tests/Feature` (Pest), поднимающий пользователя через `User::factory()` и вызывающий `artisan('admin:reset-password', [...])`. Проверка выполняется через `Hash::check()` по обновлённому пользователю. Реальный AI/внешние сервисы не задействованы.

### Key Scenarios

- **Сброс пароля**: `admin:reset-password {username} {password}` → у пользователя новый рабочий хэш (`Hash::check` истинно), `password_set_at` заполнен, `remember_token` изменился, команда вернула `SUCCESS`.

### Edge Cases

- **Несуществующий логин** → сообщение об ошибке, `FAILURE`, ничего не изменено.
- **Слишком короткий пароль** (при поднятой `PASSWORD_MIN_LENGTH`) → отклонён, `FAILURE`, пароль не изменён.

### Test Changes

- Добавить `AdminResetPasswordCommandTest` с перечисленными сценариями.
- Прогнать `./tools/chat check docs` после обновления документации.

# Delivery Steps

### ✓ Step 1: Создать команду admin:reset-password
Команда `admin:reset-password {username} {password}` задаёт пользователю новый пароль из консоли, закладывая расширяемый namespace `admin:*`.

- Добавить `apps/chat-api/app/Console/Commands/AdminResetPasswordCommand.php` с `$signature = 'admin:reset-password {username : Логин пользователя} {password : Новый пароль}'` и понятным `$description`.
- В `handle()` найти пользователя по `username`; при отсутствии — вывести ошибку и вернуть `self::FAILURE`, ничего не меняя.
- Провалидировать пароль правилом `Password::min((int) config('identity.password.min_length'))` через `Validator::make`; при провале вывести сообщение и вернуть `self::FAILURE`.
- При валидном пароле выполнить `forceFill(['password' => $password, 'password_set_at' => now(), 'remember_token' => Str::random(60)])->save()` — единый паттерн из `ChangePasswordHandler`/`ResetPasswordHandler` — и вывести подтверждение.
- Не логировать значение пароля; существующую команду `chat:grant-admin` не трогать.

### ✓ Step 2: Покрыть команду feature-тестами
Feature-тест подтверждает успешный сброс пароля и обработку ошибок.

- Добавить `apps/chat-api/tests/Feature/AdminResetPasswordCommandTest.php` (Pest).
- Сценарий сброса: вызов с паролем → `Hash::check` для нового пароля истинно, `password_set_at` заполнен, `remember_token` изменился, код `SUCCESS`.
- Негативные сценарии: несуществующий логин → `FAILURE` без изменений; слишком короткий пароль при поднятой `PASSWORD_MIN_LENGTH` → `FAILURE`, пароль не изменён.
- Прогнать тест согласно конвенциям проекта (`./tools/chat` / Pest).

### ✓ Step 3: Обновить документацию и changelog
Документация описывает сброс пароля из консоли с примером `docker compose exec` и упоминает расширяемый namespace `admin:*`.

- В `README.md` и `docs/features/administration.md` добавить пример `docker compose exec api php artisan admin:reset-password {username} {password}` и пояснить назначение namespace `admin:*` как служебных консольных операций оператора.
- В `docs/security/hardening.md` добавить примечание: пароль передаётся аргументом и попадает в историю shell; операция доступна только на сервере, через API недоступна.
- Обновить `CHANGELOG.md` (Keep a Changelog) и `SUMMARY.md`, отразив новую команду.
- Проверить `./tools/chat check docs`.