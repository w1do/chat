// E2E «auth»: вход максимально простой — придумал логин и вошёл (design 1b).
// Запуск: ./tools/chat e2e auth (или ./tools/chat e2e critical).
import { expect, test } from '@playwright/test';

const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`;

test('registers with a login only, keeps the session and logs out', async ({ page }) => {
  const login = `auth${suffix}`;

  await page.goto('/login');
  await page.getByRole('button', { name: 'Регистрация' }).click();
  await page.getByRole('textbox', { name: 'Логин' }).fill(login);
  await page.getByRole('textbox', { name: 'Пароль' }).fill('e2e-password-123');
  await page.getByRole('button', { name: 'Создать аккаунт' }).click();

  await expect(page.getByRole('heading', { name: 'Чаты' })).toBeVisible();

  // Почта не спрашивалась и остаётся необязательной.
  await page.getByRole('button', { name: 'Настройки' }).click();
  await expect(page.getByText('Не указана — нужна для восстановления пароля')).toBeVisible();

  // Сессия переживает перезагрузку.
  await page.reload();
  await expect(page.getByRole('button', { name: 'Настройки' })).toBeVisible();

  await page.getByRole('button', { name: 'Настройки' }).click();
  await page.getByRole('button', { name: 'Выйти' }).click();
  await expect(page.getByRole('heading', { name: 'Вход' })).toBeVisible();

  // Неверный пароль не пускает и не роняет экран.
  await page.getByRole('textbox', { name: 'Логин' }).fill(login);
  await page.getByRole('textbox', { name: 'Пароль' }).fill('wrong-password');
  await page.getByRole('button', { name: 'Войти' }).click();
  await expect(page.getByRole('alert')).toBeVisible();
});
