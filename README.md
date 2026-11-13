# kawer.dev

A static personal website for Lazaro Kawer. HTML is generated at build time from shared templates, verified biography data, and Markdown. The deployed site needs no JavaScript, application server, analytics, or external font services.

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
- `content/work/*.md`: engineering case studies.
- `content/writing/*.md`: technical writing.
- `scripts/templates.mjs`: reusable HTML templates and page layouts.
- `assets/css/site.css`: responsive design tokens and components.

Markdown frontmatter requires `title`, `description`, `date` (`YYYY-MM-DD`), and `status` (`published` or `draft`). Optional metadata includes `tags` and `source`. Only `published` entries generate routes, listings, or sitemap entries. Raw HTML in Markdown is disabled. Code fences and KaTeX notation (`$...$`, `$$...$$`) render during the build, with local styles/fonts available in `dist/assets/css`.

Changing `status` is a publication decision. Verify all claims and disclosure permissions first. Drafts contain review prompts, never confidential implementation details. Keep sensitive notes outside this public repository; `.private/` is ignored.

The existing résumé PDF is preserved byte-for-byte. Legacy résumé and blog URLs remain navigable. The old blog article is withheld from the built artifact while disclosure is reviewed.

## Deployment

GitHub Pages retains the existing `kawer.dev` domain (`CNAME`). Only `dist/` is uploaded. Pull requests and feature branches run read-only validation; they do not deploy. The existing production workflow runs only after a push to `master`, with deployment in the `github-pages` environment. This redesign must be reviewed before merging. Do not push directly to `master` to preview changes.

See [architecture decisions](docs/architecture.md) and the content review notes for assumptions and publication questions. The legacy HTML5 UP assets and license remain in source history/source for attribution, but are not copied into the redesigned site.
