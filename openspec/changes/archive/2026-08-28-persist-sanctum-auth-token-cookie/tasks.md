## 1. Воспроизведение и решение безопасности

- [ ] 1.1 Добавить integration/E2E reproduction текущего дефекта: выполнить login, сохранить browser cookies, удалить/потерять Laravel session и запросить `/me` из нового browser context; доказать красным тестом, что сейчас пользователь получает `401` и вынужден войти заново
- [ ] 1.2 Проверить reproduction при корректных `SESSION_DRIVER`, lifetime, cookie domain/secure/same-site и trusted proxy настройках; если session-only конфигурация устраняет дефект, остановить реализацию token cookie и обновить proposal/design с подтверждённой первопричиной
- [ ] 1.3 Создать superseding ADR для ADR-005 с threat analysis автоматически прикладываемой token cookie, выбранными defaults 24 часа/30 дней, CSRF middleware order, per-browser/global revocation и rollback; проверить `./tools/chat check docs`

## 2. Browser token lifecycle в identity package

- [ ] 2.1 Добавить типизированную конфигурацию browser token: feature flag, cookie name, secure/same-site/path, normal/remember TTL и ability; проверить config tests для production-safe defaults, запрета широкого Domain и согласованности TTL
- [ ] 2.2 Добавить Application DTO/result и сервис жизненного цикла, который создаёт Sanctum token с `browser` ability и `expires_at`, не раскрывая plaintext за пределы формирования cookie; проверить package tests на normal/remember expiration и отсутствие token в сериализованном user response
- [ ] 2.3 Расширить register/login handlers и тонкий controller так, чтобы успешный ответ устанавливал `HttpOnly` host-only cookie с корректными `Secure`, `SameSite`, `Path`, `Max-Age`/`Expires`; проверить feature tests для login и register, включая отсутствие token в JSON и доступной JavaScript cookie
- [ ] 2.4 Реализовать идемпотентный logout с отзывом только текущего browser token, инвалидацией session и удалением cookie; проверить package tests на повторный logout и независимость второй browser session
- [ ] 2.5 Отзывать все tokens с browser ability при смене/сбросе пароля и `admin:reset-password`, не затрагивая mobile/другие abilities; проверить package и application integration tests на каждый security path
- [ ] 2.6 Подключить и документировать штатную scheduled очистку истёкших Sanctum tokens; проверить scheduler test и dry-run/команду на фикстурах с истёкшими и действующими tokens

## 3. Аутентификация cookie в composition root

- [ ] 3.1 Реализовать request-local middleware/resolver, который после stateful CSRF pipeline и до `auth:sanctum` передаёт только browser cookie как Sanctum credential при отсутствии Authorization header; проверить integration tests на успешный `/me` без Laravel session и непреобразование Bearer header в cookie
- [ ] 3.2 Обнаруживать конфликт, когда Laravel session и browser token принадлежат разным пользователям: возвращать безопасную auth error и удалять cookie; проверить тестом отсутствие данных обоих пользователей в ответе
- [ ] 3.3 Зафиксировать middleware ordering и origin rules в `apps/chat-api`: cross-site mutation с cookie отклоняется, разрешённый origin с корректным XSRF проходит, CORS не выдаёт credentials чужому origin; проверить CSRF/CORS integration suite
- [ ] 3.4 Подключить token-cookie auth к HTTP и private/presence channel authorization без изменения policy rules; проверить integration tests на разрешённый канал, чужую комнату и отозванный token
- [ ] 3.5 Добавить Octane regression tests: один FrankenPHP worker последовательно обслуживает разных session/token пользователей и не переносит identity, locale, permissions или room context; проверить `./tools/chat test api tests/Octane` и `./tools/chat smoke octane`

## 4. Frontend восстановление и очистка состояния

- [ ] 4.1 Закрепить в `@vendor/api-client`, что все `/me` и auth запросы используют `credentials: include`, token никогда не читается/копируется в JS, а `419` повторяет только CSRF handshake один раз; проверить unit tests клиента
- [ ] 4.2 Проверить `useAuth` bootstrap: после нового browser context пользователь восстанавливается только ответом `/me`, а подтверждённый `401` очищает identity и все приватные Query caches без бесконечного retry; проверить component tests identity/app shell
- [ ] 4.3 Останавливать Echo subscriptions и очищать приватный in-memory state после отзыва/`401`, сохраняя offline/network error как отдельное состояние без ложного logout; проверить component tests reconnect, network failure и unauthenticated paths
- [ ] 4.4 Дополнить Playwright auth scenario закрытием и новым запуском browser context для обычного и remembered login, logout и expiration; проверить `./tools/chat e2e auth`

## 5. Публичный контракт и документация

- [ ] 5.1 Обновить identity OpenAPI: login/register `Set-Cookie`, неизменный user envelope, `/me` cookie security, `401/419` и logout; пересобрать dist/client и проверить `./tools/chat openapi validate`, `./tools/chat client generate` без незакоммиченного generated diff
- [ ] 5.2 Обновить `.env.example`, installation/upgrade/troubleshooting и security threat model для HTTPS, trusted proxies, cookie TTL, feature flag, диагностики и rollback; проверить `./tools/chat check docs`
- [ ] 5.3 Обновить `docs/features/authentication.md`, `CHANGELOG.md` и `SUMMARY.md`, отделив реализованное от planned и перечислив фактически пройденные тесты; проверить `./tools/chat check docs`
- [ ] 5.4 После реализации и успешных тестов обновить секцию авторизации `demo__4.html`, не показывая token и не заявляя неподтверждённые свойства; проверить browser landing tests и `cmp -s AGENTS.md CLAUDE.md`

## 6. Финальная проверка и выпуск

- [ ] 6.1 Прогнать `./tools/chat test identity`, API integration/Octane suites, frontend identity/api-client tests, typecheck и E2E auth; исправить все регрессии без ослабления проверок
- [ ] 6.2 Поднять production-like HTTPS stack и проверить login → закрытие браузера → `/me`, потерю Laravel session, CSRF rejection, logout, Reverb channel auth и readiness; записать точные результаты в документации
- [ ] 6.3 Выполнить `./tools/chat ci`, проверить `git diff` на plaintext tokens, секреты, случайные файлы и несвязанные изменения, затем зафиксировать непроверенные риски и rollback в итоговом отчёте