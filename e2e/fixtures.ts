import { expect, test as base } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';

export type ColumnKey = 'todo' | 'in_progress' | 'done';

export const DEMO = {
  ana: { name: 'Ana Silva', role: 'Project lead', email: 'ana@crewboard.demo' },
  ben: { name: 'Ben Okafor', role: 'Developer', email: 'ben@crewboard.demo' },
  chloe: { name: 'Chloé Martin', role: 'Designer', email: 'chloe@crewboard.demo' },
} as const;
export const PASSWORD = 'demo1234';

/**
 * Every test fails on console errors/warnings and uncaught page errors.
 * Collected messages are asserted after the test body completes.
 */
export const test = base.extend<{ consoleGuard: void }>({
  consoleGuard: [
    async ({ page }, use) => {
      const problems: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error' || msg.type() === 'warning') {
          problems.push(`console.${msg.type()}: ${msg.text()}`);
        }
      });
      page.on('pageerror', (err) => problems.push(`pageerror: ${err.message}`));
      await use();
      expect(problems, 'unexpected console output').toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };

export function column(page: Page, key: ColumnKey): Locator {
  return page.getByTestId(`column-${key}`);
}

export function cards(page: Page, key: ColumnKey): Locator {
  return column(page, key).getByTestId('task-card');
}

export async function cardIds(page: Page, key: ColumnKey): Promise<string[]> {
  return cards(page, key).evaluateAll((els) =>
    els.map((el) => (el as HTMLElement).dataset.taskId ?? ''),
  );
}

export function cardByTitle(page: Page, title: string): Locator {
  return page.getByTestId('task-card').filter({ hasText: title });
}

export async function expectCounts(page: Page, todo: number, inProgress: number, done: number) {
  await expect(column(page, 'todo').getByTestId('column-count')).toHaveText(String(todo));
  await expect(column(page, 'in_progress').getByTestId('column-count')).toHaveText(
    String(inProgress),
  );
  await expect(column(page, 'done').getByTestId('column-count')).toHaveText(String(done));
}

/** One-click demo login from the login page, ending on the loaded board. */
export async function demoLogin(page: Page, who: { name: string; role: string } = DEMO.ana) {
  await page.goto('#/login');
  await page.getByRole('button', { name: `Sign in as ${who.name}, ${who.role}` }).click();
  await expect(cards(page, 'todo').first()).toBeVisible();
}

/** Opens the create dialog for a column, fills it and submits. */
export async function createTask(
  page: Page,
  columnTitle: 'To Do' | 'In Progress' | 'Done',
  opts: { title: string; description?: string; assignee?: string },
) {
  await page.getByRole('button', { name: `Add a card to ${columnTitle}` }).click();
  const dialog = page.getByRole('dialog', { name: `New task in ${columnTitle}` });
  await dialog.getByLabel('Title').fill(opts.title);
  if (opts.description !== undefined) await dialog.getByLabel('Description').fill(opts.description);
  if (opts.assignee) await dialog.getByLabel('Assignee').selectOption({ label: opts.assignee });
  await dialog.getByRole('button', { name: 'Create task' }).click();
  await expect(dialog).toBeHidden();
}

/** Drag a card with the mouse in small steps (dnd-kit MouseSensor, 6px threshold). */
export async function mouseDrag(
  page: Page,
  source: Locator,
  target: Locator,
  where: 'center' | 'top' | 'bottom' | 'below' = 'center',
) {
  const s = await source.boundingBox();
  const t = await target.boundingBox();
  if (!s || !t) throw new Error('drag source or target not visible');
  const sx = s.x + s.width / 2;
  const sy = s.y + s.height / 2;
  const tx = t.x + t.width / 2;
  const ty =
    where === 'top'
      ? t.y + 4
      : where === 'bottom'
        ? t.y + t.height - 4
        : where === 'below'
          ? t.y + t.height + 10
          : t.y + t.height / 2;
  await page.mouse.move(sx, sy);
  await page.mouse.down();
  await page.mouse.move(sx + 10, sy + 10, { steps: 4 });
  await page.mouse.move(tx, ty, { steps: 20 });
  // wait until dnd-kit has registered an over target before releasing
  await expect(page.locator('[id^="DndLiveRegion"]')).toContainText('is over');
  await page.mouse.up();
}

/** Resolves once the mock server's stored order of a column equals the one shown in the UI. */
export async function expectColumnPersisted(page: Page, key: ColumnKey) {
  await expect
    .poll(async () => {
      const ui = await cardIds(page, key);
      const stored = await page.evaluate((status) => {
        const raw = localStorage.getItem('crewboard:db');
        if (!raw) return [];
        const db = JSON.parse(raw) as {
          tasks: { id: string; status: string; position: number }[];
        };
        return db.tasks
          .filter((t) => t.status === status)
          .sort((a, b) => a.position - b.position)
          .map((t) => t.id);
      }, key);
      return JSON.stringify(stored) === JSON.stringify(ui);
    })
    .toBe(true);
}

/**
 * Press a key during a keyboard drag and wait for dnd-kit's announcement to change.
 * A key pressed before dnd-kit has attached its listeners is ignored, so retry
 * (only while nothing changed) instead of sleeping.
 */
export async function pressDuringDrag(page: Page, key: string) {
  const region = page.locator('[id^="DndLiveRegion"]');
  const before = (await region.textContent()) ?? '';
  await expect(async () => {
    if (((await region.textContent()) ?? '') === before) await page.keyboard.press(key);
    await expect(region).not.toHaveText(before, { timeout: 500 });
  }).toPass({ timeout: 8_000 });
}
