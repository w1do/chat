// E2E real-time: два пользователя, живая доставка, typing, reconnect/resync.
// Запуск: ./tools/chat e2e realtime (контейнер Playwright против smoke-стека).
import { expect, test, type Page } from '@playwright/test';

const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`;

/** Вход максимально короткий: логин и пароль, без почты. */
async function register(page: Page, name: string): Promise<void> {
  await page.goto('/login');
  await page.getByRole('button', { name: 'Регистрация' }).click();
  await page.getByRole('textbox', { name: 'Логин' }).fill(`${name.toLowerCase()}${suffix}`);
  await page.getByRole('textbox', { name: 'Пароль' }).fill('e2e-password-123');
  await page.getByRole('button', { name: 'Создать аккаунт' }).click();
  await expect(page.getByRole('heading', { name: 'Чаты' })).toBeVisible();
}

test('two users chat in real time with typing and reconnect resync', async ({ browser }) => {
  const contextA = await browser.newContext();
  const contextB = await browser.newContext();
  const alice = await contextA.newPage();
  const bob = await contextB.newPage();

  await register(alice, 'Alice');
  await register(bob, 'Bob');

  // Alice создаёт публичную комнату.
  const roomName = `E2E Room ${suffix}`;
  await alice.getByRole('button', { name: 'Новая комната' }).click();
  await alice.getByRole('textbox', { name: 'Название' }).fill(roomName);
  await alice.getByRole('button', { name: 'Создать' }).click();
  await expect(alice.getByRole('heading', { name: roomName })).toBeVisible();

  // Bob находит комнату (список публичных обновляется перезагрузкой) и вступает.
  await bob.reload();
  await bob.getByRole('button', { name: new RegExp(roomName) }).click({ timeout: 20_000 });
  await bob.getByRole('button', { name: 'Вступить в комнату' }).click();
  await expect(bob.getByRole('textbox', { name: 'Сообщение' })).toBeVisible();

  // Живая доставка: Alice пишет — у Bob сообщение появляется без reload.
  await alice.getByRole('textbox', { name: 'Сообщение' }).fill('Привет из e2e!');
  await alice.getByRole('textbox', { name: 'Сообщение' }).press('Enter');
  await expect(alice.locator('article', { hasText: 'Привет из e2e!' }).first()).toBeVisible({
    timeout: 10_000,
  });
  await expect(bob.locator('article', { hasText: 'Привет из e2e!' }).first()).toBeVisible({
    timeout: 10_000,
  });

  // Typing: Bob печатает — Alice видит это в шапке комнаты, а не в ленте.
  await bob.getByRole('textbox', { name: 'Сообщение' }).fill('Пишу ответ');
  await expect(alice.getByRole('banner').getByText(/печата/)).toBeVisible({ timeout: 10_000 });

  // Bob отправляет — Alice получает live.
  await bob.getByRole('textbox', { name: 'Сообщение' }).press('Enter');
  await expect(alice.locator('article', { hasText: 'Пишу ответ' }).first()).toBeVisible({ timeout: 10_000 });

  // Disconnect/reconnect: Bob оффлайн, Alice пишет, Bob возвращается → resync по HTTP.
  await contextB.setOffline(true);
  await expect(bob.getByLabel('Состояние соединения')).toContainText(
    /Переподключение|Соединение потеряно/,
    { timeout: 30_000 },
  );
  await alice.getByRole('textbox', { name: 'Сообщение' }).fill('Пропущенное сообщение');
  await alice.getByRole('textbox', { name: 'Сообщение' }).press('Enter');
  await expect(alice.locator('article', { hasText: 'Пропущенное сообщение' }).first()).toBeVisible({
    timeout: 10_000,
  });

  await contextB.setOffline(false);
  await expect(bob.locator('article', { hasText: 'Пропущенное сообщение' }).first()).toBeVisible({
    timeout: 30_000,
  });

  await contextA.close();
  await contextB.close();
});
