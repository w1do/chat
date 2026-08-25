// E2E управление комнатой: владелец переименовывает и удаляет комнату,
// второй участник с открытой комнатой оказывается в списке комнат.
// Запуск: ./tools/chat e2e room-management
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

test('owner renames and deletes a room while another member is reading it', async ({ browser }) => {
  const contextA = await browser.newContext();
  const contextB = await browser.newContext();
  const owner = await contextA.newPage();
  const member = await contextB.newPage();

  await register(owner, 'Olga');
  await register(member, 'Mark');

  const roomName = `E2E Manage ${suffix}`;
  await owner.getByRole('button', { name: 'Новая комната' }).click();
  await owner.getByRole('textbox', { name: 'Название' }).fill(roomName);
  await owner.getByRole('button', { name: 'Создать' }).click();
  await expect(owner.getByRole('heading', { name: roomName })).toBeVisible();

  // Второй участник вступает и остаётся в комнате открытым.
  await member.reload();
  await member.getByRole('button', { name: new RegExp(roomName) }).click({ timeout: 20_000 });
  await member.getByRole('button', { name: 'Вступить в комнату' }).click();
  await expect(member.getByRole('textbox', { name: 'Сообщение' })).toBeVisible();

  // Переименование: новое название видно без перезагрузки.
  const renamed = `${roomName} renamed`;
  await owner.getByRole('heading', { name: roomName }).click();
  await expect(owner.getByLabel('Название')).toBeVisible({ timeout: 20_000 });
  await owner.getByLabel('Название').fill(renamed);
  await owner.getByRole('button', { name: 'Сохранить' }).click();
  // Новое название расходится по интерфейсу без перезагрузки.
  await expect(owner.getByRole('heading', { name: renamed })).toBeVisible({ timeout: 20_000 });

  // Удаление навсегда: подтверждение — дословное название.
  await owner.getByRole('button', { name: 'Удалить комнату' }).click();
  const confirmButton = owner.getByRole('button', { name: 'Удалить навсегда' });
  await expect(confirmButton).toBeDisabled();
  await owner.getByLabel(/Введите название комнаты/).fill(renamed);
  await expect(confirmButton).toBeEnabled();
  await confirmButton.click();

  // Владелец — в списке комнат, удалённой комнаты там нет.
  await expect(owner.getByRole('heading', { name: 'Чаты' })).toBeVisible({ timeout: 20_000 });
  await expect(owner.getByRole('button', { name: new RegExp(roomName) })).toHaveCount(0);

  // Второй участник читал комнату — он возвращается к списку комнат.
  await expect(member.getByRole('heading', { name: 'Чаты' })).toBeVisible({ timeout: 30_000 });
  await expect(member.getByRole('button', { name: new RegExp(roomName) })).toHaveCount(0);

  await contextA.close();
  await contextB.close();
});
