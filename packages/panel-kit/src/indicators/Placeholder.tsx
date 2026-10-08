export function IndicatorPlaceholder({ label }: { label: string }) {
  return (
    <svg
      data-widget="placeholder"
      data-placeholder=""
      width="100%"
      height="100%"
      viewBox="0 0 100 100"
      role="img"
      aria-label={label}
    >
      <circle
        cx={50}
        cy={50}
        r={49}
        style={{ fill: 'var(--panel-bezel-dark)', stroke: 'var(--panel-bezel)' }}
        strokeWidth={2}
      />
      <circle cx={50} cy={50} r={46} style={{ fill: 'var(--panel-dial)' }} />
    </svg>
  );
}
