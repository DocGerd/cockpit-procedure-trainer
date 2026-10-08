// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ControlDefinition, ControlPosition } from '@cpt/core';
import { resolveControl } from '@cpt/panel-kit';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { aircraftRegistry } from '../aircraft-registry';

const rescue: ControlDefinition | undefined = aircraftRegistry.find(
  (aircraft) => aircraft.id === 'ctsl',
)?.controls.rescueHandle;
if (!rescue) throw new Error('The CTSL has no rescue handle');

const svgOf = (url: string) => {
  if (!url.startsWith('data:')) return readSvg(url);
  const body = url.slice(url.indexOf(',') + 1);
  return url.includes(';base64,')
    ? Buffer.from(body, 'base64').toString('utf8')
    : decodeURIComponent(body);
};
const readSvg = (url: string) =>
  readFileSync(join(process.cwd(), new URL(url, 'http://localhost').pathname), 'utf8');

beforeEach(() => {
  vi.spyOn(HTMLImageElement.prototype, 'naturalWidth', 'get').mockReturnValue(206);
  vi.spyOn(HTMLImageElement.prototype, 'naturalHeight', 'get').mockReturnValue(276);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function drawnHandle(position: ControlPosition, guardOpen: boolean): string {
  if (!rescue) throw new Error('The CTSL has no rescue handle');
  const { widget: Widget } = resolveControl(rescue);
  render(
    <Widget
      control={rescue}
      position={position}
      guardOpen={guardOpen}
      label="Rescue"
      positionLabels={{}}
      onSet={vi.fn()}
      onPress={vi.fn()}
      onRelease={vi.fn()}
      onOpenGuard={vi.fn()}
      onCloseGuard={vi.fn()}
    />,
  );
  fireEvent.load(document.querySelector('img') as Element);
  const href = document.querySelector('svg image')?.getAttribute('href');
  if (!href) throw new Error('the rescue handle draws no moving image');
  return svgOf(href);
}

const showsPin = (svg: string) => /data-pin=(""|'')/.test(svg);

describe('CTSL rescue handle safety pin', () => {
  it('draws the pin in the holder while the guard is closed', () => {
    expect(showsPin(drawnHandle('stowed', false))).toBe(true);
  });

  it('draws no pin once the guard is open, the handle still stowed', () => {
    expect(showsPin(drawnHandle('stowed', true))).toBe(false);
  });

  it('draws no pin on the pulled handle', () => {
    expect(showsPin(drawnHandle('pulled', true))).toBe(false);
  });
});
