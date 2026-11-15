# Validation

Reviewed 15 November 2026 against the rebuilt personal laboratory design. No production deployment or merge was performed.

## Automated checks

- `npm run check`: ESLint, TypeScript checking of JavaScript, static build, and Node tests pass.
- Seven Node assertions cover primary routes and metadata, generated HTML links/resources and fragments, unpublished-file exclusion, unchanged résumé bytes and custom-domain files, safe Markdown/code/math rendering, and geometry. Geometry checks verify matching sampling counts, finite normalized coordinates, deterministic sphere/name surfaces, safe sphere projections across representative orientations, and front-facing lettering within the canvas.
- `npm run test:browser`: 44 Chromium cases pass across desktop and emulated iPhone viewports. They cover all five primary pages, three work pages, the legacy article notice, and the 404 page. Twenty-two page/state/viewport scans found zero WCAG 2 A/AA and WCAG 2.1 AA axe violations. Navigation, keyboard skip link, widths of 320/768/1280 pixels, local-only requests, and script-free reading pages are checked.
- Point-cloud checks verify the original sphere default, reduced-motion stillness, start/pause state, pointer dragging, focused-canvas arrow-key rotation and Home-key view reset, and the static fallback/navigation with JavaScript disabled. Selectors, alternative geometries, side-arrow buttons, and Reset view controls are absent.
- The native Reveal Kawer / Show sphere button and focusable canvas toggle the name using mouse click, mobile tap, Enter, Space, and an assistive-style click. The canvas uses a stable accessible toggle label with its pressed state; a live caption announces the visible result. The name remains front-facing and still, and its motion control is hidden. Two additional name-state accessibility scans found zero violations.
- Morph checks cover rapid interrupted toggles, paused view preservation, restoration of automatic rotation, and immediate reduced-motion rendering. Returning to the sphere under reduced motion does not restart rotation. Canvas ink and controls fit without clipping at 320, 390, and 768 pixels.
- All three work rows on both Home and Work were tested through their arrow, description, and keyboard Enter, on desktop and mobile. Actual pointer/touch coordinates navigate through a single native link per row; accessible names match their headings and links are not nested.
- Automated Chromium touch-emulation checks confirm vertical swipes scroll the page normally without revealing the name. Sphere dragging changes orientation without being mistaken for a tap.
- `npm audit`: zero dependency advisories after upgrading KaTeX. Markdown raw HTML is disabled and KaTeX trust is disabled.

Screenshots are generated for ten routes at desktop and mobile widths, plus the sphere and name states. Clean desktop viewport previews are available for both states. Local review artifacts for this revision are in `/workspace/artifacts/name-morph`; CI uses `artifacts/` and uploads them as a workflow artifact. They are excluded from the deployment.

## Defects found and fixed

- The mobile brand link lost its accessible name when its visible text was hidden. An explicit accessible label fixes it.
- Résumé email links duplicated the mailto scheme. Links now use the verified source URL directly.
- Diagonal arrow characters rendered as missing glyphs in the test environment. Inline SVG replaces them.
- The former deployment uploaded the whole repository. Deployment now uses an explicit generated output and asset allowlist; draft sources never reach that directory.
- The legacy essay contains material requiring disclosure review. Its route serves a safe review notice rather than republishing the source.
- Social metadata uses a PNG card for crawler compatibility.
- Independent review caught a readiness-attribute mismatch that left the static fallback visible beneath the moving canvas; both now use the same attribute. The canvas container is square to preserve the surface proportions.
- Hero text remains selectable while the artwork stays interactive.
- Point-cloud selectors and alternate geometries were removed. The original sphere now morphs into original point-sampled KAWER lettering. Dragging and arrow keys still rotate the sphere.
- A movement threshold distinguishes taps from drags, and pointer cancellation during touch scrolling cannot accidentally reveal the name. Rapid reveal toggles continue from the currently visible geometry.
- Reduced-motion return explicitly stays paused even when the user had manually started sphere motion before revealing the name.
- Pointer-coordinate tests scroll the canvas into view before dragging, so a taller mobile control layout does not place drag endpoints outside the viewport.
- Work titles, descriptions, arrows, and row whitespace belong to one native anchor, so the full row is clickable, tappable, and keyboard-operable.
- The initial hosted CI run found a path assertion matching the repository name in its parent directory. Publication-boundary checks now inspect paths relative to the deployment directory.

## Performance and browser scope

The homepage progressively enhances an original static geometric artwork with a local canvas module. All text, navigation, résumé links, and the artwork remain available without JavaScript. Reading pages have no client scripts. No analytics, remote fonts, WebGL framework, or third-party runtime requests were added. IBM Plex Sans is served locally with its license.

Measured local assets are approximately: homepage HTML 8.7 KB (2.4 KB gzipped), CSS 19.2 KB (4.5 KB gzipped), canvas and geometry modules together 11.3 KB (3.7 KB gzipped), static SVG fallback 508 KB (77.3 KB gzipped), and the two local font weights together 134 KB in WOFF2 form. The social PNG is approximately 138 KB and is not a homepage render dependency. These are file measurements, not hosted transfer measurements; GitHub Pages controls compression and caching. Mathematical styles load only when required by article content.

Animation is capped at approximately 30 frames per second and stops when paused, when offscreen, or when the document is hidden. Reduced-motion preference disables automatic rotation; explicit controls remain available. The sphere/name transition takes approximately 900 ms while normal motion is allowed; reduced-motion changes render immediately. The name is generated from original geometric lettering without runtime font sampling, and holds still once revealed. The original sphere remains the static fallback. The artwork does not imply employer telemetry, measured model results, or technical accomplishments.

No production Core Web Vitals claim is made. Field LCP, INP, and CLS require actual deployed traffic and were not measured here. No tracking was added. Browser automation uses Chromium, including mobile emulation; Safari, Firefox, actual iOS hardware, assistive-technology behavior, and social-platform crawler rendering were not independently exercised.

## Content and deployment review

Public summaries were checked against the existing public résumé and website. Employment roles, internship status, and education are preserved. Published work pages explicitly identify themselves as short public overviews. Detailed architecture, evaluation protocols, metrics, and business information remain unpublished pending review. No new article is represented as previously published. The original résumé PDF is byte-identical.

The sitemap contains public routes only. Legacy review notices and 404 have noindex metadata. Canonical links, social metadata, a custom favicon, robots.txt, CNAME, and the static GitHub Pages workflow are present. Pull-request validation has no production deployment step; production deployment remains restricted to master pushes. Final GitHub-hosted workflow success must be checked on the PR before merge.
