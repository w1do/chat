## Purpose

Defines notification creation and delivery when chat activity needs user attention, especially when a recipient is not currently active in the relevant room.

## ADDED Requirements

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
