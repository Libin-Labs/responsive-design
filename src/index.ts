export interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type AxisAnchor = 'start' | 'end' | 'center' | 'stretch' | 'scale';

export interface ResponsiveElement {
  id: string;
  rect: Rectangle;
  horizontal?: AxisAnchor;
  vertical?: AxisAnchor;
  minWidth?: number;
  maxWidth?: number;
  minHeight?: number;
  maxHeight?: number;
}

export interface Overflow {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface ResolvedElement {
  id: string;
  rect: Rectangle;
  overflow: Overflow;
}

export interface ResponsiveLayout {
  width: number;
  height: number;
  elements: ResolvedElement[];
  overflowingIds: string[];
}

const HARD_ELEMENTS = 2_000;
const MAX_DIMENSION = 1_000_000;
const MAX_MAGNITUDE = 1_000_000_000;

function isPlain(value: unknown): boolean {
  return Boolean(
    value &&
    typeof value === 'object' &&
    (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null),
  );
}

function assertFields(
  value: unknown,
  name: string,
  allowed: readonly string[],
  required: readonly string[],
): void {
  if (!isPlain(value)) throw new TypeError(`${name} must be a plain record.`);
  const object = value as object;
  for (const key of Reflect.ownKeys(object)) {
    const descriptor = Object.getOwnPropertyDescriptor(object, key);
    if (
      typeof key !== 'string' ||
      !allowed.includes(key) ||
      !descriptor?.enumerable ||
      !('value' in descriptor)
    ) {
      throw new TypeError(`${name} has an unsupported field or accessor.`);
    }
  }
  if (required.some((key) => !Object.hasOwn(object, key))) {
    throw new TypeError(`${name} is missing a required field.`);
  }
}

function record(value: unknown, name: string): asserts value is Record<string, unknown> {
  if (!isPlain(value)) throw new TypeError(`${name} must be a plain record.`);
}

function finite(value: unknown, name: string, maximum = MAX_MAGNITUDE): asserts value is number {
  if (typeof value !== 'number' || !Number.isFinite(value) || Math.abs(value) > maximum) {
    throw new RangeError(`${name} must be finite and within ±${maximum}.`);
  }
}

function rectangle(value: unknown, name: string): Rectangle {
  record(value, name);
  const keys = Reflect.ownKeys(value);
  if (keys.some((key) => typeof key !== 'string' || !['x', 'y', 'width', 'height'].includes(key))) {
    throw new TypeError(`${name} has unsupported fields.`);
  }
  for (const key of ['x', 'y', 'width', 'height']) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || !descriptor.enumerable || !('value' in descriptor)) {
      throw new TypeError(`${name}.${key} must be an enumerable data field.`);
    }
    finite(descriptor.value, `${name}.${key}`);
  }
  if ((value.width as number) <= 0 || (value.height as number) <= 0)
    throw new RangeError(`${name} dimensions must be positive.`);
  return {
    x: value.x as number,
    y: value.y as number,
    width: value.width as number,
    height: value.height as number,
  };
}

function resolveAxis(
  origin: number,
  size: number,
  baseSize: number,
  targetSize: number,
  anchor: AxisAnchor,
): [number, number] {
  switch (anchor) {
    case 'start':
      return [origin, size];
    case 'end':
      return [targetSize - (baseSize - origin - size) - size, size];
    case 'center':
      return [(targetSize - size) / 2 + (origin - (baseSize - size) / 2), size];
    case 'stretch':
      return [origin, Math.max(0, targetSize - origin - (baseSize - origin - size))];
    case 'scale': {
      const ratio = targetSize / baseSize;
      return [origin * ratio, size * ratio];
    }
  }
}

export function resolveResponsiveLayout(
  base: { width: number; height: number },
  target: { width: number; height: number },
  elements: readonly ResponsiveElement[],
  maxElements = 500,
): ResponsiveLayout {
  assertFields(base, 'Base canvas', ['width', 'height'], ['width', 'height']);
  assertFields(target, 'Target canvas', ['width', 'height'], ['width', 'height']);
  finite(base.width, 'Base width', MAX_DIMENSION);
  finite(base.height, 'Base height', MAX_DIMENSION);
  finite(target.width, 'Target width', MAX_DIMENSION);
  finite(target.height, 'Target height', MAX_DIMENSION);
  if ([base.width, base.height, target.width, target.height].some((value) => value <= 0)) {
    throw new RangeError('Canvas dimensions must be positive.');
  }
  if (
    !Array.isArray(elements) ||
    elements.length > maxElements ||
    elements.length > HARD_ELEMENTS
  ) {
    throw new RangeError(
      `Elements must contain at most ${Math.min(maxElements, HARD_ELEMENTS)} entries.`,
    );
  }
  if (!Number.isSafeInteger(maxElements) || maxElements < 1 || maxElements > HARD_ELEMENTS) {
    throw new RangeError(`maxElements must be an integer from 1 to ${HARD_ELEMENTS}.`);
  }
  const ids = new Set<string>();
  const resolved: ResolvedElement[] = elements.map((element) => {
    assertFields(
      element,
      'Element',
      ['id', 'rect', 'horizontal', 'vertical', 'minWidth', 'maxWidth', 'minHeight', 'maxHeight'],
      ['id', 'rect'],
    );
    const { id } = element;
    if (
      typeof id !== 'string' ||
      !/^[A-Za-z][\w.-]{0,127}$/.test(id) ||
      ['constructor', 'prototype', '__proto__'].includes(id)
    ) {
      throw new TypeError('Element id must be a safe identifier up to 128 characters.');
    }
    if (ids.has(id)) throw new TypeError(`Duplicate element id: ${id}.`);
    ids.add(id);
    const rect = rectangle(element.rect, `Element ${id} rectangle`);
    if (
      rect.x < 0 ||
      rect.y < 0 ||
      rect.x + rect.width > base.width ||
      rect.y + rect.height > base.height
    ) {
      throw new RangeError(`Element ${id} must fit inside the base canvas.`);
    }
    const horizontal = element.horizontal ?? 'start';
    const vertical = element.vertical ?? 'start';
    if (
      !['start', 'end', 'center', 'stretch', 'scale'].includes(horizontal) ||
      !['start', 'end', 'center', 'stretch', 'scale'].includes(vertical)
    ) {
      throw new TypeError(`Element ${id} has an unsupported anchor.`);
    }
    const [x, rawWidth] = resolveAxis(rect.x, rect.width, base.width, target.width, horizontal);
    const [y, rawHeight] = resolveAxis(rect.y, rect.height, base.height, target.height, vertical);
    finite(x, `${id} resolved x`);
    finite(y, `${id} resolved y`);
    finite(rawWidth, `${id} resolved width`);
    finite(rawHeight, `${id} resolved height`);
    for (const [name, value] of [
      ['minWidth', element.minWidth],
      ['maxWidth', element.maxWidth],
      ['minHeight', element.minHeight],
      ['maxHeight', element.maxHeight],
    ] as const) {
      if (value !== undefined) {
        finite(value, `${id}.${name}`, MAX_DIMENSION);
        if (value < 0) throw new RangeError(`${id}.${name} cannot be negative.`);
      }
    }
    if (
      element.minWidth !== undefined &&
      element.maxWidth !== undefined &&
      element.minWidth > element.maxWidth
    ) {
      throw new RangeError(`${id} minimum width exceeds maximum width.`);
    }
    if (
      element.minHeight !== undefined &&
      element.maxHeight !== undefined &&
      element.minHeight > element.maxHeight
    ) {
      throw new RangeError(`${id} minimum height exceeds maximum height.`);
    }
    const width = Math.min(
      element.maxWidth ?? MAX_DIMENSION,
      Math.max(element.minWidth ?? 0, rawWidth),
    );
    const height = Math.min(
      element.maxHeight ?? MAX_DIMENSION,
      Math.max(element.minHeight ?? 0, rawHeight),
    );
    const overflow = {
      left: Math.max(0, -x),
      top: Math.max(0, -y),
      right: Math.max(0, x + width - target.width),
      bottom: Math.max(0, y + height - target.height),
    };
    return { id, rect: { x, y, width, height }, overflow };
  });
  return {
    width: target.width,
    height: target.height,
    elements: resolved,
    overflowingIds: resolved
      .filter(({ overflow }) => Object.values(overflow).some((amount) => amount > 0))
      .map(({ id }) => id),
  };
}
