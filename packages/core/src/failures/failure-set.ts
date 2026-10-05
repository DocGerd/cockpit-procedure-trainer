import type { FailureDefinition } from '../contract';
import type { ControlStore } from '../controls';
import type { SystemsRuntime } from '../runtime';

export type FailureSet<F extends string = string> = {
  inject(id: F): void;
  clear(id: F): void;
  clearAll(): void;
  active(): ReadonlySet<F>;
};

export type FailureSetOptions<F extends string = string> = {
  readonly store: Pick<ControlStore, 'systemSet'>;
  readonly runtime: Pick<SystemsRuntime<unknown, F>, 'setFailures'>;
};

export function createFailureSet<F extends string>(
  aircraft: { readonly failures: { readonly [K in F]: FailureDefinition } },
  { store, runtime }: FailureSetOptions<F>,
): FailureSet<F> {
  const declared: Readonly<Record<string, FailureDefinition>> = aircraft.failures;
  const active = new Set<F>();

  function definitionOf(id: F): FailureDefinition {
    if (!Object.hasOwn(declared, id)) throw new Error(`Unknown failure "${id}"`);
    return declared[id] as FailureDefinition;
  }

  return {
    inject(id) {
      const definition = definitionOf(id);
      if (active.has(id)) return;
      active.add(id);
      runtime.setFailures(active);
      for (const breaker of definition.trips ?? []) store.systemSet(breaker, 'pulled');
    },

    clear(id) {
      definitionOf(id);
      if (!active.delete(id)) return;
      runtime.setFailures(active);
    },

    clearAll() {
      if (active.size === 0) return;
      active.clear();
      runtime.setFailures(active);
    },

    active: () => new Set(active),
  };
}
