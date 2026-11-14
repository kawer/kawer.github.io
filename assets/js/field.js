import { createSurface, projectSurface, INITIAL_YAW, INITIAL_PITCH } from './geometry.mjs';

const canvas = /** @type {HTMLCanvasElement | null} */ (document.querySelector('#field-canvas'));
const stage = /** @type {HTMLElement | null} */ (document.querySelector('.field-stage'));
const controls = /** @type {HTMLElement | null} */ (document.querySelector('.field-controls'));
const context = canvas?.getContext('2d');
if (canvas && stage && controls && context) {
  const surface = createSurface();
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let yaw = INITIAL_YAW, pitch = INITIAL_PITCH;
  let running = !reducedMotion.matches;
  let inView = true;
  let frame = 0, lastTime = 0;
  let dragging = false, lastX = 0, lastY = 0;
  let size = 0;
  const motion = /** @type {HTMLButtonElement} */ (controls.querySelector('[data-field-action="motion"]'));
  const note = /** @type {HTMLElement} */ (stage.querySelector('.field-note'));

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
    // Eight depth bands keep the frame inexpensive without a per-point state change.
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
  function tick(time) {
    frame = 0;
    if (!running || !inView || document.hidden || dragging) return;
    if (time - lastTime >= 32) {
      yaw += Math.min(time-lastTime, 50) * 0.000065;
      lastTime = time;
      draw();
    }
    frame = requestAnimationFrame(tick);
  }
  function syncMotion() {
    cancelAnimationFrame(frame);
    frame = 0;
    motion.setAttribute('aria-pressed', String(running));
    motion.textContent = running ? 'Pause motion' : 'Start motion';
    if (running && inView && !document.hidden && !dragging) frame = requestAnimationFrame(tick);
  }
  function pause() { running = false; syncMotion(); }
  controls.addEventListener('click', event => {
    const target = /** @type {Element} */ (event.target);
    const action = /** @type {HTMLElement | null} */ (target.closest('[data-field-action]'))?.dataset.fieldAction;
    if (!action) return;
    if (action === 'motion') { running = !running; syncMotion(); return; }
    pause();
    if (action === 'reset') { yaw = INITIAL_YAW; pitch = INITIAL_PITCH; }
    draw();
  });
  canvas.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home'].includes(event.key)) return;
    event.preventDefault();
    pause();
    if (event.key === 'ArrowLeft') yaw -= 0.3;
    if (event.key === 'ArrowRight') yaw += 0.3;
    if (event.key === 'ArrowUp') pitch = Math.max(-1.3, pitch - 0.15);
    if (event.key === 'ArrowDown') pitch = Math.min(1.3, pitch + 0.15);
    if (event.key === 'Home') { yaw = INITIAL_YAW; pitch = INITIAL_PITCH; }
    draw();
  });
  canvas.addEventListener('pointerdown', event => {
    if (event.button !== 0) return;
    pause(); dragging = true; lastX = event.clientX; lastY = event.clientY;
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointermove', event => {
    if (!dragging) return;
    yaw += (event.clientX-lastX)*0.006;
    pitch = Math.max(-1.3,Math.min(1.3,pitch+(event.clientY-lastY)*0.004));
    lastX=event.clientX; lastY=event.clientY;
    draw();
  });
  const stopDrag = () => { dragging = false; };
  canvas.addEventListener('pointerup',stopDrag);
  canvas.addEventListener('pointercancel',stopDrag);
  canvas.addEventListener('lostpointercapture',stopDrag);
  reducedMotion.addEventListener('change',()=>{ if(reducedMotion.matches) pause(); });
  document.addEventListener('visibilitychange',syncMotion);
  new IntersectionObserver(entries=>{inView = entries[0].isIntersecting;syncMotion();},{threshold:0.05}).observe(stage);
  new ResizeObserver(draw).observe(canvas);
  // Reveal only after a successful first frame. Static SVG remains the failure fallback.
  canvas.hidden = false;
  try {
    draw();
    stage.dataset.fieldReady = 'true';
    controls.hidden = false;
    note.textContent = 'Drag or use arrow keys to rotate.';
    syncMotion();
  } catch {
    canvas.hidden = true;
    controls.hidden = true;
  }
}
