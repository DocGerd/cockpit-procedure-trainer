import { describe, expect, it } from 'vitest';
import { contentSecurityPolicy, cspDirectives } from './csp';

const parse = (policy: string) =>
  new Map(
    policy.split(';').map((part) => {
      const [name = '', ...sources] = part.trim().split(/\s+/);
      return [name, sources] as const;
    }),
  );

describe('contentSecurityPolicy', () => {
  const policy = parse(contentSecurityPolicy());

  it('limits every fetch directive to the own origin, plus data: for images and fonts', () => {
    expect(policy.get('default-src')).toEqual(["'self'"]);
    expect(policy.get('script-src')).toEqual(["'self'"]);
    expect(policy.get('worker-src')).toEqual(["'self'"]);
    expect(policy.get('connect-src')).toEqual(["'self'"]);
    expect(policy.get('manifest-src')).toEqual(["'self'"]);
    expect(policy.get('img-src')).toEqual(["'self'", 'data:']);
    expect(policy.get('font-src')).toEqual(["'self'", 'data:']);
  });

  it('closes the base URI, plugins and form submissions', () => {
    expect(policy.get('base-uri')).toEqual(["'self'"]);
    expect(policy.get('object-src')).toEqual(["'none'"]);
    expect(policy.get('form-action')).toEqual(["'none'"]);
  });

  it('never allows inline or eval code, and never opens a host or wildcard', () => {
    for (const sources of Object.values(cspDirectives)) {
      for (const source of sources) {
        expect(source).not.toMatch(/unsafe-|\*|^https?:|^blob:/);
      }
    }
    expect(policy.has('style-src')).toBe(false);
  });

  it('serialises one directive per semicolon-separated entry', () => {
    expect(
      contentSecurityPolicy({ 'default-src': ["'none'"], 'img-src': ["'self'", 'data:'] }),
    ).toBe("default-src 'none'; img-src 'self' data:");
  });
});
