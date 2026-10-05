import { describe, expect, it } from 'vitest';
import { defineMessages, messagesBrand } from './define-messages';

type Modules = Record<string, Record<string, unknown>>;

function findMessageProblems(modules: Modules): string[] {
  const problems: string[] = [];
  for (const [path, exports] of Object.entries(modules)) {
    const entries = Object.entries(exports);
    if (entries.length === 0) problems.push(`${path}: exports nothing`);
    for (const [name, value] of entries) {
      const where = `${path}#${name}`;
      const candidate = value as { [messagesBrand]?: unknown; en?: object; de?: object } | null;
      if (candidate?.[messagesBrand] !== true) {
        problems.push(`${where}: not built by defineMessages`);
        continue;
      }
      const en = candidate.en ?? {};
      const de = candidate.de ?? {};
      if (Object.keys(en).sort().join('\n') !== Object.keys(de).sort().join('\n')) {
        problems.push(`${where}: key sets differ`);
      }
      for (const [language, record] of [
        ['en', en],
        ['de', de],
      ] as const) {
        for (const [key, text] of Object.entries(record)) {
          if (typeof text !== 'string' || text.trim() === '') {
            problems.push(`${where}: ${language}.${key} is empty`);
          }
        }
      }
    }
  }
  return problems;
}

describe('defineMessages', () => {
  it('keeps both languages and brands the result', () => {
    const m = defineMessages({ en: { hello: 'Hello' }, de: { hello: 'Hallo' } });
    expect(m.en.hello).toBe('Hello');
    expect(m.de.hello).toBe('Hallo');
    expect(m[messagesBrand]).toBe(true);
  });

  it('rejects a key present in only one language at compile time', () => {
    // @ts-expect-error de lacks `bye`
    defineMessages({ en: { hello: 'Hello', bye: 'Bye' }, de: { hello: 'Hallo' } });
    // @ts-expect-error en lacks `bye`
    defineMessages({ en: { hello: 'Hello' }, de: { hello: 'Hallo', bye: 'Tschüss' } });
    // @ts-expect-error each side has a key the other lacks
    defineMessages({ en: { hello: 'Hello', extra: 'x' }, de: { hello: 'Hallo', other: 'y' } });
  });
});

describe('messages file scan', () => {
  const good = defineMessages({ en: { a: 'A' }, de: { a: 'Ä' } });

  it('accepts files built by defineMessages', () => {
    expect(findMessageProblems({ 'ok.ts': { messages: good } })).toEqual([]);
  });

  it('flags a plain object, differing keys, an empty string and an empty module', () => {
    const plain = { en: { a: 'A' }, de: { a: 'Ä' } };
    const mismatched = defineMessages({ en: { a: 'A' }, de: { a: 'Ä' } });
    delete (mismatched.de as Record<string, string>)['a'];
    const blank = defineMessages({ en: { a: 'A' }, de: { a: ' ' } });
    expect(
      findMessageProblems({
        'plain.ts': { messages: plain },
        'keys.ts': { messages: mismatched },
        'blank.ts': { messages: blank },
        'none.ts': {},
      }),
    ).toEqual([
      'plain.ts#messages: not built by defineMessages',
      'keys.ts#messages: key sets differ',
      'blank.ts#messages: de.a is empty',
      'none.ts: exports nothing',
    ]);
  });
});

describe('every messages.ts in the app', () => {
  const modules = import.meta.glob<Record<string, unknown>>('../**/messages.ts', { eager: true });

  it('finds the messages files', () => {
    expect(Object.keys(modules).length).toBeGreaterThan(0);
  });

  it('builds each with defineMessages, with identical keys and no empty string', () => {
    expect(findMessageProblems(modules)).toEqual([]);
  });
});
