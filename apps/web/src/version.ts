import type { DeployEnv } from './deploy-env';

const COMMIT_LENGTH = 7;

/** Newest released version in a Keep a Changelog file; release.yml tags from the same heading. */
export function latestRelease(changelog: string): string | undefined {
  return /^## \[(\d+\.\d+\.\d+)\]/m.exec(changelog)?.[1];
}

export function copyrightNotice(license: string): string | undefined {
  const match = /^Copyright \(c\) (\d{4}(?:-\d{4})?) (.+)$/m.exec(license);
  return match ? `© ${match[1]} ${match[2]}` : undefined;
}

export function versionLabel({
  release,
  deployEnv,
  commit,
}: {
  release: string | undefined;
  deployEnv: DeployEnv;
  commit: string | undefined;
}): string {
  if (release === undefined) return 'dev';
  const version = `v${release}`;
  return deployEnv === 'uat' && commit ? `${version} · ${commit.slice(0, COMMIT_LENGTH)}` : version;
}
