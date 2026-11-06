import responsive = require('@lp-labs/responsive-design');

const result = responsive.resolveResponsiveLayout(
  { width: 100, height: 100 },
  { width: 200, height: 100 },
  [{ id: 'hero', rect: { x: 10, y: 10, width: 80, height: 20 }, horizontal: 'stretch' }],
);
result.elements satisfies responsive.ResolvedElement[];
