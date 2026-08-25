// E2E «ai-revision»: помощник предлагает правку черновика, а не публикует её.
// Помощник по умолчанию выключен, поэтому сценарий проверяет документированный
// отказ; при поднятом AI_ENABLED=true он же проверяет предложение и отмену.
// Запуск: ./tools/chat e2e ai-revision (или ./tools/chat e2e critical).
import { expect, test, type Page } from '@playwright/test';

const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
const aiEnabled = process.env.E2E_AI_ENABLED === 'true';

async function register(page: Page, name: string): Promise<void> {
  await page.goto('/login');
  await page.getByRole('button', { name: 'Регистрация' }).click();
  await page.getByRole('textbox', { name: 'Логин' }).fill(`${name.toLowerCase()}${suffix}`);
  await page.getByRole('textbox', { name: 'Пароль' }).fill('e2e-password-123');
  await page.getByRole('button', { name: 'Создать аккаунт' }).click();
  await expect(page.getByRole('heading', { name: 'Чаты' })).toBeVisible();
}

test('the assistant suggests instead of publishing, and chat works without it', async ({ page }) => {
  await register(page, 'Ai');

  const roomName = `E2E AI ${suffix}`;
  await page.getByRole('button', { name: 'Новая комната' }).click();
  await page.getByRole('textbox', { name: 'Название' }).fill(roomName);
  await page.getByRole('button', { name: 'Создать' }).click();
  await expect(page.getByRole('heading', { name: roomName })).toBeVisible();

  const composer = page.getByRole('textbox', { name: 'Сообщение' });
  await composer.fill('привет как дила');

  const magic = page.getByRole('button', { name: 'Помощник с текстом' });

  if (!(await magic.isVisible())) {
    // Помощник выключен администратором или конфигурацией: чат работает как
    // обычно — это и есть проверяемое поведение.
    await composer.press('Enter');
    await expect(page.locator('article', { hasText: 'привет как дила' }).first()).toBeVisible({ timeout: 10_000 });

    return;
  }

  await magic.click();

  const disabled = page.getByText('Обработка текста внешним ИИ отключена на этом сервере');

  // isVisible() проверяет мгновенно — содержимое листа появляется на такт позже.
  const isDisabled = await disabled
    .waitFor({ state: 'visible', timeout: 5_000 })
    .then(() => true)
    .catch(() => false);

  if (isDisabled) {
    // Помощник выключен: об этом сказано словами, а сообщение отправляется.
    await page.keyboard.press('Escape');
    await composer.press('Enter');
    await expect(page.locator('article', { hasText: 'привет как дила' }).first()).toBeVisible({ timeout: 10_000 });

    return;
  }

  await page.getByRole('button', { name: 'Исправить' }).click();

  if (!aiEnabled) {
    // Выключенный или недоступный помощник объясняется словами, а не пустотой.
    await expect(
      page.getByText(/Обработка текста внешним ИИ отключена|Помощник недоступен/),
    ).toBeVisible({ timeout: 20_000 });
    // Черновик остался у пользователя, отправка по-прежнему работает.
    await page.keyboard.press('Escape');
    await composer.press('Enter');
    await expect(page.locator('article', { hasText: 'привет как дила' }).first()).toBeVisible({ timeout: 10_000 });

    return;
  }

  // Предложение — именно предложение: пока не заменили черновик, лента пуста.
  await expect(page.getByText('Стало')).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('article')).toHaveCount(0);

  await page.getByRole('button', { name: 'Заменить черновик' }).click();
  await expect(composer).not.toHaveValue('привет как дила');

  await page.getByRole('button', { name: 'Вернуть мой текст' }).click();
  await expect(composer).toHaveValue('привет как дила');
});
