## Purpose

Defines the runtime contract for starting, supervising, health checking, and operating the self-hosted chat stack through Docker Compose and supported Linux/VM process configuration.

## Requirements

### Requirement: Compose starts the full stack
The self-hosted bundle SHALL start all required local services with one documented `docker compose up -d` command after environment values are provided.

#### Scenario: One command startup
- **WHEN** an operator runs the documented Compose startup command
- **THEN** the API, web frontend, queue worker, scheduler, Reverb, Horizon, PostgreSQL, Redis, Typesense, reverse proxy, and configured storage/mail support services are created with health checks or documented readiness probes

### Requirement: Runtime exposes health and readiness
The system SHALL expose liveness and dependency readiness checks without leaking secrets or private operational details.

#### Scenario: Dependency readiness check
- **WHEN** the readiness endpoint is requested by an authorized or internal health checker
- **THEN** it reports the status of Octane API, PostgreSQL, Redis, Horizon, Reverb, and Typesense in a machine-readable response

### Requirement: Long-running Laravel processes are controlled
The Linux/VM bundle SHALL include Supervisor configuration for Octane, Horizon, scheduler, and Reverb processes.

#### Scenario: Supervisor profile review
- **WHEN** the Supervisor configuration is inspected
- **THEN** each long-running process has autostart, autorestart, group termination, non-root execution, separated logs, and stop timing that preserves in-flight work

### Requirement: Deploy reloads running workers safely
The release procedure SHALL reload long-running workers so old code is not left serving requests or jobs after deployment.

#### Scenario: Deployment reload
- **WHEN** an operator follows the deployment procedure
- **THEN** Octane workers are gracefully reloaded, Horizon is terminated for restart by the process monitor, Reverb is restarted, and post-deploy smoke checks validate HTTP, queues, and WebSocket delivery

### Requirement: Persistent data is protected
The self-hosted runtime SHALL document persistent volumes, backup, restore, and upgrade behavior for all stateful services.

#### Scenario: Restore procedure validation
- **WHEN** an operator follows the documented restore procedure on a clean environment
- **THEN** PostgreSQL data, uploaded files, search indexes or reindex instructions, and required application secrets are restored to a usable state

### Requirement: Объектное хранилище — обязательный компонент установки

Установка SHALL включать S3-совместимое объектное хранилище как обязательный
сервис, а не как необязательный профиль. Его адрес, ключи и имя бакета SHALL
задаваться переменными окружения и SHALL быть описаны в примере окружения.

Установка SHALL создавать бакет, если его ещё нет, и НЕ SHALL требовать от
администратора ручных действий в консоли хранилища для первого запуска.
Повторный запуск установки SHALL проходить без ошибки, если бакет уже создан.

#### Scenario: Установка одной командой

- **WHEN** администратор заполняет окружение по примеру и поднимает стек
  документированной командой
- **THEN** хранилище поднимается вместе с остальными сервисами и бакет создан

#### Scenario: Повторный запуск

- **WHEN** стек поднимают ещё раз на существующих данных
- **THEN** установка проходит без ошибки, бакет и файлы на месте

#### Scenario: Внешнее хранилище вместо встроенного

- **WHEN** администратор указывает в окружении адрес и ключи своего
  S3-совместимого хранилища
- **THEN** приложение работает с ним, встроенное поднимать не требуется

#### Scenario: Хранилище не настроено

- **WHEN** переменные хранилища не заданы или заданы неверно
- **THEN** это видно из проверки готовности и из журнала понятным сообщением

### Requirement: Готовность учитывает объектное хранилище

Проверка готовности SHALL отдельно сообщать о доступности объектного
хранилища — наряду с базой, очередями и остальными зависимостями. Проверка НЕ
SHALL раскрывать наружу подробности подключения.

#### Scenario: Хранилище доступно

- **WHEN** запрашивается готовность работающей установки
- **THEN** среди проверенных зависимостей есть хранилище и оно исправно

#### Scenario: Хранилище недоступно

- **WHEN** хранилище остановлено
- **THEN** готовность сообщает о неисправности именно этой зависимости, не
  раскрывая адресов и ключей

### Requirement: Работоспособность хранилища подтверждается дымовой проверкой

Установка SHALL иметь команду дымовой проверки хранилища: она SHALL записать
объект, прочитать его обратно, сверить содержимое и удалить за собой.

Проверка SHALL завершаться понятным отказом, если хранилище недоступно или
права записи отсутствуют, и SHALL не оставлять после себя мусора.

#### Scenario: Проверка на исправной установке

- **WHEN** администратор запускает дымовую проверку хранилища
- **THEN** она сообщает об успехе, а тестовый объект в хранилище не остаётся

#### Scenario: Нет прав на запись

- **WHEN** ключи позволяют читать, но не писать
- **THEN** проверка завершается отказом с понятным сообщением

### Requirement: Файлы входят в резервную копию

Документация по резервному копированию и восстановлению SHALL описывать данные
объектного хранилища наравне с базой. Восстановление SHALL описывать
согласованное возвращение и базы, и файлов.

#### Scenario: Резервная копия установки

- **WHEN** администратор выполняет документированное резервное копирование
- **THEN** в копию попадают и база, и файлы из хранилища

#### Scenario: Восстановление на чистой машине

- **WHEN** установка восстанавливается из копии
- **THEN** и данные, и файлы на месте, а дымовая проверка хранилища проходит
