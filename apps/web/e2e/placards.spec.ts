import { expect, test } from './fixtures';
import { aircraftRegistry } from '../src/aircraft-registry';
import { priorityViewports } from './layout-probe';
import { openAircraft, placardProblems, selectLanguage, showView } from './legibility';

const viewports = [...priorityViewports, { width: 1440, height: 900 }];

// The demo's avionics placard overflows in the tabs at the scaled 4K laptop window; it needs a
// shorter label on the aircraft, which is aircraft content. Marked `test.fail`, so the entry has to
// go once it is fixed.
const placardGaps: ReadonlySet<string> = new Set(['demo 1536x760']);

const runs = aircraftRegistry.flatMap((aircraft) =>
  viewports.flatMap((viewport) =>
    (['en', 'de'] as const).map((language) => ({ aircraft, viewport, language })),
  ),
);

for (const { aircraft, viewport, language } of runs) {
  test(`${aircraft.id} in ${language} prints a legible placard on every widget control at ${viewport.width}x${viewport.height}`, async ({
    page,
  }) => {
    test.fail(
      placardGaps.has(`${aircraft.id} ${viewport.width}x${viewport.height}`),
      'The avionics placard does not fit in the tabs at this size (#785)',
    );
    await page.setViewportSize(viewport);
    await openAircraft(page, aircraft);
    await selectLanguage(page, language);
    for (const viewId of Object.keys(aircraft.views)) {
      const root = await showView(page, aircraft, viewId, language);
      expect(await placardProblems(root, aircraft, viewId)).toEqual([]);
    }
  });
}
