// @vitest-environment jsdom
import { act, cleanup, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithLanguage } from '../i18n/test-utils';
import { TrainerProvider, useTrainer } from '../trainer';
import type { Mode, Trainer } from '../trainer';
import { ChecklistAnnouncer } from './ChecklistAnnouncer';
import { ChecklistPane } from './index';

vi.mock('../aircraft-registry', async () => ({
  aircraftRegistry: [(await import('./test-aircraft')).fixture],
}));

const flow = 'flow';
const texts = ['Master on', 'Fuel flowing', 'Walk-around done', 'Pump on'];

let trainer: Trainer;
function Probe() {
  trainer = useTrainer();
  return null;
}

function renderPane() {
  return renderWithLanguage(
    <TrainerProvider>
      <Probe />
      <ChecklistPane />
    </TrainerProvider>,
  );
}

function start(mode: Mode) {
  act(() => {
    trainer.setMode(mode);
    trainer.startProcedure(flow);
  });
}

const operate = (id: string, position: string) =>
  act(() => {
    trainer.session.set(id, position);
  });

const checkOff = () =>
  act(() => {
    trainer.session.checkOff();
  });

const rows = () => within(screen.getByRole('list')).getAllByRole('listitem');
const states = () => rows().map((row) => within(row).getByRole('img').getAttribute('aria-label'));
const hideOption = () => screen.getByRole('checkbox', { name: 'Hide upcoming items' });
const showMe = () => screen.queryByRole('button', { name: 'Show me' });
const press = (element: HTMLElement | null) => userEvent.click(element as HTMLElement);

beforeEach(() => {
  localStorage.clear();
});

afterEach(cleanup);

describe('Practice recall', () => {
  it('keeps every item readable while the option is off', () => {
    renderPane();
    start('practice');
    for (const item of texts) expect(screen.getByText(item)).toBeTruthy();
    expect(hideOption()).toHaveProperty('checked', false);
  });

  it('keeps upcoming and current item text out of the DOM and done items readable', async () => {
    renderPane();
    start('practice');
    await press(hideOption());
    for (const item of texts) expect(screen.queryByText(item)).toBeNull();
    expect(states()).toEqual(['Current']);

    operate('master', 'on');
    expect(screen.getByText('Master on')).toBeTruthy();
    for (const item of texts.slice(1)) expect(screen.queryByText(item)).toBeNull();
    expect(states()).toEqual(['Done', 'Current']);
  });

  it('is offered in Practice only', () => {
    renderPane();
    start('guided');
    expect(screen.queryByRole('checkbox', { name: 'Hide upcoming items' })).toBeNull();
    expect(showMe()).toBeNull();
  });

  it('remembers the option for the next visit', async () => {
    const first = renderPane();
    start('practice');
    await press(hideOption());
    first.unmount();
    renderPane();
    start('practice');
    expect(hideOption()).toHaveProperty('checked', true);
    expect(screen.queryByText('Master on')).toBeNull();
  });

  it('reveals the current item with Show me, once per item', async () => {
    renderPane();
    start('practice');
    await press(hideOption());
    await press(showMe());
    expect(screen.getByText('Master on')).toBeTruthy();
    expect(showMe()).toBeNull();
    operate('master', 'on');
    expect(screen.queryByText('Fuel flowing')).toBeNull();
    expect(showMe()).toBeTruthy();
  });

  it('offers Show me without the option too', async () => {
    renderPane();
    start('practice');
    await press(showMe());
    expect(showMe()).toBeNull();
    expect(trainer.assisted).toEqual([0]);
  });

  it('adds each Show me to the debrief count and lists it', async () => {
    renderPane();
    start('practice');
    await press(hideOption());
    await press(showMe());
    operate('master', 'on');
    act(() => trainer.session.retryItem());
    checkOff();
    await press(showMe());
    checkOff();
    operate('pump', 'on');
    expect(screen.getByText('Assists').nextElementSibling?.textContent).toBe('3');
    const list = screen.getByRole('region', { name: 'Shown with Show me' });
    expect(
      within(list)
        .getAllByRole('listitem')
        .map((row) => row.textContent),
    ).toEqual(['Item 1Master on', 'Item 3Walk-around done']);
  });

  it('lists no Show me section when none was used', () => {
    renderPane();
    start('practice');
    operate('master', 'on');
    checkOff();
    checkOff();
    operate('pump', 'on');
    expect(screen.queryByRole('region', { name: 'Shown with Show me' })).toBeNull();
    expect(screen.getByText('Assists').nextElementSibling?.textContent).toBe('0');
  });

  it('starts every run with no assists', async () => {
    renderPane();
    start('practice');
    await press(showMe());
    act(() => trainer.startProcedure(flow));
    expect(trainer.assisted).toEqual([]);
    expect(showMe()).toBeTruthy();
  });

  it('keeps the deviation banner off in Practice', async () => {
    renderPane();
    start('practice');
    operate('avionics', 'on');
    await press(showMe());
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('announces a withheld item by its number only', () => {
    renderWithLanguage(
      <TrainerProvider>
        <Probe />
        <ChecklistAnnouncer />
      </TrainerProvider>,
    );
    start('practice');
    act(() => trainer.setRecall(true));
    operate('master', 'on');
    expect(document.querySelector('.checklist-announcer')?.textContent).toBe('Item 2 of 4');
  });
});
