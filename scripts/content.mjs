import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import frontMatterModule from 'front-matter';
import MarkdownIt from 'markdown-it';
import texmath from 'markdown-it-texmath';
import katex from 'katex';

// The CommonJS package exports a function, but its declarations use an ESM default.
const frontMatter = /** @type {typeof import('front-matter').default} */ (/** @type {unknown} */ (frontMatterModule));

export const markdown = new MarkdownIt({ html: false, linkify: false, typographer: false })
  .use(texmath, { engine: katex, delimiters: 'dollars', katexOptions: { trust: false, throwOnError: false, output: 'htmlAndMathml' } });

/** Load only explicitly published content. Draft bodies never enter the rendered site. */
export async function loadCollection(kind, root = process.cwd()) {
  const directory = join(root, 'content', kind);
  const names = (await readdir(directory)).filter(name => name.endsWith('.md')).sort();
  const items = [];
  for (const name of names) {
    const file = join(directory, name);
    const parsed = frontMatter(await readFile(file, 'utf8'));
    const attributes = /** @type {Record<string, any>} */ (parsed.attributes);
    if (!['published', 'draft'].includes(attributes.status)) throw new Error(`${file}: status must be published or draft`);
    for (const field of ['title', 'description', 'date']) {
      if (!attributes[field]) throw new Error(`${file}: missing ${field}`);
    }
    if (attributes.status !== 'published') continue;
    const slug = name.replace(/\.md$/, '');
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new Error(`${file}: invalid slug`);
    const date = attributes.date instanceof Date ? attributes.date.toISOString().slice(0, 10) : String(attributes.date);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date))) throw new Error(`${file}: invalid date`);
    items.push({ ...attributes, slug, date, url: `/${kind}/${slug}/`, body: parsed.body, readingMinutes: Math.max(1, Math.ceil(parsed.body.split(/\s+/).length / 220)) });
  }
  return items.sort((a, b) => b.date.localeCompare(a.date) || a.slug.localeCompare(b.slug));
}
