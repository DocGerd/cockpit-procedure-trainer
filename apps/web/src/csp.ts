// GitHub Pages cannot send response headers, so the build ships the policy as a meta tag.
// A meta policy cannot carry frame-ancestors, report-uri or sandbox.
export const cspDirectives = {
  'default-src': ["'self'"],
  'script-src': ["'self'"],
  'worker-src': ["'self'"],
  'connect-src': ["'self'"],
  'img-src': ["'self'", 'data:'],
  'font-src': ["'self'", 'data:'],
  'manifest-src': ["'self'"],
  'base-uri': ["'self'"],
  'object-src': ["'none'"],
  'form-action': ["'none'"],
} as const satisfies Readonly<Record<string, readonly string[]>>;

export function contentSecurityPolicy(
  directives: Readonly<Record<string, readonly string[]>> = cspDirectives,
): string {
  return Object.entries(directives)
    .map(([name, sources]) => `${name} ${sources.join(' ')}`)
    .join('; ');
}
