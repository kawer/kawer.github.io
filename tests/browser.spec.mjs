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


test('point cloud supports reduced motion, keyboard rotation, and reset', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const canvas = page.locator('#field-canvas');
  await expect(canvas).toBeVisible();
  const motion = page.locator('[data-field-action="motion"]');
  await expect(motion).toBeVisible();
  await expect(motion).toHaveAttribute('aria-pressed', 'false');
  const pixels = () => canvas.evaluate(element => element.toDataURL());
  const resting = await pixels();
  await page.waitForTimeout(150);
  expect(await pixels()).toBe(resting);
  await expect(page.locator('[data-field-action="left"], [data-field-action="right"]')).toHaveCount(0);
  await canvas.focus();
  await page.keyboard.press('ArrowLeft');
  await expect.poll(pixels).not.toBe(resting);
  await page.locator('[data-field-action="reset"]').click();
  await expect.poll(pixels).toBe(resting);
  await motion.click();
  await expect(motion).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(pixels).not.toBe(resting);
  await motion.click();
  await expect(motion).toHaveAttribute('aria-pressed', 'false');
});

test('geometry can be rotated by pointer and keyboard controls', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const canvas = page.locator('#field-canvas');
  await expect(canvas).toBeVisible();
  const pixels = () => canvas.evaluate(element => element.toDataURL());
  await canvas.scrollIntoViewIfNeeded();
  const initial = await pixels();
  const bounds = await canvas.boundingBox();
  expect(bounds).toBeTruthy();
  await page.mouse.move(bounds.x + bounds.width * .55, bounds.y + bounds.height * .5);
  await page.mouse.down();
  await page.mouse.move(bounds.x + bounds.width * .7, bounds.y + bounds.height * .6, { steps: 5 });
  await page.mouse.up();
  await expect.poll(pixels).not.toBe(initial);
  const rotated = await pixels();
  await canvas.focus();
  await expect(canvas).toHaveAttribute('role', 'img');
  await expect(canvas).toHaveAttribute('tabindex', '0');
  await page.keyboard.press('ArrowRight');
  await expect.poll(pixels).not.toBe(rotated);
  await page.keyboard.press('Home');
  await expect.poll(pixels).toBe(initial);
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });
  test('static geometric artwork and content remain available', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.field-fallback')).toBeVisible();
    await expect(page.locator('#field-canvas')).toBeHidden();
    await expect(page.locator('.field-controls')).toBeHidden();
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


test('native shape selector works by keyboard and produces distinct reduced-motion artwork', async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const selector = page.getByRole('combobox', { name: 'Shape', exact: true });
  const canvas = page.locator('#field-canvas');
  const motion = page.locator('[data-field-action="motion"]');
  await expect(selector).toBeVisible();
  await expect(selector).toHaveValue('sphere');
  await expect(selector.locator('option')).toHaveText(['Rippled sphere', 'Torus', 'Trefoil knot']);
  const pixels = () => canvas.evaluate(element => element.toDataURL());
  const originalSphere = await pixels();
  await canvas.focus();
  await page.keyboard.press('ArrowRight');
  const rotatedSphere = await pixels();
  await selector.selectOption('torus');
  await selector.selectOption('sphere');
  expect(await pixels()).toBe(rotatedSphere);
  await canvas.focus();
  await page.keyboard.press('Home');
  expect(await pixels()).toBe(originalSphere);
  await selector.focus();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect(selector).toHaveValue('torus');
  const results = [];
  const directory = process.env.SCREENSHOT_DIR || 'artifacts';
  await mkdir(directory, { recursive: true });
  for (const shape of ['sphere', 'torus', 'trefoil']) {
    await selector.selectOption(shape);
    const image = await pixels();
    expect(results).not.toContain(image);
    results.push(image);
    await expect(motion).toHaveAttribute('aria-pressed', 'false');
    await page.waitForTimeout(180);
    expect(await pixels()).toBe(image);
    await canvas.focus();
    await page.keyboard.press('ArrowRight');
    await expect.poll(pixels).not.toBe(image);
    await page.keyboard.press('Home');
    await expect.poll(pixels).toBe(image);
    await expect(selector).toHaveValue(shape);
    await page.keyboard.press('ArrowUp');
    await page.locator('[data-field-action="reset"]').click();
    await expect.poll(pixels).toBe(image);
    await expect(selector).toHaveValue(shape);
    const scan = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    expect(scan.violations).toEqual([]);
    await page.locator('.field-controls').scrollIntoViewIfNeeded();
    await page.screenshot({ path: join(directory, `${testInfo.project.name}-shape-${shape}.png`) });
  }
});

test('shape morphing preserves paused state, running state, and the last interrupted selection', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  const selector = page.getByRole('combobox', { name: 'Shape', exact: true });
  const canvas = page.locator('#field-canvas');
  const motion = page.locator('[data-field-action="motion"]');
  await expect(motion).toHaveAttribute('aria-pressed', 'true');
  await motion.click();
  await expect(motion).toHaveAttribute('aria-pressed', 'false');
  const pixels = () => canvas.evaluate(element => element.toDataURL());
  await selector.selectOption('torus');
  await page.waitForTimeout(100);
  await selector.selectOption('trefoil');
  await page.waitForTimeout(850);
  await expect(selector).toHaveValue('trefoil');
  await expect(motion).toHaveAttribute('aria-pressed', 'false');
  const completed = await pixels();
  await page.waitForTimeout(160);
  expect(await pixels()).toBe(completed);
  await selector.selectOption('torus');
  await page.waitForTimeout(100);
  await canvas.click();
  const tapped = await pixels();
  await page.waitForTimeout(700);
  expect(await pixels()).toBe(tapped);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await selector.selectOption('sphere');
  await selector.selectOption('torus');
  expect(await pixels()).toBe(tapped);
  await selector.selectOption('sphere');
  await selector.selectOption('trefoil');
  expect(await pixels()).toBe(completed);
  await motion.click();
  await selector.selectOption('torus');
  await expect(motion).toHaveAttribute('aria-pressed', 'true');
  const rotating = await pixels();
  await expect.poll(pixels).not.toBe(rotating);
  await expect(selector).toHaveValue('torus');
});

test('shape controls remain reachable without overflow at phone and tablet widths', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const width of [320, 390, 768]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    const selector = page.getByRole('combobox', { name: 'Shape', exact: true });
    await selector.selectOption('trefoil');
    await expect(selector).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const controls = await page.locator('.field-controls').boundingBox();
    expect(controls.x).toBeGreaterThanOrEqual(0);
    expect(controls.x + controls.width).toBeLessThanOrEqual(width);
  }
});
