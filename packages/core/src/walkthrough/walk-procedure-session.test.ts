import { afterEach, describe, expect, it, vi } from 'vitest';
import { fixtureAircraft } from '../contract/fixtures';
import type { Session } from '../session';
import { walkProcedure } from './index';

const override = vi.hoisted(() => ({ current: {} as Record<string, unknown> }));

vi.mock('../session', async (importOriginal) => {
  const original = await importOriginal<typeof import('../session')>();
  return {
    ...original,
    createSession: (...args: Parameters<typeof original.createSession>): Session => {
      const session = original.createSession(...args);
      return Object.assign(Object.create(session) as Session, override.current);
    },
  };
});

afterEach(() => {
  override.current = {};
});

const walk = () => walkProcedure(fixtureAircraft, 'beforeStart');

describe('walkProcedure against a misbehaving session', () => {
  it('reports a control the session refuses', () => {
    override.current = { set: () => ({ applied: false, reason: 'guarded' }) };
    expect(walk()).toEqual({
      ok: false,
      aircraft: 'fixture',
      procedure: 'beforeStart',
      itemIndex: 0,
      item: 'Master switch ON',
      reason: 'control guarded',
    });
  });

  it('fails an item that the checklist does not complete', () => {
    override.current = { checkOff: () => undefined };
    expect(walk()).toEqual({
      ok: false,
      aircraft: 'fixture',
      procedure: 'beforeStart',
      itemIndex: 2,
      item: 'Bus voltage present',
      reason: 'item did not complete',
    });
  });

  it('does not report ok without a checklist', () => {
    override.current = { checklist: () => undefined };
    expect(walk()).toMatchObject({ ok: false, reason: 'checklist not complete' });
  });
});
