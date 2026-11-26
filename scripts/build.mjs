import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { createHash } from 'node:crypto';
import { build } from 'esbuild';
import { renderFieldSvg } from './field-svg.mjs';
import { loadCollection, markdown } from './content.mjs';
import { renderHome, renderAbout, renderResume, renderListing, renderArticle, render404 } from './templates.mjs';

const root = process.cwd();
const output = join(root, 'dist');
const version = bytes => createHash('sha256').update(bytes).digest('hex').slice(0,12);
async function bundle(entry, external = []) {
  const { outputFiles } = await build({
    entryPoints: [join(root, 'assets/js', entry)],
    bundle: true, format: 'esm', target: 'es2022', minify: true,
    keepNames: entry === 'field.js', legalComments: 'eof', write: false, external,
  });
  return outputFiles[0].text;
}
const threeLicense = await readFile(join(root,'node_modules/three/LICENSE'),'utf8');
const deferred = `${await bundle('field-webgl.mjs')}\n/*!\n${threeLicense}*/\n`;
const entry = (await bundle('field.js', ['./field-webgl.mjs']))
  .replace('"./field-webgl.mjs"', `"./field-webgl.mjs?v=${version(deferred)}"`);
const assetVersions = {
  '/assets/css/site.css': version(await readFile(join(root,'assets/css/site.css'))),
  '/assets/js/field.js': version(entry),
};
const profile = JSON.parse(await readFile(join(root, 'content/profile.json'), 'utf8'));
const work = await loadCollection('work');
// Curate the homepage and Work index independently of preparation dates.
const workOrder = profile.selectedWork.map(item => item.slug);
const order = item => { const index = workOrder.indexOf(item.slug); return index === -1 ? workOrder.length : index; };
work.sort((a, b) => order(a) - order(b));
const data = { ...profile, work };
const routes = [];

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });

async function writeRoute(path, html, indexable = true) {
  const filename = path.endsWith('.html') ? path.slice(1) : `${path.slice(1)}index.html`;
  const destination = join(output, filename);
  await mkdir(dirname(destination), { recursive: true });
  const versioned = html.replace(/(href|src)="(\/assets\/(?:css\/site\.css|js\/field\.js))"/g, (_match, attribute, asset) => `${attribute}="${asset}?v=${assetVersions[asset]}"`);
  await writeFile(destination, versioned);
  if (indexable) routes.push(path);
}

await writeRoute('/', renderHome(data));
await writeRoute('/about/', renderAbout(data));
await writeRoute('/resume/', renderResume(data));
await writeRoute('/work/', renderListing('work',work));
for (const item of work) await writeRoute(item.url, renderArticle('work',item,markdown.render(item.body)));
await writeRoute('/404.html', render404(), false);
// Writing and legacy blog routes are withdrawn; their sources remain for later.

// This allowlist is the deployment boundary. Never copy the repository or content tree.
for (const asset of ['CNAME', 'assets/css/site.css', 'assets/js/geometry.mjs', 'assets/fonts/IBMPlexSans-Regular.woff2', 'assets/fonts/IBMPlexSans-Medium.woff2', 'assets/fonts/IBM-Plex-LICENSE.txt', 'assets/favicon.svg', 'assets/social.svg', 'assets/social.png', 'docs/Lazaro_Kawer_Resume.pdf']) {
  const destination = join(output, asset);
  await mkdir(dirname(destination), { recursive: true });
  await cp(join(root, asset), destination);
}
await writeFile(join(output, 'assets/js/field.js'), entry);
await writeFile(join(output, 'assets/js/field-webgl.mjs'), deferred);
// Keep the earlier résumé URL compatible; both copies are byte-identical to the current PDF.
await cp(join(root, 'docs/Lazaro_Kawer_Resume.pdf'), join(output, 'docs/Resume.pdf'));
await writeFile(join(output, 'assets/field.svg'), renderFieldSvg());
await writeFile(join(output, '.nojekyll'), '');
await writeFile(join(output, 'robots.txt'), 'User-agent: *\nAllow: /\nSitemap: https://kawer.dev/sitemap.xml\n');
await writeFile(join(output, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${routes.map(path => `  <url><loc>https://kawer.dev${path}</loc></url>`).join('\n')}\n</urlset>\n`);
console.log(`Built ${routes.length} public pages. Draft content excluded.`);
