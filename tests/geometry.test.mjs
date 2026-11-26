import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createSurface, createNameSurface, projectSurface, INITIAL_YAW, INITIAL_PITCH,
  createDroplet, dropletTarget, stepDroplet, dropletPose, deformProjected, DROPLET_PRESSURE, DROPLET_HANDOFF,
  createWobble, kickWobble, stepWobble, wobblePose, wobbleProjected, WOBBLE_END,
} from '../assets/js/geometry.mjs';

test('original sphere and lettering use matching finite deterministic point clouds', () => {
  const sphere = createSurface();
  const name = createNameSurface(sphere.length);
  assert.ok(sphere.length > 1000);
  assert.equal(name.length, sphere.length, 'the name can morph point-for-point from the sphere');
  assert.deepEqual(createSurface(), sphere);
  assert.deepEqual(createNameSurface(sphere.length), name);
  assert.notDeepEqual(sphere, name);
  for (const [label, points] of [['sphere', sphere], ['name', name]]) {
    for (const point of points) {
      assert.ok([point.x, point.y, point.z].every(Number.isFinite), `${label} has finite coordinates`);
      assert.ok(Math.hypot(point.x, point.y, point.z) < 1.6, `${label} fits the normalized scene`);
    }
  }
});

test('sphere rotation and front-facing lettering project safely inside the canvas', () => {
  const sphere = createSurface();
  const views = [[INITIAL_YAW, INITIAL_PITCH], [0, 0], [Math.PI / 2, 1.3], [-Math.PI, -1.3]];
  const surfaces = views.map(([yaw, pitch]) => projectSurface(sphere, yaw, pitch));
  surfaces.push(projectSurface(createNameSurface(sphere.length), 0, 0));
  for (const points of surfaces) {
    assert.equal(points.length, sphere.length);
    for (const point of points) {
      assert.ok([point.x, point.y, point.depth, point.perspective].every(Number.isFinite));
      assert.ok(point.perspective > 0);
      assert.ok(Math.abs(point.x) < 1.45 && Math.abs(point.y) < 1.45, 'projection leaves room for point radii at drawing scale');
    }
  }
});

test('pressure dents the near silhouette and separates dots at the contact', () => {
  const extent = 1.13;
  const sphere = projectSurface(createSurface(), INITIAL_YAW, INITIAL_PITCH);
  const pose = {};
  dropletPose({...createDroplet(),x:.75,lagX:.75,strength:DROPLET_PRESSURE},0,extent,pose);
  const out = { x:0, y:0 };
  let broad = 0, nearBefore = 0, nearAfter = 0, rightBefore = -Infinity, rightAfter = -Infinity;
  for (const {x,y} of sphere) {
    deformProjected(x,y,pose,out);
    if (x-out.x > .025) broad++;
    if (Math.hypot(x-pose.contactX,y) < .105) nearBefore++;
    if (Math.hypot(out.x-pose.contactX,out.y) < .105) nearAfter++;
    if (x < 0) assert.deepEqual(out,{x,y},'the far side keeps its original contour');
    assert.ok(Math.hypot(out.x,out.y) <= extent);
    rightBefore = Math.max(rightBefore,x);
    rightAfter = Math.max(rightAfter,out.x);
  }
  assert.ok(broad > sphere.length*.2);
  assert.ok(rightBefore-rightAfter > .12,'the near silhouette moves inward');
  assert.ok(nearAfter > 0 && nearAfter < nearBefore*.6,'the contact thins without clearing every dot');
  deformProjected(.75,.07,pose,out);
  assert.ok(out.y > .11,'dots slide sideways from the contact');
  dropletPose({...createDroplet(),strength:DROPLET_PRESSURE},0,extent,pose);
  deformProjected(1,0,pose,out);
  assert.ok(out.x < .96,'center pressure compresses the visible outline');
  deformProjected(.075,0,pose,out);
  assert.ok(out.x > .12,'center pressure also separates dots');
});

test('dots curve around both sides of a moving contact and the flow subsides on release', () => {
  const extent = 1.13, pose = {}, steady = {}, above = {}, below = {};
  const state = {...createDroplet(),strength:DROPLET_PRESSURE,lagStrength:DROPLET_PRESSURE};
  dropletPose(state,0,extent,pose);
  deformProjected(.04,.19,pose,steady);
  state.lagX = .18;
  dropletPose(state,0,extent,pose);
  const initialFlow = pose.flowX;
  deformProjected(.04,.19,pose,above);
  deformProjected(.04,-.19,pose,below);
  assert.ok(above.x-steady.x > .03,'the sweep steers dots in its direction');
  assert.ok(Math.abs(above.x-below.x) < 1e-9 && Math.abs(above.y+below.y) < 1e-9);
  stepDroplet(state,{x:0,y:0,strength:0},90);
  dropletPose(state,0,extent,pose);
  assert.ok(pose.flowX > 0 && pose.flowX < initialFlow*.3);
  assert.ok(pose.strength > 0 && pose.strength < DROPLET_PRESSURE);
});

test('pointer scale, sustained hold, delayed recovery, and lettering handoff are bounded', () => {
  const extent = 1.12, state = createDroplet(), target = {x:0,y:0,strength:0}, pose = {};
  dropletTarget(170,30,220,extent,target);
  const desktop = {...target};
  dropletTarget(85,15,110,extent,target);
  assert.deepEqual(target,desktop, 'identical relative positions give identical deformation');
  stepDroplet(state,target,45);
  assert.equal(state.x,target.x,'the squeeze begins at the cursor');
  assert.ok(state.strength > 0 && state.strength < target.strength*.4);
  for (let i=0;i<30;i++) {
    stepDroplet(state,target,40);
    assert.ok(state.strength <= DROPLET_PRESSURE);
  }
  assert.ok(Math.abs(target.strength-state.strength) < .0001);
  dropletPose(state,.08,extent,pose);
  assert.ok(pose.strength > 0 && pose.strength < DROPLET_PRESSURE);
  dropletPose(state,DROPLET_HANDOFF,extent,pose);
  assert.equal(pose.strength,0);
  dropletPose(state,.62,extent,pose);
  const out = {};
  deformProjected(.85,-.15,pose,out);
  assert.deepEqual(out,{x:.85,y:-.15},'lettering keeps its original coordinates');
  dropletTarget(400,0,110,extent,target);
  assert.equal(target.strength,0);
  stepDroplet(state,target,60);
  assert.equal(state.x,desktop.x,'the squeeze recovers at its last contact');
  assert.ok(state.strength > desktop.strength*.55 && state.strength < desktop.strength*.8);
  for (let i=0;i<12;i++) stepDroplet(state,target,50);
  assert.deepEqual(state,createDroplet());
});

test('the wobble rebounds, damps, and fades before the lettering forms', () => {
  const up = createWobble(), down = createWobble(), idle = createWobble();
  const pose = {extent:1.13}, center = {}, rim = {};
  kickWobble(up,0,-.125);
  kickWobble(down,0,.125);
  stepWobble(up,55);
  stepWobble(down,55);
  assert.ok(up.y < -.085);
  assert.equal(up.y,-down.y);
  wobblePose(idle,up,0,pose);
  wobbleProjected(0,0,pose,center);
  wobbleProjected(0,-1,pose,rim);
  assert.ok(center.y < 0 && rim.y+1 < center.y,'the rim flexes ahead of the center');
  stepWobble(up,180);
  assert.ok(up.y > .02,'the initial kick overshoots in the other direction');
  wobblePose(idle,up,WOBBLE_END,pose);
  wobbleProjected(0,-1,pose,rim);
  assert.deepEqual(rim,{x:0,y:-1});
  stepWobble(up,650);
  assert.deepEqual(up,idle);
});
