## Purpose

Defines real-time delivery, typing, presence, reconnect synchronization, and event authorization behavior for chat clients.

## ADDED Requirements

### Requirement: Chat events are versioned
The system SHALL publish versioned real-time events for message creation, update, deletion, reaction changes, room membership changes, and typing changes.

#### Scenario: Message created event
- **WHEN** a room member sends a message successfully
- **THEN** authorized room subscribers receive a `message.created.v1` event with a payload they are allowed to fetch through HTTP

### Requirement: Private channels are authorized
The system SHALL authorize all private room and user channels on the server before allowing subscription.

#### Scenario: Non-member channel subscription
- **WHEN** a user who is not a room member attempts to subscribe to that room channel
- **THEN** the subscription is rejected and no room event payload is delivered

### Requirement: Typing status is transient
The system SHALL expose typing status as a transient presence signal that does not become message history.

#### Scenario: Typing timeout
- **WHEN** a user stops sending typing updates or disconnects
- **THEN** other room members stop seeing that user as typing after the configured timeout

### Requirement: Presence reflects active room participation
The system SHALL track which authenticated users are currently active in a room so notification delivery can distinguish online room participants from offline recipients.

#### Scenario: Active recipient suppresses offline notification
- **WHEN** a recipient is actively present in the room at the time a message notification would be evaluated
- **THEN** the recipient is considered active for offline notification routing

### Requirement: HTTP remains source of truth after reconnect
The client SHALL synchronize room and message state through HTTP after reconnect and SHALL NOT rely on missed WebSocket events as the only source of truth.

#### Scenario: Reconnect after missed event
- **WHEN** a client reconnects after losing the WebSocket connection
- **THEN** it fetches current room state through the API and resolves missed message or membership changes


### Requirement: Real-time updates are integrated in the web UI
The chat web application SHALL apply authorized real-time events to the visible room state in the same stage the events are introduced, including typing indicators and presence, and SHALL show a reconnecting state during connection loss.

#### Scenario: Second participant sees a new message live
- **WHEN** another room member sends a message while the user has the room open
- **THEN** the message appears in the user's message list without a manual refresh
