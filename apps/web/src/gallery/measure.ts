export function readTokenPx(name: string): number | undefined {
  const value = Number.parseFloat(
    getComputedStyle(document.documentElement).getPropertyValue(name),
  );
  return Number.isFinite(value) ? value : undefined;
}

function renderedScale(svg: SVGSVGElement): number | undefined {
  const [, , width, height] = (svg.getAttribute('viewBox') ?? '').split(/[\s,]+/).map(Number);
  const box = svg.getBoundingClientRect();
  if (!width || !height || box.width === 0 || box.height === 0) return undefined;
  return Math.min(box.width / width, box.height / height);
}

export function smallestTextPx(root: Element): number | undefined {
  let smallest: number | undefined;
  for (const text of root.querySelectorAll('svg text')) {
    const svg = text.closest('svg');
    const scale = svg ? renderedScale(svg) : undefined;
    const size = Number.parseFloat(getComputedStyle(text).fontSize);
    if (scale === undefined || !Number.isFinite(size)) continue;
    const rendered = size * scale;
    if (smallest === undefined || rendered < smallest) smallest = rendered;
  }
  return smallest === undefined ? undefined : Math.round(smallest * 10) / 10;
}
