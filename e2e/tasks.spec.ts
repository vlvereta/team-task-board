import {
  expect,
  test,
  DEMO,
  cardByTitle,
  cards,
  createTask,
  demoLogin,
  expectCounts,
  type ColumnKey,
} from './fixtures';

test.beforeEach(async ({ page }) => {
  await demoLogin(page);
});

test('seed data loads with 5/4/3 cards', async ({ page }) => {
  await expectCounts(page, 5, 4, 3);
});

const COLUMNS: { title: 'To Do' | 'In Progress' | 'Done'; key: ColumnKey; before: number }[] = [
  { title: 'To Do', key: 'todo', before: 5 },
  { title: 'In Progress', key: 'in_progress', before: 4 },
  { title: 'Done', key: 'done', before: 3 },
];

for (const col of COLUMNS) {
  test(`create a task in ${col.title} and it persists`, async ({ page }) => {
    const title = `New ${col.key} task`;
    await createTask(page, col.title, {
      title,
      description: 'Some details',
      assignee: DEMO.ben.name,
    });
    await expect(cards(page, col.key)).toHaveCount(col.before + 1);
    const card = cardByTitle(page, title);
    await expect(card).toBeVisible();
    await expect(card.getByRole('img', { name: DEMO.ben.name })).toHaveText('BO');
    await expect(card.getByRole('img', { name: 'Has a description' })).toBeVisible();
    await expect(page.getByTestId('toast').first()).toContainText(`Added to ${col.title}`);

    await page.reload();
    await expect(cards(page, col.key)).toHaveCount(col.before + 1);
    const again = cardByTitle(page, title);
    await expect(again.getByRole('img', { name: DEMO.ben.name })).toHaveText('BO');
    await again.click();
    const dialog = page.getByRole('dialog', { name: 'Edit task' });
    await expect(dialog.getByLabel('Description')).toHaveValue('Some details');
    await expect(dialog.getByLabel('Assignee')).toHaveValue('u-ben');
  });
}

test('creating a task needs a title', async ({ page }) => {
  await page.getByRole('button', { name: 'Add a card to To Do' }).click();
  const dialog = page.getByRole('dialog', { name: 'New task in To Do' });
  await dialog.getByRole('button', { name: 'Create task' }).click();
  await expect(dialog.getByText('Give the task a title.')).toBeVisible();
  await expect(dialog.getByLabel('Title')).toBeFocused();
  await dialog.getByRole('button', { name: 'Cancel' }).click();
  await expect(dialog).toBeHidden();
  await expect(cards(page, 'todo')).toHaveCount(5);
});

test('edit title, description, assignee and status; persists after reload', async ({ page }) => {
  await cardByTitle(page, 'Plan the launch announcement').click();
  await expect(page).toHaveURL(/#\/board\/tasks\/t-seed-/);
  const dialog = page.getByRole('dialog', { name: 'Edit task' });
  await expect(dialog.getByLabel('Assignee')).toHaveValue('');
  await dialog.getByLabel('Title').fill('Launch plan v2');
  await dialog.getByLabel('Description').fill('Draft the press note.');
  await dialog.getByLabel('Assignee').selectOption({ label: DEMO.chloe.name });
  await dialog.getByLabel('Status').selectOption({ label: 'Done' });
  await dialog.getByRole('button', { name: 'Save changes' }).click();
  await expect(dialog).toBeHidden();
  await expect(page).toHaveURL(/#\/board$/);

  await expectCounts(page, 4, 4, 4);
  const check = async () => {
    const card = cardByTitle(page, 'Launch plan v2');
    await expect(card).toBeVisible();
    await expect(card.getByRole('img', { name: DEMO.chloe.name })).toHaveText('CM');
    await expect(page.getByTestId('column-done').getByText('Launch plan v2')).toBeVisible();
    await expect(cardByTitle(page, 'Plan the launch announcement')).toHaveCount(0);
  };
  await check();
  await page.reload();
  await check();
  await cardByTitle(page, 'Launch plan v2').click();
  await expect(page.getByRole('dialog').getByLabel('Description')).toHaveValue(
    'Draft the press note.',
  );
});

test('save is disabled until something changes', async ({ page }) => {
  await cardByTitle(page, 'Plan the launch announcement').click();
  const dialog = page.getByRole('dialog', { name: 'Edit task' });
  await expect(dialog.getByRole('button', { name: 'Save changes' })).toBeDisabled();
  await dialog.getByLabel('Title').fill('x');
  await expect(dialog.getByRole('button', { name: 'Save changes' })).toBeEnabled();
});

test('delete asks for confirmation; cancel keeps the task, confirm removes it', async ({
  page,
}) => {
  const title = 'Run an accessibility review';
  await cardByTitle(page, title).click();
  const dialog = page.getByRole('dialog', { name: 'Edit task' });
  await dialog.getByRole('button', { name: 'Delete' }).click();
  const confirm = page.getByRole('alertdialog', { name: 'Delete this task?' });
  await expect(confirm).toContainText(title);
  await confirm.getByRole('button', { name: 'Cancel' }).click();
  await expect(confirm).toBeHidden();
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Cancel' }).click();
  await expect(cardByTitle(page, title)).toHaveCount(1);
  await expectCounts(page, 5, 4, 3);

  await cardByTitle(page, title).click();
  await page
    .getByRole('dialog', { name: 'Edit task' })
    .getByRole('button', { name: 'Delete' })
    .click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Delete task' }).click();
  await expect(page.getByRole('alertdialog')).toBeHidden();
  await expect(cardByTitle(page, title)).toHaveCount(0);
  await expectCounts(page, 4, 4, 3);

  await page.reload();
  await expectCounts(page, 4, 4, 3);
  await expect(cardByTitle(page, title)).toHaveCount(0);
});

test('deep link opens the task dialog, also after a hard reload', async ({ page }) => {
  const first = cards(page, 'in_progress').first();
  const id = await first.getAttribute('data-task-id');
  const title = (await first.locator('p').first().textContent()) ?? '';
  await page.goto(`#/board/tasks/${id}`);
  const dialog = page.getByRole('dialog', { name: 'Edit task' });
  await expect(dialog.getByLabel('Title')).toHaveValue(title);
  await page.reload();
  await expect(page.getByRole('dialog', { name: 'Edit task' }).getByLabel('Title')).toHaveValue(
    title,
  );
  await page.getByRole('button', { name: 'Close task' }).click();
  await expect(page).toHaveURL(/#\/board$/);
});

test('unknown task id shows "Task not found"', async ({ page }) => {
  await page.goto('#/board/tasks/does-not-exist');
  const dialog = page.getByRole('dialog', { name: 'Task not found' });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Back to the board' }).click();
  await expect(page).toHaveURL(/#\/board$/);
  await expect(dialog).toBeHidden();
});

test('deep link right after login and after hard reload when signed out first', async ({
  page,
}) => {
  await page.getByRole('button', { name: 'Log out' }).click();
  await expect(page).toHaveURL(/#\/login/);
  await page.goto('#/board/tasks/t-seed-01');
  await page.reload();
  await expect(page).toHaveURL(/#\/login/);
  await page.getByRole('button', { name: `Sign in as ${DEMO.ana.name}, ${DEMO.ana.role}` }).click();
  await expect(page).toHaveURL(/#\/board\/tasks\/t-seed-01/);
  await expect(page.getByRole('dialog', { name: 'Edit task' })).toBeVisible();
});
