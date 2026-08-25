// E2E «invite»: участник зовёт человека ссылкой, тот называет имя и сразу
// оказывается в комнате. Запуск: ./tools/chat e2e invite.
import { expect, test, type Page } from '@playwright/test';

const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`;

async function register(page: Page, name: string): Promise<void> {
  await page.goto('/login');
  await page.getByRole('button', { name: 'Регистрация' }).click();
  await page.getByRole('textbox', { name: 'Логин' }).fill(`${name.toLowerCase()}${suffix}`);
  await page.getByRole('textbox', { name: 'Пароль' }).fill('e2e-password-123');
  await page.getByRole('button', { name: 'Создать аккаунт' }).click();
  await expect(page.getByRole('heading', { name: 'Чаты' })).toBeVisible();
}

test('an invite link brings a newcomer straight into the room', async ({ browser }) => {
  const hostContext = await browser.newContext({
    permissions: ['clipboard-read', 'clipboard-write'],
  });
  const guestContext = await browser.newContext();
  const host = await hostContext.newPage();
  const guest = await guestContext.newPage();

  await register(host, 'Host');

  // Приватная комната: по ссылке в неё попасть можно, иначе — нет.
  const roomName = `E2E Invite ${suffix}`;
  await host.getByRole('button', { name: 'Новая комната' }).click();
  await host.getByRole('textbox', { name: 'Название' }).fill(roomName);
  await host.getByLabel('Видимость').selectOption('private');
  await host.getByRole('button', { name: 'Создать' }).click();
  await expect(host.getByRole('heading', { name: roomName })).toBeVisible();

  await host.getByRole('button', { name: 'Пригласить' }).click();

  // По http буфер обмена недоступен — приложение показывает саму ссылку.
  // Проверяем оба пути: главное, чтобы приглашение не пропало молча.
  const toast = host.getByRole('status').filter({ hasText: /Приглашение скопировано|\/invite\// });
  await expect(toast).toBeVisible({ timeout: 15_000 });

  const shown = (await toast.textContent()) ?? '';
  const link = shown.includes('/invite/')
    ? (shown.match(/https?:\/\/\S+/)?.[0] ?? '')
    : ((await host.evaluate(() => navigator.clipboard.readText())).match(/https?:\/\/\S+/)?.[0] ?? '');

  expect(link).toContain('/invite/');

  // Гость: незнакомый человек без аккаунта.
  await guest.goto(link);
  await expect(guest.getByRole('heading', { name: roomName })).toBeVisible({ timeout: 15_000 });

  await guest.getByLabel('Как вас зовут?').fill('Надя');
  await guest.getByRole('button', { name: 'Присоединиться к чату' }).click();

  // Сразу в комнате и сразу может писать.
  await expect(guest.getByRole('textbox', { name: 'Сообщение' })).toBeVisible({ timeout: 15_000 });
  await guest.getByRole('textbox', { name: 'Сообщение' }).fill('Привет, я по ссылке!');
  await guest.getByRole('textbox', { name: 'Сообщение' }).press('Enter');

  await expect(host.locator('article', { hasText: 'Привет, я по ссылке!' }).first()).toBeVisible({
    timeout: 15_000,
  });

  // Аккаунт создан системой — настройки объясняют, что делать дальше.
  await guest.getByRole('button', { name: 'Назад' }).click();
  await guest.getByRole('button', { name: 'Настройки' }).click();
  await expect(guest.getByText('Задайте свой пароль')).toBeVisible();

  await hostContext.close();
  await guestContext.close();
});
