import { expect, test, DEMO, PASSWORD, cards, demoLogin } from './fixtures';

test.describe('sign-up', () => {
  test('shows validation messages for empty fields', async ({ page }) => {
    await page.goto('#/signup');
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page.getByText('Enter your name.')).toBeVisible();
    await expect(page.getByText('Enter your email address.')).toBeVisible();
    await expect(page.getByText('Enter a password.')).toBeVisible();
    await expect(page).toHaveURL(/#\/signup$/);
  });

  test('rejects a malformed email and a short password', async ({ page }) => {
    await page.goto('#/signup');
    await page.getByLabel('Name').fill('Sam Tester');
    await page.getByLabel('Email').fill('not-an-email');
    await page.getByLabel('Password').fill('short');
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(
      page.getByText('Enter a valid email address, like name@example.com.'),
    ).toBeVisible();
    await expect(page.getByText('Use at least 8 characters.')).toBeVisible();
    await expect(page.getByLabel('Email')).toBeFocused();
  });

  test('rejects a duplicate email', async ({ page }) => {
    await page.goto('#/signup');
    await page.getByLabel('Name').fill('Another Ana');
    await page.getByLabel('Email').fill(DEMO.ana.email);
    await page.getByLabel('Password').fill('longenough1');
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page.getByText(/already exists/)).toBeVisible();
    await expect(page).toHaveURL(/#\/signup$/);
  });

  test('creates an account, lands on the board and appears for other users', async ({ page }) => {
    await page.goto('#/signup');
    await page.getByLabel('Name').fill('Sam Tester');
    await page.getByLabel('Email').fill('sam@example.com');
    await page.getByLabel('Password').fill('longenough1');
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page).toHaveURL(/#\/board/);
    await expect(cards(page, 'todo').first()).toBeVisible();
    await expect(page.getByText('Signed in as Sam Tester')).toBeAttached();

    await page.getByRole('button', { name: 'Log out' }).click();
    await expect(page).toHaveURL(/#\/login/);
    await demoLogin(page, DEMO.ben);
    await page.getByRole('button', { name: 'Add a card to To Do' }).click();
    const assignee = page.getByRole('dialog').getByLabel('Assignee');
    await expect(assignee.locator('option', { hasText: 'Sam Tester' })).toHaveCount(1);
  });
});

test.describe('login and session', () => {
  test('logs in with the form', async ({ page }) => {
    await page.goto('#/login');
    await page.getByLabel('Email').fill(DEMO.ana.email);
    await page.getByLabel('Password').fill(PASSWORD);
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(page).toHaveURL(/#\/board/);
    await expect(cards(page, 'todo')).toHaveCount(5);
  });

  test('wrong password shows exactly one generic error', async ({ page }) => {
    await page.goto('#/login');
    await page.getByLabel('Email').fill(DEMO.ana.email);
    await page.getByLabel('Password').fill('wrong-password');
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    const alerts = page.locator('form').getByRole('alert');
    await expect(alerts).toHaveCount(1);
    await expect(alerts).toHaveText('Incorrect email or password.');
    // An unknown email must not reveal anything different.
    await page.getByLabel('Email').fill('nobody@example.com');
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(alerts).toHaveCount(1);
    await expect(alerts).toHaveText('Incorrect email or password.');
    await expect(page).toHaveURL(/#\/login/);
  });

  test('requires email and password', async ({ page }) => {
    await page.goto('#/login');
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(page.getByRole('alert')).toHaveText('Enter your email and password.');
  });

  test('one-click demo login, session survives reload, logout is permanent', async ({ page }) => {
    await demoLogin(page, DEMO.chloe);
    await expect(page).toHaveURL(/#\/board/);
    await expect(page.getByText('Signed in as Chloé Martin')).toBeAttached();

    await page.reload();
    await expect(page).toHaveURL(/#\/board/);
    await expect(cards(page, 'todo').first()).toBeVisible();
    await expect(page.getByText('Signed in as Chloé Martin')).toBeAttached();

    await page.getByRole('button', { name: 'Log out' }).click();
    await expect(page).toHaveURL(/#\/login/);
    await page.reload();
    await expect(page).toHaveURL(/#\/login/);
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
  });
});

test.describe('route guard', () => {
  for (const hash of ['#/board', '#/settings', '#/board/tasks/x']) {
    test(`signed-out ${hash} redirects to login`, async ({ page }) => {
      await page.goto(hash);
      await expect(page).toHaveURL(/#\/login$/);
      await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
    });
  }

  test('returns to the requested route after login', async ({ page }) => {
    await page.goto('#/settings');
    await expect(page).toHaveURL(/#\/login$/);
    await page
      .getByRole('button', { name: `Sign in as ${DEMO.ana.name}, ${DEMO.ana.role}` })
      .click();
    await expect(page).toHaveURL(/#\/settings$/);
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
  });

  test('signed-in users are bounced away from login', async ({ page }) => {
    await demoLogin(page);
    await page.goto('#/login');
    await expect(page).toHaveURL(/#\/board/);
  });
});
