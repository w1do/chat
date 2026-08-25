import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LIGHT } from '@vendor/ui';
import { describe, expect, it, vi } from 'vitest';
import { Field } from '../src/components/Field';
import { LoginForm } from '../src/components/LoginForm';
import { PasswordForm } from '../src/components/PasswordForm';
import { RegisterForm } from '../src/components/RegisterForm';

/** Ошибка API в том же виде, в каком её отдаёт клиент. */
function validationError(field: string, message: string) {
  return { status: 422, code: 'validation_failed', details: { errors: { [field]: [message] } } };
}

const eye = (name: RegExp) => screen.getByRole('button', { name });

describe('переключатель показа пароля', () => {
  it('по умолчанию пароль скрыт, а по нажатию виден', async () => {
    render(<LoginForm theme={LIGHT} onSubmit={vi.fn()} />);
    const input = screen.getByLabelText('Пароль');

    expect(input).toHaveAttribute('type', 'password');

    await userEvent.click(eye(/Показать пароль/));
    expect(input).toHaveAttribute('type', 'text');

    await userEvent.click(eye(/Показать пароль/));
    expect(input).toHaveAttribute('type', 'password');
  });

  it('переключение не затирается пропом type самой формы', async () => {
    // Ловушка спреда: формы передают type="password", и он идёт в тех же
    // inputProps. Если поставить вычисленный тип до спреда, кнопка мертва.
    render(<LoginForm theme={LIGHT} onSubmit={vi.fn()} />);

    await userEvent.click(eye(/Показать пароль/));

    expect(screen.getByLabelText('Пароль')).toHaveAttribute('type', 'text');
  });

  it('объявляет состояние и не отправляет форму', async () => {
    const onSubmit = vi.fn();
    render(<LoginForm theme={LIGHT} onSubmit={onSubmit} />);

    const button = eye(/Показать пароль/);
    expect(button).toHaveAttribute('type', 'button');
    expect(button).toHaveAttribute('aria-pressed', 'false');

    await userEvent.click(button);

    expect(eye(/Показать пароль/)).toHaveAttribute('aria-pressed', 'true');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('в форме с двумя паролями кнопки различимы и действуют по отдельности', async () => {
    render(<PasswordForm theme={LIGHT} passwordMinLength={1} onSubmit={vi.fn()} />);

    await userEvent.click(eye(/Показать пароль: Новый пароль/));

    expect(screen.getByLabelText('Новый пароль')).toHaveAttribute('type', 'text');
    // Соседнее поле пароля остаётся скрытым.
    expect(screen.getByLabelText('Текущий пароль')).toHaveAttribute('type', 'password');
  });

  it('есть во всех формах с паролем', async () => {
    const { unmount } = render(<RegisterForm theme={LIGHT} passwordMinLength={1} onSubmit={vi.fn()} />);
    expect(eye(/Показать пароль: Пароль/)).toBeInTheDocument();
    unmount();

    render(<PasswordForm theme={LIGHT} passwordMinLength={1} onSubmit={vi.fn()} />);
    expect(eye(/Показать пароль: Текущий пароль/)).toBeInTheDocument();
    expect(eye(/Показать пароль: Новый пароль/)).toBeInTheDocument();
  });

  it('новая форма открывается со скрытым паролем', async () => {
    const { unmount } = render(<LoginForm theme={LIGHT} onSubmit={vi.fn()} />);
    await userEvent.click(eye(/Показать пароль/));
    expect(screen.getByLabelText('Пароль')).toHaveAttribute('type', 'text');
    unmount();

    // Состояние живёт в поле и умирает вместе с ним: следующая форма скрыта.
    render(<LoginForm theme={LIGHT} onSubmit={vi.fn()} />);
    expect(screen.getByLabelText('Пароль')).toHaveAttribute('type', 'password');
  });
});

describe('показ не мешает вводу', () => {
  it('не отбирает фокус у поля: гасит mousedown', async () => {
    render(<LoginForm theme={LIGHT} onSubmit={vi.fn()} />);
    const input = screen.getByLabelText('Пароль');
    await userEvent.type(input, 'secret');

    // Слушаем на document: React вешает свои обработчики на корень, поэтому
    // на самой кнопке отмена ещё не видна.
    const prevented = await new Promise<boolean>((resolve) => {
      document.addEventListener('mousedown', (event) => resolve(event.defaultPrevented), { once: true });
      void userEvent.click(eye(/Показать пароль/));
    });

    // Именно отмена mousedown, а не программный возврат фокуса: на iOS только
    // она удерживает клавиатуру открытой.
    expect(prevented).toBe(true);
    expect(document.activeElement).toBe(input);
  });

  it('сохраняет значение и восстанавливает позицию курсора', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<LoginForm theme={LIGHT} onSubmit={onSubmit} />);

    const input = screen.getByLabelText('Пароль') as HTMLInputElement;
    await userEvent.type(screen.getByLabelText('Логин'), 'alice');
    await userEvent.type(input, 'secret123');
    input.setSelectionRange(3, 3);

    const setSelectionRange = vi.spyOn(input, 'setSelectionRange');
    await userEvent.click(eye(/Показать пароль/));

    // jsdom каретку не роняет, поэтому проверяем сам механизм.
    await waitFor(() => expect(setSelectionRange).toHaveBeenCalledWith(3, 3));
    expect(input.value).toBe('secret123');

    await userEvent.type(input, '{Enter}');
    // Значение доходит до отправки: чужой ref не затёрт нашим.
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ password: 'secret123' })));
  });

  it('прячет пароль при отправке — и когда она удалась, и когда её отклонили', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const { unmount } = render(<PasswordForm theme={LIGHT} passwordMinLength={1} onSubmit={onSubmit} />);

    await userEvent.type(screen.getByLabelText('Текущий пароль'), 'old');
    await userEvent.click(eye(/Показать пароль: Новый пароль/));
    await userEvent.type(screen.getByLabelText('Новый пароль'), 'new{Enter}');

    await waitFor(() => expect(screen.getByLabelText('Новый пароль')).toHaveAttribute('type', 'password'));
    unmount();

    // Отказ: значение остаётся, поле снова скрыто.
    const rejected = vi.fn().mockRejectedValue(validationError('login', 'Такой логин уже занят.'));
    render(<RegisterForm theme={LIGHT} passwordMinLength={1} onSubmit={rejected} />);

    await userEvent.type(screen.getByLabelText('Логин'), 'alice');
    await userEvent.click(eye(/Показать пароль/));
    await userEvent.type(screen.getByLabelText('Пароль'), 'secret{Enter}');

    await waitFor(() => expect(rejected).toHaveBeenCalled());
    expect(screen.getByLabelText('Пароль')).toHaveAttribute('type', 'password');
    expect((screen.getByLabelText('Пароль') as HTMLInputElement).value).toBe('secret');
  });

  it('выключает автозамену на всех полях пароля', () => {
    const { unmount } = render(<LoginForm theme={LIGHT} onSubmit={vi.fn()} />);
    const check = (label: string) => {
      const input = screen.getByLabelText(label);
      expect(input).toHaveAttribute('autocapitalize', 'none');
      expect(input).toHaveAttribute('autocorrect', 'off');
      expect(input).toHaveAttribute('spellcheck', 'false');
    };

    check('Пароль');
    unmount();

    render(<PasswordForm theme={LIGHT} passwordMinLength={1} onSubmit={vi.fn()} />);
    check('Текущий пароль');
    check('Новый пароль');
  });
});

describe('видимый фокус', () => {
  it('не гасит рамку фокуса инлайновым стилем', () => {
    const { rerender } = render(<Field theme={LIGHT} label="Пароль" revealable type="password" />);
    const input = screen.getByLabelText('Пароль');

    // Пусто, а не 'none': инлайн перебил бы правило .field-focus:focus-visible.
    expect(input.style.boxShadow).toBe('');
    expect(input).toHaveClass('field-focus');

    rerender(<Field theme={LIGHT} label="Пароль" revealable type="password" error="Заполните это поле" />);
    // Рамка ошибки на месте — она рисуется тенью и с outline не спорит.
    expect(screen.getByLabelText('Пароль').style.boxShadow).not.toBe('');
    expect(screen.getByLabelText('Пароль')).toHaveClass('field-focus');
  });

  it('оставляет полю место под кнопку и защиту от зума', () => {
    render(<Field theme={LIGHT} label="Пароль" revealable type="password" />);
    const input = screen.getByLabelText('Пароль');

    expect(input.style.fontSize).toBe('16px');
    expect(Number.parseInt(input.style.paddingRight, 10)).toBeGreaterThan(30);
  });
});

describe('переключение с клавиатуры', () => {
  it('оставляет фокус на кнопке и не отправляет форму', async () => {
    const onSubmit = vi.fn();
    render(<LoginForm theme={LIGHT} onSubmit={onSubmit} />);

    const input = screen.getByLabelText('Пароль');
    await userEvent.type(input, 'secret');

    const button = eye(/Показать пароль/);
    button.focus();
    await userEvent.keyboard('{Enter}');

    expect(input).toHaveAttribute('type', 'text');
    // Фокус остался на кнопке: иначе следующий Enter ушёл бы в поле и отправил форму.
    expect(document.activeElement).toBe(button);

    await userEvent.keyboard('{Enter}');
    expect(input).toHaveAttribute('type', 'password');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('не схлопывает выделение при переключении', async () => {
    render(<LoginForm theme={LIGHT} onSubmit={vi.fn()} />);
    const input = screen.getByLabelText('Пароль') as HTMLInputElement;

    await userEvent.type(input, 'oldpass');
    input.setSelectionRange(0, 7);
    const setSelectionRange = vi.spyOn(input, 'setSelectionRange');

    await userEvent.click(eye(/Показать пароль/));

    // Обе границы, иначе следующий символ допишется к старому паролю.
    expect(setSelectionRange).toHaveBeenCalledWith(0, 7);
  });
});
