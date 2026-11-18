import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { renderFieldSvg } from './field-svg.mjs';
import { renderHome, renderAbout, renderResume, render404 } from './templates.mjs';

const root = process.cwd();
const output = join(root, 'dist');
const profile = JSON.parse(await readFile(join(root, 'content/profile.json'), 'utf8'));
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

await writeRoute('/', renderHome(profile));
await writeRoute('/about/', renderAbout(profile));
await writeRoute('/resume/', renderResume(profile));
// Work, writing, and legacy blog routes are withdrawn. Their editorial sources
// and templates remain in the repository, but nothing is generated or copied.
await writeRoute('/404.html', render404(), false);

// This allowlist is the deployment boundary. Never copy the repository or content tree.
for (const asset of ['CNAME', 'assets/css/site.css', 'assets/js/field.js', 'assets/js/geometry.mjs', 'assets/fonts/IBMPlexSans-Regular.woff2', 'assets/fonts/IBMPlexSans-Medium.woff2', 'assets/fonts/IBM-Plex-LICENSE.txt', 'assets/favicon.svg', 'assets/social.svg', 'assets/social.png', 'docs/Lazaro_Kawer_Resume.pdf']) {
  const destination = join(output, asset);
  await mkdir(dirname(destination), { recursive: true });
  await cp(join(root, asset), destination);
}
// Keep the earlier résumé URL compatible; both copies are byte-identical to the current PDF.
await cp(join(root, 'docs/Lazaro_Kawer_Resume.pdf'), join(output, 'docs/Resume.pdf'));
await writeFile(join(output, 'assets/field.svg'), renderFieldSvg());
await writeFile(join(output, '.nojekyll'), '');
await writeFile(join(output, 'robots.txt'), 'User-agent: *\nAllow: /\nSitemap: https://kawer.dev/sitemap.xml\n');
await writeFile(join(output, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${routes.map(path => `  <url><loc>https://kawer.dev${path}</loc></url>`).join('\n')}\n</urlset>\n`);
console.log(`Built ${routes.length} public pages. Draft content excluded.`);
