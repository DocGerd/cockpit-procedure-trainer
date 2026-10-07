// Structural, so this file needs no package import.
export type ReadmeDevice = {
  readonly id: string;
  readonly notModelled: readonly { readonly en: string }[];
  readonly controls: Readonly<Record<string, unknown>>;
};

export const requiredSections = ['Source revision', 'Controls', 'Not modelled'] as const;

const sectionLines = (readme: string, heading: string): string[] | undefined => {
  const lines = readme.split('\n');
  const start = lines.indexOf(`## ${heading}`);
  if (start < 0) return undefined;
  const end = lines.findIndex((line, i) => i > start && line.startsWith('## '));
  return lines.slice(start + 1, end < 0 ? undefined : end);
};

const bulletsOf = (lines: readonly string[]): string[] =>
  lines.filter((line) => line.startsWith('- ')).map((line) => line.slice(2));

// A bullet head names controls as "`a`", "`a`, `b`" or the range "`key0` to `key7`".
const namedControls = (bullet: string): string[] => {
  const head = bullet.split(': ')[0] ?? '';
  return head.split(', ').flatMap((item) => {
    const match = /^`(\w+)`(?: to `(\w+)`)?$/.exec(item);
    if (match === null) return [];
    const [, first = '', last] = match;
    if (last === undefined) return [first];
    const from = /^(\D+)(\d+)$/.exec(first);
    const to = /^(\D+)(\d+)$/.exec(last);
    if (from === null || to === null || from[1] !== to[1]) return [first, last];
    const [low, high] = [Number(from[2]), Number(to[2])];
    return Array.from({ length: Math.max(high - low + 1, 0) }, (_, i) => `${from[1]}${low + i}`);
  });
};

export function readmeProblems(readme: string, device: ReadmeDevice): string[] {
  const problems: string[] = [];
  const lines = readme.split('\n');

  const title = `# @cpt/device-${device.id}`;
  if (lines[0] !== title) problems.push(`the first line is not "${title}"`);

  for (const heading of requiredSections) {
    const count = lines.filter((line) => line === `## ${heading}`).length;
    if (count !== 1) problems.push(`"## ${heading}" must appear exactly once, found ${count}`);
    const body = sectionLines(readme, heading);
    if (body !== undefined && body.every((line) => line.trim() === '')) {
      problems.push(`"## ${heading}" is empty`);
    }
  }

  const controls = sectionLines(readme, 'Controls');
  if (controls !== undefined) {
    const documented = bulletsOf(controls).flatMap(namedControls);
    const declared = Object.keys(device.controls);
    for (const id of declared.filter((id) => !documented.includes(id))) {
      problems.push(`control "${id}" is declared but not documented under "## Controls"`);
    }
    for (const id of documented.filter((id) => !declared.includes(id))) {
      problems.push(`"## Controls" documents "${id}", which the device does not declare`);
    }
  }

  const notModelled = sectionLines(readme, 'Not modelled');
  if (notModelled !== undefined) {
    const expected = device.notModelled.map((entry) => entry.en);
    const actual = bulletsOf(notModelled);
    if (expected.length === 0) problems.push('the device declares nothing as not modelled');
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      problems.push(
        `"## Not modelled" bullets differ from the declared English texts:\n  README:   ${JSON.stringify(actual)}\n  declared: ${JSON.stringify(expected)}`,
      );
    }
  }

  return problems;
}
