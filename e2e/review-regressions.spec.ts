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
