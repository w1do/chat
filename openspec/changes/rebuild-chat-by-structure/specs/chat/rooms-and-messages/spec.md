## Purpose

Defines persistent room, membership, and message behavior for the core chat experience using permission-safe APIs and durable message storage.

## ADDED Requirements

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
