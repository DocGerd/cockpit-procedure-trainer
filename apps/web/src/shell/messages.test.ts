import { expect, it } from 'vitest';
import { messages } from './messages';

it('has the same non-empty strings in English and German', () => {
  expect(Object.keys(messages.de).sort()).toEqual(Object.keys(messages.en).sort());
  for (const language of [messages.en, messages.de]) {
    for (const [key, value] of Object.entries(language)) {
      expect(value.trim(), key).not.toBe('');
    }
  }
});
