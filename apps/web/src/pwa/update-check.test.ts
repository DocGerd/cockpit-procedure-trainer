// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MIN_CHECK_GAP_MS, UPDATE_CHECK_INTERVAL_MS, watchForUpdates } from './update-check';

const registration = () => ({ update: vi.fn().mockResolvedValue(undefined) });

const setOnline = (online: boolean) =>
  Object.defineProperty(navigator, 'onLine', { value: online, configurable: true });

const setVisibility = (state: DocumentVisibilityState) => {
  Object.defineProperty(document, 'visibilityState', { value: state, configurable: true });
  document.dispatchEvent(new Event('visibilitychange'));
};

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'Date'] });
  setOnline(true);
  setVisibility('visible');
});

afterEach(() => {
  vi.useRealTimers();
  Reflect.deleteProperty(navigator, 'onLine');
});

describe('watchForUpdates', () => {
  it('checks once per interval', async () => {
    const reg = registration();
    watchForUpdates(reg);
    vi.advanceTimersByTime(UPDATE_CHECK_INTERVAL_MS - 1);
    expect(reg.update).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(reg.update).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(UPDATE_CHECK_INTERVAL_MS);
    expect(reg.update).toHaveBeenCalledTimes(2);
  });

  it('checks when the document becomes visible again', () => {
    const reg = registration();
    watchForUpdates(reg);
    setVisibility('hidden');
    expect(reg.update).not.toHaveBeenCalled();
    setVisibility('visible');
    expect(reg.update).toHaveBeenCalledTimes(1);
  });

  it('skips checks while offline', () => {
    const reg = registration();
    watchForUpdates(reg);
    setOnline(false);
    vi.advanceTimersByTime(UPDATE_CHECK_INTERVAL_MS);
    setVisibility('hidden');
    setVisibility('visible');
    expect(reg.update).not.toHaveBeenCalled();
    setOnline(true);
    vi.advanceTimersByTime(UPDATE_CHECK_INTERVAL_MS);
    expect(reg.update).toHaveBeenCalledTimes(1);
  });

  it('stops checking after cleanup', () => {
    const reg = registration();
    const stop = watchForUpdates(reg);
    stop();
    vi.advanceTimersByTime(UPDATE_CHECK_INTERVAL_MS * 2);
    setVisibility('hidden');
    setVisibility('visible');
    expect(reg.update).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('keeps one timer when watching again', () => {
    const reg = registration();
    watchForUpdates(reg);
    watchForUpdates(reg);
    expect(vi.getTimerCount()).toBe(1);
    vi.advanceTimersByTime(UPDATE_CHECK_INTERVAL_MS);
    expect(reg.update).toHaveBeenCalledTimes(1);
  });

  it('swallows a failed check, reports it and keeps checking', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const unhandled = vi.fn();
    process.on('unhandledRejection', unhandled);
    try {
      const reg = { update: vi.fn().mockRejectedValueOnce(new Error('network')) };
      watchForUpdates(reg);
      await vi.advanceTimersByTimeAsync(UPDATE_CHECK_INTERVAL_MS);
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(unhandled).not.toHaveBeenCalled();
      expect(warn).toHaveBeenCalledTimes(1);
      reg.update.mockResolvedValue(undefined);
      await vi.advanceTimersByTimeAsync(UPDATE_CHECK_INTERVAL_MS);
      expect(reg.update).toHaveBeenCalledTimes(2);
    } finally {
      process.off('unhandledRejection', unhandled);
      warn.mockRestore();
    }
  });

  it('does not start a check while one is in flight', async () => {
    let finish: () => void = () => undefined;
    const reg = { update: vi.fn(() => new Promise<void>((resolve) => (finish = resolve))) };
    watchForUpdates(reg);
    vi.advanceTimersByTime(UPDATE_CHECK_INTERVAL_MS);
    vi.advanceTimersByTime(MIN_CHECK_GAP_MS);
    setVisibility('hidden');
    setVisibility('visible');
    expect(reg.update).toHaveBeenCalledTimes(1);
    finish();
    await vi.advanceTimersByTimeAsync(0);
    setVisibility('hidden');
    setVisibility('visible');
    expect(reg.update).toHaveBeenCalledTimes(2);
  });

  it('enforces a minimum gap between checks', async () => {
    const reg = registration();
    watchForUpdates(reg);
    setVisibility('hidden');
    setVisibility('visible');
    setVisibility('hidden');
    setVisibility('visible');
    expect(reg.update).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(MIN_CHECK_GAP_MS);
    setVisibility('hidden');
    setVisibility('visible');
    expect(reg.update).toHaveBeenCalledTimes(2);
  });
});
