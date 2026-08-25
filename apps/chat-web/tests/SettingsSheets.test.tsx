import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LIGHT, Sheet } from '@vendor/ui';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';

/** Лист с полем пароля: открывается и закрывается кнопкой. */
function Harness() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Открыть
      </button>
      <Sheet open={open} title="Пароль" theme={LIGHT} onClose={() => setOpen(false)}>
        <label htmlFor="pwd">Новый пароль</label>
        <input id="pwd" type="password" autoComplete="new-password" />
      </Sheet>
    </>
  );
}

describe('Sheet', () => {
  it('keeps the content of a closed sheet out of the DOM', async () => {
    render(<Harness />);

    // Иначе менеджер паролей браузера видит поле пароля на экране настроек
    // и предлагает его заполнить при сохранении почты.
    expect(document.querySelector('input[type="password"]')).toBeNull();

    await userEvent.click(screen.getByRole('button', { name: 'Открыть' }));
    expect(screen.getByLabelText('Новый пароль')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Закрыть' }));
    await new Promise((resolve) => setTimeout(resolve, 500));
    expect(document.querySelector('input[type="password"]')).toBeNull();
  });

  it('hides the chrome of a closed sheet instead of letting it peek out', async () => {
    render(<Harness />);

    // Шапка закрытого листа не должна выглядывать из-под края экрана
    // (в дерево доступности она и так не попадает: aria-hidden).
    expect(screen.getByLabelText('Закрыть', { hidden: true })).not.toBeVisible();

    await userEvent.click(screen.getByRole('button', { name: 'Открыть' }));
    expect(screen.getByRole('button', { name: 'Закрыть' })).toBeVisible();
  });
});
