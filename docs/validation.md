# Validation

Reviewed 14 November 2026 against the rebuilt personal laboratory design. No production deployment or merge was performed.

## Automated checks

- `npm run check`: ESLint, TypeScript checking of JavaScript, static build, and Node tests pass.
- Seven Node assertions cover primary routes and metadata, generated HTML links/resources and fragments, unpublished-file exclusion, unchanged résumé bytes and custom-domain files, safe Markdown/code/math rendering, and geometry. Geometry checks verify matching sampling counts, finite normalized coordinates, deterministic distinct surfaces, and safe finite projections across representative orientations.
- `npm run test:browser`: 42 Chromium cases pass across desktop and emulated iPhone viewports. They cover all five primary pages, three work pages, the legacy article notice, and the 404 page. Twenty-six page/shape/viewport scans found zero WCAG 2 A/AA and WCAG 2.1 AA axe violations. Navigation, keyboard skip link, widths of 320/768/1280 pixels, local-only requests, and script-free reading pages are checked.
- Point-cloud checks verify reduced-motion stillness, explicit start/pause state, pointer dragging, focused-canvas arrow-key rotation and Home-key reset, Reset view, and the static fallback/navigation with JavaScript disabled. Side-arrow buttons remain absent.
- The native Shape selector works by keyboard and offers Rippled sphere, Torus, and Trefoil knot. All three produce distinct canvas pixels, retain the selected shape on reset, preserve manual view orientation across changes, and remain still with reduced motion. Six additional shape accessibility scans found zero violations.
- Morph checks cover paused and running rotation state, rapid interrupted selections, tapping during a transition, and final selected-shape fidelity. Controls remain within the viewport at 320, 390, and 768 pixels.
- All three work rows on both Home and Work were tested through their arrow, description, and keyboard Enter, on desktop and mobile. Actual pointer/touch coordinates navigate through a single native link per row; accessible names match their headings and links are not nested.
- A separate Chromium touch-emulation check confirmed a vertical swipe over the canvas scrolls the page normally; the drawing does not trap touch scrolling.
- `npm audit`: zero dependency advisories after upgrading KaTeX. Markdown raw HTML is disabled and KaTeX trust is disabled.

Screenshots are generated for ten routes at desktop and mobile widths, plus each selectable shape. Desktop viewport previews are available for all three geometries. Local review artifacts for this revision are in `/workspace/artifacts/geometry-options`; CI uses `artifacts/` and uploads them as a workflow artifact. They are excluded from the deployment.

## Defects found and fixed

- The mobile brand link lost its accessible name when its visible text was hidden. An explicit accessible label fixes it.
- Résumé email links duplicated the mailto scheme. Links now use the verified source URL directly.
- Diagonal arrow characters rendered as missing glyphs in the test environment. Inline SVG replaces them.
- The former deployment uploaded the whole repository. Deployment now uses an explicit generated output and asset allowlist; draft sources never reach that directory.
- The legacy essay contains material requiring disclosure review. Its route serves a safe review notice rather than republishing the source.
- Social metadata uses a PNG card for crawler compatibility.
- Independent review caught a readiness-attribute mismatch that left the static fallback visible beneath the moving canvas; both now use the same attribute. The canvas container is square to preserve the surface proportions.
- Hero text remains selectable while the artwork stays interactive.
- Point-cloud side-arrow controls were removed; drag interaction remains available and arrow keys rotate the focused canvas. The caption names the selected mathematical surface.
- A canvas tap during a morph now draws the selected final surface immediately rather than leaving a stale intermediate frame.
- Pointer-coordinate tests scroll the canvas into view before dragging, so a taller mobile control layout does not place drag endpoints outside the viewport.
- Work titles, descriptions, arrows, and row whitespace belong to one native anchor, so the full row is clickable, tappable, and keyboard-operable.
- The initial hosted CI run found a path assertion matching the repository name in its parent directory. Publication-boundary checks now inspect paths relative to the deployment directory.

## Performance and browser scope

The homepage progressively enhances an original static geometric artwork with a local canvas module. All text, navigation, résumé links, and the artwork remain available without JavaScript. Reading pages have no client scripts. No analytics, remote fonts, WebGL framework, or third-party runtime requests were added. IBM Plex Sans is served locally with its license.

Measured local assets are approximately: homepage HTML 8.9 KB (2.5 KB gzipped), CSS 19.5 KB (4.5 KB gzipped), canvas and geometry modules together 9.2 KB (3.2 KB gzipped), static SVG fallback 508 KB (77.3 KB gzipped), and the two local font weights together 134 KB in WOFF2 form. The social PNG is approximately 138 KB and is not a homepage render dependency. These are file measurements, not hosted transfer measurements; GitHub Pages controls compression and caching. Mathematical styles load only when required by article content.

Animation is capped at approximately 30 frames per second and stops when paused, when offscreen, or when the document is hidden. Reduced-motion preference disables automatic rotation; explicit controls remain available. Shape transitions take approximately 600 ms while normal motion is allowed; reduced-motion changes render immediately. Each surface is generated locally and the original sphere remains the static fallback. The selected mathematical shape is named literally, with no implication of employer telemetry, measured model results, or personal accomplishment.

No production Core Web Vitals claim is made. Field LCP, INP, and CLS require actual deployed traffic and were not measured here. No tracking was added. Browser automation uses Chromium, including mobile emulation; Safari, Firefox, actual iOS hardware, assistive-technology behavior, and social-platform crawler rendering were not independently exercised.

## Content and deployment review

Public summaries were checked against the existing public résumé and website. Employment roles, internship status, and education are preserved. Published work pages explicitly identify themselves as short public overviews. Detailed architecture, evaluation protocols, metrics, and business information remain unpublished pending review. No new article is represented as previously published. The original résumé PDF is byte-identical.

The sitemap contains public routes only. Legacy review notices and 404 have noindex metadata. Canonical links, social metadata, a custom favicon, robots.txt, CNAME, and the static GitHub Pages workflow are present. Pull-request validation has no production deployment step; production deployment remains restricted to master pushes. Final GitHub-hosted workflow success must be checked on the PR before merge.
