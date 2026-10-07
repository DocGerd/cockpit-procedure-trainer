import { ctslAircraft } from '@cpt/aircraft-ctsl';
import { demoAircraft } from '@cpt/aircraft-demo';
import { expect, test } from './fixtures';
import { openAircraft } from './legibility';
import { checklistPane, copy, dockedUnit } from './trainer';

const cases = [
  { aircraft: ctslAircraft, install: 'gps', device: 'gpsmap496' },
  { aircraft: demoAircraft, install: 'radio', device: 'com' },
];

const viewports = [
  { width: 1920, height: 950 },
  { width: 1920, height: 1080 },
];

for (const { aircraft, install, device } of cases) {
  for (const viewport of viewports) {
    test(`${aircraft.id} keeps the checklist Restart button in view with a docked device at ${viewport.width}x${viewport.height}`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await openAircraft(page, aircraft);
      await dockedUnit(page, install, device);

      const pane = await checklistPane(page).boundingBox();
      const restart = checklistPane(page).getByRole('button', {
        name: copy.checklist.restart,
        exact: true,
      });
      await expect(restart).toBeInViewport({ ratio: 1 });
      const button = await restart.boundingBox();
      if (!pane || !button) throw new Error('no boxes');
      expect(button.y, 'Restart top').toBeGreaterThanOrEqual(pane.y);
      expect(button.y + button.height, 'Restart bottom').toBeLessThanOrEqual(pane.y + pane.height);
    });
  }
}
