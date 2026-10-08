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

const COVERED = 'only partly tappable, its centre lands on the next position';
const PARTLY = 'partly covered by the next position, its centre still its own';

/**
 * Overlapping touch targets accepted per aircraft and view, keyed by the placement or placement
 * pair the finding names, each with what a tap loses. Spacing any of them out needs a higher
 * floor, which loses the combined layout at 1920x1080 (one-viewport design, Decision 7).
 */
const acceptedOverlaps: Readonly<Record<string, Readonly<Record<string, Record<string, string>>>>> =
  {
    demo: {
      panel: {
        battery: `two-position switch: OFF ${COVERED}`,
        alternator: `two-position switch: OFF ${COVERED}`,
        avionics: `two-position switch: OFF ${COVERED}`,
        annunciator: `three-position rotary knob: DIM and BRIGHT each ${COVERED}`,
        magnetos: `four-position rotary knob: OFF, RIGHT and LEFT each ${PARTLY}`,
      },
      console: {
        flaps: `three-detent lever: UP and TAKEOFF each ${PARTLY}`,
        fuelSelector: `four-position selector: OFF and RIGHT each ${COVERED}`,
      },
    },
    ctsl: {
      centre: {
        'fuelValve and ignition': `only while the valve is closed (the floor's initial state): its handle covers the key slot (intake §3.3), so a tap there moves the valve; open, the valve takes taps only in its slot above the key`,
      },
    },
  };

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
