import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AuthorizedImage } from '../src/components/AuthorizedImage';
import { clearAuthorizedImages, setAuthorizedImageHeaders } from '../src/hooks/useAuthorizedImage';

const IMAGE = '/api/v1/avatars/abc/thumb';

function serve(status = 200) {
  const fetchMock = vi.fn(async () =>
    status === 200 ? new Response(new Blob(['image'])) : new Response('нет доступа', { status }),
  );
  vi.stubGlobal('fetch', fetchMock);

  return fetchMock;
}

afterEach(() => {
  clearAuthorizedImages();
  setAuthorizedImageHeaders(() => ({}));
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('AuthorizedImage', () => {
  it('запрашивает файл с заголовком авторизации и показывает его из blob:', async () => {
    const fetchMock = serve();
    setAuthorizedImageHeaders(() => ({ Authorization: 'Bearer secret-token' }));

    render(<AuthorizedImage src={IMAGE} alt="аватарка" fallback={<span>буква</span>} />);

    const image = await screen.findByRole('img', { name: 'аватарка' });
    expect(image.getAttribute('src')).toMatch(/^blob:/);
    expect(fetchMock).toHaveBeenCalledWith(IMAGE, { headers: { Authorization: 'Bearer secret-token' } });

    // Токен уходит только заголовком: в адресе его нет (spec).
    expect(fetchMock.mock.calls[0]?.[0]).toBe(IMAGE);
  });

  it('показывает замену при отказе и больше не повторяет запрос', async () => {
    const fetchMock = serve(403);

    render(<AuthorizedImage src={IMAGE} alt="аватарка" fallback={<span>буква</span>} />);

    await waitFor(() => expect(screen.getByText('буква')).toBeInTheDocument());
    expect(screen.queryByRole('img')).toBeNull();

    // Второй показ того же адреса не превращается в новый запрос.
    render(<AuthorizedImage src={IMAGE} alt="аватарка" fallback={<span>буква</span>} />);
    await waitFor(() => expect(screen.getAllByText('буква')).toHaveLength(2));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('скачивает один адрес один раз на всех потребителей', async () => {
    const fetchMock = serve();

    render(
      <>
        <AuthorizedImage src={IMAGE} alt="первая" />
        <AuthorizedImage src={IMAGE} alt="вторая" />
      </>,
    );

    await screen.findByRole('img', { name: 'первая' });
    await screen.findByRole('img', { name: 'вторая' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('отзывает blob:-адрес, когда картинку перестают показывать', async () => {
    serve();
    const revoke = vi.spyOn(URL, 'revokeObjectURL');

    const { unmount } = render(<AuthorizedImage src={IMAGE} alt="аватарка" />);
    const image = await screen.findByRole('img', { name: 'аватарка' });
    const objectUrl = image.getAttribute('src');

    unmount();

    expect(revoke).toHaveBeenCalledWith(objectUrl);
  });

  it('без адреса не ходит в сеть и рисует замену', () => {
    const fetchMock = serve();

    render(<AuthorizedImage src={null} alt="аватарка" fallback={<span>буква</span>} />);

    expect(screen.getByText('буква')).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
