const TOKEN = /^var\(--panel-[a-z0-9-]+\)$/;
const REFERENCE = /^url\("?#([^")]+)"?\)$/;

function serverProblems(root: ParentNode, id: string): string[] {
  const server = root.querySelector(`[id="${id}"]`);
  if (server === null) return [`url(#${id}) names no paint server`];
  const tag = server.tagName.toLowerCase();
  if (tag === 'lineargradient' || tag === 'radialgradient') {
    const stops = [...server.querySelectorAll('stop')];
    if (stops.length === 0) return [`${id} has no stops`];
    return stops
      .filter((stop) => !TOKEN.test(stop.style.stopColor))
      .map((stop) => `${id} stop ${stop.style.stopColor || stop.getAttribute('stop-color')}`);
  }
  if (tag === 'pattern') {
    return server.children.length === 0 ? [`${id} is an empty pattern`] : [];
  }
  return [`${id} is a ${tag}, not a gradient or pattern`];
}

// A paint server in box units on a shape with no width or height paints nothing.
const flatLine = (node: Element) =>
  node.tagName.toLowerCase() === 'line' &&
  (node.getAttribute('x1') === node.getAttribute('x2') ||
    node.getAttribute('y1') === node.getAttribute('y2'));

const boxUnits = (root: ParentNode, id: string) => {
  const server = root.querySelector(`[id="${id}"]`);
  const units = server?.getAttribute(
    server.tagName.toLowerCase() === 'pattern' ? 'patternUnits' : 'gradientUnits',
  );
  return server !== null && units !== 'userSpaceOnUse';
};

/**
 * Every fill and stroke inside the widget's SVG is a panel token, or a `url(#…)` to a gradient whose
 * stops are panel tokens or to a pattern whose own shapes pass the same check; no filter anywhere.
 */
export function paintProblems(root: ParentNode): string[] {
  const problems: string[] = [];
  if (root.querySelector('filter, [filter]')) problems.push('a filter');
  for (const node of root.querySelectorAll<SVGElement>('svg *')) {
    if (node.style.filter) problems.push(`${node.tagName} filter style`);
    const paints = [
      node.style.fill,
      node.style.stroke,
      node.getAttribute('fill'),
      node.getAttribute('stroke'),
    ];
    for (const paint of paints) {
      if (!paint || paint === 'none') continue;
      const reference = REFERENCE.exec(paint)?.[1];
      if (reference !== undefined) {
        problems.push(...serverProblems(root, reference));
        if (flatLine(node) && boxUnits(root, reference)) {
          problems.push(`straight ${node.tagName} paints the box-unit url(#${reference})`);
        }
      } else if (!TOKEN.test(paint)) problems.push(`${node.tagName} paints ${paint}`);
    }
  }
  return problems;
}

/** Material ids come from useId and differ per mount; everything else must follow from the props. */
export const normalisedMarkup = (container: Element) =>
  [...container.querySelectorAll('[id]')].reduce(
    (html, node, index) => html.replaceAll(node.id, `id-${index}`),
    container.innerHTML,
  );
