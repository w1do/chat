// E2E «auth»: вход максимально простой — придумал логин и вошёл (design 1b).
// Запуск: ./tools/chat e2e auth (или ./tools/chat e2e critical).
import { expect, test } from '@playwright/test';

const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`;

test('registers with a login only, keeps the login and logs out', async ({ browser, page }) => {
  const login = `auth${suffix}`;

  await page.goto('/login');
  await page.getByRole('button', { name: 'Регистрация' }).click();
  await page.getByRole('textbox', { name: 'Логин' }).fill(login);
  const password = page.getByRole('textbox', { name: 'Пароль' });
  await password.fill('e2e-password-123');

  // Пароль вводят вслепую, поэтому его можно показать и проверить.
  await expect(password).toHaveAttribute('type', 'password');
  await page.getByRole('button', { name: /Показать пароль/ }).click();
  await expect(password).toHaveAttribute('type', 'text');
  // Нажатие «глазика» не отправляет форму.
  await expect(page.getByRole('button', { name: 'Создать аккаунт' })).toBeVisible();

  await page.getByRole('button', { name: 'Создать аккаунт' }).click();

  await expect(page.getByRole('heading', { name: 'Чаты' })).toBeVisible();

  // Почта не спрашивалась и остаётся необязательной.
  await page.getByRole('button', { name: 'Настройки' }).click();
  await expect(page.getByText('Не указана — нужна для восстановления пароля')).toBeVisible();

  // Вход переживает перезагрузку страницы.
  await page.reload();
  await expect(page.getByRole('button', { name: 'Настройки' })).toBeVisible();

  // Вход держится на токене в localStorage, а не на cookie сессии (ADR-012).
  const token = await page.evaluate(() => localStorage.getItem('chat.auth-token'));
  expect(token).toBeTruthy();

  // Новый контекст браузера с тем же хранилищем — тот же вошедший человек:
  // серверного состояния входа не существует вовсе.
  const restored = await browser.newContext({
    storageState: { cookies: [], origins: [{ origin: new URL(page.url()).origin, localStorage: [{ name: 'chat.auth-token', value: token as string }] }] },
  });
  const restoredPage = await restored.newPage();
  await restoredPage.goto('/');
  await expect(restoredPage.getByRole('button', { name: 'Настройки' })).toBeVisible();
  await restored.close();

  await page.getByRole('button', { name: 'Настройки' }).click();
  await page.getByRole('button', { name: 'Выйти' }).click();
  await expect(page.getByRole('heading', { name: 'Вход' })).toBeVisible();

  // Выход стирает токен: возвращаться некуда даже с прежним хранилищем.
  expect(await page.evaluate(() => localStorage.getItem('chat.auth-token'))).toBeNull();

  // Неверный пароль не пускает и не роняет экран.
  await page.getByRole('textbox', { name: 'Логин' }).fill(login);
  await page.getByRole('textbox', { name: 'Пароль' }).fill('wrong-password');
  await page.getByRole('button', { name: 'Войти' }).click();
  await expect(page.getByRole('alert')).toBeVisible();
});
