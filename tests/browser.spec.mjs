import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { join } from 'node:path';
import { mkdir } from 'node:fs/promises';

const pages = ['/', '/work/', '/writing/', '/about/', '/resume/', '/work/production-ai-evaluation/', '/work/on-device-predictive-ml/', '/work/statistical-decision-systems/', '/docs/blog/bi-directional-taxonomies.html', '/404.html'];
for (const route of pages) {
  test(`${route} renders accessibly without horizontal overflow`, async ({ page }, testInfo) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const response = await page.goto(route);
    expect(response?.status()).toBe(200);
    await expect(page.locator('h1')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    const scan = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    expect(scan.violations).toEqual([]);
    expect(errors).toEqual([]);
    const screenshotDirectory = process.env.SCREENSHOT_DIR || 'artifacts';
    await mkdir(screenshotDirectory, { recursive: true });
    await page.screenshot({ path: join(screenshotDirectory, `${testInfo.project.name}-${route.split('/').filter(Boolean).join('-') || 'home'}.png`), fullPage: true });
  });
}

test('keyboard skip link and primary navigation work', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  const skip = page.getByRole('link', { name: /skip/i });
  await expect(skip).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#main/);
  for (const name of ['Work', 'Writing', 'About', 'Résumé']) {
    await page.locator('.site-nav').getByRole('link', { name, exact: true }).click();
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('.site-nav a[aria-current="page"]')).toHaveText(name);
  }
});

test('homepage remains usable at narrow, tablet, and laptop widths', async ({ page }) => {
  for (const width of [320, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    await expect(page.locator('.site-nav')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await expect(page.getByRole('link', { name: /explore the work/i })).toBeVisible();
  }
});

test('homepage enhancement loads locally and reading pages need no JavaScript', async ({ page }) => {
  const requests = [];
  page.on('request', request => requests.push(request.url()));
  await page.goto('/');
  await expect(page.locator('h1')).toBeVisible();
  const scripts = page.locator('script[src]');
  await expect(scripts).toHaveCount(1);
  expect(await scripts.first().getAttribute('src')).toMatch(/^\/assets\/.*\.js$/);
  expect(requests.every(url => url.startsWith('http://127.0.0.1:4173/'))).toBe(true);
  for (const route of ['/work/', '/writing/', '/about/', '/resume/']) {
    await page.goto(route);
    await expect(page.locator('script')).toHaveCount(0);
  }
});


test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });
  test('static geometric artwork and content remain available', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.field-fallback')).toBeVisible();
    await expect(page.locator('#field-canvas')).toBeHidden();
    await expect(page.locator('button, select, [role="button"]')).toHaveCount(0);
    await expect(page.locator('.brand-name')).toBeVisible();
    await expect(page.locator('#brand-canvas')).toBeHidden();
    await expect(page.locator('h1')).toBeVisible();
    await page.locator('.site-nav').getByRole('link', { name: 'Work', exact: true }).click();
    await expect(page).toHaveURL(/\/work\/$/);
    await expect(page.locator('h1')).toBeVisible();
  });
});


for (const route of ['/', '/work/']) {
  test(`${route} work rows navigate from their arrows, descriptions, and keyboard`, async ({ page }, testInfo) => {
    await page.goto(route);
    const rows = page.locator('a.work-item');
    await expect(rows).toHaveCount(3);
    const destinations = await rows.evaluateAll(elements => elements.map(element => element.getAttribute('href')));
    for (let index = 0; index < destinations.length; index++) {
      const destination = destinations[index];
      expect(destination).toMatch(/^\/work\/[a-z-]+\/$/);
      for (const target of ['arrow', 'description', 'keyboard']) {
        await page.goto(route);
        const row = page.locator('a.work-item').nth(index);
        await expect(row.locator('a')).toHaveCount(0);
        const title = await row.locator('.work-title').innerText();
        await expect(row).toHaveAccessibleName(title);
        if (target === 'keyboard') {
          await row.focus();
          await expect(row).toBeFocused();
          await page.keyboard.press('Enter');
        } else {
          const part = row.locator(target === 'arrow' ? '.arrow' : '.work-description');
          await part.scrollIntoViewIfNeeded();
          const bounds = await part.boundingBox();
          expect(bounds).toBeTruthy();
          const x = bounds.x + bounds.width / 2;
          const y = bounds.y + bounds.height / 2;
          if (testInfo.project.name === 'mobile') await page.touchscreen.tap(x, y);
          else await page.mouse.click(x, y);
        }
        await expect(page).toHaveURL(`http://127.0.0.1:4173${destination}`);
        await expect(page.locator('h1')).toHaveText(title);
      }
    }
  });
}


const fieldMetrics = page => page.evaluate(() => {
  const art = document.querySelector('.field-art').getBoundingClientRect();
  const hero = document.querySelector('.lab-hero').getBoundingClientRect();
  const header = document.querySelector('.site-header').getBoundingClientRect();
  const start = Math.max(0, art.bottom + scrollY - innerHeight + 24);
  const end = Math.max(start + 1, hero.bottom + scrollY - header.height);
  return { start, end };
});
const progress = page => page.locator('.field-stage').getAttribute('data-field-progress').then(Number);
const canvasDigest = canvas => canvas.evaluate(async element => {
  const bytes = new TextEncoder().encode(element.toDataURL());
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
});
const opacity = element => element.evaluate(node => {
  let result = 1;
  for (let current = node; current; current = current.parentElement) result *= Number(getComputedStyle(current).opacity);
  return result;
});
async function readyField(page) {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator('.field-stage')).toHaveAttribute('data-field-ready', 'true');
}
async function nativeScroll(page, y) {
  await page.evaluate(top => scrollTo({ top, behavior: 'instant' }), y);
  await expect.poll(() => page.evaluate(target => Math.abs(scrollY - target), y)).toBeLessThanOrEqual(1);
  const { start, end } = await fieldMetrics(page);
  const expected = await page.evaluate(({ start, end }) => Math.max(0, Math.min(1, (scrollY - start) / (end - start))), { start, end });
  await expect.poll(() => progress(page)).toBeGreaterThanOrEqual(expected - .002);
  await expect.poll(() => progress(page)).toBeLessThanOrEqual(expected + .002);
}
async function assertDockBounds(page) {
  const bounds = await page.evaluate(() => {
    const rectangle = element => {
      const { left, right, top, bottom } = element.getBoundingClientRect();
      return { left, right, top, bottom };
    };
    return {
      header: rectangle(document.querySelector('.site-header')),
      dock: rectangle(document.querySelector('.brand-dock')),
      links: [...document.querySelectorAll('.site-nav a')].map(rectangle),
    };
  });
  expect(bounds.header.top).toBeGreaterThanOrEqual(-1);
  expect(bounds.header.top).toBeLessThanOrEqual(1);
  expect(bounds.dock.left).toBeGreaterThanOrEqual(bounds.header.left);
  expect(bounds.dock.right).toBeLessThanOrEqual(bounds.header.right);
  expect(bounds.dock.top).toBeGreaterThanOrEqual(bounds.header.top);
  expect(bounds.dock.bottom).toBeLessThanOrEqual(bounds.header.bottom);
  for (const link of bounds.links) {
    const intersects = Math.min(link.right, bounds.dock.right) > Math.max(link.left, bounds.dock.left)
      && Math.min(link.bottom, bounds.dock.bottom) > Math.max(link.top, bounds.dock.top);
    expect(intersects).toBe(false);
  }
}

test('scroll artwork is decorative, control-free, and idle between native scroll events', async ({ page }) => {
  await page.addInitScript(() => {
    const request = window.requestAnimationFrame.bind(window);
    window.__qaAnimationRequests = 0;
    window.requestAnimationFrame = callback => { window.__qaAnimationRequests++; return request(callback); };
  });
  await readyField(page);
  const canvas = page.locator('#field-canvas');
  await expect(page.locator('button, select, [role="button"]')).toHaveCount(0);
  await expect(canvas).toHaveAttribute('aria-hidden', 'true');
  expect(await canvas.getAttribute('role')).toBeNull();
  expect(await canvas.getAttribute('tabindex')).toBeNull();
  expect(await canvas.evaluate(element => getComputedStyle(element).pointerEvents)).toBe('none');
  expect(await canvas.evaluate(element => getComputedStyle(element).position)).toBe('fixed');
  await expect(page.locator('.field-stage')).toHaveAttribute('data-field-state', 'sphere');
  await page.waitForTimeout(140);
  const image = await canvasDigest(canvas);
  const requests = await page.evaluate(() => window.__qaAnimationRequests);
  await page.waitForTimeout(180);
  expect(await canvasDigest(canvas)).toBe(image);
  expect(await page.evaluate(() => window.__qaAnimationRequests)).toBeLessThanOrEqual(requests + 1);
  await page.mouse.move(300, 350);
  await page.mouse.wheel(0, 180);
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(100);
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).overflowY)).not.toBe('hidden');
});

test('scroll morph reverses deterministically and docks a tappable native brand', async ({ page }, testInfo) => {
  await readyField(page);
  const stage = page.locator('.field-stage');
  const canvas = page.locator('#field-canvas');
  const directory = process.env.SCREENSHOT_DIR || 'artifacts';
  await mkdir(directory, { recursive: true });
  const original = await canvasDigest(canvas);
  const { start, end } = await fieldMetrics(page);
  await page.screenshot({ path: join(directory, `${testInfo.project.name}-initial.png`) });
  if (start > 2) {
    await nativeScroll(page, start - 2);
    await expect(stage).toHaveAttribute('data-field-state', 'sphere');
  }
  const middle = start + (end - start) * .45;
  await nativeScroll(page, middle);
  await expect(stage).toHaveAttribute('data-field-state', 'morph');
  const halfway = await canvasDigest(canvas);
  expect(halfway).not.toBe(original);
  const middleScan = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(middleScan.violations).toEqual([]);
  await page.screenshot({ path: join(directory, `${testInfo.project.name}-middle.png`) });
  await nativeScroll(page, end + 40);
  await expect(stage).toHaveAttribute('data-field-state', 'docked');
  await expect(canvas).toBeHidden();
  await expect.poll(() => opacity(page.locator('.brand-dock'))).toBeGreaterThan(.95);
  await expect.poll(() => opacity(page.locator('.brand-name'))).toBeLessThan(.05);
  await assertDockBounds(page);
  const dockedScan = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(dockedScan.violations).toEqual([]);
  await page.screenshot({ path: join(directory, `${testInfo.project.name}-docked.png`) });
  await nativeScroll(page, middle);
  expect(await canvasDigest(canvas)).toBe(halfway);
  await nativeScroll(page, 0);
  expect(await canvasDigest(canvas)).toBe(original);
  await nativeScroll(page, end + 40);
  const dock = await page.locator('.brand-dock').boundingBox();
  const x = dock.x + dock.width / 2, y = dock.y + dock.height / 2;
  expect(await page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.closest('a')?.classList.contains('brand'), { x, y })).toBe(true);
  if (testInfo.project.name === 'mobile') await page.touchscreen.tap(x, y);
  else await page.mouse.click(x, y);
  await expect(page).toHaveURL('http://127.0.0.1:4173/');
  await expect.poll(() => page.evaluate(() => scrollY)).toBeLessThan(1);
});

test('direct anchors, reload restoration, and resized layouts recompute docking', async ({ page }) => {
  await readyField(page);
  await page.goto('/#selected-work');
  await page.evaluate(() => document.fonts.ready);
  await expect.poll(() => progress(page)).toBeGreaterThan(.95);
  await expect.poll(() => opacity(page.locator('.brand-dock'))).toBeGreaterThan(.95);
  await assertDockBounds(page);
  await page.goto('/');
  await expect(page.locator('.field-stage')).toHaveAttribute('data-field-ready', 'true');
  let metrics = await fieldMetrics(page);
  await nativeScroll(page, metrics.start + (metrics.end - metrics.start) * .55);
  const before = await progress(page);
  await page.reload();
  await expect(page.locator('.field-stage')).toHaveAttribute('data-field-ready', 'true');
  await expect.poll(() => progress(page)).toBeGreaterThan(before - .015);
  await expect.poll(() => progress(page)).toBeLessThan(before + .015);
  for (const viewport of [{ width: 320, height: 900 }, { width: 390, height: 900 }, { width: 768, height: 900 }, { width: 844, height: 390 }, { width: 736, height: 414 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    await page.evaluate(() => document.fonts.ready);
    metrics = await fieldMetrics(page);
    await nativeScroll(page, metrics.start);
    const fit = await page.evaluate(async () => {
      const { createSurface, projectSurface, INITIAL_YAW, INITIAL_PITCH } = await import('/assets/js/geometry.mjs');
      const points = projectSurface(createSurface(), INITIAL_YAW, INITIAL_PITCH);
      const art = document.querySelector('.field-art').getBoundingClientRect();
      return {
        top: art.top + art.height / 2 + Math.min(...points.map(point => point.y)) * art.width * .345,
        bottom: art.top + art.height / 2 + Math.max(...points.map(point => point.y)) * art.width * .345,
        header: document.querySelector('.site-header').getBoundingClientRect().bottom,
        height: innerHeight,
      };
    });
    expect(fit.top).toBeGreaterThan(fit.header + 8);
    expect(fit.bottom).toBeLessThan(fit.height - 8);
    await nativeScroll(page, metrics.start + (metrics.end - metrics.start) * .5);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await nativeScroll(page, metrics.end + 40);
    await assertDockBounds(page);
  }
});

test('reduced motion keeps the static sphere and ordinary native brand', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const stage = page.locator('.field-stage');
  await expect(stage).toHaveAttribute('data-field-state', 'static');
  expect(await stage.getAttribute('data-field-ready')).toBeNull();
  await expect(page.locator('.field-fallback')).toBeVisible();
  await expect(page.locator('#field-canvas')).toBeHidden();
  await expect(page.locator('#brand-canvas')).toBeHidden();
  const { end } = await fieldMetrics(page);
  await page.evaluate(top => scrollTo(0, top), end + 40);
  await expect(stage).toHaveAttribute('data-field-state', 'static');
  await expect(page.locator('.brand-name')).toBeVisible();
  expect(await opacity(page.locator('.brand-name'))).toBe(1);
  await expect(page.locator('button, select, [role="button"]')).toHaveCount(0);
});

test('keyboard and touch scrolling over the decorative canvas retain native behavior', async ({ page }) => {
  await readyField(page);
  await page.keyboard.press('PageDown');
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(100);
  await nativeScroll(page, 0);
  await page.locator('.field-art').scrollIntoViewIfNeeded();
  const art = await page.locator('.field-art').boundingBox();
  const viewport = page.viewportSize();
  const x = art.x + art.width / 2;
  const startY = Math.min(art.y + art.height * .65, viewport.height - 50);
  const initial = await page.evaluate(() => scrollY);
  const client = await page.context().newCDPSession(page);
  await client.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });
  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y: startY }] });
  for (let step = 1; step <= 8; step++) {
    await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: startY - step * 20 }] });
    await page.waitForTimeout(20);
  }
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(initial + 30);
  await expect(page.locator('#field-canvas')).toHaveAttribute('aria-hidden', 'true');
});
