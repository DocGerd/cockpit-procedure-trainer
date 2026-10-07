import { useId } from 'react';
import type { ControlWidgetProps } from '../types';
import { circleBox, finish, paint, RadialGradient, SoftShadow, useMaterialId } from '../materials';
import { CurrentState, Stage, hitStyle, vars } from './Stage';
import { useHold } from './use-hold';

const FILL = { x: 50, y: 50, w: 100, h: 100 };
const WELL = 34;

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
  const kit = useMaterialId('push');
  const hold = useHold(onRelease);
  const held = control.positions !== 'continuous' && position === control.positions[1];
  const text = positionLabels[String(position)] ?? String(position);

  const art = (
    <>
      <SoftShadow box={circleBox(50, 50, 44)} offset={[0.5, 1.4]} blur={1.6} />
      <circle cx={50} cy={50} r={44} style={{ fill: paint(kit, 'bezel') }} />
      <circle cx={50} cy={50} r={41.5} style={{ fill: paint(kit, 'lip') }} />
      <circle cx={50} cy={50} r={WELL + 0.8} style={{ fill: 'var(--panel-metal-shade)' }} />
      <circle cx={50} cy={50} r={WELL} style={{ fill: 'var(--panel-plastic-shade)' }} />
      <g className="pk-move pk-slide" style={vars({ '--pk-y': held ? 3 : 0 })}>
        {!held && (
          <circle
            cx={51.5}
            cy={53.5}
            r={30}
            opacity={0.55}
            style={{ fill: 'var(--panel-shadow)' }}
          />
        )}
        <circle cx={50} cy={50} r={30} style={{ fill: paint(kit, 'plastic') }} />
        <circle cx={50} cy={50} r={26.5} style={{ fill: paint(kit, 'dome') }} />
        <path
          d="M28.5 46A22 22 0 0 1 46 28.5"
          fill="none"
          strokeWidth={1.6}
          strokeLinecap="round"
          style={{ stroke: paint(kit, 'specular') }}
        />
      </g>
      {held && (
        <>
          <circle cx={50} cy={53} r={30} style={{ fill: paint(kit, 'well') }} />
          <circle cx={50} cy={50} r={WELL} style={{ fill: paint(kit, 'recess') }} />
        </>
      )}
    </>
  );

  return (
    <Stage
      kit={kit}
      materials={['bezel', 'lip', 'plastic', 'dome', 'specular', 'well']}
      defs={
        <RadialGradient
          id={`${kit}-recess`}
          userSpace
          centre={[51.6, 52.4]}
          radius={WELL + 2}
          stops={finish.recess}
        />
      }
      placard={placard}
      width={100}
      height={100}
      art={art}
    >
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
