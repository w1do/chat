## Purpose

Определяет воспроизводимую и безопасную сборку, подпись, проверку и выпуск
Android/iOS-клиентов для конкретной self-hosted установки чата.

## ADDED Requirements

### Requirement: Каждая установка имеет явную mobile build-конфигурацию

Оператор SHALL задать стабильные Android application id и iOS bundle id,
HTTPS/WSS адрес установки, display name, version/build number, Firebase
platform files и минимальную поддерживаемую OS matrix до release build.
Изменение application/bundle id SHALL считаться выпуском другого приложения.

#### Scenario: Первый mobile release установки

- **WHEN** оператор заполняет все обязательные публичные параметры и
  предоставляет platform credentials вне репозитория
- **THEN** preflight подтверждает согласованность app ids, Firebase apps,
  server URLs и version numbers до длительной native сборки

#### Scenario: Firebase app id не совпадает со сборкой

- **WHEN** platform config относится к другому application/bundle id
- **THEN** preflight завершается ошибкой и не выпускает клиент, который не
  сможет зарегистрировать push

### Requirement: Секреты сборки и доставки не попадают в артефакт или git

Signing keys, signing passwords, Apple private keys, Firebase service-account
JSON и repository credentials MUST храниться в защищённом CI/environment
storage. Release bundle SHALL содержать только необходимые публичные mobile
configuration values, SHALL удалять server-only environment keys и SHALL быть
проверен на известные secret patterns перед публикацией.

#### Scenario: Release build сформирован

- **WHEN** сборка завершена
- **THEN** secret scan не находит service-account private key, signing secret,
  API token, database credential или server APP_KEY внутри APK/AAB/IPA

#### Scenario: Pull request из fork

- **WHEN** CI проверяет недоверенный pull request
- **THEN** signing/Firebase secrets не передаются job, а выполняются только
  проверки, не требующие секретов

### Requirement: Native build воспроизводим и не зависит от сгенерированного исходника

Версии PHP, Laravel, NativePHP, native plugins, Composer и JavaScript packages
SHALL быть зафиксированы lock-файлами. Генерируемый native project SHALL
пересоздаваться документированной командой и MUST NOT содержать ручных правок,
которые теряются при upgrade.

#### Scenario: Чистая Android build-машина

- **WHEN** checkout содержит исходники, lock-файлы и разрешённые build secrets
- **THEN** документированная команда создаёт подписанный APK/AAB без ручного
  редактирования сгенерированных Kotlin/Gradle файлов

#### Scenario: Чистая iOS build-машина

- **WHEN** сборка запускается на поддерживаемом macOS/Xcode runner с signing
  credentials
- **THEN** документированная команда создаёт подписанный IPA без ручного
  редактирования сгенерированного Xcode project

#### Scenario: NativePHP/plugin upgrade

- **WHEN** зависимость обновляется
- **THEN** native project пересоздаётся, lock diff и generated validation
  проходят review, а поведение проверяется на обеих платформах

### Requirement: Release gate проверяет реальные мобильные сценарии

Release SHALL проходить PHP/TypeScript unit и contract tests, сборку React
assets, native component/bridge tests, Android emulator и iOS simulator smoke,
а push SHALL дополнительно проверяться на физических Android и iOS устройствах.
Нельзя считать web build или simulator единственным доказательством native
готовности.

#### Scenario: Android release candidate

- **WHEN** готов Android candidate
- **THEN** на поддерживаемом emulator и физическом устройстве проверены login,
  rooms, send/edit/delete, attachments, realtime reconnect, keyboard/safe area,
  background/resume, push, badge и deep link

#### Scenario: iOS release candidate

- **WHEN** готов iOS candidate
- **THEN** те же критические сценарии проверены в simulator, а получение push
  при погашенном экране и cold-start deep link — на физическом iPhone

#### Scenario: Web regression gate

- **WHEN** mobile release изменяет общую app-shell
- **THEN** существующие PWA component/E2E, service worker, Web Push и desktop
  layout checks также проходят

### Requirement: Выпуск имеет подписанные артефакты и план совместимости

Release process SHALL создавать подписанные AAB и при необходимости APK для
Android, подписанный IPA для iOS, checksums и release notes с server/API
compatibility. Mobile version/build number SHALL монотонно расти по правилам
платформ, а сервер SHALL документировать поддерживаемый диапазон версий клиента.

#### Scenario: Публикация релиза

- **WHEN** все release gates успешны
- **THEN** оператор получает подписанные артефакты, checksums, список
  обязательной server version/configuration и инструкции загрузки в store или
  разрешённого внутреннего распространения

#### Scenario: Сервер обновлён раньше клиента

- **WHEN** установленный mobile client ещё входит в поддерживаемый диапазон
- **THEN** сервер сохраняет совместимый API/realtime контракт и клиент
  продолжает работать

#### Scenario: Клиент больше не поддерживается

- **WHEN** версия клиента ниже документированного минимума
- **THEN** API возвращает машиночитаемый upgrade-required результат, а клиент
  показывает безопасное обновление вместо неопределённых ошибок

### Requirement: Mobile-поставка остаётся опциональной для self-hosted runtime

Документация SHALL отделять обычную установку Docker Compose от процесса
mobile build и SHALL описывать Firebase/APNs, signing, backup/rotation и
troubleshooting. Отсутствие mobile toolchain или credentials MUST NOT мешать
установке, обновлению и резервному копированию серверного чата и PWA.

#### Scenario: Оператор использует только PWA

- **WHEN** оператор не собирает Android/iOS приложения
- **THEN** стандартный self-hosted install/upgrade остаётся прежним и не
  требует NativePHP, Xcode, Android SDK или Firebase service account

#### Scenario: Signing key ротируется или теряется

- **WHEN** оператор меняет либо утрачивает platform signing credential
- **THEN** runbook объясняет последствия для обновления установленного
  приложения, восстановление из защищённой копии и случаи, когда потребуется
  новый application id

