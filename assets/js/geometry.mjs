/** Original abstract geometry. Coordinates are artwork, never telemetry. */
export const INITIAL_YAW = 0.45;
export const INITIAL_PITCH = -0.32;
export function createSurface() {
  const points = [];
  for (let ring = 1; ring < 83; ring++) {
    const theta = Math.PI * ring / 83;
    const count = Math.round(150 * Math.sin(theta)) + 12;
    for (let step = 0; step < count; step++) {
      const phi = Math.PI * 2 * (step / count + ring * 0.013);
      const radius = 1 + 0.075 * Math.sin(theta * 6 + phi * 3) * Math.sin(theta) ** 2;
      points.push({x: radius * Math.sin(theta) * Math.cos(phi), y: radius * Math.cos(theta), z: radius * Math.sin(theta) * Math.sin(phi)});
    }
  }
  return points;
}
/** Sample original geometric KAWER lettering with the same particle count as the sphere. */
export function createNameSurface(count) {
  const glyphs = [
    {width: 0.64, strokes: [[0,0,0,1],[0.60,0,0,0.52],[0,0.52,0.64,1]]},
    {width: 0.66, strokes: [[0,1,0.33,0],[0.33,0,0.66,1],[0.12,0.63,0.54,0.63]]},
    {width: 0.84, strokes: [[0,0,0.18,1],[0.18,1,0.42,0.38],[0.42,0.38,0.66,1],[0.66,1,0.84,0]]},
    {width: 0.60, strokes: [[0,0,0,1],[0,0,0.60,0],[0,0.5,0.48,0.5],[0,1,0.60,1]]},
    {width: 0.66, strokes: [[0,0,0,1],[0,0,0.44,0],[0.44,0,0.62,0.14],[0.62,0.14,0.62,0.35],[0.62,0.35,0.44,0.51],[0.44,0.51,0,0.51],[0.29,0.51,0.66,1]]}
  ];
  const strokes = [];
  let offset = 0, totalLength = 0;
  for (const glyph of glyphs) {
    for (const [x1,y1,x2,y2] of glyph.strokes) {
      const length = Math.hypot(x2-x1,y2-y1);
      strokes.push({x1:x1+offset,y1,x2:x2+offset,y2,length,start:totalLength});
      totalLength += length;
    }
    offset += glyph.width + 0.18;
  }
  const width = offset - 0.18, scale = 2.6 / (width + 0.10);
  let strokeIndex = 0;
  return Array.from({length:count}, (_,index) => {
    const distance = (index+0.5) / count * totalLength;
    while (strokeIndex < strokes.length-1 && distance > strokes[strokeIndex].start + strokes[strokeIndex].length) strokeIndex++;
    const stroke = strokes[strokeIndex];
    const along = (distance-stroke.start) / stroke.length;
    const across = ((index*0.61803398875)%1 - 0.5)*0.105;
    const nx = -(stroke.y2-stroke.y1)/stroke.length, ny = (stroke.x2-stroke.x1)/stroke.length;
    return {
      x: (stroke.x1+(stroke.x2-stroke.x1)*along+nx*across-width/2)*scale,
      y: (stroke.y1+(stroke.y2-stroke.y1)*along+ny*across-0.5)*scale,
      z: 0.10 + ((index*0.754877666)%1-0.5)*0.06
    };
  });
}
/** @param {{x:number,y:number,z:number}[]} points */
export function projectSurface(points, yaw, pitch) {
  const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
  return points.map(point => {
    const x = point.x * cy + point.z * sy;
    const z = -point.x * sy + point.z * cy;
    const y = point.y * cp - z * sp;
    const depth = point.y * sp + z * cp;
    const perspective = 3.8 / (3.8 - depth);
    return {x: x * perspective, y: y * perspective, depth, perspective};
  });
}

export const DROPLET_PRESSURE = 0.25;
export const DROPLET_HANDOFF = 0.18;
export const WOBBLE_END = .58;
const WOBBLE_FADE_START = .22;
const CONTACT_RADIUS = .41, CONTACT_SPREAD = .58, CONTACT_CORE = .105, CONTACT_CURVE = .7;
const SIDE_SPREAD = .22, SIDE_CORE_REDUCTION = .035, OUTWARD_RESTRAINT = .35;
const DENT_WIDTH = .72, DENT_FALLOFF = .68, CENTER_COMPRESSION = .225;
const WOBBLE_RATE = .017, WOBBLE_DECAY = .0051, WOBBLE_LIMIT = .17;
const WOBBLE_LAG = 80, WOBBLE_BEND = .30;
export const clampUnit = value => Math.max(0,Math.min(1,value));
export const smoothUnit = value => { const t = clampUnit(value); return t*t*(3-2*t); };

// Measure pointer distance in projected orb units.
export function dropletTarget(dx, dy, scale, extent, target) {
  const distance = Math.hypot(dx,dy)/(scale*extent);
  target.strength = DROPLET_PRESSURE*(1-smoothUnit((distance-.91)/.39));
  if (target.strength) {
    target.x = dx/scale;
    target.y = dy/scale;
  }
}

export function createDroplet() {
  return { x:0, y:0, lagX:0, lagY:0, strength:0, lagStrength:0 };
}

// Two relaxation stages soften changes in direction and leave inertia on exit.
// This exact update keeps the response stable when the frame cadence changes.
export function stepDroplet(state, target, elapsed) {
  const time = Math.max(0,Math.min(100,elapsed))/55;
  const decay = Math.exp(-time);
  if (target.strength) {
    if (!state.strength && !state.lagStrength) {
      state.x = state.lagX = target.x;
      state.y = state.lagY = target.y;
    } else {
      const errorX = state.lagX-target.x, errorY = state.lagY-target.y;
      state.x = target.x+(state.x-target.x+errorX*time)*decay;
      state.y = target.y+(state.y-target.y+errorY*time)*decay;
      state.lagX = target.x+errorX*decay;
      state.lagY = target.y+errorY*decay;
    }
  } else {
    state.lagX = state.x+(state.lagX-state.x)*decay;
    state.lagY = state.y+(state.lagY-state.y)*decay;
  }
  const errorStrength = state.lagStrength-target.strength;
  state.strength = target.strength+(state.strength-target.strength+errorStrength*time)*decay;
  state.lagStrength = target.strength+errorStrength*decay;
  if (!target.strength && state.strength+state.lagStrength < .0005) {
    state.x = state.y = state.lagX = state.lagY = state.strength = state.lagStrength = 0;
  }
}

export function dropletPose(state, progress, extent, pose) {
  const distance = Math.hypot(state.x,state.y);
  pose.x = distance ? state.x/distance : 0;
  pose.y = distance ? state.y/distance : 0;
  pose.contactX = state.x;
  pose.contactY = state.y;
  const flowX = state.lagX-state.x, flowY = state.lagY-state.y;
  const flowScale = Math.max(extent*.16,Math.hypot(flowX,flowY));
  pose.flowX = flowX/flowScale;
  pose.flowY = flowY/flowScale;
  pose.side = smoothUnit(distance/(extent*.58));
  pose.strength = state.strength*(1-smoothUnit(progress/DROPLET_HANDOFF));
  pose.extent = extent;
}

export function createWobble() {
  return { x:0,y:0,vx:0,vy:0,middleX:0,middleY:0,tailX:0,tailY:0,axisX:0,axisY:0 };
}

export function resetWobble(wobble) {
  wobble.x = wobble.y = wobble.vx = wobble.vy = 0;
  wobble.middleX = wobble.middleY = wobble.tailX = wobble.tailY = 0;
  wobble.axisX = wobble.axisY = 0;
}

export function wobbleIsActive(wobble) {
  return wobble.axisX !== 0 || wobble.axisY !== 0;
}

export function kickWobble(wobble, x, y, axisX = x, axisY = y) {
  if (!wobbleIsActive(wobble)) {
    const length = Math.hypot(axisX,axisY);
    if (!length) return;
    wobble.axisX = axisX/length;
    wobble.axisY = axisY/length;
  }
  wobble.x += x*.06;
  wobble.y += y*.06;
  wobble.vx = wobble.vx*.6+x*.024;
  wobble.vy = wobble.vy*.6+y*.024;
}

export function stepWobble(wobble, elapsed) {
  const time = Math.min(1400,Math.max(0,elapsed));
  const steps = Math.ceil(time/32);
  for (let i=0;i<steps && wobbleIsActive(wobble);i++) advanceWobble(wobble,time/steps);
}

// Evaluate the damped spring directly, then pass its displacement down the surface.
function advanceWobble(wobble, time) {
  const decay = Math.exp(-WOBBLE_DECAY*time);
  const cos = Math.cos(WOBBLE_RATE*time), sin = Math.sin(WOBBLE_RATE*time);
  const x = wobble.x, y = wobble.y;
  const mx = (wobble.vx+WOBBLE_DECAY*x)/WOBBLE_RATE;
  const my = (wobble.vy+WOBBLE_DECAY*y)/WOBBLE_RATE;
  wobble.x = decay*(x*cos+mx*sin);
  wobble.y = decay*(y*cos+my*sin);
  wobble.vx = decay*(wobble.vx*cos-(WOBBLE_RATE*x+WOBBLE_DECAY*mx)*sin);
  wobble.vy = decay*(wobble.vy*cos-(WOBBLE_RATE*y+WOBBLE_DECAY*my)*sin);
  // The middle follows the leading rim, and the opposite rim follows the middle.
  const lag = Math.exp(-time/WOBBLE_LAG);
  const targetX = (x+wobble.x)*.5, targetY = (y+wobble.y)*.5;
  const errorX = wobble.middleX-targetX, errorY = wobble.middleY-targetY;
  wobble.tailX = targetX+(wobble.tailX-targetX+errorX*time/WOBBLE_LAG)*lag;
  wobble.tailY = targetY+(wobble.tailY-targetY+errorY*time/WOBBLE_LAG)*lag;
  wobble.middleX = targetX+errorX*lag;
  wobble.middleY = targetY+errorY*lag;
  if (Math.hypot(wobble.x,wobble.y,wobble.vx/WOBBLE_RATE,wobble.vy/WOBBLE_RATE,
    wobble.middleX,wobble.middleY,wobble.tailX,wobble.tailY) < .0013) resetWobble(wobble);
}

export function createWavePose() {
  return { x:0,y:0,middleX:0,middleY:0,tailX:0,tailY:0,axisX:0,axisY:0 };
}

function wavePeak(wave) {
  return Math.max(Math.hypot(wave.x,wave.y),Math.hypot(wave.middleX,wave.middleY),Math.hypot(wave.tailX,wave.tailY));
}

function writeWave(wave, weight, output) {
  output.x = wave.x*weight; output.y = wave.y*weight;
  output.middleX = wave.middleX*weight; output.middleY = wave.middleY*weight;
  output.tailX = wave.tailX*weight; output.tailY = wave.tailY*weight;
  output.axisX = weight ? wave.axisX : 0; output.axisY = weight ? wave.axisY : 0;
}

export function wobblePose(pointer, scroll, progress, pose) {
  const fade = 1-smoothUnit((progress-WOBBLE_FADE_START)/(WOBBLE_END-WOBBLE_FADE_START));
  const weight = fade*WOBBLE_LIMIT/Math.max(WOBBLE_LIMIT,wavePeak(pointer)+wavePeak(scroll));
  writeWave(pointer,weight,pose.pointerWave);
  writeWave(scroll,weight,pose.scrollWave);
}

export function waveProjected(x, y, wave, extent, out) {
  const axial = x*wave.axisX+y*wave.axisY;
  const across = clampUnit(.5-.5*axial/extent);
  const lead = (1-across)**2, middle = 2*across*(1-across), tail = across*across;
  const dx = wave.x*lead+wave.middleX*middle+wave.tailX*tail;
  const dy = wave.y*lead+wave.middleY*middle+wave.tailY*tail;
  const bend = WOBBLE_BEND*(dx*wave.axisX+dy*wave.axisY)/extent;
  out.x = x+dx-(x-wave.axisX*axial)*bend;
  out.y = y+dy-(y-wave.axisY*axial)*bend;
}

// Round the dent across the facing surface, then steer displaced dots around the contact.
export function deformProjected(x, y, pose, out) {
  let px = x, py = y;
  if (pose.strength) {
    const facing = clampUnit((x*pose.x+y*pose.y)/pose.extent);
    const across = (y-pose.contactY)*pose.x-(x-pose.contactX)*pose.y;
    const profile = 1-DENT_FALLOFF*smoothUnit(Math.abs(across)/(pose.extent*DENT_WIDTH));
    const dent = pose.strength*pose.side*facing*facing*profile;
    const compression = 1-CENTER_COMPRESSION*pose.strength*(1-pose.side)/pose.extent;
    px = (px-pose.x*dent)*compression;
    py = (py-pose.y*dent)*compression;
    const dx = px-pose.contactX, dy = py-pose.contactY;
    const radius = pose.extent*CONTACT_RADIUS;
    const distanceSquared = dx*dx+dy*dy;
    if (distanceSquared < radius*radius) {
      const distance = Math.sqrt(distanceSquared);
      const core = pose.extent*(CONTACT_CORE-SIDE_CORE_REDUCTION*pose.side);
      const softened = Math.sqrt(distanceSquared+core*core);
      const turn = CONTACT_CURVE*(dx*pose.flowY-dy*pose.flowX)/softened;
      const slideX = dx-dy*turn, slideY = dy+dx*turn;
      const outward = Math.max(0,slideX*pose.x+slideY*pose.y)*pose.side*OUTWARD_RESTRAINT;
      const spread = pose.strength*(CONTACT_SPREAD+SIDE_SPREAD*pose.side)*(1-smoothUnit(distance/radius))/softened;
      px += (slideX-pose.x*outward)*spread;
      py += (slideY-pose.y*outward)*spread;
      // Keep the parted dots inside the existing silhouette envelope.
      const lengthSquared = px*px+py*py;
      if (lengthSquared > pose.extent*pose.extent) {
        const scale = pose.extent/Math.sqrt(lengthSquared);
        px *= scale;
        py *= scale;
      }
    }
  }
  out.x = px;
  out.y = py;
}

// Keep the shader and Canvas coefficients together with the numeric reference.
export const DROPLET_GLSL = `
vec2 waveProjected(vec2 point, vec4 leadAndMiddle, vec4 tailAndAxis, float extent) {
  vec2 axis = tailAndAxis.zw;
  if (all(equal(axis,vec2(0.0)))) return point;
  float axial = dot(point,axis);
  float across = clamp(.5-.5*axial/extent,0.0,1.0);
  vec2 nearHalf = mix(leadAndMiddle.xy,leadAndMiddle.zw,across);
  vec2 farHalf = mix(leadAndMiddle.zw,tailAndAxis.xy,across);
  vec2 displacement = mix(nearHalf,farHalf,across);
  float bend = ${WOBBLE_BEND}*dot(displacement,axis)/extent;
  return point+displacement-(point-axis*axial)*bend;
}

vec2 deformProjected(vec2 point, vec2 direction, float strength, float extent, vec3 pressure, vec2 flow) {
  if (strength == 0.0) return point;
  float facing = clamp(dot(point,direction)/extent,0.0,1.0);
  vec2 sideways = vec2(-direction.y,direction.x);
  float across = abs(dot(point-pressure.xy,sideways));
  float profile = 1.0-${DENT_FALLOFF}*smoothstep(0.0,extent*${DENT_WIDTH},across);
  float compression = 1.0-${CENTER_COMPRESSION}*strength*(1.0-pressure.z)/extent;
  point = (point-direction*(strength*pressure.z*facing*facing*profile))*compression;
  vec2 delta = point-pressure.xy;
  float radius = extent*${CONTACT_RADIUS};
  float distanceSquared = dot(delta,delta);
  if (distanceSquared < radius*radius) {
    float distanceToContact = sqrt(distanceSquared);
    float core = extent*(${CONTACT_CORE}-${SIDE_CORE_REDUCTION}*pressure.z);
    float softened = sqrt(distanceSquared+core*core);
    float turn = ${CONTACT_CURVE}*(delta.x*flow.y-delta.y*flow.x)/softened;
    vec2 slide = delta+vec2(-delta.y,delta.x)*turn;
    float outward = max(0.0,dot(slide,direction))*pressure.z*${OUTWARD_RESTRAINT};
    float spread = strength*(${CONTACT_SPREAD}+${SIDE_SPREAD}*pressure.z)*(1.0-smoothstep(0.0,radius,distanceToContact))/softened;
    point += (slide-direction*outward)*spread;
    float lengthSquared = dot(point,point);
    if (lengthSquared > extent*extent) point *= extent*inversesqrt(lengthSquared);
  }
  return point;
}
`;
