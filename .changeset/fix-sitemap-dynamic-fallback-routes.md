---
'@astrojs/sitemap': patch
---

Fixes i18n fallback pages for dynamic routes (e.g. `getStaticPaths`) not being included in the generated sitemap when using `fallbackType: 'rewrite'`. Previously, only static routes had their fallback locale URLs added to the sitemap; dynamic route fallbacks were silently skipped because they have no concrete `pathname`. The sitemap integration now expands dynamic fallback routes by matching prerendered page paths against the route pattern and generating the corresponding fallback URLs.
