import { createSurface, createNameSurface, projectSurface, INITIAL_YAW, INITIAL_PITCH } from './geometry.mjs';

const canvas = /** @type {HTMLCanvasElement | null} */ (document.querySelector('#field-canvas'));
const mini = /** @type {HTMLCanvasElement | null} */ (document.querySelector('#brand-canvas'));
const stage = /** @type {HTMLElement | null} */ (document.querySelector('.field-stage'));
const art = /** @type {HTMLElement | null} */ (document.querySelector('.field-art'));
const hero = /** @type {HTMLElement | null} */ (document.querySelector('.lab-hero'));
const header = /** @type {HTMLElement | null} */ (document.querySelector('.site-header'));
const dock = /** @type {HTMLElement | null} */ (document.querySelector('.brand-dock'));
const context = canvas?.getContext('2d'), miniContext = mini?.getContext('2d');
if (canvas && mini && stage && art && hero && header && dock && context && miniContext) {
  const sphere = createSurface(), name = createNameSurface(sphere.length);
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let frame = 0, measureNeeded = true, docked = false;
  let visualProgress = 0, initialized = false, lastFrameTime = 0;
  let artX = 0, artY = 0, artSize = 0, start = 0, end = 1;
  const clamp = value => Math.max(0,Math.min(1,value));
  const ease = value => { const t = clamp(value); return t*t*(3-2*t); };

  function fit(target, ctx, width, height) {
    const ratio = Math.min(devicePixelRatio || 1,2);
    const w = Math.round(width*ratio), h = Math.round(height*ratio);
    if (target.width !== w || target.height !== h) { target.width = w; target.height = h; }
    ctx.setTransform(ratio,0,0,ratio,0,0);
    ctx.clearRect(0,0,width,height);
  }
  function paint(ctx, points, x, y, scale, radiusScale, opacity = 1) {
    if (opacity <= 0) return;
    for (let band=0;band<8;band++) {
      ctx.fillStyle = `rgba(35,92,219,${(0.14+band*0.115)*opacity})`;
      ctx.beginPath();
      for (const point of points) {
        if (Math.max(0,Math.min(7,Math.floor((point.depth+1.12)/2.25*8))) !== band) continue;
        const radius = (0.6+band*0.13)*radiusScale;
        const px = x+point.x*scale, py = y+point.y*scale;
        ctx.moveTo(px+radius,py); ctx.arc(px,py,radius,0,Math.PI*2);
      }
      ctx.fill();
    }
  }
  function measure() {
    const rect = art.getBoundingClientRect();
    artX = rect.left+rect.width/2;
    artY = rect.top+window.scrollY+rect.height/2;
    artSize = rect.width;
    // Mobile sees the complete orb before the transformation begins.
    start = Math.max(0,rect.bottom+window.scrollY-window.innerHeight+24);
    const heroEnd = hero.getBoundingClientRect().bottom+window.scrollY-header.getBoundingClientRect().height;
    const scrollLimit = Math.max(0,document.documentElement.scrollHeight-window.innerHeight);
    end = Math.max(start+1,Math.min(heroEnd,scrollLimit));
    const target = dock.getBoundingClientRect();
    fit(mini,miniContext,target.width,target.height);
    paint(miniContext,projectSurface(name,0,0),target.width/2,target.height/2,target.width/2.9,0.45);
    measureNeeded = false;
  }
  function staticFallback() {
    canvas.hidden = true; mini.hidden = true;
    delete stage.dataset.fieldReady;
    stage.dataset.fieldState = 'static'; stage.dataset.fieldProgress = '0'; stage.dataset.fieldSettled = 'true';
    header.style.setProperty('--dock-opacity','0');
    docked = false; initialized = false;
  }
  function render(now = performance.now()) {
    frame = 0;
    if (reducedMotion.matches) { staticFallback(); return; }
    try {
      const layoutChanged = measureNeeded;
      if (measureNeeded) measure();
      const targetProgress = clamp((window.scrollY-start)/(end-start));
      if (!initialized || layoutChanged) {
        visualProgress = targetProgress;
        initialized = true;
      } else {
        const elapsed = Math.max(1,Math.min(32,now-lastFrameTime));
        visualProgress += (targetProgress-visualProgress)*(1-Math.exp(-elapsed/65));
        if (Math.abs(targetProgress-visualProgress) < 0.0001) visualProgress = targetProgress;
      }
      lastFrameTime = now;
      const progress = visualProgress;
      const settled = progress === targetProgress;
      if (docked && progress === 1 && !layoutChanged) return;
      const target = dock.getBoundingClientRect();
      const morph = ease(progress/0.62);
      const travel = ease((progress-0.25)/0.75);
      const handoff = ease((progress-0.78)/0.17);
      const points = sphere.map((point,index) => ({x:point.x+(name[index].x-point.x)*morph,y:point.y+(name[index].y-point.y)*morph,z:point.z+(name[index].z-point.z)*morph}));
      const projected = projectSurface(points,INITIAL_YAW*(1-morph),INITIAL_PITCH*(1-morph));
      const targetX = target.left+target.width/2, targetY = target.top+target.height/2;
      const originY = artY-Math.min(window.scrollY,start);
      const x = artX+(targetX-artX)*travel, y = originY+(targetY-originY)*travel;
      const sourceScale = artSize*0.345, targetScale = target.width/2.9;
      const scale = sourceScale+(targetScale-sourceScale)*travel;
      const radiusScale = Math.max(0.6,artSize/900)*(1-travel)+0.45*travel;
      fit(canvas,context,document.documentElement.clientWidth,window.innerHeight);
      paint(context,projected,x,y,scale,radiusScale,1-handoff);
      header.style.setProperty('--dock-opacity',String(handoff));
      canvas.hidden = progress === 1; mini.hidden = false;
      stage.dataset.fieldReady = 'true'; stage.dataset.fieldProgress = progress.toFixed(5);
      stage.dataset.fieldSettled = String(settled);
      stage.dataset.fieldState = progress === 0 ? 'sphere' : progress === 1 ? 'docked' : 'morph';
      docked = progress === 1;
      if (!settled) queue();
    } catch { staticFallback(); }
  }
  function queue(needsMeasure = false) {
    measureNeeded = measureNeeded || needsMeasure;
    if (!frame && !document.hidden) frame = requestAnimationFrame(render);
  }
  // Move outside transformed artwork ancestors so viewport coordinates stay exact.
  canvas.classList.add('scroll-field');
  document.body.append(canvas);
  window.addEventListener('scroll',()=>queue(),{passive:true});
  window.addEventListener('resize',()=>queue(true),{passive:true});
  window.addEventListener('pageshow',()=>queue(true));
  window.visualViewport?.addEventListener('resize',()=>queue(true),{passive:true});
  const motionChanged = () => queue(true);
  if (typeof reducedMotion.addEventListener === 'function') reducedMotion.addEventListener('change',motionChanged);
  else if (typeof reducedMotion.addListener === 'function') reducedMotion.addListener(motionChanged);
  document.addEventListener('visibilitychange',()=>{
    if (document.hidden) { cancelAnimationFrame(frame); frame=0; }
    else queue(true);
  });
  if (typeof ResizeObserver === 'function') {
    const observer = new ResizeObserver(()=>queue(true));
    observer.observe(hero); observer.observe(art); observer.observe(header);
  }
  document.fonts.ready.then(()=>queue(true));
  queue(true);
}
