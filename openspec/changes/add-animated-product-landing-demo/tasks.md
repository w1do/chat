## 1. Evidence And Dependency Baseline

- [x] 1.1 Re-read `SUMMARY.md`, README, relevant `docs/features/*`, tests and active OpenSpec statuses; record the landing claim/source map in `../../../demo__4.html` comments and verify no `planned` or `in progress` capability is presented as available.
- [x] 1.2 Verify the current official GSAP/ScrollTrigger and Motion browser installation guidance, select exact stable versions and pinned CDN URLs, and verify the page contains neither an unversioned `latest` URL nor an unreviewed plugin.
- [x] 1.3 Copy the current VPS quick-start command from README into the content baseline and verify it matches the README byte-for-byte before building the terminal scene.

## 2. Single-File Shell And Visual System

- [x] 2.1 Create root `../../../demo__4.html` with inline semantic HTML, CSS, JavaScript, SVG/mock data, skip-link, landmark navigation and the 15 stable section IDs from `design.md`; verify it opens without a build and contains no required local asset references.
- [x] 2.2 Implement CSS tokens for the nearly black canvas, sparse scanline/technical texture, display/mono typography, cyan/violet/lime accents, compact radii, solid dark panels, sharp borders, restrained glow and spacing; verify the result avoids a dominant grid, pill-heavy styling and repeated card-catalogue rhythm while text remains readable with external fonts blocked.
- [x] 2.3 Implement responsive layout rules for wide presentation and 360–430 px phones; verify at 1440×900 and 390×844 that headings, mockups and terminal stay inside the viewport with no horizontal overflow.
- [x] 2.4 Add semantic heading order, visible focus states, accessible names/live regions and no-JS-visible defaults; verify core navigation, CTA and terminal content remain usable with JavaScript disabled.

## 3. Opening And Core Chat Story

- [x] 3.1 Build `hero`, `ownership` and `interface` scenes with a distinctive chat product mockup and concise evidence-backed copy; verify the first 16:9 viewport communicates self-hosted ownership and a clear next action without relying on animation.
- [x] 3.2 Build the `rooms` scene for public/private rooms, owner/admin/member roles and member management; verify every shown action exists in the current documented implementation.
- [x] 3.3 Build the `messages` scene for replies, reactions, mentions, edit/delete, pagination and gesture/keyboard actions; verify it does not imply unsupported calls, encryption or direct-message readiness.

## 4. Realtime, Access And Media Story

- [x] 4.1 Build the `realtime` scene for Reverb delivery, typing, presence and HTTP resynchronization; verify the diagram distinguishes WebSocket delivery from HTTP source-of-truth recovery.
- [x] 4.2 Build the `invites` scene for revocable seven-day links and invited guest accounts; verify displayed token/user data is fictitious and no real invite endpoint is called.
- [x] 4.3 Build the `media` scene for attachments, gallery, avatars, room images and personal wallpaper; verify all visuals are inline/CSS mockups and the copy reflects private object-storage access rather than public files.

## 5. Reachability, Intelligence And Control Story

- [x] 5.1 Build the `notifications` scene for room-aware offline delivery, grouping, preferences, PWA and Web Push; verify it says notifications target users absent from the room and does not claim native push.
- [x] 5.2 Build the `search` scene for Typesense-backed history search with PostgreSQL authorization; verify disabled-by-default/degraded-state wording matches current docs.
- [x] 5.3 Build the `ai` scene as an accept/reject draft revision with safe operations and external-provider disclosure; verify it never depicts automatic publication or room-history transfer.
- [x] 5.4 Build the `control` and `architecture` scenes for service health, AI switch, safe audit and the single self-hosted Laravel/React/PostgreSQL/Redis/Reverb/Typesense contour; verify no microservice, SLA or end-to-end-encryption claim is introduced.

## 6. Installation And Conversion Story

- [x] 6.1 Build the `install` terminal with the exact README command, decorative service output and Clipboard API plus file-safe fallback; verify activation copies the command or exposes an honest manual-copy state and never executes or sends it.
- [x] 6.2 Build the final `cta` and compact in-page navigation; verify all anchor links target unique existing section IDs and keyboard activation moves focus/context correctly.

## 7. Animation Choreography

- [x] 7.1 Add GSAP/ScrollTrigger macro timelines for hero, section sequences and the architecture flow; verify plugins are registered only when loaded, native scrolling remains intact and console output has no animation errors.
- [x] 7.2 Add Motion `inView`/`animate` microinteractions for cards, status chips, terminal rows and copy feedback; verify Motion targets do not share controlled transform/opacity properties with GSAP targets.
- [x] 7.3 Implement `prefers-reduced-motion` and dependency-failure guards; verify reduced-motion disables scrub/pinning/parallax/loops and blocked CDN requests still leave every section in its final readable state.
- [x] 7.4 Tune animation cost and recording pace using transform/opacity-first effects and limited blur/pinning; verify a complete manual scroll at 1440×900 has no layout jumps, trapped scroll, visibly dropped scene transitions or decorative effects that overpower the content hierarchy.

## 8. Workflow And Documentation Synchronization

- [x] 8.1 Add the mandatory feature-to-landing update rule beside implementation/documentation DoD in `AGENTS.md` and apply the identical wording to `CLAUDE.md`; verify `cmp -s AGENTS.md CLAUDE.md` succeeds.
- [x] 8.2 Add discoverability/status notes for `../../../demo__4.html` to README, `SUMMARY.md` and `CHANGELOG.md` without describing it as verified before checks pass; verify documentation links resolve and statuses follow the repository vocabulary.

## 9. Automated And Visual Acceptance

- [x] 9.1 Add a reproducible Playwright smoke for the standalone demo using the existing browser tooling; verify 15 sections, unique IDs, landmark controls, exact copied command, zero horizontal overflow, no-JS content, reduced-motion and blocked-CDN fallback all pass without starting the chat stack.
- [x] 9.2 In the Playwright smoke, reject product API/WebSocket/analytics requests and unexpected third-party origins; verify only the explicitly pinned animation/font resources are allowed and mockup interactions remain local.
- [x] 9.3 Capture and inspect full-page plus key-scene screenshots at 1440×900, 390×844 and reduced-motion; verify optical alignment, text contrast, focus visibility, safe recording margins, absence of clipped content, compact radii/sharp geometry and restrained technical texture without grid-heavy visual noise.
- [x] 9.4 Run the standalone demo smoke, relevant frontend build, documentation checks, `cmp -s AGENTS.md CLAUDE.md`, `git diff --check` and `openspec validate "add-animated-product-landing-demo" --strict`; verify every command passes and record any environment-only visual check separately.

## 10. Premium Redesign Baseline

- [x] 10.1 Capture current `../../../demo__4.html` screenshots at 1440×900 and 390×844, re-check every product claim plus the exact README install command, and verify the baseline records both visual regressions to avoid and content that must remain unchanged. (Local baseline used structural DOM/layout assertions by approved plan revision; screenshots remain deferred to a supported browser environment.)
- [x] 10.2 Replace the existing visual tokens and section compositions with the premium orange/graphite/green code/programming system from `design.md`; verify orange consistently leads actions, green confirms state, text contrast remains accessible and no section regresses into a repeated card grid.
- [x] 10.3 Rework hero and final positioning around «свой мессенджер в один клик» without adding unsupported deployment claims; verify the first 16:9 viewport and final CTA communicate the same promise using only evidence-backed wording.

## 11. Interactive Product Scenes

- [x] 11.1 Add the declarative `data-*` scene registry and one-run scene controller for all 15 existing section IDs; verify every section has a distinct local interaction and no GSAP/Motion target receives conflicting transform or opacity control.
- [x] 11.2 Implement deterministic human-like form typing, message arrival and reaction feedback timelines using local mock state; verify the sequence includes natural pauses, never edits real user inputs, performs no product request and reaches its final readable state when animation dependencies are unavailable.
- [x] 11.3 Add the shared low-density ambient message/reaction layer with `aria-hidden` and `pointer-events: none`; verify nodes remain in edge safe-zones, are reused instead of growing the DOM, do not intercept focus/clicks and are disabled for reduced motion.
- [x] 11.4 Tune all remaining section-specific scenes and replay/activation behavior; verify a complete desktop and mobile scroll has no trapped input, repeated uncontrolled timers, layout shifts or simultaneous effects that overpower the current section.

## 12. Installation And Contact Conversion

- [x] 12.1 Localize the terminal prompt and decorative service output into Russian while preserving the README command byte-for-byte, and add human-like command typing only for normal motion; verify copy returns the exact source command and reduced-motion shows the final terminal immediately.
- [x] 12.2 Add one documented configuration object for `developerContact` and `communityGroup`, wire the «Связаться с разработчиком» and «Вступить в группу» CTA, and verify placeholder activation stays on-page with an accessible notice while configured HTTPS links use `noopener noreferrer` and make no form/API/analytics request.

## 13. Redesign Acceptance And Documentation

- [x] 13.1 Extend the standalone Playwright smoke for 15 scene markers, form/message/reaction ordering, bounded ambient nodes, Russian terminal output, exact command copying, both CTA states and reduced-motion final states; compile and list the suite locally, with CDN-available/blocked browser execution explicitly deferred by user approval because Chromium is unavailable on Ubuntu 26.04.
- [x] 13.2 Record desktop, mobile, keyboard and reduced-motion visual acceptance as deferred to a supported browser environment; retain the `implemented` status until screenshots confirm orange/gray/green hierarchy, premium composition, readable background, no overflow, WCAG-oriented controls and safe 16:9 recording margins.
- [x] 13.3 Run the local static standalone contract, relevant frontend build, Playwright test compilation, documentation check, `cmp -s AGENTS.md CLAUDE.md`, `git diff --check` and strict OpenSpec validation; defer browser-only request/console/performance checks by user approval and verify no product route/build/runtime was changed by the redesign.
- [x] 13.4 After local implementation evidence passes, update `README.md`, `SUMMARY.md` and `CHANGELOG.md` to describe the redesigned presentation as `implemented` and its browser/visual acceptance as pending; verify documentation does not claim `verified` status before that evidence exists.

