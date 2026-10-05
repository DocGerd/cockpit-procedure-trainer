import type { IndicatorValue } from '@cpt/core';
import type { ValueInput as ValueInputKind } from './fixtures';

type Props = {
  kind: ValueInputKind;
  value: IndicatorValue;
  name: string;
  onChange(value: IndicatorValue): void;
};

export function ValueInput({ kind, value, name, onChange }: Props) {
  if (kind.type === 'checkbox') {
    return (
      <label className="gallery-input">
        <input
          type="checkbox"
          checked={value === true}
          onChange={(event) => onChange(event.target.checked)}
        />
        {name} lit
      </label>
    );
  }
  if (kind.type === 'text') {
    return (
      <label className="gallery-input">
        {name}
        <input
          type="text"
          value={String(value)}
          onChange={(event) => onChange(event.target.value)}
        />
      </label>
    );
  }
  const numeric = (raw: string) => {
    const next = Number(raw);
    if (raw !== '' && Number.isFinite(next)) onChange(next);
  };
  return (
    <label className="gallery-input">
      {name}
      <input
        type={kind.type}
        step={kind.step}
        {...(kind.type === 'range' ? { min: kind.min, max: kind.max } : {})}
        value={Number(value)}
        onChange={(event) => numeric(event.target.value)}
      />
      <output>{String(value)}</output>
    </label>
  );
}
