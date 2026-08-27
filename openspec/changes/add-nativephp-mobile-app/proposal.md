## Why

Сейчас чат доступен на телефоне только как PWA: он зависит от браузерной
оболочки и Web Push и не может использовать полноценный системный жизненный
цикл Android/iOS. Нужен устанавливаемый NativePHP-клиент с тем же чатом,
системными push-уведомлениями и самостоятельной self-hosted поставкой без
центрального vendor control plane.

## What Changes

- Добавляется отдельный composition root `apps/chat-mobile` на Laravel 13 и
  NativePHP Mobile 4.x для Android и iOS. Он показывает существующий React/Vite
  чат в полноэкранном PHP-mode WebView и переиспользует frontend-пакеты вместо
  копирования экранов и бизнес-логики.
- Общая сборка React-приложения получает платформенные адаптеры для
  аутентификации, runtime-конфигурации, real-time, push, deep links и lifecycle;
  PWA остаётся поддерживаемым web-клиентом с прежним поведением.
- Добавляется мобильная Sanctum-аутентификация с короткоживущим access token,
  ротируемым refresh token, отзывом сессии и хранением секретов только в
  iOS Keychain / Android Keystore через NativePHP SecureStorage.
- Добавляется native push через NativePHP Firebase plugin: системное разрешение,
  регистрация FCM-токена, доставка через FCM (и APNs за FCM на iOS), обновление
  токена, удаление невалидных устройств, badge и переход в нужную комнату по
  нажатию. Существующий VAPID Web Push продолжает работать независимо.
- Backend-канал `push` становится общим правилом предпочтений и очередей, но
  доставляет событие всеми активными транспортами пользователя: Web Push для
  PWA и FCM для NativePHP. Отказ одного транспорта не блокирует сообщение или
  другой транспорт.
- Добавляется воспроизводимая поставка подписанных AAB/APK и IPA с отдельными
  app identifiers, Firebase-конфигурацией и credentials каждой self-hosted
  установки; секреты отправки и ключи подписи не включаются в приложение.
- Универсальный магазинный клиент с выбором произвольного сервера и центральным
  push-relay в это изменение не входит: первая версия собирается оператором для
  одного заранее настроенного HTTPS/WSS-сервера.

## Capabilities

### New Capabilities

- `platform/native-mobile-app`: NativePHP-оболочка Android/iOS, полная
  функциональная паритетность с web-чатом, platform adapters, lifecycle,
  reconnect и deep-link navigation.
- `identity/mobile-authentication`: безопасные мобильные access/refresh сессии,
  SecureStorage, ротация и отзыв токенов без cookie/CSRF-зависимости PWA.
- `notifications/native-push`: регистрация native-устройств и системная
  доставка FCM/APNs рядом с существующим Web Push, включая предпочтения,
  обновление токенов, ошибки и переход в комнату.
- `operations/mobile-delivery`: конфигурация, сборка, подпись, проверка и
  выпуск Android/iOS-клиента для конкретной self-hosted установки.

### Modified Capabilities

Нет: канонические `openspec/specs` пока не содержат существующих capability-
спецификаций; новое поведение фиксируется отдельными capability выше, не меняя
контракт PWA.

## Impact

- Новый `apps/chat-mobile` с собственными `composer.json`, NativePHP config,
  native routes, Vite entrypoint и тестами; `nativephp/` остаётся генерируемым
  и не становится исходником проекта.
- Рефакторинг `apps/chat-web` и `packages/frontend/*`: общая React app-shell,
  инъецируемая auth strategy, platform push adapter и mobile-safe обработка
  service worker, safe areas, клавиатуры, внешних ссылок и lifecycle.
- `packages/backend/identity`: mobile login/register/refresh/logout use cases,
  rate limits, hashed refresh-session metadata, OpenAPI и contract tests.
- `packages/backend/notifications`: native device registrations, общий push
  dispatcher, FCM transport, существующие очереди/retry/audit, новые endpoints,
  OpenAPI и команды диагностики.
- `apps/chat-api`: bearer-safe endpoint авторизации private/presence Reverb
  channels, Firebase server credentials configuration и wiring пакетов.
- Новые зависимости как минимум `nativephp/mobile` 4.x,
  `nativephp/mobile-firebase` и `nativephp/mobile-secure-storage`; версии и
  plugin registration фиксируются lock-файлами.
- Внешние prerequisites: собственный Firebase project, APNs capability/key,
  Android/iOS signing credentials и macOS/Xcode либо поддерживаемый remote
  builder для iOS. FCM/APNs являются транспортом native push, но сервер чата,
  данные и правила доставки остаются self-hosted.
- Обновляются OpenAPI/generated client, CI, `./tools/chat`, документация,
  threat model, configuration/release/upgrade инструкции и `SUMMARY.md`.
  Существующие web API, PWA, VAPID Web Push и Docker Compose runtime не имеют
  breaking change.
