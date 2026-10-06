import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';
import { aircraftRegistry } from '../src/aircraft-registry';

const CARD_FILL = '#C9CDD2';
const MIN_GAP = 4;
// A title that overflows the card must still be attributed to it, so the card's own text is
// collected a little past its bottom edge.
const OVERFLOW_REACH = 20;

const ctsl = aircraftRegistry.find(({ id }) => id === 'ctsl');
const panelUrl = ctsl?.views.panel?.image;

test('ctsl knee-board cards keep the top rule clear of the title and the lines inside the card', async ({
  page,
}) => {
  if (!panelUrl) throw new Error('ctsl has no panel view');
  await page.setContent(`<body>${readFileSync(fileURLToPath(panelUrl), 'utf8')}</body>`);

  const cards = await page.evaluate(
    ({ fill, reach }) => {
      const svg = document.querySelector('svg');
      if (!svg) return [];
      const number = (el: Element, name: string) => Number(el.getAttribute(name));
      const rules = [...svg.querySelectorAll('path')].flatMap((path) => {
        const match = /^M\s*([\d.]+)[\s,]+([\d.]+)\s+H\s*([\d.]+)$/.exec(
          path.getAttribute('d') ?? '',
        );
        if (!match) return [];
        const stroke = number(path, 'stroke-width');
        return [
          {
            left: Number(match[1]),
            right: Number(match[3]),
            bottom: Number(match[2]) + stroke / 2,
          },
        ];
      });
      return [...svg.querySelectorAll('rect')]
        .filter((rect) => rect.getAttribute('fill')?.toUpperCase() === fill)
        .map((rect) => {
          const left = number(rect, 'x');
          const top = number(rect, 'y');
          const right = left + number(rect, 'width');
          const bottom = top + number(rect, 'height');
          const rule = rules.find(
            (r) => r.left >= left && r.right <= right && r.bottom > top && r.bottom < bottom,
          );
          const titles = [...svg.querySelectorAll('text')]
            .filter((text) => {
              const x = number(text, 'x');
              const y = number(text, 'y');
              return x >= left && x <= right && y > top && y < bottom + reach;
            })
            .map((text) => {
              const box = (text as unknown as SVGGraphicsElement).getBBox();
              return { text: text.textContent ?? '', top: box.y, bottom: box.y + box.height };
            })
            .sort((a, b) => a.top - b.top);
          return { bottom, ruleBottom: rule?.bottom ?? null, titles };
        });
    },
    { fill: CARD_FILL, reach: OVERFLOW_REACH },
  );

  expect(cards.length, 'knee-board cards found').toBeGreaterThan(0);
  for (const card of cards) {
    const label = card.titles.map(({ text }) => text).join(' ');
    const first = card.titles[0];
    const last = card.titles[card.titles.length - 1];
    expect(first, 'card has a title').toBeDefined();
    expect(card.ruleBottom, `${label}: card has a top rule`).not.toBeNull();
    if (!first || !last || card.ruleBottom === null) continue;
    expect(
      first.top - card.ruleBottom,
      `${label}: gap from the rule to the title`,
    ).toBeGreaterThanOrEqual(MIN_GAP);
    expect(last.bottom, `${label}: last line inside the card`).toBeLessThanOrEqual(card.bottom);
  }
});
