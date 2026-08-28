## 1. Composer mobile layout

- [x] 1.1 Apply CSS layout fixes for composer container (sticky bottom, safe-area padding, `dvh`) and verify on iOS/Android that the composer remains fully visible when keyboard opens (manual with device/emulator)
- [x] 1.2 Constrain horizontal overflow: set `min-w-0` and `overflow-hidden` on input container; verify no horizontal scroll and buttons stay visible at ≤640px (responsive devtools)
- [x] 1.3 Group action buttons (emoji/AI/send) with `shrink-0` and fixed spacing; verify long input text does not push buttons off-screen (manual test + visual snapshot)
- [x] 1.4 Ensure safe-area compliance with `env(safe-area-inset-bottom)`; verify buttons are not intersecting iOS home indicator (iOS Safari test)

## 2. Invite UI mobile layout

- [x] 2.1 Convert invite UI to full/near-full-screen modal on ≤640px with internal scroll region; verify header/inputs/actions are fully visible without horizontal scroll (responsive devtools)
- [x] 2.2 Make content scrollable with fixed action bar; verify long member lists scroll while actions remain accessible (manual test)
- [x] 2.3 Enforce touch targets ≥44×44 and spacing; verify by inspecting element boxes and manual tap tests (devtools + device)

## 3. Tests and guards

- [x] 3.1 Add component tests for composer overflow constraints (no horizontal scroll, buttons visible) and verify tests pass (Vitest)
- [x] 3.2 Add component tests for invite UI scroll/fixed actions at mobile width and verify tests pass (Vitest)
- [x] 3.3 Add minimal Playwright smoke for mobile composer visibility with keyboard toggle if feasible in CI; verify locally or on CI (Playwright run)

## 4. Accessibility and polish

- [x] 4.1 Validate color contrast and focus outlines for composer/invite on mobile; verify with an accessibility checker and keyboard navigation (manual + tooling)
- [x] 4.2 Confirm no regressions on tablet/desktop; verify by spot-checking breakpoints (responsive devtools)

## 5. Documentation and demo

- [x] 5.1 Update feature docs with mobile UX notes and screenshots; verify docs build passes
- [x] 5.2 Update demo__4.html section after implementation is verified; verify the landing reflects implemented status only
