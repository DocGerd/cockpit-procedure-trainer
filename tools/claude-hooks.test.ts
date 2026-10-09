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
const bashGuard = join(hooks, 'bash-reference-guard.sh');
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
    const hook = entry.hooks.find((h) => h.command.includes(`/${script}`));
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
let bare: string;
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
  bare = join(root, 'wt3');
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
  git(main, 'worktree', 'add', '-q', '-b', 'wt3', bare);
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

describe('bash-reference-guard.sh', () => {
  const guard = (command: string, rest: Partial<Call> = {}) =>
    run(bashGuard, { tool: 'Bash', input: { command }, ...rest });
  const denies = (command: string, rest: Partial<Call> = {}) => guard(command, rest).denied;

  it('denies a command that names a path under reference/', () => {
    const r = guard('cat reference/own.txt');
    expect(r.denied).toBe(true);
    expect(r.reason).toContain('docs/aircraft/<id>-intake.md');
    expect(r.reason).toContain('CPT_ALLOW_REFERENCE=1');
    for (const command of [
      'cat reference/own.txt',
      'head -n 5 ./reference/own.txt',
      'sed -n 1p reference/own.txt',
      'cp reference/own.txt /tmp/copy',
      'cat < reference/own.txt',
      'echo x > reference/new.txt',
      'echo x | tee reference/new.txt',
      'cat -- reference/own.txt',
      'X=1 cat reference/own.txt',
      'sudo cat reference/own.txt',
      'cat reference/own.txt | wc -l',
      'echo reference/',
      'cat "reference/own.txt"',
      "cat 'reference/own.txt'",
      'git add reference/',
      'ls reference',
      'cd reference && cat own.txt',
      'cd docs && cat ../reference/own.txt',
      'pushd reference',
      'grep -rn foo reference',
      'grep foo reference/own.txt',
      'grep -e foo reference',
      'rg -n foo reference',
      'tar czf /tmp/x.tgz reference',
      'rsync -a reference/ /tmp/x/',
      'cat docs/../reference/own.txt',
      'cat link-to-reference/handbook.txt',
      'cat Reference/own.txt',
      'cat $HOME/reference/handbook.txt',
      'cat "${HOME}/reference/handbook.txt"',
      'cat ~/reference/handbook.txt',
      'cat --file=reference/own.txt',
      'diff -u README.md reference/own.txt',
      'bash -c "cat reference/own.txt"',
      'eval cat reference/own.txt',
      'echo ok; cat reference/own.txt',
      'echo ok && (cat reference/own.txt)',
      'cat `echo reference/own.txt`',
      'cat <<EOF > reference/x.txt\nbody\nEOF',
      `cat ${main}/reference/handbook.txt`,
      `cat ${worktree2}/reference/copy.txt`,
      `cat ${nested}/reference/doc.txt`,
    ]) {
      expect(denies(command, { env: { HOME: main } }), command).toBe(true);
    }
  });

  it('judges a path against the session cwd', () => {
    expect(denies('cat own.txt', { cwd: join(worktree, 'reference') })).toBe(true);
    expect(denies('cat reference/handbook.txt', { cwd: main })).toBe(true);
    expect(denies('cat ../reference/own.txt', { cwd: join(worktree, 'docs') })).toBe(true);
    expect(denies('cat reference/a.txt', { cwd: other })).toBe(false);
  });

  it('denies a recursive search or copy of a directory that holds reference/', () => {
    const r = guard('grep -rn foo .');
    expect(r.denied).toBe(true);
    expect(r.reason).toContain('--exclude-dir=reference');
    expect(r.reason).toContain('CPT_ALLOW_REFERENCE=1');
    for (const command of [
      'grep -rn foo .',
      'grep -r foo',
      'grep -R foo ..',
      'grep -rl foo /',
      'grep -r -e foo .',
      'egrep -rn foo ./',
      'grep --recursive foo .',
      'grep foo -r .',
      'find . -name "*.pdf" -exec cat {} +',
      'find / -name x -execdir grep foo {} ;',
      'find . -ok cat {} ;',
      'python3 -c "print(open(\'reference/own.txt\').read())"',
      'python -c \'import os; os.listdir("reference")\'',
      "node -e \"require('fs').readFileSync('reference/own.txt')\"",
      "node --eval \"require('fs').readFileSync('reference/own.txt')\"",
      'perl -e \'open(F, "reference/own.txt")\'',
      'ruby -e \'puts File.read("reference/own.txt")\'',
      `python3 -c "print(open('${main}/reference/handbook.txt').read())"`,
      'rg -u foo',
      'rg --no-ignore foo .',
      'rg -uu foo ..',
      'ag -u foo',
      'ack foo',
      'fd -I pdf',
      'cp -r . /tmp/x',
      'cp -a .. /tmp/x',
      'rsync -a . /tmp/x',
      'tar czf /tmp/x.tgz .',
      'zip -r /tmp/x.zip .',
      `grep -rn foo ${main}`,
      'grep -rn foo docs/.. .',
    ]) {
      expect(denies(command), command).toBe(true);
    }
    expect(denies('grep -rn foo .', { cwd: main })).toBe(true);
    expect(denies('find . -exec cat {} +', { cwd: main })).toBe(true);
    expect(denies('cd .. && grep -rn foo .')).toBe(true);
    expect(denies('grep -rn foo .', { cwd: nested })).toBe(true);
  });

  it('allows a recursive command that excludes reference/ or stays elsewhere', () => {
    for (const command of [
      'grep -rn foo docs',
      'grep -rn foo docs/aircraft',
      'grep -r foo . --exclude-dir=reference',
      'grep -r --exclude-dir reference foo .',
      "grep -r --exclude-dir='reference' foo .",
      'rg foo',
      'rg -n foo .',
      'rg -I foo .',
      "rg -u -g '!reference' foo",
      "rg -u --glob '!reference/**' foo",
      'find . -path ./reference -prune -o -type f -exec cat {} +',
      'find . -name "*.ts"',
      'find . -maxdepth 1',
      'find / -name x',
      'find',
      'python3 -c "print(1 + 1)"',
      'node -e "console.log(\'docs/reference-notes.md\')"',
      'python3 script.py',
      'find docs -name "*.md"',
      'find ./docs -type f',
      'cp -r docs /tmp/x',
      'cp -r docs/aircraft docs/more',
      'tar czf /tmp/x.tgz docs',
      'rsync -a docs/ /tmp/x/',
      'zip -r /tmp/x.zip docs',
      'grep -r reference docs',
      'grep -rn "reference/" docs',
      'cp README.md /tmp/x',
      'cat README.md',
    ]) {
      expect(denies(command), command).toBe(false);
    }
  });

  it('allows a recursive search of a checkout that has no reference/', () => {
    expect(denies('grep -rn foo .', { cwd: bare })).toBe(false);
    expect(denies('find . -name x', { cwd: bare })).toBe(false);
    expect(denies('cp -r . /tmp/x', { cwd: bare })).toBe(false);
    expect(denies('grep -rn foo ..', { cwd: bare })).toBe(true);
  });

  it('allows the word reference as search or message text', () => {
    for (const command of [
      'grep -n reference docs/aircraft/x-intake.md',
      'grep reference/ README.md',
      'grep -rn reference docs',
      'grep -e reference README.md',
      'rg reference docs',
      'echo reference',
      'echo "see reference/ for sources"',
      'git commit -m "Guard reference/ in Bash"',
      "git commit -m 'reference/ cleanup'",
      'git commit -m "$(cat <<\'EOF\'\nGuard reference/ in Bash\n\nSee reference/own.txt.\nEOF\n)"',
      "gh pr comment 1 --body-file - <<'EOF'\nreference/own.txt\nEOF",
      'gh pr create --title "Bash reference guard" --body "Closes #1"',
      'git log --oneline -- docs',
      'cat docs/reference-notes.md',
      'cat reference-old/a.txt',
      'cat reference.md',
      'ls docs/reference/',
      'git branch reference',
      'grep -rn foo docs --exclude-dir=reference',
      'cat <<< "reference/own.txt"',
      'pnpm test',
      'pnpm lint && pnpm typecheck',
      'cat "unbalanced',
      '',
    ]) {
      expect(denies(command), command).toBe(false);
    }
  });

  it('allows a reference/ of another repo', () => {
    expect(denies(`cat ${other}/reference/a.txt`)).toBe(false);
    expect(denies('cat reference/a.txt', { cwd: other })).toBe(false);
  });

  it('allows with CPT_ALLOW_REFERENCE=1 only', () => {
    const command = 'cat reference/own.txt';
    expect(denies(command, { env: { CPT_ALLOW_REFERENCE: '1' } })).toBe(false);
    expect(denies('grep -rn foo .', { env: { CPT_ALLOW_REFERENCE: '1' } })).toBe(false);
    expect(denies(command, { env: { CPT_ALLOW_REFERENCE: '0' } })).toBe(true);
    expect(denies(command, { env: { CPT_ALLOW_MAIN_EDIT: '1' } })).toBe(true);
  });

  it('ignores an inherited GIT_DIR when finding the project repo', () => {
    expect(
      denies(`cat ${main}/reference/handbook.txt`, { env: { GIT_DIR: join(other, '.git') } }),
    ).toBe(true);
  });

  it('fails open with a notice when realpath has no -m or git cannot read the repo', () => {
    const command = 'cat reference/own.txt';
    expect(guard(command, { env: { PATH: noRealpathM } }).notice).toContain('bash-reference-guard');
    expect(guard(command, { env: { PATH: dubiousGit } }).notice).toContain('dubious ownership');
    expect(guard(command, { project: plain }).notice).toContain('cannot read the project repo');
  });

  it('fails open with a notice on unexpected input', () => {
    expect(runRaw(bashGuard, 'not json').notice).toContain('bash-reference-guard');
    expect(runRaw(bashGuard, '{"tool_input":"cat reference/x"}').notice).toContain(
      'bash-reference-guard',
    );
  });

  it('ignores a call without a command', () => {
    expect(runRaw(bashGuard, '{"tool_name":"Bash","tool_input":{}}')).toEqual({
      denied: false,
      reason: '',
      notice: '',
    });
  });
});

describe('settings.json wrappers', () => {
  const viaWrapper = (script: string, call: Call) =>
    run('sh', call, ['-c', entryFor(script).command]);

  beforeAll(() => {
    mkdirSync(join(worktree, '.claude/hooks'), { recursive: true });
    for (const script of [referenceGuard, bashGuard, mainGuard]) {
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
    expect(entryFor('bash-reference-guard.sh').matcher).toBe('Bash');
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
    expect(
      viaWrapper('bash-reference-guard.sh', {
        tool: 'Bash',
        input: { command: 'cat reference/own.txt' },
      }).denied,
    ).toBe(true);
  });

  it('deny every Bash call when the Bash reference guard is missing', () => {
    const r = viaWrapper('bash-reference-guard.sh', {
      tool: 'Bash',
      input: { command: 'ls' },
      project: plain,
    });
    expect(r.denied).toBe(true);
    expect(r.reason).toContain('bash-reference-guard.sh');
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

  it('allows files under the top-level .remember/ of the main checkout', () => {
    for (const file of ['.remember/remember.md', '.remember/new/dir/note.md']) {
      expect(denies({ tool: 'Write', input: { file_path: join(main, file) } })).toBe(false);
    }
    expect(
      denies({
        tool: 'Edit',
        input: { file_path: '.remember/remember.md' },
        cwd: main,
        project: main,
      }),
    ).toBe(false);
  });

  it('keeps denying near-misses of .remember/ in the main checkout', () => {
    for (const file of [
      '.remember',
      '.remember-x/a.md',
      '.remembered/a.md',
      'sub/.remember/a.md',
      '.remember/../README.md',
    ]) {
      expect(denies({ tool: 'Write', input: { file_path: join(main, file) } })).toBe(true);
    }
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
