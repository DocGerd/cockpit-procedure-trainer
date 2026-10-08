import { ctslAircraft } from '@cpt/aircraft-ctsl';
import { demoAircraft } from '@cpt/aircraft-demo';
import type { Locator, Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { pressDevice } from './flight';
import { openAircraft, selectLanguage } from './legibility';
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

const longestNormal = Object.entries(ctslAircraft.procedures)
  .filter(([, procedure]) => procedure.type === 'normal')
  .reduce((longest, entry) => (entry[1].items.length > longest[1].items.length ? entry : longest));

const SUBPIXEL = 1;

/** The CTSL panel draws its controls as artwork: buttons that flip or are held, sliders that step, one radio group. */
async function operate(page: Page, controlId: string, position: string | number) {
  const name = ctslAircraft.controls[controlId]?.name.en;
  if (name === undefined) throw new Error(`no control ${controlId}`);
  const radio = page.getByRole('radiogroup', { name, exact: true }).getByRole('radio', {
    name: String(position),
    exact: true,
  });
  const slider = page.getByRole('slider', { name, exact: true });
  const button = page.getByRole('button', { name: `${name}: ${position}`, exact: true });
  if (ctslAircraft.controls[controlId]?.kind === 'momentary') {
    await page.getByRole('button', { name, exact: true }).focus();
    await page.keyboard.down('Enter');
    await page.keyboard.up('Enter');
  } else if ((await radio.count()) > 0) {
    await radio.click();
  } else if ((await slider.count()) > 0) {
    await slider.focus();
    let key = 'ArrowRight';
    for (let step = 0; step < 16; step++) {
      const shown = await slider.getAttribute('aria-valuetext');
      if (shown === String(position)) return;
      await slider.press(key);
      if ((await slider.getAttribute('aria-valuetext')) === shown) key = 'ArrowLeft';
    }
    await expect(slider).toHaveAttribute('aria-valuetext', String(position));
  } else {
    const flip = page.getByRole('button', { name: new RegExp(`^${name}: `) });
    for (let step = 0; step < 3 && (await button.count()) === 0; step++) await flip.click();
    await expect(button).toBeVisible();
  }
}

async function isSet(page: Page, controlId: string, position: string | number) {
  const name = ctslAircraft.controls[controlId]?.name.en;
  if (name === undefined) throw new Error(`no control ${controlId}`);
  const radio = page.getByRole('radiogroup', { name, exact: true }).getByRole('radio', {
    name: String(position),
    exact: true,
  });
  const slider = page.getByRole('slider', { name, exact: true });
  if ((await radio.count()) > 0) return radio.isChecked();
  if ((await slider.count()) > 0) {
    return (await slider.getAttribute('aria-valuetext')) === String(position);
  }
  return (
    (await page.getByRole('button', { name: `${name}: ${position}`, exact: true }).count()) > 0
  );
}

async function advance(
  page: Page,
  item: (typeof longestNormal)[1]['items'][number] | undefined,
  card: Locator,
  at: number,
) {
  const verify = card.getByRole('button', { name: copy.checklist.verify, exact: true });
  if (item?.type === 'action' && !Object.hasOwn(ctslAircraft.controls, item.control)) {
    await pressDevice(page, ctslAircraft, item.control, item.position, verify);
  } else if (item?.type === 'action' && (await isSet(page, item.control, item.position))) {
    await verify.click();
  } else if (item?.type === 'action') {
    await operate(page, item.control, item.position);
  } else {
    await card.getByRole('button').last().click();
  }
  await expect
    .poll(
      async () =>
        (await card.count()) === 0 ||
        (await card.locator('.checklist-number').innerText()) !== String(at),
      { message: `item ${at} advances` },
    )
    .toBe(true);
}

test('the pane header and the whole current card stay in view at every item of the longest CTSL procedure', async ({
  page,
}) => {
  test.setTimeout(180_000);
  await page.setViewportSize({ width: 1920, height: 1080 });
  const [id, longest] = longestNormal;
  await openAircraft(page, ctslAircraft, id);
  const pane = checklistPane(page);
  const footer = pane.locator('.checklist-footer');
  const list = pane.locator('.checklist-items');
  const card = pane.locator('[aria-current="step"]');
  const number = card.locator('.checklist-number');
  const title = pane.getByRole('heading', { level: 1 });
  const bar = pane.getByRole('progressbar', { name: copy.checklist.progress });
  const visited = new Set<number>();

  while ((await card.count()) > 0 && visited.size < longest.items.length) {
    const at = Number(await number.innerText());
    const label = `item ${at}`;
    visited.add(at);
    await expect(title, `title at ${label}`).toBeInViewport({ ratio: 1 });
    await expect(bar, `progress at ${label}`).toBeInViewport({ ratio: 1 });
    await expect(card, `card at ${label}`).toBeInViewport({ ratio: 1 });

    const [paneBox, listBox, footerBox, cardBox, titleBox] = await Promise.all([
      pane.boundingBox(),
      list.boundingBox(),
      footer.boundingBox(),
      card.boundingBox(),
      title.boundingBox(),
    ]);
    if (!paneBox || !listBox || !footerBox || !cardBox || !titleBox) throw new Error('no boxes');
    expect(titleBox.y, `title top at ${label}`).toBeGreaterThanOrEqual(paneBox.y);
    expect(cardBox.y, `card top at ${label}`).toBeGreaterThanOrEqual(listBox.y - SUBPIXEL);
    expect(cardBox.y + cardBox.height, `card bottom at ${label}`).toBeLessThanOrEqual(
      Math.min(listBox.y + listBox.height, footerBox.y) + SUBPIXEL,
    );
    const covered = await card.evaluate((element) => {
      const box = element.getBoundingClientRect();
      const hit = document.elementFromPoint(box.left + box.width / 2, box.bottom - 2);
      return !hit || !element.contains(hit);
    });
    expect(covered, `card covered at ${label}`).toBe(false);

    await advance(page, longest.items[at - 1], card, at);
  }
  expect(visited.size, 'items the current card visited').toBeGreaterThan(longest.items.length / 2);
});

test('a deviation banner leaves the current card where it was', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await openAircraft(page, ctslAircraft, longestNormal[0]);
  const card = checklistPane(page).locator('[aria-current="step"]');
  const before = await card.boundingBox();

  await operate(page, 'positionLights', 'on');
  await expect(page.getByRole('status')).toContainText(copy.checklist.deviationBanner);

  const after = await card.boundingBox();
  if (!before || !after) throw new Error('no boxes');
  expect(Math.abs(after.y - before.y), 'card top shift').toBeLessThanOrEqual(4);
});

test('a deviation banner leaves the current card where it was once the list has scrolled', async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1920, height: 1080 });
  const [id, longest] = longestNormal;
  await openAircraft(page, ctslAircraft, id);
  const pane = checklistPane(page);
  const list = pane.locator('.checklist-items');
  const card = pane.locator('[aria-current="step"]');

  for (let step = 0; step < longest.items.length; step++) {
    if ((await list.evaluate((element) => element.scrollTop)) > 0) break;
    const at = Number(await card.locator('.checklist-number').innerText());
    await advance(page, longest.items[at - 1], card, at);
  }
  expect(await list.evaluate((element) => element.scrollTop), 'list scrolled').toBeGreaterThan(0);

  const before = await card.boundingBox();
  await operate(page, 'positionLights', 'on');
  await expect(page.getByRole('status')).toContainText(copy.checklist.deviationBanner);
  const after = await card.boundingBox();
  if (!before || !after) throw new Error('no boxes');
  expect(Math.abs(after.y - before.y), 'card top shift').toBeLessThanOrEqual(4);
});

for (const aircraft of [ctslAircraft, demoAircraft]) {
  test(`${aircraft.id} keeps the tablet overlay's Restart button in view on its longest procedure`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    const [id] = Object.entries(aircraft.procedures).reduce((longest, entry) =>
      entry[1].items.length > longest[1].items.length ? entry : longest,
    );
    await openAircraft(page, aircraft, id);
    await page
      .getByRole('banner')
      .getByRole('button', { name: /^Checklist/ })
      .click();

    const pane = checklistPane(page);
    await expect(
      pane.getByRole('button', { name: copy.checklist.restart, exact: true }),
    ).toBeInViewport({ ratio: 1 });
    await expect(pane.getByRole('heading', { level: 1 })).toBeInViewport({ ratio: 1 });
    await expect(pane.locator('[aria-current="step"]')).toBeInViewport({ ratio: 1 });
  });
}

test('the Practice Reading field stays inside the card and the pane never scrolls sideways', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  const entry = Object.entries(ctslAircraft.procedures).find(([, procedure]) =>
    procedure.items.some((item) => item.type === 'check' && item.response !== undefined),
  );
  if (!entry) throw new Error('no CTSL procedure has a reading');
  const [id, procedure] = entry;
  await openAircraft(page, ctslAircraft, id);
  await page.getByRole('button', { name: 'Practice', exact: true }).click();

  const pane = checklistPane(page);
  const card = pane.locator('[aria-current="step"]');
  const field = card.locator('.checklist-response');
  for (let step = 0; step < procedure.items.length && (await field.count()) === 0; step++) {
    const at = Number(await card.locator('.checklist-number').innerText());
    await advance(page, procedure.items[at - 1], card, at);
  }
  await selectLanguage(page, 'de');
  await expect(field).toBeVisible();

  const overflow = await pane.evaluate((root) =>
    [root, ...root.querySelectorAll<HTMLElement>('*')]
      .filter((element) => element.scrollWidth > element.clientWidth + 1)
      .map((element) => element.className || element.tagName),
  );
  expect(overflow, 'elements wider inside than outside').toEqual([]);

  const [cardBox, fieldBox, padding] = await Promise.all([
    card.boundingBox(),
    field.boundingBox(),
    card.evaluate((element) => parseFloat(getComputedStyle(element).paddingRight)),
  ]);
  if (!cardBox || !fieldBox) throw new Error('no boxes');
  expect(fieldBox.x + fieldBox.width, 'field right edge').toBeLessThanOrEqual(
    cardBox.x + cardBox.width - padding + SUBPIXEL,
  );
});
