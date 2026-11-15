import { expect, test, demoLogin } from './fixtures';

// Regression for review round 0: at 320 px with a 200% root font size the
// header used most of the screen and the board could not be scrolled to.
test('320 px at 200% text: the board is reachable by scrolling the page', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.addInitScript(() => {
    document.addEventListener('DOMContentLoaded', () => {
      const style = document.createElement('style');
      style.textContent = 'html { font-size: 200% !important; }';
      document.head.append(style);
    });
  });
  await demoLogin(page);
  const header = page.locator('header');
  const headerBox = await header.boundingBox();
  // Before the fix the header was 497 px tall and the page could not scroll;
  // at double text size it cannot get much under 400 px, so the real check is
  // that the page now scrolls to the board.
  expect(headerBox!.height).toBeLessThan(440);
  const addCard = page.getByRole('button', { name: 'Add a card to To Do' });
  await addCard.scrollIntoViewIfNeeded();
  await expect(addCard).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});

test('touch targets in the header and auth links are at least 44 px on touch devices', async ({
  browser,
}) => {
  const context = await browser.newContext({
    hasTouch: true,
    isMobile: true,
    viewport: { width: 375, height: 740 },
  });
  const page = await context.newPage();
  await page.goto('./#/login');
  for (const name of ['Create an account']) {
    const box = await page.getByRole('link', { name }).boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(44);
  }
  await page.getByRole('button', { name: /Sign in as Ana Silva/ }).click();
  await expect(page.getByTestId('task-card').first()).toBeVisible();
  for (const loc of [
    page.getByRole('link', { name: 'Crewboard home' }),
    page.getByRole('link', { name: 'Settings' }),
    page.getByRole('button', { name: 'Log out' }),
    page.getByRole('button', { name: 'My tasks' }),
  ]) {
    const box = await loc.boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(44);
    expect(box!.width).toBeGreaterThanOrEqual(44);
  }
  await context.close();
});

// Regression for design review round 2 (N1): at 320 px with 200% text the
// demo-account rows collapsed to one character per line.
test('login at 320 px and 200% text keeps demo account names on readable lines', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.addInitScript(() => {
    document.addEventListener('DOMContentLoaded', () => {
      const style = document.createElement('style');
      style.textContent = 'html { font-size: 200% !important; }';
      document.head.append(style);
    });
  });
  await page.goto('./#/login');
  const name = page.getByText('Ana Silva', { exact: true });
  await expect(name).toBeVisible();
  // Before the fix the name box was one character (~20 px) wide.
  expect((await name.boundingBox())!.width).toBeGreaterThan(100);
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  expect(height).toBeLessThan(4000); // was 6585 px
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});
