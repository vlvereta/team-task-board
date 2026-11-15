import {
  expect,
  test,
  DEMO,
  cardByTitle,
  cards,
  createTask,
  demoLogin,
  expectCounts,
} from './fixtures';

const MIN_TOUCH = 44;

test('login with a demo account on a phone', async ({ page }) => {
  await page.goto('#/login');
  await page.getByLabel('Email').fill(DEMO.ana.email);
  await page.getByLabel('Password').fill('demo1234');
  await page.getByRole('button', { name: 'Sign in', exact: true }).tap();
  await expect(page).toHaveURL(/#\/board/);
  await expect(cards(page, 'todo')).toHaveCount(5);
});

test('board columns scroll horizontally with snapping', async ({ page }) => {
  await demoLogin(page, DEMO.ben);
  const strip = page.getByTestId('column-strip');
  const style = await strip.evaluate((el) => {
    const cs = getComputedStyle(el);
    return {
      snap: cs.scrollSnapType,
      overflowX: cs.overflowX,
      scrollable: el.scrollWidth > el.clientWidth,
    };
  });
  expect(style.snap).toContain('x');
  expect(style.snap).toContain('mandatory');
  expect(style.overflowX).toBe('auto');
  expect(style.scrollable).toBe(true);

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth <= window.innerWidth,
  );
  expect(overflow).toBe(true);

  await expect(page.getByTestId('column-todo')).toBeInViewport();
  await expect(page.getByTestId('column-done')).not.toBeInViewport();
  await strip.evaluate((el) => el.scrollTo({ left: el.scrollWidth, behavior: 'instant' }));
  await expect(page.getByTestId('column-done')).toBeInViewport();
});

test('task dialog is a full-screen sheet', async ({ page }) => {
  await demoLogin(page);
  await cardByTitle(page, 'Set up analytics and consent banner').tap();
  const dialog = page.getByRole('dialog', { name: 'Edit task' });
  await expect(dialog).toBeVisible();
  const vp = page.viewportSize()!;
  await expect
    .poll(async () => {
      const box = (await dialog.boundingBox())!;
      return {
        x: Math.round(box.x),
        y: Math.round(box.y),
        w: Math.round(box.width),
        h: Math.round(box.height),
      };
    })
    .toEqual({ x: 0, y: 0, w: vp.width, h: vp.height });
  await page.getByRole('button', { name: 'Close task' }).tap();
  await expect(dialog).toBeHidden();
});

test('touch targets are at least 44px tall', async ({ page }) => {
  await demoLogin(page);
  const targets = [
    page.getByRole('button', { name: 'My tasks' }),
    page.getByRole('link', { name: 'Settings' }),
    page.getByRole('button', { name: 'Log out' }),
    page.getByRole('button', { name: 'Add a card to To Do' }),
    page.getByRole('button', { name: 'Add a card to In Progress' }),
    page.getByRole('button', { name: 'Add a card to Done' }),
  ];
  for (const t of targets) {
    const box = await t.boundingBox();
    expect(box, await t.innerText().catch(() => 'target')).not.toBeNull();
    expect(box!.height).toBeGreaterThanOrEqual(MIN_TOUCH);
  }
});

test('create a task on a phone', async ({ page }) => {
  await demoLogin(page);
  await createTask(page, 'To Do', { title: 'Phone task', description: 'from mobile' });
  await expect(cardByTitle(page, 'Phone task')).toBeVisible();
  await expectCounts(page, 6, 4, 3);
  await page.reload();
  await expect(cardByTitle(page, 'Phone task')).toBeVisible();
});
