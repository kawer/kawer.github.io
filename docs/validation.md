# Validation

## Content withdrawal — 18 November 2026

Engineering Work and Writing are removed from the homepage, shared navigation, generated routes, and sitemap. Legacy blog routes are also absent. The former work overviews are drafts and the build no longer loads either collection. Existing route/resource checks now cover Home, About, and Résumé; publication-boundary checks also reject retired route files and links. Browser coverage retains the scroll morph, docking, native input, accessibility, responsive layouts, and static fallbacks, with the direct scroll anchor updated to Background. Tests check that retired URLs return 404. The previous full-release measurements below describe the initial version.

`npm run check` passes, including all seven Node tests. All 28 desktop/mobile Chromium tests pass, with zero violations across 12 axe scans. Testing found that the shorter desktop page could end before the orb finished docking; its endpoint now respects the available native scroll distance. No extra scrolling space is added. Updated desktop/mobile screenshots are captured by the browser suite.

Reviewed 16 November 2026 against the control-free scroll-morph design. No production deployment or merge was performed.

## Automated checks

- `npm run check`: ESLint, TypeScript checking of JavaScript, static build, and Node tests pass.
- Seven Node assertions cover primary routes and metadata, generated HTML links/resources and fragments, unpublished-file exclusion, unchanged résumé bytes and custom-domain files, safe Markdown/code/math rendering, and geometry. Geometry checks verify matching sampling counts, finite normalized coordinates, deterministic sphere/name surfaces, safe sphere projections across representative orientations, and front-facing lettering within the canvas.
- `npm run test:browser`: 42 Chromium cases pass across desktop and emulated iPhone viewports. They cover all five primary pages, three work pages, the legacy article notice, and the 404 page. Twenty-four page/scroll-state/viewport scans found zero WCAG 2 A/AA and WCAG 2.1 AA axe violations. Navigation, keyboard skip link, responsive widths, local-only requests, and script-free reading pages are checked.
- The artwork is decorative, non-focusable, and transparent to pointer input. There are no artwork buttons, selectors, captions, drag handlers, or automatic rotation. An instrumented check confirms no continuing animation-frame loop when the page is idle.
- Native wheel, PageDown, direct scroll positioning, and touch scrolling remain functional. Scroll progress reverses deterministically: returning to the same offset restores the same rendered pixels. The original orb remains intact until it is fully visible on short/mobile layouts.
- The wordmark docks within the ordinary home link, clear of navigation. Actual mouse and mobile taps on the docked mark navigate home. All three work rows on both Home and Work remain clickable/tappable through their arrows and descriptions and keyboard-operable through their native anchors.
- Direct section-anchor loads, reload scroll restoration, and resizing between phone, tablet, and landscape viewports recompute placement correctly. Tests verify full-orb clearance before morphing at 320×900, 390×900, 768×900, 844×390, 736×414, and 390×844, plus dock/header bounds and navigation separation.
- Reduced motion uses the static sphere and ordinary text brand throughout scrolling. The same content, native links, and static artwork remain available without JavaScript.
- `npm audit`: zero dependency advisories after upgrading KaTeX. Markdown raw HTML is disabled and KaTeX trust is disabled.

Screenshots cover ten routes at desktop and mobile widths, plus initial, midway, and docked scroll states. Local review artifacts are in `/workspace/artifacts/scroll-brand`; CI uses `artifacts/` and uploads screenshots as a workflow artifact. An eight-second MP4 preview (`mobile-scroll.mp4`, 390×844, 24 fps) shows scripted native scrolling of the actual built page forward, docked, and backward. These artifacts are excluded from deployment.

## Defects found and fixed

- The mobile brand link lost its accessible name when its visible text was hidden. An explicit accessible label fixes it.
- Résumé email links duplicated the mailto scheme. Links now use the verified source URL directly.
- Diagonal arrow characters rendered as missing glyphs in the test environment. Inline SVG replaces them.
- The former deployment uploaded the whole repository. Deployment now uses an explicit generated output and asset allowlist; draft sources never reach that directory.
- The legacy essay contains material requiring disclosure review. Its route serves a safe review notice rather than republishing the source.
- Social metadata uses a PNG card for crawler compatibility.
- Independent review caught a readiness-attribute mismatch that left the static fallback visible beneath the moving canvas; both now use the same attribute. The canvas container is square to preserve the surface proportions.
- Hero text remains selectable while the artwork stays interactive.
- Artwork controls and interactive canvas semantics were replaced with a decorative scroll-driven canvas. The actual brand and work rows remain native links.
- A short landscape viewport could not show the full original sphere. Constraining the artwork to viewport height preserves visibility before morphing and is covered by the layout tests.
- Header docking reserves a fixed mark area, recalculates on layout/font changes, and uses an opaque sticky header so the traveling artwork does not cover navigation.
- Work titles, descriptions, arrows, and row whitespace belong to one native anchor, so the full row is clickable, tappable, and keyboard-operable.
- The initial hosted CI run found a path assertion matching the repository name in its parent directory. Publication-boundary checks now inspect paths relative to the deployment directory.

## Performance and browser scope

The homepage progressively enhances an original static geometric artwork with a local canvas module. All text, navigation, résumé links, and the artwork remain available without JavaScript. Reading pages have no client scripts. No analytics, remote fonts, WebGL framework, or third-party runtime requests were added. IBM Plex Sans is served locally with its license.

Measured local assets are approximately: homepage HTML 8.2 KB (2.2 KB gzipped), CSS 17.9 KB (4.3 KB gzipped), canvas and geometry modules together 8.9 KB (3.3 KB gzipped), static SVG fallback 508 KB (77.3 KB gzipped), and the two local font weights together 134 KB in WOFF2 form. The social PNG is approximately 138 KB and is not a homepage render dependency. These are file measurements, not hosted transfer measurements; GitHub Pages controls compression and caching. Mathematical styles load only when required by article content.

Rendering responds to scroll and layout changes through passive listeners and coalesced animation-frame requests. There is no idle animation loop. The large canvas is hidden after docking; the small header wordmark is repainted only when layout measurements change. Reduced-motion users receive static artwork and no traveling/morphing path. Original geometric lettering supplies the mark without runtime font sampling. The artwork does not imply employer telemetry, measured model results, or technical accomplishments.

No production Core Web Vitals claim is made. Field LCP, INP, and CLS require actual deployed traffic and were not measured here. No tracking was added. Browser automation uses Chromium, including mobile emulation; Safari, Firefox, actual iOS hardware, assistive-technology behavior, and social-platform crawler rendering were not independently exercised.

## Content and deployment review

Public summaries were checked against the existing public résumé and website. Employment roles, internship status, and education are preserved. Published work pages explicitly identify themselves as short public overviews. Detailed architecture, evaluation protocols, metrics, and business information remain unpublished pending review. No new article is represented as previously published. The original résumé PDF is byte-identical.

The sitemap contains public routes only. Legacy review notices and 404 have noindex metadata. Canonical links, social metadata, a custom favicon, robots.txt, CNAME, and the static GitHub Pages workflow are present. Pull-request validation has no production deployment step; production deployment remains restricted to master pushes. Final GitHub-hosted workflow success must be checked on the PR before merge.
