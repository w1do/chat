## Purpose

Определяет устойчивую и отзывную браузерную авторизацию чата через защищённую
cookie с Sanctum-токеном без раскрытия credential клиентскому JavaScript.

## ADDED Requirements

### Requirement: Успешный вход создаёт постоянную browser token session

После успешной регистрации или авторизации API SHALL создать отдельный
ограниченный browser token и установить его в cookie. Cookie MUST быть
`HttpOnly`, в production MUST быть `Secure`, MUST иметь `SameSite=Lax` или
строже, `Path=/`, не MUST иметь широкий `Domain`, а её срок MUST совпадать с
серверным сроком token. Plaintext token MUST NOT присутствовать в JSON-ответе,
доступной JavaScript cookie, URL, логах или telemetry.

#### Scenario: Успешная авторизация

- **WHEN** пользователь отправляет корректные login и password
- **THEN** API возвращает прежний user envelope и устанавливает защищённую
  token cookie без token в теле ответа

#### Scenario: Браузер закрыт и открыт снова

- **WHEN** пользователь открывает чат до истечения установленной token session
- **THEN** клиент получает текущего пользователя через `/me` без повторного
  ввода login и password

#### Scenario: JavaScript проверяет cookie

- **WHEN** код страницы читает `document.cookie` после успешного входа
- **THEN** plaintext browser token ему недоступен

### Requirement: Пользователь восстанавливается по token cookie

Защищённые endpoints SHALL определять пользователя по действующей token cookie,
если Laravel session отсутствует или больше не авторизует запрос. Клиент SHALL
запрашивать `/me` при старте, SHALL отправлять cookie через credentialed request
и MUST NOT копировать token в `Authorization`, localStorage или sessionStorage.

#### Scenario: Серверная сессия потеряна

- **WHEN** Laravel session удалена или пересоздана, но browser token действует
- **THEN** `/me` возвращает того же пользователя и чат сохраняет авторизацию

#### Scenario: Token отсутствует или истёк

- **WHEN** `/me` не получает действующую session или token cookie
- **THEN** API возвращает `401 unauthenticated`, а клиент очищает приватное
  состояние и показывает вход

#### Scenario: Одновременно существуют session и token

- **WHEN** session и token cookie действительны для разных пользователей
- **THEN** запрос MUST быть отклонён как недоверенный, не смешивая identity и
  не раскрывая данные ни одного пользователя

### Requirement: Срок browser session конечен и зависит от remember

Обычный вход SHALL сохраняться после закрытия браузера на короткий
настраиваемый период, а вход с `remember=true` SHALL использовать отдельный
более долгий настраиваемый период. Сервер SHALL проверять expiration независимо
от клиентского срока cookie; истёкший token больше не SHALL авторизовать запрос.

#### Scenario: Обычный вход после перезапуска браузера

- **WHEN** браузер перезапущен в пределах короткого срока browser session
- **THEN** `/me` восстанавливает пользователя по token cookie

#### Scenario: Серверный срок истёк

- **WHEN** клиент сохранил cookie дольше, чем действует token на сервере
- **THEN** защищённый endpoint возвращает `401`, а истёкшая cookie удаляется

### Requirement: Cookie-аутентификация сохраняет CSRF и origin защиту

Каждая изменяющая состояние операция, авторизованная через browser token
cookie, MUST пройти Sanctum CSRF-проверку и проверку разрешённого frontend
origin. Наличие cookie само по себе MUST NOT позволять cross-site запросу
выполнить действие. Bearer token из заголовка не SHALL автоматически
преобразовываться в browser cookie.

#### Scenario: Cross-site мутация с cookie

- **WHEN** посторонний origin отправляет мутацию, к которой браузер приложил
  token cookie, без корректного CSRF-контракта
- **THEN** API отклоняет запрос и не меняет состояние

#### Scenario: Разрешённая мутация

- **WHEN** клиент из разрешённого origin отправляет token cookie и корректный
  XSRF token
- **THEN** API авторизует пользователя и применяет обычные policy rules

### Requirement: Browser token можно надёжно отозвать

Logout SHALL отозвать только текущую browser token session, инвалидировать
текущую Laravel session и удалить token cookie. Смена и сброс пароля, а также
административный security reset SHALL отзывать все browser tokens пользователя.
Повторный logout SHALL быть безопасным и не восстанавливать credential.

#### Scenario: Пользователь выходит

- **WHEN** авторизованный пользователь вызывает logout
- **THEN** текущий token отозван, cookie удалена и последующий `/me` возвращает
  `401 unauthenticated`

#### Scenario: Пароль сброшен

- **WHEN** пароль пользователя успешно сброшен
- **THEN** все ранее выданные browser token sessions этого пользователя больше
  не авторизуют HTTP или real-time запросы

#### Scenario: Два браузера и logout в одном

- **WHEN** пользователь выходит только в одном из двух авторизованных браузеров
- **THEN** token текущего браузера отозван, а второй остаётся авторизован до
  своего expiration или глобальной security-операции

### Requirement: Browser token session безопасна для Octane и real-time

Identity SHALL вычисляться заново для каждого HTTP и channel-auth запроса и
MUST NOT сохраняться в mutable singleton/static state. Действующая token cookie
SHALL давать тот же доступ к private/presence каналам, что и HTTP `/me`, а
отозванный token SHALL прекращать новую авторизацию каналов.

#### Scenario: Последовательные запросы разных пользователей в одном worker

- **WHEN** один Octane worker последовательно обслуживает token-cookie запросы
  двух пользователей
- **THEN** каждый ответ содержит только identity и данные своего пользователя

#### Scenario: Отозванный token авторизует канал

- **WHEN** клиент пытается заново авторизовать private channel после отзыва
  browser token
- **THEN** channel-auth возвращает unauthenticated и не выдаёт channel grant