# AGENTS.md — Roleplay Hub

## Architecture

- **Zero build tools.** No `package.json`, no bundler, no `npm install`. Open `index.html` directly in a browser.
- All dependencies loaded via CDN: Vue 3, Tailwind CSS, marked, DOMPurify, SortableJS, localforage.
- Two independent SPAs share JS utilities:
  - `index.html` — main hub, powered by `assets/js/app.js` (~12K lines monolithic Vue app)
  - `character/index.html` — character card workshop, self-contained inline Vue app; uses DaisyUI "cupcake" theme

## JS file loading order (critical)

In `index.html`, scripts must load in this order:
1. `assets/js/utils.js` — pure globals (`generateUUID`, `formatTimeAgo`, `parseCot`)
2. `assets/js/card-utils.js` — IIFE, exposes `window.RPHubCardUtils`
3. `assets/js/ui-select.js` — IIFE, exposes `window.RPHubCustomSelect`
4. `assets/js/app.js` — main Vue app via `createApp()`, registers `CustomSelect` component

`character/index.html` only loads `card-utils.js` and `ui-select.js` (from `../assets/js/`).

## Development

- No linter, no typecheck, no tests. Make changes in the JS files directly and reload the browser to verify.
- `app.js` uses Vue 3 Options API (`setup()` returning reactive state). State is persisted via `localforage` (IndexedDB).
- `card-utils.js` handles character card v2/v3 spec import/export, PNG embedding, image compression.
- `assets/css/styles.css` is cache-busted via a timestamp query string in `index.html`.
- Respect existing patterns: `Proxy` wrappers for deferred module access, `window.RPHub*` namespacing for shared libs.

## Deployment

```sh
npm install -g pinme
pinme login
pinme upload .
```

## Conventions

- UI language is zh-CN. Comments may be Chinese or English.
- Main app uses raw Tailwind. Only `character/index.html` uses DaisyUI components.
- License: CC BY-NC 4.0 — no commercial use.
