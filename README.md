# kawer.dev

A static personal website for Lazaro Kawer. HTML is generated at build time from shared templates, verified biography data, and Markdown. The site uses plain HTML and CSS, with one small progressive enhancement for the homepage point cloud. It needs no application server, analytics, or external font services. Navigation and all content work without JavaScript.

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

## Content

The owner approved the reviewed profile rewrite for publication and release on 18 November 2026. The site features two case studies, supporting on-device/statistical work, and two newly prepared engineering notes. The original briefing, claim-review ledger, excluded details, and local review output remain gitignored under `.private/`; approval applies to the displayed candidate, not every item in the briefing.

Work frontmatter can include `featured`, `topic`, and `outcome`. Featured entries appear on the homepage; other projects appear in the Work index. Existing entries without these fields remain compatible. Case studies use a centered reading column; contributions and deployment scope belong in the narrative rather than status panels. Dates on engineering notes record their preparation for this site, not a prior publication history.

- `content/profile.json`: verified public biography and profile links.
- `content/work/*.md`: engineering case studies.
- `content/writing/*.md`: technical writing.
- `scripts/templates.mjs`: reusable HTML templates and page layouts.
- `assets/css/site.css`: responsive design tokens and components.
- `assets/js/field.js` and `geometry.mjs`: original interactive geometry, loaded only on the homepage.
- `scripts/field-svg.mjs`: builds the static SVG fallback from the same geometry.
- `assets/fonts/`: locally hosted IBM Plex Sans and its open font license.

Markdown frontmatter requires `title`, `description`, `date` (`YYYY-MM-DD`), and `status` (`published` or `draft`). Optional metadata includes `tags` and `source`. Only `published` entries generate routes, listings, or sitemap entries. Raw HTML in Markdown is disabled. Code fences and KaTeX notation (`$...$`, `$$...$$`) render during the build, with local styles/fonts available in `dist/assets/css`.

Changing `status` is a publication decision. Verify all claims and disclosure permissions first. Drafts contain review prompts, never confidential implementation details. Keep sensitive notes outside this public repository; `.private/` is ignored.

The existing résumé PDF is preserved byte-for-byte. Legacy résumé and blog URLs remain navigable. Old blog URLs display the current Writing index with its canonical URL and noindex metadata; the original essay is not copied into the build.

## Visual direction

The personal laboratory direction takes inspiration from BlueYard’s exploratory character, using original geometry and an independent palette and layout. The rippled sphere opens the homepage. Normal scrolling morphs it into geometric KAWER lettering, shrinks it, and hands it off to the sticky header’s native home link. Scrolling back reverses the same progress exactly. On mobile, the complete orb is visible before the animation begins. There are no artwork buttons, selectors, click gestures, or continuous animation. Rendering is requested only on scroll/layout events, with no idle animation loop. Reduced-motion and no-JavaScript visitors get the static sphere and ordinary header brand. Work rows remain native links across their title, description, whitespace, and arrow.

## Deployment

GitHub Pages retains the existing `kawer.dev` domain (`CNAME`). Only `dist/` is uploaded. Pull requests and feature branches run read-only validation; they do not deploy. The existing production workflow runs only after a push to `master`, with deployment in the `github-pages` environment. This redesign must be reviewed before merging. Do not push directly to `master` to preview changes.

See [architecture decisions](docs/architecture.md) and the content review notes for assumptions and publication questions. The legacy HTML5 UP assets and license remain in source history/source for attribution, but are not copied into the redesigned site.
