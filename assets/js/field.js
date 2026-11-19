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
  // Stable buffers keep the scroll path free of per-particle object allocation.
  const projectedX = new Float64Array(sphere.length), projectedY = new Float64Array(sphere.length);
  const next = new Int32Array(sphere.length), first = new Int32Array(8), last = new Int32Array(8);
  // A convex morph and rotation cannot exceed either endpoint's radius. This
  // perspective bound contains every intermediate shape, including its dots.
  const radius = Math.max(...sphere.map(point=>Math.hypot(point.x,point.y,point.z)),...name.map(point=>Math.hypot(point.x,point.y,point.z)));
  const projectedRadius = radius / Math.sqrt(1-(radius/3.8)**2);
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let frame = 0, measureNeeded = true, docked = false;
  let visualProgress = 0, initialized = false, lastFrameTime = 0;
  let snapScrollY = null;
  let artX = 0, artY = 0, artSize = 0, start = 0, end = 1;
  let targetX = 0, targetY = 0, targetScale = 1, canvasSize = 1, pixelRatio = 1;
  let projectedMorph = -1;
  const clamp = value => Math.max(0,Math.min(1,value));
  const ease = value => { const t = clamp(value); return t*t*(3-2*t); };

  function fit(target, ctx, width, height) {
    const ratio = pixelRatio;
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
  function project(morph) {
    if (morph === projectedMorph) return;
    const yaw = INITIAL_YAW*(1-morph), pitch = INITIAL_PITCH*(1-morph);
    const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
    first.fill(-1); last.fill(-1);
    for (let index=0;index<sphere.length;index++) {
      const point = sphere[index], letter = name[index];
      const px = point.x+(letter.x-point.x)*morph;
      const py = point.y+(letter.y-point.y)*morph;
      const pz = point.z+(letter.z-point.z)*morph;
      const x = px*cy+pz*sy, z = -px*sy+pz*cy;
      const y = py*cp-z*sp, depth = py*sp+z*cp;
      const perspective = 3.8/(3.8-depth);
      projectedX[index] = x*perspective; projectedY[index] = y*perspective;
      const band = Math.max(0,Math.min(7,Math.floor((depth+1.12)/2.25*8)));
      if (last[band] === -1) first[band] = index;
      else next[last[band]] = index;
      last[band] = index; next[index] = -1;
    }
    projectedMorph = morph;
  }
  function paintField(x, y, scale, radiusScale, opacity) {
    for (let band=0;band<8;band++) {
      context.fillStyle = `rgba(35,92,219,${(0.14+band*0.115)*opacity})`;
      context.beginPath();
      const radius = (0.6+band*0.13)*radiusScale;
      for (let index=first[band];index!==-1;index=next[index]) {
        const px = x+projectedX[index]*scale, py = y+projectedY[index]*scale;
        context.moveTo(px+radius,py); context.arc(px,py,radius,0,Math.PI*2);
      }
      context.fill();
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
    targetX = target.left+target.width/2; targetY = target.top+target.height/2;
    targetScale = target.width/2.9;
    pixelRatio = Math.min(devicePixelRatio || 1,2);
    canvasSize = Math.ceil(2*projectedRadius*Math.max(artSize*0.345,targetScale)+6);
    canvas.style.width = `${canvasSize}px`; canvas.style.height = `${canvasSize}px`;
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
      const shouldSnap = snapScrollY !== null && snapScrollY === window.scrollY;
      snapScrollY = null;
      if (!initialized || shouldSnap) {
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
      const morph = ease(progress/0.62);
      const travel = ease((progress-0.25)/0.75);
      const handoff = ease((progress-0.78)/0.17);
      const originY = artY-Math.min(window.scrollY,start);
      const x = artX+(targetX-artX)*travel, y = originY+(targetY-originY)*travel;
      const sourceScale = artSize*0.345;
      const scale = sourceScale+(targetScale-sourceScale)*travel;
      const radiusScale = Math.max(0.6,artSize/900)*(1-travel)+0.45*travel;
      if (handoff < 1) {
        project(morph);
        // Align the smaller surface to device pixels, preserving dot sharpness.
        const left = Math.floor((x-canvasSize/2)*pixelRatio)/pixelRatio;
        const top = Math.floor((y-canvasSize/2)*pixelRatio)/pixelRatio;
        canvas.style.transform = `translate(${left}px,${top}px)`;
        fit(canvas,context,canvasSize,canvasSize);
        paintField(x-left,y-top,scale,radiusScale,1-handoff);
      }
      header.style.setProperty('--dock-opacity',String(handoff));
      canvas.hidden = handoff === 1; mini.hidden = false;
      stage.dataset.fieldReady = 'true'; stage.dataset.fieldProgress = progress.toFixed(5);
      stage.dataset.fieldSettled = String(settled);
      stage.dataset.fieldState = progress === 0 ? 'sphere' : progress === 1 ? 'docked' : 'morph';
      docked = progress === 1;
      if (!settled) queue();
    } catch { staticFallback(); }
  }
  function queue(needsMeasure = false, snap = false) {
    measureNeeded = measureNeeded || needsMeasure;
    if (snap) snapScrollY = window.scrollY;
    if (!frame && !document.hidden) frame = requestAnimationFrame(render);
  }
  // Move outside transformed artwork ancestors so viewport coordinates stay exact.
  canvas.classList.add('scroll-field');
  document.body.append(canvas);
  window.addEventListener('scroll',()=>queue(),{passive:true});
  window.addEventListener('resize',()=>queue(true,true),{passive:true});
  window.addEventListener('pageshow',event=>queue(true,event.persisted));
  window.visualViewport?.addEventListener('resize',()=>queue(true,true),{passive:true});
  const motionChanged = () => queue(true);
  if (typeof reducedMotion.addEventListener === 'function') reducedMotion.addEventListener('change',motionChanged);
  else if (typeof reducedMotion.addListener === 'function') reducedMotion.addListener(motionChanged);
  document.addEventListener('visibilitychange',()=>{
    if (document.hidden) { cancelAnimationFrame(frame); frame=0; }
    else queue(true,true);
  });
  if (typeof ResizeObserver === 'function') {
    const observer = new ResizeObserver(()=>queue(true));
    observer.observe(hero); observer.observe(art); observer.observe(header);
  }
  document.fonts.ready.then(()=>queue(true));
  queue(true);
}
