const LEVEL_MIX = ['40%', '70%', '100%'] as const;

/** The display colour at a backlight level: the legend colour faded towards the dark screen. */
export const glow = (level: number): string =>
  `color-mix(in srgb, var(--panel-legend) ${LEVEL_MIX[level] ?? '100%'}, var(--panel-screen))`;
