import { createSurface, projectSurface, INITIAL_YAW, INITIAL_PITCH } from '../assets/js/geometry.mjs';
export function renderFieldSvg() {
  const points = projectSurface(createSurface(), INITIAL_YAW, INITIAL_PITCH).sort((a,b)=>a.depth-b.depth);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 900" fill="#235cdb"><title>A harmonic sphere, a study in geometry</title>${points.map(point=>`<circle cx="${(450+point.x*310).toFixed(2)}" cy="${(450+point.y*310).toFixed(2)}" r="${(0.7+Math.max(0,point.depth+1)*0.5).toFixed(2)}" opacity="${(0.15+(point.depth+1.1)/2.3*0.8).toFixed(2)}"/>`).join('')}</svg>`;
}
