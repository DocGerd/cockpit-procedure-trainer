export type Release = {
  version: string;
  date: string | undefined;
  sections: { heading: string; items: string[] }[];
};

/** Markdown inline code and links read as plain text in the app. */
function plain(text: string): string {
  return text.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/`([^`]*)`/g, '$1');
}

/** The newest released versions of a Keep a Changelog file, newest first. */
export function latestReleases(changelog: string, count: number): Release[] {
  const releases: Release[] = [];
  let release: Release | undefined;
  let items: string[] | undefined;
  for (const line of changelog.split('\n')) {
    const heading = /^## \[(\d+\.\d+\.\d+)\](?: - (\S+))?/.exec(line);
    if (heading) {
      if (releases.length === count) break;
      release = { version: heading[1] ?? '', date: heading[2], sections: [] };
      releases.push(release);
      items = undefined;
    } else if (line.startsWith('## ')) {
      if (release) break;
    } else if (release && line.startsWith('### ')) {
      items = [];
      release.sections.push({ heading: line.slice(4).trim(), items });
    } else if (items && line.startsWith('- ')) {
      items.push(plain(line.slice(2).trim()));
    } else if (items && items.length > 0 && /^\s+\S/.test(line)) {
      items[items.length - 1] += ` ${plain(line.trim())}`;
    }
  }
  return releases;
}
