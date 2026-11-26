import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { join } from 'node:path';
import { mkdir } from 'node:fs/promises';
import { loadCollection } from '../scripts/content.mjs';

const work = await loadCollection('work');
const featuredCount = work.filter(item=>item.featured).length || work.length;
const pages = ['/', '/work/', '/about/', '/resume/', ...work.map(item=>item.url), '/404.html'];
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
  for (const name of ['Work', 'About', 'Résumé']) {
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

test('reading pages use compact sections and an aligned article column', async ({ page }) => {
  await page.goto('/work/production-ai-evaluation/');
  const article = page.locator('.article-reading');
  await expect(article).toBeVisible();
  await expect(page.locator('.case-summary')).toHaveCount(0);
  const bounds = await article.evaluate(element => {
    const heading = element.querySelector('.page-heading').getBoundingClientRect();
    const lede = element.querySelector('.lede').getBoundingClientRect();
    const prose = element.querySelector('article').getBoundingClientRect();
    return { headingLeft: heading.left, proseLeft: prose.left, gap: prose.top - lede.bottom, width: prose.width };
  });
  expect(Math.abs(bounds.headingLeft - bounds.proseLeft)).toBeLessThan(2);
  expect(bounds.gap).toBeLessThanOrEqual(36);
  expect(bounds.width).toBeLessThanOrEqual(780);
  for (const route of ['/about/', '/resume/', '/work/']) {
    await page.goto(route);
    const gap = await page.evaluate(() => {
      const heading = document.querySelector('.page-heading').getBoundingClientRect();
      const section = document.querySelector('.section').getBoundingClientRect();
      return section.top - heading.bottom;
    });
    expect(gap).toBeLessThanOrEqual(24);
  }
});

test('engineering notes and legacy blog routes are withdrawn', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.site-nav a')).toHaveText(['Work', 'About', 'Résumé']);
  await expect(page.getByRole('heading', { name: 'Engineering notes' })).toHaveCount(0);
  await expect(page.locator('a[href^="/writing/"], a[href^="/docs/blog/"]')).toHaveCount(0);
  for (const route of ['/writing/', '/writing/evaluating-proposed-code-changes/', '/writing/validating-performance-metrics/', '/docs/blog/', '/docs/blog/index.html', '/docs/blog/bi-directional-taxonomies.html']) {
    expect((await page.request.get(route)).status()).toBe(404);
  }
});

test('homepage enhancement loads locally and reading pages need no JavaScript', async ({ page }) => {
  const requests = [];
  page.on('request', request => requests.push(request.url()));
  await page.goto('/');
  await expect(page.locator('h1')).toBeVisible();
  const scripts = page.locator('script[src]');
  await expect(scripts).toHaveCount(1);
  expect(await scripts.first().getAttribute('src')).toMatch(/^\/assets\/js\/field\.js\?v=[a-f0-9]{12}$/);
  expect(requests.every(url => url.startsWith('http://127.0.0.1:4173/'))).toBe(true);
  for (const route of ['/work/', '/about/', '/resume/']) {
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
    await expect(rows).toHaveCount(route === '/' ? featuredCount : work.length);
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


const fieldMetrics = async page => {
  // Viewport/font layout changes are measured on the next animation frame.
  // Let resize events and ResizeObserver deliver before consuming that range.
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  return page.evaluate(() => {
    const stage = document.querySelector('.field-stage');
    const header = document.querySelector('.site-header').getBoundingClientRect();
    const work = document.querySelector('#selected-work').getBoundingClientRect();
    const start = Number(stage.dataset.fieldStart || 0);
    const end = Number(stage.dataset.fieldEnd || Math.max(1,work.top+scrollY-header.height-24));
    return { start, end };
  });
};
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
async function forceCanvas(page) {
  await page.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(kind,...options) {
      return kind === 'webgl2' ? null : getContext.apply(this,[kind,...options]);
    };
  });
}
async function readyField(page, { canvas = true } = {}) {
  if (canvas) await forceCanvas(page);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator('.field-stage')).toHaveAttribute('data-field-ready', 'true');
}
async function nativeScroll(page, y) {
  const target = await page.evaluate(top => {
    const target = Math.max(0, Math.min(top, document.documentElement.scrollHeight - innerHeight));
    scrollTo({ top: target, behavior: 'instant' });
    return target;
  }, y);
  await expect.poll(() => page.evaluate(target => Math.abs(scrollY - target), target)).toBeLessThanOrEqual(1);
  const { start, end } = await fieldMetrics(page);
  const expected = await page.evaluate(({ start, end }) => Math.max(0, Math.min(1, (scrollY - start) / (end - start))), { start, end });
  await expect.poll(() => progress(page)).toBeGreaterThanOrEqual(expected - .002);
  await expect.poll(() => progress(page)).toBeLessThanOrEqual(expected + .002);
  await expect(page.locator('.field-stage')).toHaveAttribute('data-field-settled', 'true');
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

test('visible sphere rotates gently with a capped paint cadence and native scrolling', async ({ page }) => {
  await page.addInitScript(() => {
    const request = window.requestAnimationFrame.bind(window);
    window.__qaAnimationRequests = 0;
    window.requestAnimationFrame = callback => { window.__qaAnimationRequests++; return request(callback); };
    const clear = CanvasRenderingContext2D.prototype.clearRect;
    window.__qaOrbPaints = 0;
    CanvasRenderingContext2D.prototype.clearRect = function(...args) {
      if (this.canvas.id === 'field-canvas') window.__qaOrbPaints++;
      return clear.apply(this,args);
    };
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
  await expect(page.locator('.field-stage')).toHaveAttribute('data-field-idle', 'true');
  await page.waitForTimeout(140);
  const image = await canvasDigest(canvas);
  const before = await page.evaluate(() => ({requests:window.__qaAnimationRequests,paints:window.__qaOrbPaints,time:performance.now()}));
  await page.waitForTimeout(450);
  expect(await canvasDigest(canvas)).not.toBe(image);
  const after = await page.evaluate(time => ({requests:window.__qaAnimationRequests,paints:window.__qaOrbPaints,elapsed:performance.now()-time}),before.time);
  expect(after.paints).toBeGreaterThan(before.paints);
  expect(after.paints-before.paints).toBeLessThanOrEqual(Math.ceil(after.elapsed*24/1000)+2);
  expect(after.requests-before.requests).toBeLessThanOrEqual(Math.ceil(after.elapsed*24/1000)+3);
  await page.mouse.move(300, 350);
  await page.mouse.wheel(0, 180);
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(100);
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).overflowY)).not.toBe('hidden');
});

test('fine-pointer squeeze dents the orb, spreads dots, and hands off to native scroll', async ({ page, isMobile }) => {
  test.skip(isMobile, 'The fine-pointer comparison uses the desktop mouse');
  await page.clock.install();
  await page.clock.pauseAt(await page.evaluate(() => Date.now()+1000));
  const idle = await page.context().newPage();
  const runs = [page, idle];
  await Promise.all(runs.map(async run => {
    await forceCanvas(run);
    await run.addInitScript(() => {
      // Compare the coordinates sent to the real canvas in stable depth-band order.
      const { clearRect, arc } = CanvasRenderingContext2D.prototype;
      window.__qaDroplet = { dots: [], paints: 0 };
      CanvasRenderingContext2D.prototype.clearRect = function(...args) {
        if (this.canvas.id === 'field-canvas') {
          window.__qaDroplet.dots.length = 0;
          window.__qaDroplet.paints++;
        }
        return clearRect.apply(this,args);
      };
      CanvasRenderingContext2D.prototype.arc = function(x,y,...args) {
        if (this.canvas.id === 'field-canvas') window.__qaDroplet.dots.push(x,y);
        return arc.call(this,x,y,...args);
      };
    });
    await run.goto('/');
    await run.evaluate(async () => {
      await document.fonts.ready;
      // Let real layout observers deliver their initial measurements before ticking.
      await new Promise(resolve => {
        const observer = new ResizeObserver(() => { observer.disconnect(); resolve(); });
        observer.observe(document.querySelector('.field-art'));
      });
    });
  }));
  const advance = ms => page.clock.runFor(ms);
  await advance(224);
  await expect(page.locator('.field-stage')).toHaveAttribute('data-field-idle','true');
  expect(await page.evaluate(() => matchMedia('(any-pointer: fine)').matches)).toBe(true);
  const pointer = await page.locator('.field-art').evaluate(art => {
    const { left, top, width, height } = art.getBoundingClientRect();
    return { x: Math.round(left+width*.75), y: Math.round(top+height/2), centerX:Math.round(left+width/2) };
  });
  const readPaint = run => run.evaluate(() => {
    const { left, top } = document.querySelector('#field-canvas').getBoundingClientRect();
    return { ...window.__qaDroplet, left, top };
  });
  async function compare(contactX = pointer.x) {
    const [active, baseline] = await Promise.all(runs.map(readPaint));
    expect(active.dots.length).toBe(baseline.dots.length);
    expect(active.dots.length).toBeGreaterThan(0);
    let peak = 0, wide = 0, right = -Infinity, originalRight = -Infinity;
    let nearBefore = 0, nearAfter = 0;
    for (let i=0; i<active.dots.length; i+=2) {
      const x = baseline.dots[i]+baseline.left, pressedX = active.dots[i]+active.left;
      const y = baseline.dots[i+1]+baseline.top, pressedY = active.dots[i+1]+active.top;
      const change = Math.hypot(pressedX-x,pressedY-y);
      peak = Math.max(peak,change);
      if (change > 6) wide++;
      right = Math.max(right,pressedX);
      originalRight = Math.max(originalRight,x);
      if (Math.hypot(x-contactX,y-pointer.y) < 24) nearBefore++;
      if (Math.hypot(pressedX-contactX,pressedY-pointer.y) < 24) nearAfter++;
    }
    return { peak,wide,dent:originalRight-right,nearBefore,nearAfter,paints:active.paints };
  }
  const assertSqueeze = sample => {
    expect(sample.wide).toBeGreaterThan(1400);
    expect(sample.dent).toBeGreaterThan(20);
    expect(sample.nearBefore).toBeGreaterThan(10);
    expect(sample.nearAfter).toBeLessThan(sample.nearBefore*.66);
  };
  await page.mouse.move(8,8);
  await advance(100);
  expect((await compare()).peak).toBeLessThan(.001);
  await page.mouse.move(pointer.centerX,pointer.y);
  await advance(380);
  const center = await compare(pointer.centerX);
  expect(center.dent).toBeGreaterThan(8);
  expect(center.nearAfter).toBeGreaterThan(0);
  expect(center.nearAfter).toBeLessThan(center.nearBefore*.45);
  await page.mouse.move(8,8);
  await advance(620);
  await page.mouse.move(pointer.x,pointer.y);
  await advance(176);
  const approach = await compare();
  assertSqueeze(approach);
  const firstPose = await readPaint(page);
  await advance(250);
  assertSqueeze(await compare());
  expect((await readPaint(page)).dots).not.toEqual(firstPose.dots);

  const beforeBurst = (await compare()).paints;
  await page.evaluate(({ x, y }) => {
    for (let i=0; i<200; i++) {
      window.dispatchEvent(new PointerEvent('pointermove', {
        pointerType:'mouse', pointerId:1, isPrimary:true, clientX:x+(i+1)%10, clientY:y,
      }));
    }
  },pointer);
  expect((await compare()).paints).toBe(beforeBurst);
  await advance(180);
  expect((await compare()).paints-beforeBurst).toBeLessThanOrEqual(5);
  assertSqueeze(await compare());
  await page.evaluate(() => window.dispatchEvent(new PointerEvent('pointerout',{pointerId:1})));
  await advance(90);
  const releasing = (await compare()).peak;
  expect(releasing).toBeGreaterThan(1);
  expect(releasing).toBeLessThan(approach.peak);
  await advance(64);
  expect((await compare()).peak).toBeLessThan(releasing);
  await advance(850);
  expect((await compare()).peak).toBeLessThan(.001);

  // A fast in-page move to an empty corner should also leave a brief recovery.
  const artWidth = await page.locator('.field-art').evaluate(art => art.getBoundingClientRect().width);
  await page.mouse.move(pointer.x+Math.round(artWidth*.055),pointer.y);
  await advance(220);
  const nearEdge = (await compare()).peak;
  expect(nearEdge).toBeGreaterThan(16);
  await page.mouse.move(8,8);
  await advance(64);
  const residual = (await compare()).peak;
  expect(residual).toBeGreaterThan(1);
  expect(residual).toBeLessThan(nearEdge);
  await advance(930);
  expect((await compare()).peak).toBeLessThan(.001);

  await page.evaluate(({ x, y }) => window.dispatchEvent(new PointerEvent('pointermove',{
    pointerType:'touch', pointerId:2, isPrimary:true, clientX:x, clientY:y,
  })),pointer);
  await advance(100);
  expect((await compare()).peak).toBeLessThan(.001);
  for (const event of ['pointercancel','blur','resize','pageshow','visibilitychange']) {
    await page.mouse.move(pointer.x+2,pointer.y);
    await page.mouse.move(pointer.x,pointer.y);
    await advance(176);
    assertSqueeze(await compare());
    await Promise.all(runs.map(run => run.evaluate(event => {
      if (event === 'visibilitychange') {
        Object.defineProperty(document,'hidden',{configurable:true,value:true});
        document.dispatchEvent(new Event(event));
        delete document.hidden;
        document.dispatchEvent(new Event(event));
      } else if (event === 'pointercancel') {
        window.dispatchEvent(new PointerEvent(event,{pointerId:1}));
      } else window.dispatchEvent(new Event(event));
    },event)));
    await advance(1000);
    expect((await compare()).peak,event).toBeLessThan(.001);
  }

  const scroll = fraction => Promise.all(runs.map(run => run.evaluate(fraction => new Promise(resolve => {
    const { fieldStart, fieldEnd } = document.querySelector('.field-stage').dataset;
    const start = Number(fieldStart), end = Number(fieldEnd);
    const target = fraction === 1 ? Math.ceil(end) : Math.round(start+(end-start)*fraction);
    if (scrollY === target) { resolve(); return; }
    // The browser delivers scroll events while the test clock is paused.
    window.addEventListener('scroll',() => resolve(),{once:true});
    scrollTo({top:target,behavior:'instant'});
  }),fraction)));
  await page.mouse.move(pointer.x+2,pointer.y);
  await page.mouse.move(pointer.x,pointer.y);
  await advance(176);
  const deformed = (await compare()).peak;
  expect(deformed).toBeGreaterThan(16);
  await scroll(.004);
  await advance(16);
  expect(await progress(page)).toBeGreaterThan(0);
  expect((await compare()).peak).toBeGreaterThan(deformed*.65);
  await scroll(.04);
  await advance(16);
  expect((await compare()).peak).toBeGreaterThan(deformed*.65);
  await scroll(.003);
  await advance(900);
  expect((await compare()).peak).toBeLessThan(.001);
  await expect(page.locator('.field-stage')).toHaveAttribute('data-field-settled','true');
  await scroll(.45);
  await advance(900);
  expect((await compare()).peak).toBeLessThan(.001);
  const middle = await canvasDigest(page.locator('#field-canvas'));
  await scroll(1);
  await advance(900);
  await expect(page.locator('#field-canvas')).toBeHidden();
  expect(await canvasDigest(page.locator('#brand-canvas'))).toBe(await canvasDigest(idle.locator('#brand-canvas')));
  await scroll(.45);
  await advance(900);
  expect(await canvasDigest(page.locator('#field-canvas'))).toBe(middle);
  await scroll(0);
  await advance(900);
  expect((await compare()).peak).toBeLessThan(.001);
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
  await expect(stage).toHaveAttribute('data-field-state','sphere');
  await expect(stage).toHaveAttribute('data-field-idle','true');
  await nativeScroll(page, end + 40);
  const dock = await page.locator('.brand-dock').boundingBox();
  const x = dock.x + dock.width / 2, y = dock.y + dock.height / 2;
  expect(await page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.closest('a')?.classList.contains('brand'), { x, y })).toBe(true);
  if (testInfo.project.name === 'mobile') await page.touchscreen.tap(x, y);
  else await page.mouse.click(x, y);
  await expect(page).toHaveURL('http://127.0.0.1:4173/');
  await expect.poll(() => page.evaluate(() => scrollY)).toBeLessThan(1);
});

test('idle motion pauses outside the visible sphere and preserves its pose through morphing', async ({ page }) => {
  test.setTimeout(60000);
  await page.clock.install();
  await page.addInitScript(() => {
    const clear = CanvasRenderingContext2D.prototype.clearRect;
    window.__qaOrbPaints = 0;
    CanvasRenderingContext2D.prototype.clearRect = function(...args) {
      if (this.canvas.id === 'field-canvas') window.__qaOrbPaints++;
      return clear.apply(this,args);
    };
  });
  await readyField(page);
  const stage = page.locator('.field-stage'), canvas = page.locator('#field-canvas');
  await expect(stage).toHaveAttribute('data-field-idle','true');
  await page.clock.pauseAt(await page.evaluate(()=>Date.now()+60000));
  // Exercise the wrapped angle after a long idle, not only its initial pose.
  await page.clock.runFor(51000);
  const pose = await canvasDigest(canvas);
  await page.evaluate(() => {
    window.__qaHidden = true;
    Object.defineProperty(document,'hidden',{configurable:true,get:()=>window.__qaHidden});
    document.dispatchEvent(new Event('visibilitychange'));
  });
  const hiddenPaints = await page.evaluate(()=>window.__qaOrbPaints);
  await page.clock.runFor(10000);
  expect(await page.evaluate(()=>window.__qaOrbPaints)).toBe(hiddenPaints);
  expect(await canvasDigest(canvas)).toBe(pose);
  await page.evaluate(()=>{window.__qaHidden=false;document.dispatchEvent(new Event('visibilitychange'));});
  await page.clock.runFor(16);
  expect(await canvasDigest(canvas)).toBe(pose);
  await page.clock.runFor(200);
  expect(await canvasDigest(canvas)).not.toBe(pose);
  const metrics = await stage.evaluate(node=>({start:Number(node.dataset.fieldStart),end:Number(node.dataset.fieldEnd)}));
  const scroll = async fraction => {
    const target = await page.evaluate(({metrics,fraction})=>{
      const target = Math.round(metrics.start+(metrics.end-metrics.start)*fraction);
      scrollTo({top:target,behavior:'instant'});
      return target;
    },{metrics,fraction});
    await expect.poll(()=>page.evaluate(()=>scrollY)).toBe(target);
    // Native scroll events use the browser's real frame queue; explicitly
    // deliver one before advancing the paused test clock's animation frames.
    await page.evaluate(()=>window.dispatchEvent(new Event('scroll')));
    await page.clock.runFor(1200);
    await expect(stage).toHaveAttribute('data-field-settled','true');
    const expected = Math.max(0,Math.min(1,(target-metrics.start)/(metrics.end-metrics.start)));
    expect(Math.abs(await progress(page)-expected)).toBeLessThan(.002);
  };
  await scroll(.45);
  await expect(stage).toHaveAttribute('data-field-idle','false');
  const middle = await canvasDigest(canvas), middlePaints = await page.evaluate(()=>window.__qaOrbPaints);
  await page.clock.runFor(5000);
  expect(await page.evaluate(()=>window.__qaOrbPaints)).toBe(middlePaints);
  expect(await canvasDigest(canvas)).toBe(middle);
  await scroll(1);
  await expect(stage).toHaveAttribute('data-field-state','docked');
  const dockedPaints = await page.evaluate(()=>window.__qaOrbPaints);
  await page.clock.runFor(5000);
  expect(await page.evaluate(()=>window.__qaOrbPaints)).toBe(dockedPaints);
  await scroll(.45);
  expect(await canvasDigest(canvas)).toBe(middle);
  await page.emulateMedia({reducedMotion:'reduce'});
  await expect.poll(async()=>{
    await page.clock.runFor(64);
    return stage.getAttribute('data-field-state');
  }).toBe('static');
  const reducedPaints = await page.evaluate(()=>window.__qaOrbPaints);
  await page.clock.runFor(5000);
  expect(await page.evaluate(()=>window.__qaOrbPaints)).toBe(reducedPaints);
  await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));
  await page.emulateMedia({reducedMotion:'no-preference'});
  await expect.poll(async()=>{
    await page.clock.runFor(200);
    return stage.getAttribute('data-field-idle');
  }).toBe('true');
  await page.setViewportSize({width:390,height:300});
  await page.evaluate(async () => {
    // Native layout notifications run independently of the paused test clock.
    await new Promise(resolve => {
      const observer = new ResizeObserver(() => { observer.disconnect(); resolve(); });
      observer.observe(document.querySelector('.field-art'));
    });
    window.dispatchEvent(new Event('resize'));
  });
  await page.clock.runFor(100);
  await expect(stage).toHaveAttribute('data-field-idle','false');
  const offscreenPaints = await page.evaluate(()=>window.__qaOrbPaints);
  await page.clock.runFor(5000);
  expect(await page.evaluate(()=>window.__qaOrbPaints)).toBe(offscreenPaints);
  await page.setViewportSize({width:390,height:844});
  await page.evaluate(()=>window.dispatchEvent(new Event('resize')));
  await page.clock.runFor(1000);
  await expect(stage).toHaveAttribute('data-field-idle','true');
});

test('fast scroll jumps animate through intermediate shapes and dock on tall screens', async ({ page }, testInfo) => {
  const widths = testInfo.project.name === 'desktop' ? [1920, 3840] : [1920];
  for (const width of widths) {
    await page.setViewportSize({ width, height: 2160 });
    await readyField(page);
    const limit = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
    expect(limit).toBeGreaterThan(0);
    const samples = await page.evaluate(() => new Promise((resolve, reject) => {
      const stage = document.querySelector('.field-stage');
      const header = document.querySelector('.site-header');
      const canvas = document.querySelector('#field-canvas');
      const samples = [];
      scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' });
      // Late font/element measurements must not turn a scroll into an instant snap.
      document.querySelector('.lab-hero').style.borderBottom = '1px solid transparent';
      function sample() {
        samples.push({ progress:Number(stage.dataset.fieldProgress), visible:!canvas.hidden,
          transparent:getComputedStyle(header).backgroundColor === 'rgba(0, 0, 0, 0)' });
        if (stage.dataset.fieldState === 'docked' && stage.dataset.fieldSettled === 'true') return resolve(samples);
        if (samples.length > 180) return reject(new Error('The scroll morph did not finish docking'));
        requestAnimationFrame(sample);
      }
      requestAnimationFrame(sample);
    }));
    const moving = samples.filter(sample => sample.progress > 0 && sample.progress < 1);
    expect(moving.length).toBeGreaterThan(3);
    expect(moving.some(sample => sample.visible)).toBe(true);
    expect(moving.every(sample => !sample.visible || sample.transparent)).toBe(true);
    expect(samples.at(-1).transparent).toBe(false);
    await expect(page.locator('.field-stage')).toHaveAttribute('data-field-progress', '1.00000');
    await assertDockBounds(page);
    await nativeScroll(page, 0);
    await expect(page.locator('.field-stage')).toHaveAttribute('data-field-state', 'sphere');
  }
});

test('work arrives during the morph and particles stay clear of readable text', async ({ page, isMobile }) => {
  const sizes = isMobile ? [{ width:390,height:844 },{ width:320,height:740 }] : [{ width:1440,height:1000 },{ width:844,height:390 }];
  for (const size of sizes) {
    await page.setViewportSize(size);
    await readyField(page);
    const { start,end } = await fieldMetrics(page);
    for (const phase of [.25,.45,.75]) {
      await nativeScroll(page,start+(end-start)*phase);
      const flow = await page.evaluate(() => {
        const work = document.querySelector('#selected-work').getBoundingClientRect();
        const title = document.querySelector('.home-work .work-title').getBoundingClientRect();
        const header = document.querySelector('.site-header').getBoundingClientRect();
        const canvas = document.querySelector('#field-canvas'), bounds = canvas.getBoundingClientRect();
        const context = canvas.getContext('2d'), ratio = canvas.width/bounds.width;
        const overlaps = [];
        if (!canvas.hidden) for (const selector of ['.hero-heading','.hero-foot','.home-work .section-heading','.home-work .work-title']) {
          for (const element of document.querySelectorAll(selector)) {
            const walker = document.createTreeWalker(element,NodeFilter.SHOW_TEXT);
            while (walker.nextNode()) {
              if (!walker.currentNode.textContent.trim()) continue;
              const range = document.createRange(); range.selectNodeContents(walker.currentNode);
              for (const rect of range.getClientRects()) {
                const left = Math.max(0,rect.left,bounds.left), right = Math.min(innerWidth,rect.right,bounds.right);
                const top = Math.max(header.bottom,rect.top,bounds.top), bottom = Math.min(innerHeight,rect.bottom,bounds.bottom);
                if (right <= left || bottom <= top) continue;
                const x = Math.max(0,Math.floor((left-bounds.left)*ratio)), y = Math.max(0,Math.floor((top-bounds.top)*ratio));
                const width = Math.min(canvas.width-x,Math.ceil((right-left)*ratio)), height = Math.min(canvas.height-y,Math.ceil((bottom-top)*ratio));
                if (width <= 0 || height <= 0) continue;
                const pixels = context.getImageData(x,y,width,height).data;
                if (pixels.some((alpha,index)=>index%4 === 3 && alpha > 8)) overlaps.push(selector);
              }
            }
          }
        }
        return { workTop:work.top,titleBottom:title.bottom,headerBottom:header.bottom,height:innerHeight,overlaps };
      });
      expect(flow.overlaps).toEqual([]);
      if (phase === .45) expect(flow.workTop).toBeLessThan(flow.height*.75);
      if (phase === .75) {
        expect(flow.workTop).toBeGreaterThan(flow.headerBottom);
        expect(flow.titleBottom).toBeLessThan(flow.height);
      }
    }
  }
});

test('artwork uses a bounded surface and stops painting after the header handoff', async ({ page, isMobile }) => {
  if (!isMobile) await page.setViewportSize({ width: 3840, height: 2160 });
  await readyField(page);
  const pixels = await page.locator('#field-canvas').evaluate(canvas => ({
    actual: canvas.width*canvas.height,
    viewport: innerWidth*innerHeight*Math.min(devicePixelRatio,2)**2,
  }));
  expect(pixels.actual).toBeLessThan(pixels.viewport*.6);
  await page.evaluate(() => {
    window.fieldClears = 0;
    const clear = CanvasRenderingContext2D.prototype.clearRect;
    CanvasRenderingContext2D.prototype.clearRect = function(...args) {
      if (this.canvas.id === 'field-canvas') window.fieldClears++;
      return clear.apply(this,args);
    };
  });
  const { start, end } = await fieldMetrics(page);
  await nativeScroll(page,start+(end-start)*.96);
  await expect(page.locator('#field-canvas')).toBeHidden();
  const clears = await page.evaluate(() => window.fieldClears);
  await nativeScroll(page,start+(end-start)*.99);
  expect(await page.evaluate(() => window.fieldClears)).toBe(clears);
  await nativeScroll(page,start+(end-start)*.45);
  await expect(page.locator('#field-canvas')).toBeVisible();
  expect(await page.evaluate(() => window.fieldClears)).toBeGreaterThan(clears);
  await nativeScroll(page,0);
  await expect(page.locator('.field-stage')).toHaveAttribute('data-field-state','sphere');
});

test('older motion listeners and missing resize observer still animate and follow preferences', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    const match = window.matchMedia.bind(window);
    window.matchMedia = query => {
      const result = match(query);
      Object.defineProperty(result, 'addEventListener', { value: undefined });
      return result;
    };
    window.ResizeObserver = undefined;
  });
  await readyField(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('.field-stage')).toHaveAttribute('data-field-state', 'static');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect(page.locator('.field-stage')).toHaveAttribute('data-field-state', 'sphere');
  const { end } = await fieldMetrics(page);
  await nativeScroll(page, end + 40);
  await expect(page.locator('.field-stage')).toHaveAttribute('data-field-state', 'docked');
  expect(errors).toEqual([]);
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
  await readyField(page,{canvas:false});
  await page.keyboard.press('PageDown');
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(100);
  // Native keyboard scrolling may still be easing after it first crosses 100px.
  // Observe its completion before testing a separate instant scroll and gesture.
  await page.evaluate(() => new Promise((resolve, reject) => {
    let previous = scrollY, stableFrames = 0, frames = 0;
    const settle = () => {
      const current = scrollY;
      stableFrames = Math.abs(current - previous) < .01 ? stableFrames + 1 : 0;
      previous = current;
      if (stableFrames >= 6) { resolve(); return; }
      if (++frames >= 180) { reject(new Error('Native keyboard scroll did not settle')); return; }
      requestAnimationFrame(settle);
    };
    requestAnimationFrame(settle);
  }));
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

for (const software of [false,true]) {
  test(`${software ? 'Software' : 'Unavailable'} WebGL2 keeps the usable Canvas frame`, async ({ page, isMobile }) => {
    test.skip(isMobile, 'The renderer probe is covered on desktop');
    await page.addInitScript(software => {
      const getContext = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function(kind,...options) {
        if (this.id === 'field-gl' && kind === 'webgl2') {
          return software ? {
            RENDERER:0x1f01,
            getExtension:() => null,
            getParameter:() => 'ANGLE (Google, Vulkan SwiftShader Device)',
          } : null;
        }
        return getContext.apply(this,[kind,...options]);
      };
    },software);
    const requested = [];
    const observe = request => requested.push(request.url());
    page.on('request',observe);
    await readyField(page,{canvas:false});
    await expect(page.locator('.field-stage')).toHaveAttribute('data-field-gpu','unavailable');
    await expect(page.locator('.field-stage')).toHaveAttribute('data-field-renderer','canvas');
    await expect(page.locator('#field-canvas')).toBeVisible();
    expect(requested.some(url => url.includes('field-webgl.mjs'))).toBe(false);
    page.off('request',observe);
  });
}

async function inspectGPU(page) {
  await page.addInitScript(() => {
    window.__qaGPU = { draws:0, uploads:0, dots:0, canvasPaints:0, samples:[], capture:false, strength:0, peakFlow:0,
      wobbleX:0, wobbleY:0, wobbleHistory:[], captureWobble:false };
    const stats = window.__qaGPU;
    const getContext = HTMLCanvasElement.prototype.getContext;
    const clear = CanvasRenderingContext2D.prototype.clearRect;
    CanvasRenderingContext2D.prototype.clearRect = function(...args) {
      if (this.canvas.id === 'field-canvas') stats.canvasPaints++;
      return clear.apply(this,args);
    };
    HTMLCanvasElement.prototype.getContext = function(kind,...options) {
      if (this.id !== 'field-gl' || kind !== 'webgl2') return getContext.apply(this,[kind,...options]);
      stats.probedAfterCanvas = stats.canvasPaints > 0 && document.querySelector('#field-canvas').hidden === false;
      // The production gate is tested separately. Exercise genuine WebGL2 calls
      // even where headless Chromium only has its software rasterizer.
      const gl = getContext.call(this,kind,{...options[0],failIfMajorPerformanceCaveat:false});
      if (!gl) return null;
      stats.lose = () => gl.getExtension('WEBGL_lose_context').loseContext();
      const getParameter = gl.getParameter.bind(gl);
      const debug = gl.getExtension('WEBGL_debug_renderer_info');
      gl.getParameter = key => key === gl.RENDERER || key === debug?.UNMASKED_RENDERER_WEBGL ? 'QA WebGL2' : getParameter(key);
      const bufferData = gl.bufferData.bind(gl), drawArrays = gl.drawArrays.bind(gl);
      gl.bufferData = (...args) => { stats.uploads++; return bufferData(...args); };
      const location = gl.getUniformLocation.bind(gl), uniform4f = gl.uniform4f.bind(gl);
      const uniform2f = gl.uniform2f.bind(gl), positions = new WeakSet(), flow = new WeakSet(), wobble = new WeakSet();
      gl.getUniformLocation = (program,name) => {
        const result = location(program,name);
        if (result && name === 'droplet') positions.add(result);
        if (result && name === 'flow') flow.add(result);
        if (result && name === 'wobble') wobble.add(result);
        return result;
      };
      gl.uniform4f = (location,x,y,strength,extent) => {
        if (positions.has(location)) stats.strength = strength;
        return uniform4f(location,x,y,strength,extent);
      };
      gl.uniform2f = (location,x,y) => {
        if (flow.has(location)) stats.peakFlow = Math.max(stats.peakFlow,Math.hypot(x,y));
        if (wobble.has(location)) {
          stats.wobbleX = x;
          stats.wobbleY = y;
          if (stats.captureWobble) stats.wobbleHistory.push({x,y});
        }
        return uniform2f(location,x,y);
      };
      gl.drawArrays = (mode,first,count) => {
        drawArrays(mode,first,count);
        if (mode !== gl.POINTS) return;
        stats.draws++;
        stats.dots = count;
        const stage = document.querySelector('.field-stage');
        if (stats.capture) {
          const { strength,wobbleY } = stats;
          queueMicrotask(() => stats.samples.push({ strength,wobbleY,progress:Number(stage.dataset.fieldProgress) }));
        }
        if (!stats.nonzero) {
          const pixels = new Uint8Array(gl.drawingBufferWidth*gl.drawingBufferHeight*4);
          gl.readPixels(0,0,gl.drawingBufferWidth,gl.drawingBufferHeight,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
          stats.nonzero = pixels.filter((value,index) => index%4 === 3 && value > 0).length;
        }
      };
      return gl;
    };
  });
}

test('WebGL2 draws the droplet with static buffers and hands off through native scroll', async ({ page, isMobile }) => {
  test.skip(isMobile, 'The shader input and native wheel comparison use desktop');
  await inspectGPU(page);
  await readyField(page,{canvas:false});
  const stage = page.locator('.field-stage'), gl = page.locator('#field-gl');
  await expect(stage).toHaveAttribute('data-field-renderer','webgl2');
  await expect(gl).toBeVisible();
  await expect(page.locator('#field-canvas')).toBeHidden();
  const initial = await page.evaluate(() => { const { lose, ...stats } = window.__qaGPU; return stats; });
  expect(initial.probedAfterCanvas).toBe(true);
  expect(initial.dots).toBe(8910);
  expect(initial.nonzero).toBeGreaterThan(500);
  expect(initial.uploads).toBe(2);
  const bounds = await page.locator('.field-art').boundingBox();
  await page.mouse.move(bounds.x+bounds.width*.79,bounds.y+bounds.height*.5);
  await expect.poll(() => page.evaluate(() => window.__qaGPU.strength)).toBeGreaterThan(.12);
  await page.mouse.move(bounds.x+bounds.width*.59,bounds.y+bounds.height*.63);
  await expect.poll(() => page.evaluate(() => window.__qaGPU.peakFlow)).toBeGreaterThan(.25);
  await page.mouse.move(bounds.x+bounds.width*.79,bounds.y+bounds.height*.5);
  await page.waitForTimeout(320);
  await page.evaluate(() => { window.__qaGPU.captureWobble = true; });
  await page.mouse.move(8,8);
  await expect.poll(() => page.evaluate(() => window.__qaGPU.wobbleHistory.some(sample => sample.x > .055))).toBe(true);
  await expect.poll(() => page.evaluate(() => window.__qaGPU.wobbleHistory.some(sample => sample.x < -.025))).toBe(true);
  await expect.poll(() => page.evaluate(() => Math.abs(window.__qaGPU.wobbleX)+Math.abs(window.__qaGPU.wobbleY))).toBe(0);
  await page.evaluate(() => { window.__qaGPU.wobbleHistory.length = 0; });
  await nativeScroll(page,120);
  expect(await page.evaluate(() => window.__qaGPU.wobbleHistory.some(sample => sample.y < -.06))).toBe(true);
  await page.evaluate(() => { window.__qaGPU.wobbleHistory.length = 0; });
  await nativeScroll(page,0);
  expect(await page.evaluate(() => window.__qaGPU.wobbleHistory.some(sample => sample.y > .06))).toBe(true);
  await page.evaluate(() => { window.__qaGPU.captureWobble = false; });
  await page.mouse.move(bounds.x+bounds.width*.79,bounds.y+bounds.height*.5);
  await expect.poll(() => page.evaluate(() => window.__qaGPU.strength)).toBeGreaterThan(.12);
  await page.evaluate(() => { window.__qaGPU.capture = true; });
  await page.mouse.wheel(0,1000);
  await expect(stage).toHaveAttribute('data-field-state','docked');
  await expect(gl).toBeHidden();
  const dockedDraws = await page.evaluate(() => window.__qaGPU.draws);
  await page.waitForTimeout(140);
  expect(await page.evaluate(() => window.__qaGPU.draws)).toBe(dockedDraws);
  const after = await page.evaluate(() => { const { lose, ...stats } = window.__qaGPU; return stats; });
  expect(after.uploads).toBe(initial.uploads);
  expect(after.canvasPaints).toBe(initial.canvasPaints);
  expect(after.samples.some(sample => sample.progress > 0 && sample.progress < .12 && sample.strength > 0)).toBe(true);
  expect(after.samples.some(sample => sample.progress >= .18 && sample.strength === 0)).toBe(true);
  expect(after.samples.some(sample => sample.progress >= .58 && sample.wobbleY === 0)).toBe(true);
  await page.evaluate(() => { window.__qaGPU.wobbleHistory.length = 0; window.__qaGPU.captureWobble = true; });
  await nativeScroll(page,0);
  expect(await page.evaluate(() => window.__qaGPU.wobbleHistory.some(sample => sample.y > .08))).toBe(true);
  await page.evaluate(() => { window.__qaGPU.captureWobble = false; });
  const { start,end } = await fieldMetrics(page);
  await nativeScroll(page,start+(end-start)*.45);
  await expect(gl).toBeVisible();
  expect(await page.evaluate(() => window.__qaGPU.strength)).toBe(0);
  await nativeScroll(page,0);
  await expect(stage).toHaveAttribute('data-field-state','sphere');
  const hiddenDraws = await page.evaluate(() => {
    Object.defineProperty(document,'hidden',{configurable:true,value:true});
    document.dispatchEvent(new Event('visibilitychange'));
    return window.__qaGPU.draws;
  });
  await page.waitForTimeout(140);
  expect(await page.evaluate(() => window.__qaGPU.draws)).toBe(hiddenDraws);
  await page.evaluate(() => {
    delete document.hidden;
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect.poll(() => page.evaluate(() => window.__qaGPU.draws)).toBeGreaterThan(hiddenDraws);
  await page.emulateMedia({reducedMotion:'reduce'});
  await expect(stage).toHaveAttribute('data-field-state','static');
  await expect(gl).toBeHidden();
  await expect(page.locator('.field-fallback')).toBeVisible();
  await page.emulateMedia({reducedMotion:'no-preference'});
  await expect(gl).toBeVisible();
  await page.evaluate(() => window.__qaGPU.lose());
  await expect(stage).toHaveAttribute('data-field-renderer','canvas');
  await expect(page.locator('#field-canvas')).toBeVisible();
  await expect(gl).toBeHidden();
});

test('deferred renderer initialization failure leaves Canvas animation usable', async ({ page, isMobile }) => {
  test.skip(isMobile, 'The deferred failure path is covered on desktop');
  await inspectGPU(page);
  await page.route(/\/field-webgl\.mjs\?v=/,route => route.fulfill({
    contentType:'text/javascript',
    body:'export function createWebGLField() { throw new Error("QA initialization failure"); }',
  }));
  await readyField(page,{canvas:false});
  await expect(page.locator('.field-stage')).toHaveAttribute('data-field-gpu','unavailable');
  expect(await page.evaluate(() => window.__qaGPU.probedAfterCanvas)).toBe(true);
  await expect(page.locator('#field-canvas')).toBeVisible();
  const { start,end } = await fieldMetrics(page);
  await nativeScroll(page,start+(end-start)*.4);
  await expect(page.locator('.field-stage')).toHaveAttribute('data-field-state','morph');
});
