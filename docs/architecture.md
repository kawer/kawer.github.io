# Architecture and review decisions

## Visible idle rotation

Restore the original slow 3D turn at 0.065 radians/second, with a small pitch change and at most 2.5px vertical drift. The sphere still uses all 8,910 original particles and the packed projection/depth-band buffers. Projection caching now includes yaw and pitch as well as morph progress. Initial fit calculations use a conservative perspective envelope for every rotation plus drift padding.

Only the visible, unmorphed, stationary sphere schedules idle work. One timeout requests a paint through the existing coalesced animation-frame queue, capped at 24fps and backed off using measured render cost on slower devices. Scroll input cancels that timeout immediately; scroll interpolation keeps its normal animation-frame cadence. A short quiet period prevents idle painting from competing with ongoing native scrolling before the morph begins. Nothing continues scheduling idle frames offscreen, in a hidden document, during a settled partial morph, after docking, or under reduced motion.

The active-time clock freezes rather than catching up after suspension. Scroll/morph frames use the last displayed pose, smoothly bringing its wrapped yaw and pitch to the front-facing lettering and fading the small drift. Reversing to the sphere resumes that same pose before rotation continues. The miniature wordmark remains still. The static SVG and native links remain the fallback. Earlier sections describe the previous releases, including the superseded no-idle-loop behavior.

Passive viewport listeners retain the latest fine-pointer position for the visible sphere. Each idle paint pushes nearby projected dots outward with a smooth falloff in CSS pixels, keeping the pocket responsive while the sphere rotates under a stationary pointer. Reusable offsets stay within the existing canvas and ease away on exit or early in the scroll morph. A shallow scroll can finish moving before the pocket closes. The renderer completes that brief fade before it settles. The lettering and dock use the original projection. Touch gestures follow native scrolling, and viewport, visibility, page restoration, and motion-preference changes clear the interaction.

## Work enters during the orb transition

Implement the selected “Work moves in” direction with normal document flow. The homepage hero is shorter; stacked portrait and short landscape layouts place the role and section link above the artwork. Compact stage spacing keeps the sphere prominent while bringing the work section closer. Work links remain ordinary visible anchors. There is no extra trail, section transform, concealed content, or synthetic scroll distance.

Measure the initial sphere's projected vertical extent once. In stacked layouts, let the introduction and role scroll clear before morphing, while retaining the complete sphere below the sticky header and inside the viewport. The orb travels upward from the start of the morph instead of waiting for its first quarter. End progress when the Selected work heading reaches the header's reading margin, capped to the available native scroll. Include the computed scroll margin and root scroll padding so a native fragment link reaches that same endpoint. Crossfade into the header mark according to its actual vertical arrival, so the moving word does not disappear behind the opaque header before the miniature appears. Measured start/end offsets are exposed alongside the existing field state for browser tests and the optional benchmark.

The bounded canvas, reusable projection buffers, original 8,910 particles, static SVG, finite settling, and no-idle behavior remain. Layout and text work without JavaScript and with reduced motion. No rendering dependencies or deployment changes are needed.

The approved case-study titles are “Measuring Windows glitchiness” and “Building the evaluation stack for OS engineering agents.” The latter description identifies evaluation infrastructure across OS performance, power, reliability, and memory. The Glitchiness description identifies the named perceptual metric. Shared content metadata supplies headings, listings, and social descriptions; existing URLs and case-study evidence remain intact. Earlier sections below describe previous releases.

## Bounded canvas renderer, 19 November 2026

Keep Canvas 2D and the original 8,910-particle artwork. Each morph frame now interpolates and projects into reusable numeric buffers and classifies depth once. Stable linked indices retain the same point order within each of the eight compositing bands. The completed lettering projection is reused while the mark travels. This removes two temporary point clouds and eight repeated depth-classification scans per frame without changing geometry, point density, or circle rendering.

The moving canvas now covers the artwork instead of the viewport. A conservative perspective bound follows from the maximum endpoint radius: interpolation and rotation cannot increase that radius, and projection cannot exceed `radius / sqrt(1 - (radius / 3.8)^2)`. The canvas fits this bound plus dot padding, stays the same size between layout measurements, and moves on device-pixel boundaries. Its local coordinates preserve the original viewport-space positions. The native sticky header remains the docking target. Once the header handoff is opaque, the large canvas is hidden and no longer projected, cleared, or painted; reversing below that boundary restores it. Finite progress settling and reduced-motion behavior remain unchanged.

WebAssembly would still need to submit the same Canvas drawing work. Reusing buffers and reducing the drawing surface address the measured costs without a new compiler toolchain, binary asset, rendering dependency, or browser requirement. `scripts/profile-orb.mjs` provides an optional local Chromium benchmark; it is neither production telemetry nor a CI timing gate. Earlier sections below describe previous releases.

## Desktop animation and Notes withdrawal, 19 November 2026

The live 3840×2160 desktop page had only 636px of native scrolling against an 840px animation endpoint, so the orb could never finish docking. The endpoint now respects actual available scroll distance. The shorter page after Notes withdrawal uses the same rule. Native input remains untouched and no filler scroll space is added.

Scroll changes now animate toward their target through a finite interpolation, preserving intermediate shapes even on a single jump to the bottom. An epsilon snap ends rendering exactly at the target; the page has no idle animation loop. Font and element measurements preserve an active transition. Viewport, visibility, and back-forward-cache restoration can snap to the measured target only if scrolling has not moved since the event requested that snap. Reduced-motion changes cancel or refresh rendering. Older MediaQueryList listeners and missing ResizeObserver are handled without initialization errors. Geometry and the native header home link are unchanged.

Engineering Notes is removed from the homepage, navigation, generated routes, and sitemap. Its two articles are drafts; neither Writing nor legacy blog routes are generated. Their old URLs return 404. Authoring templates and Markdown/math support remain in source for future use. Entry CSS and JavaScript URLs carry content versions to avoid stale cached updates. The sections below record earlier releases.

## Copy and reading layout cleanup, 18 November 2026

Public pages no longer describe résumé provenance, editorial completeness, withheld material, or unfinished model-training directions. Case-study status panels are removed. Existing result names, denominators, contribution boundaries, and internal Windows deployment scope remain in the narrative. Omitting future work does not promote it to an accomplishment. Disclosure review remains a source-document workflow rather than website copy.

Reading pages use a 1060px content area with a centered 780px article column, smaller headings and section gaps, and compact back links. About and Résumé use a narrow section-label column rather than reserving half the layout for labels, stacking on smaller screens. Homepage background and writing sections use narrower labels and reduced padding. Native navigation, the artwork geometry, and its scroll behavior remain unchanged.

Legacy blog URLs render the actual current Writing index, with its canonical URL and noindex metadata. The original essay remains excluded; no review notice or placeholder is shown. Earlier sections below record the prior release decisions.

## Profile rewrite, 18 November 2026

The owner supplied a new factual briefing, canceled the proposed removal of Work and Writing, and approved the displayed replacement preview for publication and release. The removal PR was closed without merging. Shared templates support two featured case studies, role/scope/status summaries, supporting projects, and dated engineering notes. A compatibility fallback keeps entries without featured metadata usable. The Markdown loader remains the publication boundary.

Only the four reviewed case studies and matching profile were promoted into public content. The numerical claim/disclosure table, original briefing, excluded material, and local preview remain private. The preview builds in a separate source/output tree beneath `.private/`; it does not overwrite production `dist/`. Local preview output receives noindex metadata and a disallowing robots file. Public deployment uploads only the root build output after a reviewed master change.

The two new general technical notes discuss evaluation and measurement methodology without employer-specific implementation claims. They are newly prepared site content, not evidence of an existing academic publication record.

## Existing project

The source repository was a plain HTML/CSS GitHub Pages site using HTML5 UP Aerial. It had a single landing page, bundled icon fonts, decorative background layers, inline touch/scroll handlers, two résumé PDFs, and a separate HTML blog. There was no package manager, build pipeline, automated linting, type checking, or browser test suite. The deployment workflow uploaded the entire repository. The landing page disabled mobile zoom and touch scrolling; it had limited metadata and icon-only navigation.

The public landing page and current résumé were reviewed directly. The résumé supplies career chronology, education, and high-level professional domains. Public availability alone is not treated as authorization to expand employer implementation details or repeat sensitive metrics.

## Keep static hosting

Retain GitHub Pages and the existing custom domain. A small Node build generates ordinary HTML; there is no client framework, hydration, server, or database. A small native JavaScript module progressively enhances the homepage’s geometric artwork; reading pages do not load it. This keeps the existing deployment model while avoiding hand-maintained shared navigation across multiple pages. Node is a build dependency only.

The implementation uses `markdown-it` for Markdown, `front-matter` for metadata, and KaTeX for optional mathematical notation. Raw HTML in Markdown is disabled, KaTeX trust is disabled, and there are no remote runtime scripts. All navigation uses real links. Layout, navigation, and content require no JavaScript. The homepage enhancement uses Canvas 2D without third-party rendering libraries. Geometry is shared between a generated SVG fallback and the browser renderer. It contains no data or claims about employer systems. The artwork follows native scrolling, never captures gestures, and has no controls or idle animation. Reduced-motion preferences and page visibility are handled explicitly. Browser screenshots and reports stay outside the deployment artifact.

## Publication boundary

`status: published` is explicit and mandatory. Drafts generate no HTML, URL, listing item, JSON payload, or sitemap entry. The build copies only named assets and the unchanged résumé PDF. It never copies `content/`, source documentation, repository metadata, or the legacy blog HTML into `dist/`.

The three requested employer case-study subjects remain unpublished unless enough publicly shareable evidence supports their complete narratives. Draft placeholders ask for evidence without storing internal information. No technical detail, team ownership, model result, metric, or business impact is inferred from a job title. The résumé remains available as requested; conservative HTML summaries do not amplify potentially sensitive claims.

The pre-existing blog article discusses production implementation and explicitly references confidential specifics. Its old route now renders a noindex review notice. This preserves navigation without automatically republishing the original body. Any future migration of that article requires a deliberate disclosure review.

## Routing and SEO

The primary routes are `/`, `/work/`, `/writing/`, `/about/`, and `/resume/`. Published Markdown uses `/work/<slug>/` or `/writing/<slug>/`. `404.html` is an actual error document, and old blog routes provide a review notice linking to Writing. The current PDF remains at `/docs/Lazaro_Kawer_Resume.pdf`; `/docs/Resume.pdf` serves the same unchanged current PDF to preserve the old résumé link.

Templates supply canonical URLs, descriptions, social metadata, semantic navigation, and shared page chrome. The build creates a sitemap containing only published canonical pages and robots.txt with the sitemap address. Local SVG icons and self-hosted IBM Plex Sans avoid third-party font or image requests; a local PNG provides crawler-compatible social previews. The font’s open license is included with the deployed assets. KaTeX assets are copied locally for future articles; CSS need only be linked by article templates when math is present.

## Validation and release

ESLint checks build/template JavaScript; TypeScript checks the JavaScript without emitting files; Node tests inspect generated routes and publication boundaries; Playwright reviews desktop/mobile navigation and accessibility. The CI artifact allows visual review without production deployment.

The production workflow retains master-triggered GitHub Pages compatibility and now uploads `dist/` only, following validation. Feature-branch pushes and pull requests cannot reach the deployment job. Manual workflow dispatch was removed. No deployment, merge, or production branch update is part of this implementation.

## Remaining human decisions

Confirm current title/dates against the résumé before publishing changes later. Obtain explicit employer disclosure permission for any case-study implementation details and results. Confirm individual contribution separately from team outcomes. Review the existing article before republication. These decisions are content publication gates, not blockers for reviewing this static-site implementation.

## Visual revision

The earlier cream/serif/numbered portfolio design was rejected as formulaic. The approved reference is BlueYard’s exploratory approach. The revision uses a cool pale ground, petrol text, cobalt geometric artwork, locally hosted sans typography, compact navigation, and quieter reading layouts. It uses no BlueYard code, images, logos, or proprietary assets. The single geometric centerpiece is generated from mathematical coordinates and labeled literally as an interactive point cloud. No new professional claims or employer details were added.

Work entries use one native link per complete row, with the title as its accessible name. The arrow and description share the same internal destination without duplicate tab stops.

The homepage orb follows document scroll progress. Progress starts after the entire orb can be seen on mobile and ends as the hero exits beneath the sticky header. A passive scroll listener coalesces redraws through requestAnimationFrame; there is no wheel/touch interception, added scroll distance, or continuous animation loop. Geometry and viewport position interpolate deterministically, so reverse scrolling restores the same visual at the same offset.

The full-size canvas is a fixed, decorative, pointer-transparent layer beneath the opaque header. The header’s native home link reserves a fixed-size target containing a miniature version of the same KAWER point cloud. A late crossfade hands the moving wordmark into that target without covering navigation or intercepting clicks. Header text remains the accessible home-link label throughout. Once docked, ordinary scrolling causes no geometry redraws.

Resize, font readiness, pageshow/history restoration, visual viewport changes, and element resizing refresh geometry measurements. Reduced-motion preferences disable the travel and morph entirely, leaving the static sphere and ordinary sticky brand. The same fallback works with JavaScript disabled or unavailable Canvas 2D. Reading pages still load no script. The artwork uses the original sphere and original geometric lettering, contains no professional claims, and requires no additional fonts or rendering dependencies.
