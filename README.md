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

- `content/profile.json`: verified public biography and profile links.
- `content/work/*.md`: unpublished engineering material retained for future revision.
- `content/writing/*.md`: unpublished writing material retained for future revision.
- `scripts/templates.mjs`: reusable HTML templates and page layouts.
- `assets/css/site.css`: responsive design tokens and components.
- `assets/js/field.js` and `geometry.mjs`: original interactive geometry, loaded only on the homepage.
- `scripts/field-svg.mjs`: builds the static SVG fallback from the same geometry.
- `assets/fonts/`: locally hosted IBM Plex Sans and its open font license.

The public site has Home, About, and Résumé. Work, Writing, individual work overviews, and legacy blog routes are withdrawn. The build does not load or generate either Markdown collection, including their indexes. They are absent from navigation, homepage sections, and the sitemap. Old URLs receive the ordinary 404 page.

The Markdown parser and article templates remain available for future authoring. Frontmatter requires `title`, `description`, `date` (`YYYY-MM-DD`), and `status` (`published` or `draft`). Optional metadata includes `tags` and `source`. The parser excludes drafts, disables raw HTML, and supports code fences and KaTeX notation. Restoring a section requires an intentional build and navigation change as well as content review; changing a status alone cannot publish it. Math assets are not copied while articles are disabled.

Changing `status` is a publication decision. Verify all claims and disclosure permissions first. Drafts contain review prompts, never confidential implementation details. Keep sensitive notes outside this public repository; `.private/` is ignored.

The existing résumé PDF is preserved byte-for-byte, including the legacy résumé URL. All blog material remains outside the built artifact.

## Visual direction

The personal laboratory direction takes inspiration from BlueYard’s exploratory character, using original geometry and an independent palette and layout. The rippled sphere opens the homepage. Normal scrolling morphs it into geometric KAWER lettering, shrinks it, and hands it off to the sticky header’s native home link. Scrolling back reverses the same progress exactly. On mobile, the complete orb is visible before the animation begins. There are no artwork buttons, selectors, click gestures, or continuous animation. Rendering is requested only on scroll/layout events, with no idle animation loop. Reduced-motion and no-JavaScript visitors get the static sphere and ordinary header brand. The homepage scroll link targets Background.

## Deployment

GitHub Pages retains the existing `kawer.dev` domain (`CNAME`). Only `dist/` is uploaded. Pull requests and feature branches run read-only validation; they do not deploy. The existing production workflow runs only after a push to `master`, with deployment in the `github-pages` environment. This redesign must be reviewed before merging. Do not push directly to `master` to preview changes.

See [architecture decisions](docs/architecture.md) and the content review notes for assumptions and publication questions. The legacy HTML5 UP assets and license remain in source history/source for attribution, but are not copied into the redesigned site.
