// E2E «direct-messages»: двое находят друг друга по нику, переписываются в
// реальном времени, один скрывает диалог и получает его обратно с новым
// сообщением. Запуск: ./tools/chat e2e direct-messages.
import { expect, test, type Page } from '@playwright/test';

const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`;

test.setTimeout(180_000);

const login = (name: string): string => `${name.toLowerCase()}${suffix}`;

async function register(page: Page, name: string): Promise<void> {
  await page.goto('/login');
  await page.getByRole('button', { name: 'Регистрация' }).click();
  await page.getByRole('textbox', { name: 'Логин' }).fill(login(name));
  await page.getByRole('textbox', { name: 'Пароль' }).fill('e2e-password-123');
  await page.getByRole('button', { name: 'Создать аккаунт' }).click();
  await expect(page.getByRole('heading', { name: 'Чаты' })).toBeVisible();
}

test('two people talk privately, hide the dialog and get it back', async ({ browser }) => {
  const aliceContext = await browser.newContext();
  const bobContext = await browser.newContext();
  const alice = await aliceContext.newPage();
  const bob = await bobContext.newPage();

  await register(alice, 'Alice');
  await register(bob, 'Bob');

  // Диалог начинается по нику: тот же поиск, что и у приглашений в комнату.
  await alice.getByRole('button', { name: 'Новый диалог' }).click();
  await alice.getByLabel('Ник собеседника').fill(`@${login('Bob')}`);
  const candidate = alice.getByRole('button', { name: new RegExp(login('Bob')) });
  await expect(candidate).toBeVisible({ timeout: 15_000 });
  await candidate.click();

  // Шапка диалога подписана ником собеседника (дальше в подписи — его
  // присутствие), комнатных действий в ней нет.
  await expect(alice.locator('header').getByText(`@${login('Bob')} ·`)).toBeVisible({
    timeout: 15_000,
  });
  await expect(alice.getByRole('button', { name: 'Пригласить' })).toHaveCount(0);

  await alice.getByRole('textbox', { name: 'Сообщение' }).fill('Привет, это лично');
  await alice.getByRole('textbox', { name: 'Сообщение' }).press('Enter');

  // Бобу диалог приходит сам: в списке он подписан именем отправителя.
  const dialogInList = bob.getByRole('button', { name: new RegExp(login('Alice')) });
  await expect(dialogInList).toBeVisible({ timeout: 45_000 });
  await dialogInList.click();
  await expect(bob.locator('article', { hasText: 'Привет, это лично' }).first()).toBeVisible({
    timeout: 15_000,
  });

  // Ответ доходит в реальном времени, без перезагрузки страницы.
  await bob.getByRole('textbox', { name: 'Сообщение' }).fill('Привет, слышу тебя');
  await bob.getByRole('textbox', { name: 'Сообщение' }).press('Enter');
  await expect(alice.locator('article', { hasText: 'Привет, слышу тебя' }).first()).toBeVisible({
    timeout: 20_000,
  });

  // Боб скрывает диалог: одно подтверждение, и переписки в списке нет.
  await bob.getByRole('button', { name: 'Скрыть диалог' }).click();
  const confirm = bob.getByRole('alertdialog', { name: 'Скрыть диалог из списка?' });
  await expect(confirm).toBeVisible();
  await confirm.getByRole('button', { name: 'Скрыть' }).click();

  await expect(bob.getByRole('heading', { name: 'Чаты' })).toBeVisible({ timeout: 15_000 });
  await expect(bob.getByRole('button', { name: new RegExp(login('Alice')) })).toHaveCount(0);

  // Новое сообщение возвращает диалог вместе с прежней историей.
  await alice.getByRole('textbox', { name: 'Сообщение' }).fill('Ты ещё тут?');
  await alice.getByRole('textbox', { name: 'Сообщение' }).press('Enter');

  const returned = bob.getByRole('button', { name: new RegExp(login('Alice')) });
  await expect(returned).toBeVisible({ timeout: 45_000 });
  await returned.click();
  await expect(bob.locator('article', { hasText: 'Ты ещё тут?' }).first()).toBeVisible({ timeout: 15_000 });
  // Переписка не удалялась: первые сообщения на месте.
  await expect(bob.locator('article', { hasText: 'Привет, это лично' }).first()).toBeVisible();

  await aliceContext.close();
  await bobContext.close();
});
