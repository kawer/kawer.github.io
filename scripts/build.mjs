import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { loadCollection, markdown } from './content.mjs';
import { renderPage, renderHome, renderAbout, renderResume, renderListing, renderArticle, render404 } from './templates.mjs';

const root = process.cwd();
const output = join(root, 'dist');
const profile = JSON.parse(await readFile(join(root, 'content/profile.json'), 'utf8'));
const work = await loadCollection('work');
// Curate the homepage and Work index independently of preparation dates.
const workOrder = profile.selectedWork.map(item => item.slug);
work.sort((a, b) => workOrder.indexOf(a.slug) - workOrder.indexOf(b.slug));
const writing = await loadCollection('writing');
const data = { ...profile, work, writing };
const routes = [];

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });

async function writeRoute(path, html, indexable = true) {
  const filename = path.endsWith('.html') ? path.slice(1) : `${path.slice(1)}index.html`;
  const destination = join(output, filename);
  await mkdir(dirname(destination), { recursive: true });
  await writeFile(destination, html);
  if (indexable) routes.push(path);
}

await writeRoute('/', renderHome(data));
await writeRoute('/about/', renderAbout(data));
await writeRoute('/resume/', renderResume(data));
/** @type {[string, typeof work][]} */
const collections = [['work', work], ['writing', writing]];
for (const [kind, items] of collections) {
  await writeRoute(`/${kind}/`, renderListing(kind, items));
  for (const item of items) await writeRoute(item.url, renderArticle(kind, item, markdown.render(item.body)));
}
await writeRoute('/404.html', render404(), false);

// Legacy URLs stay navigable without republishing material pending disclosure review.
for (const path of ['/docs/blog/', '/docs/blog/index.html', '/docs/blog/bi-directional-taxonomies.html']) {
  const html = renderPage({ title: 'Writing archive', description: 'The writing archive has moved.', path, section: 'writing', body: '<section class="page-heading"><p class="eyebrow">Writing archive</p><h1 class="page-title">This article is under review.</h1><p>The archive is being reviewed before republication. Browse the current writing section for available notes.</p><a class="text-link" href="/writing/">Go to writing →</a></section>' });
  await writeRoute(path, html.replace('</head>', '<meta name="robots" content="noindex,follow"></head>'), false);
}

// This allowlist is the deployment boundary. Never copy the repository or content tree.
for (const asset of ['CNAME', 'assets/css/site.css', 'assets/favicon.svg', 'assets/social.svg', 'assets/social.png', 'docs/Lazaro_Kawer_Resume.pdf']) {
  const destination = join(output, asset);
  await mkdir(dirname(destination), { recursive: true });
  await cp(join(root, asset), destination);
}
// Keep the earlier résumé URL compatible; both copies are byte-identical to the current PDF.
await cp(join(root, 'docs/Lazaro_Kawer_Resume.pdf'), join(output, 'docs/Resume.pdf'));
// Math fonts and styles are served locally; no third-party runtime requests.
await cp(join(root, 'node_modules/katex/dist/katex.min.css'), join(output, 'assets/css/katex.min.css'));
await cp(join(root, 'node_modules/katex/dist/fonts'), join(output, 'assets/css/fonts'), { recursive: true });
await writeFile(join(output, '.nojekyll'), '');
await writeFile(join(output, 'robots.txt'), 'User-agent: *\nAllow: /\nSitemap: https://kawer.dev/sitemap.xml\n');
await writeFile(join(output, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${routes.map(path => `  <url><loc>https://kawer.dev${path}</loc></url>`).join('\n')}\n</urlset>\n`);
console.log(`Built ${routes.length} public pages. Draft content excluded.`);
