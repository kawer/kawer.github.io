/* global window, document, performance, scrollY, innerHeight, scrollTo, requestAnimationFrame */
/** Local rendering benchmark; not a Core Web Vitals or real-user measurement. */
import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

const url = process.argv[2] || 'http://127.0.0.1:4173';
const output = process.argv[3];
const maxProgress = Number(process.env.ORB_PROFILE_MAX_PROGRESS ?? .95);
const passMs = Number(process.env.ORB_PROFILE_PASS_MS ?? 1200);
if (!(maxProgress > 0 && maxProgress <= 1 && Number.isFinite(passMs) && passMs >= 200)) throw new Error('Use a progress maximum in (0,1] and a pass duration of at least 200ms.');
const browser = await chromium.launch({
  ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH } : {}),
});
const results = [];
try {
  for (const rate of [1,4]) {
    const page = await browser.newPage({ viewport: { width:1440,height:1000 },deviceScaleFactor:2,reducedMotion:'no-preference' });
    const session = await page.context().newCDPSession(page);
    await session.send('Emulation.setCPUThrottlingRate',{ rate });
    await page.addInitScript(({ maxProgress }) => {
      const metrics = /** @type {Window & {orbSamples?:number[]}} */ (window);
      metrics.orbSamples = [];
      const raf = window.requestAnimationFrame;
      window.requestAnimationFrame = callback => raf.call(window,time => {
        const start = performance.now();
        callback(time);
        const progress = Number(document.querySelector('.field-stage')?.getAttribute('data-field-progress'));
        const canvas = /** @type {HTMLCanvasElement | null} */ (document.querySelector('#field-canvas'));
        if (callback.name === 'render' && progress > 0 && progress < maxProgress && canvas && !canvas.hidden) metrics.orbSamples.push(performance.now()-start);
      });
    },{ maxProgress });
    await page.goto(url);
    await page.evaluate(() => document.fonts.ready);
    await page.waitForFunction(() => document.querySelector('.field-stage')?.getAttribute('data-field-ready') === 'true');
    const samples = await page.evaluate(async ({ passMs }) => {
      const metrics = /** @type {Window & {orbSamples?:number[]}} */ (window);
      const art = document.querySelector('.field-art').getBoundingClientRect();
      const hero = document.querySelector('.lab-hero').getBoundingClientRect();
      const header = document.querySelector('.site-header').getBoundingClientRect();
      const stage = /** @type {HTMLElement} */ (document.querySelector('.field-stage'));
      const start = Number(stage.dataset.fieldStart ?? Math.max(0,art.bottom+scrollY-innerHeight+24));
      const end = Number(stage.dataset.fieldEnd ?? Math.max(start+1,Math.min(hero.bottom+scrollY-header.height,document.documentElement.scrollHeight-innerHeight)));
      const spacing = [];
      const settle = () => new Promise(resolve => {
        function check() {
          if (document.querySelector('.field-stage').getAttribute('data-field-settled') === 'true') resolve(null);
          else requestAnimationFrame(check);
        }
        requestAnimationFrame(check);
      });
      // Warm both directions before collecting visible-morph frame samples.
      for (let run=0;run<6;run++) {
        if (run === 2) metrics.orbSamples = [];
        let previous = 0;
        await new Promise(resolve => {
          const begin = performance.now();
          function tick(now) {
            if (run >= 2 && previous) spacing.push(now-previous);
            previous = now;
            const progress = Math.min(1,(now-begin)/passMs);
            scrollTo({ top:start+(end-start)*(run%2 ? 1-progress : progress),behavior:'instant' });
            if (progress < 1) requestAnimationFrame(tick);
            else resolve(null);
          }
          requestAnimationFrame(tick);
        });
        await settle();
      }
      const summarize = values => {
        values.sort((a,b)=>a-b);
        return { count:values.length,medianMs:values[Math.floor(values.length*.5)],p95Ms:values[Math.floor(values.length*.95)],maxMs:values.at(-1) };
      };
      const canvas = /** @type {HTMLCanvasElement} */ (document.querySelector('#field-canvas'));
      return { callback:summarize(metrics.orbSamples),frameSpacing:summarize(spacing),canvasPixels:canvas.width*canvas.height };
    },{ passMs });
    results.push({ cpuThrottle:rate,...samples });
    await page.close();
  }
} finally { await browser.close(); }
const report = { url,viewport:{ width:1440,height:1000,dpr:2 },maxProgress,passMs,browser:browser.version(),results };
if (output) {
  await mkdir(dirname(output),{ recursive:true });
  await writeFile(output,JSON.stringify(report,null,2)+'\n');
}
console.log(JSON.stringify(report,null,2));
