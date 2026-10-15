import type { ClickId, ControlChange, ControlDefinition, ControlKind } from '@cpt/core';

const KIND_CLICK = {
  toggle: 'rocker',
  rotary: 'detent',
  lever: 'notch',
  momentary: 'key',
  guarded: 'handle',
  breaker: 'push-pull',
} satisfies Record<ControlKind, ClickId>;

const fallback = (definition: ControlDefinition, change: ControlChange): ClickId | undefined => {
  if (change.kind === 'guard') return definition.kind === 'guarded' ? 'latch' : undefined;
  if (definition.kind === 'lever' && definition.positions === 'continuous') return undefined;
  return KIND_CLICK[definition.kind];
};

/** Only the pilot's own moves click; a change that moves nothing is a refused move. */
export function clickFor(
  definition: ControlDefinition,
  change: ControlChange,
): ClickId | undefined {
  if (change.source !== 'pilot' || change.from === change.to) return undefined;
  if (definition.click !== undefined) {
    return definition.click === 'silent' ? undefined : definition.click;
  }
  return fallback(definition, change);
}

/** How many times the click plays: one detent per rotary position stepped, else one. */
export function clickCount(definition: ControlDefinition, change: ControlChange): number {
  if (definition.kind !== 'rotary' || change.kind !== 'position') return 1;
  const { springBack, positions } = definition;
  if (springBack && typeof change.to === 'string' && Object.hasOwn(springBack, change.to)) return 1;
  const from = positions.findIndex((position) => position === change.from);
  const to = positions.findIndex((position) => position === change.to);
  return from < 0 || to < 0 ? 1 : Math.max(1, Math.abs(to - from));
}
