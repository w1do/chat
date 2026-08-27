---
sessionId: session-260827-181819-165n
---

# Requirements

### Overview & Goals
Fix mobile layout in room chats where the message composer (input, emoji, AI, send) shifts off-screen to the right; ensure invite UI is fully visible on small screens. Deliver a minimal, robust CSS-first solution with tests.

### Scope
- In Scope:
  - Mobile layout of room composer: visibility, sticky bottom, keyboard awareness, safe-area.
  - Layout of action buttons: prevent horizontal overflow at ≤640px.
  - Invite UI on mobile: viewport fit, internal scroll, fixed action bar, touch target sizes.
  - Minimal component and Playwright/Vitest checks to prevent regressions.
- Out of Scope:
  - Server/API changes, messaging logic, permissions, desktop redesign.

### User Stories
- As a mobile user in a room, I want the composer and action buttons to stay visible so I can send messages.
- As a moderator on mobile, I want the invite UI to fit the screen so I can add members without horizontal scrolling.

### Functional Requirements
- Composer remains fully visible and accessible at ≤640px; no horizontal scroll.
- Composer sticks to screen bottom, adjusts with keyboard, respects safe-area insets.
- Emoji/AI/Send buttons remain visible; long input content does not push them off-screen.
- Invite UI fits the viewport on mobile, uses internal vertical scroll for long lists, with fixed actions.
- Touch targets at least 44×44pt; accessible focus/contrast preserved.

### Non-Functional Requirements
- No noticeable layout jank when keyboard opens/closes.
- WCAG 2.2 AA for touch sizes and focus visibility on affected UI only.

# Technical Design

### Current Implementation
- Frontend: React + TypeScript + Tailwind CSS (per repo stack). Real-time/API behavior unchanged; issue is mobile layout in room composer and invite UI.

### Key Decisions
- CSS-first fix using flex/grid and overflow constraints; avoid JS where possible for robustness.
- Use `position: sticky` and `padding-bottom: env(safe-area-inset-bottom)` for bottom attachment and iOS safe-area.
- Prefer `100dvh`/`dvh` for viewport height handling; fall back when unsupported.
- Group action buttons in a non-shrinking container; make input `flex-1 min-w-0` to prevent push-off.
- Invite UI as full/near-full-screen modal on ≤640px with internal scroll and fixed footer actions.

### Proposed Changes
- Composer container: sticky at bottom within chat view; safe-area padding; prevent horizontal overflow with `min-w-0` on flex children.
- Action buttons: `shrink-0` group; input truncates/wraps before buttons overflow.
- Keyboard: rely on dynamic viewport units; only add JS fallback if device testing requires it.
- Invite UI: mobile modal wrapper with `inset-0`, safe-area padding, `overflow-y-auto` content, `sticky bottom-0` action bar.

### Data Models / Contracts
- None; UI-only changes.

### File Structure
- Update chat room screen components (composer/action bar, invite modal/sheet) and Tailwind classes in frontend package/app.

### Risks
- iOS Safari keyboard quirks → mitigate with `dvh` units; add fallback only if needed.
- Potential regressions on tablet/desktop → scope styles to mobile breakpoints and test.

# Specs

This plan is backed by two capability delta specs created under the change:
- specs/chat/rooms/mobile-composer-ux/spec.md — mobile composer visibility, sticky bottom, buttons layout, safe-area, keyboard handling.
- specs/chat/rooms/mobile-invite-ux/spec.md — mobile invite viewport fit, internal scroll, fixed actions, touch targets, safe-area.

Each spec defines ADDED requirements with testable scenarios (WHEN/THEN) to validate the fix.

# Testing

### Validation Approach
- Component tests (Vitest/Testing Library) for overflow behavior and fixed action bars at mobile widths.
- Optional Playwright smoke for composer visibility with keyboard toggle on mobile emulation.

### Key Scenarios
- Composer visible at ≤640px; no horizontal scroll; buttons remain visible under long input.
- Composer remains usable when keyboard opens; safe-area respected on iOS.
- Invite UI fits viewport; long lists scroll while actions remain fixed; touch targets ≥44×44pt.

### Edge Cases
- Extremely narrow screens (<360px): input truncation without hiding buttons.
- Long localized labels; RTL layouts if applicable.

# Delivery Steps

### * Step 1: Create proposal and capability specs
Proposal and delta specs exist describing mobile composer and invite UI requirements.
- Write `openspec/changes/fix-mobile-room-chat-composer-layout/proposal.md` capturing why/what and list two new capabilities.
- Add `specs/chat/rooms/mobile-composer-ux/spec.md` with ADDED requirements and scenarios.
- Add `specs/chat/rooms/mobile-invite-ux/spec.md` with ADDED requirements and scenarios.
- Verify artifacts with `openspec status`.

###   Step 2: Write technical design
Design document explains CSS-first approach and decisions.
- Document sticky bottom + `dvh` + safe-area handling for composer.
- Define layout rules to avoid horizontal overflow and keep buttons visible.
- Define invite UI mobile modal with internal scroll and fixed footer.
- List risks and mitigations.

###   Step 3: Break down implementation tasks
Trackable, verifiable checklist for implementation and tests.
- Add tasks for composer CSS fixes, overflow constraints, safe-area padding.
- Add tasks for invite UI modal layout, scroll region, fixed actions, touch sizes.
- Add tasks for component tests and optional Playwright smoke.
- Add tasks to update docs and demo after verification.