import type { Page } from '@playwright/test';
import { expect, test, cardByTitle, column, demoLogin } from './fixtures';

// Screenshots referenced by docs/UI-REVIEW-CHECKLIST.md.
// Run with: SCREENSHOTS=1 npx playwright test checklist-screenshots --project desktop
test.skip(!process.env.SCREENSHOTS, 'Set SCREENSHOTS=1 to refresh the checklist screenshots.');

const dir = 'docs/screenshots/checklist';
const LONG_TITLE =
  'Coordinate the migration of every legacy landing page with marketing, including Supercalifragilisticexpialidocious-campaign-redirects-and-tracking-parameters, before the launch';

const sizes = [
  { name: 'phone', width: 320, height: 640 },
  { name: 'tablet', width: 768, height: 900 },
  { name: 'desktop', width: 1440, height: 900 },
] as const;

async function bigText(page: Page) {
  await page.addInitScript(() => {
    document.addEventListener('DOMContentLoaded', () => {
      const style = document.createElement('style');
      style.textContent = 'html { font-size: 200% !important; }';
      document.head.append(style);
    });
  });
}

const shot = (page: Page, name: string, fullPage = false) =>
  page.screenshot({ path: `${dir}/${name}.png`, fullPage, animations: 'disabled' });

for (const size of sizes) {
  test(`screens at ${size.name} width`, async ({ page }) => {
    await page.setViewportSize(size);
    await page.goto('./#/login');
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
    await shot(page, `login-${size.name}`, true);
    await page.getByLabel('Email').fill('ana@crewboard.demo');
    await page.getByLabel('Password').fill('wrong-password');
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(page.getByRole('alert')).toBeVisible();
    await shot(page, `login-error-${size.name}`);

    await page.goto('./#/signup');
    await page.getByLabel('Email').fill('not-an-email');
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page.getByText('Enter your name.')).toBeVisible();
    await shot(page, `signup-errors-${size.name}`, true);

    await demoLogin(page);
    await shot(page, `board-${size.name}`);

    await cardByTitle(page, 'Design the homepage hero').click();
    await expect(page.getByRole('dialog', { name: 'Edit task' })).toBeVisible();
    await shot(page, `task-dialog-${size.name}`);
    await page.keyboard.press('Escape');

    await page.getByRole('button', { name: 'My tasks' }).click();
    await expect(page.getByTestId('filter-banner')).toBeVisible();
    await shot(page, `filter-on-${size.name}`);
    await page.getByRole('button', { name: 'Show all tasks' }).click();

    await page.getByRole('link', { name: 'Settings' }).click();
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
    await shot(page, `settings-${size.name}`, true);
  });
}

test('states and flows (desktop)', async ({ page, context }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await demoLogin(page);

  // Create flow, long title card, toast.
  await page.getByRole('button', { name: 'Add a card to To Do' }).click();
  const create = page.getByRole('dialog', { name: 'New task in To Do' });
  await create.getByLabel('Title').fill(LONG_TITLE);
  await create
    .getByLabel('Description')
    .fill('First paragraph of notes.\n\nSecond paragraph with more detail about the redirects.');
  await create.getByLabel('Assignee').selectOption({ label: 'Ben Okafor' });
  await shot(page, 'create-dialog');
  await create.getByRole('button', { name: 'Create task' }).click();
  await expect(page.getByTestId('toast')).toBeVisible();
  await shot(page, 'toast-and-long-title-card');

  // Card hover and keyboard focus.
  await cardByTitle(page, 'Build the responsive navigation').hover();
  await shot(page, 'card-hover');
  await page.mouse.move(5, 5);
  await cardByTitle(page, 'Build the responsive navigation').focus();
  await shot(page, 'card-focus');
  await page.getByRole('button', { name: 'My tasks' }).focus();
  await shot(page, 'header-focus');

  // Discard and delete confirmations.
  await cardByTitle(page, 'Define the new sitemap').click();
  const edit = page.getByRole('dialog', { name: 'Edit task' });
  await edit.getByLabel('Description').fill('An unsaved change');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('alertdialog')).toBeVisible();
  await shot(page, 'discard-confirm');
  await page.getByRole('button', { name: 'Discard changes' }).click();
  await cardByTitle(page, 'Define the new sitemap').click();
  await edit.getByRole('button', { name: 'Delete' }).click();
  await expect(page.getByRole('alertdialog', { name: 'Delete this task?' })).toBeVisible();
  await shot(page, 'delete-confirm');
  await page.getByRole('alertdialog').getByRole('button', { name: 'Cancel' }).click();
  await page.keyboard.press('Escape');

  // Edit conflict (two tabs).
  await cardByTitle(page, 'Set up staging environment').click();
  const other = await context.newPage();
  await other.goto('#/board');
  await cardByTitle(other, 'Set up staging environment').click();
  await other.getByRole('dialog').getByLabel('Description').fill('Saved in another tab');
  await other.getByRole('dialog').getByRole('button', { name: 'Save changes' }).click();
  await expect(other.getByRole('dialog')).toBeHidden();
  await other.close();
  await edit.getByLabel('Description').fill('Saved here second');
  await edit.getByRole('button', { name: 'Save changes' }).click();
  await expect(edit.getByRole('alert')).toBeVisible();
  await shot(page, 'edit-conflict');
  await edit.getByRole('button', { name: 'Close task' }).click();
  await page.getByRole('button', { name: 'Discard changes' }).click();

  // Drag in progress.
  const card = cardByTitle(page, 'Migrate blog posts to the new CMS');
  const target = column(page, 'done');
  const s = (await card.boundingBox())!;
  const t = (await target.boundingBox())!;
  await page.mouse.move(s.x + s.width / 2, s.y + s.height / 2);
  await page.mouse.down();
  await page.mouse.move(s.x + s.width / 2 + 10, s.y + s.height / 2 + 10, { steps: 4 });
  await page.mouse.move(t.x + t.width / 2, t.y + 80, { steps: 20 });
  await expect(page.locator('[id^="DndLiveRegion"]')).toContainText('is over Done');
  await shot(page, 'drag-in-progress');
  await page.keyboard.press('Escape');
  await page.mouse.up();
  await page.reload(); // reset pointer state after the cancelled drag
  await expect(page.getByTestId('task-card').first()).toBeVisible();

  // Empty column: Emma has nothing in To Do.
  await page.getByRole('button', { name: 'Log out' }).click();
  await demoLogin(page, { name: 'Emma Novak', role: 'Content' });
  await page.getByRole('button', { name: 'My tasks' }).click();
  await expect(column(page, 'todo').getByTestId('column-empty')).toBeVisible();
  await shot(page, 'empty-column-filter-on');

  // Reset confirmation.
  await page.getByRole('link', { name: 'Settings' }).click();
  await page.getByRole('button', { name: 'Reset demo data' }).click();
  await shot(page, 'reset-confirm');
});

test('loading state (desktop)', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await demoLogin(page);
  // After a reload, block the first store read for a moment so the loading
  // state stays on screen long enough to capture.
  await page.addInitScript(() => {
    const original = Storage.prototype.getItem;
    let slowed = false;
    Storage.prototype.getItem = function (key: string) {
      if (key === 'crewboard:db' && !slowed) {
        slowed = true;
        setTimeout(() => {}, 0);
        const until = Date.now() + 1500;
        while (Date.now() < until) {
          /* block */
        }
      }
      return original.call(this, key);
    };
  });
  await page.reload();
  await expect(page.getByText('Loading board…')).toBeVisible();
  await shot(page, 'loading');
});

test('load error state (desktop)', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await demoLogin(page);
  await page.addInitScript(() => {
    // The session check (first read) works; the board load after it fails.
    const original = Storage.prototype.getItem;
    let reads = 0;
    Storage.prototype.getItem = function (key: string) {
      if (key === 'crewboard:db' && ++reads > 1) throw new Error('Storage unavailable');
      return original.call(this, key);
    };
  });
  await page.reload();
  await expect(page.getByRole('heading', { name: "We couldn't load the board" })).toBeVisible();
  await shot(page, 'load-error');
});

test('200% text size', async ({ page }) => {
  await bigText(page);
  for (const size of [sizes[0], sizes[2]]) {
    await page.setViewportSize(size);
    await page.goto('./#/login');
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
    await shot(page, `login-${size.name}-200pct`, true);
    await demoLogin(page);
    await shot(page, `board-${size.name}-200pct`, true);
    await cardByTitle(page, 'Design the homepage hero').click();
    await expect(page.getByRole('dialog', { name: 'Edit task' })).toBeVisible();
    await shot(page, `task-dialog-${size.name}-200pct`);
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Log out' }).click();
  }
});
