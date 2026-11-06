# @lp-labs/responsive-design

Resolve bounded rectangle layouts against explicit canvas sizes. Anchors are deterministic geometry
rules; this package does not measure fonts, render pixels, or infer device breakpoints.

## Install and quickstart

```sh
npm install @lp-labs/responsive-design
```

```js
import { resolveResponsiveLayout } from '@lp-labs/responsive-design';

const layout = resolveResponsiveLayout({ width: 400, height: 300 }, { width: 240, height: 300 }, [
  { id: 'logo', rect: { x: 16, y: 16, width: 80, height: 32 }, horizontal: 'start' },
  { id: 'action', rect: { x: 300, y: 16, width: 80, height: 32 }, horizontal: 'end' },
  { id: 'body', rect: { x: 16, y: 64, width: 368, height: 200 }, horizontal: 'stretch' },
]);
console.log(layout.elements.map(({ id, rect }) => ({ id, rect })));
console.log(layout.overflowingIds);
```

## API and types

- `resolveResponsiveLayout(base, target, elements, maxElements?)` snapshots and resolves a design
  for one output canvas. Both canvas arguments are `{ width, height }`. Every input rectangle is in
  base-canvas coordinates. It returns target dimensions, resolved elements, and overflowing IDs.
- `Rectangle`: finite `x`, `y`, `width`, `height`; position may be negative only in output, while
  source rectangles must fit the base canvas. Width and height must be positive.
- `ResponsiveElement`: unique safe `id`, `rect`, optional per-axis anchor, and optional min/max
  dimensions. IDs start with an ASCII letter and may include letters, digits, `_`, `.`, and `-`.
- `AxisAnchor`: `start` keeps leading offset and size; `end` preserves trailing offset; `center`
  preserves center offset; `stretch` keeps both edge gaps; `scale` scales position and size by the
  target/base dimension ratio. Horizontal and vertical anchors resolve independently; defaults are
  `start`.
- `ResolvedElement`: `id`, resolved `rect`, and `Overflow` distances for left, top, right, bottom.
  `overflowingIds` lists elements with any strictly positive overflow, in input order.
- `Overflow`, `ResponsiveLayout`: exported result types.

Min/max dimensions clamp the resolved size without repositioning it. Thus a clamp can cause
overflow, which is deliberately reported rather than silently moved. No breakpoint presets or
platform dimensions are assumed.

## Customization, errors, and limits

Choose anchors independently for each element and each output dimension; define your own breakpoint
selection outside this library and pass the actual desired dimensions. You may set size bounds to
preserve minimum legibility or keep a fixed-size asset. Feed reported rectangles to your renderer,
then decide whether to crop, reflow, or reject overflow.

The default element limit is 500; caller limits are 1..2,000 and the hard cap is 2,000. Canvas
dimensions are positive and at most 1,000,000. Geometry magnitudes are capped at 1,000,000,000.
Invalid records, anchors, identifiers, duplicate IDs, and source rectangles throw `TypeError` or
`RangeError`; non-finite/out-of-range geometry and contradictory min/max bounds throw
`RangeError`. This is a rectangle solver, not a flow/text layout engine and does not guarantee
non-overlapping elements. Resolution is O(n) time and O(n) output space.

## Modules and development

Independent ESM and CommonJS builds with declarations; no runtime or peer dependencies.
CommonJS: `const { resolveResponsiveLayout } = require('@lp-labs/responsive-design')`.
TypeScript `^5.9.3` and Prettier `^3.6.2` are development-only.
Run `npm run build`, `npm run typecheck`, `npm test`, `npm run format`, and `npm run format:check`.

## Support

If this library is useful to you, consider supporting its maintenance with a [donation via PayPal](https://www.paypal.me/LibinPrasanth).

## Author

Created by [Libin Prasanth](https://www.linkedin.com/in/libinprasanth/). Connect on LinkedIn for updates and discussion.
