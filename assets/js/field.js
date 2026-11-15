import { createSurface, createNameSurface, projectSurface, INITIAL_YAW, INITIAL_PITCH } from './geometry.mjs';

const canvas = /** @type {HTMLCanvasElement | null} */ (document.querySelector('#field-canvas'));
const stage = /** @type {HTMLElement | null} */ (document.querySelector('.field-stage'));
const controls = /** @type {HTMLElement | null} */ (document.querySelector('.field-controls'));
const context = canvas?.getContext('2d');
if (canvas && stage && controls && context) {
  const sphere = createSurface(), name = createNameSurface(sphere.length);
  let surface = sphere;
  let mode = 'sphere';
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let yaw = INITIAL_YAW, pitch = INITIAL_PITCH;
  let sphereView = {yaw, pitch};
  let rotating = !reducedMotion.matches;
  /** @type {null | {from: typeof surface, to: typeof surface, fromYaw:number, fromPitch:number, toYaw:number, toPitch:number, started:number}} */
  let transition = null;
  let inView = true, frame = 0, lastTime = 0, size = 0;
  /** @type {null | {id:number,x:number,y:number,lastX:number,lastY:number}} */
  let pointer = null;
  let dragging = false, suppressClick = false;
  const motion = /** @type {HTMLButtonElement} */ (controls.querySelector('[data-field-action="motion"]'));
  const reveal = /** @type {HTMLButtonElement} */ (controls.querySelector('[data-field-action="reveal"]'));
  const note = /** @type {HTMLElement} */ (stage.querySelector('.field-note'));
  const title = /** @type {HTMLElement} */ (stage.querySelector('.field-title'));

  function draw() {
    const ratio = Math.min(devicePixelRatio || 1, 2);
    const nextSize = Math.round(canvas.getBoundingClientRect().width);
    if (size !== nextSize || canvas.width !== Math.round(nextSize * ratio)) {
      size = nextSize;
      canvas.width = canvas.height = Math.round(size * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    }
    context.clearRect(0, 0, size, size);
    const points = projectSurface(surface, yaw, pitch);
    const scale = size * 0.345;
    for (let band = 0; band < 8; band++) {
      context.fillStyle = `rgba(35,92,219,${0.14 + band * 0.115})`;
      context.beginPath();
      for (const point of points) {
        if (Math.max(0,Math.min(7,Math.floor((point.depth + 1.12) / 2.25 * 8))) !== band) continue;
        const radius = (0.6 + band * 0.13) * Math.max(0.6,size/900);
        const x = size/2 + point.x * scale, y = size/2 + point.y * scale;
        context.moveTo(x + radius, y);
        context.arc(x, y, radius, 0, Math.PI*2);
      }
      context.fill();
    }
  }
  function finishTransition() {
    if (!transition) return;
    surface = transition.to; yaw = transition.toYaw; pitch = transition.toPitch;
    transition = null; stage.dataset.fieldTransition = 'false';
  }
  function tick(time) {
    frame = 0;
    if ((!transition && !(mode === 'sphere' && rotating)) || !inView || document.hidden || dragging) return;
    if (time-lastTime >= 32) {
      if (transition) {
        const progress = Math.max(0,Math.min(1,(time-transition.started)/900));
        const blend = progress*progress*(3-2*progress);
        surface = transition.from.map((point,index) => {
          const target = transition.to[index];
          return {x:point.x+(target.x-point.x)*blend, y:point.y+(target.y-point.y)*blend, z:point.z+(target.z-point.z)*blend};
        });
        yaw = transition.fromYaw+(transition.toYaw-transition.fromYaw)*blend;
        pitch = transition.fromPitch+(transition.toPitch-transition.fromPitch)*blend;
        if (progress === 1) finishTransition();
      } else yaw += Math.min(time-lastTime,50)*0.000065;
      lastTime = time; draw();
    }
    if (transition || (mode === 'sphere' && rotating)) frame = requestAnimationFrame(tick);
  }
  function syncMotion() {
    cancelAnimationFrame(frame); frame = 0;
    motion.hidden = mode === 'name';
    motion.setAttribute('aria-pressed',String(mode === 'sphere' && rotating));
    motion.textContent = rotating ? 'Pause motion' : 'Start motion';
    if ((transition || (mode === 'sphere' && rotating)) && inView && !document.hidden && !dragging) frame = requestAnimationFrame(tick);
  }
  function toggleName() {
    if (mode === 'sphere' && !transition) sphereView = {yaw,pitch};
    mode = mode === 'sphere' ? 'name' : 'sphere';
    if (mode === 'sphere' && reducedMotion.matches) rotating = false;
    const targetYaw = mode === 'name' ? yaw-Math.atan2(Math.sin(yaw),Math.cos(yaw)) : yaw+Math.atan2(Math.sin(sphereView.yaw-yaw),Math.cos(sphereView.yaw-yaw));
    transition = {from:surface,to:mode === 'name' ? name : sphere,fromYaw:yaw,fromPitch:pitch,toYaw:targetYaw,toPitch:mode === 'name' ? 0 : sphereView.pitch,started:performance.now()};
    stage.dataset.fieldMode = mode;
    stage.dataset.fieldTransition = 'true';
    canvas.setAttribute('aria-pressed',String(mode === 'name'));
    title.textContent = mode === 'name' ? 'Kawer' : 'Rippled sphere';
    reveal.textContent = mode === 'name' ? 'Show sphere' : 'Reveal Kawer';
    note.textContent = mode === 'name' ? 'Tap to return to the sphere.' : 'Tap to reveal Kawer. Drag to rotate.';
    if (reducedMotion.matches) { finishTransition(); draw(); }
    syncMotion();
  }
  controls.addEventListener('click', event => {
    const action = /** @type {HTMLElement | null} */ ((/** @type {Element} */ (event.target)).closest('[data-field-action]'))?.dataset.fieldAction;
    if (action === 'reveal') toggleName();
    if (action === 'motion' && mode === 'sphere') { rotating = !rotating; syncMotion(); }
  });
  canvas.addEventListener('click', event => {
    if (event.detail > 0 && suppressClick) { suppressClick = false; return; }
    suppressClick = false; toggleName();
  });
  canvas.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault(); if (!event.repeat) toggleName(); return;
    }
    if (mode !== 'sphere' || !['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home'].includes(event.key)) return;
    event.preventDefault(); rotating = false; finishTransition();
    if (event.key === 'ArrowLeft') yaw -= 0.3;
    if (event.key === 'ArrowRight') yaw += 0.3;
    if (event.key === 'ArrowUp') pitch = Math.max(-1.3,pitch-0.15);
    if (event.key === 'ArrowDown') pitch = Math.min(1.3,pitch+0.15);
    if (event.key === 'Home') { yaw = INITIAL_YAW; pitch = INITIAL_PITCH; }
    draw(); syncMotion();
  });
  canvas.addEventListener('pointerdown', event => {
    if (event.button !== 0 || !event.isPrimary) return;
    pointer = {id:event.pointerId,x:event.clientX,y:event.clientY,lastX:event.clientX,lastY:event.clientY};
    suppressClick = false; canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointermove', event => {
    if (!pointer || pointer.id !== event.pointerId) return;
    if (Math.hypot(event.clientX-pointer.x,event.clientY-pointer.y) > 7) suppressClick = true;
    if (suppressClick && mode === 'sphere') {
      if (!dragging) { finishTransition(); rotating = false; dragging = true; syncMotion(); }
      yaw += (event.clientX-pointer.lastX)*0.006;
      pitch = Math.max(-1.3,Math.min(1.3,pitch+(event.clientY-pointer.lastY)*0.004));
      draw();
    }
    pointer.lastX=event.clientX; pointer.lastY=event.clientY;
  });
  canvas.addEventListener('pointerup',()=>{ pointer = null; dragging = false; syncMotion(); });
  canvas.addEventListener('pointercancel',()=>{ pointer = null; dragging = false; suppressClick = true; syncMotion(); });
  canvas.addEventListener('lostpointercapture',()=>{ pointer = null; dragging = false; });
  reducedMotion.addEventListener('change',()=>{ if(reducedMotion.matches) { rotating=false; finishTransition(); draw(); syncMotion(); } });
  document.addEventListener('visibilitychange',syncMotion);
  new IntersectionObserver(entries=>{inView=entries[0].isIntersecting;syncMotion();},{threshold:0.05}).observe(stage);
  new ResizeObserver(draw).observe(canvas);
  canvas.hidden=false;
  try {
    draw(); stage.dataset.fieldReady='true'; stage.dataset.fieldMode='sphere'; stage.dataset.fieldTransition='false';
    controls.hidden=false; note.textContent='Tap to reveal Kawer. Drag to rotate.'; syncMotion();
  } catch { canvas.hidden=true; controls.hidden=true; }
}
