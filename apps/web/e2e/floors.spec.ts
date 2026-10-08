import { expect, test } from './fixtures';
import { aircraftRegistry } from '../src/aircraft-registry';
import {
  fitViewAt,
  legibilityProblems,
  openAircraft,
  overlapProblem,
  selectLanguage,
  showView,
} from './legibility';

/**
 * Overlapping touch targets of different controls accepted per aircraft and view, keyed by the
 * placements the finding names (`overlapProblem`, sorted and joined with " and "), each with what
 * a tap loses. The positions of one control are not listed: they share their overlap by clipping.
 * Spacing an entry out needs a higher floor, which loses the combined layout at 1920x1080
 * (one-viewport design, Decision 7).
 */
const acceptedOverlaps: Readonly<Record<string, Readonly<Record<string, Record<string, string>>>>> =
  {};

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
        const accepted = Object.keys(acceptedOverlaps[aircraft.id]?.[viewId] ?? {}).map(
          (placements) => overlapProblem(viewId, placements),
        );
        const problems = await legibilityProblems(page, aircraft, viewId);
        expect(problems.filter((problem) => !accepted.includes(problem))).toEqual([]);
        expect(
          accepted.filter((problem) => !problems.includes(problem)),
          'accepted overlaps that no longer occur',
        ).toEqual([]);
      });
    }
  }
}
