// E2E «membership»: владелец зовёт человека по нику и затем исключает его;
// исключённый с открытой комнатой оказывается в списке комнат.
// Запуск: ./tools/chat e2e membership
import { expect, test, type Page } from '@playwright/test';

const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`;

async function register(page: Page, name: string): Promise<string> {
  const login = `${name.toLowerCase()}${suffix}`;

  await page.goto('/login');
  await page.getByRole('button', { name: 'Регистрация' }).click();
  await page.getByRole('textbox', { name: 'Логин' }).fill(login);
  await page.getByRole('textbox', { name: 'Пароль' }).fill('e2e-password-123');
  await page.getByRole('button', { name: 'Создать аккаунт' }).click();
  await expect(page.getByRole('heading', { name: 'Чаты' })).toBeVisible();

  return login;
}

test('owner invites by nickname and later removes the person from the room', async ({ browser }) => {
  const contextA = await browser.newContext();
  const contextB = await browser.newContext();
  const owner = await contextA.newPage();
  const guest = await contextB.newPage();

  await register(owner, 'Olga');
  const guestLogin = await register(guest, 'Mark');

  // Закрытая комната: без приглашения человека в ней быть не может.
  const roomName = `E2E Membership ${suffix}`;
  await owner.getByRole('button', { name: 'Новая комната' }).click();
  await owner.getByRole('textbox', { name: 'Название' }).fill(roomName);
  await owner.getByLabel('Видимость').selectOption('private');
  await owner.getByRole('button', { name: 'Создать' }).click();
  await expect(owner.getByRole('heading', { name: roomName })).toBeVisible();

  // Приглашение по нику: идентификатор нигде не вводится.
  await owner.getByRole('heading', { name: roomName }).click();
  const nickname = owner.getByLabel('Ник человека');
  await expect(nickname).toBeVisible({ timeout: 20_000 });
  await nickname.fill(`@${guestLogin}`);

  const found = owner.getByRole('button', { name: new RegExp(guestLogin) });
  await expect(found).toBeVisible({ timeout: 20_000 });
  await found.click();

  await expect(owner.getByText(`Участники · 2`)).toBeVisible({ timeout: 20_000 });

  // Приглашённый открывает комнату и остаётся в ней.
  await guest.reload();
  await guest.getByRole('button', { name: new RegExp(roomName) }).click({ timeout: 20_000 });
  await expect(guest.getByRole('textbox', { name: 'Сообщение' })).toBeVisible({ timeout: 20_000 });

  // Исключение: действие рядом с ролью, подтверждение — без набора названия.
  await owner.getByRole('button', { name: `Исключить ${guestLogin}` }).click();
  await owner.getByRole('button', { name: 'Исключить', exact: true }).click();
  await expect(owner.getByText(`Участники · 1`)).toBeVisible({ timeout: 20_000 });

  // Исключённый читал комнату — он возвращается к списку комнат, и закрытой
  // комнаты там больше нет.
  await expect(guest.getByRole('heading', { name: 'Чаты' })).toBeVisible({ timeout: 30_000 });
  await expect(guest.getByRole('button', { name: new RegExp(roomName) })).toHaveCount(0);

  await contextA.close();
  await contextB.close();
});
