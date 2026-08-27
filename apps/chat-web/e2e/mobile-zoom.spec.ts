// E2E «mobile-zoom»: на телефоне жест не меняет масштаб приложения, а после
// возврата из фона панель ввода остаётся у нижнего края.
// Запуск: ./tools/chat e2e mobile-zoom (или ./tools/chat e2e critical).
import { expect, test, type Page } from '@playwright/test';

const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`;

/** Телефон с касаниями: без них двойной тап не отличить от двойного клика. */
const PHONE = { width: 360, height: 780 };

test.use({ viewport: PHONE, hasTouch: true, isMobile: true });

async function register(page: Page, name: string): Promise<void> {
  await page.goto('/login');
  await page.getByRole('button', { name: 'Регистрация' }).click();
  await page.getByRole('textbox', { name: 'Логин' }).fill(`${name.toLowerCase()}${suffix}`);
  await page.getByRole('textbox', { name: 'Пароль' }).fill('e2e-password-123');
  await page.getByRole('button', { name: 'Создать аккаунт' }).click();
  await expect(page.getByRole('heading', { name: 'Чаты' })).toBeVisible();
}

async function createRoom(page: Page, name: string): Promise<void> {
  await page.getByRole('button', { name: 'Новая комната' }).click();
  await page.getByRole('textbox', { name: 'Название' }).fill(name);
  await page.getByRole('button', { name: 'Создать' }).click();
  await expect(page.getByRole('heading', { name })).toBeVisible();
}

/** Два быстрых касания в одной точке — тот самый жест, что увеличивал страницу. */
async function doubleTap(page: Page, x: number, y: number): Promise<void> {
  await page.touchscreen.tap(x, y);
  await page.touchscreen.tap(x, y);
}

/** Масштаб страницы: `1` — жест ничего не изменил. */
async function scale(page: Page): Promise<number> {
  return page.evaluate(() => window.visualViewport?.scale ?? 1);
}

/**
 * Панель ввода стоит у нижнего края экрана. Меряем с повтором: раскладка
 * приезжает анимацией, и одиночный замер поймал бы её на полпути.
 */
async function expectPinnedToBottom(page: Page, what: string): Promise<void> {
  const viewport = page.viewportSize();
  expect(viewport, 'вьюпорт не задан').not.toBeNull();

  await expect
    .poll(
      async () => {
        const box = await page.getByTestId('composer').boundingBox();
        if (box === null) return 'панель ввода не отрисована';

        // Округление раскладки даёт доли пикселя — допускаем один.
        const gap = viewport!.height - (box.y + box.height);

        return Math.abs(gap) <= 1 ? 'у нижнего края' : `под панелью полоса в ${Math.round(gap)}`;
      },
      { message: what, timeout: 10_000 },
    )
    .toBe('у нижнего края');
}

test('a double tap on the feed does not zoom the app', async ({ page }) => {
  await register(page, 'Mobz');
  await createRoom(page, `E2E Zoom ${suffix}`);

  await page.getByRole('textbox', { name: 'Сообщение' }).fill('Первое сообщение');
  await page.getByRole('textbox', { name: 'Сообщение' }).press('Enter');
  const message = page.locator('article', { hasText: 'Первое сообщение' }).first();
  await expect(message).toBeVisible({ timeout: 10_000 });

  expect(await scale(page), 'страница увеличена ещё до жеста').toBe(1);

  // Двойное касание по сообщению и по пустому месту ленты. Касаемся точки
  // напрямую: `locator.tap()` перед каждым касанием заново проверяет
  // достижимость и не укладывается в окно двойного нажатия.
  const bubble = await message.boundingBox();
  expect(bubble, 'сообщение не отрисовано').not.toBeNull();
  await doubleTap(page, bubble!.x + bubble!.width / 2, bubble!.y + bubble!.height / 2);

  const feed = await page.locator('.scroll-area').first().boundingBox();
  expect(feed, 'лента не отрисована').not.toBeNull();
  // Верх ленты: одно сообщение лежит у нижнего края, выше — пустое место.
  await doubleTap(page, feed!.x + feed!.width / 2, feed!.y + 24);

  expect(await scale(page), 'двойной тап увеличил приложение').toBe(1);
  await expectPinnedToBottom(page, 'панель ввода после двойного тапа');
});

test('the composer stays at the bottom after the page returns from the background', async ({ page, context }) => {
  await register(page, 'Mobr');
  await createRoom(page, `E2E Resume ${suffix}`);

  await expectPinnedToBottom(page, 'панель ввода до сворачивания');

  // Уходим на другую вкладку: страница получает настоящий visibilitychange,
  // а не подделанное событие.
  await page.getByRole('textbox', { name: 'Сообщение' }).focus();
  const other = await context.newPage();
  await other.goto('/login');
  await expect(page).toHaveTitle(/./);

  // Возвращаемся: геометрия перемеряется сама, без прокрутки и перезагрузки.
  await other.close();
  await page.bringToFront();

  await expectPinnedToBottom(page, 'панель ввода после возврата из фона');
  expect(await scale(page), 'масштаб изменился сам собой').toBe(1);
});
