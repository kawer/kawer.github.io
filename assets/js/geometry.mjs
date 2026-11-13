/** An original harmonic sphere. All coordinates are synthetic geometry, never telemetry. */
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
