# Skill: source-copy

This skill describes the **precise transfer** of ready-made layouts from the reference template in the `source/` folder to the project's current frontend. Trigger — commands like "transfer the `dashboard` page", "copy the `LoginPage` layout", "build a page from the `source/...` template", "transfer a block from source".

> Core Principle: **Block by block, to every detail**. Do not add anything yourself — no styles, no blocks, no new sections. You are allowed to change **only texts** (to English or Russian as requested), asset paths, and syntax for the target stack (e.g., `class` → `className`). Design, Tailwind classes, order, and nesting of markup remain identical to the reference.

---

## 0. Target Stack (Where we transfer to)

The project uses **Laravel + Inertia + React + TypeScript** (see `AGENTS.md`, `DESIGN_UI.md`). All layouts live in `resources/js`:

- **Pages:** `resources/js/Pages/{Name}.tsx` — rendered via `Inertia::render()` on the backend.
- **Components:** `resources/js/Components/**` (shared) and `resources/js/Pages/{Module}/Components/**` (local to a module).
- **Layouts:** `resources/js/Layouts/AuthenticatedLayout.tsx` (dashboard) and `resources/js/Layouts/GuestLayout.tsx` (guest/auth).
- **Import Alias:** `@/` → `resources/js` (e.g., `@/Components/...`, `@/Layouts/...`).
- **Icons:** `lucide-react`.
- **Styles:** Tailwind CSS v4 (see `tailwind.config.js`, `DESIGN_UI.md`).
- **Title / SEO:** `Head` component from `@inertiajs/react`.
- **Assets:** `public/` (absolute paths starting with `/`).
- **Build/Check:** `npm run build`.

---

## 1. Source (Where we transfer from) — Universal for any frontend

The reference is located in `source/`. Its format **can be anything**, so first determine the source type and work with it accordingly:

| Source Format | Look & Feel | What to Transfer |
|---|---|---|
| Clean HTML | `source/*.html`, blocks marked by `<!-- X Start --> ... <!-- X End -->` | HTML markup and classes as-is |
| React / Vite (TSX/JSX) | `source/src/pages/**`, `source/src/components/**` | JSX markup and classes as-is |
| Astro | `source/src/**/*.astro` | HTML part from the `.astro` template |
| Vue / Other | `*.vue` etc. | `<template>` markup and classes as-is |

Determine the format by file extensions in `source/` (`.html`, `.tsx/.jsx`, `.astro`, `.vue`) and by structure (`source/src/pages`, `source/src/components`, `source/public/assets`). The algorithm remains the same — only the way to "read a block" from the source changes.

---

## 2. Hard Rules (Do not break)

- ❌ **Do not add** new blocks, sections, wrappers, `div`s, classes, attributes, or inline styles.
- ❌ **Do not fix** or "improve" the layout, classes, spacing, or element order.
- ❌ **Do not rewrite** Tailwind/utility classes of the source — transfer them **as-is**.
- ❌ **Do not invent** content outside the project's theme.
- ✅ **You may** change only visible text and `alt`/`title`/`placeholder`.
- ✅ **You may** fix asset paths under `public/`: `assets/...`/`images/...` → `/assets/...` (or `/images/...`) — absolute paths.
- ✅ **You must** adapt syntax for React/TSX: `class` → `className`, `for` → `htmlFor`, inline styles → `style={{ ... }}` object, self-closing tags, camelCase attributes, `{/* ... */}` for comments.
- ✅ Structure, nesting, and sequence of blocks — **identical** to the original.

Correspondence is checked literally: if you remove the text, the markup of the transferred components and the reference markup must match block by block.

---

## 3. Transfer Algorithm

### Step 1. Reference Analysis
1. Determine the source format (see Section 1) and open the necessary file(s) in `source/` entirely.
2. Determine the `slug`/page name: e.g., `LoginPage.tsx` → `Login`, `dashboard` → `Dashboard`, `about.html` → `About`.
3. Identify page boundaries and all content blocks inside:
   - for HTML — by pairs of comments `<!-- X Start --> ... <!-- X End -->`;
   - for TSX/JSX/Astro/Vue — by logical markup sections (usually top-level `section`/`div` or separate components).

### Step 2. Block Mapping
Create a list of blocks in order:
- `Header` / Navigation → shared component (reuse existing from `resources/js/Components`, do not duplicate).
- `Hero` → `resources/js/Components/{Module}/{Module}Hero.tsx` (or local in `Pages/{Module}/Components`).
- `... Section` → separate block component.
- `Footer` → shared component, reuse.

Before creating any component, **check if a ready-made one exists** in `resources/js/Components/**` — if it does, reuse it.

### Step 3. Component Creation (Block by Block)
For each content block, create a `.tsx` component:
- In the body — **exact copy of the markup** from the reference, adapted for JSX (see Section 2).
- Type `props` via `interface` only if the block actually requires data.
- Asset paths are made absolute (`/assets/...`, `/images/...`), files are placed in `public/`.
- Icons are replaced with equivalents from `lucide-react` if icon sets were used in the source.

### Step 4. Page Assembly
Create `resources/js/Pages/{Name}.tsx`:
- Wrap in a suitable layout: `AuthenticatedLayout` (dashboard) or `GuestLayout` (guest).
- Add `<Head title="..." />` from `@inertiajs/react`.
- Import shared components and created blocks via the `@/` alias.
- Place components **in the exact order** of the reference.
- Ensure there is a route and `Inertia::render()` on the backend.

### Step 5. Forms and Interactivity
- Transfer forms to Inertia: `useForm` from `@inertiajs/react` (submit to a named route via `route()`), not as static HTML.
- Form location and markup match the reference; only the submission/validation wrapper changes.
- Client-side logic (tabs, accordions, toggles) transfer to React hooks (`useState` etc.), preserving markup.

### Step 6. Verification
1. Compare the sequence and composition of page blocks with the reference — one to one.
2. Ensure no extra or missing blocks.
3. Run `npm run build` — the build must pass without TypeScript errors.

---

## 4. Naming and Structure

- Shared reusable blocks: `resources/js/Components/{Name}.tsx` (or subfolder, e.g., `Components/Dashboard/StatCard.tsx`).
- Module-local blocks: `resources/js/Pages/{Module}/Components/{Module}{Block}.tsx`.
- Shared blocks (`Header`, `Footer`, Navigation) — reused, **not duplicated**.
- Component name — `PascalCase`, reflects the block's essence with a module prefix where appropriate.
  - ✅ `ContentFeatureCard.tsx`, `ReferralLinkCard.tsx`, `DashboardFooter.tsx`
  - ❌ `Block1.tsx`, `Section.tsx`
- Break large blocks into components to avoid long files.
- File extension — `.tsx` (not `.jsx`, not `.astro`).

---

## 5. Termination Checklist

- [ ] Source format determined, layout read from `source/` entirely.
- [ ] All reference blocks transferred, no extra ones.
- [ ] Markup identical to original (matches block by block ignoring text).
- [ ] Syntax adapted for React/TSX (`className`, `htmlFor`, `style={{}}`, self-closing tags).
- [ ] Shared components (`Header`/`Footer`/Navigation) reused, not duplicated.
- [ ] Forms translated to Inertia `useForm`, interactivity to React hooks.
- [ ] Asset paths absolute (`/assets/...`, `/images/...`), files in `public/`.
- [ ] Page wrapped in correct layout and contains `<Head title="..." />`.
- [ ] `npm run build` passes successfully.
- [ ] Changes documented using the `.ai/skills/documentation/SKILL.md` skill.
