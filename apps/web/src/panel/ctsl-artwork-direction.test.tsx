// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ControlDefinition, ControlPosition, Point } from '@cpt/core';
import { resolveControl } from '@cpt/panel-kit';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { aircraftRegistry } from '../aircraft-registry';

const ctsl = aircraftRegistry.find((aircraft) => aircraft.id === 'ctsl');
if (!ctsl) throw new Error('The CTSL is not registered');

type Drawn = {
  id: string;
  control: ControlDefinition;
  face: string;
  path: readonly Point[] | undefined;
  steps: readonly string[];
};

const faceSvg = (url: string) =>
  url.startsWith('data:')
    ? Buffer.from(url.slice(url.indexOf('base64,') + 7), 'base64').toString('utf8')
    : readFileSync(join(process.cwd(), new URL(url, 'http://localhost').pathname), 'utf8');

const drawn: Drawn[] = Object.entries(ctsl.controls).flatMap(([id, control]) => {
  const { appearance, positions } = control;
  if (!appearance || !('artwork' in appearance) || typeof positions === 'string') return [];
  const springs = control.kind === 'rotary' ? Object.keys(control.springBack ?? {}) : [];
  const steps = positions.filter((position) => !springs.includes(position));
  const { moving, face } = appearance.artwork;
  return [{ id, control, face, steps, path: moving.type === 'travel' ? moving.path : undefined }];
});
const sliders = drawn.filter(({ steps }) => steps.length > 2);

const legends: Record<string, Record<string, string>> = {
  throttle: { idle: 'IDLE', full: 'FULL' },
  trim: { 'nose-down': 'NOSE DN', neutral: 'NEUTRAL', 'nose-up': 'NOSE UP' },
  flapSelector: {
    'override-up': 'UP',
    '-12': '-12',
    '0': '0',
    '15': '15',
    '30': '30',
    '35': '35',
    'override-down': 'DN',
  },
  ignition: { off: 'OFF', left: 'L', right: 'R', both: 'BOTH' },
};

const printedAt = (svg: string, label: string): Point => {
  const escaped = label.replace(/[-.*+?^${}()|[\]\\]/g, '\\$&');
  const match = new RegExp(`<text x="([\\d.]+)" y="([\\d.]+)"[^>]*>${escaped}</text>`).exec(svg);
  if (!match) throw new Error(`no printed legend ${label}`);
  return { x: Number(match[1]), y: Number(match[2]) };
};

const sizeOf = (svg: string) => {
  const match = /<svg[^>]* width="(\d+)" height="(\d+)"/.exec(svg);
  return { width: Number(match?.[1]), height: Number(match?.[2]) };
};

let face = { width: 0, height: 0 };

beforeEach(() => {
  vi.spyOn(HTMLImageElement.prototype, 'naturalWidth', 'get').mockImplementation(() => face.width);
  vi.spyOn(HTMLImageElement.prototype, 'naturalHeight', 'get').mockImplementation(
    () => face.height,
  );
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(
    () => ({ left: 0, top: 0, ...face }) as DOMRect,
  );
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function mount({ control, face: url }: Drawn, position: ControlPosition) {
  face = sizeOf(faceSvg(url));
  const { widget: Widget } = resolveControl(control);
  const onSet = vi.fn<(position: ControlPosition) => void>();
  render(
    <Widget
      control={control}
      position={position}
      guardOpen={false}
      label="Control"
      positionLabels={{}}
      onSet={onSet}
      onPress={vi.fn()}
      onRelease={vi.fn()}
      onOpenGuard={vi.fn()}
      onCloseGuard={vi.fn()}
    />,
  );
  fireEvent.load(document.querySelector('img') as Element);
  return onSet;
}

const slider = () => screen.getByRole('slider');
const tapAt = ({ x, y }: Point) => fireEvent.click(slider(), { detail: 1, clientX: x, clientY: y });

describe('CTSL notched artwork controls', () => {
  it('covers every stepped slider the aircraft draws', () => {
    expect(sliders.map(({ id }) => id).sort()).toEqual([
      'flapSelector',
      'ignition',
      'throttle',
      'trim',
    ]);
  });

  it('draws every other control as a two-position button, which has no direction', () => {
    for (const entry of drawn.filter(({ steps }) => steps.length <= 2)) {
      mount(entry, entry.steps[0] ?? '');
      expect(screen.queryByRole('slider'), entry.id).toBeNull();
      cleanup();
    }
  });

  it('prints the throttle as the aircraft does: its title, FULL forward and IDLE aft', () => {
    const throttle = drawn.find(({ id }) => id === 'throttle');
    if (!throttle) throw new Error('the CTSL draws no throttle');
    const svg = faceSvg(throttle.face);
    const printed = [...svg.matchAll(/<text\b[^>]*>([^<]*)<\/text>/g)].map(([, text]) => text);
    expect(printed).toEqual(['THROTTLE', 'FULL', 'IDLE']);
    const { appearance } = throttle.control;
    expect(appearance && 'artwork' in appearance ? appearance.artwork.lettering : []).toEqual([
      'THROTTLE',
      'FULL',
      'IDLE',
    ]);
    expect(svg.match(/<line\b/g)).toHaveLength(2);
  });

  it('rolls the trim wheel from a tap a touch target in from either end of its rim', () => {
    const entry = sliders.find(({ id }) => id === 'trim');
    if (!entry) throw new Error('the CTSL draws no trim wheel');
    const rim =
      /<rect x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)"[^>]*fill="url\(#w\)"/.exec(
        faceSvg(entry.face),
      );
    if (!rim) throw new Error('the trim face draws no wheel rim');
    const [x, y, width, height] = rim.slice(1).map(Number) as [number, number, number, number];
    const { console: consoleView } = ctsl.views;
    const floor = ctsl.cockpit?.views.console?.minWidth;
    if (!consoleView?.size || !floor) throw new Error('the CTSL console has no floor');
    // The web app's --size-target token, in face units at the console's floor width.
    const target = (44 * consoleView.size.width) / floor;

    const rollFrom = (at: Point) => {
      const onSet = mount(entry, 'neutral');
      tapAt(at);
      const set = onSet.mock.calls[0]?.[0];
      cleanup();
      return set;
    };
    expect(rollFrom({ x: x + target, y: y + height / 2 })).toBe('nose-down');
    expect(rollFrom({ x: x + width - target, y: y + height / 2 })).toBe('nose-up');
  });

  it.each(sliders.map((entry) => [entry.id, entry] as const))(
    '%s: tap, arrow keys and printed legend all move toward the top or right',
    (id, entry) => {
      const { steps, path } = entry;
      const here = steps[Math.floor(steps.length / 2)] ?? '';
      const svg = faceSvg(entry.face);
      const printed = (position: string) => printedAt(svg, legends[id]?.[position] ?? '');
      const bounds = sizeOf(svg);

      const probe = (at: Point | undefined, key: string): string | undefined => {
        const onSet = mount(entry, here);
        if (at) tapAt(at);
        else fireEvent.keyDown(slider(), { key });
        const set = onSet.mock.calls[0]?.[0];
        cleanup();
        return set === undefined ? undefined : String(set);
      };

      let forward: Point;
      let backward: Point;
      // A path runs along its longer axis, as panel-kit reads it; without one the taps go left or right.
      const ends = path ? ([path[0], path[path.length - 1]] as [Point, Point]) : undefined;
      const vertical =
        ends !== undefined && Math.abs(ends[1].y - ends[0].y) >= Math.abs(ends[1].x - ends[0].x);
      if (ends) {
        const [first, last] = ends;
        const lastAhead = vertical ? last.y < first.y : last.x > first.x;
        [forward, backward] = lastAhead ? [last, first] : [first, last];
      } else {
        forward = { x: bounds.width * 0.95, y: bounds.height / 2 };
        backward = { x: bounds.width * 0.05, y: bounds.height / 2 };
      }

      const up = probe(undefined, 'ArrowUp');
      const right = probe(undefined, 'ArrowRight');
      const tapForward = probe(forward, '');
      expect(up, 'ArrowUp').toBeDefined();
      expect([right, tapForward]).toEqual([up, up]);

      const down = probe(undefined, 'ArrowDown');
      const left = probe(undefined, 'ArrowLeft');
      const tapBackward = probe(backward, '');
      expect(down, 'ArrowDown').toBeDefined();
      expect([left, tapBackward]).toEqual([down, down]);

      const now = (position: string) => {
        mount(entry, position);
        const value = Number(slider().getAttribute('aria-valuenow'));
        cleanup();
        return value;
      };
      expect(now(up ?? '')).toBeGreaterThan(now(here));
      expect(now(down ?? '')).toBeLessThan(now(here));

      // Some stops print no legend (the throttle's middle stops), so compare the outermost printed ones.
      const marked = steps
        .filter((position) => legends[id]?.[position] !== undefined)
        .map((position) => ({ position, value: now(position) }))
        .sort((a, b) => a.value - b.value);
      const [lowest, highest] = [marked[0]?.position ?? '', marked.at(-1)?.position ?? ''];
      const [low, high] = [printed(lowest), printed(highest)];
      if (vertical) expect(high.y).toBeLessThan(low.y);
      else expect(high.x).toBeGreaterThan(low.x);
    },
  );
});
