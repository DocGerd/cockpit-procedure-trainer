export type SettingKey = 'theme' | 'language' | 'aircraft';

const prefix = 'cpt.';

export function readSetting(key: SettingKey): string | undefined {
  try {
    return window.localStorage.getItem(prefix + key) ?? undefined;
  } catch {
    return undefined;
  }
}

export function writeSetting(key: SettingKey, value: string): void {
  try {
    window.localStorage.setItem(prefix + key, value);
  } catch {
    // The app works without persistence (spec §5).
  }
}
