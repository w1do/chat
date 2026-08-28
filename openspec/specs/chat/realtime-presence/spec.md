## Purpose

Defines real-time delivery, typing, presence, reconnect synchronization, and event authorization behavior for chat clients.

## Requirements

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

### Requirement: Membership changes are recorded as system messages
The system SHALL record joining and leaving a room as system messages in that room's history, SHALL deliver them in real time to the room's members, and SHALL keep them out of reach of editing, deletion, and reactions.

#### Scenario: Someone joins a room
- **WHEN** a user joins a room
- **THEN** a system message naming that user is stored in the room history and delivered to connected members through the documented event

#### Scenario: Someone leaves a room
- **WHEN** a member leaves a room
- **THEN** a system message naming that member is stored in the room history and delivered to connected members

#### Scenario: System messages are not editable
- **WHEN** any user attempts to edit, delete, or react to a system message
- **THEN** the API refuses the action through the documented forbidden response

#### Scenario: History survives a reload
- **WHEN** a member reloads the room after a join and a leave happened
- **THEN** both system messages are still present in the loaded history in their original position

### Requirement: A new participant is greeted
The chat web application SHALL greet a newly joined participant for everyone in the room with a full-screen celebration and a centred message naming the person, and the greeting SHALL fade away on its own without blocking interaction.

#### Scenario: Celebrating a join
- **WHEN** the room receives the event that a user joined
- **THEN** every connected member sees a confetti effect over the screen and a centred "joined us" message with that person's name, which fades out on its own

#### Scenario: Reduced motion
- **WHEN** the member disabled animations in settings or the system asks for reduced motion
- **THEN** the greeting appears as a plain fading notice with no confetti and no movement

### Requirement: Incoming messages are noticeable outside the open room
The chat web application SHALL make a new message noticeable when the reader is not looking at that room: an unread badge in the room list and on the chats tab, a counter in the browser tab title, and an in-app notice. When the person granted permission and the tab is in the background, the application SHALL also raise a system notification. Nothing SHALL be raised for the reader's own messages or for the room that is currently open and focused.

#### Scenario: Message in another room
- **WHEN** a message arrives in a room the reader is not currently viewing
- **THEN** the unread badge, the tab counter, and the in-app notice reflect it

#### Scenario: Message in the open room
- **WHEN** a message arrives in the room the reader has open and focused
- **THEN** no notice and no badge appear for that room, and the message simply enters the timeline

#### Scenario: Background tab with permission granted
- **WHEN** a message arrives while the tab is in the background and system notifications are permitted
- **THEN** the application raises one system notification naming the room and the author, and activating it opens that room

#### Scenario: Permission not granted
- **WHEN** system notifications are not permitted
- **THEN** the application still shows the in-app notice, badges, and the tab counter, and does not prompt repeatedly
