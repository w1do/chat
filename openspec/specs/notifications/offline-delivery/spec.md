## Purpose

Defines notification creation and delivery when chat activity needs user attention, especially when a recipient is not currently active in the relevant room.

## Requirements

### Requirement: Offline recipients are notified
The system SHALL create a notification for an eligible recipient when a message, mention, invite, or relevant room event occurs and the recipient is not currently active in that room.

#### Scenario: Mention while recipient is outside room
- **WHEN** a room member mentions another eligible member who is not active in the room
- **THEN** the system creates an in-app notification and schedules enabled delivery channels for that recipient

#### Scenario: Recipient is active in room
- **WHEN** a recipient is active in the room where the event occurs
- **THEN** the system does not create an offline attention notification for that room event

### Requirement: Notification preferences are respected
The system SHALL allow users to configure notification channel preferences while still preserving mandatory security or administrative notifications.

#### Scenario: Email disabled for chat messages
- **WHEN** a user disables email notifications for chat messages
- **THEN** chat message notifications for that user are not sent by email but remain available through enabled channels

### Requirement: Initiators are not notified about their own action
The system SHALL suppress notifications to the user who initiated the triggering event.

#### Scenario: Sender mentions self
- **WHEN** a sender mentions themselves in a message
- **THEN** the system does not create a self-notification for that mention

### Requirement: Noisy notifications are deduplicated
The system SHALL deduplicate or group noisy room notifications so repeated events do not create unbounded notification spam.

#### Scenario: Repeated messages in same room
- **WHEN** multiple notification-worthy messages arrive for the same inactive recipient within the configured grouping window
- **THEN** the system updates or groups the notification according to the documented aggregation contract

### Requirement: Notification delivery is queued and auditable
The system SHALL deliver slow channels through queues with idempotent jobs, retry policy, failure handling, and auditable status.

#### Scenario: Email provider failure
- **WHEN** an email notification delivery fails
- **THEN** the job follows the configured retry and failure policy without blocking message persistence or real-time delivery

### Requirement: Notifications have an integrated web UI
The chat web application SHALL provide a notification feed, unread counters, mark-as-read actions, and channel preference settings built from the notifications frontend package in the same stage as the notification APIs, with loading, empty, and error states.

#### Scenario: User reviews and updates preferences
- **WHEN** an authenticated user changes a notification channel preference in the settings screen
- **THEN** the change is persisted through the documented API and reflected in subsequent notification behavior

### Requirement: Каналы доставки включают push

Пользователь SHALL управлять каналами доставки `database`, `mail` и `push` по
каждой категории уведомлений. Канал `push` SHALL подчиняться тем же правилам
подавления и группировки, что и остальные каналы.

#### Scenario: Предпочтения показывают push

- **WHEN** пользователь открывает настройки каналов
- **THEN** для каждой категории доступен канал push наряду с лентой и почтой

#### Scenario: Группировка не плодит push

- **WHEN** в одной комнате подряд приходит несколько сообщений внутри окна
  группировки
- **THEN** на устройство уходит одно уведомление, а не по одному на сообщение

#### Scenario: Обязательная категория

- **WHEN** пользователь отключает push для категории «Безопасность»
- **THEN** запрос принимается: обязательной остаётся только лента, а push
  можно отключить

### Requirement: Уведомление о личном сообщении называет человека

Уведомление о сообщении в личной переписке SHALL называть отправителя, а не
комнату. Название комнаты в таком уведомлении появляться НЕ SHALL — у диалога
его нет.

Остальные правила уведомлений SHALL действовать без изменений: инициатор себя
не уведомляет, активный в переписке получатель уведомление не получает,
предпочтения каналов соблюдаются, шумные события группируются.

#### Scenario: Личное сообщение пришло, пока человека нет в приложении

- **WHEN** собеседник пишет в диалог человеку, которого нет в приложении
- **THEN** уведомление называет отправителя и показывает фрагмент сообщения

#### Scenario: Переход из уведомления

- **WHEN** человек открывает уведомление о личном сообщении
- **THEN** открывается этот диалог

#### Scenario: Активный собеседник не уведомляется

- **WHEN** человек читает диалог прямо сейчас и приходит сообщение
- **THEN** уведомление ему не отправляется, как и в комнате

#### Scenario: Предпочтения соблюдаются

- **WHEN** человек отключил канал доставки
- **THEN** уведомления о личных сообщениях этим каналом не приходят
