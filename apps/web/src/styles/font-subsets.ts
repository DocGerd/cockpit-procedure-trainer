const fontFace = /\/\* ([\w-]+) \*\/\s*@font-face \{[^}]*\}/g;
const latinFace = /-latin(-ext)?-\d+-\w+$/;

/** Keeps only the latin and latin-ext faces of a Fontsource stylesheet: they cover English and German. */
export function latinFontFaces(css: string): string {
  const kept = [...css.matchAll(fontFace)]
    .filter(([, name]) => latinFace.test(name ?? ''))
    .map(([face]) => face);
  if (kept.length === 0) throw new Error('The stylesheet has no latin @font-face to keep');
  return `${kept.join('\n\n')}\n`;
}
