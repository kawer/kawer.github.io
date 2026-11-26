import { BufferAttribute, BufferGeometry, Camera, Points, Scene, ShaderMaterial, Vector2, Vector3, Vector4, WebGLRenderer } from 'three';
import { DROPLET_GLSL } from './geometry.mjs';

const vertexShader = `
attribute vec3 lettering;
uniform vec4 rotation;
uniform vec4 viewport;
uniform vec4 droplet;
uniform vec3 pressure;
uniform vec2 flow;
uniform vec2 wobble;
uniform vec3 shape;
uniform float pointScale;
varying float alpha;
varying float vRadius;
${DROPLET_GLSL}
void main() {
  vec3 point = mix(position, lettering, shape.x);
  float x = point.x*rotation.x+point.z*rotation.y;
  float z = -point.x*rotation.y+point.z*rotation.x;
  float y = point.y*rotation.z-z*rotation.w;
  float depth = point.y*rotation.w+z*rotation.z;
  vec2 projected = vec2(x,y)*(3.8/(3.8-depth));
  projected = deformProjected(projected,droplet.xy,droplet.z,droplet.w,pressure,flow);
  projected = wobbleProjected(projected,wobble,droplet.w);
  vec2 pixel = viewport.xy+projected*shape.y;
  gl_Position = vec4(pixel/viewport.zw*vec2(2.0,-2.0)+vec2(-1.0,1.0),0.0,1.0);
  float band = clamp(floor((depth+1.12)/2.25*8.0),0.0,7.0);
  float diameter = 2.0*(.6+band*.13)*shape.z*pointScale;
  gl_PointSize = max(1.0,ceil(diameter)+1.0);
  alpha = .14+band*.115;
  vRadius = diameter*.5/gl_PointSize;
}
`;

const fragmentShader = `
varying float alpha;
varying float vRadius;
void main() {
  float distanceToCenter = length(gl_PointCoord-.5);
  float edge = fwidth(distanceToCenter)*.5;
  float coverage = 1.0-smoothstep(max(0.0,vRadius-edge),vRadius+edge,distanceToCenter);
  gl_FragColor = vec4(vec3(35.0,92.0,219.0)/255.0,alpha*coverage);
}
`;

export function createWebGLField(canvas, gl, sphere, name, onLost) {
  const uniforms = {
    rotation: { value:new Vector4() },
    viewport: { value:new Vector4() },
    droplet: { value:new Vector4() },
    pressure: { value:new Vector3() },
    flow: { value:new Vector2() },
    wobble: { value:new Vector2() },
    shape: { value:new Vector3() },
    pointScale: { value:1 },
  };
  const scene = new Scene(), camera = new Camera();
  const geometry = new BufferGeometry();
  const material = new ShaderMaterial({ uniforms, vertexShader, fragmentShader, transparent:true, depthTest:false, depthWrite:false });
  const points = new Points(geometry,material);
  points.frustumCulled = false;
  scene.add(points);
  let renderer;
  let shaderFailed = false, verified = false, disposed = false;
  const lost = event => {
    event.preventDefault();
    onLost();
  };
  function dispose() {
    if (disposed) return;
    disposed = true;
    canvas.removeEventListener('webglcontextlost',lost);
    geometry.dispose();
    material.dispose();
    renderer?.dispose();
    if (!gl.isContextLost()) gl.getExtension('WEBGL_lose_context')?.loseContext();
  }
  try {
    renderer = new WebGLRenderer({ canvas, context:gl });
    renderer.setClearColor(0,0);
    renderer.debug.onShaderError = () => { shaderFailed = true; };
    function attribute(source) {
      const buffer = new Float32Array(source.length*3);
      for (let i=0;i<source.length;i++) {
        const {x,y,z} = source[i];
        buffer[i*3] = x; buffer[i*3+1] = y; buffer[i*3+2] = z;
      }
      return new BufferAttribute(buffer,3);
    }
    geometry.setAttribute('position',attribute(sphere));
    geometry.setAttribute('lettering',attribute(name));
    canvas.addEventListener('webglcontextlost',lost);
    const maxBacking = Math.min(2048,gl.getParameter(gl.MAX_RENDERBUFFER_SIZE),...gl.getParameter(gl.MAX_VIEWPORT_DIMS));
    return {
      draw(view, pose) {
        if (disposed || gl.isContextLost()) return false;
        const pixels = Math.min(maxBacking,Math.round(view.size*view.pixelRatio));
        if (canvas.width !== pixels || canvas.height !== pixels) renderer.setSize(pixels,pixels,false);
        uniforms.rotation.value.set(Math.cos(view.yaw),Math.sin(view.yaw),Math.cos(view.pitch),Math.sin(view.pitch));
        uniforms.viewport.value.set(view.x,view.y,view.size,view.size);
        uniforms.shape.value.set(view.morph,view.scale,view.radiusScale);
        uniforms.droplet.value.set(pose.x,pose.y,pose.strength,pose.extent);
        uniforms.pressure.value.set(pose.contactX,pose.contactY,pose.side);
        uniforms.flow.value.set(pose.flowX,pose.flowY);
        uniforms.wobble.value.set(pose.wobbleX,pose.wobbleY);
        uniforms.pointScale.value = pixels/view.size;
        renderer.render(scene,camera);
        if (shaderFailed || gl.isContextLost()) return false;
        if (!verified) verified = renderer.info.render.calls === 1 && renderer.info.render.points === sphere.length && gl.getError() === gl.NO_ERROR;
        return verified;
      },
      dispose,
    };
  } catch (error) {
    dispose();
    throw error;
  }
}
