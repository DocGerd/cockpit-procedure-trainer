// @vitest-environment jsdom
import { controlWidgets, indicatorWidgets } from '@cpt/panel-kit';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { artworkFixtures } from './art';
import { SIZES } from './context';
import { controlFixtures, indicatorFixtures, samplesOf } from './fixtures';
import type { ControlFixture } from './fixtures';
import { Gallery } from './Gallery';

// Every test mounts the whole gallery, each widget with its own paint servers; under a loaded
// parallel run the default timeout trips on the first, cold render.
vi.setConfig({ testTimeout: 20_000 });

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const select = (parts: Record<string, string>, root: ParentNode = document) => [
  ...root.querySelectorAll<HTMLElement>(
    Object.entries(parts)
      .map(([key, value]) => `[data-gallery-${key}="${value}"]`)
      .join(''),
  ),
];

const liveCells = (fixture: string) => select({ fixture, kind: 'live' });
const liveCell = (fixture: string, size = 'medium') => {
  const [cell] = select({ fixture, kind: 'live', size });
  if (!cell) throw new Error(`No live cell for ${fixture} at ${size}`);
  return cell;
};

function shownLabels(cell: HTMLElement): string[] {
  const labels: string[] = [];
  for (const element of cell.querySelectorAll('[data-current="true"]')) {
    labels.push(element.textContent ?? '');
  }
  for (const radio of cell.querySelectorAll('[role="radio"][aria-checked="true"]')) {
    labels.push(radio.getAttribute('aria-label') ?? '');
  }
  for (const element of cell.querySelectorAll('[aria-describedby]')) {
    const target = document.getElementById(element.getAttribute('aria-describedby') ?? '');
    labels.push(target?.textContent ?? '');
  }
  for (const slider of cell.querySelectorAll('[role="slider"]')) {
    labels.push(slider.getAttribute('aria-valuenow') ?? '');
  }
  return labels;
}

const labelOf = (fixture: ControlFixture, position: string | number) =>
  fixture.labels[String(position)] ?? String(position);

const placardsOf = (fixture: ControlFixture, position: string) => [
  labelOf(fixture, position),
  position.toUpperCase(),
];

describe('registry coverage', () => {
  it('has a fixture for every control and indicator widget, and none for an unknown one', () => {
    const controls = new Set(controlFixtures.map((fixture) => fixture.widget));
    const indicators = new Set(indicatorFixtures.map((fixture) => fixture.widget));
    expect([...controls].sort()).toEqual(Object.keys(controlWidgets).sort());
    expect([...indicators].sort()).toEqual(Object.keys(indicatorWidgets).sort());
  });

  it.each(Object.keys(controlWidgets))('renders the control widget %s', (widget) => {
    render(<Gallery />);
    expect(select({ widget, kind: 'live' }).length).toBeGreaterThanOrEqual(SIZES.length);
  });

  it.each(Object.keys(indicatorWidgets))('renders the indicator widget %s', (widget) => {
    render(<Gallery />);
    expect(select({ widget, kind: 'live' }).length).toBeGreaterThanOrEqual(SIZES.length);
  });

  it('reports no missing fixture', () => {
    render(<Gallery />);
    expect(screen.queryAllByRole('alert')).toEqual([]);
  });
});

describe('every position of every control', () => {
  it.each(controlFixtures.map((fixture) => [fixture.id, fixture] as const))(
    '%s appears once per declared position and shows it',
    (_, fixture) => {
      render(<Gallery />);
      const samples = samplesOf(fixture.control);
      const closed = select({ fixture: fixture.id, kind: 'position', guard: 'closed' });
      expect(closed.map((cell) => cell.dataset['galleryPosition'])).toEqual(samples.map(String));
      samples.forEach((position, index) => {
        const cell = closed[index];
        if (!cell) throw new Error('missing cell');
        const shown = shownLabels(cell);
        const expected =
          typeof position === 'number' ? [String(position)] : placardsOf(fixture, position);
        expect(shown.some((text) => expected.includes(text))).toBe(true);
      });
    },
  );

  it('shows the guarded handle with its guard open at every position', () => {
    render(<Gallery />);
    const fixture = controlFixtures.find((candidate) => candidate.control.kind === 'guarded');
    if (!fixture) throw new Error('no guarded fixture');
    const open = select({ fixture: fixture.id, kind: 'position', guard: 'open' });
    expect(open).toHaveLength(samplesOf(fixture.control).length);
    for (const cell of open) {
      expect(within(cell).getByRole('radiogroup')).toBeTruthy();
    }
  });

  it('leaves the position cells inert so only the live cells take focus', () => {
    render(<Gallery />);
    for (const cell of select({ kind: 'position' })) {
      expect(cell.querySelector('[data-panel-surface]')?.hasAttribute('inert')).toBe(true);
    }
    for (const cell of select({ kind: 'live' })) {
      expect(cell.querySelector('[data-panel-surface]')?.hasAttribute('inert')).toBe(false);
    }
  });
});

describe('position cells', () => {
  it('show a fixed position and do not operate the live state', () => {
    render(<Gallery />);
    const [cell] = select({ fixture: 'toggle-three', kind: 'position', position: 'high' });
    if (!cell) throw new Error('no position cell');
    fireEvent.click(within(cell).getByRole('radio', { name: 'Low' }));
    expect(
      within(liveCell('toggle-three'))
        .getByRole('radio', { checked: true })
        .getAttribute('aria-label'),
    ).toBe('Off');
    expect(within(cell).getByRole('radio', { checked: true }).getAttribute('aria-label')).toBe(
      'High',
    );
  });
});

describe('operable controls', () => {
  const checked = (cell: HTMLElement) =>
    within(cell).getByRole('radio', { checked: true }).getAttribute('aria-label');

  it('moves every live instance of a control when one is operated', () => {
    render(<Gallery />);
    fireEvent.click(within(liveCell('toggle-three', 'large')).getByRole('radio', { name: 'High' }));
    for (const cell of liveCells('toggle-three')) expect(checked(cell)).toBe('High');
  });

  it('springs the key switch back from start on release', () => {
    render(<Gallery />);
    const cell = liveCell('key-switch-spring');
    const start = within(cell).getByRole('radio', { name: 'Start' });
    fireEvent.pointerDown(start, { button: 0 });
    expect(checked(cell)).toBe('Start');
    fireEvent.pointerUp(start);
    expect(checked(cell)).toBe('Both');
  });

  it('holds the push button while pressed', () => {
    render(<Gallery />);
    const button = within(liveCell('push-button')).getByRole('button', { pressed: false });
    fireEvent.pointerDown(button, { button: 0 });
    expect(within(liveCell('push-button')).getByRole('button').getAttribute('aria-pressed')).toBe(
      'true',
    );
    fireEvent.pointerUp(button);
    expect(within(liveCell('push-button')).getByRole('button').getAttribute('aria-pressed')).toBe(
      'false',
    );
  });

  it('pulls the circuit breaker', () => {
    render(<Gallery />);
    fireEvent.click(within(liveCell('circuit-breaker')).getByRole('switch'));
    expect(
      within(liveCell('circuit-breaker')).getByRole('switch').getAttribute('aria-checked'),
    ).toBe('false');
  });

  it('moves the continuous lever from the keyboard', () => {
    render(<Gallery />);
    fireEvent.keyDown(within(liveCell('lever-continuous')).getByRole('slider'), { key: 'End' });
    for (const cell of liveCells('lever-continuous')) {
      expect(within(cell).getByRole('slider').getAttribute('aria-valuenow')).toBe('1');
    }
  });

  it('opens the guard before the guarded handle can be pulled', () => {
    render(<Gallery />);
    const cell = liveCell('guarded-handle');
    expect(within(cell).queryByRole('radiogroup')).toBeNull();
    fireEvent.click(within(cell).getByRole('button', { expanded: false }));
    fireEvent.click(within(liveCell('guarded-handle')).getByRole('radio', { name: 'Pulled' }));
    expect(checked(liveCell('guarded-handle'))).toBe('Pulled');
  });
});

describe('operable indicators', () => {
  it('drives the gauge from its input', () => {
    render(<Gallery />);
    const card = document.querySelector('[data-gallery-card="gauge-airspeed"]') as HTMLElement;
    fireEvent.change(within(card).getByRole('slider', { name: /Airspeed/ }), {
      target: { value: '130' },
    });
    for (const cell of liveCells('gauge-airspeed')) {
      expect(within(cell).getByRole('meter').getAttribute('aria-valuenow')).toBe('130');
    }
  });

  it('lights and darkens the annunciator from its checkbox', () => {
    render(<Gallery />);
    const card = document.querySelector(
      '[data-gallery-card="annunciator-state-labels"]',
    ) as HTMLElement;
    const lit = () =>
      liveCells('annunciator-state-labels').map((cell) =>
        cell.querySelector('[data-widget="annunciator"]')?.getAttribute('data-lit'),
      );
    expect(lit()).toEqual(SIZES.map(() => 'false'));
    fireEvent.click(within(card).getByRole('checkbox'));
    expect(lit()).toEqual(SIZES.map(() => 'true'));
  });

  it('shows the placeholder for invalid options', () => {
    render(<Gallery />);
    expect(liveCell('gauge-invalid').querySelector('[data-placeholder]')).not.toBeNull();
  });

  it('shows every lamp colour lit and dark', () => {
    render(<Gallery />);
    const lamps = select({ fixture: 'annunciator-lamps', kind: 'sample' });
    expect(lamps.map((cell) => cell.dataset['gallerySample'])).toEqual(
      ['amber', 'red', 'green', 'blue', 'white'].flatMap((lamp) => [
        `${lamp}, lit`,
        `${lamp}, dark`,
      ]),
    );
  });
});

describe('panel surface', () => {
  it('draws every widget on a panel surface', () => {
    render(<Gallery />);
    const cells = document.querySelectorAll('[data-gallery-widget]');
    expect(cells.length).toBeGreaterThan(0);
    for (const cell of cells) expect(cell.querySelector('[data-panel-surface]')).not.toBeNull();
  });

  it('keeps the chrome inputs off the panel surface', () => {
    render(<Gallery />);
    for (const input of screen.getAllByRole('radio', { name: /px\)$/ })) {
      expect(input.closest('[data-panel-surface]')).toBeNull();
    }
  });
});

describe('placement sizes', () => {
  it('resizes the matrices with the picker and leaves the live row alone', () => {
    render(<Gallery />);
    const widths = (kind: string) => [
      ...new Set(
        select({ kind }).map((cell) => (cell.firstElementChild as HTMLElement).style.width),
      ),
    ];
    expect(widths('position')).toEqual(['128px']);
    fireEvent.click(screen.getByRole('radio', { name: /^Compact/ }));
    expect(widths('position')).toEqual(['48px']);
    expect(widths('live').sort()).toEqual(SIZES.map((size) => `${size.px}px`).sort());
  });
});

describe('artwork', () => {
  const fixtures = artworkFixtures();

  it.each([...fixtures.controls, ...fixtures.indicators].map((fixture) => [fixture.id] as const))(
    'shows %s at every placement size',
    (id) => {
      render(<Gallery />);
      expect(liveCells(id)).toHaveLength(SIZES.length);
    },
  );

  it('operates an artwork control through the shared state', () => {
    render(<Gallery />);
    const button = within(liveCell('artwork-toggle')).getByRole('button');
    expect(button.getAttribute('aria-label')).toMatch(/: Off$/);
    fireEvent.click(button);
    for (const cell of liveCells('artwork-toggle')) {
      expect(within(cell).getByRole('button').getAttribute('aria-label')).toMatch(/: On$/);
    }
  });

  it('falls back to the generic widget when the artwork fails to load', () => {
    render(<Gallery />);
    const cell = liveCell('artwork-missing');
    expect(cell.querySelector('[data-gallery-fallback]')).toBeNull();
    const face = cell.querySelector('img');
    if (!face) throw new Error('no face image');
    fireEvent.error(face);
    const fallback = liveCell('artwork-missing').querySelector('[data-gallery-fallback]');
    expect(fallback).not.toBeNull();
    expect(within(fallback as HTMLElement).getByRole('radiogroup')).toBeTruthy();
  });
});

describe('legibility', () => {
  function stubLayout() {
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (
      this: Element,
    ) {
      const box = this.closest<HTMLElement>('.gallery-box');
      const side = Number.parseFloat(box?.style.width ?? '0');
      return { width: side, height: side } as DOMRect;
    });
    vi.spyOn(window, 'getComputedStyle').mockImplementation(
      () =>
        ({ fontSize: '12px', getPropertyValue: () => '11px' }) as unknown as CSSStyleDeclaration,
    );
  }

  const count = (size: string) =>
    Number.parseInt(
      document
        .querySelector(`[data-gallery-legibility] [data-gallery-size="${size}"]`)
        ?.textContent?.split(': ')[1] ?? '',
      10,
    );

  it('flags cells whose rendered text is below the smallest type token', () => {
    stubLayout();
    render(<Gallery />);
    expect(count('compact')).toBeGreaterThan(0);
    expect(count('large')).toBe(0);
    const flagged = document.querySelector('.gallery-text[data-small="true"]');
    expect(flagged?.textContent).toMatch(/below 11 px/);
  });

  it('flags nothing when no layout is available', () => {
    render(<Gallery />);
    expect(document.querySelector('.gallery-text')).toBeNull();
    for (const size of SIZES) expect(count(size.id)).toBe(0);
  });
});
