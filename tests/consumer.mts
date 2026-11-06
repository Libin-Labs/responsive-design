import { resolveResponsiveLayout, type ResponsiveElement } from '@lp-labs/responsive-design';

const element: ResponsiveElement = {
  id: 'hero',
  rect: { x: 10, y: 10, width: 80, height: 20 },
  horizontal: 'stretch',
};
const result = resolveResponsiveLayout({ width: 100, height: 100 }, { width: 200, height: 100 }, [
  element,
]);
result.overflowingIds satisfies string[];
