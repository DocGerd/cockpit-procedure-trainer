import { deviceControls } from '@cpt/core';
import type { Aircraft, ControlChange, Device, Session } from '@cpt/core';
import { clickCount, clickFor, createClickPlayer } from '@cpt/panel-kit';
import type { AudioEngine, AudioOut, ClickPlayer } from '@cpt/panel-kit';

/**
 * Plays the cockpit of `session` through `engine` until the returned disconnect. A click is
 * dropped while the engine is not live: a late click would answer a move made long before.
 * The first audio error is logged and silences this connection; it never reaches the session,
 * so the pilot's press and the advance timer keep working.
 */
export function connectCockpitAudio(
  session: Session,
  aircraft: Aircraft,
  registry: readonly Device[],
  engine: AudioEngine,
): () => void {
  const controls = { ...aircraft.controls, ...deviceControls(aircraft, registry) };
  let silenced = false;
  let clicks: { readonly out: AudioOut; readonly player: ClickPlayer } | undefined;

  // A context the browser closed is replaced by a new one, which needs its own player.
  const playerFor = (out: AudioOut) => {
    if (clicks?.out !== out) clicks = { out, player: createClickPlayer(out) };
    return clicks.player;
  };

  const click = (change: ControlChange) => {
    const definition = controls[change.id];
    const id = definition && clickFor(definition, change);
    const out = engine.out();
    if (!definition || id === undefined || !out || !engine.live()) return;
    playerFor(out).play(id, out.context.currentTime, clickCount(definition, change));
  };

  const unsubscribe = session.onControlChange((change) => {
    if (silenced) return;
    try {
      click(change);
    } catch (error) {
      silenced = true;
      console.error('Cockpit sound stopped after an audio error.', error);
    }
  });

  return () => {
    silenced = true;
    unsubscribe();
  };
}
