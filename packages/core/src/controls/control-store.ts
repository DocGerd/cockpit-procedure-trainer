import { isPosition } from '../contract';
import type {
  ControlChange,
  ControlDefinition,
  ControlId,
  ControlPosition,
  ControlRecord,
  GuardPosition,
  Positions,
} from '../contract';

export type ControlResult =
  | { readonly applied: true }
  | { readonly applied: false; readonly reason: 'guarded' | 'locked' | 'unchanged' };

export type ControlListener<C extends string = string> = (change: ControlChange<C>) => void;

export type ControlStore<C extends string = string> = {
  positions(): Positions;
  guards(): Readonly<Record<string, GuardPosition>>;
  set(id: C, position: ControlPosition): ControlResult;
  press(id: C, position?: ControlPosition): ControlResult;
  release(id: C): ControlResult;
  openGuard(id: C): ControlResult;
  closeGuard(id: C): ControlResult;
  systemSet(id: C, position: ControlPosition): ControlResult;
  load(positions: Positions, guards?: Readonly<Partial<Record<string, GuardPosition>>>): void;
  subscribe(listener: ControlListener<C>): () => void;
};

const APPLIED: ControlResult = { applied: true };
const UNCHANGED: ControlResult = { applied: false, reason: 'unchanged' };
const GUARDED: ControlResult = { applied: false, reason: 'guarded' };
const LOCKED: ControlResult = { applied: false, reason: 'locked' };

export function createControlStore<CT extends ControlRecord>(
  controls: CT,
): ControlStore<ControlId<CT>> {
  type C = ControlId<CT>;
  const definitions: ControlRecord = controls;
  const current = new Map<string, ControlPosition>();
  const guards = new Map<string, GuardPosition>();
  const listeners = new Set<ControlListener<C>>();

  for (const [id, definition] of Object.entries(definitions)) {
    current.set(id, definition.initial);
    if (definition.kind === 'guarded') guards.set(id, 'closed');
  }

  function definitionOf(id: string): ControlDefinition {
    if (!Object.hasOwn(definitions, id)) throw new Error(`Unknown control "${id}"`);
    return definitions[id] as ControlDefinition;
  }

  function validate(id: string, definition: ControlDefinition, position: ControlPosition): void {
    if (!isPosition(definition, position)) {
      throw new Error(`Control "${id}" has no position ${JSON.stringify(position)}`);
    }
  }

  function emit(changes: readonly ControlChange<C>[]): void {
    for (const change of changes) {
      for (const listener of [...listeners]) listener(change);
    }
  }

  function move(
    id: string,
    to: ControlPosition,
    source: ControlChange['source'],
  ): ControlChange<C> | undefined {
    const from = current.get(id) as ControlPosition;
    if (from === to) return undefined;
    current.set(id, to);
    return { id: id as C, source, kind: 'position', from, to };
  }

  function apply(
    id: string,
    position: ControlPosition,
    source: ControlChange['source'],
  ): ControlResult {
    const change = move(id, position, source);
    if (!change) return UNCHANGED;
    emit([change]);
    return APPLIED;
  }

  function locked(definition: ControlDefinition, id: string, to: ControlPosition): boolean {
    const lock = definition.interlock;
    return (
      lock !== undefined &&
      current.get(id) === lock.holds &&
      to !== lock.holds &&
      current.get(lock.control) === lock.at
    );
  }

  function springTarget(definition: ControlDefinition, at: ControlPosition): string | undefined {
    if (definition.kind === 'momentary') {
      return at === definition.positions[1] ? definition.positions[0] : undefined;
    }
    if (definition.kind === 'rotary' && definition.springBack) {
      const { springBack } = definition;
      return typeof at === 'string' && Object.hasOwn(springBack, at) ? springBack[at] : undefined;
    }
    return undefined;
  }

  function setGuard(id: C, to: GuardPosition): ControlResult {
    const from = guards.get(id);
    if (from === undefined) {
      definitionOf(id);
      throw new Error(`Control "${id}" has no guard`);
    }
    if (from === to) return UNCHANGED;
    guards.set(id, to);
    emit([{ id, source: 'pilot', kind: 'guard', from, to }]);
    return APPLIED;
  }

  return {
    positions: () => Object.fromEntries(current),

    guards: () => Object.fromEntries(guards),

    set(id, position) {
      const definition = definitionOf(id);
      if (definition.kind === 'momentary') {
        throw new Error(`Control "${id}" is momentary; use press and release`);
      }
      validate(id, definition, position);
      if (current.get(id) === position) return UNCHANGED;
      if (guards.get(id) === 'closed') return GUARDED;
      if (locked(definition, id, position)) return LOCKED;
      return apply(id, position, 'pilot');
    },

    press(id, position) {
      const definition = definitionOf(id);
      if (definition.kind === 'momentary') {
        const held = definition.positions[1];
        if (position !== undefined && position !== held) {
          throw new Error(`Control "${id}" is held at ${JSON.stringify(held)}`);
        }
        return locked(definition, id, held) ? LOCKED : apply(id, held, 'pilot');
      }
      if (
        definition.kind === 'rotary' &&
        typeof position === 'string' &&
        definition.springBack &&
        Object.hasOwn(definition.springBack, position)
      ) {
        return locked(definition, id, position) ? LOCKED : apply(id, position, 'pilot');
      }
      throw new Error(`Control "${id}" cannot be pressed at ${JSON.stringify(position)}`);
    },

    release(id) {
      const definition = definitionOf(id);
      const target = springTarget(definition, current.get(id) as ControlPosition);
      return target === undefined ? UNCHANGED : apply(id, target, 'spring');
    },

    openGuard: (id) => setGuard(id, 'open'),

    closeGuard: (id) => setGuard(id, 'closed'),

    systemSet(id, position) {
      validate(id, definitionOf(id), position);
      return apply(id, position, 'system');
    },

    load(positions, guardPositions = {}) {
      for (const [id, position] of Object.entries(positions)) {
        validate(id, definitionOf(id), position);
      }
      for (const [id, to] of Object.entries(guardPositions)) {
        definitionOf(id);
        if (!guards.has(id)) throw new Error(`Control "${id}" has no guard`);
        if (to !== 'open' && to !== 'closed') {
          throw new Error(`Guard of "${id}" has no position ${JSON.stringify(to)}`);
        }
      }
      const changes: ControlChange<C>[] = [];
      for (const [id, position] of Object.entries(positions)) {
        const change = move(id, position, 'system');
        if (change) changes.push(change);
      }
      for (const [id, from] of guards) {
        const to = guardPositions[id] ?? 'closed';
        if (from !== to) {
          guards.set(id, to);
          changes.push({ id: id as C, source: 'system', kind: 'guard', from, to });
        }
      }
      emit(changes);
    },

    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
