// E2E «desktop»: на широком экране список комнат и переписка видны сразу.
// Запуск: ./tools/chat e2e desktop (или ./tools/chat e2e critical).
import { expect, test, type Page } from '@playwright/test';

const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`;

test.use({ viewport: { width: 1440, height: 900 } });

async function register(page: Page, name: string): Promise<void> {
  await page.goto('/login');
  await page.getByRole('button', { name: 'Регистрация' }).click();
  await page.getByRole('textbox', { name: 'Логин' }).fill(`${name.toLowerCase()}${suffix}`);
  await page.getByRole('textbox', { name: 'Пароль' }).fill('e2e-password-123');
  await page.getByRole('button', { name: 'Создать аккаунт' }).click();
  await expect(page.getByRole('heading', { name: 'Чаты' })).toBeVisible();
}

test('wide screens show the room list and the conversation side by side', async ({ page }) => {
  await register(page, 'Desk');

  // Комната не выбрана — правая колонка объясняет, что делать.
  await expect(page.getByText('Выберите комнату слева')).toBeVisible();

  const roomName = `E2E Desktop ${suffix}`;
  await page.getByRole('button', { name: 'Новая комната' }).click();
  await page.getByRole('textbox', { name: 'Название' }).fill(roomName);
  await page.getByRole('button', { name: 'Создать' }).click();

  // Обе колонки одновременно: список слева, переписка справа.
  await expect(page.getByRole('heading', { name: 'Чаты' })).toBeVisible();
  await expect(page.getByRole('heading', { name: roomName })).toBeVisible();

  await page.getByRole('textbox', { name: 'Сообщение' }).fill('Сообщение с компьютера');
  await page.getByRole('textbox', { name: 'Сообщение' }).press('Enter');
  await expect(page.locator('article', { hasText: 'Сообщение с компьютера' }).first()).toBeVisible({
    timeout: 10_000,
  });

  // Сужение окна переключает раскладку, но открытую комнату не теряет.
  await page.setViewportSize({ width: 420, height: 900 });
  await expect(page.getByRole('heading', { name: roomName })).toBeVisible();
  await expect(page.getByText('Выберите комнату слева')).toBeHidden();
});

test('the desktop layout works from the keyboard', async ({ page }) => {
  await register(page, 'Keys');

  const roomName = `E2E Keys ${suffix}`;
  await page.getByRole('button', { name: 'Новая комната' }).click();
  await page.getByRole('textbox', { name: 'Название' }).fill(roomName);
  await page.getByRole('button', { name: 'Создать' }).click();
  await expect(page.getByRole('heading', { name: roomName })).toBeVisible();

  // Отправка с клавиатуры: фокус в поле и Enter.
  const composer = page.getByRole('textbox', { name: 'Сообщение' });
  await composer.focus();
  await page.keyboard.type('Пишу с клавиатуры');
  await page.keyboard.press('Enter');
  await expect(page.locator('article', { hasText: 'Пишу с клавиатуры' }).first()).toBeVisible({
    timeout: 10_000,
  });

  // Комната в списке доступна фокусом и открывается с клавиатуры.
  const roomButton = page.getByRole('button', { name: new RegExp(roomName) }).first();
  await roomButton.focus();
  await expect(roomButton).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: roomName })).toBeVisible();
});

test('neither the page nor the columns move the whole app', async ({ page }) => {
  await register(page, 'Scroll');

  const roomName = `E2E Scroll ${suffix}`;
  await page.getByRole('button', { name: 'Новая комната' }).click();
  await page.getByRole('textbox', { name: 'Название' }).fill(roomName);
  await page.getByRole('button', { name: 'Создать' }).click();
  await expect(page.getByRole('heading', { name: roomName })).toBeVisible();

  // Набиваем историю, чтобы ленте было что прокручивать.
  const composer = page.getByRole('textbox', { name: 'Сообщение' });
  for (let index = 0; index < 12; index++) {
    await composer.fill(`Сообщение номер ${index}`);
    await composer.press('Enter');
  }
  await expect(page.locator('article', { hasText: 'Сообщение номер 11' }).first()).toBeVisible({
    timeout: 10_000,
  });

  // Прокрутка внутри ленты не двигает страницу.
  const feed = page.locator('.scroll-area').first();
  await feed.evaluate((element) => element.scrollBy(0, -400));
  await expect
    .poll(() => page.evaluate(() => window.scrollY))
    .toBe(0);

  // Документ вообще не прокручиваемый: его высота равна видимой области.
  const overflows = await page.evaluate(
    () => document.documentElement.scrollHeight > document.documentElement.clientHeight,
  );
  expect(overflows).toBe(false);
});
