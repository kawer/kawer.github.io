# Validation

Reviewed 13 November 2026 against the generated static site. No production deployment or merge was performed.

## Automated checks

- `npm run check`: ESLint, TypeScript checking of JavaScript, static build, and Node tests pass.
- Five Node assertions cover primary routes and metadata, every generated HTML link/resource and fragment, unpublished-file exclusion, unchanged résumé bytes and custom-domain files, and an isolated editorial fixture with draft exclusion, escaped HTML, code blocks, and rendered accessible mathematics.
- `npm run test:browser`: 26 Chromium cases across desktop and emulated iPhone viewports cover all five primary pages, three work pages, the legacy article notice, and the 404 page. Each page receives a WCAG 2 A/AA and WCAG 2.1 AA axe scan plus overflow and runtime-error checks. Navigation, keyboard skip link, widths of 320/768/1280 pixels, and the absence of client scripts or third-party requests are also checked.
- `npm audit`: zero dependency advisories after upgrading KaTeX. Markdown raw HTML is disabled and KaTeX trust is disabled.

Screenshots are generated for ten routes at desktop and mobile widths. Local review artifacts are in `/workspace/artifacts`; CI uses `artifacts/` and uploads them as a workflow artifact. They are excluded from the deployment.

## Defects found and fixed

- The mobile brand link lost its accessible name when its visible text was hidden. An explicit accessible label fixes it.
- Résumé email links duplicated the mailto scheme. Links now use the verified source URL directly.
- Diagonal arrow characters rendered as missing glyphs in the test environment. Inline SVG replaces them.
- The former deployment uploaded the whole repository. Deployment now uses an explicit generated output and asset allowlist; draft sources never reach that directory.
- The legacy essay contains material requiring disclosure review. Its route serves a safe review notice rather than republishing the source.
- Social metadata now uses a PNG card for crawler compatibility.
- The initial hosted CI run found a path assertion matching the repository name in its parent directory. Publication-boundary checks now inspect paths relative to the deployment directory.

## Performance and browser scope

The homepage has no client JavaScript, remote fonts, analytics, or third-party requests. At review, homepage HTML is approximately 8.4 KB (2.2 KB gzipped) and the stylesheet approximately 14.7 KB (3.7 KB gzipped). These are local file measurements; hosting compression and caching depend on GitHub Pages. The social card is approximately 36 KB and is not a homepage render dependency. Mathematical styles load only when required by article content.

No production Core Web Vitals claim is made. Field LCP, INP, and CLS require actual deployed traffic and were not measured here. No tracking was added. Browser automation uses Chromium, including mobile emulation; Safari, Firefox, actual iOS hardware, assistive-technology behavior, and social-platform crawler rendering were not independently exercised.

## Content and deployment review

Public summaries were checked against the existing public résumé and website. Employment roles, internship status, and education are preserved. Published work pages explicitly identify themselves as short public overviews. Detailed architecture, evaluation protocols, metrics, and business information remain unpublished pending review. No new article is represented as previously published. The original résumé PDF is byte-identical.

The sitemap contains public routes only. Legacy review notices and 404 have noindex metadata. Canonical links, social metadata, a custom favicon, robots.txt, CNAME, and the static GitHub Pages workflow are present. Pull-request validation has no production deployment step; production deployment remains restricted to master pushes. Final GitHub-hosted workflow success must be checked on the PR before merge.
