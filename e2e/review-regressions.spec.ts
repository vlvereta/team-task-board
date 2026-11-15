import { expect, test, cardByTitle, demoLogin } from './fixtures';

// Regression tests for functional issues found in review round 1 (docs/REVIEW.md).

test('editing a task deleted in another tab shows "Task not found" and removes the stale card', async ({
  page,
  context,
}) => {
  await demoLogin(page);
  const title = 'Audit the current site content';
  await expect(cardByTitle(page, title)).toBeVisible();

  // Second tab (same browser storage) deletes the task.
  const other = await context.newPage();
  await other.goto('#/board');
  await cardByTitle(other, title).click();
  await other.getByRole('button', { name: 'Delete' }).click();
  await other.getByRole('button', { name: 'Delete task' }).click();
  await expect(cardByTitle(other, title)).toHaveCount(0);
  await other.close();

  // First tab still shows it; editing it now must not leave a ghost card.
  await cardByTitle(page, title).click();
  const dialog = page.getByRole('dialog', { name: 'Edit task' });
  await dialog.getByLabel('Title').fill(`${title} (edited)`);
  await dialog.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByRole('dialog', { name: 'Task not found' })).toBeVisible();
  await page.getByRole('button', { name: 'Back to the board' }).click();
  await expect(cardByTitle(page, title)).toHaveCount(0);
});

test('closing the edit dialog with unsaved changes asks before discarding them', async ({
  page,
}) => {
  await demoLogin(page);
  const title = 'Define the new sitemap';
  await cardByTitle(page, title).click();
  const dialog = page.getByRole('dialog', { name: 'Edit task' });
  await dialog.getByLabel('Description').fill('A change I have not saved');

  await page.keyboard.press('Escape');
  const confirm = page.getByRole('alertdialog', { name: 'Discard unsaved changes?' });
  await expect(confirm).toBeVisible();
  await confirm.getByRole('button', { name: 'Keep editing' }).click();
  await expect(confirm).toBeHidden();
  await expect(dialog.getByLabel('Description')).toHaveValue('A change I have not saved');

  await dialog.getByRole('button', { name: 'Close task' }).click();
  await page.getByRole('button', { name: 'Discard changes' }).click();
  await expect(dialog).toBeHidden();
  await cardByTitle(page, title).click();
  await expect(
    page.getByRole('dialog', { name: 'Edit task' }).getByLabel('Description'),
  ).not.toHaveValue('A change I have not saved');
});

test('closing an unchanged dialog does not ask', async ({ page }) => {
  await demoLogin(page);
  await cardByTitle(page, 'Define the new sitemap').click();
  await expect(page.getByRole('dialog', { name: 'Edit task' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('alertdialog')).toHaveCount(0);
});

test('the create dialog asks before discarding a typed title', async ({ page }) => {
  await demoLogin(page);
  await page.getByRole('button', { name: 'Add a card to Done' }).click();
  const dialog = page.getByRole('dialog', { name: 'New task in Done' });
  await dialog.getByLabel('Title').fill('Half-written idea');
  await dialog.getByRole('button', { name: 'Cancel' }).click();
  await expect(page.getByRole('alertdialog', { name: 'Discard unsaved changes?' })).toBeVisible();
  await page.getByRole('button', { name: 'Discard changes' }).click();
  await expect(dialog).toBeHidden();
  await expect(cardByTitle(page, 'Half-written idea')).toHaveCount(0);
});

test('title and description show a character count near their limits', async ({ page }) => {
  await demoLogin(page);
  await page.getByRole('button', { name: 'Add a card to To Do' }).click();
  const dialog = page.getByRole('dialog', { name: 'New task in To Do' });
  const title = dialog.getByLabel('Title');
  await title.fill('x'.repeat(150));
  await expect(title).not.toHaveAccessibleDescription(/characters/);
  await title.fill('x'.repeat(170));
  await expect(title).toHaveAccessibleDescription('170 / 200 characters');
  await title.fill('x'.repeat(250));
  await expect(title).toHaveValue('x'.repeat(200));
  await expect(title).toHaveAccessibleDescription('200 / 200 characters: limit reached.');
  const description = dialog.getByLabel('Description');
  await description.fill('y'.repeat(4500));
  await expect(description).toHaveAccessibleDescription('4500 / 5000 characters');
});

// ---- Round 2 regressions ----

test('browser Back with unsaved edits asks before discarding them', async ({ page }) => {
  await demoLogin(page);
  await cardByTitle(page, 'Define the new sitemap').click();
  const dialog = page.getByRole('dialog', { name: 'Edit task' });
  await dialog.getByLabel('Description').fill('Unsaved words');
  await page.goBack();
  const confirm = page.getByRole('alertdialog', { name: 'Discard unsaved changes?' });
  await expect(confirm).toBeVisible();
  await confirm.getByRole('button', { name: 'Keep editing' }).click();
  await expect(dialog.getByLabel('Description')).toHaveValue('Unsaved words');
  await expect(page).toHaveURL(/#\/board\/tasks\//);
  await page.goBack();
  await page.getByRole('button', { name: 'Discard changes' }).click();
  await expect(dialog).toBeHidden();
  await expect(page).toHaveURL(/#\/board$/);
});

test('two tabs editing the same task: the second save gets a conflict instead of overwriting', async ({
  page,
  context,
}) => {
  await demoLogin(page);
  const title = 'Set up staging environment';
  await cardByTitle(page, title).click();
  const dialog = page.getByRole('dialog', { name: 'Edit task' });

  const other = await context.newPage();
  await other.goto('#/board');
  await cardByTitle(other, title).click();
  const otherDialog = other.getByRole('dialog', { name: 'Edit task' });
  await otherDialog.getByLabel('Description').fill('Saved first, in the other tab');
  await otherDialog.getByRole('button', { name: 'Save changes' }).click();
  await expect(other.getByRole('dialog', { name: 'Edit task' })).toBeHidden();
  await other.close();

  await dialog.getByLabel('Description').fill('Saved second, in this tab');
  await dialog.getByRole('button', { name: 'Save changes' }).click();
  await expect(dialog.getByRole('alert')).toContainText('Someone else changed this task');
  // Nothing was overwritten.
  await page.reload();
  await page
    .getByRole('button', { name: 'Discard changes' })
    .click({ timeout: 2000 })
    .catch(() => {});
  await expect(
    page.getByRole('dialog', { name: 'Edit task' }).getByLabel('Description'),
  ).toHaveValue('Saved first, in the other tab');
});

test('name fields show a character count near their limits', async ({ page }) => {
  await page.goto('#/signup');
  const name = page.getByLabel('Name');
  await name.fill('n'.repeat(50));
  await expect(name).toHaveAccessibleDescription('50 / 60 characters');
  await demoLogin(page);
  await page.getByRole('link', { name: 'Settings' }).click();
  const boardName = page.getByLabel('Board name');
  await boardName.fill('b'.repeat(80));
  await expect(boardName).toHaveAccessibleDescription('80 / 80 characters: limit reached.');
  const displayName = page.getByLabel('Display name');
  await displayName.fill('d'.repeat(48));
  await expect(displayName).toHaveAccessibleDescription('48 / 60 characters');
});

test('a create saved just before a reload is kept', async ({ page }) => {
  await demoLogin(page);
  page.on('dialog', (d) => void d.accept()); // the "leave site?" prompt while saving
  await page.getByRole('button', { name: 'Add a card to To Do' }).click();
  await page.getByLabel('Title').fill('Saved right before reload');
  await page.getByRole('button', { name: 'Create task' }).click();
  await page.waitForTimeout(30);
  await page.reload();
  await expect(cardByTitle(page, 'Saved right before reload')).toBeVisible();
});

test('resetting demo data as a newly registered user explains why you were signed out', async ({
  page,
}) => {
  await page.goto('#/signup');
  await page.getByLabel('Name').fill('New Person');
  await page.getByLabel('Email').fill(`new-${Date.now()}@example.com`);
  await page.getByLabel('Password').fill('password123');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByTestId('task-card').first()).toBeVisible();
  await page.getByRole('link', { name: 'Settings' }).click();
  await page.getByRole('button', { name: 'Reset demo data' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Reset demo data' }).click();
  await expect(page).toHaveURL(/#\/login/);
  await expect(page.getByRole('status').filter({ hasText: 'Demo data restored' })).toContainText(
    'the reset removed it',
  );
  await expect(page.getByText('Your session has ended')).toHaveCount(0);
});

// Found while capturing checklist screenshots: a server error (not a 401)
// during the session check used to sign the user out.
test('a server error during the session check keeps the session and offers a retry', async ({
  page,
}) => {
  await demoLogin(page);
  await page.addInitScript(() => {
    if (sessionStorage.getItem('failed-once')) return;
    const original = Storage.prototype.getItem;
    Storage.prototype.getItem = function (key: string) {
      if (key === 'crewboard:db' && !sessionStorage.getItem('failed-once')) {
        sessionStorage.setItem('failed-once', '1');
        throw new Error('Storage unavailable');
      }
      return original.call(this, key);
    };
  });
  await page.reload();
  await expect(page.getByRole('heading', { name: "We can't reach the server" })).toBeVisible();
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.getByTestId('task-card').first()).toBeVisible();
  await expect(page).toHaveURL(/#\/board/);
});

// ---- Round 3 regressions ----

test('closing a task dialog does not leave a history entry that reopens it on Back', async ({
  page,
}) => {
  await demoLogin(page);
  await cardByTitle(page, 'Define the new sitemap').click();
  await page.getByRole('button', { name: 'Close task' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.goBack();
  await expect(page.getByRole('dialog', { name: 'Edit task' })).toHaveCount(0);
});

test('browser Back closes the create dialog (asking first if something was typed)', async ({
  page,
}) => {
  await demoLogin(page);
  // Give the board an in-app history entry behind it (Settings → Board).
  await page.getByRole('link', { name: 'Settings' }).click();
  await page.getByRole('link', { name: 'Back to board' }).click();
  await cardByTitle(page, 'Define the new sitemap').click();
  await page.getByRole('button', { name: 'Close task' }).click();
  await expect(page).toHaveURL(/#\/board$/);
  await page.getByRole('button', { name: 'Add a card to To Do' }).click();
  await page.getByRole('dialog', { name: 'New task in To Do' }).getByLabel('Title').fill('Typed');
  // The navigation guard registers in an effect just after the first
  // keystroke; a person cannot press Back within those few milliseconds.
  await page.waitForTimeout(100);
  await page.goBack();
  const confirm = page.getByRole('alertdialog', { name: 'Discard unsaved changes?' });
  await expect(confirm).toBeVisible();
  await confirm.getByRole('button', { name: 'Keep editing' }).click();
  await expect(page.getByLabel('Title')).toHaveValue('Typed');
  await page.goBack();
  await page.getByRole('button', { name: 'Discard changes' }).click();
  // Back then continues to the previous entry, with no stale dialog on top.
  await expect(page).toHaveURL(/#\/board$/);
  await expect(page.getByRole('dialog')).toHaveCount(0);

  // An empty create dialog simply closes on Back.
  await page.getByRole('button', { name: 'Add a card to To Do' }).click();
  await expect(page.getByRole('dialog', { name: 'New task in To Do' })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('editing the address bar while a task dialog is open logs no router warning', async ({
  page,
}) => {
  // The console guard fixture fails the test on any warning.
  await demoLogin(page);
  await cardByTitle(page, 'Define the new sitemap').click();
  await expect(page.getByRole('dialog', { name: 'Edit task' })).toBeVisible();
  await page.evaluate(() => {
    location.hash = '#/settings';
  });
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
});

test('after deleting from the dialog by keyboard, focus lands on the board, not the page body', async ({
  page,
}) => {
  await demoLogin(page);
  await cardByTitle(page, 'Define the new sitemap').focus();
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog', { name: 'Edit task' });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Delete' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('alertdialog')).toBeVisible();
  await page.getByRole('button', { name: 'Delete task' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => document.activeElement?.tagName)).not.toBe('BODY');
  await expect(page.locator('[data-testid="column-done"] :focus')).toHaveCount(1);
});

test('leaving the site with a half-written task asks the browser to confirm', async ({ page }) => {
  await demoLogin(page);
  await page.getByRole('button', { name: 'Add a card to To Do' }).click();
  await page.getByRole('dialog', { name: 'New task in To Do' }).getByLabel('Title').fill('Typed');
  const prompt = page.waitForEvent('dialog');
  void page.reload().catch(() => {});
  const dialog = await prompt;
  expect(dialog.type()).toBe('beforeunload');
  await dialog.dismiss();
  await expect(
    page.getByRole('dialog', { name: 'New task in To Do' }).getByLabel('Title'),
  ).toHaveValue('Typed');
});

// ---- Round 4 regressions (the drag crash is covered by drag-stability.spec.ts) ----

test('toasts are cleared on log out', async ({ page }) => {
  await demoLogin(page);
  await page.getByRole('link', { name: 'Settings' }).click();
  await page.getByLabel('Board name').fill('Renamed board');
  await page.getByRole('button', { name: 'Save' }).nth(1).click();
  await expect(page.getByTestId('toast')).toContainText('Board renamed.');
  await page.getByRole('button', { name: 'Log out' }).click();
  await expect(page).toHaveURL(/#\/login/);
  await expect(page.getByTestId('toast')).toHaveCount(0);
});

test('after a keyboard sign-in, focus moves to the board instead of the page body', async ({
  page,
}) => {
  await page.goto('#/login');
  await page.getByRole('button', { name: 'Sign in as Ana Silva, Project lead' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('task-card').first()).toBeVisible();
  await expect(page.getByRole('main', { name: 'Board' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect.poll(() => page.evaluate(() => document.activeElement?.tagName)).not.toBe('BODY');
});

test('sign-up rejects a password made only of spaces', async ({ page }) => {
  await page.goto('#/signup');
  await page.getByLabel('Name').fill('Space Person');
  await page.getByLabel('Email').fill('spaces@example.com');
  await page.getByLabel('Password').fill('         ');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByText('A password cannot be only spaces.')).toBeVisible();
  await expect(page).toHaveURL(/#\/signup/);
});

test('with "My tasks" on, the create dialog says the new task is assigned to you', async ({
  page,
}) => {
  await demoLogin(page);
  await page.getByRole('button', { name: 'My tasks' }).click();
  await page.getByRole('button', { name: 'Add a card to To Do' }).click();
  const dialog = page.getByRole('dialog', { name: 'New task in To Do' });
  await expect(dialog.getByLabel('Assignee')).toHaveValue('u-ana');
  await expect(dialog.getByText('Assigned to you because "My tasks" is on.')).toBeVisible();
  await dialog.getByLabel('Assignee').selectOption({ label: 'Unassigned' });
  await expect(dialog.getByText('Assigned to you because')).toHaveCount(0);
  await dialog.getByLabel('Title').fill('Nobody owns this yet');
  await dialog.getByRole('button', { name: 'Create task' }).click();
  await expect(page.getByTestId('toast')).toContainText('hidden while "My tasks" is on');
  await expect(cardByTitle(page, 'Nobody owns this yet')).toHaveCount(0);
});

// ---- Round 5 regressions ----

test('after the address bar is edited by hand, the unsaved-changes guard still works', async ({
  page,
}) => {
  await demoLogin(page);
  await page.evaluate(() => {
    location.hash = '#/settings';
  });
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
  await page.evaluate(() => {
    location.hash = '#/board';
  });
  await expect(page.getByTestId('task-card').first()).toBeVisible();
  await cardByTitle(page, 'Define the new sitemap').click();
  const dialog = page.getByRole('dialog', { name: 'Edit task' });
  await dialog.getByLabel('Title').fill('Changed but not saved');
  await page.waitForTimeout(100); // the guard registers just after the first keystroke
  await dialog.getByRole('button', { name: 'Close task' }).click();
  await expect(page.getByRole('alertdialog', { name: 'Discard unsaved changes?' })).toBeVisible();
  await page.getByRole('button', { name: 'Keep editing' }).click();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('alertdialog', { name: 'Discard unsaved changes?' })).toBeVisible();
  await page.getByRole('button', { name: 'Discard changes' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('when the browser blocks storage, the app still works and says nothing will be kept', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      get() {
        throw new DOMException('denied', 'SecurityError');
      },
    });
  });
  await page.goto('#/login');
  await expect(page.getByText('Your browser is blocking site storage')).toBeVisible();
  await page.getByRole('button', { name: 'Sign in as Ana Silva, Project lead' }).click();
  await expect(page.getByTestId('task-card').first()).toBeVisible();
  await page.getByRole('button', { name: 'Add a card to To Do' }).click();
  await page.getByLabel('Title').fill('Kept in memory');
  await page.getByRole('button', { name: 'Create task' }).click();
  await expect(cardByTitle(page, 'Kept in memory')).toBeVisible();
});

test('double-clicking a card opens it once (one Escape closes it)', async ({ page }) => {
  await demoLogin(page);
  await cardByTitle(page, 'Define the new sitemap').dblclick();
  await expect(page.getByRole('dialog', { name: 'Edit task' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page).toHaveURL(/#\/board$/);
});

test('dropping in the empty area below a short column lands in that column', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await demoLogin(page);
  const card = cardByTitle(page, 'Design the homepage hero');
  const s = (await card.boundingBox())!;
  const done = (await page.getByTestId('column-done').boundingBox())!;
  const x = done.x + done.width / 2;
  const y = Math.min(done.y + done.height + 120, 780);
  await page.mouse.move(s.x + s.width / 2, s.y + s.height / 2);
  await page.mouse.down();
  await page.mouse.move(s.x + s.width / 2 + 10, s.y + s.height / 2 + 10, { steps: 3 });
  await page.mouse.move(x, y, { steps: 30 });
  await page.mouse.up();
  await expect(page.getByTestId('column-done').getByText('Design the homepage hero')).toBeVisible();
});

test('focus is not lost after a rejected inline rename or after logging out', async ({ page }) => {
  await demoLogin(page);
  await page.getByRole('button', { name: /rename board/ }).click();
  await page.getByLabel('Board name').fill('   ');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: /rename board/ })).toBeFocused();
  await page.getByRole('button', { name: 'Log out' }).click();
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeFocused();
});
