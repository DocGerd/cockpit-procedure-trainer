import { useHold } from '../controls/use-hold';
import type { DeviceScreenProps } from '../types';
import './styles';

type Send = DeviceScreenProps['send'];

export type KnobHelpersProps = {
  /** The knob's printed word; the helpers are named `<word> +` and `<word> −`. */
  word: string;
  control: string;
  /** The positions the helpers turn the knob to. */
  up?: string | undefined;
  down?: string | undefined;
  send: Send;
};

const TARGET = { minWidth: 'var(--size-target)', minHeight: 'var(--size-target)' };

function Helper({
  glyph,
  name,
  control,
  position,
  send,
}: {
  glyph: string;
  name: string;
  control: string;
  position: string;
  send: Send;
}) {
  const hold = useHold(() => send(control, 'release'));
  return (
    <button
      type="button"
      className="pk-knob-helper"
      aria-label={name}
      data-control={control}
      data-position={position}
      style={TARGET}
      {...hold.handlers(() => send(control, 'press', position))}
    >
      {glyph}
    </button>
  );
}

/**
 * The touch stand-in for a rotary knob that is too small to turn by finger: plus over minus, held
 * to turn. A trainer aid, drawn flat so it never reads as part of the unit; the device places it
 * on the panel metal beside its knob.
 */
export function KnobHelpers({ word, control, up = 'up', down = 'down', send }: KnobHelpersProps) {
  return (
    <div className="pk-knob-helpers" data-knob-helpers={control}>
      <span className="pk-knob-word" data-knob-word aria-hidden="true">
        {word}
      </span>
      <Helper glyph="+" name={`${word} +`} control={control} position={up} send={send} />
      <Helper glyph="−" name={`${word} −`} control={control} position={down} send={send} />
    </div>
  );
}
