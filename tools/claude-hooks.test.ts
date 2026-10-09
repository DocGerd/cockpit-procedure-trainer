import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const hooks = resolve(import.meta.dirname, '../.claude/hooks');
const referenceGuard = join(hooks, 'reference-guard.sh');
const mainGuard = join(hooks, 'main-checkout-guard.sh');

const cleanEnv = Object.fromEntries(
  Object.entries(process.env).filter(([k]) => !k.startsWith('GIT_') && !k.startsWith('CPT_')),
);

let root: string;
let main: string;
let worktree: string;
let nested: string;
let other: string;
let plain: string;

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

interface Call {
  tool: string;
  input: Record<string, string>;
  cwd?: string;
  project?: string;
  env?: Record<string, string>;
}

function run(script: string, call: Call): { denied: boolean; reason: string; stderr: string } {
  const result = spawnSync(script, [], {
    input: JSON.stringify({
      tool_name: call.tool,
      tool_input: call.input,
      cwd: call.cwd ?? worktree,
    }),
    env: { ...cleanEnv, CLAUDE_PROJECT_DIR: call.project ?? worktree, ...call.env },
    encoding: 'utf8',
  });
  expect(result.status).toBe(0);
  if (result.stdout.trim() === '') return { denied: false, reason: '', stderr: result.stderr };
  const out = JSON.parse(result.stdout) as {
    hookSpecificOutput: {
      hookEventName: string;
      permissionDecision: string;
      permissionDecisionReason: string;
    };
  };
  const decision = out.hookSpecificOutput;
  expect(decision.hookEventName).toBe('PreToolUse');
  return {
    denied: decision.permissionDecision === 'deny',
    reason: decision.permissionDecisionReason,
    stderr: result.stderr,
  };
}

beforeAll(() => {
  root = realpathSync(mkdtempSync(join(tmpdir(), 'claude-hooks-')));
  main = join(root, 'main');
  worktree = join(root, 'wt');
  nested = join(main, '.claude/worktrees/nested');
  other = join(root, 'other');
  plain = join(root, 'plain');
  mkdirSync(main);
  git(main, 'init', '-q', '-b', 'develop');
  touch(join(main, 'README.md'));
  touch(join(main, 'reference/handbook.txt'));
  touch(join(main, 'docs/aircraft/x-intake.md'));
  git(main, 'add', 'README.md', 'docs');
  git(main, 'commit', '-q', '-m', 'init');
  git(main, 'worktree', 'add', '-q', '-b', 'wt', worktree);
  git(main, 'worktree', 'add', '-q', '-b', 'nested', nested);
  touch(join(worktree, 'reference/own.txt'));
  mkdirSync(other);
  git(other, 'init', '-q', '-b', 'develop');
  mkdirSync(plain);
  symlinkSync(join(main, 'reference'), join(worktree, 'link-to-reference'));
});

afterAll(() => {
  rmSync(root, { recursive: true, force: true });
});

describe('reference-guard.sh', () => {
  const guard = (call: Call) => run(referenceGuard, call);

  it('denies a Read by relative path into the worktree reference/', () => {
    const r = guard({ tool: 'Read', input: { file_path: 'reference/own.txt' } });
    expect(r.denied).toBe(true);
    expect(r.reason).toContain('docs/aircraft/<id>-intake.md');
    expect(r.reason).toContain('CPT_ALLOW_REFERENCE=1');
  });

  it('denies an absolute path from a worktree into the main checkout reference/', () => {
    const r = guard({ tool: 'Read', input: { file_path: join(main, 'reference/handbook.txt') } });
    expect(r.denied).toBe(true);
  });

  it('denies a path that reaches reference/ through ..', () => {
    const r = guard({
      tool: 'Read',
      input: { file_path: join(worktree, 'docs/../reference/own.txt') },
    });
    expect(r.denied).toBe(true);
  });

  it('denies a path that reaches reference/ through a symlink', () => {
    const r = guard({
      tool: 'Read',
      input: { file_path: join(worktree, 'link-to-reference/handbook.txt') },
    });
    expect(r.denied).toBe(true);
  });

  it('denies a not-yet-existing file under reference/', () => {
    expect(guard({ tool: 'Write', input: { file_path: 'reference/new/a.md' } }).denied).toBe(true);
  });

  it('denies a NotebookEdit and a Grep path under reference/', () => {
    expect(
      guard({ tool: 'NotebookEdit', input: { notebook_path: join(main, 'reference/n.ipynb') } })
        .denied,
    ).toBe(true);
    expect(guard({ tool: 'Grep', input: { pattern: 'x', path: 'reference' } }).denied).toBe(true);
  });

  it('denies a Glob pattern that names reference/', () => {
    expect(guard({ tool: 'Glob', input: { pattern: 'reference/**/*.pdf' } }).denied).toBe(true);
    expect(guard({ tool: 'Glob', input: { pattern: '**/reference/*' } }).denied).toBe(true);
    expect(guard({ tool: 'Glob', input: { pattern: join(main, 'reference/*.txt') } }).denied).toBe(
      true,
    );
    expect(
      guard({ tool: 'Glob', input: { pattern: 'reference/*', path: main }, cwd: plain }).denied,
    ).toBe(true);
  });

  it('denies a search without a path from a session inside reference/', () => {
    expect(
      guard({ tool: 'Grep', input: { pattern: 'x' }, cwd: join(worktree, 'reference') }).denied,
    ).toBe(true);
    expect(
      guard({ tool: 'Glob', input: { pattern: '*.txt' }, cwd: join(main, 'reference') }).denied,
    ).toBe(true);
  });

  it('denies a Grep glob that names reference/', () => {
    expect(guard({ tool: 'Grep', input: { pattern: 'x', glob: 'reference/**' } }).denied).toBe(
      true,
    );
  });

  it('allows a normal file, directory and docs path', () => {
    expect(guard({ tool: 'Read', input: { file_path: 'README.md' } }).denied).toBe(false);
    expect(
      guard({ tool: 'Read', input: { file_path: join(main, 'docs/aircraft/x-intake.md') } }).denied,
    ).toBe(false);
    expect(guard({ tool: 'Grep', input: { pattern: 'x', path: 'docs' } }).denied).toBe(false);
    expect(guard({ tool: 'Glob', input: { pattern: 'docs/**/*.md' } }).denied).toBe(false);
  });

  it('allows a path that only contains the word reference', () => {
    expect(guard({ tool: 'Read', input: { file_path: 'docs/reference-notes.md' } }).denied).toBe(
      false,
    );
    expect(
      guard({ tool: 'Read', input: { file_path: join(other, 'reference/a.txt') } }).denied,
    ).toBe(false);
  });

  it('allows everything with CPT_ALLOW_REFERENCE=1', () => {
    const r = guard({
      tool: 'Read',
      input: { file_path: 'reference/own.txt' },
      env: { CPT_ALLOW_REFERENCE: '1' },
    });
    expect(r.denied).toBe(false);
  });

  it('fails open with a stderr notice on unparseable input', () => {
    const result = spawnSync(referenceGuard, [], {
      input: 'not json',
      env: { ...cleanEnv, CLAUDE_PROJECT_DIR: worktree },
      encoding: 'utf8',
    });
    expect(result.status).toBe(0);
    expect(result.stdout).toBe('');
    expect(result.stderr).toContain('reference-guard');
  });
});

describe('main-checkout-guard.sh', () => {
  const guard = (call: Call) => run(mainGuard, call);

  it('denies an edit of a file in the main checkout', () => {
    const r = guard({ tool: 'Edit', input: { file_path: join(main, 'README.md') } });
    expect(r.denied).toBe(true);
    expect(r.reason).toContain('own git worktree');
    expect(r.reason).toContain('CPT_ALLOW_MAIN_EDIT=1');
  });

  it('denies from a main-checkout session by relative path and NotebookEdit', () => {
    expect(
      guard({ tool: 'Write', input: { file_path: 'README.md' }, cwd: main, project: main }).denied,
    ).toBe(true);
    expect(
      guard({ tool: 'NotebookEdit', input: { notebook_path: join(main, 'n.ipynb') } }).denied,
    ).toBe(true);
  });

  it('denies a new file in a not-yet-existing directory of the main checkout', () => {
    const r = guard({ tool: 'Write', input: { file_path: join(main, 'a/b/c/new.ts') } });
    expect(r.denied).toBe(true);
  });

  it('denies a path that reaches the main checkout through ..', () => {
    const r = guard({ tool: 'Edit', input: { file_path: join(worktree, '../main/README.md') } });
    expect(r.denied).toBe(true);
  });

  it('allows an edit in a linked worktree', () => {
    expect(guard({ tool: 'Edit', input: { file_path: join(worktree, 'README.md') } }).denied).toBe(
      false,
    );
    expect(
      guard({ tool: 'Write', input: { file_path: join(worktree, 'new/dir/a.ts') } }).denied,
    ).toBe(false);
  });

  it('allows an edit in a linked worktree nested under the main checkout', () => {
    expect(guard({ tool: 'Edit', input: { file_path: join(nested, 'README.md') } }).denied).toBe(
      false,
    );
    expect(
      guard({ tool: 'Write', input: { file_path: join(nested, 'x/y/new.ts') }, project: nested })
        .denied,
    ).toBe(false);
  });

  it('allows a path outside any repo', () => {
    expect(guard({ tool: 'Write', input: { file_path: join(plain, 'a/b.txt') } }).denied).toBe(
      false,
    );
  });

  it('allows a path in another repo', () => {
    expect(guard({ tool: 'Edit', input: { file_path: join(other, 'a.txt') } }).denied).toBe(false);
  });

  it('allows an edit in the main checkout with CPT_ALLOW_MAIN_EDIT=1', () => {
    const r = guard({
      tool: 'Edit',
      input: { file_path: join(main, 'README.md') },
      env: { CPT_ALLOW_MAIN_EDIT: '1' },
    });
    expect(r.denied).toBe(false);
  });

  it('fails open with a stderr notice on unparseable input', () => {
    const result = spawnSync(mainGuard, [], {
      input: 'not json',
      env: { ...cleanEnv, CLAUDE_PROJECT_DIR: worktree },
      encoding: 'utf8',
    });
    expect(result.status).toBe(0);
    expect(result.stdout).toBe('');
    expect(result.stderr).toContain('main-checkout-guard');
  });
});
