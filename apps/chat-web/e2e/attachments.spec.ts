// E2E вложения: несколько изображений и документ одним сообщением, второй
// браузер видит плитки live и листает галерею.
// Запуск: ./tools/chat e2e attachments (контейнер Playwright против smoke-стека).
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

// Настоящие файлы, а не заглушки: сервер проверяет содержимое (spec).
const PNG_1PX = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);
const PDF_MINIMAL = Buffer.from(
  '%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [] /Count 0 >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n',
);

test('attachments travel to the second browser as tiles with a gallery', async ({ browser }) => {
  const contextA = await browser.newContext();
  const contextB = await browser.newContext();
  const alice = await contextA.newPage();
  const bob = await contextB.newPage();

  await register(alice, 'Alice');
  await register(bob, 'Bob');

  const roomName = `E2E Files ${suffix}`;
  await alice.getByRole('button', { name: 'Новая комната' }).click();
  await alice.getByRole('textbox', { name: 'Название' }).fill(roomName);
  await alice.getByRole('button', { name: 'Создать' }).click();
  await expect(alice.getByRole('heading', { name: roomName })).toBeVisible();

  await bob.reload();
  await bob.getByRole('button', { name: new RegExp(roomName) }).click({ timeout: 20_000 });
  await bob.getByRole('button', { name: 'Вступить в комнату' }).click();
  await expect(bob.getByRole('textbox', { name: 'Сообщение' })).toBeVisible();

  // Alice прикладывает две фотографии и документ одним сообщением.
  await alice.locator('[data-testid="attachment-input"]').setInputFiles([
    { name: 'first.png', mimeType: 'image/png', buffer: PNG_1PX },
    { name: 'second.png', mimeType: 'image/png', buffer: PNG_1PX },
    { name: 'справка.pdf', mimeType: 'application/pdf', buffer: PDF_MINIMAL },
  ]);

  // Плитки предпросмотра видны, загрузка завершается, кнопка оживает.
  await expect(alice.locator('[data-testid="composer-attachment"]')).toHaveCount(3);
  await expect(alice.getByRole('button', { name: 'Отправить' })).toBeEnabled({ timeout: 20_000 });
  await alice.getByRole('button', { name: 'Отправить' }).click();

  // Сообщение без текста дошло до автора: две плитки и строка документа.
  await expect(alice.getByLabel('Открыть изображение first.png')).toBeVisible({ timeout: 20_000 });
  await expect(alice.getByLabel('Скачать справка.pdf')).toBeVisible();

  // Миниатюра готова уже к ответу на загрузку: в плитке изображение, а не
  // состояние ожидания, и перезагрузка приложения для этого не нужна.
  await expect(alice.getByLabel('Открыть изображение first.png').locator('img')).toBeVisible();
  await expect(alice.getByTestId('attachment-waiting')).toHaveCount(0);

  // Второй браузер получает то же самое live, без перезагрузки.
  await expect(bob.getByLabel('Открыть изображение first.png')).toBeVisible({ timeout: 20_000 });
  await expect(bob.getByLabel('Открыть изображение second.png')).toBeVisible();
  await expect(bob.getByLabel('Скачать справка.pdf')).toBeVisible();
  await expect(bob.getByLabel('Открыть изображение first.png').locator('img')).toBeVisible();
  await expect(bob.getByTestId('attachment-waiting')).toHaveCount(0);

  // Bob открывает галерею с первой плитки и листает до второй.
  await bob.getByLabel('Открыть изображение first.png').click();
  const gallery = bob.getByRole('dialog');
  await expect(gallery).toBeVisible();
  await expect(gallery.getByRole('status')).toHaveText('1 из 2');

  await bob.keyboard.press('ArrowRight');
  await expect(gallery.getByRole('status')).toHaveText('2 из 2');

  // Esc закрывает, лента остаётся на месте.
  await bob.keyboard.press('Escape');
  await expect(bob.getByRole('dialog')).toHaveCount(0);
  await expect(bob.getByLabel('Открыть изображение first.png')).toBeVisible();

  await contextA.close();
  await contextB.close();
});
