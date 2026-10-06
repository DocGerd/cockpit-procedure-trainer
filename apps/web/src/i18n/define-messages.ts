export const messagesBrand: unique symbol = Symbol('messages');

export type Messages<K extends string> = {
  readonly [messagesBrand]: true;
  readonly en: Readonly<Record<K, string>>;
  readonly de: Readonly<Record<K, string>>;
};

export function defineMessages<K extends string>(m: {
  en: Record<K, string>;
  de: Record<K, string>;
}): Messages<K> {
  return { [messagesBrand]: true, en: m.en, de: m.de };
}

// Plurals use split keys (`itemOne` / `itemOther`); `format` only fills placeholders.
// A placeholder without a value stays visible as written.
export function format(
  template: string,
  values: Readonly<Record<string, string | number>>,
): string {
  return template.replace(/\{(\w+)\}/g, (placeholder, name: string) => {
    const value = values[name];
    return value === undefined ? placeholder : String(value);
  });
}
