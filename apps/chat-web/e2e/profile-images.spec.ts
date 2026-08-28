// E2E «profile-images»: человек ставит аватарку и её видит второй в списке
// участников; владелец ставит фотографию комнаты.
// Запуск: ./tools/chat e2e profile-images
import { expect, test, type Page } from '@playwright/test';

const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`;

/** Однопиксельный PNG: содержимое неважно, важен путь через хранилище. */
const PIXEL = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

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

test('a person sets an avatar and the room gets a photo', async ({ browser }) => {
  const contextA = await browser.newContext();
  const contextB = await browser.newContext();
  const owner = await contextA.newPage();
  const guest = await contextB.newPage();

  const ownerLogin = await register(owner, 'Olga');
  const guestLogin = await register(guest, 'Mark');

  // Аватарка: загружается в настройках профиля.
  await owner.getByRole('button', { name: 'Настройки' }).click();
  // Строка профиля подписана именем человека, а не словом «Профиль».
  await owner.getByRole('button', { name: new RegExp(ownerLogin) }).first().click();
  await owner.getByLabel('Файл аватарки').setInputFiles({
    name: 'face.png',
    mimeType: 'image/png',
    buffer: PIXEL,
  });
  await expect(owner.getByText('Ваша аватарка')).toBeVisible({ timeout: 20_000 });

  // Комната с фотографией: её ставит владелец. Лист профиля закрывается
  // Escape — иначе он перекрывает нижнюю навигацию.
  await owner.keyboard.press('Escape');
  await owner.getByRole('button', { name: 'Чаты' }).click();
  const roomName = `E2E Images ${suffix}`;
  await owner.getByRole('button', { name: 'Новая комната' }).click();
  await owner.getByRole('textbox', { name: 'Название' }).fill(roomName);
  await owner.getByLabel('Видимость').selectOption('private');
  await owner.getByRole('button', { name: 'Создать' }).click();
  await expect(owner.getByRole('heading', { name: roomName })).toBeVisible();

  await owner.getByRole('heading', { name: roomName }).click();
  await expect(owner.getByLabel('Фотография комнаты')).toBeVisible({ timeout: 20_000 });
  await owner.getByLabel('Файл фотографии комнаты').setInputFiles({
    name: 'room.png',
    mimeType: 'image/png',
    buffer: PIXEL,
  });
  await expect(owner.getByRole('button', { name: 'Заменить фотографию' })).toBeVisible({ timeout: 20_000 });

  // Приглашаем второго — он должен увидеть аватарку владельца в участниках.
  await owner.getByLabel('Ник человека').fill(`@${guestLogin}`);
  await owner.getByRole('button', { name: new RegExp(guestLogin) }).click({ timeout: 20_000 });
  await expect(owner.getByText('Участники · 2')).toBeVisible({ timeout: 20_000 });

  await guest.reload();
  await guest.getByRole('button', { name: new RegExp(roomName) }).click({ timeout: 20_000 });
  await guest.getByRole('heading', { name: roomName }).click();

  // Аватарка владельца пришла картинкой, а не буквой. Файл защищён, поэтому
  // приходит авторизованным запросом и показывается из blob: (ADR-012).
  const avatar = guest.locator('img[src^="blob:"]').first();
  await expect(avatar).toBeVisible({ timeout: 20_000 });

  // Повторный показ картинки её не теряет: адрес файла не изменился, и
  // устройство берёт его тем же путём.
  await guest.reload();
  await expect(guest.locator('img[src^="blob:"]').first()).toBeVisible({ timeout: 20_000 });

  await contextA.close();
  await contextB.close();
});
