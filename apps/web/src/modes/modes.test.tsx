// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { Aircraft } from '@cpt/core';
import { act, cleanup, fireEvent, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithLanguage } from '../i18n/test-utils';
import type { CockpitLayoutChoice } from '../panel/cockpit-layout';
import { PanelArea } from '../panel/PanelArea';
import { TrainerProvider, useTrainer } from '../trainer';
import type { Mode, Trainer } from '../trainer';
import { ModeControl } from './ModeControl';
import { targetInstall } from './target';
import { fixture } from './test-aircraft';

const dockState = vi.hoisted(() => ({ withDock: false }));

vi.mock('../aircraft-registry', async () => {
  const { fixture } = await import('./test-aircraft');
  const cell = (x: number, y: number, w: number, h: number) => ({
    rect: { x, y, w, h },
    minWidth: 100,
  });
  const docked = {
    ...fixture,
    cockpit: {
      size: { width: 1000, height: 600 },
      views: { main: cell(0, 0, 600, 400), console: cell(600, 0, 400, 400) },
      dock: cell(0, 400, 1000, 200),
    },
  } as unknown as Aircraft;
  return {
    get aircraftRegistry() {
      return [dockState.withDock ? docked : fixture];
    },
  };
});

vi.mock('../device-registry', async (importOriginal) => {
  const { radio, radioEntry, RadioScreen } = await import('./test-aircraft');
  return {
    ...(await importOriginal<object>()),
    deviceRegistry: [radio],
    deviceScreens: { 'modes-radio': RadioScreen },
    deviceEntries: { 'modes-radio': radioEntry },
  };
});

let trainer: Trainer;
function Probe() {
  trainer = useTrainer();
  return null;
}

function renderTrainer(
  language: 'de' | 'en' = 'en',
  layout: CockpitLayoutChoice = { kind: 'tabs' },
) {
  return renderWithLanguage(
    <TrainerProvider>
      <Probe />
      <ModeControl />
      <PanelArea layout={layout} />
    </TrainerProvider>,
    { language },
  );
}

function start(procedureId: string, mode: Mode) {
  act(() => {
    trainer.setMode(mode);
    trainer.startProcedure(procedureId);
  });
}

function enterExplore() {
  act(() => {
    trainer.setMode('explore');
  });
}

let reducedMotion = false;
beforeEach(() => {
  reducedMotion = false;
  dockState.withDock = false;
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      get matches() {
        return query === '(prefers-reduced-motion: reduce)' && reducedMotion;
      },
      media: query,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    })),
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const placement = (id: string) => document.querySelector<HTMLElement>(`[data-placement="${id}"]`);
const outline = () => document.querySelector<HTMLElement>('[data-outline]');
const boxOf = (element: HTMLElement | null) => {
  const style = element?.style;
  return { left: style?.left, top: style?.top, width: style?.width, height: style?.height };
};
const percent = (part: number, whole: number) => `${(part / whole) * 100}%`;
const selectedTab = () => screen.getByRole('tab', { selected: true }).textContent;
const modeButton = (name: string) =>
  name === 'Free explore'
    ? screen.getByRole('button', { name })
    : within(screen.getByRole('group', { name: 'Mode' })).getByRole('button', { name });
const hit = (id: string) => {
  const found = document.querySelector<HTMLElement>(`[data-hit="${id}"]`);
  if (!found) throw new Error(`no hit area for ${id}`);
  return found;
};
const radio = (control: string, position: string) =>
  within(screen.getByRole('radiogroup', { name: control })).getByRole('radio', { name: position });

describe('ModeControl', () => {
  it('offers Guided and Practice as segments and Free explore as a separate button', () => {
    renderTrainer();
    expect(
      within(screen.getByRole('group', { name: 'Mode' }))
        .getAllByRole('button')
        .map((button) => [button.textContent, button.getAttribute('aria-pressed')]),
    ).toEqual([
      ['Guided', 'true'],
      ['Practice', 'false'],
    ]);
    expect(screen.getByRole('button', { name: 'Free explore' }).getAttribute('aria-pressed')).toBe(
      'false',
    );
  });

  it('marks Free explore instead of a segment while exploring', () => {
    renderTrainer();
    enterExplore();
    expect(modeButton('Free explore').getAttribute('aria-pressed')).toBe('true');
    expect(modeButton('Guided').getAttribute('aria-pressed')).toBe('false');
    expect(modeButton('Practice').getAttribute('aria-pressed')).toBe('false');
  });

  it('says live feedback is on when Practice switches to Guided mid-run', async () => {
    renderTrainer();
    start('start', 'practice');
    expect(screen.queryByRole('status')).toBeNull();
    await userEvent.click(modeButton('Guided'));
    expect(screen.getByRole('status').textContent).toBe(
      'Guided is on: the next control is highlighted and deviations show at once.',
    );
    expect(trainer.procedureId).toBe('start');
  });

  it('says nothing for Guided to Practice or when no procedure runs', async () => {
    renderTrainer();
    start('start', 'guided');
    await userEvent.click(modeButton('Practice'));
    expect(screen.queryByRole('status')).toBeNull();
    act(() => {
      trainer.backToPicker();
    });
    await userEvent.click(modeButton('Guided'));
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('drops the notice when the mode changes again or the run ends', async () => {
    renderTrainer();
    start('start', 'practice');
    await userEvent.click(modeButton('Guided'));
    await userEvent.click(modeButton('Practice'));
    expect(screen.queryByRole('status')).toBeNull();
    await userEvent.click(modeButton('Guided'));
    expect(screen.getByRole('status')).toBeDefined();
    act(() => {
      trainer.backToPicker();
    });
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('lets the notice go by itself', () => {
    vi.useFakeTimers();
    try {
      renderTrainer();
      start('start', 'practice');
      fireEvent.click(modeButton('Guided'));
      expect(screen.getByRole('status')).toBeDefined();
      act(() => {
        vi.advanceTimersByTime(60_000);
      });
      expect(screen.queryByRole('status')).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it('speaks the notice in German', async () => {
    renderTrainer('de');
    start('start', 'practice');
    await userEvent.click(screen.getByRole('button', { name: 'Geführt' }));
    expect(screen.getByRole('status').textContent).toBe(
      'Geführt ist an: das nächste Bedienelement wird hervorgehoben, Abweichungen erscheinen sofort.',
    );
  });

  it('switches between Guided and Practice and keeps the procedure', async () => {
    renderTrainer();
    start('start', 'guided');
    await userEvent.click(modeButton('Practice'));
    expect(trainer.mode).toBe('practice');
    expect(trainer.procedureId).toBe('start');
    expect(modeButton('Practice').getAttribute('aria-pressed')).toBe('true');
    await userEvent.click(modeButton('Guided'));
    expect(trainer.mode).toBe('guided');
    expect(trainer.procedureId).toBe('start');
  });

  it('enters Free explore without asking when no procedure runs', async () => {
    renderTrainer();
    await userEvent.click(modeButton('Free explore'));
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(trainer.mode).toBe('explore');
  });

  it('asks before Free explore ends a running procedure', async () => {
    renderTrainer();
    start('start', 'practice');
    act(() => trainer.session.set('master', 'on'));

    await userEvent.click(modeButton('Free explore'));
    const dialog = screen.getByRole('alertdialog', { name: 'Switch to Free explore?' });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(trainer.mode).toBe('practice');
    expect(trainer.procedureId).toBe('start');

    await userEvent.click(modeButton('Free explore'));
    await userEvent.click(
      within(screen.getByRole('alertdialog')).getByRole('button', {
        name: 'Switch to Free explore',
      }),
    );
    expect(trainer.mode).toBe('explore');
    expect(trainer.procedureId).toBeUndefined();
  });

  it('names the progress Free explore would end', async () => {
    renderTrainer();
    start('start', 'practice');
    act(() => trainer.session.set('master', 'on'));
    await userEvent.click(modeButton('Free explore'));
    expect(screen.getByRole('alertdialog').textContent).toContain(
      'Progress lost: 1 of 5 items done.',
    );
  });

  it('ends a procedure with nothing done at once', async () => {
    renderTrainer();
    start('start', 'practice');
    await userEvent.click(modeButton('Free explore'));
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(trainer.mode).toBe('explore');
    expect(trainer.procedureId).toBeUndefined();
  });

  it('switches at once once the procedure is finished', async () => {
    renderTrainer();
    start('cycle', 'practice');
    act(() => trainer.session.set('master', 'on'));
    act(() => trainer.session.set('master', 'off'));
    await userEvent.click(modeButton('Free explore'));
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(trainer.mode).toBe('explore');
  });

  it.each(['Guided', 'Practice'])(
    'restarts the last procedure when %s is chosen in Free explore',
    async (name) => {
      renderTrainer();
      start('start', 'practice');
      await userEvent.click(modeButton('Free explore'));
      await userEvent.click(modeButton(name));
      expect(trainer.mode).toBe(name.toLowerCase());
      expect(trainer.procedureId).toBe('start');
      expect(modeButton(name).getAttribute('aria-pressed')).toBe('true');
    },
  );

  it('sends Guided or Practice chosen in a Free explore without a procedure back to the picker', async () => {
    renderTrainer();
    await userEvent.click(modeButton('Free explore'));
    await userEvent.click(modeButton('Practice'));
    expect(trainer.screen).toBe('picker');
    expect(trainer.mode).toBe('practice');
    expect(trainer.procedureId).toBeUndefined();
  });

  it('shows the operate toggle in Free explore only', () => {
    renderTrainer();
    expect(screen.queryByRole('checkbox', { name: /Operate controls/ })).toBeNull();
    enterExplore();
    const toggle = screen.getByRole('checkbox', { name: /Operate controls/ });
    expect((toggle as HTMLInputElement).checked).toBe(false);
  });

  it('speaks German', () => {
    renderTrainer('de');
    expect(screen.getByRole('group', { name: 'Modus' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Freies Erkunden' })).toBeDefined();
  });
});

describe('Guided', () => {
  it('outlines the current target with a pulse', () => {
    renderTrainer();
    start('start', 'guided');
    const ring = outline();
    expect(ring?.dataset.outline).toBe('target');
    expect(ring?.dataset.pulse).toBe('true');
    expect(boxOf(ring)).toEqual(boxOf(placement('master')));
  });

  it('keeps the outline and drops the pulse under reduced motion', () => {
    reducedMotion = true;
    renderTrainer();
    start('start', 'guided');
    expect(outline()?.dataset.outline).toBe('target');
    expect(outline()?.dataset.pulse).toBeUndefined();
  });

  it("switches to the view of the next item's target", () => {
    renderTrainer();
    start('start', 'guided');
    expect(selectedTab()).toBe('Main panel');

    act(() => trainer.session.set('master', 'on'));
    expect(selectedTab()).toBe('Centre console');
    expect(boxOf(outline())).toEqual(boxOf(placement('pump')));

    act(() => trainer.session.set('pump', 'on'));
    expect(selectedTab()).toBe('Main panel');
    expect(boxOf(outline())).toEqual(boxOf(placement('volts')));
  });

  it("outlines a device control's install", () => {
    renderTrainer();
    start('start', 'guided');
    act(() => {
      trainer.session.set('master', 'on');
      trainer.session.set('pump', 'on');
      trainer.session.checkOff();
    });
    expect(selectedTab()).toBe('Centre console');
    // Without an image size the console spans its placements: 900 by 250.
    expect(boxOf(outline())).toEqual({
      left: percent(500, 900),
      top: '0%',
      width: percent(400, 900),
      height: percent(200, 250),
    });
  });

  it('lets the pilot look at another view while the target stays', async () => {
    renderTrainer();
    start('start', 'guided');
    await userEvent.click(screen.getByRole('tab', { name: 'Centre console' }));
    expect(selectedTab()).toBe('Centre console');
    expect(outline()).toBeNull();
  });

  it('returns to the target when the next item has the same target', async () => {
    renderTrainer();
    start('cycle', 'guided');
    await userEvent.click(screen.getByRole('tab', { name: 'Centre console' }));
    act(() => trainer.session.set('master', 'on'));
    expect(selectedTab()).toBe('Main panel');
  });

  it('shows no outline once the procedure is done or ended', () => {
    renderTrainer();
    start('cycle', 'guided');
    act(() => {
      trainer.session.set('master', 'on');
      trainer.session.set('master', 'off');
    });
    expect(outline()).toBeNull();
  });
});

describe('Guided stray control', () => {
  const stray = () => document.querySelector<HTMLElement>('[data-outline="stray"]');

  it('outlines a control the pilot moved away from the item, without a pulse', () => {
    renderTrainer();
    start('start', 'guided');
    expect(stray()).toBeNull();
    act(() => trainer.session.set('throttle', 0.5));
    expect(boxOf(stray())).toEqual(boxOf(placement('throttle')));
    expect(stray()?.dataset.pulse).toBeUndefined();
    expect(outline()?.dataset.outline).toBe('target');
  });

  it('drops the outline once the control is back where it was', () => {
    renderTrainer();
    start('start', 'guided');
    act(() => trainer.session.set('throttle', 0.5));
    act(() => trainer.session.set('throttle', 0));
    expect(stray()).toBeNull();
  });

  it('drops the outline when the item changes', () => {
    renderTrainer();
    start('start', 'guided');
    act(() => trainer.session.set('throttle', 0.5));
    act(() => trainer.session.set('master', 'on'));
    expect(stray()).toBeNull();
  });

  it('draws none in Practice', () => {
    renderTrainer();
    start('start', 'practice');
    act(() => trainer.session.set('throttle', 0.5));
    expect(stray()).toBeNull();
  });

  it('draws none for a move made in Practice before switching to Guided', () => {
    renderTrainer();
    start('start', 'practice');
    act(() => trainer.session.set('throttle', 0.5));
    act(() => trainer.setMode('guided'));
    expect(stray()).toBeNull();
    act(() => trainer.session.set('pump', 'on'));
    expect(boxOf(stray())).toEqual(boxOf(placement('pump')));
  });

  it('draws none after a retry has put the control back', () => {
    renderTrainer();
    start('start', 'guided');
    act(() => trainer.session.set('throttle', 0.5));
    act(() => trainer.session.retryItem());
    expect(stray()).toBeNull();
  });

  it('draws none for a spring-back control, even while it is held', () => {
    renderTrainer();
    start('start', 'guided');
    act(() => trainer.session.press('starter'));
    expect(trainer.session.checklist()?.deviations.at(-1)?.controlId).toBe('starter');
    expect(stray()).toBeNull();
    act(() => trainer.session.release('starter'));
    expect(stray()).toBeNull();
  });
});

describe('Guided while zoomed', () => {
  const viewport = { width: 400, height: 200 };
  const zoomVar = (name: string) =>
    Number(document.querySelector<HTMLElement>('.panel-zoom')?.style.getPropertyValue(name));
  const ringRect = () => {
    const ring = outline();
    if (!ring) throw new Error('no outline');
    const scale = zoomVar('--panel-scale');
    const left =
      (parseFloat(ring.style.left) / 100) * viewport.width * scale + zoomVar('--panel-x');
    const width = (parseFloat(ring.style.width) / 100) * viewport.width * scale;
    return { left, right: left + width };
  };

  beforeEach(() => {
    const real = Element.prototype.getBoundingClientRect;
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (
      this: Element,
    ) {
      if (this.classList.contains('panel-stage')) {
        return new DOMRect(0, 0, viewport.width, viewport.height);
      }
      if (this instanceof HTMLElement && this.dataset.outline === 'target') {
        const { left, right } = ringRect();
        return new DOMRect(left, 0, right - left, 10);
      }
      return real.call(this);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('pans the next target into view when it is out of sight', async () => {
    renderTrainer();
    start('inview', 'guided');
    const surface = screen.getByRole('tabpanel');
    act(() => surface.focus());
    await userEvent.keyboard('++++');
    await userEvent.keyboard('{ArrowLeft>20/}');
    const before = zoomVar('--panel-x');
    expect(before).toBe(0);

    act(() => {
      trainer.session.openGuard('cutoff');
      trainer.session.set('cutoff', 'cut');
    });

    expect(zoomVar('--panel-x')).toBeLessThan(before);
    const { left, right } = ringRect();
    expect(left).toBeGreaterThanOrEqual(0);
    expect(right).toBeLessThanOrEqual(viewport.width + 0.001);
  });

  it('pans the next item on the same control back into view after the pilot panned away', async () => {
    renderTrainer();
    start('cycle', 'guided');
    const surface = screen.getByRole('tabpanel');
    act(() => surface.focus());
    await userEvent.keyboard('++++');
    await userEvent.keyboard('{ArrowRight>20/}');
    expect(ringRect().right).toBeLessThan(0);

    act(() => trainer.session.set('master', 'on'));

    expect(trainer.session.checklist()?.current).toBe(1);
    const { left, right } = ringRect();
    expect(left).toBeGreaterThanOrEqual(-0.001);
    expect(right).toBeLessThanOrEqual(viewport.width + 0.001);
  });

  it('leaves the zoom alone when the next target is already in view', async () => {
    renderTrainer();
    start('cycle', 'guided');
    const surface = screen.getByRole('tabpanel');
    act(() => surface.focus());
    await userEvent.keyboard('+');
    const before = [zoomVar('--panel-x'), zoomVar('--panel-y')];
    act(() => trainer.session.set('master', 'on'));
    expect([zoomVar('--panel-x'), zoomVar('--panel-y')]).toEqual(before);
  });
});

describe('a pinch that starts on a control', () => {
  const touch = (id: number, x: number) => ({
    pointerId: id,
    pointerType: 'touch',
    clientX: x,
    clientY: 100,
    button: 0,
  });

  it.each(['guided', 'practice'] as const)(
    'does not operate it or record a deviation in %s',
    (mode) => {
      renderTrainer();
      start('start', mode);
      const starter = screen.getByRole('button', { name: 'Starter' });
      const panel = screen.getByRole('img', { name: 'Main panel' });
      fireEvent.pointerDown(starter, touch(1, 100));
      fireEvent.pointerDown(panel, touch(2, 300));
      fireEvent.pointerMove(panel, touch(2, 360));
      fireEvent.pointerUp(starter, touch(1, 100));
      fireEvent.pointerUp(panel, touch(2, 360));

      expect(trainer.session.state().controls.starter).toBe('off');
      expect(trainer.session.checklist()?.deviations).toEqual([]);
    },
  );

  it('operates it when it is a plain tap', () => {
    renderTrainer();
    start('start', 'practice');
    const starter = screen.getByRole('button', { name: 'Starter' });
    fireEvent.pointerDown(starter, touch(1, 100));
    expect(trainer.session.state().controls.starter).toBe('off');
    fireEvent.pointerUp(starter, touch(1, 100));
    expect(trainer.session.checklist()?.deviations).toHaveLength(1);
  });
});

describe('Practice', () => {
  it('draws no overlay', () => {
    renderTrainer();
    start('start', 'practice');
    expect(document.querySelector('[data-modes-overlay]')).toBeNull();
    act(() => trainer.session.set('master', 'on'));
    expect(selectedTab()).toBe('Main panel');
  });
});

describe('input is never blocked', () => {
  it.each(['guided', 'practice'] as const)('operates every control in %s', async (mode) => {
    renderTrainer();
    start('start', mode);
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Starter' }), { button: 0 });
    expect(trainer.session.state().controls.starter).toBe('start');
    fireEvent.pointerUp(screen.getByRole('button', { name: 'Starter' }));
    await userEvent.click(radio('Master', 'on'));
    expect(trainer.session.state().controls.master).toBe('on');
  });
});

describe('Free explore', () => {
  it('shows the details of a tapped control and leaves the session alone', async () => {
    renderTrainer();
    enterExplore();
    const { session } = trainer;
    const before = { controls: session.state().controls, guards: session.guards() };
    const operations = (['set', 'press', 'release', 'openGuard', 'closeGuard'] as const).map(
      (method) => vi.spyOn(session, method),
    );

    await userEvent.click(hit('master'));

    for (const operation of operations) expect(operation).not.toHaveBeenCalled();
    expect({ controls: session.state().controls, guards: session.guards() }).toEqual(before);
    const details = screen.getByRole('dialog', { name: 'Master' });
    expect(within(details).getByText('Turns the master on or off.')).toBeDefined();
    expect(within(details).getByText('Toggle')).toBeDefined();
    expect(within(details).getByText('Main panel')).toBeDefined();
    const positions = within(within(details).getByRole('list', { name: 'Positions' }))
      .getAllByRole('listitem')
      .map((item) => [item.textContent, item.getAttribute('aria-current')]);
    expect(positions).toEqual([
      ['off · current', 'true'],
      ['on', null],
    ]);
    const usedIn = within(within(details).getByRole('list', { name: 'Used in' }))
      .getAllByRole('listitem')
      .map((item) => item.textContent);
    expect(usedIn).toEqual(['StartItem 1', 'CycleItem 1', 'CycleItem 2']);
    expect(within(details).getByText('+1 more')).toBeDefined();
  });

  it('outlines the selected control without a pulse', async () => {
    renderTrainer();
    enterExplore();
    await userEvent.click(hit('master'));
    expect(outline()?.dataset.outline).toBe('selected');
    expect(outline()?.dataset.pulse).toBeUndefined();
    expect(boxOf(outline())).toEqual(boxOf(placement('master')));
  });

  it('selects instead of operating when a widget is used directly', () => {
    renderTrainer();
    enterExplore();
    fireEvent.click(radio('Master', 'on'));
    expect(trainer.session.state().controls.master).toBe('off');
    expect(screen.getByRole('dialog', { name: 'Master' })).toBeDefined();
  });

  it('marks the current position of a control that moved', async () => {
    renderTrainer();
    act(() => trainer.session.set('pump', 'on'));
    enterExplore();
    await userEvent.click(screen.getByRole('tab', { name: 'Centre console' }));
    await userEvent.click(hit('pump'));
    const details = screen.getByRole('dialog', { name: 'Pump' });
    const current = within(within(details).getByRole('list', { name: 'Positions' })).getAllByRole(
      'listitem',
    );
    expect(current.map((item) => item.textContent)).toEqual(['off', 'on · current']);
  });

  it('says when a control is used in no procedure', async () => {
    renderTrainer();
    enterExplore();
    await userEvent.click(hit('starter'));
    const details = screen.getByRole('dialog', { name: 'Starter' });
    expect(within(details).getByText('Not used in any procedure')).toBeDefined();
    expect(within(details).queryByRole('list', { name: 'Used in' })).toBeNull();
  });

  it('closes the details on Escape and on a tap outside', async () => {
    renderTrainer();
    enterExplore();
    await userEvent.click(hit('master'));
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(outline()).toBeNull();

    await userEvent.click(hit('master'));
    await userEvent.click(screen.getByRole('tablist'));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('opens one popover at a time', async () => {
    renderTrainer();
    enterExplore();
    await userEvent.click(hit('master'));
    await userEvent.click(hit('starter'));
    expect(screen.getAllByRole('dialog')).toHaveLength(1);
    expect(screen.getByRole('dialog', { name: 'Starter' })).toBeDefined();
    expect(screen.queryByRole('dialog', { name: 'Master' })).toBeNull();
  });

  it('operates with the toggle on and opens no details', async () => {
    renderTrainer();
    enterExplore();
    await userEvent.click(screen.getByRole('checkbox', { name: /Operate controls/ }));
    expect(document.querySelector('[data-hit]')).toBeNull();
    await userEvent.click(radio('Master', 'on'));
    expect(trainer.session.state().controls.master).toBe('on');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('turns operating on from the details', async () => {
    renderTrainer();
    enterExplore();
    await userEvent.click(hit('master'));
    const details = screen.getByRole('dialog', { name: 'Master' });
    await userEvent.click(within(details).getByRole('checkbox', { name: /Operate controls/ }));
    expect(screen.queryByRole('dialog')).toBeNull();
    await userEvent.click(radio('Master', 'on'));
    expect(trainer.session.state().controls.master).toBe('on');
  });

  it('drops the selection when leaving Free explore', async () => {
    renderTrainer();
    enterExplore();
    await userEvent.click(hit('master'));
    act(() => trainer.setMode('practice'));
    expect(screen.queryByRole('dialog')).toBeNull();
    enterExplore();
    expect(outline()).toBeNull();
  });
});

describe('the guard in Free explore', () => {
  const guard = () => screen.getByRole('button', { name: 'Fuel cutoff' });

  it('selects the control instead of opening its guard', () => {
    renderTrainer();
    enterExplore();
    fireEvent.click(guard());
    expect(trainer.session.guards().cutoff).toBe('closed');
    expect(screen.getByRole('dialog', { name: 'Fuel cutoff' })).toBeDefined();
  });

  it('selects the control instead of closing its guard', async () => {
    renderTrainer();
    enterExplore();
    const operate = screen.getByRole('checkbox', { name: /Operate controls/ });
    await userEvent.click(operate);
    fireEvent.click(guard());
    expect(trainer.session.guards().cutoff).toBe('open');
    await userEvent.click(operate);
    fireEvent.click(guard());
    expect(trainer.session.guards().cutoff).toBe('open');
    expect(screen.getByRole('dialog', { name: 'Fuel cutoff' })).toBeDefined();
  });
});

describe('the details popover', () => {
  const popoverSize = { width: 300, height: 200 };

  // Outline boxes in pixels: ten times their percentages, each fifty pixels tall.
  function stubLayout(viewportHeight: number) {
    vi.stubGlobal('innerWidth', 1200);
    vi.stubGlobal('innerHeight', viewportHeight);
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
      this: HTMLElement,
    ) {
      let box = { left: 0, top: 0, width: 0, height: 0 };
      if (this.dataset.outline !== undefined) {
        const zoom = Number(
          document
            .querySelector<HTMLElement>('.panel-zoom')
            ?.style.getPropertyValue('--panel-scale'),
        );
        const scale = zoom > 0 ? zoom : 1;
        box = {
          left: parseFloat(this.style.left) * 10 * scale,
          top: parseFloat(this.style.top) * 10 * scale,
          width: 50,
          height: 50,
        };
      } else if (this.getAttribute('role') === 'dialog') {
        box = { left: 0, top: 0, ...popoverSize };
      }
      return {
        ...box,
        x: box.left,
        y: box.top,
        right: box.left + box.width,
        bottom: box.top + box.height,
        toJSON: () => box,
      };
    });
  }

  const dialogPlace = (name: string) => {
    const style = screen.getByRole('dialog', { name }).style;
    return { top: parseFloat(style.top), left: parseFloat(style.left) };
  };
  const outlineTop = () => parseFloat(outline()?.style.top ?? '') * 10;

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('opens below the control when it fits', async () => {
    stubLayout(1000);
    renderTrainer();
    enterExplore();
    await userEvent.click(hit('master'));
    expect(dialogPlace('Master').top).toBeCloseTo(outlineTop() + 50);
  });

  it('flips above the control when there is no room below', async () => {
    stubLayout(500);
    renderTrainer();
    enterExplore();
    await userEvent.click(hit('master'));
    expect(dialogPlace('Master').top).toBeCloseTo(outlineTop() - popoverSize.height);
  });

  it('follows its control when the panel zooms', async () => {
    stubLayout(1000);
    renderTrainer();
    enterExplore();
    await userEvent.click(hit('starter'));
    const before = dialogPlace('Starter');
    const surface = screen.getByRole('tabpanel');
    act(() => surface.focus());
    fireEvent.keyDown(surface, { key: '+' });
    const after = dialogPlace('Starter');
    expect(after.left).toBeGreaterThan(before.left);
    expect(screen.getByRole('dialog', { name: 'Starter' })).toBeDefined();
  });

  it('moves focus into the details and back to the tapped widget on Escape', async () => {
    renderTrainer();
    enterExplore();
    await userEvent.click(hit('master'));
    expect(document.activeElement).toBe(screen.getByRole('dialog', { name: 'Master' }));
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(radio('Master', 'off'));
  });

  it('follows a selection made from the keyboard while open', async () => {
    stubLayout(1000);
    renderTrainer();
    enterExplore();
    await userEvent.click(hit('master'));
    const before = dialogPlace('Master');

    const cutoff = screen.getByRole('button', { name: 'Fuel cutoff' });
    act(() => cutoff.focus());
    fireEvent.click(cutoff);

    const after = dialogPlace('Fuel cutoff');
    expect(after).not.toEqual(before);
    expect(after.left).toBeCloseTo(parseFloat(outline()?.style.left ?? '') * 10);
    expect(document.activeElement).toBe(screen.getByRole('dialog', { name: 'Fuel cutoff' }));
    await userEvent.keyboard('{Escape}');
    expect(document.activeElement).toBe(cutoff);
  });
});

describe('Free explore for assistive technology', () => {
  it('keeps the hit layer out of the accessibility tree and lets drags on it pan', () => {
    renderTrainer();
    enterExplore();
    const hits = [...document.querySelectorAll<HTMLElement>('.modes-hit')];
    expect(hits.length).toBeGreaterThan(0);
    for (const area of hits) {
      expect(area.getAttribute('aria-hidden')).toBe('true');
      expect(area.hasAttribute('data-pan-through')).toBe(true);
    }
    expect(screen.queryAllByRole('button', { name: /Master/ })).toHaveLength(0);
    expect(screen.getAllByRole('radiogroup', { name: 'Master' })).toHaveLength(1);
  });

  it('opens the details on Enter from a widget and returns focus on Escape', async () => {
    renderTrainer();
    enterExplore();
    const off = radio('Master', 'off');
    act(() => off.focus());
    await userEvent.keyboard('{Enter}');
    expect(trainer.session.state().controls.master).toBe('off');
    expect(document.activeElement).toBe(screen.getByRole('dialog', { name: 'Master' }));
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(off);
  });

  it('opens the details of a continuous lever on Enter without moving it', async () => {
    renderTrainer();
    enterExplore();
    act(() => screen.getByRole('slider', { name: 'Throttle' }).focus());
    await userEvent.keyboard('{Enter}');
    expect(screen.getByRole('dialog', { name: 'Throttle' })).toBeDefined();
    expect(trainer.session.state().controls.throttle).toBe(0);
  });

  it('leaves Enter on a lever alone outside Free explore', async () => {
    renderTrainer();
    act(() => screen.getByRole('slider', { name: 'Throttle' }).focus());
    await userEvent.keyboard('{Enter}');
    expect(screen.queryByRole('dialog')).toBeNull();
    enterExplore();
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});

describe('Guided focus', () => {
  it('moves focus to the target when its view comes up', () => {
    renderTrainer();
    start('start', 'guided');
    act(() => radio('Master', 'off').focus());
    act(() => trainer.session.set('master', 'on'));
    expect(selectedTab()).toBe('Centre console');
    expect(placement('pump')?.contains(document.activeElement)).toBe(true);
  });

  it('moves focus into the install of a device control target when its view comes up', () => {
    renderTrainer();
    start('start', 'guided');
    act(() => {
      trainer.session.set('master', 'on');
      trainer.session.set('pump', 'on');
    });
    expect(selectedTab()).toBe('Main panel');
    act(() => screen.getByRole('tab', { name: 'Main panel' }).focus());
    act(() => trainer.session.checkOff());
    expect(selectedTab()).toBe('Centre console');
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Radio page B' }));
  });

  it('leaves focus alone when another target comes up in the shown view', () => {
    renderTrainer();
    start('inview', 'guided');
    const tab = screen.getByRole('tab', { name: 'Main panel' });
    act(() => tab.focus());
    act(() => {
      trainer.session.openGuard('cutoff');
      trainer.session.set('cutoff', 'cut');
    });
    expect(trainer.session.checklist()?.current).toBe(1);
    expect(document.activeElement).toBe(tab);
  });

  it('leaves focus alone when the next target is in the shown view', () => {
    renderTrainer();
    start('cycle', 'guided');
    const tab = screen.getByRole('tab', { name: 'Main panel' });
    act(() => tab.focus());
    act(() => trainer.session.set('master', 'on'));
    expect(document.activeElement).toBe(tab);
  });
});

const combined: CockpitLayoutChoice = {
  kind: 'combined',
  scale: 1,
  width: 1000,
  height: 500,
  cells: [
    { viewId: 'main', left: 0, top: 0, width: 600, height: 500, fitWidth: 600 },
    { viewId: 'console', left: 600, top: 0, width: 400, height: 500, fitWidth: 400 },
  ],
};

describe('Guided in the combined layout', () => {
  const outlines = () => [...document.querySelectorAll<HTMLElement>('[data-outline="target"]')];

  it('rings the target in its own cell only and never switches views', () => {
    renderTrainer('en', combined);
    start('start', 'guided');
    expect(screen.queryByRole('tab')).toBeNull();
    expect(outlines()).toHaveLength(1);
    expect(outlines()[0]?.closest('[data-view]')?.getAttribute('data-view')).toBe('main');

    act(() => trainer.session.set('master', 'on'));
    expect(outlines()).toHaveLength(1);
    expect(outlines()[0]?.closest('[data-view]')?.getAttribute('data-view')).toBe('console');
    expect(boxOf(outlines()[0] ?? null)).toEqual(boxOf(placement('pump')));
  });

  it('moves focus to the target in its cell when the target changes cell', () => {
    renderTrainer('en', combined);
    start('start', 'guided');
    act(() => radio('Master', 'off').focus());
    act(() => trainer.session.set('master', 'on'));
    expect(placement('pump')?.contains(document.activeElement)).toBe(true);
    expect(placement('pump')?.closest('[data-view]')?.getAttribute('data-view')).toBe('console');
  });

  it('moves focus into the install of a device control target in its cell', () => {
    renderTrainer('en', combined);
    start('start', 'guided');
    act(() => {
      trainer.session.set('master', 'on');
      trainer.session.set('pump', 'on');
    });
    const volts = placement('volts');
    act(() => volts?.querySelector<HTMLElement>('[tabindex="0"]')?.focus());
    act(() => trainer.session.checkOff());
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Radio page B' }));
  });

  it('leaves focus alone when the next target is in the same cell', () => {
    renderTrainer('en', combined);
    start('cycle', 'guided');
    act(() => radio('Master', 'off').focus());
    const focused = document.activeElement;
    act(() => trainer.session.set('master', 'on'));
    expect(document.activeElement).toBe(focused);
  });
});

const dockedLayout: CockpitLayoutChoice = {
  ...combined,
  height: 700,
  dock: { left: 0, top: 500, width: 1000, height: 200 },
};

describe('the device dock in the modes', () => {
  const dockRegion = () => screen.getByRole('region', { name: 'Device dock' });
  const docked = () =>
    dockRegion().querySelector<HTMLElement>('[data-dock-device]')?.dataset.dockDevice;
  const toDeviceStep = () =>
    act(() => {
      trainer.session.set('master', 'on');
      trainer.session.set('pump', 'on');
      trainer.session.checkOff();
    });

  beforeEach(() => {
    dockState.withDock = true;
  });

  it('opens the targeted device in the dock and rings the slot without switching views', () => {
    renderTrainer('en', dockedLayout);
    start('start', 'guided');
    expect(dockRegion().getAttribute('data-dock')).toBe('empty');

    toDeviceStep();
    expect(docked()).toBe('com');
    expect(within(dockRegion()).getByRole('button', { name: 'Radio page B' })).toBeTruthy();
    const ring = document.querySelector<HTMLElement>('[data-outline="target"]');
    expect(boxOf(ring)).toEqual(boxOf(placement('com')));
    expect(ring?.closest('[data-view]')?.getAttribute('data-view')).toBe('console');
  });

  it('rings the key of the target and not the unit around it', () => {
    renderTrainer('en', dockedLayout);
    start('start', 'guided');
    toDeviceStep();
    const unit = document.querySelector<HTMLElement>('[data-dock-device="com"]');
    const keys = [...(unit?.querySelectorAll('[data-target="true"]') ?? [])];
    expect(keys.map((key) => key.textContent)).toEqual(['Radio page B']);
    expect(unit?.dataset.keyRing).toBe('true');
    act(() => trainer.session.set('com.page', 'b'));
    expect(unit?.querySelector('[data-target]')).toBeNull();
    expect(unit?.dataset.keyRing).toBeUndefined();
  });

  it('rings the unit when the target has no key on its screen', () => {
    renderTrainer('en', dockedLayout);
    start('keyless', 'guided');
    const unit = document.querySelector<HTMLElement>('[data-dock-device="com"]');
    expect(unit?.dataset.target).toBe('true');
    expect(unit?.dataset.keyRing).toBeUndefined();
    expect(unit?.querySelector('[data-control][data-target]')).toBeNull();
  });

  it('keeps the shown tab for a device target', () => {
    renderTrainer('en');
    start('start', 'guided');
    toDeviceStep();
    expect(selectedTab()).toBe('Main panel');
    expect(docked()).toBe('com');
    expect(dockRegion().querySelector('[data-target="true"]')).not.toBeNull();
  });

  it('opens the device once per step, so a closed dock stays closed', async () => {
    renderTrainer('en', dockedLayout);
    start('start', 'guided');
    toDeviceStep();
    await userEvent.click(within(dockRegion()).getByRole('button', { name: 'Close device' }));
    expect(dockRegion().getAttribute('data-dock')).toBe('empty');
    act(() => trainer.session.set('com.page', 'b'));
    expect(dockRegion().getAttribute('data-dock')).toBe('empty');
  });

  it('leaves the dock empty for a target no device owns', () => {
    renderTrainer('en', dockedLayout);
    start('start', 'guided');
    expect(dockRegion().getAttribute('data-dock')).toBe('empty');
    expect(dockRegion().querySelector('[data-target]')).toBeNull();
  });

  it('opens and rings nothing in Practice', () => {
    renderTrainer('en', dockedLayout);
    start('start', 'practice');
    toDeviceStep();
    expect(dockRegion().getAttribute('data-dock')).toBe('empty');
    expect(document.querySelector('[data-outline]')).toBeNull();
    expect(document.querySelector('[data-target]')).toBeNull();
  });

  it('docks the device of an activated slot in Free explore', async () => {
    renderTrainer('en', dockedLayout);
    enterExplore();
    await userEvent.click(screen.getByRole('button', { name: 'modes-radio: Radio page A' }));
    expect(docked()).toBe('com');
    expect(document.querySelector('[data-target]')).toBeNull();
  });

  it('opens the device when Guided starts on a device step', () => {
    renderTrainer('en', dockedLayout);
    start('start', 'practice');
    toDeviceStep();
    act(() => trainer.setMode('guided'));
    expect(docked()).toBe('com');
  });
});

describe('the device target without a dock', () => {
  it('still switches to the view of the slot, where the device is operable', () => {
    renderTrainer('en');
    start('start', 'guided');
    act(() => {
      trainer.session.set('master', 'on');
      trainer.session.set('pump', 'on');
      trainer.session.checkOff();
    });
    expect(selectedTab()).toBe('Centre console');
    expect(screen.queryByRole('region', { name: 'Device dock' })).toBeNull();
  });
});

describe('targetInstall', () => {
  it('names the install of a device control and nothing else', () => {
    expect(targetInstall(fixture, { control: 'com.page' })).toBe('com');
    expect(targetInstall(fixture, { control: 'master' })).toBeUndefined();
    expect(targetInstall(fixture, { indicator: 'volts' })).toBeUndefined();
    expect(targetInstall(fixture, { control: 'ghost.page' })).toBeUndefined();
  });
});

describe('a held control', () => {
  it('is still released after operating is turned off', async () => {
    renderTrainer();
    enterExplore();
    const operate = screen.getByRole('checkbox', { name: /Operate controls/ });
    await userEvent.click(operate);
    const starter = screen.getByRole('button', { name: 'Starter' });
    fireEvent.pointerDown(starter, { button: 0 });
    expect(trainer.session.state().controls.starter).toBe('start');
    await userEvent.click(operate);
    fireEvent.pointerUp(starter);
    expect(trainer.session.state().controls.starter).toBe('off');
  });
});

describe('overlay styles', () => {
  const css = readFileSync(
    fileURLToPath(import.meta.url).replace(/modes\.test\.tsx$/, 'modes.css'),
    'utf8',
  );

  it('draw the outlines in the accent and never in a status ink', () => {
    expect(css).toMatch(/--color-accent/);
    expect(css).not.toMatch(/--color-(success|warning|danger)/);
  });

  it('drop the pulse under reduced motion', () => {
    expect(css).toMatch(/prefers-reduced-motion: reduce/);
  });
});
