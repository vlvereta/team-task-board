import { expect, test } from './fixtures';

// Captures the README screenshots from the seeded demo.
// Run with: SCREENSHOTS=1 npx playwright test readme-screenshots --project desktop
test.skip(!process.env.SCREENSHOTS, 'Set SCREENSHOTS=1 to refresh the README screenshots.');

const dir = 'docs/screenshots';

test('README screenshots', async ({ page, browser }) => {
  await page.setViewportSize({ width: 1280, height: 760 });
  await page.goto('./#/login');
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
  await page.screenshot({ path: `${dir}/login.png`, fullPage: true });

  await page.getByRole('button', { name: /Sign in as Ana Silva/ }).click();
  await expect(page.getByTestId('task-card').first()).toBeVisible();
  await page.screenshot({ path: `${dir}/board.png` });

  await page.getByTestId('task-card').filter({ hasText: 'Design the homepage hero' }).click();
  await expect(page.getByRole('dialog', { name: 'Edit task' })).toBeVisible();
  await page.waitForTimeout(250); // let the open animation finish
  await page.screenshot({ path: `${dir}/task-dialog.png` });
  await page.keyboard.press('Escape');

  await page.getByRole('button', { name: 'My tasks' }).click();
  await expect(page.getByTestId('filter-banner')).toBeVisible();
  await page.screenshot({ path: `${dir}/filter.png` });

  const phone = await browser.newPage({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
  });
  await phone.goto('./#/login');
  await phone.getByRole('button', { name: /Sign in as Ben Okafor/ }).click();
  await expect(phone.getByTestId('task-card').first()).toBeVisible();
  await phone.screenshot({ path: `${dir}/mobile.png` });
  await phone.close();
});
