/* global window, document, performance, scrollTo, requestAnimationFrame, HTMLCanvasElement */
/** Matched local Chromium probe. Callback time excludes asynchronous GPU execution and presentation. */
import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { gzipSync } from 'node:zlib';

const url = process.argv[2] || 'http://127.0.0.1:4173';
const output = process.argv[3];
const maxProgress = Number(process.env.ORB_PROFILE_MAX_PROGRESS ?? .95);
const passMs = Number(process.env.ORB_PROFILE_PASS_MS ?? 1200);
const renderer = process.env.ORB_PROFILE_RENDERER ?? 'auto';
const longFrameMs = 50;
if (!(maxProgress > 0 && maxProgress <= 1 && Number.isFinite(passMs) && passMs >= 200)) throw new Error('Use a progress maximum in (0,1] and a pass duration of at least 200ms.');
if (!['auto','canvas','webgl2'].includes(renderer)) throw new Error('Use ORB_PROFILE_RENDERER=auto, canvas or webgl2.');
const browser = await chromium.launch({
  headless: process.env.ORB_PROFILE_HEADED !== '1',
  ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH } : {}),
});
const results = [];
let graphics;
const summarize = values => {
  const sorted = values.slice().sort((a,b)=>a-b);
  const percentile = fraction => sorted[Math.max(0,Math.ceil(sorted.length*fraction)-1)] ?? null;
  return {
    count:sorted.length, medianMs:percentile(.5), p95Ms:percentile(.95), p99Ms:percentile(.99),
    maxMs:sorted.at(-1) ?? null, atLeast50ms:sorted.filter(value=>value >= longFrameMs).length,
  };
};
const settle = page => page.waitForFunction(() => document.querySelector('.field-stage').getAttribute('data-field-settled') === 'true');
try {
  const browserSession = await browser.newBrowserCDPSession();
  const { gpu } = await browserSession.send('SystemInfo.getInfo');
  graphics = { devices:gpu.devices, glRenderer:gpu.auxAttributes?.glRenderer, glVendor:gpu.auxAttributes?.glVendor, featureStatus:gpu.featureStatus };
  for (const rate of [1,4]) {
    const page = await browser.newPage({ viewport:{width:1440,height:1000}, deviceScaleFactor:2, reducedMotion:'no-preference' });
    const responses = [];
    page.on('response',response => {
      const { pathname } = new URL(response.url());
      if (/\/assets\/js\//.test(pathname)) responses.push(response);
    });
    const session = await page.context().newCDPSession(page);
    await session.send('Emulation.setCPUThrottlingRate',{ rate });
    await page.addInitScript(({ maxProgress, renderer }) => {
      if (renderer === 'canvas') {
        const context = HTMLCanvasElement.prototype.getContext;
        HTMLCanvasElement.prototype.getContext = function(kind,...options) {
          return kind === 'webgl2' ? null : context.apply(this,[kind,...options]);
        };
      }
      const metrics = { phase:'', callback:[], frames:[], paintIntervals:[], previousPaint:0, previousFrame:0 };
      /** @type {Window & {orbProbe?:typeof metrics}} */ (window).orbProbe = metrics;
      const raf = window.requestAnimationFrame.bind(window);
      window.requestAnimationFrame = callback => {
        if (callback.name !== 'render') return raf(callback);
        return raf(time => {
          const phase = metrics.phase;
          const start = performance.now();
          callback(time);
          const elapsed = performance.now()-start;
          if (!phase) return;
          const stage = document.querySelector('.field-stage');
          const progress = Number(stage.getAttribute('data-field-progress'));
          const active = document.querySelector('#field-gl:not([hidden]), #field-canvas:not([hidden])');
          if (!active || (phase === 'pointer' ? progress !== 0 : progress <= 0 || progress >= maxProgress)) return;
          metrics.callback.push(elapsed);
          if (metrics.previousPaint) metrics.paintIntervals.push(time-metrics.previousPaint);
          metrics.previousPaint = time;
        });
      };
      // Sample browser animation-frame spacing independently of the orb's idle paints.
      function sample(time) {
        if (metrics.phase) {
          if (metrics.previousFrame) metrics.frames.push(time-metrics.previousFrame);
          metrics.previousFrame = time;
        }
        raf(sample);
      }
      raf(sample);
    },{ maxProgress, renderer });
    await page.goto(url);
    await page.evaluate(() => document.fonts.ready);
    await page.waitForFunction(() => document.querySelector('.field-stage').getAttribute('data-field-ready') === 'true');
    await page.waitForFunction(() => {
      const stage = document.querySelector('.field-stage');
      return !stage.hasAttribute('data-field-renderer') || ['active','unavailable'].includes(stage.getAttribute('data-field-gpu'));
    });
    const activeRenderer = await page.locator('.field-stage').getAttribute('data-field-renderer') ?? 'canvas';
    if (renderer !== 'auto' && activeRenderer !== renderer) throw new Error(`Requested ${renderer}, observed ${activeRenderer}. Check WebGL2 availability and the browser GPU driver.`);
    const contextDriver = activeRenderer === 'webgl2' ? await page.evaluate(() => {
      const canvas = /** @type {HTMLCanvasElement} */ (document.querySelector('#field-gl'));
      const gl = canvas.getContext('webgl2');
      const debug = gl.getExtension('WEBGL_debug_renderer_info');
      return debug ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
    }) : null;
    const { bounds, start, end } = await page.evaluate(() => {
      const art = document.querySelector('.field-art').getBoundingClientRect();
      const { fieldStart, fieldEnd } = /** @type {HTMLElement} */ (document.querySelector('.field-stage')).dataset;
      return {
        bounds:{ x:art.left+art.width/2,y:art.top+art.height/2,width:art.width },
        start:Number(fieldStart), end:Number(fieldEnd),
      };
    });
    const measures = {};
    async function begin(phase) {
      await page.evaluate(phase => {
        const metrics = /** @type {Window & {orbProbe?: any}} */ (window).orbProbe;
        Object.assign(metrics,{ phase, callback:[], frames:[], paintIntervals:[], previousPaint:0, previousFrame:0 });
      },phase);
    }
    async function record(phase) {
      const data = await page.evaluate(() => {
        const metrics = /** @type {Window & {orbProbe?: any}} */ (window).orbProbe;
        metrics.phase = '';
        return { callback:metrics.callback, paintIntervals:metrics.paintIntervals, frames:metrics.frames };
      });
      const bucket = measures[phase] ??= { callback:[], paintIntervals:[], frames:[] };
      for (const key of Object.keys(bucket)) bucket[key].push(...data[key]);
    }
    async function sweep() {
      const steps = 48;
      const begin = performance.now();
      for (let i=0;i<=steps;i++) {
        await delay(Math.max(0,begin+passMs*i/steps-performance.now()));
        const angle = 2*Math.PI*i/steps;
        await page.mouse.move(bounds.x+Math.cos(angle)*bounds.width*.30,bounds.y+Math.sin(angle)*bounds.width*.23);
      }
    }
    async function scroll(reverse) {
      await page.evaluate(({ start,end,reverse,passMs }) => new Promise(resolve => {
        const begin = performance.now();
        function tick(now) {
          const progress = Math.min(1,(now-begin)/passMs);
          scrollTo({ top:start+(end-start)*(reverse ? 1-progress : progress),behavior:'instant' });
          if (progress < 1) requestAnimationFrame(tick);
          else resolve(null);
        }
        requestAnimationFrame(tick);
      }),{ start,end,reverse,passMs });
    }
    for (let run=0;run<3;run++) {
      if (run) await begin('pointer');
      await sweep();
      if (run) await record('pointer');
      if (run) await begin('forward');
      await scroll(false);
      if (run) await record('forward');
      await settle(page);
      await page.mouse.move(8,8);
      if (run) await begin('reverse');
      await scroll(true);
      if (run) await record('reverse');
      await settle(page);
    }
    const phases = Object.fromEntries(Object.entries(measures).map(([phase, data]) => [phase,{
      callback:summarize(data.callback), frameSpacing:summarize(data.frames), paintSpacing:summarize(data.paintIntervals),
    }]));
    const payload = await Promise.all(responses.map(async response => {
      const { pathname } = new URL(response.url());
      const bytes = await response.body();
      return { path:pathname, phase:pathname.endsWith('field-webgl.mjs') ? 'deferred' : 'initial', raw:bytes.length, gzip:gzipSync(bytes).length };
    }));
    const canvasPixels = await page.locator(activeRenderer === 'webgl2' ? '#field-gl' : '#field-canvas').evaluate(element => {
      const canvas = /** @type {HTMLCanvasElement} */ (element);
      return canvas.width*canvas.height;
    });
    results.push({ cpuThrottle:rate, activeRenderer, contextDriver, canvasPixels, phases, payload });
    await page.close();
  }
} finally { await browser.close(); }
const report = {
  url, viewport:{ width:1440,height:1000,dpr:2 }, maxProgress, passMs, longFrameMs, browser:browser.version(),
  graphics, requestedRenderer:renderer, headless:process.env.ORB_PROFILE_HEADED !== '1', results,
  limits:'Callback timing measures main-thread submission. Frame spacing uses requestAnimationFrame timestamps. Pointer paint spacing includes any time at the idle cadence. Gzip sizes are estimates from local response bytes.',
};
if (output) {
  await mkdir(dirname(output),{ recursive:true });
  await writeFile(output,JSON.stringify(report,null,2)+'\n');
}
console.log(JSON.stringify(report,null,2));
