import type { ControlDefinition, IndicatorValue, JsonObject, Text } from '@cpt/core';
import type { Artwork } from '@cpt/panel-kit';

const text = (name: string): Text => ({ de: name, en: name });

function panelColours(): (name: string) => string {
  const style = getComputedStyle(document.documentElement);
  return (name) => style.getPropertyValue(`--panel-${name}`).trim();
}

function svgUri(width: number, height: number, body: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">${body}</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export type ArtworkControlFixture = {
  id: string;
  title: string;
  control: ControlDefinition;
  labels: Readonly<Record<string, string>>;
  artwork: Artwork;
};

export type ArtworkIndicatorFixture = {
  id: string;
  title: string;
  label: string;
  artwork: Artwork;
  initial: IndicatorValue;
  input: { type: 'range'; min: number; max: number; step: number } | { type: 'checkbox' };
  fallbackOptions: JsonObject;
};

const BROKEN = 'data:image/png;base64,AAAA';

export function artworkFixtures(): {
  controls: ArtworkControlFixture[];
  indicators: ArtworkIndicatorFixture[];
} {
  const colour = panelColours();

  const dialFace = () => {
    const ticks = Array.from({ length: 9 }, (_, index) => {
      const angle = ((-120 + index * 30) * Math.PI) / 180;
      const [sin, cos] = [Math.sin(angle), Math.cos(angle)];
      return `<line x1="${100 + 70 * sin}" y1="${100 - 70 * cos}" x2="${100 + 84 * sin}" y2="${100 - 84 * cos}" stroke="${colour('legend-muted')}" stroke-width="4"/>`;
    }).join('');
    return svgUri(
      200,
      200,
      `<circle cx="100" cy="100" r="96" fill="${colour('bezel-dark')}"/><circle cx="100" cy="100" r="88" fill="${colour('dial')}"/>${ticks}`,
    );
  };

  const needle = svgUri(
    200,
    200,
    `<line x1="100" y1="100" x2="100" y2="28" stroke="${colour('needle')}" stroke-width="5" stroke-linecap="round"/><circle cx="100" cy="100" r="9" fill="${colour('cap')}"/>`,
  );

  const lampFace = svgUri(
    200,
    100,
    `<rect x="2" y="2" width="196" height="96" rx="14" fill="${colour('bezel-dark')}" stroke="${colour('bezel')}" stroke-width="4"/>`,
  );
  const lamp = (fill: string) =>
    svgUri(200, 100, `<rect x="16" y="16" width="168" height="68" rx="8" fill="${fill}"/>`);

  const toggleFace = svgUri(
    120,
    200,
    `<rect x="4" y="4" width="112" height="192" rx="20" fill="${colour('bezel-dark')}"/><circle cx="60" cy="100" r="26" fill="${colour('bezel')}"/>`,
  );
  const toggleLever = (tipY: number) =>
    svgUri(
      120,
      200,
      `<line x1="60" y1="100" x2="60" y2="${tipY}" stroke="${colour('cap-light')}" stroke-width="12" stroke-linecap="round"/><circle cx="60" cy="${tipY}" r="16" fill="${colour('cap')}"/>`,
    );

  const buttonFace = svgUri(
    160,
    160,
    `<circle cx="80" cy="80" r="76" fill="${colour('bezel-dark')}"/><circle cx="80" cy="80" r="64" fill="${colour('bezel')}"/>`,
  );
  const buttonCap = (radius: number, fill: string) =>
    svgUri(160, 160, `<circle cx="80" cy="80" r="${radius}" fill="${fill}"/>`);

  const slotFace = svgUri(
    100,
    220,
    `<rect x="4" y="4" width="92" height="212" rx="16" fill="${colour('bezel-dark')}"/><rect x="42" y="24" width="16" height="172" rx="8" fill="${colour('face')}"/>`,
  );
  const slotKnob = svgUri(
    100,
    220,
    `<rect x="20" y="176" width="60" height="28" rx="10" fill="${colour('cap-light')}"/>`,
  );

  const toggle: ControlDefinition = {
    kind: 'toggle',
    name: text('Artwork toggle'),
    description: text('Artwork toggle'),
    positions: ['off', 'on'],
    initial: 'off',
  };

  return {
    controls: [
      {
        id: 'artwork-toggle',
        title: 'Artwork toggle, one image per position',
        control: toggle,
        labels: { off: 'Off', on: 'On' },
        artwork: {
          face: toggleFace,
          moving: { type: 'positions', images: { off: toggleLever(150), on: toggleLever(50) } },
        },
      },
      {
        id: 'artwork-button',
        title: 'Artwork push button',
        control: {
          kind: 'momentary',
          name: text('Artwork button'),
          description: text('Artwork button'),
          positions: ['released', 'held'],
          initial: 'released',
        },
        labels: { released: 'Released', held: 'Held' },
        artwork: {
          face: buttonFace,
          moving: {
            type: 'positions',
            images: {
              released: buttonCap(52, colour('cap-light')),
              held: buttonCap(48, colour('cap')),
            },
          },
        },
      },
      {
        id: 'artwork-lever',
        title: 'Artwork lever travelling along a path',
        control: {
          kind: 'lever',
          name: text('Artwork lever'),
          description: text('Artwork lever'),
          positions: 'continuous',
          initial: 0,
        },
        labels: {},
        artwork: {
          face: slotFace,
          moving: {
            type: 'travel',
            image: slotKnob,
            path: [
              { x: 50, y: 190 },
              { x: 50, y: 30 },
            ],
          },
        },
      },
      {
        id: 'artwork-missing',
        title: 'Artwork that fails to load falls back to the generic widget',
        control: toggle,
        labels: { off: 'Off', on: 'On' },
        artwork: {
          face: BROKEN,
          moving: { type: 'positions', images: { off: BROKEN, on: BROKEN } },
        },
      },
    ],
    indicators: [
      {
        id: 'artwork-needle',
        title: 'Artwork gauge with a rotating needle',
        label: 'Artwork gauge',
        artwork: {
          face: dialFace(),
          moving: {
            type: 'needle',
            image: needle,
            pivot: { x: 100, y: 100 },
            angleRange: { min: -120, max: 120 },
            valueRange: { min: 0, max: 100 },
          },
        },
        initial: 50,
        input: { type: 'range', min: 0, max: 100, step: 1 },
        fallbackOptions: {},
      },
      {
        id: 'artwork-lamp',
        title: 'Artwork lamp, one image per state',
        label: 'Artwork lamp',
        artwork: {
          face: lampFace,
          moving: {
            type: 'positions',
            images: { true: lamp(colour('lamp-amber')), false: lamp(colour('lamp-off')) },
          },
        },
        initial: true,
        input: { type: 'checkbox' },
        fallbackOptions: {},
      },
    ],
  };
}
