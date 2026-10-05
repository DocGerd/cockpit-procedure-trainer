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
