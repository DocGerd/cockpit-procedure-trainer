import { execFileSync, spawnSync } from 'node:child_process';
import {
  chmodSync,
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join, resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const hooks = resolve(import.meta.dirname, '../.claude/hooks');
const referenceGuard = join(hooks, 'reference-guard.sh');
const mainGuard = join(hooks, 'main-checkout-guard.sh');

interface HookEntry {
  matcher: string;
  hooks: { command: string }[];
}
const settings = JSON.parse(
  readFileSync(resolve(import.meta.dirname, '../.claude/settings.json'), 'utf8'),
) as { hooks: { PreToolUse: HookEntry[] } };

function entryFor(script: string): { matcher: string; command: string } {
  for (const entry of settings.hooks.PreToolUse) {
    const hook = entry.hooks.find((h) => h.command.includes(script));
    if (hook) return { matcher: entry.matcher, command: hook.command };
  }
  throw new Error(`no PreToolUse wrapper runs ${script}`);
}

const cleanEnv = Object.fromEntries(
  Object.entries(process.env).filter(([k]) => !k.startsWith('GIT_') && !k.startsWith('CPT_')),
);

let root: string;
let main: string;
let worktree: string;
let worktree2: string;
let nested: string;
let other: string;
let plain: string;
let noRealpathM: string;
let dubiousGit: string;
let noisyGit: string;

function git(cwd: string, ...args: string[]): void {
  execFileSync(
    'git',
    ['-c', 'user.name=t', '-c', 'user.email=t@example.com', '-c', 'commit.gpgsign=false', ...args],
    { cwd, env: cleanEnv, stdio: 'pipe' },
  );
}

function touch(path: string): void {
  mkdirSync(resolve(path, '..'), { recursive: true });
  writeFileSync(path, 'x');
}

function shim(dir: string, name: string, body: string): string {
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, name), `#!/bin/sh\n${body}\n`);
  chmodSync(join(dir, name), 0o755);
  return `${dir}:${process.env.PATH ?? ''}`;
}

interface Call {
  tool: string;
  input: Record<string, string>;
  cwd?: string;
  project?: string;
  env?: Record<string, string>;
}

interface Outcome {
  denied: boolean;
  reason: string;
  notice: string;
}

// Exit 0 with JSON is a decision and exit 0 without it a silent allow; exit 1
// is an allow with a notice. Anything else would block or break the call.
function outcome(result: { status: number | null; stdout: string; stderr: string }): Outcome {
  if (result.status === 1) {
    expect(result.stdout).toBe('');
    expect(result.stderr).not.toBe('');
    return { denied: false, reason: '', notice: result.stderr };
  }
  expect(result.status).toBe(0);
  expect(result.stderr).toBe('');
  if (result.stdout.trim() === '') return { denied: false, reason: '', notice: '' };
  const decision = (
    JSON.parse(result.stdout) as {
      hookSpecificOutput: {
        hookEventName: string;
        permissionDecision: string;
        permissionDecisionReason: string;
      };
    }
  ).hookSpecificOutput;
  expect(decision.hookEventName).toBe('PreToolUse');
  return {
    denied: decision.permissionDecision === 'deny',
    reason: decision.permissionDecisionReason,
    notice: '',
  };
}

function run(script: string, call: Call, args: string[] = []): Outcome {
  return outcome(
    spawnSync(script, args, {
      input: JSON.stringify({
        tool_name: call.tool,
        tool_input: call.input,
        cwd: call.cwd ?? worktree,
      }),
      env: { ...cleanEnv, CLAUDE_PROJECT_DIR: call.project ?? worktree, ...call.env },
      encoding: 'utf8',
    }),
  );
}

function runRaw(script: string, stdin: string): Outcome {
  return outcome(
    spawnSync(script, [], {
      input: stdin,
      env: { ...cleanEnv, CLAUDE_PROJECT_DIR: worktree },
      encoding: 'utf8',
    }),
  );
}

beforeAll(() => {
  root = realpathSync(mkdtempSync(join(tmpdir(), 'claude-hooks-')));
  main = join(root, 'main');
  worktree = join(root, 'wt');
  worktree2 = join(root, 'wt2');
  nested = join(main, '.claude/worktrees/nested');
  other = join(root, 'other');
  plain = join(root, 'plain');
  mkdirSync(main);
  git(main, 'init', '-q', '-b', 'develop');
  touch(join(main, 'README.md'));
  touch(join(main, 'reference/handbook.txt'));
  touch(join(main, 'reference-old/a.txt'));
  touch(join(main, 'docs/aircraft/x-intake.md'));
  git(main, 'add', 'README.md', 'docs');
  git(main, 'commit', '-q', '-m', 'init');
  git(main, 'worktree', 'add', '-q', '-b', 'wt', worktree);
  git(main, 'worktree', 'add', '-q', '-b', 'nested', nested);
  git(main, 'worktree', 'add', '-q', '-b', 'wt2', worktree2);
  touch(join(worktree, 'reference/own.txt'));
  touch(join(worktree2, 'reference/copy.txt'));
  touch(join(root, 'store/doc.txt'));
  symlinkSync(join(root, 'store'), join(nested, 'reference'));
  mkdirSync(other);
  git(other, 'init', '-q', '-b', 'develop');
  touch(join(other, 'reference/a.txt'));
  mkdirSync(plain);
  symlinkSync(join(main, 'reference'), join(worktree, 'link-to-reference'));
  symlinkSync(join(main, 'README.md'), join(worktree, 'link-to-main-readme.md'));
  symlinkSync(worktree, join(root, 'wt-link'));
  noRealpathM = shim(join(root, 'no-realpath-m'), 'realpath', 'exit 1');
  dubiousGit = shim(
    join(root, 'dubious-git'),
    'git',
    "echo 'fatal: detected dubious ownership in repository' >&2\nexit 128",
  );
  const realGit = execFileSync('sh', ['-c', 'command -v git'], { encoding: 'utf8' }).trim();
  noisyGit = shim(
    join(root, 'noisy-git'),
    'git',
    `echo 'warning: noise' >&2\nexec ${realGit} "$@"`,
  );
});

afterAll(() => {
  rmSync(root, { recursive: true, force: true });
});

describe('reference-guard.sh', () => {
  const guard = (call: Call) => run(referenceGuard, call);
  const denies = (call: Call) => guard(call).denied;

  it('denies a Read by relative path into the worktree reference/', () => {
    const r = guard({ tool: 'Read', input: { file_path: 'reference/own.txt' } });
    expect(r.denied).toBe(true);
    expect(r.reason).toContain('docs/aircraft/<id>-intake.md');
    expect(r.reason).toContain('CPT_ALLOW_REFERENCE=1');
  });

  it('denies an absolute path from a worktree into the main checkout reference/', () => {
    expect(
      denies({ tool: 'Read', input: { file_path: join(main, 'reference/handbook.txt') } }),
    ).toBe(true);
  });

  it('denies a path that reaches reference/ through ..', () => {
    expect(
      denies({ tool: 'Read', input: { file_path: join(worktree, 'docs/../reference/own.txt') } }),
    ).toBe(true);
  });

  it('denies a path that reaches reference/ through a symlink', () => {
    expect(
      denies({
        tool: 'Read',
        input: { file_path: join(worktree, 'link-to-reference/handbook.txt') },
      }),
    ).toBe(true);
  });

  it('denies a reference/ that is itself a symlink', () => {
    expect(denies({ tool: 'Read', input: { file_path: join(nested, 'reference/doc.txt') } })).toBe(
      true,
    );
    expect(denies({ tool: 'Glob', input: { pattern: 'reference/*' }, cwd: nested })).toBe(true);
  });

  it('expands ~ before judging a path', () => {
    const env = { HOME: main };
    expect(denies({ tool: 'Read', input: { file_path: '~/reference/handbook.txt' }, env })).toBe(
      true,
    );
    expect(denies({ tool: 'Grep', input: { pattern: 'x', path: '~' }, env, cwd: main })).toBe(
      false,
    );
  });

  it('denies a not-yet-existing file under reference/', () => {
    expect(denies({ tool: 'Write', input: { file_path: 'reference/new/a.md' } })).toBe(true);
  });

  it('denies a NotebookEdit and a Grep path under reference/', () => {
    expect(
      denies({ tool: 'NotebookEdit', input: { notebook_path: join(main, 'reference/n.ipynb') } }),
    ).toBe(true);
    expect(denies({ tool: 'Grep', input: { pattern: 'x', path: 'reference' } })).toBe(true);
  });

  it('denies the PDF viewer and LSP on a file under reference/', () => {
    const pdf = 'mcp__plugin_pdf-viewer_pdf__display_pdf';
    expect(denies({ tool: pdf, input: { url: join(main, 'reference/h.pdf') } })).toBe(true);
    expect(denies({ tool: pdf, input: { url: `file://${join(main, 'reference/h.pdf')}` } })).toBe(
      true,
    );
    expect(denies({ tool: pdf, input: { url: 'https://example.com/reference/h.pdf' } })).toBe(
      false,
    );
    expect(denies({ tool: 'LSP', input: { filePath: 'reference/own.txt' } })).toBe(true);
  });

  it('denies a Glob pattern that names reference/', () => {
    expect(denies({ tool: 'Glob', input: { pattern: 'reference/**/*.pdf' } })).toBe(true);
    expect(denies({ tool: 'Glob', input: { pattern: '**/reference/*' } })).toBe(true);
    expect(denies({ tool: 'Glob', input: { pattern: './**/reference/*' } })).toBe(true);
    expect(denies({ tool: 'Glob', input: { pattern: join(main, 'reference/*.txt') } })).toBe(true);
    expect(
      denies({ tool: 'Glob', input: { pattern: join(main, '**/reference/*') }, cwd: plain }),
    ).toBe(true);
    expect(
      denies({ tool: 'Glob', input: { pattern: 'reference/*', path: main }, cwd: plain }),
    ).toBe(true);
    expect(
      denies({ tool: 'Glob', input: { pattern: '**/reference/*' }, cwd: join(root, 'wt-link') }),
    ).toBe(true);
    expect(denies({ tool: 'Glob', input: { pattern: '**/reference/**', path: '/' } })).toBe(true);
    expect(denies({ tool: 'Glob', input: { pattern: '/**/reference/**' } })).toBe(true);
  });

  it('allows a Glob whose reference segment lies outside every reference/', () => {
    expect(denies({ tool: 'Glob', input: { pattern: 'docs/reference/**' }, cwd: main })).toBe(
      false,
    );
    expect(denies({ tool: 'Glob', input: { pattern: 'docs/**/reference/*' }, cwd: main })).toBe(
      false,
    );
    expect(
      denies({ tool: 'Glob', input: { pattern: 'reference-old/reference/*' }, cwd: main }),
    ).toBe(false);
    expect(
      denies({ tool: 'Glob', input: { pattern: join(other, 'reference/*') }, cwd: main }),
    ).toBe(false);
    expect(
      denies({ tool: 'Glob', input: { pattern: '**/reference/*', path: join(main, 'docs') } }),
    ).toBe(false);
  });

  it('denies a search without a path from a session inside reference/', () => {
    expect(
      denies({ tool: 'Grep', input: { pattern: 'x' }, cwd: join(worktree, 'reference') }),
    ).toBe(true);
    expect(
      denies({ tool: 'Glob', input: { pattern: '*.txt' }, cwd: join(main, 'reference') }),
    ).toBe(true);
  });

  it('denies a Grep glob that names reference/', () => {
    expect(denies({ tool: 'Grep', input: { pattern: 'x', glob: 'reference/**' } })).toBe(true);
  });

  it('allows a normal file, directory and docs path', () => {
    expect(denies({ tool: 'Read', input: { file_path: 'README.md' } })).toBe(false);
    expect(
      denies({ tool: 'Read', input: { file_path: join(main, 'docs/aircraft/x-intake.md') } }),
    ).toBe(false);
    expect(denies({ tool: 'Grep', input: { pattern: 'x', path: 'docs' } })).toBe(false);
    expect(denies({ tool: 'Glob', input: { pattern: 'docs/**/*.md' } })).toBe(false);
    expect(denies({ tool: 'Glob', input: { pattern: '**/*.ts' }, cwd: main })).toBe(false);
  });

  it('allows a path that only contains the word reference', () => {
    expect(denies({ tool: 'Read', input: { file_path: 'docs/reference-notes.md' } })).toBe(false);
    expect(denies({ tool: 'Read', input: { file_path: join(main, 'reference-old/a.txt') } })).toBe(
      false,
    );
    expect(denies({ tool: 'Read', input: { file_path: join(main, 'reference.md') } })).toBe(false);
    expect(denies({ tool: 'Read', input: { file_path: join(other, 'reference/a.txt') } })).toBe(
      false,
    );
  });

  it('denies reference/ of another linked worktree of the project', () => {
    expect(
      denies({ tool: 'Read', input: { file_path: join(worktree2, 'reference/copy.txt') } }),
    ).toBe(true);
  });

  it('allows reference/ of another repo when the session cwd is in that repo', () => {
    expect(denies({ tool: 'Read', input: { file_path: 'reference/a.txt' }, cwd: other })).toBe(
      false,
    );
  });

  it('judges a worktree session whose project dir is the main checkout', () => {
    const call = { cwd: worktree, project: main };
    expect(
      denies({ ...call, tool: 'Read', input: { file_path: 'docs/aircraft/x-intake.md' } }),
    ).toBe(false);
    expect(denies({ ...call, tool: 'Read', input: { file_path: 'reference/own.txt' } })).toBe(true);
    expect(
      denies({ ...call, tool: 'Read', input: { file_path: join(main, 'reference/handbook.txt') } }),
    ).toBe(true);
  });

  it('denies a case variant, which reaches reference/ on a case-insensitive filesystem', () => {
    expect(denies({ tool: 'Read', input: { file_path: 'Reference/own.txt' } })).toBe(true);
  });

  it('ignores an inherited GIT_DIR when finding the project repo', () => {
    expect(
      denies({
        tool: 'Read',
        input: { file_path: join(main, 'reference/handbook.txt') },
        env: { GIT_DIR: join(other, '.git') },
      }),
    ).toBe(true);
  });

  it('allows a Grep whose search text, not its path, names reference/', () => {
    expect(denies({ tool: 'Grep', input: { pattern: 'reference/' } })).toBe(false);
    expect(denies({ tool: 'Grep', input: { pattern: 'reference/', path: main } })).toBe(false);
  });

  it('allows with CPT_ALLOW_REFERENCE=1 only', () => {
    const call = { tool: 'Read', input: { file_path: 'reference/own.txt' } };
    expect(denies({ ...call, env: { CPT_ALLOW_REFERENCE: '1' } })).toBe(false);
    expect(denies({ ...call, env: { CPT_ALLOW_REFERENCE: '0' } })).toBe(true);
    expect(denies({ ...call, env: { CPT_ALLOW_MAIN_EDIT: '1' } })).toBe(true);
  });

  it('fails open with a notice when realpath has no -m or git cannot read the repo', () => {
    const call = { tool: 'Read', input: { file_path: 'reference/own.txt' } };
    expect(guard({ ...call, env: { PATH: noRealpathM } }).notice).toContain('reference-guard');
    expect(guard({ ...call, env: { PATH: dubiousGit } }).notice).toContain('dubious ownership');
    expect(guard({ ...call, project: plain }).notice).toContain('cannot read the project repo');
  });

  it('fails open with a notice on unexpected input', () => {
    expect(runRaw(referenceGuard, 'not json').notice).toContain('reference-guard');
    expect(runRaw(referenceGuard, '{"tool_input":"reference/own.txt"}').notice).toContain(
      'reference-guard',
    );
  });
});

describe('settings.json wrappers', () => {
  const viaWrapper = (script: string, call: Call) =>
    run('sh', call, ['-c', entryFor(script).command]);

  beforeAll(() => {
    mkdirSync(join(worktree, '.claude/hooks'), { recursive: true });
    for (const script of [referenceGuard, mainGuard]) {
      const copy = join(worktree, '.claude/hooks', basename(script));
      copyFileSync(script, copy);
      chmodSync(copy, 0o644);
    }
  });

  it('register each guard for the tools its header names', () => {
    expect(entryFor('reference-guard.sh').matcher.split('|')).toEqual([
      'Read',
      'Glob',
      'Grep',
      'Edit',
      'Write',
      'NotebookEdit',
      'LSP',
      'mcp__plugin_pdf-viewer_pdf__display_pdf',
    ]);
    expect(entryFor('main-checkout-guard.sh').matcher.split('|')).toEqual([
      'Edit',
      'Write',
      'NotebookEdit',
    ]);
  });

  it('run a guard that lost its exec bit', () => {
    expect(
      viaWrapper('reference-guard.sh', {
        tool: 'Read',
        input: { file_path: join(main, 'reference/handbook.txt') },
      }).denied,
    ).toBe(true);
    expect(
      viaWrapper('main-checkout-guard.sh', {
        tool: 'Edit',
        input: { file_path: join(main, 'README.md') },
      }).denied,
    ).toBe(true);
  });

  it('deny every file call when the reference guard is missing', () => {
    const r = viaWrapper('reference-guard.sh', {
      tool: 'Read',
      input: { file_path: join(plain, 'a.txt') },
      project: plain,
    });
    expect(r.denied).toBe(true);
    expect(r.reason).toContain('reference-guard.sh');
  });

  it('allow edits with a notice when the main-checkout guard is missing', () => {
    const r = viaWrapper('main-checkout-guard.sh', {
      tool: 'Edit',
      input: { file_path: join(main, 'README.md') },
      project: plain,
    });
    expect(r.denied).toBe(false);
    expect(r.notice).toContain('main-checkout guard');
  });
});

describe('main-checkout-guard.sh', () => {
  const guard = (call: Call) => run(mainGuard, call);
  const denies = (call: Call) => guard(call).denied;

  it('denies an edit of a file in the main checkout', () => {
    const r = guard({ tool: 'Edit', input: { file_path: join(main, 'README.md') } });
    expect(r.denied).toBe(true);
    expect(r.reason).toContain('own git worktree');
    expect(r.reason).toContain('CPT_ALLOW_MAIN_EDIT=1');
  });

  it('denies from a main-checkout session by relative path and NotebookEdit', () => {
    expect(
      denies({ tool: 'Write', input: { file_path: 'README.md' }, cwd: main, project: main }),
    ).toBe(true);
    expect(denies({ tool: 'NotebookEdit', input: { notebook_path: join(main, 'n.ipynb') } })).toBe(
      true,
    );
  });

  it('denies a new file in a not-yet-existing directory of the main checkout', () => {
    expect(denies({ tool: 'Write', input: { file_path: join(main, 'a/b/c/new.ts') } })).toBe(true);
  });

  it('denies a path that reaches the main checkout through .., a symlink or ~', () => {
    expect(
      denies({ tool: 'Edit', input: { file_path: join(worktree, '../main/README.md') } }),
    ).toBe(true);
    expect(denies({ tool: 'Edit', input: { file_path: 'link-to-main-readme.md' } })).toBe(true);
    expect(denies({ tool: 'Edit', input: { file_path: '~/README.md' }, env: { HOME: main } })).toBe(
      true,
    );
  });

  it('allows an edit in a linked worktree, also when the project dir is the main checkout', () => {
    for (const project of [worktree, main]) {
      expect(
        denies({ tool: 'Edit', input: { file_path: join(worktree, 'README.md') }, project }),
      ).toBe(false);
      expect(
        denies({ tool: 'Write', input: { file_path: join(worktree, 'new/dir/a.ts') }, project }),
      ).toBe(false);
    }
  });

  it('allows an edit in a linked worktree nested under the main checkout', () => {
    expect(denies({ tool: 'Edit', input: { file_path: join(nested, 'README.md') } })).toBe(false);
    expect(
      denies({ tool: 'Write', input: { file_path: join(nested, 'x/y/new.ts') }, project: nested }),
    ).toBe(false);
  });

  it('allows a path outside any repo', () => {
    expect(denies({ tool: 'Write', input: { file_path: join(plain, 'a/b.txt') } })).toBe(false);
  });

  it('allows a path in another repo', () => {
    expect(denies({ tool: 'Edit', input: { file_path: join(other, 'a.txt') } })).toBe(false);
  });

  it('ignores an inherited GIT_DIR when finding the target repo', () => {
    const env = { GIT_DIR: join(main, '.git') };
    expect(denies({ tool: 'Write', input: { file_path: join(plain, 'a.txt') }, env })).toBe(false);
    expect(denies({ tool: 'Edit', input: { file_path: join(worktree, 'README.md') }, env })).toBe(
      false,
    );
  });

  it('allows with CPT_ALLOW_MAIN_EDIT=1 only', () => {
    const call = { tool: 'Edit', input: { file_path: join(main, 'README.md') } };
    expect(denies({ ...call, env: { CPT_ALLOW_MAIN_EDIT: '1' } })).toBe(false);
    expect(denies({ ...call, env: { CPT_ALLOW_MAIN_EDIT: 'yes' } })).toBe(true);
    expect(denies({ ...call, env: { CPT_ALLOW_REFERENCE: '1' } })).toBe(true);
  });

  it('fails open with a notice when realpath has no -m or git cannot read the repo', () => {
    const call = { tool: 'Write', input: { file_path: join(main, 'README.md') } };
    expect(guard({ ...call, env: { PATH: noRealpathM } }).notice).toContain('main-checkout-guard');
    expect(guard({ ...call, env: { PATH: dubiousGit } }).notice).toContain('dubious ownership');
    expect(guard({ ...call, project: plain }).notice).toContain('not a git repo');
  });

  it('ignores a warning git prints on a successful lookup', () => {
    const env = { PATH: noisyGit };
    expect(denies({ tool: 'Edit', input: { file_path: join(main, 'README.md') }, env })).toBe(true);
    expect(denies({ tool: 'Edit', input: { file_path: join(worktree, 'README.md') }, env })).toBe(
      false,
    );
    expect(denies({ tool: 'Write', input: { file_path: join(plain, 'a.txt') }, env })).toBe(false);
  });

  it('fails open with a notice on unexpected input', () => {
    expect(runRaw(mainGuard, 'not json').notice).toContain('main-checkout-guard');
    expect(runRaw(mainGuard, '').notice).toContain('main-checkout-guard');
  });
});
