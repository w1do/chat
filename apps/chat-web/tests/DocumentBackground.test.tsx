import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DARK, LIGHT, useTheme } from '@vendor/ui';
import { beforeEach, describe, expect, it } from 'vitest';

/**
 * Оболочка стоит `position: fixed` поверх страницы: всё, что она не покрыла,
 * показывает документ. Его фон обязан быть цветом темы, иначе снизу видна
 * посторонняя полоса.
 */
function Screen() {
  const { name, setTheme } = useTheme();

  return (
    <button type="button" onClick={() => setTheme(name === 'dark' ? 'light' : 'dark')}>
      Сменить тему
    </button>
  );
}

describe('фон документа', () => {
  beforeEach(() => {
    localStorage.setItem('chat.theme', 'light');
    document.documentElement.style.removeProperty('--app-bg');
  });

  it('красится цветом темы и меняется вместе с ней', async () => {
    render(<Screen />);

    expect(document.documentElement.style.getPropertyValue('--app-bg')).toBe(LIGHT.bg);

    await userEvent.click(screen.getByRole('button', { name: 'Сменить тему' }));

    expect(document.documentElement.style.getPropertyValue('--app-bg')).toBe(DARK.bg);
  });
});
