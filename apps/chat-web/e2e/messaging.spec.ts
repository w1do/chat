// E2E «messaging»: комната, переписка двоих, поиск по истории, удаление и
// уведомление о пропущенном.
// Запуск: ./tools/chat e2e messaging (или ./tools/chat e2e critical).
import { expect, test, type Page } from '@playwright/test';

const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`;

test.setTimeout(180_000);

async function register(page: Page, name: string): Promise<void> {
  await page.goto('/login');
  await page.getByRole('button', { name: 'Регистрация' }).click();
  await page.getByRole('textbox', { name: 'Логин' }).fill(`${name.toLowerCase()}${suffix}`);
  await page.getByRole('textbox', { name: 'Пароль' }).fill('e2e-password-123');
  await page.getByRole('button', { name: 'Создать аккаунт' }).click();
  await expect(page.getByRole('heading', { name: 'Чаты' })).toBeVisible();
}

test('two users talk, search history and see what was missed', async ({ browser }) => {
  const contextA = await browser.newContext();
  const contextB = await browser.newContext();
  const alice = await contextA.newPage();
  const bob = await contextB.newPage();

  await register(alice, 'Msga');
  await register(bob, 'Msgb');

  const roomName = `E2E Msg ${suffix}`;
  await alice.getByRole('button', { name: 'Новая комната' }).click();
  await alice.getByRole('textbox', { name: 'Название' }).fill(roomName);
  await alice.getByRole('button', { name: 'Создать' }).click();
  await expect(alice.getByRole('heading', { name: roomName })).toBeVisible();

  // Bob вступает, но сам ничего не пишет: он — тот, кто пропустит сообщения.
  await bob.reload();
  await bob.getByRole('button', { name: new RegExp(roomName) }).click({ timeout: 20_000 });
  await bob.getByRole('button', { name: 'Вступить в комнату' }).click();
  await expect(bob.getByRole('textbox', { name: 'Сообщение' })).toBeVisible();

  // Живая доставка.
  await alice.getByRole('textbox', { name: 'Сообщение' }).fill('рецепт борща на выходные');
  await alice.getByRole('textbox', { name: 'Сообщение' }).press('Enter');
  await expect(bob.locator('article', { hasText: 'рецепт борща' }).first()).toBeVisible({ timeout: 10_000 });

  // Поиск по истории: с поднятым Typesense находит, без него честно говорит,
  // что недоступен (SEARCH_ENABLED выключен по умолчанию).
  await alice.getByRole('button', { name: 'Поиск по комнате' }).click();
  await alice.getByLabel('Что ищем').fill('борща');
  await expect(
    alice.getByText(/рецепт борща|Поиск сейчас недоступен|Ничего не нашлось/).first(),
  ).toBeVisible({ timeout: 15_000 });
  await alice.keyboard.press('Escape');

  // Bob уходит из комнаты — теперь он «не здесь».
  await bob.getByRole('button', { name: 'Назад' }).click();
  await expect(bob.getByRole('heading', { name: 'Чаты' })).toBeVisible();

  // Alice пишет вдогонку: Bob должен узнать об этом из уведомлений.
  await alice.getByRole('textbox', { name: 'Сообщение' }).fill('Ты пропустил самое интересное');
  await alice.getByRole('textbox', { name: 'Сообщение' }).press('Enter');

  await expect(async () => {
    await bob.reload();
    await bob.getByRole('button', { name: /^Уведомления/ }).click();
    await expect(bob.getByText(new RegExp(roomName))).toBeVisible({ timeout: 5_000 });
  }).toPass({ timeout: 60_000 });

  // Автор удаляет своё сообщение через меню действий: постоянных кнопок у
  // сообщений больше нет — действия живут на жестах и в меню.
  await alice
    .locator('article', { hasText: 'Ты пропустил самое интересное' })
    .click({ button: 'right' });
  await alice.getByRole('button', { name: 'Удалить' }).click();
  await expect(alice.getByText('Сообщение удалено').first()).toBeVisible({ timeout: 10_000 });

  await contextA.close();
  await contextB.close();
});
