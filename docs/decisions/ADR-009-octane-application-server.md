# ADR-009: FrankenPHP как application server для Laravel Octane

- Статус: accepted
- Дата: 2026-08-24

## Контекст

Инструкция требует Laravel Octane в production и откладывает выбор
application server до ADR (CLAUDE.md §3, STRUCTURE.md §10.3). Кандидаты:
FrankenPHP, RoadRunner, Swoole/OpenSwoole. От выбора зависят
`infra/docker/api/Dockerfile`, `infra/supervisor/octane.conf` и процедура
graceful reload. Требования: worker-режим с переиспользованием приложения,
graceful `octane:reload` после deploy, ограничение количества запросов на
worker, официальная поддержка Octane, воспроизводимая установка в Docker
и на Linux/VM.

## Решение

**FrankenPHP** (`octane:start --server=frankenphp`):

- официально поддерживается Laravel Octane и рекомендуется документацией
  Laravel как сервер по умолчанию для новых установок;
- единый бинарник со встроенным Caddy: HTTP/2, HTTP/3, автоматический TLS при
  необходимости; не требует отдельного PHP-FPM или PECL-расширений
  (в отличие от Swoole);
- официальные Docker-образы (`dunglas/frankenphp`), совместимые со сборкой
  multi-stage non-root образа `infra/docker/api/Dockerfile`;
- для Linux/VM-профиля бинарник ставится из официального релиза и управляется
  Supervisor (`infra/supervisor/octane.conf`);
- `--max-requests` и `octane:reload` ограничивают утечки памяти и обновляют
  код после deploy (CLAUDE.md, Octane safety).

Параметры фиксируются в `config/octane.php` и `.env` (`OCTANE_SERVER=frankenphp`).

## Альтернативы

- **RoadRunner** — зрелый и полностью рабочий вариант; отвергнут как дефолт:
  отдельный Go-бинарник + `.rr.yaml` — дополнительная конфигурационная
  поверхность без преимуществ для этого проекта; остаётся запасным вариантом,
  так как Octane абстрагирует сервер.
- **Swoole/OpenSwoole** — отвергнуто: PECL-расширение усложняет образ и
  Linux/VM-профиль, известные несовместимости с частью экосистемных пакетов;
  concurrent tasks не требуются MVP (инструкция запрещает включать их без
  измеримой пользы).

## Последствия

- `infra/docker/api/Dockerfile` собирается на базе официального образа
  FrankenPHP; порт API внутренний, TLS терминирует reverse proxy (ADR-007).
- Octane-специфичные smoke/integration тесты (`tests/Octane/`) выполняются
  под FrankenPHP (задача 4.3).
- Реальная проверка совместимости окружения выполняется первым запуском
  production-стека (задача 2.6 `smoke runtime`); до её прохождения статус
  runtime в SUMMARY.md не может быть выше `in progress`.

## Критерии пересмотра

- Несовместимость FrankenPHP с зависимостью проекта, выявленная smoke/нагрузочным
  тестом → переключение на RoadRunner отдельным ADR (суперсид этого).
- Существенные регрессии производительности или памяти против RoadRunner
  в нагрузочном тесте.
- Изменение официальной рекомендации Laravel Octane.
