# 🚀 Astro Island Build Guardian

**Show, don't sell.** This guardian profiles Astro's island architecture output — measuring hydration scripts, static assets, and per-page weight against conservation budgets.

## What It Does

| Phase | Action |
|-------|--------|
| **Budget** | Sets limits: total build (20MB), per-page HTML (200KB), island JS (100KB), CSS (50KB), assets (2MB) |
| **Profile** | Walks `dist/`, categorizes every file as HTML/JS/CSS/asset |
| **Detect** | Flags bloated islands, heavy pages, oversized assets |
| **Report** | Human-readable table + JSON for CI integration |

## Quick Start

```bash
# From the Astro repo root (after build)
npx tsx guardian/island-build-guardian.ts packages/astro/test/fixtures/basic/dist/

# With custom budgets
MAX_TOTAL_BUILD_MB=10 MAX_ISLAND_JS_KB=50 npx tsx guardian/island-build-guardian.ts dist/
```

## Sample Output

```
═══════════════════════════════════════════════
  🚀 Astro Island Build Guardian Report
═══════════════════════════════════════════════
  Total     : 2.14 MB

  ── By Category ──
    asset       3 files       1.80 MB
    js          5 files       0.28 MB
    html        2 files       0.04 MB
    css         1 files       0.02 MB

  ── Top 10 Largest Files ──
       1.20 MB  [asset]  images/hero.webp
       0.15 MB  [js]     _astro/island-counter.js
       0.04 MB  [html]   index.html
       ...

  ✅ All islands within conservation budget.
═══════════════════════════════════════════════
```

## Budget Defaults

| Metric | Default | Env Override |
|--------|---------|-------------|
| Total build | 20 MB | `MAX_TOTAL_BUILD_MB` |
| Per-page HTML | 200 KB | `MAX_PAGE_KB` |
| Island JS | 100 KB | `MAX_ISLAND_JS_KB` |
| CSS per file | 50 KB | `MAX_CSS_KB` |
| Asset per file | 2 MB | `MAX_ASSET_MB` |

## Tests

```bash
npx vitest run guardian/island-build-guardian.test.ts
```
