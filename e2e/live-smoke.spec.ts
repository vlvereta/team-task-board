import { expect, test } from '@playwright/test';

// Runs against the deployed GitHub Pages site (see playwright.live.config.ts).
test('live site: loads cleanly, demo login, create survives reload, deep link survives hard refresh', async ({
  page,
}) => {
  const problems: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') problems.push(`${m.type()}: ${m.text()}`);
  });
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));

  await page.goto('./');
  await expect(page).toHaveURL(/#\/login$/);
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();

  await page.getByRole('button', { name: /Sign in as Ana Silva/ }).click();
  await expect(page.getByTestId('column-todo').getByTestId('task-card').first()).toBeVisible();

  const title = `Smoke test ${Date.now()}`;
  await page.getByRole('button', { name: 'Add a card to To Do' }).click();
  await page.getByLabel('Title').fill(title);
  await page.getByRole('button', { name: 'Create task' }).click();
  const card = page.getByTestId('task-card').filter({ hasText: title });
  await expect(card).toBeVisible();

  await page.reload();
  await expect(card).toBeVisible();

  await card.click();
  await expect(page.getByRole('dialog', { name: 'Edit task' })).toBeVisible();
  const deepLink = page.url();
  expect(deepLink).toMatch(/#\/board\/tasks\/.+/);

  // Hard refresh on the deep link.
  await page.goto('about:blank');
  await page.goto(deepLink);
  await expect(page.getByRole('dialog', { name: 'Edit task' })).toBeVisible();
  await expect(page.getByLabel('Title')).toHaveValue(title);

  // Clean up so the owner's own browser state isn't affected (fresh context anyway).
  await page.getByRole('button', { name: 'Delete' }).click();
  await page.getByRole('button', { name: 'Delete task' }).click();
  await expect(card).toHaveCount(0);

  expect(problems).toEqual([]);
});
