import '@testing-library/jest-dom/vitest';

/**
 * Защищённые картинки грузятся авторизованным `fetch` и показываются из
 * `blob:`-адреса (ADR-012): jsdom не умеет ни того, ни другого. По умолчанию
 * любой запрос отдаёт картинку — тесту, которому нужен отказ, достаточно
 * подменить `fetch` своим.
 */
let objectUrls = 0;
URL.createObjectURL ??= () => `blob:test/${(objectUrls += 1)}`;
URL.revokeObjectURL ??= () => {};
globalThis.fetch = (async () => new Response(new Blob(['image'], { type: 'image/png' }))) as typeof fetch;
