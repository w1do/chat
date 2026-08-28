## Purpose

Defines persistent room, membership, and message behavior for the core chat experience using permission-safe APIs and durable message storage.

## Requirements

### Requirement: Users can create and discover rooms
The system SHALL support public and private rooms with creator ownership, room metadata, and permission-safe discovery.

#### Scenario: Create public room
- **WHEN** an authenticated user creates a public room with valid data
- **THEN** the room is persisted, the creator becomes owner, and the room can appear in public room listings

#### Scenario: Private room discovery
- **WHEN** a non-member requests a private room listing
- **THEN** private rooms the user cannot access are not returned

### Requirement: Room membership is role based
The system SHALL support room roles `owner`, `admin`, and `member` with server-side authorization for invitations, joins, role changes, and leaving rooms.

#### Scenario: Member cannot promote another member
- **WHEN** a room member without administrative permission attempts to change another member role
- **THEN** the API returns the documented forbidden error response and no membership is changed

### Requirement: Messages are durably stored
The system SHALL persist messages with author, room, optional reply target, body, edit timestamps, soft-delete state, and stable external identifiers.

#### Scenario: Send message
- **WHEN** a room member sends a valid message
- **THEN** the message is stored in the room history and returned through the documented message resource

### Requirement: Message history is cursor paginated
The system SHALL expose room message history through cursor pagination that preserves stable ordering.

#### Scenario: Paginate older messages
- **WHEN** a room member requests the next history page with a valid cursor
- **THEN** the API returns the next ordered page without duplicating messages from the previous page

### Requirement: Users can edit and soft-delete own messages
The system SHALL allow authorized edits and soft deletes while preserving room history integrity and reply relationships.

#### Scenario: Edit own message
- **WHEN** a message author submits a valid edit within policy
- **THEN** the message body is updated, edit metadata is recorded, and the message remains in the same room history position

#### Scenario: Soft-delete message with replies
- **WHEN** an authorized user deletes a message that has replies
- **THEN** the message is marked deleted without removing reply relationships from history

### Requirement: Reactions and mentions are supported
The system SHALL support message reactions with uniqueness per user and emoji, and SHALL identify mentions for downstream notifications.

#### Scenario: Toggle reaction
- **WHEN** a room member toggles an emoji reaction on a message
- **THEN** the resulting reaction state is persisted with no duplicate reaction for the same message, user, and emoji

### Requirement: Rooms and messaging have an integrated web UI
The chat web application SHALL provide room list, room view, membership management, message composer, history with cursor-based loading, replies, and reactions built from the chat frontend package in the same stage as the corresponding APIs, with loading, empty, error, and keyboard-accessible states.

#### Scenario: Member sends a message from the composer
- **WHEN** a room member submits a valid message in the room view
- **THEN** the message appears in the visible history using data from the documented API contract

### Requirement: Replies are visible and navigable
The chat web application SHALL make replying obvious from the message itself, SHALL show the quoted message above the composer while composing, and SHALL let a reader move from a quote to the original message.

#### Scenario: Replying to a message
- **WHEN** a member starts a reply from a message in the timeline
- **THEN** the composer shows a quote of that message with its author and text and a way to cancel it, and the sent message is stored against that reply target

#### Scenario: Jumping to the quoted message
- **WHEN** a member activates the quote shown inside a reply in the timeline
- **THEN** the interface brings the original message into view and highlights it briefly; if the original is deleted the quote says so instead of showing its text

### Requirement: Reactions and emoji are chosen from the interface
The chat web application SHALL let a member react to a message with an emoji chosen from a picker rather than a fixed shortlist, SHALL let a member insert emoji into the draft, and SHALL show grouped reaction counts that make the member's own reaction visible.

#### Scenario: Reacting with a chosen emoji
- **WHEN** a member picks an emoji for a message from the reaction picker
- **THEN** the reaction is stored through the documented API and the grouped count updates for every member of the room

#### Scenario: Removing an own reaction
- **WHEN** a member activates a reaction they already gave
- **THEN** the reaction is removed and the grouped count reflects it

#### Scenario: Inserting emoji into a draft
- **WHEN** a member picks an emoji from the composer
- **THEN** the emoji is inserted into the draft text at the caret without sending the message

#### Scenario: User text is rendered safely
- **WHEN** a message body contains HTML or script-like content
- **THEN** the UI renders it as text without executing or injecting unsafe HTML

### Requirement: Название и описание комнаты меняет владелец или админ

Владелец и админ комнаты SHALL менять её название и описание. Участник с ролью
`member` и посторонний НЕ SHALL этого делать. Новое название SHALL быть
непустым; описание MAY быть пустым.

Изменение SHALL немедленно расходиться по участникам: открытая комната
показывает новое название без перезагрузки.

#### Scenario: Владелец переименовывает комнату

- **WHEN** владелец в настройках комнаты меняет название на «Семья» и сохраняет
- **THEN** комната называется «Семья» у всех участников, включая тех, у кого она
  открыта прямо сейчас

#### Scenario: Админ добавляет описание

- **WHEN** админ комнаты вписывает описание и сохраняет
- **THEN** описание сохранено и видно в настройках комнаты всем участникам

#### Scenario: Участник пытается переименовать

- **WHEN** участник с ролью `member` отправляет изменение названия
- **THEN** запрос отклоняется как запрещённый, комната не меняется, а в
  интерфейсе полей для правки ему не показывают вовсе

#### Scenario: Пустое название

- **WHEN** название очищено и отправлено пустым
- **THEN** запрос отклоняется как некорректный с указанием поля, прежнее
  название сохраняется

### Requirement: Владелец удаляет комнату навсегда

Владелец комнаты SHALL удалять её насовсем. Вместе с комнатой SHALL исчезать её
сообщения, реакции, участие и приглашения — восстановление не предусмотрено.
Никто, кроме владельца, НЕ SHALL удалять комнату; админ и участник получают
отказ.

Удаление SHALL требовать подтверждения: человек вводит название комнаты
дословно. Без совпадения удаление не выполняется.

После удаления участники, у которых комната открыта, SHALL быть возвращены к
списку комнат с понятным сообщением, а не оставлены на пустом экране с ошибками.

#### Scenario: Владелец удаляет комнату

- **WHEN** владелец вводит название комнаты в подтверждении и нажимает удалить
- **THEN** комната и её переписка исчезают, владелец оказывается в списке
  комнат, а комнаты в списке больше нет

#### Scenario: Второй участник в этот момент читает комнату

- **WHEN** комнату удаляют, пока другой участник её читает
- **THEN** он возвращается к списку комнат и видит сообщение, что комната
  удалена

#### Scenario: Подтверждение не совпало

- **WHEN** введённое название отличается от настоящего
- **THEN** кнопка удаления недоступна, комната остаётся на месте

#### Scenario: Админ пытается удалить

- **WHEN** админ комнаты отправляет удаление
- **THEN** запрос отклоняется как запрещённый, комната остаётся

#### Scenario: Обращение к удалённой комнате

- **WHEN** кто-либо запрашивает удалённую комнату или её сообщения
- **THEN** ответ — «не найдено», а не пустой список и не ошибка сервера

### Requirement: Архивирование и удаление — разные действия

Архивирование комнаты SHALL оставаться отдельным действием со своим адресом и
своим правом; удаление SHALL быть необратимым. Одно НЕ SHALL выполняться вместо
другого по недоразумению: адрес удаления удаляет, адрес архивирования
архивирует.

#### Scenario: Архивирование не удаляет

- **WHEN** комнату архивируют
- **THEN** её переписка сохраняется и доступна для чтения, комната помечена
  архивной

#### Scenario: Клиент вызывает старый адрес удаления

- **WHEN** клиент прежней версии обращается к адресу удаления, ожидая
  архивирования
- **THEN** поведение описано в контракте API как несовместимое изменение, а
  сгенерированный клиент и документация соответствуют новому смыслу

### Requirement: Переписка бывает двух видов

Каждая переписка SHALL иметь вид: комната или диалог. Вид SHALL задаваться при
создании и НЕ SHALL меняться потом: комната не становится диалогом, а диалог —
комнатой.

Создание комнаты обычным путём SHALL всегда давать комнату: вид диалога
запросом на создание комнаты назначен быть НЕ SHALL.

#### Scenario: Обычное создание комнаты

- **WHEN** человек создаёт комнату
- **THEN** получается комната, даже если в запросе пытались указать иной вид

#### Scenario: Вид не меняется

- **WHEN** кто-то пытается изменить вид существующей переписки
- **THEN** запрос отклоняется, вид остаётся прежним

### Requirement: Список переписок содержит комнаты и диалоги вместе

Список переписок человека SHALL включать и его комнаты, и его диалоги. Чужие
диалоги в него попадать НЕ SHALL, даже если бы правила видимости комнат это
допускали.

Скрытые человеком диалоги в его списке SHALL отсутствовать до нового
сообщения.

#### Scenario: Один список

- **WHEN** человек открывает список переписок
- **THEN** там и комнаты, где он состоит, и его диалоги

#### Scenario: Чужие диалоги не видны

- **WHEN** человек открывает список переписок
- **THEN** диалогов, в которых он не участвует, там нет

#### Scenario: Поиск по списку

- **WHEN** человек ищет переписку по названию
- **THEN** комнаты находятся по названию, диалоги — по имени собеседника

### Requirement: Удаление комнаты не применимо к диалогу

Правила удаления и архивирования SHALL относиться только к комнатам. Диалог
удалён или заархивирован быть НЕ SHALL ни его участником, ни кем-либо ещё.

#### Scenario: Удаление комнаты работает как прежде

- **WHEN** владелец удаляет комнату
- **THEN** она удаляется вместе с перепиской, как и раньше

#### Scenario: Диалог удалению не подлежит

- **WHEN** участник диалога отправляет запрос на его удаление
- **THEN** запрос отклоняется, переписка остаётся

### Requirement: Сообщение без текста допустимо, если у него есть вложения

Сообщение SHALL считаться полным, если у него есть хотя бы вложение или
непустой текст. Сообщение без того и другого SHALL отклоняться.

#### Scenario: Только вложение

- **WHEN** отправляется сообщение с приложенным файлом и пустым текстом
- **THEN** оно создаётся и показывается в переписке

#### Scenario: Ни текста, ни вложений

- **WHEN** отправляется сообщение без текста и без вложений
- **THEN** запрос отклоняется как некорректный

#### Scenario: Правка текста у сообщения с вложением

- **WHEN** автор правит текст сообщения, к которому приложены файлы
- **THEN** правится только текст; состав вложений остаётся прежним

### Requirement: Удаление сообщения скрывает его вложения

Мягкое удаление сообщения SHALL закрывать доступ к его вложениям так же, как
к тексту: файл и миниатюры НЕ SHALL отдаваться никому, включая тех, у кого
осталась ссылка.

#### Scenario: Автор удалил сообщение с фотографиями

- **WHEN** автор удаляет сообщение, к которому приложены изображения
- **THEN** в переписке остаётся отметка об удалении, плитки исчезают, файлы
  больше не отдаются

#### Scenario: Ссылка на файл удалённого сообщения

- **WHEN** участник открывает сохранённую ранее ссылку на вложение
  удалённого сообщения
- **THEN** файл не отдаётся

### Requirement: Удаление комнаты уносит её файлы из хранилища

Удаление комнаты навсегда SHALL удалять и вложения её сообщений из
объектного хранилища — вместе с миниатюрами. Файлы НЕ SHALL оставаться
занимать место после того, как комнаты не стало.

#### Scenario: Владелец удалил комнату

- **WHEN** владелец удаляет комнату с перепиской и вложениями
- **THEN** файлы этой комнаты и их миниатюры удаляются из хранилища

#### Scenario: Файлы соседних комнат не трогаются

- **WHEN** удалена одна комната
- **THEN** вложения других комнат остаются на месте

#### Scenario: Хранилище недоступно в момент удаления

- **WHEN** комнату удаляют, а хранилище временно не отвечает
- **THEN** удаление комнаты доводится до конца, а очистка файлов повторяется
  позже и не теряется молча
