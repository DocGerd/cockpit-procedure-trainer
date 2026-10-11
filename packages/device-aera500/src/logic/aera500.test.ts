import { describe, expect, it } from 'vitest';
import {
  ACQUIRE_MS,
  ALTITUDE_INPUT,
  GROUND_SPEED_INPUT,
  OVERLAY_ICONS,
  PAGES,
  PAGE_ICONS,
  POWER_OFF_HOLD_MS,
  RANGES_NM,
  ICON_NAMES,
  TOUCH_ICONS,
  TRACK_INPUT,
  aera500Device,
  receiverStatus,
  shownIcons,
} from './aera500';
import type { Aera500State, TouchIcon } from './aera500';

const initial = aera500Device.initial as Aera500State;

type Controls = { power?: string; touch?: string };
const inputs = { [GROUND_SPEED_INPUT]: 61, [TRACK_INPUT]: 270, [ALTITUDE_INPUT]: 2400 };

const stepWith = (
  state: Aera500State,
  controls: Controls = {},
  options: { powered?: boolean; dtMs?: number; inputs?: Record<string, number> } = {},
) =>
  aera500Device.step(state, {
    controls: { power: 'released', touch: 'rest', ...controls },
    powered: options.powered ?? true,
    inputs: options.inputs ?? inputs,
    dtMs: options.dtMs ?? 0,
  }) as Aera500State;

const lit = (): Aera500State => stepWith(initial);
const onPage = (page: Aera500State['page']): Aera500State => ({ ...lit(), page });
const tap = (state: Aera500State, icon: TouchIcon) =>
  stepWith(stepWith(state, { touch: icon }), { touch: 'rest' });
const pressPower = (state: Aera500State) => stepWith(state, { power: 'pressed' });
const releasePower = (state: Aera500State) => stepWith(state, { power: 'released' });
const clickPower = (state: Aera500State) => releasePower(pressPower(state));
const idle = (state: Aera500State, dtMs: number, controls: Controls = {}) =>
  stepWith(state, controls, { dtMs });
const holdOff = (state: Aera500State) =>
  idle(pressPower(state), POWER_OFF_HOLD_MS, { power: 'pressed' });
const dark = (state: Aera500State) => releasePower(holdOff(state));

describe('aera500Device definition', () => {
  it('declares a momentary power key and a touch rotary that springs back', () => {
    const { power, touch } = aera500Device.controls;
    expect(Object.keys(aera500Device.controls)).toEqual(['power', 'touch']);
    expect(power?.kind).toBe('momentary');
    expect(touch).toMatchObject({ kind: 'rotary', initial: 'rest' });
    if (touch?.kind !== 'rotary') throw new Error('touch is not a rotary');
    expect(touch.positions).toEqual(['rest', ...TOUCH_ICONS]);
    for (const icon of TOUCH_ICONS) expect(touch.springBack?.[icon]).toBe('rest');
  });

  it('declares a legend for every touch position', () => {
    const { touch } = aera500Device.controls;
    for (const position of ['rest', ...TOUCH_ICONS]) {
      expect(touch?.legends?.[position], position).toBeDefined();
    }
    expect(touch?.legends?.accept).toBe('Press To Accept');
  });

  it('prints every icon under the legend the control declares', () => {
    const { touch } = aera500Device.controls;
    for (const icon of TOUCH_ICONS) expect(ICON_NAMES[icon], icon).toBe(touch?.legends?.[icon]);
  });

  it('starts dark at the start-up page with its settings', () => {
    expect(initial).toMatchObject({
      on: false,
      powered: false,
      page: 'startup',
      overlay: false,
      backlight: 10,
      fix: false,
      acquiringMs: 0,
      groundSpeedKt: null,
      trackDeg: null,
      altitudeFt: null,
      heldMs: 0,
    });
    expect(RANGES_NM[initial.rangeIndex]).toBe(5);
  });

  it('states its source revision and what it does not model', () => {
    expect(aera500Device.manual.en).toContain('190-01117-02');
    expect(aera500Device.manual.de).not.toBe('');
    expect(aera500Device.notModelled.length).toBeGreaterThan(0);
  });
});

describe('power', () => {
  it('switches on at the start-up page when cradle power arrives', () => {
    expect(lit()).toMatchObject({ on: true, powered: true, page: 'startup', fix: false });
  });

  it('stays dark and ignores every control without cradle power', () => {
    const state = stepWith(initial, { power: 'pressed', touch: 'accept' }, { powered: false });
    expect(state).toMatchObject({ on: false, powered: false, page: 'startup' });
    expect(state.held).toEqual({ power: 'pressed', touch: 'accept' });
  });

  it('does not fire a key held while power arrives', () => {
    const arrived = stepWith(initial, { power: 'pressed', touch: 'accept' });
    expect(arrived).toMatchObject({ on: true, page: 'startup' });
    const released = stepWith(arrived, { power: 'released', touch: 'rest' });
    expect(released).toMatchObject({ page: 'startup', overlay: false });
  });

  it('sees no power-up edge on the first step after a seed that sets the power flag', () => {
    const seeded: Aera500State = { ...initial, on: true, powered: true, page: 'map', fix: true };
    expect(stepWith(seeded)).toMatchObject({ on: true, page: 'map', fix: true });
  });

  it('drops the page, the fix, the overlay and the readings on power loss, and keeps the settings', () => {
    const zoomed = tap(onPage('map'), 'zoomOut');
    const state = { ...zoomed, backlight: 4, overlay: true, fix: true, groundSpeedKt: 50 };
    const lost = stepWith(state, {}, { powered: false });
    expect(lost).toMatchObject({
      on: false,
      powered: false,
      page: 'startup',
      overlay: false,
      fix: false,
      acquiringMs: 0,
      groundSpeedKt: null,
      trackDeg: null,
      altitudeFt: null,
      backlight: 4,
      rangeIndex: initial.rangeIndex + 1,
    });
    expect(stepWith(lost)).toMatchObject({ on: true, page: 'startup', backlight: 4 });
  });

  it('switches a dark unit on with any press of POWER and restarts the search', () => {
    const off = dark(onPage('map'));
    expect(off.on).toBe(false);
    expect(pressPower(off)).toMatchObject({ on: true, page: 'startup', fix: false });
  });

  it('opens no overlay when the release follows the press that switched it on', () => {
    const on = releasePower(pressPower(dark(onPage('map'))));
    expect(on).toMatchObject({ on: true, overlay: false });
  });

  it('opens the backlight overlay on a short press and closes it on the next', () => {
    const opened = clickPower(lit());
    expect(opened.overlay).toBe(true);
    expect(clickPower(opened).overlay).toBe(false);
  });

  it('treats a press shorter than the hold time as a short press', () => {
    const almost = idle(pressPower(lit()), POWER_OFF_HOLD_MS - 1, { power: 'pressed' });
    expect(almost.on).toBe(true);
    expect(releasePower(almost)).toMatchObject({ on: true, overlay: true });
  });

  it('switches off at the hold time, not before, and closes the overlay', () => {
    const before = idle(pressPower({ ...onPage('map'), overlay: true }), POWER_OFF_HOLD_MS - 1, {
      power: 'pressed',
    });
    expect(before.on).toBe(true);
    const at = idle(before, 1, { power: 'pressed' });
    expect(at).toMatchObject({ on: false, overlay: false, page: 'startup', fix: false });
  });

  it('opens no overlay on the release after a hold that switched off', () => {
    expect(releasePower(holdOff(lit()))).toMatchObject({ on: false, overlay: false });
  });

  it('stays off while the same hold continues', () => {
    expect(idle(holdOff(lit()), 5000, { power: 'pressed' }).on).toBe(false);
  });

  it('counts a held touch icon once', () => {
    const first = stepWith(onPage('home'), { touch: 'map' });
    const held = stepWith(first, { touch: 'map' });
    expect(held.page).toBe('map');
    const back = stepWith(stepWith(held, { touch: 'rest' }), { touch: 'home' });
    expect(stepWith(back, { touch: 'home' }).page).toBe('home');
  });
});

describe('pages', () => {
  it('accepts the databases at the start-up page and opens Home', () => {
    expect(tap(lit(), 'accept').page).toBe('home');
  });

  it('offers only acceptance at the start-up page', () => {
    for (const icon of TOUCH_ICONS.filter((candidate) => candidate !== 'accept')) {
      expect(tap(lit(), icon).page, icon).toBe('startup');
    }
  });

  it('ignores acceptance on other pages', () => {
    expect(tap(onPage('home'), 'accept').page).toBe('home');
    expect(tap(onPage('map'), 'accept').page).toBe('map');
  });

  it.each(['map', 'nearest', 'activeFpl', 'directTo', 'position', 'tools'] as const)(
    'opens %s from Home',
    (page) => {
      expect(tap(onPage('home'), page).page).toBe(page);
    },
  );

  it('stays on Home with Home or Back', () => {
    expect(tap(onPage('home'), 'home').page).toBe('home');
    expect(tap(onPage('home'), 'back').page).toBe('home');
  });

  it.each(['nearest', 'activeFpl', 'directTo', 'position', 'tools'] as const)(
    'returns from %s to Home with Back or Home',
    (page) => {
      expect(tap(onPage(page), 'back').page).toBe('home');
      expect(tap(onPage(page), 'home').page).toBe('home');
    },
  );

  it('has no Back on the map, only Home', () => {
    expect(tap(onPage('map'), 'back').page).toBe('map');
    expect(tap(onPage('map'), 'home').page).toBe('home');
  });

  it('opens GPS Status from Tools only, and goes back to Tools', () => {
    expect(tap(onPage('home'), 'gpsStatus').page).toBe('home');
    const status = tap(onPage('tools'), 'gpsStatus');
    expect(status.page).toBe('gpsStatus');
    expect(tap(status, 'back').page).toBe('tools');
    expect(tap(status, 'home').page).toBe('home');
  });

  it('does not reach a Home icon from another page', () => {
    expect(tap(onPage('tools'), 'map').page).toBe('tools');
    expect(tap(onPage('map'), 'nearest').page).toBe('map');
  });

  it('ignores the touchscreen while the unit is dark', () => {
    expect(tap(dark(onPage('home')), 'map').page).toBe('startup');
  });
});

describe('map range', () => {
  it('zooms out to a larger range and in to a smaller one on the map', () => {
    const map = onPage('map');
    expect(RANGES_NM[tap(map, 'zoomOut').rangeIndex]).toBe(10);
    expect(RANGES_NM[tap(map, 'zoomIn').rangeIndex]).toBe(2);
  });

  it('stops at the ends of the range steps', () => {
    let state = onPage('map');
    for (let step = 0; step < RANGES_NM.length + 2; step += 1) state = tap(state, 'zoomOut');
    expect(state.rangeIndex).toBe(RANGES_NM.length - 1);
    for (let step = 0; step < RANGES_NM.length + 2; step += 1) state = tap(state, 'zoomIn');
    expect(state.rangeIndex).toBe(0);
  });

  it('ignores the zoom icons off the map', () => {
    expect(tap(onPage('home'), 'zoomOut').rangeIndex).toBe(initial.rangeIndex);
  });

  it('keeps the range across pages', () => {
    const zoomed = tap(onPage('map'), 'zoomOut');
    expect(tap(tap(zoomed, 'home'), 'map').rangeIndex).toBe(zoomed.rangeIndex);
  });
});

describe('backlight overlay', () => {
  it('steps the backlight down and up while the overlay is open', () => {
    const dimmer = tap(clickPower(lit()), 'dimmer');
    expect(dimmer.backlight).toBe(9);
    expect(tap(dimmer, 'brighter').backlight).toBe(10);
  });

  it('clamps the backlight between 1 and 10', () => {
    let state = clickPower(lit());
    for (let step = 0; step < 14; step += 1) state = tap(state, 'dimmer');
    expect(state.backlight).toBe(1);
    for (let step = 0; step < 14; step += 1) state = tap(state, 'brighter');
    expect(state.backlight).toBe(10);
  });

  it('ignores the backlight icons with the overlay closed', () => {
    expect(tap(lit(), 'dimmer').backlight).toBe(10);
  });

  it('takes no page icon while the overlay is open', () => {
    expect(tap(clickPower(onPage('home')), 'map').page).toBe('home');
  });

  it('keeps the backlight when the unit is switched off and on', () => {
    const dimmed = tap(clickPower(lit()), 'dimmer');
    expect(pressPower(dark(dimmed)).backlight).toBe(9);
  });
});

describe('position fix', () => {
  it('searches, then acquires, then has a fix', () => {
    let state = lit();
    expect(receiverStatus(state)).toBe('searching');
    state = idle(state, ACQUIRE_MS / 3);
    expect(receiverStatus(state)).toBe('acquiring');
    state = idle(state, ACQUIRE_MS / 3);
    expect(state.fix).toBe(false);
    state = idle(state, ACQUIRE_MS / 3);
    expect(state.fix).toBe(true);
    expect(receiverStatus(state)).toBe('fix');
  });

  it('finds the fix on any page', () => {
    const state = idle(tap(tap(lit(), 'accept'), 'tools'), ACQUIRE_MS);
    expect(state).toMatchObject({ page: 'tools', fix: true });
  });

  it('keeps searching with the overlay open', () => {
    expect(idle(clickPower(lit()), ACQUIRE_MS).fix).toBe(true);
  });

  it('reads the aircraft values only with a fix', () => {
    const searching = idle(lit(), ACQUIRE_MS - 1);
    expect(searching).toMatchObject({ groundSpeedKt: null, trackDeg: null, altitudeFt: null });
    expect(idle(searching, 1)).toMatchObject({
      groundSpeedKt: 61,
      trackDeg: 270,
      altitudeFt: 2400,
    });
  });

  it('shows no reading for a missing or invalid input', () => {
    const found = idle(lit(), ACQUIRE_MS);
    expect(stepWith(found, {}, { inputs: {} })).toMatchObject({
      fix: true,
      groundSpeedKt: null,
      trackDeg: null,
      altitudeFt: null,
    });
    const invalid = stepWith(found, {}, { inputs: { [GROUND_SPEED_INPUT]: Number.NaN } });
    expect(invalid.groundSpeedKt).toBeNull();
  });

  it('loses the fix and restarts the search when switched off and on', () => {
    const off = dark(idle(lit(), ACQUIRE_MS));
    expect(off).toMatchObject({ fix: false, acquiringMs: 0, groundSpeedKt: null });
    expect(receiverStatus(pressPower(off))).toBe('searching');
  });

  it('restarts the search after a power loss', () => {
    const lost = stepWith(idle(lit(), ACQUIRE_MS), {}, { powered: false });
    expect(lost.fix).toBe(false);
    expect(receiverStatus(stepWith(lost))).toBe('searching');
  });

  it('does not search while dark', () => {
    expect(idle(dark(lit()), ACQUIRE_MS).fix).toBe(false);
  });
});

describe('shown icons', () => {
  it('lays out the icons of the page, and the overlay icons over it', () => {
    expect(shownIcons({ page: 'home', overlay: false })).toEqual(PAGE_ICONS.home);
    expect(shownIcons({ page: 'home', overlay: true })).toEqual(OVERLAY_ICONS);
  });

  it('fits every page into the key area of the Home page', () => {
    for (const page of PAGES) {
      expect(PAGE_ICONS[page].length, page).toBeLessThanOrEqual(PAGE_ICONS.home.length);
    }
  });

  it('acts on every shown icon and on no icon that is not shown', () => {
    for (const page of PAGES) {
      for (const icon of TOUCH_ICONS) {
        const before = onPage(page);
        const after = tap(before, icon);
        const acted = after.page !== before.page || after.rangeIndex !== before.rangeIndex;
        expect(acted, `${page} ${icon}`).toBe(PAGE_ICONS[page].includes(icon));
      }
    }
  });
});
