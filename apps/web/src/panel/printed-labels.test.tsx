// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import type { Aircraft, ControlDefinition, Placement, Rect } from '@cpt/core';
import { checkPlacards, printsText } from '@cpt/panel-kit';
import { act, cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { aircraftRegistry } from '../aircraft-registry';
import { deviceRegistry, deviceScreens } from '../device-registry';
import { renderWithLanguage } from '../i18n/test-utils';
import { TrainerProvider, useTrainer } from '../trainer';
import type { Trainer } from '../trainer';
import { PanelArea } from './PanelArea';

afterEach(cleanup);

type Lettering = { text: string; x: number; y: number };

const repository = pathToFileURL(`${process.cwd()}/`);

function readSvg(url: string): string {
  if (url.startsWith('file:')) return readFileSync(new URL(url), 'utf8');
  if (url.startsWith('http:')) {
    return readFileSync(new URL(`.${new URL(url).pathname}`, repository), 'utf8');
  }
  const inline = /^data:image\/svg\+xml(;base64)?,(.*)$/s.exec(url);
  if (!inline) throw new Error(`cannot read the image ${url.slice(0, 60)}`);
  const [, base64, body = ''] = inline;
  return base64 ? Buffer.from(body, 'base64').toString('utf8') : decodeURIComponent(body);
}

const svgText = (url: string): readonly Lettering[] => {
  const svg = readSvg(url);
  return [...svg.matchAll(/<text\b([^>]*)>([^<]*)<\/text>/g)].map(([, attributes = '', text]) => ({
    text: (text ?? '').trim(),
    x: Number(/\bx="([-\d.]+)"/.exec(attributes)?.[1] ?? Number.NaN),
    y: Number(/\by="([-\d.]+)"/.exec(attributes)?.[1] ?? Number.NaN),
  }));
};

const NEAR = 40;
const beside = ({ x, y }: Lettering, { rect }: { rect: Rect }) =>
  x >= rect.x - NEAR &&
  x <= rect.x + rect.w + NEAR &&
  y >= rect.y - NEAR &&
  y <= rect.y + rect.h + NEAR;

const placed = (aircraft: Aircraft) =>
  Object.entries(aircraft.views).flatMap(([viewId, view]) =>
    Object.entries(view.controls ?? {}).flatMap(([id, placement]) => {
      const control = aircraft.controls[id];
      return control && placement ? [{ viewId, view, id, control, placement }] : [];
    }),
  );

const artworkOf = (control: ControlDefinition) =>
  control.appearance && 'artwork' in control.appearance ? control.appearance.artwork : undefined;

const printsOwnLabel = (control: ControlDefinition, placement: Placement) =>
  printsText(placement.printed) || artworkOf(control) !== undefined;

const registered = aircraftRegistry.map((aircraft) => [aircraft.id, aircraft] as const);

describe('printed control labels', () => {
  it.each(registered)('%s labels every control its views place', (_id, aircraft) => {
    expect(
      checkPlacards(aircraft).map(({ view, id, message }) => `${view}/${id}: ${message}`),
    ).toEqual([]);
  });

  it.each(registered)('%s artwork prints the lettering it declares', (_id, aircraft) => {
    const absent = placed(aircraft).flatMap(({ id, control }) => {
      const artwork = artworkOf(control);
      if (!artwork?.lettering) return [];
      const printed = svgText(artwork.face).map(({ text }) => text);
      return artwork.lettering
        .filter((line) => !printed.includes(line))
        .map((line) => `${id}: ${line}`);
    });
    expect(absent).toEqual([]);
  });

  it.each(registered)('%s views print the lettering beside the placements', (_id, aircraft) => {
    const absent = placed(aircraft).flatMap(({ viewId, view, id, placement }) => {
      const printed = svgText(view.image);
      return (placement.printed ?? [])
        .filter((line) => !printed.some((text) => text.text === line && beside(text, placement)))
        .map((line) => `${viewId}/${id}: ${line}`);
    });
    expect(absent).toEqual([]);
  });
});

let trainer: Trainer;
function Probe() {
  trainer = useTrainer();
  return null;
}

const languages = ['en', 'de'] as const;

describe('printed placards on the rendered panel', () => {
  it.each(
    registered.flatMap(([id, aircraft]) => languages.map((lang) => [id, lang, aircraft] as const)),
  )(
    '%s in %s prints every generic control placard in the panel wording',
    async (_id, language, aircraft) => {
      renderWithLanguage(
        <TrainerProvider>
          <Probe />
          <PanelArea />
        </TrainerProvider>,
        { language },
      );
      act(() => trainer.selectAircraft(aircraft.id));
      const wrong: string[] = [];
      for (const [viewId, view] of Object.entries(aircraft.views)) {
        await userEvent.click(screen.getByRole('tab', { name: view.name[language] }));
        for (const { id, control, placement } of placed(aircraft).filter(
          (entry) => entry.viewId === viewId,
        )) {
          if (printsOwnLabel(control, placement)) continue;
          const expected = control.placard?.toUpperCase();
          const shown = document.querySelector(
            `[data-placement="${id}"] [data-placard]`,
          )?.textContent;
          if (expected === undefined || shown !== expected)
            wrong.push(`${viewId}/${id}: ${String(shown)} != ${String(expected)}`);
        }
      }
      expect(wrong).toEqual([]);
    },
  );
});

describe('device keys', () => {
  it.each(deviceRegistry.map((device) => [device.id, device] as const))(
    '%s letters every key it shows',
    (id, device) => {
      const Screen = deviceScreens[id];
      if (!Screen) throw new Error(`no screen for ${id}`);
      const { container } = render(<Screen on state={device.initial} send={() => {}} />);
      const unlabelled = [...container.querySelectorAll<HTMLElement>('button, input, select')]
        .filter((element) => {
          const own = element instanceof HTMLButtonElement ? element.textContent : '';
          const label = element.closest('label')?.textContent ?? '';
          return (own ?? '').trim() === '' && label.trim() === '';
        })
        .map((element) => element.getAttribute('aria-label') ?? element.outerHTML.slice(0, 60));
      expect(unlabelled).toEqual([]);
    },
  );
});
