import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveResponsiveLayout } from '../dist/esm/index.js';

const elements = [
  { id: 'left', rect: { x: 10, y: 10, width: 20, height: 20 } },
  { id: 'right', rect: { x: 70, y: 10, width: 20, height: 20 }, horizontal: 'end' },
  { id: 'center', rect: { x: 40, y: 40, width: 20, height: 20 }, horizontal: 'center' },
  { id: 'stretch', rect: { x: 10, y: 70, width: 80, height: 20 }, horizontal: 'stretch' },
];

test('resolves start, end, centered and stretched geometry against target canvas dimensions', () => {
  const result = resolveResponsiveLayout(
    { width: 100, height: 100 },
    { width: 200, height: 100 },
    elements,
  );
  assert.deepEqual(
    result.elements.map(({ rect }) => [rect.x, rect.width]),
    [
      [10, 20],
      [170, 20],
      [90, 20],
      [10, 180],
    ],
  );
  assert.deepEqual(result.overflowingIds, []);
});

test('scales both geometry components and clamps sizes without hiding positional overflow', () => {
  const result = resolveResponsiveLayout({ width: 100, height: 100 }, { width: 40, height: 60 }, [
    {
      id: 'scaled',
      rect: { x: 80, y: 80, width: 20, height: 20 },
      horizontal: 'scale',
      vertical: 'scale',
    },
  ]);
  assert.deepEqual(result.elements[0].rect, { x: 32, y: 48, width: 8, height: 12 });
  assert.deepEqual(result.overflowingIds, []);
  const clamped = resolveResponsiveLayout({ width: 100, height: 100 }, { width: 25, height: 30 }, [
    {
      id: 'minimum',
      rect: { x: 10, y: 10, width: 30, height: 20 },
      horizontal: 'stretch',
      minWidth: 40,
    },
  ]);
  assert.deepEqual(clamped.elements[0].overflow, { left: 0, top: 0, right: 25, bottom: 0 });
  assert.deepEqual(clamped.overflowingIds, ['minimum']);
});

test('validates dimensions, anchor modes, capacity, and duplicate identifiers', () => {
  assert.throws(
    () => resolveResponsiveLayout({ width: 0, height: 10 }, { width: 1, height: 1 }, []),
    RangeError,
  );
  assert.throws(
    () => resolveResponsiveLayout({ width: 10, height: 10 }, { width: 1, height: 1 }, [], 0),
    RangeError,
  );
  assert.throws(
    () =>
      resolveResponsiveLayout({ width: 10, height: 10 }, { width: 10, height: 10 }, [
        { id: 'same', rect: { x: 0, y: 0, width: 1, height: 1 } },
        { id: 'same', rect: { x: 1, y: 1, width: 1, height: 1 } },
      ]),
    /Duplicate/,
  );
  assert.throws(
    () =>
      resolveResponsiveLayout({ width: 10, height: 10 }, { width: 10, height: 10 }, [
        { id: 'x', rect: { x: 0, y: 0, width: 1, height: 1 }, horizontal: 'weird' },
      ]),
    /anchor/,
  );
});

test('rejects invalid rectangles and elements outside the base canvas', () => {
  assert.throws(
    () =>
      resolveResponsiveLayout({ width: 10, height: 10 }, { width: 10, height: 10 }, [
        { id: 'x', rect: { x: 9, y: 0, width: 2, height: 1 } },
      ]),
    /base canvas/,
  );
  assert.throws(
    () =>
      resolveResponsiveLayout({ width: 10, height: 10 }, { width: 10, height: 10 }, [
        { id: 'x', rect: { x: 0, y: 0, width: 0, height: 1 } },
      ]),
    RangeError,
  );
  assert.throws(
    () =>
      resolveResponsiveLayout({ width: 10, height: 10 }, { width: 10, height: 10 }, [
        { id: '__proto__', rect: { x: 0, y: 0, width: 1, height: 1 } },
      ]),
    TypeError,
  );
});
