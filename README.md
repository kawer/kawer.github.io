# kawer.dev

A static personal website for Lazaro Kawer. HTML is generated at build time from shared templates, verified biography data, and Markdown. The site uses plain HTML and CSS, with one small progressive enhancement for the homepage point cloud. It needs no application server, analytics, or external font services. Navigation and all content work without JavaScript.

The visible landing sphere turns slowly with a small drift. Scroll input freezes its pose for the KAWER transition. Idle painting is capped and backs off on slower devices; it stops offscreen, during the morph, after docking, in hidden tabs, and with reduced motion enabled.

## Develop and review

Use Node.js 22 or newer and Python 3 for the preview server.

```sh
npm ci
npm run check
npm run preview
```

Open http://localhost:4173. For desktop/mobile browser and accessibility checks:

```sh
npx playwright install chromium
npm run test:browser
```

The browser tests start their own preview server. Screenshots and test reports are local review artifacts and are not deployed.

To profile the orb, leave the preview server running and use a second terminal:

```sh
node scripts/profile-orb.mjs http://127.0.0.1:4173 /tmp/orb-timing.json
```

This optional Chromium benchmark warms both scroll directions, then reports visible-morph callback durations, frame spacing, and canvas pixel count at normal and fourfold CPU throttling. Set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` to use an installed Chromium binary. Compare builds on the same idle machine; these local results do not measure real-user Core Web Vitals.

When comparing versions with different handoff timing, sample the same active geometry phase. `ORB_PROFILE_MAX_PROGRESS=.55 ORB_PROFILE_PASS_MS=1800` limits samples to the first 55% of the morph and uses slower scroll passes. The report includes both settings. Hidden large-canvas frames are excluded.

## Content

The site features two flagship case studies and supporting on-device/statistical work. Engineering Notes is temporarily withdrawn: its sources remain drafts, but the build generates no Writing or legacy blog routes. The original briefing, claim-review ledger, excluded details, and local review output remain gitignored under `.private/`.

Work frontmatter can include `featured`, `topic`, and `outcome`. Featured entries appear on the homepage; other projects appear in the Work index. Existing entries without these fields remain compatible. Case studies use a centered reading column; contributions and deployment scope belong in the narrative rather than status panels.

- `content/profile.json`: verified public biography and profile links.
- `content/work/*.md`: engineering case studies.
- `content/writing/*.md`: unpublished writing drafts.
- `scripts/templates.mjs`: reusable HTML templates and page layouts.
- `assets/css/site.css`: responsive design tokens and components.
- `assets/js/field.js` and `geometry.mjs`: original interactive geometry, loaded only on the homepage.
- `scripts/field-svg.mjs`: builds the static SVG fallback from the same geometry.
- `assets/fonts/`: locally hosted IBM Plex Sans and its open font license.

Markdown frontmatter requires `title`, `description`, `date` (`YYYY-MM-DD`), and `status` (`published` or `draft`). Optional metadata includes `tags` and `source`. Only published work entries generate routes, listings, or sitemap entries. The Writing collection is disabled in the build, so changing its metadata alone cannot republish it. The authoring pipeline retains safe code and KaTeX support; math runtime assets are omitted while no public pages require them.

Changing `status` is a publication decision. Verify all claims and disclosure permissions first. Drafts contain review prompts, never confidential implementation details. Keep sensitive notes outside this public repository; `.private/` is ignored.

The existing résumé PDF and its legacy alias are preserved byte-for-byte. Writing and legacy blog URLs return the ordinary 404 page. The original essay is not copied into the build.

## Visual direction

The personal laboratory direction takes inspiration from BlueYard’s exploratory character, using original geometry and an independent palette and layout. The rippled sphere opens the homepage. Normal scrolling morphs it into geometric KAWER lettering, shrinks it, and hands it off to the sticky header’s native home link. A brief settling transition keeps large scroll jumps visible; returning to the same offset restores the same artwork after settling. The endpoint fits the page's available scroll distance, including tall desktop windows. The complete orb remains visible before the mobile transition starts. There are no artwork buttons or captured gestures. Rendering stops when settled. Reduced-motion and no-JavaScript visitors get the static sphere and ordinary header brand. Work rows remain native links across their title, description, whitespace, and arrow.

## Deployment

GitHub Pages retains the existing `kawer.dev` domain (`CNAME`). Only `dist/` is uploaded. Pull requests and feature branches run read-only validation; they do not deploy. The existing production workflow runs only after a push to `master`, with deployment in the `github-pages` environment. This redesign must be reviewed before merging. Do not push directly to `master` to preview changes.

Generated HTML versions the CSS and animation entry URLs with content hashes so a returning browser requests updated assets when those files change.

See [architecture decisions](docs/architecture.md) and the content review notes for assumptions and publication questions. The legacy HTML5 UP assets and license remain in source history/source for attribution, but are not copied into the redesigned site.
