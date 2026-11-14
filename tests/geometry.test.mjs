import test from 'node:test';
import assert from 'node:assert/strict';
import { createSurface, projectSurface, INITIAL_YAW, INITIAL_PITCH } from '../assets/js/geometry.mjs';

const shapes = ['sphere', 'torus', 'trefoil'];

test('morphable surfaces have matching sampling density and finite bounded coordinates', () => {
  const surfaces = shapes.map(shape => createSurface(shape));
  assert.ok(surfaces[0].length > 1000, 'a visible point cloud needs sufficient sampling');
  for (const [index, surface] of surfaces.entries()) {
    assert.equal(surface.length, surfaces[0].length, `${shapes[index]} can morph point-for-point`);
    for (const point of surface) {
      assert.ok([point.x, point.y, point.z].every(Number.isFinite), `${shapes[index]} has finite coordinates`);
      assert.ok(Math.hypot(point.x, point.y, point.z) < 1.6, `${shapes[index]} fits the normalized scene`);
    }
  }
  assert.deepEqual(createSurface(), surfaces[0], 'default surface preserves the original sphere');
  assert.deepEqual(createSurface('torus'), surfaces[1], 'sampling is deterministic');
  assert.notDeepEqual(surfaces[0], surfaces[1]);
  assert.notDeepEqual(surfaces[1], surfaces[2]);
  assert.notDeepEqual(surfaces[0], surfaces[2]);
});

test('all surfaces project to finite visible coordinates across rotation and pitch', () => {
  for (const shape of shapes) {
    const points = createSurface(shape);
    for (const [yaw, pitch] of [[INITIAL_YAW, INITIAL_PITCH], [0, 0], [Math.PI / 2, 1.3], [-Math.PI, -1.3]]) {
      const projected = projectSurface(points, yaw, pitch);
      assert.equal(projected.length, points.length);
      for (const point of projected) {
        assert.ok([point.x, point.y, point.depth, point.perspective].every(Number.isFinite));
        assert.ok(point.perspective > 0, `${shape} stays in front of the projection plane`);
        assert.ok(Math.abs(point.x) < 1.45 && Math.abs(point.y) < 1.45, `${shape} fits the canvas at drawing scale`);
      }
    }
  }
});
