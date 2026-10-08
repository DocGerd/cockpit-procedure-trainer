// @vitest-environment jsdom
import { phaseOrder, STEP_MS } from '@cpt/core';
import { act, cleanup, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readHistory } from '../storage';
import { LanguageProvider } from '../i18n/language';
import type { Language } from '../i18n/language';
import {
  shallowEqual,
  TrainerProvider,
  useLostProgressText,
  useProgressAtRisk,
  useSessionState,
  useTrainer,
} from './index';
import { SURPRISE_MAX_MS } from './scenarios';
import { testAircraft } from './test-aircraft';

vi.mock('../aircraft-registry', async () => ({
  aircraftRegistry: (await import('./test-aircraft')).testAircraft,
}));

const [first, second] = testAircraft;
const firstProcedure = 'powerUp';
const firstControl = 'master';

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
    expect(trainer.session.phase()).toBe(phaseOrder[0]);
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

  it('enters Free explore from the picker and shows the trainer', () => {
    const { result } = renderTrainer();
    act(() => result.current.trainer.setMode('explore'));
    const { trainer, snapshot } = result.current;
    expect(trainer.screen).toBe('trainer');
    expect(trainer.mode).toBe('explore');
    expect(trainer.procedureId).toBeUndefined();
    expect(snapshot.checklist()).toBeUndefined();
  });

  it('ends the running procedure when switching to Free explore', () => {
    const { result } = renderTrainer();
    act(() => result.current.trainer.startProcedure(firstProcedure));
    act(() => result.current.trainer.setMode('explore'));
    const { trainer, snapshot } = result.current;
    expect(trainer.mode).toBe('explore');
    expect(trainer.procedureId).toBeUndefined();
    expect(trainer.session.procedureId()).toBeUndefined();
    expect(snapshot.checklist()).toBeUndefined();
  });

  it.each(['guided', 'practice'] as const)(
    'restarts the last procedure fresh in %s when leaving Free explore',
    (mode) => {
      const { result } = renderTrainer();
      act(() => result.current.trainer.startProcedure(firstProcedure));
      act(() => result.current.trainer.session.set(firstControl, 'on'));
      act(() => result.current.trainer.setMode('explore'));
      act(() => result.current.trainer.setMode(mode));
      const { trainer, snapshot } = result.current;
      expect(trainer.mode).toBe(mode);
      expect(trainer.screen).toBe('trainer');
      expect(trainer.procedureId).toBe(firstProcedure);
      expect(trainer.session.procedureId()).toBe(firstProcedure);
      expect(snapshot.checklist()?.completed).toEqual([]);
      expect(snapshot.state().controls[firstControl]).toBe('off');
    },
  );

  it.each(['guided', 'practice'] as const)(
    'returns to the picker in %s when Free explore was entered without a procedure',
    (mode) => {
      const { result } = renderTrainer();
      act(() => result.current.trainer.setMode('explore'));
      act(() => result.current.trainer.setMode(mode));
      const { trainer } = result.current;
      expect(trainer.screen).toBe('picker');
      expect(trainer.mode).toBe(mode);
      expect(trainer.procedureId).toBeUndefined();
      expect(trainer.session.procedureId()).toBeUndefined();
    },
  );

  it('forgets the last procedure when going back to the picker or choosing another aircraft', () => {
    const { result } = renderTrainer();
    act(() => result.current.trainer.startProcedure(firstProcedure));
    act(() => result.current.trainer.backToPicker());
    act(() => result.current.trainer.setMode('explore'));
    act(() => result.current.trainer.setMode('guided'));
    expect(result.current.trainer.screen).toBe('picker');

    act(() => result.current.trainer.startProcedure(firstProcedure));
    act(() => result.current.trainer.selectAircraft(second.id));
    act(() => result.current.trainer.setMode('explore'));
    act(() => result.current.trainer.setMode('guided'));
    expect(result.current.trainer.screen).toBe('picker');
    expect(result.current.trainer.procedureId).toBeUndefined();
  });

  it('resets the cockpit to the start of the phase when Free explore ends the procedure', () => {
    const { result } = renderTrainer();
    act(() => result.current.trainer.startProcedure(firstProcedure));
    act(() => result.current.trainer.session.set(firstControl, 'on'));
    expect(result.current.snapshot.state().controls[firstControl]).toBe('on');
    act(() => result.current.trainer.setMode('explore'));
    expect(result.current.snapshot.state().controls[firstControl]).toBe('off');
  });

  describe('the viewed procedure', () => {
    it('follows the running procedure, then the last one in Free explore, else the first', () => {
      const { result } = renderTrainer();
      expect(result.current.trainer.viewedProcedureId).toBe(firstProcedure);
      act(() => result.current.trainer.selectAircraft(second.id));
      act(() => result.current.trainer.startProcedure('fire'));
      expect(result.current.trainer.viewedProcedureId).toBe('fire');
      act(() => result.current.trainer.setMode('explore'));
      expect(result.current.trainer.viewedProcedureId).toBe('fire');
      act(() => result.current.trainer.backToPicker());
      expect(result.current.trainer.viewedProcedureId).toBe(firstProcedure);
    });

    it('is a selection that leaves the running session alone', () => {
      const { result } = renderTrainer();
      act(() => result.current.trainer.selectAircraft(second.id));
      act(() => result.current.trainer.startProcedure(firstProcedure));
      const session = result.current.trainer.session;
      act(() => result.current.trainer.viewProcedure('fire'));
      expect(result.current.trainer.viewedProcedureId).toBe('fire');
      expect(result.current.trainer.procedureId).toBe(firstProcedure);
      expect(result.current.trainer.session).toBe(session);
      expect(session.failures().size).toBe(0);
    });

    it('is dropped on a new start, a mode switch through Free explore and an aircraft change', () => {
      const { result } = renderTrainer();
      act(() => result.current.trainer.selectAircraft(second.id));
      act(() => result.current.trainer.startProcedure(firstProcedure));
      act(() => result.current.trainer.viewProcedure('fire'));
      act(() => result.current.trainer.startProcedure(firstProcedure));
      expect(result.current.trainer.viewedProcedureId).toBe(firstProcedure);
      act(() => result.current.trainer.viewProcedure('fire'));
      act(() => result.current.trainer.setMode('practice'));
      expect(result.current.trainer.viewedProcedureId).toBe('fire');
      act(() => result.current.trainer.setMode('explore'));
      expect(result.current.trainer.viewedProcedureId).toBe(firstProcedure);
      act(() => result.current.trainer.viewProcedure('fire'));
      act(() => result.current.trainer.selectAircraft(first.id));
      expect(result.current.trainer.viewedProcedureId).toBe(firstProcedure);
    });
  });

  it('keeps the procedure when switching between Guided and Practice', () => {
    const { result } = renderTrainer();
    act(() => result.current.trainer.startProcedure(firstProcedure));
    act(() => result.current.trainer.setMode('practice'));
    expect(result.current.trainer.procedureId).toBe(firstProcedure);
    expect(result.current.trainer.screen).toBe('trainer');
  });

  it('drops the procedure with a newly selected aircraft', () => {
    const { result } = renderTrainer();
    act(() => result.current.trainer.startProcedure(firstProcedure));
    act(() => result.current.trainer.selectAircraft(second.id));
    expect(result.current.trainer.procedureId).toBeUndefined();
    expect(result.current.trainer.session.procedureId()).toBeUndefined();
  });

  it('goes back to the picker and ends the procedure', () => {
    const { result } = renderTrainer();
    act(() => result.current.trainer.startProcedure(firstProcedure));
    act(() => result.current.trainer.backToPicker());
    expect(result.current.trainer.screen).toBe('picker');
    expect(result.current.trainer.procedureId).toBeUndefined();
    expect(result.current.trainer.session.procedureId()).toBeUndefined();
  });

  it('jumps to a phase, which ends the procedure', () => {
    const { result } = renderTrainer();
    act(() => result.current.trainer.startProcedure(firstProcedure));
    act(() => result.current.trainer.jumpToPhase('cruise'));
    const { trainer, snapshot } = result.current;
    expect(snapshot.phase()).toBe('cruise');
    expect(snapshot.state().controls).toEqual({ master: 'on', pump: 'on' });
    expect(trainer.procedureId).toBeUndefined();
    expect(trainer.screen).toBe('trainer');
  });

  it('follows a procedure the session ends on its own', () => {
    const { result } = renderTrainer();
    act(() => result.current.trainer.startProcedure(firstProcedure));
    act(() => result.current.trainer.session.jumpToPhase('cruise'));
    expect(result.current.trainer.procedureId).toBeUndefined();
  });

  it('does not restart a procedure that a phase jump ended', () => {
    const { result } = renderTrainer();
    act(() => result.current.trainer.startProcedure(firstProcedure));
    act(() => result.current.trainer.jumpToPhase('cruise'));
    act(() => result.current.trainer.resetSession());
    expect(result.current.trainer.session.procedureId()).toBeUndefined();
    expect(result.current.trainer.procedureId).toBeUndefined();
    expect(result.current.trainer.session.phase()).toBe('cruise');
  });

  it('keeps the current phase on reset when no procedure is chosen', () => {
    const { result } = renderTrainer();
    act(() => result.current.trainer.jumpToPhase('cruise'));
    act(() => result.current.trainer.session.set('pump', 'off'));
    act(() => result.current.trainer.resetSession());
    const { session } = result.current.trainer;
    expect(session.phase()).toBe('cruise');
    expect(session.state().controls).toEqual({ master: 'on', pump: 'on' });
  });

  it('resets the session of the selected aircraft', () => {
    const { result } = renderTrainer();
    act(() => result.current.trainer.selectAircraft(second.id));
    act(() => result.current.trainer.startProcedure('fire'));
    act(() => result.current.trainer.resetSession());
    expect(result.current.trainer.aircraft).toBe(second);
    expect(result.current.trainer.session.procedureId()).toBe('fire');
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

describe('surprise failure', () => {
  const startSurprise = () => {
    const view = renderTrainer();
    act(() => view.result.current.trainer.selectAircraft(second.id));
    act(() => view.result.current.trainer.startSurprise('parking'));
    return view;
  };

  it('starts in Practice with no procedure, keeping the failure out of the viewed checklist', () => {
    const { result } = startSurprise();
    const { trainer, snapshot } = result.current;
    expect(trainer.screen).toBe('trainer');
    expect(trainer.mode).toBe('practice');
    expect(trainer.procedureId).toBeUndefined();
    expect(trainer.viewedProcedureId).toBe('powerUp');
    expect(snapshot.scenario()).toMatchObject({ phase: 'parking', failure: 'fire' });
    expect(snapshot.failures().size).toBe(0);
  });

  it('runs the checklist the pilot takes and follows it as the running procedure', () => {
    const { result } = startSurprise();
    act(() => result.current.trainer.viewProcedure('fire'));
    act(() => result.current.trainer.takeChecklist('fire'));
    const { trainer, snapshot } = result.current;
    expect(trainer.procedureId).toBe('fire');
    expect(trainer.viewedProcedureId).toBe('fire');
    expect(snapshot.scenario()).toMatchObject({ chosen: 'fire', matched: true });
    expect([...snapshot.failures()]).toEqual(['fire']);
  });

  it('is ended by going back to the picker or into Free explore', () => {
    const { result } = startSurprise();
    act(() => result.current.trainer.backToPicker());
    expect(result.current.snapshot.scenario()).toBeUndefined();
    act(() => result.current.trainer.startSurprise('parking'));
    act(() => result.current.trainer.setMode('explore'));
    expect(result.current.snapshot.scenario()).toBeUndefined();
  });

  it.each([
    ['restart', (trainer: ReturnType<typeof useTrainer>) => trainer.restart()],
    ['reset', (trainer: ReturnType<typeof useTrainer>) => trainer.resetSession()],
  ])('starts a new surprise, not the chosen checklist, on %s after the choice', (_, again) => {
    const { result } = startSurprise();
    act(() => result.current.trainer.session.advance(SURPRISE_MAX_MS));
    act(() => result.current.trainer.takeChecklist('powerUp'));
    act(() => again(result.current.trainer));
    const { trainer } = result.current;
    expect(trainer.procedureId).toBeUndefined();
    expect(trainer.mode).toBe('practice');
    expect(trainer.session.scenario()).toMatchObject({ phase: 'parking', failure: 'fire' });
    expect(trainer.session.scenario()?.chosen).toBeUndefined();
    expect(trainer.session.failures().size).toBe(0);
  });

  it('starts a new surprise when coming back from Free explore', () => {
    const { result } = startSurprise();
    act(() => result.current.trainer.session.advance(SURPRISE_MAX_MS));
    act(() => result.current.trainer.takeChecklist('powerUp'));
    act(() => result.current.trainer.setMode('explore'));
    act(() => result.current.trainer.setMode('guided'));
    const { trainer } = result.current;
    expect(trainer.screen).toBe('trainer');
    expect(trainer.mode).toBe('practice');
    expect(trainer.procedureId).toBeUndefined();
    expect(trainer.session.scenario()).toMatchObject({ phase: 'parking' });
  });

  it('ends the drill with a phase jump, so a restart runs the checklist again', () => {
    const { result } = startSurprise();
    act(() => result.current.trainer.jumpToPhase('parking'));
    expect(result.current.trainer.surprisePhase).toBeUndefined();
    act(() => result.current.trainer.startProcedure('powerUp'));
    act(() => result.current.trainer.restart());
    expect(result.current.trainer.procedureId).toBe('powerUp');
  });

  it('keeps a wrong answer out of the run history', () => {
    const { result } = startSurprise();
    act(() => result.current.trainer.session.advance(SURPRISE_MAX_MS));
    act(() => result.current.trainer.takeChecklist('powerUp'));
    act(() => {
      result.current.trainer.session.set('master', 'on');
      result.current.trainer.session.set('pump', 'on');
    });
    expect(result.current.snapshot.checklist()?.done).toBe(true);
    expect(readHistory(second.id)).toEqual({});
  });

  it('starts a new surprise in the same phase on reset', () => {
    const { result } = startSurprise();
    const before = result.current.trainer.session;
    act(() => result.current.trainer.resetSession());
    const { session } = result.current.trainer;
    expect(session).not.toBe(before);
    expect(session.scenario()).toMatchObject({ phase: 'parking', failure: 'fire' });
    expect(session.procedureId()).toBeUndefined();
  });
});

describe('shallowEqual', () => {
  it('compares plain objects and arrays one level deep', () => {
    const shared = {};
    expect(shallowEqual({ a: 1, b: shared }, { a: 1, b: shared })).toBe(true);
    expect(shallowEqual({ a: 1 }, { a: 2 })).toBe(false);
    expect(shallowEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false);
    expect(shallowEqual([1, shared], [1, shared])).toBe(true);
    expect(shallowEqual([1], { 0: 1 })).toBe(false);
    expect(shallowEqual({ a: {} }, { a: {} })).toBe(false);
  });

  it('compares Sets, Maps and class instances by identity', () => {
    const set = new Set(['x']);
    expect(shallowEqual(set, set)).toBe(true);
    expect(shallowEqual(new Set(), new Set(['x']))).toBe(false);
    expect(shallowEqual(new Set(['x']), new Set(['x']))).toBe(false);
    expect(shallowEqual(new Map(), new Map([['k', 1]]))).toBe(false);
    expect(shallowEqual(new Date(0), new Date(0))).toBe(false);
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
    expect(result.current.snapshot.state().controls[firstControl]).toBe('off');
    act(() => {
      session.set(firstControl, 'on');
    });
    expect(result.current.snapshot.state().controls[firstControl]).toBe('on');
  });

  it('keeps the same snapshot while nothing changes', () => {
    const { result, rerender } = renderTrainer();
    const before = result.current.snapshot;
    rerender();
    expect(result.current.snapshot).toBe(before);
  });

  it('re-renders a whole-snapshot consumer on every tick', () => {
    vi.useFakeTimers();
    let renders = 0;
    renderHook(
      () => {
        renders++;
        return useSessionState();
      },
      { wrapper: TrainerProvider },
    );
    const before = renders;
    act(() => vi.advanceTimersByTime(STEP_MS * 3));
    expect(renders).toBeGreaterThan(before);
  });

  it('does not re-render a selector consumer on a tick that leaves its slice alone', () => {
    vi.useFakeTimers();
    let phaseRenders = 0;
    let objectRenders = 0;
    const phase = renderHook(
      () => {
        phaseRenders++;
        return useSessionState((s) => s.phase());
      },
      { wrapper: TrainerProvider },
    );
    const controls = renderHook(
      () => {
        objectRenders++;
        return useSessionState((s) => ({ master: s.state().controls[firstControl] }));
      },
      { wrapper: TrainerProvider },
    );
    const phaseBefore = phaseRenders;
    const objectBefore = objectRenders;
    act(() => vi.advanceTimersByTime(STEP_MS * 3));
    expect(phaseRenders).toBe(phaseBefore);
    expect(objectRenders).toBe(objectBefore);
    expect(phase.result.current).toBe('parking');
    expect(controls.result.current).toEqual({ master: 'off' });
  });

  it('re-renders a selector consumer when its slice changes', () => {
    const { result } = renderHook(
      () => ({
        trainer: useTrainer(),
        master: useSessionState((s) => s.state().controls[firstControl]),
      }),
      { wrapper: TrainerProvider },
    );
    act(() => {
      result.current.trainer.session.set(firstControl, 'on');
    });
    expect(result.current.master).toBe('on');
  });

  it('applies a new selector without waiting for a session change', () => {
    const { result, rerender } = renderHook(
      ({ id }: { id: string }) => ({
        trainer: useTrainer(),
        position: useSessionState((s) => s.state().controls[id]),
      }),
      { wrapper: TrainerProvider, initialProps: { id: firstControl } },
    );
    act(() => {
      result.current.trainer.session.set(firstControl, 'on');
    });
    expect(result.current.position).toBe('on');
    rerender({ id: 'pump' });
    expect(result.current.position).toBe('off');
  });

  it('re-renders a failures consumer when a failure is injected', () => {
    const { result } = renderHook(
      () => ({ trainer: useTrainer(), failures: useSessionState((s) => s.failures()) }),
      { wrapper: TrainerProvider },
    );
    act(() => result.current.trainer.selectAircraft(second.id));
    expect(result.current.failures.size).toBe(0);
    act(() => result.current.trainer.startProcedure('fire'));
    expect([...result.current.failures]).toEqual(['fire']);
  });

  it('uses a custom equality to keep a selection', () => {
    vi.useFakeTimers();
    let renders = 0;
    renderHook(
      () => {
        renders++;
        return useSessionState(
          (s) => ({ nested: [s.phase()] }),
          (a, b) => a.nested[0] === b.nested[0],
        );
      },
      { wrapper: TrainerProvider },
    );
    const before = renders;
    act(() => vi.advanceTimersByTime(STEP_MS * 3));
    expect(renders).toBe(before);
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

describe('progress at risk', () => {
  const useRisk = () => ({ trainer: useTrainer(), risk: useProgressAtRisk() });
  const renderRisk = () => renderHook(useRisk, { wrapper: TrainerProvider });

  it('is nothing while no procedure runs', () => {
    const { result } = renderRisk();
    expect(result.current.risk).toBeUndefined();
  });

  it('is nothing until an item is done or a deviation is recorded', () => {
    const { result } = renderRisk();
    act(() => result.current.trainer.startProcedure(firstProcedure));
    expect(result.current.risk).toBeUndefined();
  });

  it('counts the items done and the deviations', () => {
    const { result } = renderRisk();
    act(() => result.current.trainer.startProcedure(firstProcedure));
    act(() => result.current.trainer.session.set('master', 'on'));
    expect(result.current.risk).toEqual({ done: 1, total: 2, deviations: 0 });
  });

  it('counts a deviation although no item is done', () => {
    const { result } = renderRisk();
    act(() => result.current.trainer.startProcedure(firstProcedure));
    act(() => result.current.trainer.session.set('pump', 'on'));
    expect(result.current.risk).toEqual({ done: 0, total: 2, deviations: 1 });
  });

  it('is nothing once the procedure is finished', () => {
    const { result } = renderRisk();
    act(() => result.current.trainer.startProcedure(firstProcedure));
    act(() => result.current.trainer.session.set('master', 'on'));
    act(() => result.current.trainer.session.set('pump', 'on'));
    expect(result.current.risk).toBeUndefined();
  });

  it('is nothing after a phase jump ended the procedure', () => {
    const { result } = renderRisk();
    act(() => result.current.trainer.startProcedure(firstProcedure));
    act(() => result.current.trainer.session.set('master', 'on'));
    act(() => result.current.trainer.jumpToPhase('cruise'));
    expect(result.current.risk).toBeUndefined();
  });
});

describe('lost progress text', () => {
  const renderText = (language: Language) =>
    renderHook(() => ({ trainer: useTrainer(), text: useLostProgressText() }), {
      wrapper: ({ children }: { children: ReactNode }) => (
        <LanguageProvider initial={language}>
          <TrainerProvider>{children}</TrainerProvider>
        </LanguageProvider>
      ),
    });
  const run = (language: Language) => {
    const { result } = renderText(language);
    act(() => result.current.trainer.startProcedure(firstProcedure));
    act(() => result.current.trainer.session.set('master', 'on'));
    return result;
  };

  it('is empty while no progress is at risk', () => {
    expect(renderText('en').result.current.text).toBe('');
  });

  it('counts the items done, without a deviation clause when there are none', () => {
    expect(run('en').current.text).toBe('Progress lost: 1 of 2 items done.');
    expect(run('de').current.text).toBe('Verlorener Fortschritt: 1 von 2 Punkten erledigt.');
  });
});

describe('run history', () => {
  const finish = (result: ReturnType<typeof renderTrainer>['result']) => {
    act(() => {
      result.current.trainer.session.set('master', 'on');
    });
    act(() => {
      result.current.trainer.session.set('pump', 'on');
    });
    expect(result.current.snapshot.checklist()?.done).toBe(true);
  };

  it('stores aircraft, procedure, mode, deviations and date when a run completes', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);
    const { result } = renderTrainer();
    act(() => result.current.trainer.setMode('practice'));
    act(() => result.current.trainer.startProcedure(firstProcedure));
    expect(readHistory(first.id)).toEqual({});
    finish(result);
    const deviations = result.current.snapshot.checklist()?.deviations.length;
    const run = { mode: 'practice', deviations, at: 1_700_000_000_000 };
    expect(readHistory(first.id)).toEqual({ [firstProcedure]: { last: run, best: run } });
    expect(readHistory(second.id)).toEqual({});
  });

  it('stores a run once, however long the finished checklist stays open', () => {
    const { result } = renderTrainer();
    act(() => result.current.trainer.startProcedure(firstProcedure));
    finish(result);
    const spy = vi.spyOn(Storage.prototype, 'setItem');
    act(() => {
      result.current.trainer.session.set('master', 'off');
    });
    act(() => result.current.trainer.session.advance(STEP_MS));
    expect(spy).not.toHaveBeenCalled();
  });

  it('stores every completed run, including a repeat', () => {
    const { result } = renderTrainer();
    act(() => result.current.trainer.startProcedure(firstProcedure));
    finish(result);
    vi.spyOn(Date, 'now').mockReturnValue(2_000_000_000_000);
    act(() => result.current.trainer.startProcedure(firstProcedure));
    finish(result);
    expect(readHistory(first.id)[firstProcedure]?.last.at).toBe(2_000_000_000_000);
  });

  it('stores nothing for a run left unfinished or for Free explore', () => {
    const { result } = renderTrainer();
    act(() => result.current.trainer.startProcedure(firstProcedure));
    act(() => {
      result.current.trainer.session.set('master', 'on');
    });
    act(() => result.current.trainer.backToPicker());
    act(() => result.current.trainer.setMode('explore'));
    expect(localStorage.getItem('cpt.history')).toBeNull();
  });

  it('keeps running when storage refuses the write', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    const { result } = renderTrainer();
    act(() => result.current.trainer.startProcedure(firstProcedure));
    expect(() => finish(result)).not.toThrow();
  });
});
