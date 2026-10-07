import { DeviceDisplayFrame } from '@cpt/panel-kit';
import type { DeviceDisplayProps } from '@cpt/panel-kit';
import type { CSSProperties } from 'react';
import { glow } from '../glow';
import { BACKLIGHT_LEVELS, PAGE_NAMES } from '../logic';
import type { Gpsmap496State } from '../logic';

const screenStyle: CSSProperties = {
  display: 'grid',
  placeContent: 'center',
  justifyItems: 'center',
  boxSizing: 'border-box',
  width: 'calc(var(--space-12) * 8 + var(--space-4))',
  aspectRatio: '400 / 300',
  padding: 'var(--space-2)',
  background: 'var(--panel-screen)',
  fontFamily: 'var(--font-mono)',
  fontSize: 'var(--text-3xl)',
  lineHeight: 'var(--leading-3xl)',
  textAlign: 'center',
};

const levelStyle: CSSProperties = {
  color: 'var(--panel-legend-muted)',
  fontSize: 'var(--text-2xl)',
  lineHeight: 'var(--leading-2xl)',
};

export function Gpsmap496Display({ on, state }: DeviceDisplayProps) {
  const unit = state as Gpsmap496State;
  const lit = on && unit.on;
  return (
    <DeviceDisplayFrame on={on} label="GPS">
      <div data-backlight={unit.backlight} style={{ ...screenStyle, color: glow(unit.backlight) }}>
        {lit && (
          <>
            <span data-field="page">{PAGE_NAMES[unit.page].en.toUpperCase()}</span>
            <span data-field="position">NO POSITION</span>
            <span data-field="backlight" style={levelStyle}>
              {`LIGHT ${unit.backlight + 1}/${BACKLIGHT_LEVELS}`}
            </span>
          </>
        )}
      </div>
    </DeviceDisplayFrame>
  );
}
