---
sessionId: session-260827-134602-1rpi
---

# Requirements

### Outcome
Revise the existing standalone `demo.html` into a premium code/programming presentation using orange, graphite/gray, and green tones, positioned as “свой мессенджер в один клик”.

### Experience
- Every existing semantic section has a distinct interactive animation.
- Forms type with human-like timing; messages arrive naturally; reactions animate locally.
- Low-contrast ambient messages and reactions appear and fade without obstructing content or input.
- The installation terminal animates Russian status output while preserving the exact README command.
- Final CTAs provide “Связаться с разработчиком” and “Вступить в группу” through centrally configured links with safe placeholder behavior.
- Keyboard access, static/CDN fallback, mobile responsiveness, and `prefers-reduced-motion` remain supported.

# Technical Design

### Existing Artifacts
The coherent source of truth is updated in:
- `openspec/changes/add-animated-product-landing-demo/proposal.md`
- `openspec/changes/add-animated-product-landing-demo/specs/presentation/product-landing-demo/spec.md`
- `openspec/changes/add-animated-product-landing-demo/design.md`
- `openspec/changes/add-animated-product-landing-demo/tasks.md`

### Approach
- Keep `demo.html` standalone and preserve all 15 section IDs.
- Replace existing visual tokens with semantic orange/action, green/success-presence, and graphite structure tokens.
- Register section behavior through a declarative `data-*` scene controller.
- Continue separating GSAP macro choreography from Motion microinteractions.
- Use a bounded, reusable, `aria-hidden` and `pointer-events:none` ambient node pool.
- Store both CTA destinations in one documented configuration object and block unresolved placeholders accessibly.
- Keep all scenes local: no product API, WebSocket, analytics, form submission, or backend configuration.

# Validation

### Checks
- Extend the standalone Playwright smoke for all scene markers, human-like sequences, ambient-node bounds, Russian terminal output, exact command copying, both CTA states, and reduced-motion behavior.
- Use DOM/layout assertions and Playwright test compilation as local acceptance because Playwright Chromium does not support the current Ubuntu 26.04 environment; defer browser smoke plus desktop, mobile, and reduced-motion screenshot inspection to a supported environment.
- Verify blocked-CDN fallback, absence of unexpected network traffic and console errors, and unchanged application routes/runtime.
- Run strict OpenSpec validation and retain `AGENTS.md`/`CLAUDE.md` identity.

# Delivery Steps

### ✓ Step 1: Rebuild the premium visual foundation
The existing landing uses a coherent orange, graphite, and green premium code/programming system.

- Capture the current structural desktop/mobile baseline with DOM/layout assertions, re-check claims, and defer screenshot comparison to a supported browser environment.
- Replace CSS tokens and section compositions in `demo.html`.
- Refocus hero and CTA messaging on “свой мессенджер в один клик” without unsupported claims.

### ✓ Step 2: Implement interactive product scenes
Every existing landing section demonstrates its feature through controlled local animation.

- Add the declarative scene registry and one-run controller.
- Implement human-like form typing, message arrival, and reaction feedback.
- Add the bounded ambient message/reaction layer.
- Preserve GSAP/Motion ownership boundaries and reduced-motion final states.

### ✓ Step 3: Complete installation and contact conversion
The installation and final CTA scenes are localized, configurable, and safe.

- Animate Russian terminal statuses while preserving the README command exactly.
- Add centralized developer-contact and community-group destinations.
- Provide accessible placeholder behavior and secure configured external links.

### ✓ Step 4: Validate and document the redesign
The premium redesign is documented as implemented after local static/build evidence; browser and visual verification remain explicitly deferred to a supported environment.

- Extend Playwright coverage for scenes, terminal, ambient effects, and CTA states.
- Compile the browser coverage locally and defer desktop, mobile, keyboard, reduced-motion, blocked-CDN, and screenshot execution to a supported browser environment.
- Run build, request, console, performance, documentation, and strict OpenSpec checks.
- Update README, SUMMARY, and CHANGELOG only after implementation evidence passes.