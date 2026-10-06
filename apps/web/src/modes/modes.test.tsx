// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { act, cleanup, fireEvent, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithLanguage } from '../i18n/test-utils';
import { PanelArea } from '../panel';
import { TrainerProvider, useTrainer } from '../trainer';
import type { Mode, Trainer } from '../trainer';
import { ModeControl } from './ModeControl';

vi.mock('../aircraft-registry', async () => ({
  aircraftRegistry: [(await import('./test-aircraft')).fixture],
}));

vi.mock('../device-registry', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  deviceRegistry: [(await import('./test-aircraft')).radio],
}));

let trainer: Trainer;
function Probe() {
  trainer = useTrainer();
  return null;
}

function renderTrainer(language: 'de' | 'en' = 'en') {
  return renderWithLanguage(
    <TrainerProvider>
      <Probe />
      <ModeControl />
      <PanelArea />
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
  within(screen.getByRole('group', { name: 'Mode' })).getByRole('button', { name });
const hit = (id: string) => {
  const found = document.querySelector<HTMLElement>(`[data-hit="${id}"]`);
  if (!found) throw new Error(`no hit area for ${id}`);
  return found;
};
const radio = (control: string, position: string) =>
  within(screen.getByRole('radiogroup', { name: control })).getByRole('radio', { name: position });

describe('ModeControl', () => {
  it('offers the three modes and marks the current one', () => {
    renderTrainer();
    expect(
      within(screen.getByRole('group', { name: 'Mode' }))
        .getAllByRole('button')
        .map((button) => [button.textContent, button.getAttribute('aria-pressed')]),
    ).toEqual([
      ['Guided', 'true'],
      ['Practice', 'false'],
      ['Free explore', 'false'],
    ]);
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

    await userEvent.click(modeButton('Free explore'));
    const dialog = screen.getByRole('alertdialog', { name: 'End the procedure?' });
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

  it('moves focus into the details and back to the opener on Escape', async () => {
    renderTrainer();
    enterExplore();
    const opener = hit('master');
    await userEvent.click(opener);
    expect(document.activeElement).toBe(screen.getByRole('dialog', { name: 'Master' }));
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(opener);
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
