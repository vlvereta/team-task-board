import type { Page } from '@playwright/test';
import { expect, test, cardByTitle, createTask, demoLogin } from './fixtures';

const SHOTS = 'docs/screenshots/review';
const WIDTHS = [320, 768, 1440] as const;
const HEIGHT = 800;

const LONG_WORD = 'Supercalifragilistic'.repeat(6).slice(0, 120); // 120 chars, unbroken
const LONG_TITLE = `${LONG_WORD} ${'overflow check words '.repeat(5)}`.slice(0, 200).trimEnd();
const LONG_DESCRIPTION = [
  'First paragraph with a reasonably long run of text that has to wrap nicely inside the dialog.',
  `Second paragraph with an unbroken token: ${LONG_WORD}${LONG_WORD}`,
  'Third paragraph.\nWith a hard line break and more words to make the textarea scroll internally. '.repeat(
    6,
  ),
].join('\n\n');

async function noPageOverflow(page: Page) {
  const m = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    inner: window.innerWidth,
    bodyScroll: document.body.scrollWidth,
  }));
  expect(m.scroll, 'documentElement.scrollWidth').toBeLessThanOrEqual(m.inner);
  expect(m.bodyScroll, 'body.scrollWidth').toBeLessThanOrEqual(m.inner);
}

/** Returns descriptions of cards whose content is wider than, or pokes out of, the card. */
async function clippedCards(page: Page) {
  return page.getByTestId('task-card').evaluateAll((els) =>
    els.flatMap((el) => {
      const box = el.getBoundingClientRect();
      const issues: string[] = [];
      if (el.scrollWidth > el.clientWidth + 1) issues.push('card scrollWidth');
      for (const child of el.querySelectorAll('*')) {
        if (child.getBoundingClientRect().right > box.right + 1) {
          issues.push(`child ${child.tagName} sticks out`);
          break;
        }
      }
      return issues.map((i) => `${(el as HTMLElement).dataset.taskId}: ${i}`);
    }),
  );
}

async function expectDialogNotClipped(page: Page) {
  const issues = await page.getByRole('dialog').evaluate((panel) => {
    const out: string[] = [];
    const box = panel.getBoundingClientRect();
    if (panel.scrollWidth > panel.clientWidth + 1) out.push('panel scrollWidth');
    if (box.left < -1 || box.right > window.innerWidth + 1) out.push('panel outside viewport');
    for (const child of panel.querySelectorAll('*')) {
      const r = child.getBoundingClientRect();
      if (r.width === 0) continue;
      if (r.right > box.right + 1 || r.left < box.left - 1) {
        out.push(`${child.tagName}.${(child as HTMLElement).className.toString().slice(0, 40)}`);
        break;
      }
    }
    return out;
  });
  expect(issues).toEqual([]);
}

async function shot(page: Page, name: string) {
  await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: true });
}

async function font200(page: Page) {
  await page.addStyleTag({ content: 'html { font-size: 200% }' });
}

for (const width of WIDTHS) {
  test.describe(`${width}px wide`, () => {
    test.use({ viewport: { width, height: HEIGHT } });

    test('login page', async ({ page }) => {
      await page.goto('#/login');
      await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
      await noPageOverflow(page);
      await shot(page, `login-${width}`);
    });

    test('signup page', async ({ page }) => {
      await page.goto('#/signup');
      await expect(page.getByRole('heading', { name: 'Create your account' })).toBeVisible();
      await noPageOverflow(page);
      await shot(page, `signup-${width}`);
    });

    test('board', async ({ page }) => {
      await demoLogin(page);
      await noPageOverflow(page);
      expect(await clippedCards(page)).toEqual([]);
      await shot(page, `board-${width}`);
    });

    test('settings page', async ({ page }) => {
      await demoLogin(page);
      await page.getByRole('link', { name: 'Settings' }).click();
      await expect(page.getByLabel('Display name')).toBeVisible();
      await noPageOverflow(page);
      await shot(page, `settings-${width}`);
    });

    test('very long title and multi-paragraph description', async ({ page }) => {
      expect(LONG_TITLE).toHaveLength(200);
      await demoLogin(page);
      await createTask(page, 'To Do', {
        title: LONG_TITLE,
        description: LONG_DESCRIPTION,
        assignee: 'Ben Okafor',
      });
      const card = cardByTitle(page, LONG_WORD);
      await expect(card).toBeVisible();
      await noPageOverflow(page);
      expect(await clippedCards(page)).toEqual([]);
      await shot(page, `board-long-title-${width}`);

      await card.click();
      const dialog = page.getByRole('dialog', { name: 'Edit task' });
      await expect(dialog.getByLabel('Title')).toHaveValue(LONG_TITLE);
      await noPageOverflow(page);
      await expectDialogNotClipped(page);
      await shot(page, `dialog-long-title-${width}`);

      // The delete confirmation quotes the long title.
      await dialog.getByRole('button', { name: 'Delete' }).click();
      await expect(page.getByRole('alertdialog')).toBeVisible();
      await noPageOverflow(page);
      const alert = page.getByRole('alertdialog');
      expect(await alert.evaluate((el) => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
      await shot(page, `confirm-long-title-${width}`);
    });
  });
}

for (const width of [1440, 320]) {
  test.describe(`${width}px wide at 200% root font size`, () => {
    test.use({ viewport: { width, height: HEIGHT } });

    test('login, board, dialog and settings', async ({ page }) => {
      await page.goto('#/login');
      await font200(page);
      await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
      await noPageOverflow(page);
      await shot(page, `login-${width}-font200`);

      await page.getByRole('button', { name: 'Sign in as Ana Silva, Project lead' }).click();
      await expect(page.getByTestId('task-card').first()).toBeVisible();
      await noPageOverflow(page);
      expect(await clippedCards(page)).toEqual([]);
      await shot(page, `board-${width}-font200`);

      await page.getByTestId('task-card').first().click();
      await expect(page.getByRole('dialog', { name: 'Edit task' })).toBeVisible();
      await noPageOverflow(page);
      await expectDialogNotClipped(page);
      await shot(page, `dialog-${width}-font200`);
      await page.getByRole('button', { name: 'Close task' }).click();

      await page.getByRole('link', { name: 'Settings' }).click();
      await expect(page.getByLabel('Display name')).toBeVisible();
      await noPageOverflow(page);
      await shot(page, `settings-${width}-font200`);
    });

    test('long title card and dialog', async ({ page }) => {
      await demoLogin(page);
      await font200(page);
      await createTask(page, 'To Do', { title: LONG_TITLE, description: LONG_DESCRIPTION });
      await expect(cardByTitle(page, LONG_WORD)).toBeVisible();
      await noPageOverflow(page);
      expect(await clippedCards(page)).toEqual([]);
      await cardByTitle(page, LONG_WORD).click();
      await expect(page.getByRole('dialog', { name: 'Edit task' })).toBeVisible();
      await noPageOverflow(page);
      await expectDialogNotClipped(page);
      await shot(page, `dialog-long-title-${width}-font200`);
    });
  });
}
