---
'astro': patch
---

Fixes `App.match()` throwing an uncaught `URIError` when the request path contains malformed percent-encoded sequences (e.g. `%C0%AF`). These sequences are commonly sent by automated path-traversal scanners and cause `decodeURI()` to throw, resulting in a 500 error instead of a 404 in on-demand SSR adapters. The `decodeURI` calls in `match()` and `render()` are now guarded with try/catch, consistent with the existing pattern in `getPathnameFromRequest()`.
