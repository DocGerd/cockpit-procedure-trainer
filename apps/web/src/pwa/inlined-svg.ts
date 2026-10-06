const dataUri = /data:image\/svg\+xml(;base64)?,([^"`]*)/g;

export function inlinedSvgs(script: string): string[] {
  return [...script.matchAll(dataUri)].map(([, base64, payload = '']) =>
    (base64
      ? Buffer.from(payload, 'base64').toString('utf8')
      : decodeURIComponent(payload)
    ).replaceAll("'", '"'),
  );
}
