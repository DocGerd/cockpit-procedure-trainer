// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { UPDATE_CHECK_INTERVAL_MS, watchForUpdates } from './update-check';

const registration = () => ({ update: vi.fn().mockResolvedValue(undefined) });

const setOnline = (online: boolean) =>
  Object.defineProperty(navigator, 'onLine', { value: online, configurable: true });

const setVisibility = (state: DocumentVisibilityState) => {
  Object.defineProperty(document, 'visibilityState', { value: state, configurable: true });
  document.dispatchEvent(new Event('visibilitychange'));
};

beforeEach(() => {
  vi.useFakeTimers();
  setOnline(true);
  setVisibility('visible');
});

afterEach(() => {
  vi.useRealTimers();
  Reflect.deleteProperty(navigator, 'onLine');
});

describe('watchForUpdates', () => {
  it('checks once per interval', () => {
    const reg = registration();
    watchForUpdates(reg);
    vi.advanceTimersByTime(UPDATE_CHECK_INTERVAL_MS - 1);
    expect(reg.update).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(reg.update).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(UPDATE_CHECK_INTERVAL_MS);
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

  it('survives a failed check', async () => {
    const reg = { update: vi.fn().mockRejectedValueOnce(new Error('network')) };
    watchForUpdates(reg);
    vi.advanceTimersByTime(UPDATE_CHECK_INTERVAL_MS);
    await Promise.resolve();
    reg.update.mockResolvedValue(undefined);
    vi.advanceTimersByTime(UPDATE_CHECK_INTERVAL_MS);
    expect(reg.update).toHaveBeenCalledTimes(2);
  });
});
