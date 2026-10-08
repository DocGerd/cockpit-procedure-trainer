import { createSession, flightLegs, MAX_STEPS, procedureOf, STEP_MS } from '@cpt/core';
import type { Aircraft, ControlDefinition, ProcedureItem, Session } from '@cpt/core';
import { expect } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';
import { checklistPane, copy, dockedUnit } from './trainer';

type Item = ProcedureItem<unknown>;
type Action = Extract<Item, { type: 'action' }>;

/** What the page does for one item, and how long the session runs for it. */
type Step =
  | { readonly kind: 'preset' }
  | { readonly kind: 'confirm' }
  | { readonly kind: 'verify' }
  | { readonly kind: 'check'; readonly waitMs: number }
  | {
      readonly kind: 'set';
      readonly control: string;
      readonly position: string | number;
      readonly waitMs: number;
    }
  | {
      readonly kind: 'hold';
      readonly control: string;
      readonly position: string | number;
      readonly holdMs: number;
    }
  | { readonly kind: 'device'; readonly control: string; readonly position: string | number };

export type Leg = { readonly id: string; readonly steps: readonly Step[] };

const isPressed = (definition: ControlDefinition | undefined, position: string | number) =>
  definition?.kind === 'momentary'
    ? position === definition.positions[1]
    : definition?.kind === 'rotary' &&
      typeof position === 'string' &&
      definition.springBack !== undefined &&
      Object.hasOwn(definition.springBack, position);

function runUntil(session: Session, done: () => boolean): number {
  let steps = 0;
  while (!done()) {
    if (steps >= MAX_STEPS) throw new Error('the shadow session never met the condition');
    session.advance(STEP_MS);
    steps++;
  }
  return steps * STEP_MS;
}

/** Plays an item on the shadow session the way `walkProcedure` does, and says how. */
function shadowStep(session: Session, aircraft: Aircraft, item: Item, index: number): Step {
  const completed = () => session.checklist()?.completed.includes(index) ?? true;
  if (item.type === 'confirm') {
    session.checkOff();
    return { kind: 'confirm' };
  }
  if (item.type === 'check') {
    const waitMs = runUntil(session, () => item.condition(session.state()));
    session.checkOff(item.response?.reading(session.state()));
    return { kind: 'check', waitMs };
  }
  // A flow item already in place ticks when the leg starts; the pilot has nothing to do for it.
  if (item.flow === true && completed()) return { kind: 'preset' };
  const definition = aircraft.controls[item.control];
  const { control, position } = item;
  if (!isPressed(definition, position)) {
    if (session.state().controls[control] === position) {
      session.checkOff();
      return { kind: 'verify' };
    }
    session.set(control, position);
    return { kind: 'set', control, position, waitMs: runUntil(session, completed) };
  }
  session.press(control, definition?.kind === 'momentary' ? undefined : position);
  const holdMs = item.holdUntil === undefined ? 0 : runUntil(session, completed);
  session.release(control);
  return { kind: 'hold', control, position, holdMs };
}

const isDeviceItem = (aircraft: Aircraft, item: Item): item is Action =>
  item.type === 'action' && !Object.hasOwn(aircraft.controls, item.control);

const readsDevice = (aircraft: Aircraft, item: Item) =>
  item.type === 'check' &&
  'control' in item.target &&
  !Object.hasOwn(aircraft.controls, item.target.control);

/**
 * The aircraft's full flight, played first on a session in this process: it times each check
 * and hold, which the page cannot tell. Device controls run only in the page. A leg of nothing
 * but device items is taken there as it comes, its checks met at once; in a leg that also moves
 * the aircraft's own controls, only the device action and the check on a device control are.
 */
export function flightPlan(aircraft: Aircraft): readonly Leg[] {
  const legs = flightLegs(aircraft);
  const first = legs[0];
  if (first === undefined) throw new Error(`${aircraft.id} has no legs`);
  const shadow = createSession(
    { ...aircraft, devices: {} },
    { phase: procedureOf(aircraft, first).startPhase },
  );
  return legs.map((id) => {
    const { items } = procedureOf(aircraft, id);
    const onlyDevices =
      items.some((item) => isDeviceItem(aircraft, item)) &&
      !items.some((item) => item.type === 'action' && !isDeviceItem(aircraft, item));
    if (onlyDevices) {
      return {
        id,
        steps: items.map((item): Step => {
          if (item.type === 'confirm') return { kind: 'confirm' };
          if (item.type === 'check') return { kind: 'check', waitMs: 0 };
          return { kind: 'device', control: item.control, position: item.position };
        }),
      };
    }
    shadow.startLeg(id);
    const steps = items.map((item, index): Step => {
      if (isDeviceItem(aircraft, item)) {
        shadow.checkOff();
        return { kind: 'device', control: item.control, position: item.position };
      }
      if (readsDevice(aircraft, item)) {
        shadow.checkOff();
        return { kind: 'check', waitMs: 0 };
      }
      return shadowStep(shadow, aircraft, item, index);
    });
    if (!shadow.checklist()?.done) throw new Error(`the shadow did not finish ${id}`);
    return { id, steps };
  });
}

function shownPosition(definition: ControlDefinition, position: string | number): string {
  if (definition.kind !== 'breaker') return String(position);
  return position === 'in' ? 'In' : 'Pulled';
}

/** Steps a notched control toward the target, never onto a detent beyond it. */
async function stepSlider(slider: Locator, steps: readonly string[], target: string) {
  await slider.focus();
  const last = steps.length - 1;
  const read = async () => {
    const shown = (await slider.getAttribute('aria-valuetext')) ?? '';
    return {
      shown,
      at: steps.indexOf(shown),
      now: Number(await slider.getAttribute('aria-valuenow')),
    };
  };
  // Up always raises aria-valuenow, which counts along the declared order or against it.
  let along: boolean | undefined;
  for (let presses = 0; presses <= 2 * steps.length; presses++) {
    const { shown, at, now } = await read();
    if (shown === target) return;
    if (now !== last - at) along = true;
    else if (now !== at) along = false;
    if (along === undefined) {
      await slider.press('ArrowUp');
      along = (await read()).at > at;
      continue;
    }
    const goal = along ? steps.indexOf(target) : last - steps.indexOf(target);
    await slider.press(goal > now ? 'ArrowUp' : 'ArrowDown');
  }
  await expect(slider).toHaveAttribute('aria-valuetext', target);
}

async function setPosition(page: Page, aircraft: Aircraft, id: string, position: string | number) {
  const definition = aircraft.controls[id];
  if (!definition) throw new Error(`${aircraft.id} has no control ${id}`);
  const root = page.locator(`[data-placement="${id}"]`);
  const name = definition.name.en;

  const group = root.getByRole('radiogroup');
  if ((await group.count()) > 0) {
    await group.getByRole('radio', { name: String(position), exact: true }).click();
    return;
  }
  const breaker = root.getByRole('switch');
  if ((await breaker.count()) > 0) {
    if ((await breaker.getAttribute('aria-checked')) !== String(position === 'in')) {
      await breaker.click();
    }
    return;
  }
  if (definition.kind === 'guarded') {
    const guard = root.locator('[aria-expanded]');
    if ((await guard.getAttribute('aria-expanded')) !== 'true') await guard.click();
  }
  const slider = root.getByRole('slider');
  if ((await slider.count()) > 0) {
    if (definition.positions === 'continuous') {
      await slider.focus();
      await slider.press(position === 0 ? 'Home' : 'End');
    } else {
      const springs = definition.kind === 'rotary' ? (definition.springBack ?? {}) : {};
      const steps = definition.positions.filter((id) => !Object.hasOwn(springs, id));
      await stepSlider(slider, steps, String(position));
    }
    return;
  }
  const wanted = `${name}: ${shownPosition(definition, position)}`;
  const cycle = root
    .locator('button.cpt-artwork-input:not(.cpt-artwork-spring):not(.cpt-artwork-guard)')
    .first();
  for (let clicks = 0; clicks <= (definition.positions as readonly string[]).length; clicks++) {
    if ((await cycle.getAttribute('aria-label')) === wanted) return;
    await cycle.click();
  }
  await expect(cycle).toHaveAttribute('aria-label', wanted);
}

/** Presses a device key in the dock, or verifies a selection key that is already selected. */
export async function pressDevice(
  page: Page,
  aircraft: Aircraft,
  control: string,
  position: string | number,
  verify: Locator,
) {
  const [install = '', local = ''] = control.split('.');
  const deviceId = aircraft.devices?.[install]?.device;
  if (deviceId === undefined) throw new Error(`${aircraft.id} installs no ${install}`);
  const unit = await dockedUnit(page, install, deviceId);
  const exact = unit.locator(`[data-control="${local}"][data-position="${String(position)}"]`);
  if ((await exact.count()) === 0) {
    await unit.locator(`[data-control="${local}"]`).click();
  } else if ((await exact.getAttribute('aria-pressed')) === 'true') {
    await verify.click();
  } else {
    await exact.click();
  }
}

const doneOrSummary = (page: Page, id: string, aircraft: Aircraft, at: number) => {
  const title = aircraft.procedures[id]?.title.en ?? id;
  const pane = checklistPane(page);
  return expect(
    pane
      .locator('li.checklist-item')
      .nth(at)
      .getByRole('img', { name: /^(Done|Deviated)$/ })
      .or(
        page.getByRole('heading', {
          level: 1,
          name: copy.checklist.summaryTitle.replace('{title}', title),
        }),
      )
      .first(),
  ).toBeVisible();
};

/** Works the running leg in the page, step by step as the plan played it. */
export async function flyLeg(page: Page, aircraft: Aircraft, leg: Leg) {
  const { items } = procedureOf(aircraft, leg.id);
  const pane = checklistPane(page);
  for (const [at, step] of leg.steps.entries()) {
    const item = items[at];
    if (!item) throw new Error(`${leg.id} has no item ${at}`);
    if (step.kind === 'preset') continue;
    const row = pane.locator('[aria-current="step"]');
    await expect(row, `${leg.id} item ${at + 1}`).toContainText(item.text.en);
    const verify = row.getByRole('button', { name: copy.checklist.verify, exact: true });
    if (step.kind === 'confirm') {
      await row.getByRole('button', { name: copy.checklist.confirm, exact: true }).click();
    } else if (step.kind === 'check') {
      if (step.waitMs > 0) await page.clock.runFor(step.waitMs);
      await row.getByRole('button', { name: copy.checklist.checkOff, exact: true }).click();
    } else if (step.kind === 'verify') {
      await verify.click();
    } else if (step.kind === 'set') {
      await setPosition(page, aircraft, step.control, step.position);
      if (step.waitMs > 0) await page.clock.runFor(step.waitMs);
    } else if (step.kind === 'device') {
      await pressDevice(page, aircraft, step.control, step.position, verify);
    } else {
      const definition = aircraft.controls[step.control];
      const name = definition?.name.en ?? step.control;
      const target = page
        .locator(`[data-placement="${step.control}"]`)
        .getByRole('button', { name: `${name}: ${String(step.position)}`, exact: true })
        .or(
          page
            .locator(`[data-placement="${step.control}"]`)
            .getByRole('button', { name, exact: true }),
        )
        .first();
      await target.focus();
      await page.keyboard.down('Enter');
      if (step.holdMs > 0) await page.clock.runFor(step.holdMs);
      await doneOrSummary(page, leg.id, aircraft, at);
      await page.keyboard.up('Enter');
    }
    await doneOrSummary(page, leg.id, aircraft, at);
  }
}
