import test from 'node:test';
import assert from 'node:assert/strict';
import { createSurface, createNameSurface, projectSurface, INITIAL_YAW, INITIAL_PITCH } from '../assets/js/geometry.mjs';

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
