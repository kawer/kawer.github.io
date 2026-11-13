import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir, stat, mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { join, resolve, relative } from 'node:path';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { loadCollection, markdown } from '../scripts/content.mjs';

const root = resolve('dist');
async function files(dir) {
  const result = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    result.push(...entry.isDirectory() ? await files(path) : [path]);
  }
  return result;
}
const htmlFiles = (await files(root)).filter(file => file.endsWith('.html'));

test('primary routes exist with one h1, language and unique metadata', async () => {
  const descriptions = new Set();
  for (const route of ['', 'work', 'writing', 'about', 'resume']) {
    const html = await readFile(join(root, route, 'index.html'), 'utf8');
    assert.match(html, /<html[^>]*lang="en"/);
    assert.equal((html.match(/<h1[\s>]/g) || []).length, 1, route);
    assert.match(html, /<title>[^<]+<\/title>/);
    const description = html.match(/<meta name="description" content="([^"]+)"/);
    assert.ok(description, route);
    assert.ok(!descriptions.has(description[1]), `duplicate description: ${route}`);
    descriptions.add(description[1]);
    assert.match(html, /<link rel="canonical" href="https:\/\/kawer\.dev\//);
    assert.match(html, /property="og:image"/);
    assert.match(html, /<main[\s>]/);
    assert.match(html, /class="skip-link"/);
  }
});

test('every internal href and resource resolves, including fragments', async () => {
  for (const file of htmlFiles) {
    const html = await readFile(file, 'utf8');
    for (const match of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
      const href = match[1].replaceAll('&amp;', '&');
      if (/^(https?:|mailto:|tel:|data:)/.test(href)) continue;
      const url = new URL(href, `https://kawer.dev/${file.slice(root.length + 1)}`);
      let target = resolve(root, `.${decodeURIComponent(url.pathname)}`);
      assert.ok(target.startsWith(`${root}/`) || target === root);
      const info = await stat(target).catch(() => null);
      assert.ok(info, `${file}: broken ${href}`);
      if (info.isDirectory()) target = join(target, 'index.html');
      if (url.hash && target.endsWith('.html')) {
        const destination = await readFile(target, 'utf8');
        assert.ok(destination.includes(`id="${decodeURIComponent(url.hash.slice(1))}"`), `${file}: missing ${href}`);
      }
    }
    for (const match of html.matchAll(/<a\b[^>]*target="_blank"[^>]*>/g)) {
      assert.match(match[0], /rel="[^"]*noopener/);
    }
  }
});

test('unpublished content and repository internals cannot enter deployment', async () => {
  const output = await files(root);
  assert.ok(!output.some(path => /(?:node_modules|\.git|private-review|\.md$)/.test(relative(root, path))));
  for (const dir of ['work', 'writing']) {
    for (const entry of await readdir(`content/${dir}`)) {
      if (!entry.endsWith('.md')) continue;
      const source = await readFile(`content/${dir}/${entry}`, 'utf8');
      if (/status:\s*["']?draft/.test(source)) {
        const slug = entry.slice(0, -3);
        assert.ok(!output.some(path => path === join(root, dir, slug, 'index.html')), `${slug} is unpublished`);
      }
    }
  }
  const legacy = await readFile(join(root, 'docs/blog/bi-directional-taxonomies.html'), 'utf8');
  assert.match(legacy, /under review/);
  assert.match(legacy, /noindex/);
});

test('résumé bytes and custom-domain deployment files are preserved', async () => {
  const digest = async path => createHash('sha256').update(await readFile(path)).digest('hex');
  assert.equal(await digest('docs/Lazaro_Kawer_Resume.pdf'), await digest('dist/docs/Lazaro_Kawer_Resume.pdf'));
  assert.equal((await readFile('dist/CNAME', 'utf8')).trim(), 'kawer.dev');
  assert.match(await readFile('dist/robots.txt', 'utf8'), /Sitemap: https:\/\/kawer\.dev\/sitemap.xml/);
  const sitemap = await readFile('dist/sitemap.xml', 'utf8');
  for (const route of ['', 'work/', 'writing/', 'about/', 'resume/']) assert.ok(sitemap.includes(`https://kawer.dev/${route}<`));
});

test('editorial pipeline excludes draft bodies and renders safe code and mathematical notation', async () => {
  const fixture = await mkdtemp(join(tmpdir(), 'kawer-content-'));
  try {
    await mkdir(join(fixture, 'content/writing'), { recursive: true });
    const header = status => `---\ntitle: Fixture\ndescription: Editorial pipeline fixture\nstatus: ${status}\ndate: 2026-11-13\n---\n`;
    await writeFile(join(fixture, 'content/writing/secret-draft.md'), `${header('draft')}DO_NOT_PUBLISH_THIS_SENTINEL`);
    await writeFile(join(fixture, 'content/writing/public-note.md'), `${header('published')}\n\`\`\`python\nprint("test")\n\`\`\`\n\n$E = mc^2$\n\n<script>alert(1)</script>`);
    const items = await loadCollection('writing', fixture);
    assert.equal(items.length, 1);
    assert.equal(items[0].slug, 'public-note');
    assert.ok(!JSON.stringify(items).includes('DO_NOT_PUBLISH_THIS_SENTINEL'));
    const html = markdown.render(items[0].body);
    assert.match(html, /language-python/);
    assert.match(html, /katex/);
    assert.match(html, /<math/);
    assert.ok(!html.includes('<script>'));
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
});
