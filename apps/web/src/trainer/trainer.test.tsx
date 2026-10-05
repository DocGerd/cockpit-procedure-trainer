// @vitest-environment jsdom
import { STEP_MS } from '@cpt/core';
import type { Aircraft } from '@cpt/core';
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { aircraftRegistry } from '../aircraft-registry';
import { TrainerProvider, useSessionState, useTrainer } from './index';

vi.mock('../aircraft-registry', async (importOriginal) => {
  const { aircraftRegistry } = await importOriginal<typeof import('../aircraft-registry')>();
  const first = aircraftRegistry[0] as Aircraft;
  const second: Aircraft = { ...first, id: 'second', name: { de: 'Zweites', en: 'Second' } };
  return { aircraftRegistry: [first, second] };
});

const [first, second] = aircraftRegistry as [Aircraft, Aircraft];
const firstProcedure = Object.keys(first.procedures)[0] as string;
const firstControl = Object.keys(first.controls)[0] as string;

const useBoth = () => ({ trainer: useTrainer(), snapshot: useSessionState() });
const renderTrainer = () => renderHook(useBoth, { wrapper: TrainerProvider });

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('trainer store', () => {
  it('starts on the picker with the first registry aircraft in Guided', () => {
    const { result } = renderTrainer();
    const { trainer } = result.current;
    expect(trainer.aircraft).toBe(first);
    expect(trainer.screen).toBe('picker');
    expect(trainer.mode).toBe('guided');
    expect(trainer.procedureId).toBeUndefined();
    expect(trainer.session.phase()).toBe(Object.keys(first.phases)[0]);
  });

  it('restores the last aircraft', () => {
    localStorage.setItem('cpt.aircraft', second.id);
    const { result } = renderTrainer();
    expect(result.current.trainer.aircraft).toBe(second);
  });

  it('ignores a stored aircraft the registry does not have', () => {
    localStorage.setItem('cpt.aircraft', 'gone');
    const { result } = renderTrainer();
    expect(result.current.trainer.aircraft).toBe(first);
  });

  it('remembers a selected aircraft across a remount', () => {
    const view = renderTrainer();
    const before = view.result.current.trainer.session;
    act(() => view.result.current.trainer.selectAircraft(second.id));
    expect(view.result.current.trainer.aircraft).toBe(second);
    expect(view.result.current.trainer.session).not.toBe(before);
    view.unmount();
    expect(renderTrainer().result.current.trainer.aircraft).toBe(second);
  });

  it('rejects an aircraft the registry does not have', () => {
    const { result } = renderTrainer();
    expect(() => result.current.trainer.selectAircraft('gone')).toThrow(/gone/);
  });

  it('works when localStorage throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('denied');
    });
    const { result } = renderTrainer();
    act(() => result.current.trainer.selectAircraft(second.id));
    expect(result.current.trainer.aircraft).toBe(second);
  });

  it('starts a procedure and shows the trainer', () => {
    const { result } = renderTrainer();
    act(() => result.current.trainer.setMode('practice'));
    act(() => result.current.trainer.startProcedure(firstProcedure));
    const { trainer, snapshot } = result.current;
    expect(trainer.screen).toBe('trainer');
    expect(trainer.mode).toBe('practice');
    expect(trainer.procedureId).toBe(firstProcedure);
    expect(trainer.session.procedureId()).toBe(firstProcedure);
    expect(snapshot.checklist()?.procedure).toBe(first.procedures[firstProcedure]);
  });

  it('enters Free explore without a procedure', () => {
    const { result } = renderTrainer();
    act(() => result.current.trainer.startProcedure(firstProcedure));
    act(() => result.current.trainer.backToPicker());
    act(() => result.current.trainer.explore());
    const { trainer, snapshot } = result.current;
    expect(trainer.screen).toBe('trainer');
    expect(trainer.mode).toBe('explore');
    expect(trainer.procedureId).toBeUndefined();
    expect(snapshot.checklist()).toBeUndefined();
  });

  it('goes back to the picker', () => {
    const { result } = renderTrainer();
    act(() => result.current.trainer.startProcedure(firstProcedure));
    act(() => result.current.trainer.backToPicker());
    expect(result.current.trainer.screen).toBe('picker');
    expect(result.current.trainer.procedureId).toBeUndefined();
  });

  it('recreates the session and restarts the procedure on reset', () => {
    const { result } = renderTrainer();
    act(() => result.current.trainer.setMode('practice'));
    act(() => result.current.trainer.startProcedure(firstProcedure));
    const before = result.current.trainer.session;
    act(() => result.current.trainer.resetSession());
    const { trainer } = result.current;
    expect(trainer.session).not.toBe(before);
    expect(trainer.session.procedureId()).toBe(firstProcedure);
    expect(trainer.procedureId).toBe(firstProcedure);
    expect(trainer.mode).toBe('practice');
    expect(trainer.screen).toBe('trainer');
  });

  it('recreates the session without a procedure when none was chosen', () => {
    const { result } = renderTrainer();
    const before = result.current.trainer.session;
    act(() => result.current.trainer.resetSession());
    expect(result.current.trainer.session).not.toBe(before);
    expect(result.current.trainer.session.procedureId()).toBeUndefined();
  });
});

describe('session clock', () => {
  it('advances the session by the core step on an interval while mounted', () => {
    vi.useFakeTimers();
    const view = renderTrainer();
    const advance = vi.spyOn(view.result.current.trainer.session, 'advance');
    act(() => vi.advanceTimersByTime(STEP_MS * 3));
    expect(advance).toHaveBeenCalledTimes(3);
    expect(advance).toHaveBeenCalledWith(STEP_MS);
    view.unmount();
    vi.advanceTimersByTime(STEP_MS * 3);
    expect(advance).toHaveBeenCalledTimes(3);
  });

  it('stops advancing a replaced session', () => {
    vi.useFakeTimers();
    const { result } = renderTrainer();
    const advance = vi.spyOn(result.current.trainer.session, 'advance');
    act(() => result.current.trainer.resetSession());
    act(() => vi.advanceTimersByTime(STEP_MS * 3));
    expect(advance).not.toHaveBeenCalled();
  });
});

describe('session state', () => {
  it('re-renders with the new state after a control change', () => {
    const { result } = renderTrainer();
    const { session } = result.current.trainer;
    const before = result.current.snapshot.state().controls[firstControl];
    const other = first.controls[firstControl]?.positions;
    const next = Array.isArray(other) ? other.find((p) => p !== before) : undefined;
    expect(next).toBeDefined();
    act(() => {
      session.set(firstControl, next as string);
    });
    expect(result.current.snapshot.state().controls[firstControl]).toBe(next);
  });

  it('keeps the same snapshot while nothing changes', () => {
    const { result, rerender } = renderTrainer();
    const before = result.current.snapshot;
    rerender();
    expect(result.current.snapshot).toBe(before);
  });

  it('exposes phase, status, guards and failures', () => {
    const { result } = renderTrainer();
    const { snapshot, trainer } = result.current;
    expect(snapshot.phase()).toBe(trainer.session.phase());
    expect(snapshot.status()).toEqual({ kind: 'running' });
    expect(snapshot.guards()).toBe(trainer.session.guards());
    expect(snapshot.failures()).toBe(trainer.session.failures());
  });
});
