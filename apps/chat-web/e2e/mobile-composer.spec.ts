// E2E «mobile-composer»: на телефоне панель ввода и приглашение помещаются в
// экран целиком — и при закрытой клавиатуре, и когда та занимает низ.
// Запуск: ./tools/chat e2e mobile-composer (или ./tools/chat e2e critical).
import { expect, test, type Locator, type Page } from '@playwright/test';

const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`;

/** Узкий телефон: на нём кнопки уезжали за правый край. */
const PHONE = { width: 360, height: 780 };

/**
 * Клавиатура занимает низ экрана. В браузере её нет, но модель поведения та
 * же: с `interactive-widget=resizes-content` странице достаётся меньше высоты.
 */
const PHONE_WITH_KEYBOARD = { width: 360, height: 400 };

test.use({ viewport: PHONE });

async function register(page: Page, name: string): Promise<void> {
  await page.goto('/login');
  await page.getByRole('button', { name: 'Регистрация' }).click();
  await page.getByRole('textbox', { name: 'Логин' }).fill(`${name.toLowerCase()}${suffix}`);
  await page.getByRole('textbox', { name: 'Пароль' }).fill('e2e-password-123');
  await page.getByRole('button', { name: 'Создать аккаунт' }).click();
  await expect(page.getByRole('heading', { name: 'Чаты' })).toBeVisible();
}

/**
 * Элемент целиком в видимой области: ничего не уехало за края экрана.
 * Меряем с повтором — лист выезжает анимацией, а кнопка отправки приезжает
 * справа, и одиночный замер поймал бы их на полпути.
 */
async function expectInsideViewport(page: Page, locator: Locator, what: string): Promise<void> {
  const viewport = page.viewportSize();
  expect(viewport, 'вьюпорт не задан').not.toBeNull();

  await expect
    .poll(
      async () => {
        const box = await locator.boundingBox();
        if (box === null) return 'элемент не отрисован';

        // Округление раскладки даёт доли пикселя — допускаем один.
        const outside: string[] = [];
        if (box.x < -1) outside.push('левый край');
        if (box.x + box.width > viewport!.width + 1) outside.push('правый край');
        if (box.y < -1) outside.push('верх');
        if (box.y + box.height > viewport!.height + 1) outside.push('низ');

        return outside.length === 0
          ? 'в экране'
          : `вышел за ${outside.join(', ')} — x=${Math.round(box.x)} ширина=${Math.round(box.width)} ` +
            `y=${Math.round(box.y)} высота=${Math.round(box.height)} экран=${viewport!.width}×${viewport!.height}`;
      },
      { message: what, timeout: 10_000 },
    )
    .toBe('в экране');
}

/**
 * Ни документ, ни строка ввода не шире экрана.
 *
 * Меряем именно видимую ширину, а не `scrollWidth` строки: за её обрезанным
 * краем намеренно припаркована кнопка отправки, когда отправлять нечего. Она
 * невидима, выключена и недостижима, но в `scrollWidth` попадает — проверять
 * по нему значило бы ловить не ту ошибку. Что кнопки на месте, отдельно
 * проверяет `expectInsideViewport` по каждой из них.
 */
async function expectNoHorizontalScroll(page: Page): Promise<void> {
  const viewport = page.viewportSize();
  expect(viewport, 'вьюпорт не задан').not.toBeNull();

  await expect
    .poll(
      async () =>
        page.evaluate((width: number) => {
          const root = document.documentElement;
          const row = document.querySelector('[data-testid="composer-row"]');
          const document_ = root.scrollWidth - root.clientWidth;

          if (document_ > 1) return `документ прокручивается вбок на ${document_}`;
          if (row && row.getBoundingClientRect().width > width + 1) {
            return `строка ввода шире экрана: ${Math.round(row.getBoundingClientRect().width)}`;
          }

          return 'всё в ширину экрана';
        }, viewport!.width),
      { message: 'ширина по горизонтали', timeout: 10_000 },
    )
    .toBe('всё в ширину экрана');
}

async function createRoom(page: Page, name: string): Promise<void> {
  await page.getByRole('button', { name: 'Новая комната' }).click();
  await page.getByRole('textbox', { name: 'Название' }).fill(name);
  await page.getByRole('button', { name: 'Создать' }).click();
  await expect(page.getByRole('heading', { name })).toBeVisible();
}

test('the composer and its buttons stay on screen on a phone', async ({ page }) => {
  await register(page, 'Mobc');
  await createRoom(page, `E2E Mobile ${suffix}`);

  const composer = page.getByTestId('composer');
  const field = page.getByRole('textbox', { name: 'Сообщение' });

  await expect(composer).toBeVisible();
  await expectInsideViewport(page, composer, 'панель ввода');
  await expectNoHorizontalScroll(page);

  // Длинный черновик отнимает ширину у поля, а не у кнопок.
  const draft = 'длинныйчерновикбезпробелов'.repeat(8);
  await field.fill(draft);

  for (const name of ['Эмодзи', 'Помощник с текстом', 'Отправить']) {
    const button = page.getByRole('button', { name });
    await expect(button, `кнопка «${name}» пропала`).toBeVisible();
    await expectInsideViewport(page, button, `кнопка «${name}»`);
  }
  await expectInsideViewport(page, field, 'поле ввода');
  await expectNoHorizontalScroll(page);

  // Клавиатура заняла низ: панель ввода поднимается вместе с ней.
  await field.focus();
  await page.setViewportSize(PHONE_WITH_KEYBOARD);
  await expect(composer).toBeVisible();
  await expectInsideViewport(page, composer, 'панель ввода с клавиатурой');
  await expectInsideViewport(page, field, 'поле ввода с клавиатурой');
  await expectNoHorizontalScroll(page);

  // Клавиатура убралась — набранное и каретка на месте, панель снова внизу.
  await page.setViewportSize(PHONE);
  await expect(field).toHaveValue(draft);
  await expectInsideViewport(page, composer, 'панель ввода после клавиатуры');

  await field.fill('Влезло в экран');
  await field.press('Enter');
  await expect(page.locator('article', { hasText: 'Влезло в экран' }).first()).toBeVisible({
    timeout: 10_000,
  });
});

test('the invite sheet fits the phone screen and keeps its actions reachable', async ({ page }) => {
  await register(page, 'Mobi');
  await createRoom(page, `E2E MobileInvite ${suffix}`);

  await page.getByRole('button', { name: 'Участники комнаты' }).click();
  await page.getByRole('button', { name: /Пригласить человека/ }).click();

  const dialog = page.getByRole('dialog', { name: 'Пригласить человека' });
  const search = page.getByLabel('Ник человека');
  const done = dialog.getByRole('button', { name: 'Готово' });

  await expect(dialog).toBeVisible();
  await expectInsideViewport(page, dialog, 'лист приглашения');
  await expectInsideViewport(page, search, 'поле поиска');
  await expectInsideViewport(page, done, 'кнопка «Готово»');

  const overflow = await page.evaluate(() => {
    const root = document.documentElement;

    return root.scrollWidth - root.clientWidth;
  });
  expect(overflow, 'документ прокручивается вбок').toBeLessThanOrEqual(1);

  // Клавиатура заняла низ: и поле поиска, и кнопки остаются на виду.
  await search.click();
  await search.fill('никого');
  await page.setViewportSize(PHONE_WITH_KEYBOARD);
  await expectInsideViewport(page, search, 'поле поиска с клавиатурой');
  await expectInsideViewport(page, done, 'кнопка «Готово» с клавиатурой');

  await done.click();
  await expect(dialog).toBeHidden();
});
