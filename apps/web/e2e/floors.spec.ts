import { expect, test } from '@playwright/test';
import { aircraftRegistry } from '../src/aircraft-registry';
import {
  fitViewAt,
  legibilityProblems,
  openAircraft,
  overlapProblem,
  selectLanguage,
  showView,
} from './legibility';

const TOGGLE =
  'two-position switch: its positions are closer than a touch target in this placement';
const DETENTS = 'its detents are closer than a touch target at this control size';
const BREAKER_ROW =
  'breakers three abreast as fitted (ctsl-intake §3.2), closer than a touch target';

/**
 * Overlapping touch targets accepted per aircraft and view, keyed by the placement or placement
 * pair the finding names. Spacing any of them out needs a higher floor, which loses the combined
 * layout at 1920x1080 (one-viewport design, Decision 7).
 */
const acceptedOverlaps: Readonly<Record<string, Readonly<Record<string, Record<string, string>>>>> =
  {
    demo: {
      panel: {
        battery: TOGGLE,
        alternator: TOGGLE,
        avionics: TOGGLE,
        annunciator: `three-position rotary knob: ${DETENTS}`,
        magnetos: `four-position rotary knob: ${DETENTS}`,
      },
      console: {
        flaps: `three-detent lever: ${DETENTS}`,
        fuelSelector: `four-position selector: ${DETENTS}`,
      },
    },
    ctsl: {
      panel: {
        'positionBreaker and xpdrBreaker': BREAKER_ROW,
        'intercomBreaker and positionBreaker': BREAKER_ROW,
        'gpsBreaker and strobeBreaker': BREAKER_ROW,
        'landingBreaker and strobeBreaker': BREAKER_ROW,
      },
      centre: {
        elt: TOGGLE,
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
