import { expect, test } from './fixtures';
import { aircraftRegistry } from '../src/aircraft-registry';
import {
  fitViewAt,
  legibilityProblems,
  openAircraft,
  selectLanguage,
  showView,
} from './legibility';

for (const aircraft of aircraftRegistry) {
  for (const [viewId, cell] of Object.entries(aircraft.cockpit?.views ?? {})) {
    for (const language of ['en', 'de'] as const) {
      test(`${aircraft.id} ${viewId} is legible and operable at its declared floor in ${language}`, async ({
        page,
      }) => {
        await openAircraft(page, aircraft);
        await selectLanguage(page, language);
        await showView(page, aircraft, viewId, language);
        const rendered = await fitViewAt(page, viewId, cell.minWidth);
        expect(rendered, 'rendered width at the floor').toBeGreaterThanOrEqual(cell.minWidth);
        expect(rendered, 'the floor is reachable to within a pixel').toBeLessThan(
          cell.minWidth + 1,
        );
        expect(await legibilityProblems(page, aircraft, viewId)).toEqual([]);
      });
    }
  }
}
