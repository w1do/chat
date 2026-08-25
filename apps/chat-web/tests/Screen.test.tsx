import { render, screen } from '@testing-library/react';
import { LIGHT, Screen } from '@vendor/ui';
import { describe, expect, it } from 'vitest';

describe('Screen', () => {
  it('держит одну прокручиваемую область, а края — вне её', () => {
    const { container } = render(
      <Screen
        theme={LIGHT}
        header={<header>Шапка</header>}
        footer={<footer>Панель ввода</footer>}
      >
        <p>Содержимое</p>
      </Screen>,
    );

    const scrollAreas = container.querySelectorAll('.scroll-area');
    expect(scrollAreas).toHaveLength(1);

    const area = scrollAreas[0]!;
    expect(area).toContainElement(screen.getByText('Содержимое'));
    expect(area).not.toContainElement(screen.getByText('Шапка'));
    expect(area).not.toContainElement(screen.getByText('Панель ввода'));
  });

  it('строит три строки: края фиксированы, середина забирает остаток', () => {
    const { container } = render(
      <Screen theme={LIGHT} header={<header>Шапка</header>}>
        <p>Содержимое</p>
      </Screen>,
    );

    const root = container.firstElementChild as HTMLElement;
    // minmax(0, 1fr) — то, что не даёт середине распирать экран.
    expect(root.style.gridTemplateRows).toBe('auto minmax(0, 1fr) auto');
    expect(root.style.overflow).toBe('hidden');
  });

  it('работает без низа: слот остаётся пустым', () => {
    const { container } = render(
      <Screen theme={LIGHT}>
        <p>Только содержимое</p>
      </Screen>,
    );

    const root = container.firstElementChild as HTMLElement;
    expect(root.children).toHaveLength(3);
    expect(root.lastElementChild?.textContent).toBe('');
  });
});
