import { expect, test, DEMO, cards, column, demoLogin, expectCounts } from './fixtures';

test.describe('My tasks filter', () => {
  test.beforeEach(async ({ page }) => {
    await demoLogin(page);
  });

  test('narrows the board to the signed-in user and clears again', async ({ page }) => {
    const toggle = page.getByRole('button', { name: 'My tasks' });
    await expect(toggle).toHaveAttribute('aria-pressed', 'false');
    await expect(page.getByTestId('filter-banner')).toHaveCount(0);

    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-pressed', 'true');
    await expect(page).toHaveURL(/#\/board\?mine=1/);
    await expectCounts(page, 1, 0, 1);
    const banner = page.getByTestId('filter-banner');
    await expect(banner).toBeVisible();
    await expect(banner).toContainText('2 of 12');
    await expect(column(page, 'in_progress').getByTestId('column-empty')).toBeVisible();
    await expect(cards(page, 'todo').first()).toContainText('Set up analytics and consent banner');

    await banner.getByRole('button', { name: 'Show all tasks' }).click();
    await expect(banner).toHaveCount(0);
    await expect(toggle).toHaveAttribute('aria-pressed', 'false');
    await expectCounts(page, 5, 4, 3);
    await expect(page).not.toHaveURL(/mine/);
  });

  test('persists in the URL across reload', async ({ page }) => {
    await page.getByRole('button', { name: 'My tasks' }).click();
    await expectCounts(page, 1, 0, 1);
    await page.reload();
    await expect(page).toHaveURL(/mine=1/);
    await expect(page.getByTestId('filter-banner')).toBeVisible();
    await expectCounts(page, 1, 0, 1);
    await expect(page.getByRole('button', { name: 'My tasks' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  test('is per user', async ({ page }) => {
    await page.getByRole('button', { name: 'Log out' }).click();
    await demoLogin(page, DEMO.ben);
    await page.getByRole('button', { name: 'My tasks' }).click();
    await expectCounts(page, 1, 1, 0);
  });

  test('creating a task while filtered defaults the assignee to me', async ({ page }) => {
    await page.getByRole('button', { name: 'My tasks' }).click();
    await page.getByRole('button', { name: 'Add a card to To Do' }).click();
    await expect(page.getByRole('dialog').getByLabel('Assignee')).toHaveValue('u-ana');
  });
});

test.describe('settings', () => {
  test.beforeEach(async ({ page }) => {
    await demoLogin(page);
    await page.getByRole('link', { name: 'Settings' }).click();
    await expect(page).toHaveURL(/#\/settings$/);
    await expect(page.getByLabel('Display name')).toBeVisible();
  });

  test('rename display name is reflected in header, cards and assignee list', async ({ page }) => {
    const profile = page.getByRole('region', { name: 'Your profile' });
    await expect(profile.getByRole('button', { name: 'Save' })).toBeDisabled();
    await profile.getByLabel('Display name').fill('Anabel Costa');
    await profile.getByRole('button', { name: 'Save' }).click();
    await expect(
      page.getByTestId('toast').filter({ hasText: 'Display name updated.' }),
    ).toBeVisible();
    await expect(page.getByText('Signed in as Anabel Costa')).toBeAttached();

    await page.getByRole('link', { name: 'Back to board' }).click();
    await expect(
      page.getByTestId('task-card').getByRole('img', { name: 'Anabel Costa' }).first(),
    ).toHaveText('AC');
    await page.getByRole('button', { name: 'Add a card to To Do' }).click();
    await expect(
      page
        .getByRole('dialog')
        .getByLabel('Assignee')
        .locator('option', { hasText: 'Anabel Costa (you)' }),
    ).toHaveCount(1);

    await page.reload();
    await expect(page.getByText('Signed in as Anabel Costa')).toBeAttached();
  });

  test('empty names are rejected', async ({ page }) => {
    const board = page.getByRole('region', { name: 'Board' });
    await board.getByLabel('Board name').fill('   ');
    await board.getByRole('button', { name: 'Save' }).click();
    await expect(board.getByText('Board name cannot be empty.')).toBeVisible();
  });

  test('rename the board from settings; header updates and persists', async ({ page }) => {
    const board = page.getByRole('region', { name: 'Board' });
    await board.getByLabel('Board name').fill('Launch crew');
    await board.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByTestId('toast').filter({ hasText: 'Board renamed.' })).toBeVisible();
    await expect(page.getByRole('banner').getByRole('heading', { level: 1 })).toContainText(
      'Launch crew',
    );
    await page.reload();
    await expect(page.getByRole('banner').getByRole('heading', { level: 1 })).toContainText(
      'Launch crew',
    );
    await page.getByRole('link', { name: 'Back to board' }).click();
    await expect(page.getByRole('banner').getByRole('heading', { level: 1 })).toContainText(
      'Launch crew',
    );
  });

  test('reset demo data restores tasks and board name after confirmation', async ({ page }) => {
    const board = page.getByRole('region', { name: 'Board' });
    await board.getByLabel('Board name').fill('Temporary name');
    await board.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByRole('banner').getByRole('heading', { level: 1 })).toContainText(
      'Temporary name',
    );

    // Change data on the board: delete a task.
    await page.getByRole('link', { name: 'Back to board' }).click();
    await cards(page, 'todo').first().click();
    await page.getByRole('dialog').getByRole('button', { name: 'Delete' }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Delete task' }).click();
    await expectCounts(page, 4, 4, 3);

    await page.getByRole('link', { name: 'Settings' }).click();
    await page.getByRole('button', { name: 'Reset demo data' }).click();
    const confirm = page.getByRole('alertdialog', { name: 'Reset demo data?' });
    // Cancel keeps everything.
    await confirm.getByRole('button', { name: 'Cancel' }).click();
    await expect(confirm).toBeHidden();
    await expect(page.getByRole('banner').getByRole('heading', { level: 1 })).toContainText(
      'Temporary name',
    );

    await page.getByRole('button', { name: 'Reset demo data' }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Reset demo data' }).click();
    await expect(
      page.getByTestId('toast').filter({ hasText: 'Demo data restored.' }),
    ).toBeVisible();
    await expect(page.getByRole('banner').getByRole('heading', { level: 1 })).toContainText(
      'Website relaunch',
    );

    await page.getByRole('link', { name: 'Back to board' }).click();
    await expectCounts(page, 5, 4, 3);
    await page.reload();
    await expectCounts(page, 5, 4, 3);
    await expect(page.getByRole('banner').getByRole('heading', { level: 1 })).toContainText(
      'Website relaunch',
    );
  });
});

test.describe('inline board rename', () => {
  test('click the title, type, Enter saves; Escape cancels', async ({ page }) => {
    await demoLogin(page);
    const heading = page.getByRole('banner').getByRole('heading', { level: 1 });
    await expect(heading).toContainText('Website relaunch');

    await heading.getByRole('button').click();
    const input = page.getByLabel('Board name');
    await expect(input).toBeFocused();
    await input.fill('Discarded');
    await input.press('Escape');
    await expect(input).toBeHidden();
    await expect(heading).toContainText('Website relaunch');

    await heading.getByRole('button').click();
    await page.getByLabel('Board name').fill('Sprint board');
    await page.getByLabel('Board name').press('Enter');
    await expect(heading).toContainText('Sprint board');
    await expect(page.getByTestId('toast').filter({ hasText: 'Board renamed.' })).toBeVisible();
    await page.reload();
    await expect(heading).toContainText('Sprint board');
  });
});
