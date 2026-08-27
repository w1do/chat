// E2E «ai-file-summary»: ответ с «@ai» на сообщение с документом даёт черновик
// пересказа, который попадает в комнату только по подтверждению.
// Помощник по умолчанию выключен, поэтому сценарий проверяет документированное
// поведение выключенного помощника; при AI_ENABLED=true и E2E_AI_ENABLED=true —
// весь путь целиком.
// Запуск: ./tools/chat e2e ai-file-summary (или ./tools/chat e2e critical).
import { expect, test, type Page } from '@playwright/test';

const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
const aiEnabled = process.env.E2E_AI_ENABLED === 'true';

// Настоящий документ, а не заглушка: сервер проверяет содержимое файла.
const CONTRACT_TXT = Buffer.from(
  'Договор аренды помещения. Срок — один год с 1 сентября. '.repeat(30) +
    'Оплата — ежемесячно до 5 числа. Расторжение — с уведомлением за 30 дней.',
  'utf8',
);

async function register(page: Page, name: string): Promise<void> {
  await page.goto('/login');
  await page.getByRole('button', { name: 'Регистрация' }).click();
  await page.getByRole('textbox', { name: 'Логин' }).fill(`${name.toLowerCase()}${suffix}`);
  await page.getByRole('textbox', { name: 'Пароль' }).fill('e2e-password-123');
  await page.getByRole('button', { name: 'Создать аккаунт' }).click();
  await expect(page.getByRole('heading', { name: 'Чаты' })).toBeVisible();
}

/** Свайп влево по пузырю — начало ответа на это сообщение. */
async function startReply(page: Page, bubble: ReturnType<Page['locator']>): Promise<void> {
  const box = await bubble.boundingBox();
  if (box === null) throw new Error('Не найден пузырь сообщения');

  const y = box.y + box.height / 2;
  await page.mouse.move(box.x + box.width - 12, y);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width - 60, y, { steps: 4 });
  await page.mouse.move(box.x + box.width - 110, y, { steps: 4 });
  await page.mouse.up();
}

test('the assistant summarizes a replied document and publishes only on confirmation', async ({ browser }) => {
  const contextA = await browser.newContext();
  const contextB = await browser.newContext();
  const alice = await contextA.newPage();
  const bob = await contextB.newPage();

  await register(alice, 'Sumalice');
  await register(bob, 'Sumbob');

  const roomName = `E2E Summary ${suffix}`;
  await alice.getByRole('button', { name: 'Новая комната' }).click();
  await alice.getByRole('textbox', { name: 'Название' }).fill(roomName);
  await alice.getByRole('button', { name: 'Создать' }).click();
  await expect(alice.getByRole('heading', { name: roomName })).toBeVisible();

  await bob.reload();
  await bob.getByRole('button', { name: new RegExp(roomName) }).click({ timeout: 20_000 });
  await bob.getByRole('button', { name: 'Вступить в комнату' }).click();
  await expect(bob.getByRole('textbox', { name: 'Сообщение' })).toBeVisible();

  // Alice присылает договор.
  await alice.locator('[data-testid="attachment-input"]').setInputFiles([
    { name: 'dogovor.txt', mimeType: 'text/plain', buffer: CONTRACT_TXT },
  ]);
  await alice.getByRole('textbox', { name: 'Сообщение' }).fill('Посмотрите договор');
  await expect(alice.getByRole('button', { name: 'Отправить' })).toBeEnabled({ timeout: 20_000 });
  await alice.getByRole('button', { name: 'Отправить' }).click();

  // Документ дошёл до Bob живьём.
  await expect(bob.getByLabel('Скачать dogovor.txt')).toBeVisible({ timeout: 20_000 });

  // Bob отвечает на сообщение с документом.
  const bubble = bob.locator('article', { hasText: 'Посмотрите договор' }).first();
  await startReply(bob, bubble);
  await expect(bob.getByLabel('Ответ на сообщение')).toBeVisible();

  const composer = bob.getByRole('textbox', { name: 'Сообщение' });
  const hint = bob.getByTestId('summary-hint');
  // Лист помощника — модальное окно: ищем его кнопки внутри него, иначе
  // «Понятно» совпадёт с подсказкой про жесты в ленте.
  const sheet = bob.getByRole('dialog');

  if (!(await hint.isVisible())) {
    // Помощник выключен администратором: подсказки нет, ответ уходит обычным
    // сообщением — это и есть документированное поведение.
    await composer.fill('@ai что тут написано');
    await bob.getByRole('button', { name: 'Отправить' }).click();

    await expect(bob.locator('article', { hasText: '@ai что тут написано' }).first()).toBeVisible({ timeout: 10_000 });
    await expect(alice.locator('article', { hasText: '@ai что тут написано' }).first()).toBeVisible({ timeout: 20_000 });

    await contextA.close();
    await contextB.close();

    return;
  }

  await expect(hint).toContainText('dogovor.txt');

  await composer.fill('@ai что тут написано');
  await expect(hint).toContainText('перескажет');
  await bob.getByRole('button', { name: 'Отправить' }).click();

  // Просьба к помощнику не стала сообщением комнаты.
  await expect(bob.locator('article', { hasText: '@ai что тут написано' })).toHaveCount(0);

  if (!aiEnabled) {
    // Ключа поставщика нет: отказ объясняется словами, переписка работает.
    await expect(sheet.getByRole('alert')).toBeVisible({ timeout: 60_000 });
    await sheet.getByRole('button', { name: 'Понятно' }).click();

    await composer.fill('Спасибо, посмотрю сам');
    await bob.getByRole('button', { name: 'Отправить' }).click();
    await expect(bob.locator('article', { hasText: 'Спасибо, посмотрю сам' }).first()).toBeVisible({ timeout: 10_000 });

    await contextA.close();
    await contextB.close();

    return;
  }

  // Пересказ готовится, затем показывается черновиком — и только Bob.
  const draft = bob.getByTestId('file-summary-draft');
  await expect(draft).toBeVisible({ timeout: 120_000 });
  await expect(sheet.getByText('Отправить пересказ в чат?')).toBeVisible();

  const summary = ((await draft.textContent()) ?? '').trim();
  expect(summary.length).toBeGreaterThanOrEqual(500);
  expect(summary.length).toBeLessThanOrEqual(800);

  // Пока не подтвердили — комната пересказа не видит.
  await expect(alice.locator('article', { hasText: summary.slice(0, 40) })).toHaveCount(0);

  await sheet.getByRole('button', { name: 'Отправить' }).click();

  // После подтверждения пересказ — обычное сообщение Bob'а, видное обоим.
  await expect(bob.locator('article', { hasText: 'Вот что:' }).first()).toBeVisible({ timeout: 20_000 });
  await expect(alice.locator('article', { hasText: 'Вот что:' }).first()).toBeVisible({ timeout: 20_000 });

  await contextA.close();
  await contextB.close();
});
