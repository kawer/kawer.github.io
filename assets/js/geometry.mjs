/** Original mathematical surfaces. All coordinates are synthetic geometry, never telemetry. */
export const INITIAL_YAW = 0.45;
export const INITIAL_PITCH = -0.32;
/** @param {'sphere'|'torus'|'trefoil'} [shape] */
export function createSurface(shape = 'sphere') {
  const points = [];
  for (let ring = 1; ring < 83; ring++) {
    const theta = Math.PI * ring / 83;
    const count = Math.round(150 * Math.sin(theta)) + 12;
    for (let step = 0; step < count; step++) {
      const phi = Math.PI * 2 * (step / count + ring * 0.013);
      const radius = 1 + 0.075 * Math.sin(theta * 6 + phi * 3) * Math.sin(theta) ** 2;
      if (shape === 'torus') {
        const u = (ring - 1) * Math.PI * 2 / 82;
        const radial = 0.7 + 0.3 * Math.cos(phi);
        points.push({x: radial * Math.cos(u), y: radial * Math.sin(u), z: 0.3 * Math.sin(phi)});
      } else if (shape === 'trefoil') {
        const t = (ring - 1) * Math.PI * 2 / 82;
        const radial = 0.65 + 0.24 * Math.cos(3 * t);
        const derivative = -0.72 * Math.sin(3 * t);
        const cx = radial * Math.cos(2*t), cy = radial * Math.sin(2*t), cz = 0.24 * Math.sin(3*t);
        const tx = derivative * Math.cos(2*t) - 2 * radial * Math.sin(2*t);
        const ty = derivative * Math.sin(2*t) + 2 * radial * Math.cos(2*t);
        const tz = 0.72 * Math.cos(3*t);
        const length = Math.hypot(tx,ty,tz);
        const normalLength = Math.hypot(tx,ty);
        const nx = ty / normalLength, ny = -tx / normalLength;
        const bx = -tz * ny / length, by = tz * nx / length, bz = (tx * ny - ty * nx) / length;
        points.push({x: cx + 0.12 * (nx * Math.cos(phi) + bx * Math.sin(phi)), y: cy + 0.12 * (ny * Math.cos(phi) + by * Math.sin(phi)), z: cz + 0.12 * bz * Math.sin(phi)});
      } else {
        points.push({x: radius * Math.sin(theta) * Math.cos(phi), y: radius * Math.cos(theta), z: radius * Math.sin(theta) * Math.sin(phi)});
      }
    }
  }
  return points;
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
