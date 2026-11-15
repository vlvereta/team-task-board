import type { Page } from '@playwright/test';
import {
  expect,
  test,
  cardIds,
  cards,
  column,
  demoLogin,
  expectCounts,
  mouseDrag,
  expectColumnPersisted,
  pressDuringDrag,
} from './fixtures';

function liveRegion(page: Page) {
  return page.locator('[id^="DndLiveRegion"]');
}

test.describe('drag and drop', () => {
  test.beforeEach(async ({ page }) => {
    await demoLogin(page);
  });

  test('mouse: move a card to another column and persist', async ({ page }) => {
    const todo = await cardIds(page, 'todo');
    const moving = todo[0]!;
    const target = cards(page, 'in_progress').nth(1);
    await mouseDrag(page, page.locator(`[data-task-id="${moving}"]`), target);

    await expect(column(page, 'in_progress').locator(`[data-task-id="${moving}"]`)).toBeVisible();
    await expectCounts(page, 4, 5, 3);
    const inProgress = await cardIds(page, 'in_progress');
    const todoAfter = await cardIds(page, 'todo');
    expect(todoAfter).toEqual(todo.slice(1));
    await expectColumnPersisted(page, 'todo');
    await expectColumnPersisted(page, 'in_progress');

    await page.reload();
    await expect(cards(page, 'todo').first()).toBeVisible();
    await expectCounts(page, 4, 5, 3);
    expect(await cardIds(page, 'in_progress')).toEqual(inProgress);
    expect(await cardIds(page, 'todo')).toEqual(todoAfter);
  });

  test('mouse: drop onto an empty area of a column (end of list)', async ({ page }) => {
    const moving = (await cardIds(page, 'todo'))[0]!;
    const done = await cardIds(page, 'done');
    await mouseDrag(
      page,
      page.locator(`[data-task-id="${moving}"]`),
      cards(page, 'done').last(),
      'below',
    );
    await expect(column(page, 'done').locator(`[data-task-id="${moving}"]`)).toBeVisible();
    await expectColumnPersisted(page, 'done');
    await page.reload();
    await expect(cards(page, 'todo').first()).toBeVisible();
    expect(await cardIds(page, 'done')).toEqual([...done, moving]);
  });

  test('mouse: reorder within a column and persist', async ({ page }) => {
    const before = await cardIds(page, 'todo');
    const moving = before[0]!;
    await mouseDrag(
      page,
      page.locator(`[data-task-id="${moving}"]`),
      cards(page, 'todo').nth(2),
      'bottom',
    );
    await expect.poll(() => cardIds(page, 'todo')).not.toEqual(before);
    const after = await cardIds(page, 'todo');
    expect([...after].sort()).toEqual([...before].sort());
    expect(after.indexOf(moving)).toBeGreaterThan(0);
    await expectCounts(page, 5, 4, 3);
    await expectColumnPersisted(page, 'todo');

    await page.reload();
    await expect(cards(page, 'todo').first()).toBeVisible();
    expect(await cardIds(page, 'todo')).toEqual(after);
  });

  test('keyboard: Space, arrow, Space moves a card to the next column and persists', async ({
    page,
  }) => {
    const todo = await cardIds(page, 'todo');
    const moving = todo[0]!;
    const card = page.locator(`[data-task-id="${moving}"]`);
    await card.focus();
    await page.keyboard.press('Space');
    await expect(liveRegion(page)).toContainText('is over');
    // The first ArrowRight can land on a neighbouring card before crossing columns.
    for (let i = 0; i < 3; i++) {
      if (((await liveRegion(page).textContent()) ?? '').includes('is over In Progress')) break;
      await pressDuringDrag(page, 'ArrowRight');
    }
    await expect(liveRegion(page)).toContainText('is over In Progress');
    await page.keyboard.press('Space');

    await expect(column(page, 'in_progress').locator(`[data-task-id="${moving}"]`)).toBeVisible();
    await expectCounts(page, 4, 5, 3);
    const inProgress = await cardIds(page, 'in_progress');
    await expectColumnPersisted(page, 'in_progress');
    await expectColumnPersisted(page, 'todo');

    await page.reload();
    await expect(cards(page, 'todo').first()).toBeVisible();
    await expectCounts(page, 4, 5, 3);
    expect(await cardIds(page, 'in_progress')).toEqual(inProgress);
  });

  test('keyboard: ArrowDown reorders inside a column', async ({ page }) => {
    const before = await cardIds(page, 'todo');
    const card = page.locator(`[data-task-id="${before[0]}"]`);
    await card.focus();
    await page.keyboard.press('Space');
    await expect(liveRegion(page)).toContainText('is over');
    await pressDuringDrag(page, 'ArrowDown');
    await expect(liveRegion(page)).toContainText('is over To Do, position 2');
    await page.keyboard.press('Space');
    await expect
      .poll(() => cardIds(page, 'todo'))
      .toEqual([before[1], before[0], ...before.slice(2)]);
    await expectColumnPersisted(page, 'todo');
    await page.reload();
    await expect(cards(page, 'todo').first()).toBeVisible();
    expect(await cardIds(page, 'todo')).toEqual([before[1], before[0], ...before.slice(2)]);
  });

  test('keyboard: Escape cancels a pick-up', async ({ page }) => {
    const before = await cardIds(page, 'todo');
    await page.locator(`[data-task-id="${before[0]}"]`).focus();
    await page.keyboard.press('Space');
    await expect(liveRegion(page)).toContainText('is over');
    await pressDuringDrag(page, 'ArrowRight');
    await page.keyboard.press('Escape');
    await expect(liveRegion(page)).toContainText('was cancelled');
    expect(await cardIds(page, 'todo')).toEqual(before);
  });
});

test.describe('move failure rollback', () => {
  test('mouse drag rolls back and shows a toast', async ({ page }) => {
    await demoLogin(page);
    await page.goto('?failMoves=1#/board');
    await expect(cards(page, 'todo').first()).toBeVisible();
    await expectCounts(page, 5, 4, 3);
    const todo = await cardIds(page, 'todo');
    const inProgress = await cardIds(page, 'in_progress');
    const moving = todo[0]!;

    await mouseDrag(
      page,
      page.locator(`[data-task-id="${moving}"]`),
      cards(page, 'in_progress').nth(1),
    );

    await expect(page.getByTestId('toast').filter({ hasText: /Couldn.t move/ })).toBeVisible();
    await expect.poll(() => cardIds(page, 'todo')).toEqual(todo);
    expect(await cardIds(page, 'in_progress')).toEqual(inProgress);
    await expectCounts(page, 5, 4, 3);
  });

  test('keyboard move rolls back and shows a toast', async ({ page }) => {
    await demoLogin(page);
    await page.goto('?failMoves=1#/board');
    await expect(cards(page, 'todo').first()).toBeVisible();
    const todo = await cardIds(page, 'todo');
    await page.locator(`[data-task-id="${todo[0]}"]`).focus();
    await page.keyboard.press('Space');
    await expect(liveRegion(page)).toContainText('is over');
    for (let i = 0; i < 3; i++) {
      if (((await liveRegion(page).textContent()) ?? '').includes('is over In Progress')) break;
      await pressDuringDrag(page, 'ArrowRight');
    }
    await expect(liveRegion(page)).toContainText('is over In Progress');
    await page.keyboard.press('Space');
    await expect(page.getByTestId('toast').filter({ hasText: /Couldn.t move/ })).toBeVisible();
    await expect.poll(() => cardIds(page, 'todo')).toEqual(todo);
    await expectCounts(page, 5, 4, 3);
  });
});
