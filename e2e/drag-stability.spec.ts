import { expect, test, cards, column, demoLogin } from './fixtures';
import type { Page } from '@playwright/test';

// Regression for functional review round 4 (blocker): slow mouse drags across
// columns could make dnd-kit and React ping-pong the card between columns until
// React gave up ("Maximum update depth exceeded", minified error #185).

async function slowDrag(
  page: Page,
  from: { x: number; y: number },
  to: { x: number; y: number },
  steps: number,
) {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(from.x + 8, from.y + 8, { steps: 3 });
  for (let i = 1; i <= steps; i++) {
    await page.mouse.move(
      from.x + ((to.x - from.x) * i) / steps,
      from.y + ((to.y - from.y) * i) / steps,
    );
    await page.waitForTimeout(16);
  }
  await page.mouse.up();
}

const cases = [
  { from: 'todo', fromIndex: 0, to: 'done', toIndex: 1, steps: 60 },
  { from: 'todo', fromIndex: 0, to: 'done', toIndex: 0, steps: 60 },
  { from: 'in_progress', fromIndex: 1, to: 'todo', toIndex: 2, steps: 30 },
  { from: 'done', fromIndex: 0, to: 'in_progress', toIndex: 1, steps: 30 },
] as const;

for (const c of cases) {
  test(`slow drag ${c.from}[${c.fromIndex}] → ${c.to}[${c.toIndex}] in ${c.steps} steps does not crash`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await demoLogin(page);
    const source = (await cards(page, c.from).nth(c.fromIndex).boundingBox())!;
    const target = (await cards(page, c.to).nth(c.toIndex).boundingBox())!;
    const before = await cards(page, c.to).count();
    await slowDrag(
      page,
      { x: source.x + source.width / 2, y: source.y + source.height / 2 },
      { x: target.x + target.width / 2, y: target.y + target.height / 2 },
      c.steps,
    );
    await expect(page.getByText('Unexpected Application Error')).toHaveCount(0);
    await expect(column(page, c.to).getByTestId('column-count')).toHaveText(String(before + 1));
  });
}
