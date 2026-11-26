import {
  createSurface, createNameSurface, projectSurface, INITIAL_YAW, INITIAL_PITCH,
  DROPLET_HANDOFF, WOBBLE_END, clampUnit as clamp, smoothUnit as ease,
  createDroplet, dropletTarget, stepDroplet, dropletPose, deformProjected,
  createWobble, resetWobble, kickWobble, stepWobble, wobblePose, wobbleProjected,
} from './geometry.mjs';

const canvas = /** @type {HTMLCanvasElement | null} */ (document.querySelector('#field-canvas'));
const gpuCanvas = /** @type {HTMLCanvasElement | null} */ (document.querySelector('#field-gl'));
const mini = /** @type {HTMLCanvasElement | null} */ (document.querySelector('#brand-canvas'));
const stage = /** @type {HTMLElement | null} */ (document.querySelector('.field-stage'));
const art = /** @type {HTMLElement | null} */ (document.querySelector('.field-art'));
const hero = /** @type {HTMLElement | null} */ (document.querySelector('.lab-hero'));
const foot = /** @type {HTMLElement | null} */ (document.querySelector('.hero-foot'));
const workHeading = /** @type {HTMLElement | null} */ (document.querySelector('#selected-work'));
const header = /** @type {HTMLElement | null} */ (document.querySelector('.site-header'));
const dock = /** @type {HTMLElement | null} */ (document.querySelector('.brand-dock'));
const context = canvas?.getContext('2d'), miniContext = mini?.getContext('2d');
if (canvas && gpuCanvas && mini && stage && art && hero && foot && workHeading && header && dock && context && miniContext) {
  const sphere = createSurface(), name = createNameSurface(sphere.length);
  let sphereRadius = 0;
  for (const point of sphere) sphereRadius = Math.max(sphereRadius,Math.hypot(point.x,point.y,point.z));
  // Every idle orientation fits this perspective envelope, including its drift.
  const sphereExtent = sphereRadius / Math.sqrt(1-(sphereRadius/3.8)**2);
  // Stable buffers keep the scroll path free of per-particle object allocation.
  const projectedX = new Float64Array(sphere.length), projectedY = new Float64Array(sphere.length);
  const next = new Int32Array(sphere.length), first = new Int32Array(8), last = new Int32Array(8);
  // A convex morph and rotation cannot exceed either endpoint's radius. This
  // perspective bound contains every intermediate shape, including its dots.
  const radius = Math.max(...sphere.map(point=>Math.hypot(point.x,point.y,point.z)),...name.map(point=>Math.hypot(point.x,point.y,point.z)));
  const projectedRadius = radius / Math.sqrt(1-(radius/3.8)**2);
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = matchMedia('(any-pointer: fine)');
  const droplet = createDroplet(), pressure = {x:0,y:0,strength:0};
  const pointerWobble = createWobble(), scrollWobble = createWobble();
  const pose = {x:0,y:0,contactX:0,contactY:0,flowX:0,flowY:0,side:0,strength:0,extent:sphereExtent,
    wobbleX:0,wobbleY:0,wobbleAxisX:0,wobbleAxisY:0,wobbleBend:0};
  const displaced = {x:0,y:0};
  const view = {x:0,y:0,size:1,pixelRatio:1,yaw:0,pitch:0,morph:0,scale:1,radiusScale:1,opacity:1};
  let gpu, gpuActive = false, gpuAttempted = false;
  let pointerId = null, pointerX = 0, pointerY = 0, pointerReady = false, releaseProgress = 0;
  let frame = 0, measureNeeded = true, docked = false;
  let visualProgress = 0, initialized = false, lastFrameTime = 0;
  let idleTimer = 0, idleTime = 0, idleLastTime = 0, lastScrollAt = -Infinity, idleCost = 3;
  let lastScrollY = window.scrollY, returnKick = 0;
  let snapScrollY = null;
  let artX = 0, artY = 0, artSize = 0, start = 0, end = 1;
  let targetX = 0, targetY = 0, targetScale = 1, canvasSize = 1, pixelRatio = 1, headerEdge = 0;
  let projectedMorph = -1, projectedYaw = NaN, projectedPitch = NaN;

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
  function paintField() {
    project(view.morph,view.yaw,view.pitch);
    const wobbling = pose.wobbleX || pose.wobbleY;
    for (let band=0;band<8;band++) {
      context.fillStyle = `rgba(35,92,219,${(0.14+band*0.115)*view.opacity})`;
      context.beginPath();
      const radius = (0.6+band*0.13)*view.radiusScale;
      for (let index=first[band];index!==-1;index=next[index]) {
        displaced.x = projectedX[index]; displaced.y = projectedY[index];
        if (pose.strength) deformProjected(displaced.x,displaced.y,pose,displaced);
        if (wobbling) wobbleProjected(displaced.x,displaced.y,pose,displaced);
        const px = view.x+displaced.x*view.scale, py = view.y+displaced.y*view.scale;
        context.moveTo(px+radius,py); context.arc(px,py,radius,0,Math.PI*2);
      }
      context.fill();
    }
  }
  function clearDroplet() {
    droplet.x = droplet.y = droplet.lagX = droplet.lagY = droplet.strength = droplet.lagStrength = 0;
    releaseProgress = 0;
    pose.strength = 0;
  }
  function resetMotion() {
    pointerId = null;
    pointerReady = false;
    pressure.strength = 0;
    clearDroplet();
    resetWobble(pointerWobble);
    resetWobble(scrollWobble);
    lastScrollY = window.scrollY;
    returnKick = 0;
  }
  function updatePointer(elapsed, resting, progress, targetProgress, x, y, scale) {
    pointerReady = resting;
    const wasPressed = pressure.strength > .045;
    pressure.strength = 0;
    if (resting && scale > 0 && pointerId !== null && pointerY >= headerEdge) {
      dropletTarget(pointerX-x,pointerY-y,scale,sphereExtent,pressure);
    }
    if (resting && wasPressed && pressure.strength <= .045 && pose.strength > .025) {
      const rebound = pose.strength*.78;
      kickWobble(pointerWobble,pose.x*pose.side*rebound,(pose.y*pose.side+1-pose.side)*rebound);
    }
    if (!resting) pointerId = null;
    // A reversal during the release cannot bring a previous squeeze back.
    releaseProgress = pressure.strength ? 0 : Math.max(releaseProgress,progress);
    if (progress >= DROPLET_HANDOFF || (!resting && progress === 0 && targetProgress === 0)) clearDroplet();
    else stepDroplet(droplet,pressure,elapsed);
    dropletPose(droplet,releaseProgress,sphereExtent,pose);
  }
  function abandonGPU() {
    gpu?.dispose();
    gpu = undefined;
    gpuActive = false;
    gpuCanvas.hidden = true;
    stage.dataset.fieldGpu = 'unavailable';
  }
  async function prepareGPU() {
    gpuAttempted = true;
    const wasLost = () => { abandonGPU(); queue(); };
    let gl;
    try {
      gl = gpuCanvas.getContext('webgl2',{
        alpha:true, antialias:false, depth:false, stencil:false,
        failIfMajorPerformanceCaveat:true, powerPreference:'low-power',
      });
      if (gl) {
        const debug = gl.getExtension('WEBGL_debug_renderer_info');
        const driver = debug ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
        if (/swiftshader|llvmpipe|softpipe|software rasterizer|microsoft basic render/i.test(driver)) {
          gl.getExtension('WEBGL_lose_context')?.loseContext();
          gl = null;
        }
      }
      if (!gl) { abandonGPU(); return; }
      stage.dataset.fieldGpu = 'loading';
      const { createWebGLField } = await import('./field-webgl.mjs');
      if (gl.isContextLost()) { abandonGPU(); return; }
      gpu = createWebGLField(gpuCanvas,gl,sphere,name,wasLost);
      queue();
    } catch {
      if (gl && !gl.isContextLost()) gl.getExtension('WEBGL_lose_context')?.loseContext();
      abandonGPU();
    }
  }
  function drawField(left, top, resting) {
    const transform = `translate(${left}px,${top}px)`;
    if (gpu && (gpuActive || resting)) {
      try {
        const wasActive = gpuActive;
        gpuCanvas.style.transform = transform;
        gpuActive = gpu.draw(view,pose);
        if (gpuActive) {
          if (!wasActive) canvas.width = canvas.height = 1;
          gpuCanvas.style.opacity = String(view.opacity);
          stage.dataset.fieldGpu = 'active';
          return;
        }
      } catch { /* Canvas can draw this same scene immediately. */ }
      abandonGPU();
    }
    canvas.style.transform = transform;
    fit(canvas,context,canvasSize,canvasSize);
    paintField();
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
    canvasSize = Math.ceil(2*projectedRadius*Math.max(sourceScale,targetScale)+6);
    for (const surface of [canvas,gpuCanvas]) {
      surface.style.width = `${canvasSize}px`; surface.style.height = `${canvasSize}px`;
    }
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
    resetMotion();
    canvas.hidden = true; gpuCanvas.hidden = true; mini.hidden = true;
    stage.dataset.fieldRenderer = 'static';
    delete stage.dataset.fieldReady;
    stage.dataset.fieldState = 'static'; stage.dataset.fieldProgress = '0'; stage.dataset.fieldSettled = 'true';
    stage.dataset.fieldIdle = 'false';
    header.style.setProperty('--dock-opacity','0');
    header.removeAttribute('data-field-overlap');
    docked = false; initialized = false;
  }
  function render(now = performance.now()) {
    frame = 0;
    const frameStarted = performance.now();
    if (document.hidden) { cancelIdle(true); resetMotion(); return; }
    if (reducedMotion.matches) { staticFallback(); return; }
    try {
      const layoutChanged = measureNeeded;
      if (measureNeeded) measure();
      const scrollY = window.scrollY;
      const targetProgress = clamp((scrollY-start)/(end-start));
      const shouldSnap = snapScrollY !== null && snapScrollY === scrollY;
      const scrollDelta = initialized && !shouldSnap ? scrollY-lastScrollY : 0;
      lastScrollY = scrollY;
      const elapsed = now-lastFrameTime;
      snapScrollY = null;
      if (!initialized || shouldSnap) {
        visualProgress = targetProgress;
        initialized = true;
      } else {
        // Give a hard scroll one frame of inertia before the collapse accelerates.
        const leavingSphere = visualProgress === 0 && targetProgress > 0 && (targetProgress > .35 || pose.strength > 0);
        const scrollElapsed = Math.max(1,Math.min(leavingSphere ? 5 : 32,elapsed));
        visualProgress += (targetProgress-visualProgress)*(1-Math.exp(-scrollElapsed/65));
        if (Math.abs(targetProgress-visualProgress) < 0.0001) visualProgress = targetProgress;
      }
      lastFrameTime = now;
      const progress = visualProgress;
      if (docked && progress === 1 && !layoutChanged) return;
      const originY = artY-Math.min(scrollY,start);
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
      // Crossfade into the stationary mark as the moving field reaches the header.
      const handoff = ease((headerEdge+24-y)/36);
      const sourceScale = artSize*0.345;
      const scale = sourceScale+(targetScale-sourceScale)*travel;
      const radiusScale = Math.max(0.6,artSize/900)*(1-travel)+0.45*travel;
      const scrollKick = sourceScale > 0 ? Math.max(-.155,Math.min(.155,-scrollDelta/(sourceScale*1.7))) : 0;
      if (handoff < 1 && (resting || progress > 0) && progress < WOBBLE_END) {
        stepWobble(pointerWobble,elapsed);
        stepWobble(scrollWobble,elapsed);
        const kick = scrollKick || returnKick;
        if (kick) kickWobble(scrollWobble,0,kick);
        returnKick = 0;
      } else {
        resetWobble(pointerWobble);
        resetWobble(scrollWobble);
        // A fast trip back to the top arrives before the letters have opened.
        // Save its momentum for the first visible sphere frames.
        if (targetProgress >= WOBBLE_END) returnKick = 0;
        else if (progress >= WOBBLE_END && scrollKick) returnKick = scrollKick;
      }
      updatePointer(elapsed,resting && handoff < 1,progress,targetProgress,x,y,sourceScale);
      wobblePose(pointerWobble,scrollWobble,progress,pose);
      if (handoff < 1) {
        // Align the bounded surface to device pixels.
        const left = Math.floor((x-canvasSize/2)*pixelRatio)/pixelRatio;
        const top = Math.floor((y-canvasSize/2)*pixelRatio)/pixelRatio;
        Object.assign(view,{x:x-left,y:y-top,size:canvasSize,pixelRatio,yaw,pitch,morph,scale,radiusScale,opacity:1-handoff});
        drawField(left,top,resting);
      }
      const scrollMoving = scrollWobble.y !== 0 || scrollWobble.vy !== 0;
      const bounceMoving = pointerWobble.x || pointerWobble.y || pointerWobble.vx || pointerWobble.vy;
      const settled = progress === targetProgress && !scrollMoving && (resting || (!pose.strength && !bounceMoving));
      header.style.setProperty('--dock-opacity',String(handoff));
      header.toggleAttribute('data-field-overlap',handoff < 1);
      canvas.hidden = handoff === 1 || gpuActive;
      gpuCanvas.hidden = handoff === 1 || !gpuActive;
      mini.hidden = false;
      stage.dataset.fieldRenderer = gpuActive ? 'webgl2' : 'canvas';
      // The first visible Canvas paint gets its own frame before probing hardware.
      if (!gpuAttempted && idleActive && stage.dataset.fieldReady === 'true') void prepareGPU();
      stage.dataset.fieldReady = 'true'; stage.dataset.fieldProgress = progress.toFixed(5);
      stage.dataset.fieldSettled = String(settled);
      stage.dataset.fieldIdle = String(idleActive);
      stage.dataset.fieldState = progress === 0 ? 'sphere' : progress === 1 ? 'docked' : 'morph';
      docked = progress === 1;
      if (idleActive) idleCost = idleCost*.8+(performance.now()-frameStarted)*.2;
      // Use the display cadence while a hardware-rendered squeeze has visible motion.
      const dropletMoving = idleActive && gpuActive && idleCost < 2
        && (bounceMoving || Math.abs(droplet.strength-pressure.strength)+Math.abs(droplet.lagStrength-pressure.strength) > .001
          || (pressure.strength > 0 && Math.hypot(droplet.x-pressure.x,droplet.y-pressure.y) > .001));
      if (!settled || dropletMoving) queue();
      else if (resting) {
        // Idle painting has one timer, capped at 24fps with an adaptive backoff.
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
  for (const surface of [canvas,gpuCanvas]) surface.classList.add('scroll-field');
  document.body.append(canvas,gpuCanvas);
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
  const viewportChanged = () => { resetMotion(); queue(true,true); };
  window.addEventListener('resize',viewportChanged,{passive:true});
  window.addEventListener('pagehide',resetMotion);
  window.addEventListener('pageshow',event=>{ resetMotion(); queue(true,event.persisted); });
  window.visualViewport?.addEventListener('resize',viewportChanged,{passive:true});
  const motionChanged = () => { resetMotion(); queue(true); };
  if (typeof reducedMotion.addEventListener === 'function') reducedMotion.addEventListener('change',motionChanged);
  else if (typeof reducedMotion.addListener === 'function') reducedMotion.addListener(motionChanged);
  const pointerChanged = () => { pointerId = null; };
  if (typeof finePointer.addEventListener === 'function') finePointer.addEventListener('change',pointerChanged);
  else if (typeof finePointer.addListener === 'function') finePointer.addListener(pointerChanged);
  document.addEventListener('visibilitychange',()=>{
    resetMotion();
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
