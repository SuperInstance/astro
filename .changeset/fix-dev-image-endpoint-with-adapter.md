---
'astro': patch
---

Fixes the dev `/_image` endpoint returning 404 when an adapter (like `@astrojs/cloudflare`) replaces the SSR environment with a non-runnable one. The image endpoint now correctly routes through the prerender handler in dev mode, and prerendered endpoints retain their query parameters.
