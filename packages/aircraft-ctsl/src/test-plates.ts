import viewPanel from './assets/view-panel.svg?raw';

export type Plate = { plate: string; x: number; y: number; w: number; h: number };

/**
 * The corners of a plate outline. Only absolute M, L and Z are read: their points are the outline,
 * so the box they span is exact; any other command throws rather than mis-measure the plate.
 */
export const outlinePoints = (plate: string, d: string): [number, number][] =>
  [...d.matchAll(/([A-Za-z])([^A-Za-z]*)/g)].flatMap(([, command = '', args = '']) => {
    if (command === 'Z' && args.trim() === '') return [];
    const values = args
      .trim()
      .split(/[\s,]+/)
      .map(Number);
    if ((command !== 'M' && command !== 'L') || values.length !== 2 || values.some(Number.isNaN)) {
      throw new Error(`the ${plate} plate outline has "${command}${args}": use absolute M, L, Z`);
    }
    return [[values[0] ?? 0, values[1] ?? 0]];
  });

const plateBox = (tag: string, plate: string, attributes: string): Plate => {
  const number = (name: string) => {
    const value = new RegExp(`\\b${name}="(-?[\\d.]+)"`).exec(attributes)?.[1];
    if (value === undefined) throw new Error(`the ${plate} plate has no ${name}`);
    return Number(value);
  };
  if (tag === 'rect') {
    return { plate, x: number('x'), y: number('y'), w: number('width'), h: number('height') };
  }
  const d = /\bd="([^"]+)"/.exec(attributes)?.[1];
  if (!d) throw new Error(`the ${plate} plate draws no outline`);
  const points = outlinePoints(plate, d);
  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);
  const [x, y] = [Math.min(...xs), Math.min(...ys)];
  return { plate, x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
};

/** The three upper plates of the panel art, left to right, as the boxes their outlines span. */
export const upperPlates = (() => {
  const plates = [...viewPanel.matchAll(/<(rect|path) data-plate="(\w+)"([^>]*)>/g)]
    .map(([, tag = '', plate = '', attributes = '']) => plateBox(tag, plate, attributes))
    .sort((a, b) => a.x - b.x);
  const [left, centre, right] = plates;
  if (plates.length !== 3 || !left || !centre || !right) {
    throw new Error(`expected three upper plates in the panel art, found ${plates.length}`);
  }
  const order = plates.map(({ plate }) => plate).join();
  if (order !== 'left,centre,right') throw new Error(`the panel art orders its plates ${order}`);
  return { left, centre, right };
})();
