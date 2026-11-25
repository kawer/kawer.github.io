import { createSurface, createNameSurface, projectSurface, INITIAL_YAW, INITIAL_PITCH } from './geometry.mjs';

const canvas = /** @type {HTMLCanvasElement | null} */ (document.querySelector('#field-canvas'));
const mini = /** @type {HTMLCanvasElement | null} */ (document.querySelector('#brand-canvas'));
const stage = /** @type {HTMLElement | null} */ (document.querySelector('.field-stage'));
const art = /** @type {HTMLElement | null} */ (document.querySelector('.field-art'));
const hero = /** @type {HTMLElement | null} */ (document.querySelector('.lab-hero'));
const foot = /** @type {HTMLElement | null} */ (document.querySelector('.hero-foot'));
const workHeading = /** @type {HTMLElement | null} */ (document.querySelector('#selected-work'));
const header = /** @type {HTMLElement | null} */ (document.querySelector('.site-header'));
const dock = /** @type {HTMLElement | null} */ (document.querySelector('.brand-dock'));
const context = canvas?.getContext('2d'), miniContext = mini?.getContext('2d');
if (canvas && mini && stage && art && hero && foot && workHeading && header && dock && context && miniContext) {
  const sphere = createSurface(), name = createNameSurface(sphere.length);
  let sphereRadius = 0;
  for (const point of sphere) sphereRadius = Math.max(sphereRadius,Math.hypot(point.x,point.y,point.z));
  // Every idle orientation fits this perspective envelope, including its drift.
  const sphereExtent = sphereRadius / Math.sqrt(1-(sphereRadius/3.8)**2);
  // Stable buffers keep the scroll path free of per-particle object allocation.
  const projectedX = new Float64Array(sphere.length), projectedY = new Float64Array(sphere.length);
  const offsetX = new Float32Array(sphere.length), offsetY = new Float32Array(sphere.length);
  const next = new Int32Array(sphere.length), first = new Int32Array(8), last = new Int32Array(8);
  // A convex morph and rotation cannot exceed either endpoint's radius. This
  // perspective bound contains every intermediate shape, including its dots.
  const radius = Math.max(...sphere.map(point=>Math.hypot(point.x,point.y,point.z)),...name.map(point=>Math.hypot(point.x,point.y,point.z)));
  const projectedRadius = radius / Math.sqrt(1-(radius/3.8)**2);
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = matchMedia('(any-pointer: fine)');
  const pocketRadius = 68, pocketPush = 24, releaseDuration = 180;
  let pointerId = null, pointerX = 0, pointerY = 0, pointerReady = false;
  let offsetWeight = 0, releaseAt = null;
  let frame = 0, measureNeeded = true, docked = false;
  let visualProgress = 0, initialized = false, lastFrameTime = 0;
  let idleTimer = 0, idleTime = 0, idleLastTime = 0, lastScrollAt = -Infinity, idleCost = 3;
  let snapScrollY = null;
  let artX = 0, artY = 0, artSize = 0, start = 0, end = 1;
  let targetX = 0, targetY = 0, targetScale = 1, canvasSize = 1, pixelRatio = 1, headerEdge = 0;
  let projectedMorph = -1, projectedYaw = NaN, projectedPitch = NaN;
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
  function project(morph, yaw, pitch) {
    if (morph === projectedMorph && yaw === projectedYaw && pitch === projectedPitch) return;
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
    projectedMorph = morph; projectedYaw = yaw; projectedPitch = pitch;
  }
  function paintField(x, y, scale, radiusScale, opacity, livePointer, localPointerX, localPointerY, pointerBlend) {
    const retainedWeight = offsetWeight*(1-pointerBlend);
    const displayWeight = livePointer ? 1 : offsetWeight;
    let hasOffsets = false;
    for (let band=0;band<8;band++) {
      context.fillStyle = `rgba(35,92,219,${(0.14+band*0.115)*opacity})`;
      context.beginPath();
      const radius = (0.6+band*0.13)*radiusScale;
      for (let index=first[band];index!==-1;index=next[index]) {
        let px = x+projectedX[index]*scale, py = y+projectedY[index]*scale;
        if (livePointer) {
          const dx = px-localPointerX, dy = py-localPointerY;
          const distanceSquared = dx*dx+dy*dy;
          let push = 0;
          if (distanceSquared < pocketRadius*pocketRadius) {
            const distance = Math.sqrt(distanceSquared);
            push = pocketPush*(1-ease(distance/pocketRadius))/Math.max(8,distance);
            // Bound the push along its original direction inside the existing canvas.
            if (dx) push = Math.min(push,Math.max(0,(dx > 0 ? canvasSize-radius-px : radius-px)/dx));
            if (dy) push = Math.min(push,Math.max(0,(dy > 0 ? canvasSize-radius-py : radius-py)/dy));
          }
          push *= pointerBlend;
          const nextX = dx*push+offsetX[index]*retainedWeight;
          const nextY = dy*push+offsetY[index]*retainedWeight;
          // Dots just outside the moving pocket also need time to settle.
          const displaced = Math.abs(nextX)+Math.abs(nextY) >= .1;
          offsetX[index] = displaced ? nextX : 0;
          offsetY[index] = displaced ? nextY : 0;
          hasOffsets ||= displaced;
        }
        if (displayWeight && (offsetX[index] || offsetY[index])) {
          px += Math.max(Math.min(0,radius-px),Math.min(Math.max(0,canvasSize-radius-px),offsetX[index]*displayWeight));
          py += Math.max(Math.min(0,radius-py),Math.min(Math.max(0,canvasSize-radius-py),offsetY[index]*displayWeight));
        }
        context.moveTo(px+radius,py); context.arc(px,py,radius,0,Math.PI*2);
      }
      context.fill();
    }
    if (livePointer) offsetWeight = Number(hasOffsets);
  }
  function resetPointer() {
    pointerId = null;
    pointerReady = false;
    offsetWeight = 0;
    releaseAt = null;
  }
  function updatePointer(now, resting, progress, targetProgress, x, y, extent) {
    pointerReady = resting;
    if (progress === 0 && targetProgress === 0 && !resting) {
      resetPointer();
      return false;
    }
    const live = resting && pointerId !== null && pointerY >= headerEdge
      && Math.abs(pointerX-x) < extent+pocketRadius && Math.abs(pointerY-y) < extent+pocketRadius;
    if (live) {
      releaseAt = null;
    } else if (offsetWeight) {
      if (releaseAt === null) releaseAt = now;
      // Fade the displayed offsets over time or as the orb enters the morph.
      // Keep the fade moving in one direction even when scrolling reverses.
      offsetWeight = Math.min(offsetWeight,1-ease(Math.max(progress/.18,(now-releaseAt)/releaseDuration)));
    }
    if (!resting) pointerId = null;
    return live;
  }
  function measure() {
    const rect = art.getBoundingClientRect();
    artX = rect.left+rect.width/2;
    artY = rect.top+window.scrollY+rect.height/2;
    artSize = rect.width;
    const headerRect = header.getBoundingClientRect();
    const headerHeight = headerRect.height;
    headerEdge = headerRect.bottom;
    const sourceScale = artSize*0.345;
    const fullyVisible = Math.max(0,artY+sphereExtent*sourceScale+3-window.innerHeight+24);
    const latestVisible = Math.max(0,artY-sphereExtent*sourceScale-3-headerHeight-16);
    // In the stacked layout the role clears the header before the orb rises.
    // Both the complete sphere and the arriving work remain in view.
    const stacked = window.getComputedStyle(stage).position === 'relative';
    const contentClear = stacked ? Math.max(0,foot.getBoundingClientRect().bottom+window.scrollY-headerHeight+16) : 0;
    start = Math.max(fullyVisible,Math.min(contentClear,latestVisible));
    const anchorMargin = parseFloat(window.getComputedStyle(workHeading).scrollMarginTop) || 0;
    const scrollPadding = parseFloat(window.getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
    const readingInset = Math.max(headerHeight+24,anchorMargin+scrollPadding);
    const workEntry = workHeading.getBoundingClientRect().top+window.scrollY-readingInset;
    const scrollLimit = Math.max(0,document.documentElement.scrollHeight-window.innerHeight);
    end = Math.max(start+1,Math.min(workEntry,scrollLimit));
    stage.dataset.fieldStart = String(start); stage.dataset.fieldEnd = String(end);
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
  function cancelIdle(resetClock = false) {
    if (idleTimer) window.clearTimeout(idleTimer);
    idleTimer = 0;
    if (resetClock) { idleLastTime = 0; stage.dataset.fieldIdle = 'false'; }
  }
  function staticFallback() {
    cancelIdle(true);
    resetPointer();
    canvas.hidden = true; mini.hidden = true;
    delete stage.dataset.fieldReady;
    stage.dataset.fieldState = 'static'; stage.dataset.fieldProgress = '0'; stage.dataset.fieldSettled = 'true';
    stage.dataset.fieldIdle = 'false';
    header.style.setProperty('--dock-opacity','0');
    docked = false; initialized = false;
  }
  function render(now = performance.now()) {
    frame = 0;
    const frameStarted = performance.now();
    if (document.hidden) { cancelIdle(true); resetPointer(); return; }
    if (reducedMotion.matches) { staticFallback(); return; }
    try {
      const layoutChanged = measureNeeded;
      if (measureNeeded) measure();
      const targetProgress = clamp((window.scrollY-start)/(end-start));
      const shouldSnap = snapScrollY !== null && snapScrollY === window.scrollY;
      const elapsed = now-lastFrameTime;
      snapScrollY = null;
      if (!initialized || shouldSnap) {
        visualProgress = targetProgress;
        initialized = true;
      } else {
        const scrollElapsed = Math.max(1,Math.min(32,elapsed));
        visualProgress += (targetProgress-visualProgress)*(1-Math.exp(-scrollElapsed/65));
        if (Math.abs(targetProgress-visualProgress) < 0.0001) visualProgress = targetProgress;
      }
      lastFrameTime = now;
      const progress = visualProgress;
      if (docked && progress === 1 && !layoutChanged) return;
      const originY = artY-Math.min(window.scrollY,start);
      const extent = sphereExtent*artSize*0.345+3;
      const visibleHeight = Math.min(window.innerHeight,originY+extent)-Math.max(headerEdge,originY-extent);
      const resting = progress === 0 && targetProgress === 0 && visibleHeight > Math.min(48,extent*.4);
      const idleActive = resting && now-lastScrollAt >= 120;
      if (idleActive) {
        if (idleLastTime) idleTime += Math.max(0,Math.min(200,now-idleLastTime));
        idleLastTime = now;
      } else idleLastTime = 0;
      const morph = ease(progress/0.62);
      const travel = ease(progress);
      const idleWeight = 1-ease(progress/.25);
      const yaw = Math.atan2(Math.sin(INITIAL_YAW+idleTime*.000065),Math.cos(INITIAL_YAW+idleTime*.000065))*(1-morph);
      const pitch = (INITIAL_PITCH+Math.sin(idleTime*.00023)*.025)*(1-morph);
      const x = artX+(targetX-artX)*travel+Math.sin(idleTime*.00019)*1.5*idleWeight;
      const y = originY+(targetY-originY)*travel+Math.sin(idleTime*.00031)*2.5*idleWeight;
      // Crossfade as the moving mark reaches the opaque header, at any size.
      const handoff = ease((headerEdge+24-y)/36);
      const livePointer = updatePointer(now,resting && handoff < 1,progress,targetProgress,x,y,extent);
      const sourceScale = artSize*0.345;
      const scale = sourceScale+(targetScale-sourceScale)*travel;
      const radiusScale = Math.max(0.6,artSize/900)*(1-travel)+0.45*travel;
      if (handoff < 1) {
        project(morph,yaw,pitch);
        // Align the smaller surface to device pixels, preserving dot sharpness.
        const left = Math.floor((x-canvasSize/2)*pixelRatio)/pixelRatio;
        const top = Math.floor((y-canvasSize/2)*pixelRatio)/pixelRatio;
        canvas.style.transform = `translate(${left}px,${top}px)`;
        fit(canvas,context,canvasSize,canvasSize);
        const pointerBlend = livePointer ? 1-Math.exp(-Math.max(1,elapsed)/42) : 0;
        paintField(x-left,y-top,scale,radiusScale,1-handoff,livePointer,pointerX-left,pointerY-top,pointerBlend);
      }
      const settled = progress === targetProgress && (resting || offsetWeight === 0);
      header.style.setProperty('--dock-opacity',String(handoff));
      canvas.hidden = handoff === 1; mini.hidden = false;
      stage.dataset.fieldReady = 'true'; stage.dataset.fieldProgress = progress.toFixed(5);
      stage.dataset.fieldSettled = String(settled);
      stage.dataset.fieldIdle = String(idleActive);
      stage.dataset.fieldState = progress === 0 ? 'sphere' : progress === 1 ? 'docked' : 'morph';
      docked = progress === 1;
      if (!settled) queue();
      else if (resting) {
        // Scroll frames stay unthrottled. Idle painting has one pending timer,
        // at most 24fps, backing off on slower devices to limit main-thread work.
        if (idleActive) idleCost = idleCost*.8+(performance.now()-frameStarted)*.2;
        const delay = Math.max(1000/24,Math.min(160,idleCost*8),120-(performance.now()-lastScrollAt));
        idleTimer = window.setTimeout(()=>{ idleTimer = 0; queue(); },delay);
      } else cancelIdle(true);
    } catch { staticFallback(); }
  }
  function queue(needsMeasure = false, snap = false) {
    cancelIdle();
    measureNeeded = measureNeeded || needsMeasure;
    if (snap) snapScrollY = window.scrollY;
    if (!frame && !document.hidden) frame = requestAnimationFrame(render);
  }
  // Move outside transformed artwork ancestors so viewport coordinates stay exact.
  canvas.classList.add('scroll-field');
  document.body.append(canvas);
  // Pointer input only replaces the latest sample. The idle timer owns its paints.
  window.addEventListener('pointermove',event=>{
    if (!pointerReady || !finePointer.matches || !event.isPrimary
      || (event.pointerType !== 'mouse' && event.pointerType !== 'pen')) return;
    pointerId = event.pointerId;
    pointerX = event.clientX; pointerY = event.clientY;
  },{passive:true});
  window.addEventListener('pointerout',event=>{
    if (event.relatedTarget === null && event.pointerId === pointerId) pointerId = null;
  },{passive:true});
  window.addEventListener('pointercancel',event=>{
    if (event.pointerId === pointerId) pointerId = null;
  },{passive:true});
  window.addEventListener('blur',()=>{ pointerId = null; });
  window.addEventListener('scroll',()=>{ lastScrollAt = performance.now(); cancelIdle(true); queue(); },{passive:true});
  const viewportChanged = () => { resetPointer(); queue(true,true); };
  window.addEventListener('resize',viewportChanged,{passive:true});
  window.addEventListener('pagehide',resetPointer);
  window.addEventListener('pageshow',event=>{ resetPointer(); queue(true,event.persisted); });
  window.visualViewport?.addEventListener('resize',viewportChanged,{passive:true});
  const motionChanged = () => { resetPointer(); queue(true); };
  if (typeof reducedMotion.addEventListener === 'function') reducedMotion.addEventListener('change',motionChanged);
  else if (typeof reducedMotion.addListener === 'function') reducedMotion.addListener(motionChanged);
  const pointerChanged = () => { pointerId = null; };
  if (typeof finePointer.addEventListener === 'function') finePointer.addEventListener('change',pointerChanged);
  else if (typeof finePointer.addListener === 'function') finePointer.addListener(pointerChanged);
  document.addEventListener('visibilitychange',()=>{
    resetPointer();
    if (document.hidden) { cancelAnimationFrame(frame); frame=0; cancelIdle(true); }
    else queue(true,true);
  });
  if (typeof ResizeObserver === 'function') {
    const observer = new ResizeObserver(()=>queue(true));
    observer.observe(hero); observer.observe(art); observer.observe(header);
  }
  document.fonts.ready.then(()=>queue(true));
  queue(true);
}
