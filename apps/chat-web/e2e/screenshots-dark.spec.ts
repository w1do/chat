// Тёмная тема: приложение следует системной настройке, поэтому достаточно
// открыть его в контексте с `colorScheme: 'dark'` — ходить по меню не нужно.
import { expect, test, type Page } from '@playwright/test';

const PHONE = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: 'dark' } as const;

async function dismissHint(page: Page): Promise<void> {
  const hint = page.getByRole('button', { name: /Потяните сообщение влево/ });
  if (await hint.isVisible().catch(() => false)) await hint.click();
}

test('тёмная тема', async ({ browser }) => {
  test.setTimeout(120_000);
  const page = await (await browser.newContext(PHONE)).newPage();

  await page.goto('/login');
  await page.getByRole('textbox', { name: 'Логин' }).fill('marina');
  await page.getByRole('textbox', { name: 'Пароль' }).fill('demo-password-123');
  await page.getByRole('button', { name: 'Войти' }).click();
  await expect(page.getByRole('heading', { name: 'Чаты' })).toBeVisible({ timeout: 20_000 });

  await page.getByRole('button', { name: /Семья/ }).first().click({ timeout: 15_000 });
  await expect(page.getByRole('heading', { name: 'Семья' })).toBeVisible({ timeout: 20_000 });
  await dismissHint(page);
  await page.waitForTimeout(1500);

  await page.screenshot({ path: '/repo/examples/22-temnaya-tema.png' });
});
