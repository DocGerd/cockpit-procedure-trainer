/** A fraction as a CSS percentage, free of floating-point tails. */
export const percent = (fraction: number) => `${Number((fraction * 100).toFixed(4))}%`;
