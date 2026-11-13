# Architecture and review decisions

## Existing project

The source repository was a plain HTML/CSS GitHub Pages site using HTML5 UP Aerial. It had a single landing page, bundled icon fonts, decorative background layers, inline touch/scroll handlers, two résumé PDFs, and a separate HTML blog. There was no package manager, build pipeline, automated linting, type checking, or browser test suite. The deployment workflow uploaded the entire repository. The landing page disabled mobile zoom and touch scrolling; it had limited metadata and icon-only navigation.

The public landing page and current résumé were reviewed directly. The résumé supplies career chronology, education, and high-level professional domains. Public availability alone is not treated as authorization to expand employer implementation details or repeat sensitive metrics.

## Keep static hosting

Retain GitHub Pages and the existing custom domain. A small Node build generates ordinary HTML; there is no client framework, hydration, server, or database. This keeps the existing deployment model while avoiding hand-maintained shared navigation across multiple pages. Node is a build dependency only.

The implementation uses `markdown-it` for Markdown, `front-matter` for metadata, and KaTeX for optional mathematical notation. Raw HTML in Markdown is disabled, KaTeX trust is disabled, and there are no remote runtime scripts. All navigation uses real links. Layout and navigation require no JavaScript. Browser screenshots and reports stay outside the deployment artifact.

## Publication boundary

`status: published` is explicit and mandatory. Drafts generate no HTML, URL, listing item, JSON payload, or sitemap entry. The build copies only named assets and the unchanged résumé PDF. It never copies `content/`, source documentation, repository metadata, or the legacy blog HTML into `dist/`.

The three requested employer case-study subjects remain unpublished unless enough publicly shareable evidence supports their complete narratives. Draft placeholders ask for evidence without storing internal information. No technical detail, team ownership, model result, metric, or business impact is inferred from a job title. The résumé remains available as requested; conservative HTML summaries do not amplify potentially sensitive claims.

The pre-existing blog article discusses production implementation and explicitly references confidential specifics. Its old route now renders a noindex review notice. This preserves navigation without automatically republishing the original body. Any future migration of that article requires a deliberate disclosure review.

## Routing and SEO

The primary routes are `/`, `/work/`, `/writing/`, `/about/`, and `/resume/`. Published Markdown uses `/work/<slug>/` or `/writing/<slug>/`. `404.html` is an actual error document, and old blog routes provide a review notice linking to Writing. The current PDF remains at `/docs/Lazaro_Kawer_Resume.pdf`; `/docs/Resume.pdf` serves the same unchanged current PDF to preserve the old résumé link.

Templates supply canonical URLs, descriptions, social metadata, semantic navigation, and shared page chrome. The build creates a sitemap containing only published canonical pages and robots.txt with the sitemap address. Local SVG icons avoid remote requests; a local PNG provides crawler-compatible social previews. KaTeX assets are copied locally for future articles; CSS need only be linked by article templates when math is present.

## Validation and release

ESLint checks build/template JavaScript; TypeScript checks the JavaScript without emitting files; Node tests inspect generated routes and publication boundaries; Playwright reviews desktop/mobile navigation and accessibility. The CI artifact allows visual review without production deployment.

The production workflow retains master-triggered GitHub Pages compatibility and now uploads `dist/` only, following validation. Feature-branch pushes and pull requests cannot reach the deployment job. Manual workflow dispatch was removed. No deployment, merge, or production branch update is part of this implementation.

## Remaining human decisions

Confirm current title/dates against the résumé before publishing changes later. Obtain explicit employer disclosure permission for any case-study implementation details and results. Confirm individual contribution separately from team outcomes. Review the existing article before republication. These decisions are content publication gates, not blockers for reviewing this static-site implementation.
