import { expect, Page, Route, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Smoke презентационного лендинга `demo.html`.
 *
 * Стек чата не нужен: страница отдаётся из файла перехватом маршрута, поэтому
 * тест заодно доказывает, что документ самодостаточен. Разрешены только
 * закреплённые анимационные ресурсы; всё остальное — ошибка.
 */

declare global {
  interface Window {
    ScrollTrigger?: { getAll: () => unknown[] };
    DEMO_CTA_LINKS?: { developerContact: string; communityGroup: string };
  }
}

const DEMO_ORIGIN = 'https://demo.local';
const DEMO_URL = `${DEMO_ORIGIN}/demo.html`;
const DEMO_HTML = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), '../../../demo.html'),
  'utf8',
);

const ALLOWED_EXTERNAL = [
  'https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js',
  'https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/ScrollTrigger.min.js',
  'https://cdn.jsdelivr.net/npm/motion@11.11.17/dist/motion.js',
];

const SECTION_IDS = [
  'hero',
  'ownership',
  'interface',
  'rooms',
  'messages',
  'realtime',
  'invites',
  'media',
  'notifications',
  'search',
  'ai',
  'control',
  'architecture',
  'install',
  'cta',
];

const INSTALL_COMMAND = [
  'git clone https://github.com/w1do/chat.git && cd chat',
  'docker compose -f docker-compose.yml -f docker-compose.standalone.yml up -d --build',
].join('\n');

type Options = { allowExternal?: boolean };

async function serveDemo(page: Page, options: Options = {}): Promise<string[]> {
  const unexpected: string[] = [];

  await page.route('**/*', async (route: Route) => {
    const url = route.request().url();

    if (url === DEMO_URL) {
      await route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: DEMO_HTML });

      return;
    }

    if (ALLOWED_EXTERNAL.includes(url)) {
      if (options.allowExternal) {
        await route.continue();
      } else {
        await route.abort('failed');
      }

      return;
    }

    unexpected.push(url);
    await route.abort('failed');
  });

  return unexpected;
}

test.describe('demo.html', () => {
  test('рассказывает продукт пятнадцатью секциями с уникальными якорями', async ({ page }) => {
    const unexpected = await serveDemo(page, { allowExternal: true });
    await page.goto(DEMO_URL);

    const ids = await page.locator('main section').evaluateAll((nodes) => nodes.map((node) => node.id));
    expect(ids).toEqual(SECTION_IDS);
    expect(new Set(ids).size).toBe(ids.length);

    await expect(page.locator('a.skip-link')).toHaveAttribute('href', '#hero');
    await expect(page.getByRole('banner')).toBeVisible();
    await expect(page.getByRole('main')).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Разделы презентации' })).toBeVisible();
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    const anchors = await page
      .locator('a[href^="#"]')
      .evaluateAll((nodes) => nodes.map((node) => node.getAttribute('href')!.slice(1)).filter(Boolean));

    for (const anchor of new Set(anchors)) {
      await expect(page.locator(`#${anchor}`)).toHaveCount(1);
    }

    expect(unexpected).toEqual([]);
  });

  test('регистрирует уникальную локальную сцену для каждого раздела', async ({ page }) => {
    await serveDemo(page);
    await page.goto(DEMO_URL);

    const effects = await page.locator('main section').evaluateAll((nodes) =>
      nodes.map((node) => ({ effect: node.dataset.sceneEffect, state: node.dataset.sceneState })),
    );
    expect(effects).toHaveLength(SECTION_IDS.length);
    expect(new Set(effects.map(({ effect }) => effect)).size).toBe(SECTION_IDS.length);
    expect(effects.every(({ state }) => state === 'idle' || state === 'running' || state === 'complete')).toBe(true);

    await expect(page.locator('#hero [data-sequence="typing"]')).toHaveText('Марина печатает…');
    // Реплик в сцене три — доехать должна каждая, иначе локатор неоднозначен.
    const heroMessages = page.locator('#hero [data-sequence="message"]');
    await expect(heroMessages).toHaveCount(3);
    for (const index of [0, 1, 2]) {
      await expect(heroMessages.nth(index)).toHaveAttribute('data-sequence-state', 'arrived');
    }
    await expect(page.locator('#hero .reaction')).toHaveAttribute('data-reaction-state', 'set');
  });

  test('проигрывает переписку в семье в порядке Марина, я, Тимур', async ({ page }) => {
    await serveDemo(page);
    await page.goto(DEMO_URL);

    const messages = page.locator('#messages [data-sequence="message"]');
    await expect(messages).toHaveCount(3);
    expect(await messages.evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-message-author'))))
      .toEqual(['Марина', 'Я', 'Тимур']);

    await page.locator('#messages').scrollIntoViewIfNeeded();
    await expect(page.locator('#messages [data-sequence="typing"]')).toHaveText('Марина печатает…');
    await expect(messages.nth(0)).toHaveAttribute('data-sequence-state', 'arrived');
    await expect(page.locator('#messages [data-sequence="typing"]')).toHaveText('Вы печатаете…');
    await expect(messages.nth(1)).toHaveAttribute('data-sequence-state', 'arrived');
    await expect(page.locator('#messages [data-sequence="typing"]')).toHaveText('Тимур печатает…');
    await expect(messages.nth(2)).toHaveAttribute('data-sequence-state', 'arrived');
    // Реакций в сцене две — проверяем обе, иначе локатор неоднозначен.
    const reactions = page.locator('#messages .reaction');
    await expect(reactions).toHaveCount(2);
    await expect(reactions.nth(0)).toHaveAttribute('data-reaction-state', 'set');
    await expect(reactions.nth(1)).toHaveAttribute('data-reaction-state', 'set');
  });

  test('переиспользует ограниченный декоративный ambient-пул', async ({ page }) => {
    await serveDemo(page);
    await page.goto(DEMO_URL);

    const layer = page.locator('#ambient-layer');
    await expect(layer).toHaveAttribute('aria-hidden', 'true');
    await expect(layer.locator('[data-ambient-slot]')).toHaveCount(6);
    await page.waitForTimeout(5000);
    await expect(layer.locator('[data-ambient-slot]')).toHaveCount(6);
  });

  test('копирует ровно документированную команду установки', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: DEMO_ORIGIN });
    await serveDemo(page, { allowExternal: true });
    await page.goto(DEMO_URL);

    await expect(page.locator('#install-command')).toHaveText(INSTALL_COMMAND);

    await page.getByRole('button', { name: 'Скопировать команду' }).click();
    await expect(page.locator('#copy-status')).not.toBeEmpty();

    const clipboard = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboard).toBe(INSTALL_COMMAND);
  });

  test('копирование доступно с клавиатуры и сообщает результат', async ({ page }) => {
    await serveDemo(page, { allowExternal: true });
    await page.goto(DEMO_URL);

    const button = page.getByRole('button', { name: 'Скопировать команду' });
    await button.focus();
    await page.keyboard.press('Enter');

    await expect(page.locator('#copy-status')).not.toBeEmpty();
  });

  test('показывает русский терминал и безопасно блокирует placeholder CTA', async ({ page }) => {
    await serveDemo(page);
    await page.goto(DEMO_URL);

    await expect(page.locator('#install-output')).toContainText('Применяем миграции');

    // Ссылка разработчика настроена (w1do.ru) и ведёт наружу как обычная внешняя.
    const contact = page.getByRole('link', { name: 'Связаться с разработчиком' });
    await expect(contact).toHaveAttribute('href', 'https://w1do.ru');
    await expect(contact).toHaveAttribute('rel', 'noopener noreferrer');

    // Ненастроенная остаётся безопасной заглушкой.
    const community = page.getByRole('link', { name: 'Вступить в группу' });
    await expect(community).toHaveAttribute('aria-disabled', 'true');
    // `aria-disabled` — обещание для вспомогательных технологий, а не блокировка:
    // мышью по ссылке кликнуть можно, и обработчик обязан погасить переход.
    // Playwright по умолчанию такой элемент кликать отказывается, поэтому force.
    await community.click({ force: true });
    await expect(page.locator('#cta-status')).toHaveText('Ссылка ещё не настроена владельцем');
    expect(page.url()).toBe(DEMO_URL);
  });

  test('настраивает обе HTTPS CTA как безопасные внешние ссылки', async ({ page }) => {
    await page.addInitScript(() => {
      window.DEMO_CTA_LINKS = {
        developerContact: 'https://contact.example/developer',
        communityGroup: 'https://community.example/group',
      };
    });
    await serveDemo(page);
    await page.goto(DEMO_URL);

    for (const link of [
      page.getByRole('link', { name: 'Связаться с разработчиком' }),
      page.getByRole('link', { name: 'Вступить в группу' }),
    ]) {
      await expect(link).toHaveAttribute('target', '_blank');
      await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
      await expect(link).not.toHaveAttribute('aria-disabled', 'true');
    }
  });

  test('не переполняется по горизонтали на записи и на телефоне', async ({ page }) => {
    await serveDemo(page, { allowExternal: true });

    for (const viewport of [
      { width: 1440, height: 900 },
      { width: 390, height: 844 },
      { width: 360, height: 800 },
    ]) {
      await page.setViewportSize(viewport);
      await page.goto(DEMO_URL);
      await page.waitForTimeout(300);

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, `viewport ${viewport.width}`).toBeLessThanOrEqual(1);
    }
  });

  test('остаётся статичной и читаемой без анимационных библиотек', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));

    const unexpected = await serveDemo(page);
    await page.goto(DEMO_URL);

    await expect(page.locator('#install-command')).toHaveText(INSTALL_COMMAND);

    for (const id of SECTION_IDS) {
      await expect(page.locator(`#${id} h1, #${id} h2`)).toBeVisible();
    }

    expect(errors).toEqual([]);
    expect(unexpected).toEqual([]);
  });

  test('уважает prefers-reduced-motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await serveDemo(page, { allowExternal: true });
    await page.goto(DEMO_URL);

    await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduced');

    const scrollTriggers = await page.evaluate(() =>
      window.ScrollTrigger ? window.ScrollTrigger.getAll().length : 0,
    );
    expect(scrollTriggers).toBe(0);

    await expect(page.locator('#cta h2')).toBeVisible();
    await expect(page.locator('#install-command')).toHaveText(INSTALL_COMMAND);
    await expect(page.locator('main section[data-scene-state="complete"]')).toHaveCount(SECTION_IDS.length);
    await expect(page.locator('#ambient-layer [data-ambient-slot]')).toHaveCount(0);
    await expect(page.locator('#install-output')).toContainText('Готовность: успешно');
  });

  test('без JavaScript сохраняет содержание и команду', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    const unexpected = await serveDemo(page);

    await page.goto(DEMO_URL);

    await expect(page.locator('main section')).toHaveCount(SECTION_IDS.length);
    await expect(page.locator('#install-command')).toHaveText(INSTALL_COMMAND);
    await expect(page.locator('#cta h2')).toBeVisible();

    expect(unexpected).toEqual([]);
    await context.close();
  });

  test('не обращается к API чата, WebSocket и аналитике', async ({ page }) => {
    const requests: string[] = [];
    page.on('request', (request) => requests.push(request.url()));
    page.on('websocket', (socket) => requests.push(socket.url()));

    const unexpected = await serveDemo(page, { allowExternal: true });
    await page.goto(DEMO_URL);

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.getByRole('button', { name: 'Скопировать команду' }).click();
    await page.waitForTimeout(500);

    expect(unexpected).toEqual([]);

    for (const url of requests) {
      expect(url === DEMO_URL || ALLOWED_EXTERNAL.includes(url), `неожиданный запрос: ${url}`).toBe(true);
    }

    expect(requests.some((url) => url.startsWith('ws'))).toBe(false);
  });
});
