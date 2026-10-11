// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PAGES, aera500Device } from '../logic';
import type { Aera500State } from '../logic';
import { Aera500Screen } from './Aera500Screen';

afterEach(cleanup);

// Its own file: React prints each key warning once per module load, so an earlier render would hide it.
describe('Aera500Screen warnings', () => {
  it('draws every page, the overlay and the dark glass without a React warning', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const lit: Aera500State = {
      ...(aera500Device.initial as Aera500State),
      on: true,
      powered: true,
    };
    const states = [
      ...PAGES.map((page) => ({ ...lit, page, fix: true })),
      { ...lit, page: 'home' as const, overlay: true },
    ];
    for (const state of states) {
      render(<Aera500Screen on state={state} send={vi.fn()} />);
      cleanup();
    }
    render(<Aera500Screen on={false} state={lit} send={vi.fn()} />);
    expect(error).not.toHaveBeenCalled();
    error.mockRestore();
  });
});
