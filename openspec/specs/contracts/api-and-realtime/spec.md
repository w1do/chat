## Purpose

Defines the public HTTP, generated client, error, and real-time contract rules that downstream frontend packages and self-hosted operators can rely on.

## Requirements

### Requirement: HTTP API uses versioned JSON contracts
The system SHALL expose public application endpoints under `/api/v1` and SHALL return JSON for successful and error responses.

#### Scenario: Unknown API route
- **WHEN** a client requests an unknown `/api/v1` route
- **THEN** the API returns the documented JSON error envelope instead of an HTML error page

### Requirement: Errors use a consistent envelope
The system SHALL use a consistent JSON error envelope containing `code`, `message`, `details`, and `trace_id` for documented error classes.

#### Scenario: Validation error
- **WHEN** a request fails validation
- **THEN** the response contains the documented status code and error envelope with field-level details

### Requirement: OpenAPI is the frontend source of truth
The system SHALL maintain OpenAPI 3.1 documentation for public HTTP endpoints and generate the frontend API client from the assembled contract.

#### Scenario: Contract generation
- **WHEN** API contracts are generated
- **THEN** the generated frontend client matches the committed OpenAPI document with no manual edits required

### Requirement: Real-time events have schemas
The system SHALL publish JSON Schemas for versioned real-time event payloads used by the chat client.

#### Scenario: Event payload validation
- **WHEN** a `message.updated.v1` payload is produced in tests
- **THEN** it validates against the committed schema for that event version

### Requirement: Breaking contract changes are controlled
The system SHALL treat incompatible HTTP or event payload changes as breaking changes requiring versioning, migration notes, and contract tests.

#### Scenario: Additive field change
- **WHEN** a new optional response field is added
- **THEN** existing clients remain compatible and the OpenAPI or event schema is updated in the same change

### Requirement: Представление человека сообщает его аватарку

Там, где API отдаёт человека — профиль, участник комнаты, автор сообщения, —
представление SHALL сообщать адрес его текущей аватарки в нужном интерфейсу
размере. У человека без аватарки поле SHALL отсутствовать, а не быть пустой
строкой: клиент по этому отличию выбирает запасной вид.

Набор прежних аватарок SHALL отдаваться только их владельцу и SHALL не
появляться в представлении человека для остальных.

#### Scenario: Участник с аватаркой

- **WHEN** клиент запрашивает участников комнаты
- **THEN** у тех, кто загрузил аватарку, есть её адрес в уменьшенном размере

#### Scenario: Участник без аватарки

- **WHEN** человек аватарку не загружал
- **THEN** адреса нет, и клиент рисует букву имени

#### Scenario: Чужой набор недоступен

- **WHEN** клиент запрашивает участников комнаты
- **THEN** прежние аватарки этих людей в ответе не перечисляются

#### Scenario: Свой набор доступен

- **WHEN** человек запрашивает свои аватарки
- **THEN** возвращается его набор с указанием текущей

### Requirement: Представление комнаты сообщает её фотографию

Представление комнаты SHALL сообщать адрес её фотографии. У комнаты без
фотографии поле SHALL отсутствовать.

Клиенту SHALL хватать этого поля, чтобы нарисовать список переписок и шапку
комнаты без дополнительных запросов.

#### Scenario: Комната с фотографией

- **WHEN** клиент запрашивает список переписок
- **THEN** у комнат с фотографиями есть её адрес

#### Scenario: Комната без фотографии

- **WHEN** фотография не загружена
- **THEN** поля нет, и клиент рисует эмодзи из названия

### Requirement: Изменения представлений отражены в контракте

Добавление изображений в представления человека и комнаты SHALL
сопровождаться обновлением OpenAPI, сгенерированного клиента и
contract-тестов в том же изменении.

Схемы real-time событий SHALL оставаться в силе: если событие несёт автора
сообщения, его аватарка SHALL попадать туда только вместе с обновлением схемы
и НЕ SHALL появляться в payload молча.

#### Scenario: Контракт обновлён вместе с кодом

- **WHEN** представление человека или комнаты меняется
- **THEN** одновременно обновляются OpenAPI, клиент и contract-тесты

#### Scenario: Событие соответствует схеме

- **WHEN** событие проверяется по схемам контрактов
- **THEN** оно им соответствует, недекларированных полей в payload нет

### Requirement: Представление переписки сообщает её вид и собеседника

Представление переписки в HTTP API SHALL сообщать её вид — комната или
диалог. Для диалога SHALL передаваться собеседник: его идентификатор, ник и
отображаемое имя. Название и описание у диалога SHALL отсутствовать, а не
подменяться пустой строкой.

Клиенту SHALL хватать этих полей, чтобы подписать переписку и решить, какие
действия показывать, без дополнительных запросов.

#### Scenario: Диалог в списке переписок

- **WHEN** клиент запрашивает список переписок
- **THEN** у диалогов указан вид и собеседник, у комнат — название, как
  прежде

#### Scenario: Комната не обзавелась собеседником

- **WHEN** в ответе комната
- **THEN** собеседник у неё отсутствует, а не пуст

#### Scenario: Контракт описан

- **WHEN** представление переписки меняется
- **THEN** одновременно обновляются OpenAPI, сгенерированный клиент и
  contract-тесты

### Requirement: Начало диалога — отдельная операция контракта

Начало личной переписки SHALL быть отдельной операцией, принимающей человека,
с которым её начинают. Повторный вызов с тем же человеком SHALL возвращать ту
же переписку, а не создавать новую.

Операция SHALL отвечать теми же ошибками, что и остальной API: отказ,
некорректный ввод и ограничение частоты SHALL следовать общему конверту
ошибок.

#### Scenario: Первый вызов

- **WHEN** клиент начинает диалог с человеком впервые
- **THEN** возвращается созданная переписка

#### Scenario: Повторный вызов

- **WHEN** клиент повторяет тот же запрос
- **THEN** возвращается та же переписка, второй не появляется

#### Scenario: Ошибки в общем конверте

- **WHEN** запрос отклонён
- **THEN** ответ следует общему конверту ошибок с кодом и понятным
  сообщением

### Requirement: События переписки не меняют своей формы из-за диалогов

События real-time SHALL приходить для диалогов теми же, что и для комнат, по
тем же каналам и в тех же схемах. Новых событий ради личной переписки
вводиться НЕ SHALL, а существующие схемы SHALL оставаться в силе.

Канал диалога SHALL авторизоваться так же, как канал комнаты: по участию.

#### Scenario: Сообщение в диалоге

- **WHEN** в личной переписке появляется сообщение
- **THEN** приходит то же событие о новом сообщении, что и в комнате

#### Scenario: Подписка постороннего

- **WHEN** человек, не состоящий в диалоге, пытается подписаться на его канал
- **THEN** подписка отклоняется

#### Scenario: Схемы соблюдены

- **WHEN** события диалога проверяются по схемам контрактов
- **THEN** они им соответствуют без исключений для личной переписки

### Requirement: Сообщение в API несёт свои вложения

Представление сообщения в HTTP API SHALL включать список вложений. Каждое
вложение SHALL сообщать идентификатор, имя файла, тип содержимого, размер,
адрес для скачивания и — для изображений — адрес миниатюры вместе с исходными
шириной и высотой.

Адрес миниатюры SHALL отсутствовать у файлов, для которых миниатюра не
предусмотрена, и это SHALL быть описано в контракте, а не выясняться опытным
путём.

#### Scenario: Сообщение с изображениями

- **WHEN** клиент запрашивает историю комнаты
- **THEN** у сообщений с изображениями есть вложения с миниатюрами и
  размерами, достаточными, чтобы разложить плитки без загрузки самих файлов

#### Scenario: Сообщение без вложений

- **WHEN** у сообщения вложений нет
- **THEN** список вложений пуст, а не отсутствует

#### Scenario: Удалённое сообщение

- **WHEN** сообщение мягко удалено
- **THEN** вложения в его представлении не перечисляются

#### Scenario: Контракт описан

- **WHEN** обновляется представление сообщения
- **THEN** одновременно обновляются OpenAPI, сгенерированный клиент и
  contract-тесты

### Requirement: Событие о новом сообщении описывает вложения

Событие `message.created.v1` SHALL нести те же сведения о вложениях, что и
HTTP API, и SHALL оставаться в границах схемы события. Payload НЕ SHALL
содержать ничего, чего подписчик не мог бы получить через API.

Изменение состава полей вложения в событии SHALL считаться изменением
контракта и SHALL сопровождаться новой версией схемы.

#### Scenario: Изображение приходит в реальном времени

- **WHEN** участник отправляет сообщение с изображениями
- **THEN** у остальных плитки появляются сразу из события, без повторного
  запроса истории

#### Scenario: Схема соблюдена

- **WHEN** событие проверяется по схеме контрактов
- **THEN** payload ей соответствует, лишних полей в нём нет
