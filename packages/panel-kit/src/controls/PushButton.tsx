import { useId } from 'react';
import type { ControlWidgetProps } from '../types';
import { CurrentState, Stage, hitStyle, vars } from './Stage';
import { useHold } from './use-hold';

const FILL = { x: 50, y: 50, w: 100, h: 100 };

export function PushButton({
  control,
  position,
  label,
  placard,
  positionLabels,
  onPress,
  onRelease,
}: ControlWidgetProps) {
  const stateId = useId();
  const hold = useHold(onRelease);
  const held = control.positions !== 'continuous' && position === control.positions[1];
  const text = positionLabels[String(position)] ?? String(position);

  const art = (
    <>
      <circle cx={50} cy={50} r={44} className="pk-bezel-dark" />
      <circle cx={50} cy={50} r={39} className="pk-bezel" />
      <g className="pk-move pk-slide" style={vars({ '--pk-y': held ? 3 : 0 })}>
        <circle cx={50} cy={50} r={30} className={held ? 'pk-cap' : 'pk-cap-light'} />
        <circle cx={50} cy={50} r={30} className="pk-mark" />
      </g>
    </>
  );

  return (
    <Stage placard={placard} width={100} height={100} art={art}>
      <button
        type="button"
        className="pk-hit"
        style={hitStyle(FILL)}
        aria-label={label}
        aria-pressed={held}
        aria-describedby={stateId}
        {...hold.handlers(() => onPress())}
      />
      <CurrentState id={stateId} text={text} />
    </Stage>
  );
}
