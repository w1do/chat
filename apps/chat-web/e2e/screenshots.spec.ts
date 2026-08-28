// Генератор превью функционала для examples/.
// Запуск: тот же контейнер Playwright, что и ./tools/chat e2e, против локального стека.
//
// Логины латиницей (этого требует форма), а имена, названия комнат и вся
// переписка — по-русски: снимки показывают продукт таким, каким его видит человек.
//
// Комната адресуется по URL, а не по названию: одноимённых комнат может быть
// несколько, и «первая подходящая» у разных людей разная.
import { expect, test, type Browser, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';

const PASSWORD = 'demo-password-123';
const SHOTS = '/repo/examples';
const PHONE = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 } as const;
const DESK = { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 } as const;

/** Картинки для превью: не однопиксельные заглушки, иначе плитки и аватарка
 *  выглядят цветными квадратами вместо фотографий. */
const FIXTURES = new URL('./fixtures/', import.meta.url).pathname;

/** Снимок; неудача записывается в лог и не роняет остальные. */
async function shot(page: Page, name: string, prepare?: () => Promise<void>): Promise<void> {
  try {
    if (prepare) await prepare();
    await page.waitForTimeout(800); // переходы пружинные — ждём покоя
    await page.screenshot({ path: `${SHOTS}/${name}.png` });
  } catch (error) {
    console.log(`НЕ СНЯТО ${name}: ${(error as Error).message.split('\n')[0]}`);
  }
}

/** Действие с коротким поводком: не вышло — записали и пошли дальше. */
async function step(name: string, fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
  } catch (error) {
    console.log(`НЕ ВЫШЛО ${name}: ${(error as Error).message.split('\n')[0]}`);
  }
}

/** Регистрация, а если логин занят — обычный вход. */
async function signIn(page: Page, login: string, name: string): Promise<void> {
  await page.goto('/login');
  await page.getByRole('button', { name: 'Регистрация' }).click();
  await page.getByRole('textbox', { name: 'Логин' }).fill(login);
  await page.getByRole('textbox', { name: 'Пароль' }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Создать аккаунт' }).click();

  const rooms = page.getByRole('heading', { name: 'Чаты' });
  const taken = page.getByText('Такой логин уже занят');
  await expect(rooms.or(taken).first()).toBeVisible({ timeout: 20_000 });

  if (await taken.isVisible().catch(() => false)) {
    await page.getByRole('button', { name: 'Вход' }).click();
    await page.getByRole('textbox', { name: 'Логин' }).fill(login);
    await page.getByRole('textbox', { name: 'Пароль' }).fill(PASSWORD);
    await page.getByRole('button', { name: 'Войти' }).click();
    await expect(rooms).toBeVisible({ timeout: 20_000 });

    return;
  }

  // Логин обязан быть латиницей, отображаемое имя — нет.
  await page.getByRole('button', { name: 'Настройки' }).click();
  await page.getByRole('button', { name: new RegExp(login) }).first().click();
  await page.getByRole('textbox', { name: 'Имя' }).fill(name);
  await page.getByRole('button', { name: 'Сохранить' }).click();
  await page.waitForTimeout(700);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Чаты' }).click();
  await expect(rooms).toBeVisible();
}

/** Подсказка о жестах перекрывает ленту — гасим перед съёмкой. */
async function dismissHint(page: Page): Promise<void> {
  const hint = page.getByRole('button', { name: /Потяните сообщение влево/ });
  if (await hint.isVisible().catch(() => false)) await hint.click();
}

/** Комната по названию, а если её нет — создаётся. Возвращает адрес: по нему
 *  в неё войдут остальные, не угадывая «первую подходящую» в своём списке. */
async function createRoom(page: Page, name: string): Promise<string> {
  const existing = page.getByRole('button', { name: new RegExp(name) }).first();

  if (await existing.isVisible().catch(() => false)) {
    await existing.click({ timeout: 15_000 });
    await expect(page.getByRole('heading', { name })).toBeVisible({ timeout: 20_000 });
    await dismissHint(page);

    return page.url();
  }

  await page.getByRole('button', { name: 'Новая комната' }).click();
  await page.getByRole('textbox', { name: 'Название' }).fill(name);
  await page.getByLabel('Видимость').selectOption('private');
  await page.getByRole('button', { name: 'Создать' }).click();
  await expect(page.getByRole('heading', { name })).toBeVisible({ timeout: 20_000 });
  await dismissHint(page);

  return page.url();
}

async function enterRoom(page: Page, url: string, name: string): Promise<void> {
  await page.goto(url);
  await expect(page.getByRole('heading', { name })).toBeVisible({ timeout: 20_000 });
  await dismissHint(page);
  await page.waitForTimeout(900);
}

async function say(page: Page, text: string): Promise<void> {
  const composer = page.getByRole('textbox', { name: 'Сообщение' });
  await composer.fill(text);
  await composer.press('Enter');
  await expect(page.locator('article', { hasText: text }).first()).toBeVisible({ timeout: 20_000 });
}

async function page1(browser: Browser, size = PHONE): Promise<Page> {
  return (await browser.newContext(size)).newPage();
}

test.use(PHONE);
test.describe.configure({ timeout: 9 * 60_000 });

/** Адреса, добытые первым тестом и нужные остальным. */
const rooms: { family?: string; dacha?: string } = {};

/** Комната «Семья»: по добытому адресу, а если теста-сеятеля не было — по названию. */
async function openFamily(page: Page): Promise<void> {
  if (rooms.family) {
    await enterRoom(page, rooms.family, 'Семья');

    return;
  }

  await page.getByRole('button', { name: /Семья/ }).first().click({ timeout: 15_000 });
  await expect(page.getByRole('heading', { name: 'Семья' })).toBeVisible({ timeout: 20_000 });
  await dismissHint(page);
  rooms.family = page.url();
  await page.waitForTimeout(900);
}

test('вход, комната, переписка и действия над сообщением', async ({ browser }) => {
  const marina = await page1(browser);
  const alexey = await page1(browser);

  await marina.goto('/login');
  await shot(marina, '01-vhod');

  await signIn(marina, 'marina', 'Марина');
  await signIn(alexey, 'alexey', 'Алексей');

  rooms.family = await createRoom(marina, 'Семья');

  await step('пригласить Алексея', async () => {
    await marina.getByRole('heading', { name: 'Семья' }).click({ timeout: 15_000 });
    await marina.waitForTimeout(1200);
    await shot(marina, '11-upravlenie-komnatoy');

    // На узком экране панель приглашения спрятана за строкой-открывашкой.
    const row = marina.getByRole('button', { name: 'Пригласить человека' });
    if (await row.isVisible().catch(() => false)) await row.click();
    await marina.getByLabel('Ник человека').fill('@alexey', { timeout: 15_000 });
    await marina.waitForTimeout(2000);
    await shot(marina, '10-priglashenie-po-niku');
    await marina.getByRole('button', { name: /alexey/ }).first().click({ timeout: 15_000 });
    await expect(marina.getByText('Участники · 2')).toBeVisible({ timeout: 15_000 });
  });

  await step('переписка двоих', async () => {
    await enterRoom(marina, rooms.family!, 'Семья');
    await enterRoom(alexey, rooms.family!, 'Семья');
    await say(marina, 'Билеты взяли, выезжаем в семь');
    await say(alexey, 'Отлично, встречу вас на вокзале');
    await say(marina, 'Термос не забудьте, вечером обещают дождь');
    await say(alexey, 'Уже собрал. И плед положил');
    // Лента перечитывается запросом: снимок не зависит от того, успел ли сокет.
    await enterRoom(marina, rooms.family!, 'Семья');
  });

  await shot(marina, '03-perepiska');

  const reply = marina.locator('article', { hasText: 'Отлично, встречу вас на вокзале' }).first();

  await shot(marina, '04-deystviya-nad-soobshcheniem', async () => {
    await reply.click({ button: 'right', timeout: 15_000 });
  });
  await marina.keyboard.press('Escape');
  await marina.waitForTimeout(700);

  await shot(marina, '05-otvet-na-soobshchenie', async () => {
    await reply.click({ button: 'right', timeout: 15_000 });
    await marina.getByRole('button', { name: 'Ответить' }).click();
    await marina.getByRole('textbox', { name: 'Сообщение' }).fill('Спасибо! Тогда до встречи у касс');
  });
  await step('отправить ответ', async () => {
    await marina.getByRole('textbox', { name: 'Сообщение' }).press('Enter');
    await marina.waitForTimeout(1500);
  });

  await shot(marina, '06-reakcii', async () => {
    await marina.locator('article', { hasText: 'Уже собрал. И плед положил' }).first()
      .dblclick({ timeout: 15_000 });
    await marina.waitForTimeout(1500);
  });

  await shot(marina, '07-upominaniya', async () => {
    await marina.getByRole('textbox', { name: 'Сообщение' }).fill('@');
    await marina.waitForTimeout(1200);
  });
});

test('вложения, галерея, участники, поиск, приглашение и помощник', async ({ browser }) => {
  const marina = await page1(browser);
  await signIn(marina, 'marina', 'Марина');
  await openFamily(marina);

  await step('приложить файлы', async () => {
    await marina.locator('[data-testid="attachment-input"]').setInputFiles([
      { name: 'вокзал.png', mimeType: 'image/png', buffer: readFileSync(`${FIXTURES}vokzal.png`) },
      { name: 'маршрут.png', mimeType: 'image/png', buffer: readFileSync(`${FIXTURES}marshrut.png`) },
      { name: 'билеты.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 demo') },
    ]);
    await marina.waitForTimeout(2000);
  });
  await shot(marina, '08-vlozheniya-do-otpravki');

  await step('отправить вложения', async () => {
    await marina.getByRole('button', { name: 'Отправить' }).click({ timeout: 15_000 });
    await marina.waitForTimeout(4000);
  });
  await shot(marina, '09-vlozheniya');

  await shot(marina, '12-galereya', async () => {
    await marina.getByLabel('Открыть изображение вокзал.png').click({ timeout: 15_000 });
    await marina.waitForTimeout(1500);
  });
  await marina.keyboard.press('Escape');
  await marina.waitForTimeout(700);

  await step('вернуться в «Семья»', () => openFamily(marina));
  await shot(marina, '13-uchastniki', async () => {
    await marina.getByRole('button', { name: 'Участники комнаты' }).click({ timeout: 15_000 });
  });
  await marina.keyboard.press('Escape');
  await marina.waitForTimeout(700);

  await step('вернуться в «Семья»', () => openFamily(marina));
  await shot(marina, '14-poisk', async () => {
    await marina.getByRole('button', { name: 'Поиск по переписке' }).click({ timeout: 15_000 });
    await marina.getByLabel('Что ищем').fill('термос');
    await marina.waitForTimeout(2500);
  });
  await marina.keyboard.press('Escape');
  await marina.waitForTimeout(700);

  await step('вернуться в «Семья»', () => openFamily(marina));
  await shot(marina, '15-priglashenie-ssylkoy', async () => {
    await marina.getByRole('button', { name: 'Пригласить' }).click({ timeout: 15_000 });
    await marina.waitForTimeout(1500);
  });

  await step('вернуться в «Семья»', () => openFamily(marina));
  await shot(marina, '16-pomoshchnik', async () => {
    await marina.getByRole('textbox', { name: 'Сообщение' }).fill('завтро поедим на дачю к семи утра');
    await marina.getByRole('button', { name: 'Помощник с текстом' }).click({ timeout: 15_000 });
    await marina.waitForTimeout(2500);
  });
});

test('вторая комната, личный диалог, список и уведомления', async ({ browser }) => {
  const marina = await page1(browser);
  const alexey = await page1(browser);
  await signIn(marina, 'marina', 'Марина');
  await signIn(alexey, 'alexey', 'Алексей');

  await step('вторая комната', async () => {
    rooms.dacha = await createRoom(marina, 'Дача');
    await say(marina, 'Смородину обрезала, малину оставила на выходные');
    await marina.goto('/');
    await marina.waitForTimeout(1200);
  });

  await shot(marina, '17-lichnyy-dialog', async () => {
    await marina.getByRole('button', { name: 'Новый диалог' }).click({ timeout: 15_000 });
    await marina.getByLabel('Ник собеседника').fill('@alexey', { timeout: 15_000 });
    await marina.waitForTimeout(2000);
  });

  await step('личная переписка', async () => {
    await marina.getByRole('button', { name: /alexey/ }).first().click({ timeout: 15_000 });
    await marina.waitForTimeout(1500);
    await dismissHint(marina);
    await say(marina, 'Заберёшь посылку по дороге?');
    await marina.waitForTimeout(800);
  });
  await shot(marina, '18-lichnaya-perepiska');

  await step('упоминание от Алексея', async () => {
    await openFamily(alexey);
    await alexey.getByRole('textbox', { name: 'Сообщение' }).fill('@marina захвати термос, пожалуйста');
    await alexey.waitForTimeout(1200);
    await alexey.keyboard.press('Escape');
    await alexey.getByRole('textbox', { name: 'Сообщение' }).press('Enter');
    await marina.goto('/');
    await marina.waitForTimeout(2500);
  });

  await shot(marina, '02-spisok-perepisok');
  await shot(marina, '19-uvedomleniya', async () => {
    await marina.getByRole('button', { name: /Уведомления/ }).click({ timeout: 15_000 });
    await marina.waitForTimeout(2000);
  });
});

test('настройки и профиль', async ({ browser }) => {
  const marina = await page1(browser);
  await signIn(marina, 'marina', 'Марина');

  await shot(marina, '20-nastroyki', async () => {
    await marina.getByRole('button', { name: 'Настройки' }).click({ timeout: 15_000 });
  });

  await shot(marina, '21-profil', async () => {
    await marina.getByRole('button', { name: /Марина/ }).first().click({ timeout: 15_000 });
    await marina.getByLabel('Файл аватарки').setInputFiles(`${FIXTURES}avatar.png`);
    await marina.waitForTimeout(5000);
  });
  await marina.keyboard.press('Escape');
  await marina.waitForTimeout(800);
});

test('тёмная тема', async ({ browser }) => {
  const marina = await page1(browser);
  await signIn(marina, 'marina', 'Марина');

  await shot(marina, '22-temnaya-tema', async () => {
    await marina.getByRole('button', { name: 'Настройки' }).click({ timeout: 15_000 });
    await marina.getByRole('button', { name: /Тема/ }).first().click({ timeout: 15_000 });
    await marina.waitForTimeout(1000);
    await marina.getByRole('button', { name: 'Тёмная' }).first().click();
    await marina.waitForTimeout(1200);
    await marina.keyboard.press('Escape');
    await marina.waitForTimeout(800);
    await marina.getByRole('button', { name: 'Чаты' }).click();
    await marina.waitForTimeout(1500);
  });
});

test('рабочий стол', async ({ browser }) => {
  const desk = await page1(browser, DESK);
  await signIn(desk, 'marina', 'Марина');
  await step('открыть комнату', () => openFamily(desk));
  await shot(desk, '23-rabochiy-stol');
});
