## Context
- Mobile layout issues in room chats: composer (input + emoji/AI/send) shifts off-screen to the right; invite UI partially off-screen.
- Frontend stack per repo guidelines: React + TypeScript + Tailwind CSS; responsive design with WCAG considerations.
- Real-time and API behaviors are unchanged; this is strictly a UI layout/UX correction on small viewports.

## Goals / Non-Goals

**Goals:**
- Ensure the room composer is fully visible and usable on ≤640px widths.
- Make composer sticky to bottom, keyboard-aware, and safe-area compliant.
- Ensure emoji/AI/send buttons never overflow horizontally; no horizontal scroll.
- Ensure invite UI fits viewport with proper spacing and vertical scrolling for long lists.
- Add minimal tests to prevent regressions on mobile layouts.

**Non-Goals:**
- No behavioral changes to messaging, permissions, or APIs.
- No redesign of desktop/tablet layouts beyond necessary non-breaking CSS tweaks.

## Decisions

1) Layout strategy for composer
- Choice: CSS-first with flex/grid and overflow constraints; avoid JS measurements where possible.
- Rationale: Simpler, robust, testable; avoids Octane/JS runtime coupling; follows “prefer standard capabilities”.
- Details:
  - Container: sticky bottom bar using `position: sticky` within a parent that accounts for bottom safe-area via `padding-bottom: env(safe-area-inset-bottom)`.
  - Use logical viewport units: `100dvh` on mobile containers to avoid iOS 100vh issues; fallback via CSS `@supports`.
  - Prevent horizontal overflow: `min-w-0` on flex children; `overflow-hidden` where necessary; input growing with `flex-1 min-w-0`.
  - Buttons in a fixed-width group (`shrink-0`), input truncates not buttons.

2) Keyboard handling
- Choice: Rely on OS viewport adjustment with dynamic viewport units; no JS resize listeners initially.
- Rationale: Lower complexity; modern browsers adjust layout with `dvh` reasonably well.
- Alternative: JS-based keyboard detection to adjust bottom offset; keep as fallback only if testing reveals issues on specific devices.

3) Safe-area compliance
- Choice: Use CSS environment variables `env(safe-area-inset-*)` to pad bottom and sides when needed.
- Rationale: Standards-based; required for iOS notch/home indicator.

4) Invite UI container behavior
- Choice: Full-screen or near-full-screen modal on mobile (≤640px) with internal scroll region and fixed action bar.
- Rationale: Predictable layout without overflow; familiar mobile pattern.
- Details: Modal wrapper uses `inset-0` with padding via safe-area; content `overflow-y-auto`; footer `sticky bottom-0` with background.

5) Accessibility
- Choice: Maintain minimum 44×44pt touch targets; ensure focus states and readable contrast.
- Rationale: WCAG 2.2 AA alignment.

## Risks / Trade-offs
- iOS Safari keyboard quirks → Mitigation: Prefer `dvh` units; test on iOS; add JS fallback if needed.
- Vendor differences in safe-area handling → Mitigation: Use `env()` with sensible defaults; visual tests on iOS/Android.
- Potential regressions on tablet/desktop due to shared components → Mitigation: Scope CSS to mobile breakpoints (`sm` and below); add visual checks.

## Migration Plan
- Pure CSS/markup changes; no data migrations.
- Rollback: revert CSS/markup to previous version if regressions detected.

## Open Questions
- Do we prefer a compact two-row composer on very narrow screens (<360px) if space is constrained? (Default: keep single-row with truncation and wrapping thresholds.)
