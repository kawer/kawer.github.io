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
