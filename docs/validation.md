# Validation

## Visible idle rotation

The visible sphere now rotates in 3D while retaining the original particle count and optimized drawing path. Focused tests check a real pixel change at a capped paint cadence and a long idle period that crosses the wrapped-yaw boundary. A controlled clock exercises hidden-tab suspension, pose-preserving resumption, a frozen partial morph, full docking, reverse-morph pixel equality, reduced motion, and an initially offscreen sphere.

The former initial-sphere pixel-equality assertion is superseded by the requested live motion. Deterministic comparison remains meaningful within a frozen morph pose: returning from the dock to the same scroll offset reproduces identical pixels before idle resumes. Native scroll and media notifications are synchronized separately from the controlled timer clock in these tests.

Lint, type checking, build, eleven Node cases, and all 54 desktop/mobile Chromium cases pass locally, with zero violations across twenty-two axe scans. An independent single-browser review passed five viewport sizes, legacy motion APIs, missing ResizeObserver, full-sphere bounds, text-pixel clearance, and frozen-pose reversal. Fourteen inactive pause windows produced no paints. Actual Safari/Firefox rendering was not exercised.

Serial Chromium 156 comparisons against `8b26bcb` used 1440×1000 at DPR 2, two warm passes and four measured 1800ms passes, restricted to active morph progress below .55. Scroll callback median/p95 was 2.3/2.9ms before and 2.3/2.7ms after (269/272 samples); with fourfold CPU throttling it was 11.5/14.0ms and 10.4/13.0ms (79/79 samples). Canvas backing pixels remain 1,790,244. In separate three-second visible-idle windows, desktop/mobile painted at about 20 paints/second with a 2.3–2.4ms median callback. Fourfold throttling reduced idle painting to about 9 paints/second, demonstrating the cost-based backoff. These are local observations, not field Core Web Vitals or device frame-rate guarantees.

Review artifacts, timing reports, and preview videos are kept under `/workspace/artifacts/living-orb`, outside `dist/`. No professional content, résumé, case-study ordering, or runtime dependencies are changed. Earlier sections describe previous releases.

## Work enters during the orb transition

New browser coverage samples the morph at .25, .45, and .75 on 320×740 and 390×844 portrait, 1440×1000 desktop, and 844×390 landscape. It checks work arrival and reads the canvas's actual alpha pixels against visible text-line rectangles, excluding the area masked by the opaque header. This catches the original role/artwork collision as well as overlap with arriving work headings. Existing tests continue to cover full-sphere visibility before transformation, complete docking on tall screens, deterministic reversal, native links and gestures, reload/resize restoration, reduced-motion and no-JavaScript fallbacks, finite settling, bounded drawing, and zero idle rendering.

At 390×844, the Selected work heading enters at 505px when the morph begins and reaches 346px at .45; the first case-study title begins at 523px in that middle frame. At 320×740, those positions are 474px, 329px, and 527px. At .75, the first title begins at 417px and 430px respectively. These are local layout measurements, not timing or Core Web Vitals claims. Thirty final screenshots cover initial, source-sphere, middle, handoff, docked, and renamed-case-study layouts; a native-scroll mobile video shows forward and reverse motion. Review captures and reports are outside the deployment tree under `/workspace/artifacts/work-moves-in/final`.

The two renamed case studies use the same routes. Their updated headings and descriptions propagate through the homepage, Work index, article metadata, and social tags. The original résumé and public case-study details remain unchanged. Engineering Notes stays withdrawn; drafts, private review material, and source documentation remain excluded from `dist/`. Earlier sections below record previous releases.

Final local validation passes lint, JavaScript type checking, build, eleven Node cases, and all 52 desktop/mobile Chromium cases, including twenty-two axe scans without violations. Browser helpers wait for resize events and layout frames before reading the measured animation range. An independent six-viewport probe at 320/390 portrait, 768 tablet, 844/736 landscape, and 3840×2160 checked .1-step text collisions, complete source sphere, overflow, exact reverse pixels, idle shutdown, and static fallbacks. Native fragment links finish docked with the computed scroll margins/padding. Safari and Firefox rendering were not exercised.

Serial rendering comparisons against `81baa7d` used Chromium 156, 1440×1000 at DPR 2, two warm passes and four measured passes. Because the new header handoff finishes earlier, the comparison restricts callback samples to active geometry progress `0 < p < .55` with 1800ms passes (`ORB_PROFILE_MAX_PROGRESS=.55 ORB_PROFILE_PASS_MS=1800`). Normal-CPU callback median/p95 were 2.5/4.0ms before and 2.4/3.7ms after (223/254 samples); fourfold-throttled values were 12.5/20.7ms and 12.4/18.1ms (66/71 samples). The desktop canvas drops from 2,178,576 to 1,790,244 backing pixels. These local observations preserve the existing rendering budget; shared-host scheduling, differing visible phases, and asynchronous rasterization prevent a field frame-rate or Core Web Vitals claim. Raw full-transition and matched-phase reports remain local review artifacts.

## Orb rendering performance, 19 November 2026

Compared deployed commit `ff5ec24` with the bounded renderer using `scripts/profile-orb.mjs`, headless Chromium 156 on the same local machine, a 1440×1000 viewport at DPR 2, two warm-up passes and four measured forward/reverse scroll passes. Runs were sequential, with no other browser tests running. Callback timing includes JavaScript and Canvas command submission, not asynchronous raster/compositor completion. Frame spacing is separately sampled during native scroll input; these are local laboratory measurements, not field Core Web Vitals or a hardware frame-rate guarantee.

| Measurement | Deployed renderer | Bounded renderer |
| --- | ---: | ---: |
| Normal CPU callback median / p95 | 3.1 / 4.2 ms | 2.2 / 2.9 ms |
| Fourfold CPU throttle callback median / p95 | 19.4 / 41.8 ms | 12.5 / 21.7 ms |
| Normal CPU frame spacing median / p95 | 16.7 / 33.4 ms | 16.7 / 33.3 ms |
| Fourfold throttle frame spacing median / p95 | 116.6 / 250.0 ms | 83.4 / 133.3 ms |
| Canvas backing pixels, 1440×1000 at DPR 2 | 5,760,000 | 2,178,576 |
| Canvas backing pixels, 3840×2160 at DPR 2 | 33,177,600 | 2,238,016 |

The 4K backing surface is 93.3% smaller without reducing resolution or particle count. The warm visible-morph samples number 245/296 before/after at normal CPU and 69/82 at fourfold throttle. Timing varies with machine load and browser rasterization. Re-run the documented command to compare future changes rather than using these values as fixed test thresholds.

Visual comparison captured 48 matched before/after states (96 screenshots) at 320×740, 390×844, 844×390 landscape, 1440×1000 at DPR 1 and 2, and 3840×2160 at DPR 2. Progress samples were 0, .2, .45, .62, .8, .94, .96, and 1. No horizontal overflow or clipping was observed. Full-frame mean channel difference was at most 0.00023 on the 0–255 scale, limited to tiny dot-edge antialiasing differences. The original particles, lettering, colors, depth-band compositing order, and handoff remain visually intact. Screenshots and raw timing/pixel reports are local artifacts under `/workspace/artifacts/orb-performance`, excluded from deployment.

New browser coverage checks that the moving surface stays smaller than the viewport, invisible artwork stops clearing after handoff, and reversal resumes painting. The existing accessibility, restoration, fast-jump, no-idle-rendering, native-input, and static-fallback suite remains applicable. Lint, type checking, build, eleven Node cases, and all fifty desktop/mobile browser cases pass locally, with zero violations in twenty-two axe scans. Earlier sections below record previous releases.

## Desktop animation and Notes withdrawal, 19 November 2026

The live tall-desktop failure was reproduced at 3840×2160: the page stopped at 636px while the morph required 840px, leaving progress at 0.75714. New coverage checks intermediate rendered progress on fast scroll jumps, complete docking at tall desktop sizes, exact reversal after settling, and immediate preference updates with legacy motion listeners and no ResizeObserver.

The first hosted run caught a late layout measurement snapping directly to the scroll target and skipping intermediate shapes. Font/element measurements now preserve active interpolation, and forced restoration snaps are ignored if scrolling moved after the request. The jump test also changes the hero content box while scrolling to cover that race.

Independent focused review verified that active reversal converges exactly, rendering stops after settling, hidden-document rendering cancels, and showing the document or changing reduced-motion preferences restores the correct target. These compatibility probes use Chromium with selected APIs unavailable; actual Safari rendering is not claimed.

Writing and legacy blog routes are tested as 404, with no public links or sitemap entries. Draft and private-source exclusion, résumé bytes, metric scope, compact layouts, accessibility, native navigation, and the static fallbacks remain covered. CSS and entry-script content versions are checked against their source hashes. Earlier results below describe previous releases.

Final local checks pass: lint, type checking, build, eleven Node tests, and all 48 desktop/mobile browser cases. Twenty-two axe scans report zero violations. Screenshots cover the public routes and initial/midway/docked animation states under `/workspace/artifacts/orb-notes`.

## Copy and layout cleanup, 18 November 2026

`npm run check` passes, including ten Node tests. All 50 desktop/mobile Chromium cases pass, with zero violations across 30 axe scans. New assertions reject public editorial/status boilerplate and check that article introductions flow directly into the aligned reading column without large intervening gaps. Existing checks preserve internal-build scope, exact metrics, résumé bytes, links, responsive layouts, script-free reading pages, and the scroll identity.

Desktop/mobile screenshots in `/workspace/artifacts/copy-layout` were visually reviewed for About and the flagship case study. The narrowed label columns, centered article, removed status block, and smaller section gaps reduce empty space without adding filler content. Legacy blog routes show real writing entries and no review notice. Earlier results below describe prior releases.

## Profile rewrite release candidate, 18 November 2026

The isolated private preview builds successfully and passes linting, JavaScript type checking, the route/publication/math/geometry Node checks, and all 48 desktop/mobile Chromium cases. Thirty axe scans report zero violations. Case-study routes, native complete-row links, responsive summaries, new notes with mathematical notation, the existing scroll identity, and reduced-motion/no-JavaScript fallbacks are covered. Independent content review checked metric denominators, attribution, and ongoing-work status; corrections avoid implying an unsupported connection between separate statistical and decision-software projects.

The local content-review interface also passes navigation, math visibility, static home rendering, and width checks at 320, 736, and 1024 pixels without network requests or runtime errors. The owner approved the displayed candidate for publication and release. The four reviewed cases and matching profile are promoted without changes to their content. The original briefing, excluded details, and claim-review ledger remain private. The root build is validated again before release; the earlier full-release results below describe the initial version.

Final root validation passes: `npm run check` (lint, type check, build, nine Node tests) and all 48 desktop/mobile browser cases, with zero violations across 30 axe scans. Seven content files match the reviewed preview byte-for-byte. Release screenshots are captured under the ignored review-artifact directory. No dependency or deployment-workflow changes are part of this release.

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
