import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiError } from '@vendor/api-client';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const get = vi.fn();
const patch = vi.fn();

vi.mock('../src/app/api', () => ({
  apiClient: () => ({ get, patch }),
}));

vi.mock('../src/app/settings', () => ({
  useSettings: () => ({ settings: { theme: 'light' } }),
}));

import { AdminPage } from '../src/pages/AdminPage';

const forbidden = () =>
  new ApiError(403, { code: 'forbidden', message: 'This action is not authorized.', details: {}, trace_id: null });

const status = {
  data: {
    components: {
      database: { status: 'ok' },
      websocket: { status: 'fail', detail: 'reverb is not running' },
    },
    features: { ai: true, search: false },
    version: '0.1.0',
  },
};

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );

  render(<AdminPage />, { wrapper });
}

describe('AdminPage', () => {
  beforeEach(() => {
    get.mockReset();
    patch.mockReset();
  });

  it('shows the forbidden state to a non-administrator', async () => {
    get.mockRejectedValue(forbidden());
    renderPage();

    expect(await screen.findByRole('alert')).toHaveTextContent('Этот раздел доступен только администратору.');
    expect(screen.queryByText('Состояние')).toBeNull();
  });

  it('shows component status and feature flags', async () => {
    get.mockImplementation((path: string) => {
      if (path === '/admin/status') return Promise.resolve(status);
      if (path === '/admin/settings') return Promise.resolve({ data: { ai_enabled: true } });
      return Promise.resolve({ data: [], meta: { next_cursor: null } });
    });
    renderPage();

    expect(await screen.findByText('База данных')).toBeInTheDocument();
    expect(screen.getByText('reverb is not running')).toBeInTheDocument();
    expect(screen.getByText('Недоступен')).toBeInTheDocument();
    expect(screen.getByText('Выключен')).toBeInTheDocument();
  });

  it('switches AI off through the API', async () => {
    get.mockImplementation((path: string) => {
      if (path === '/admin/status') return Promise.resolve(status);
      if (path === '/admin/settings') return Promise.resolve({ data: { ai_enabled: true } });
      return Promise.resolve({ data: [], meta: { next_cursor: null } });
    });
    patch.mockResolvedValue({ data: { ai_enabled: false } });
    renderPage();

    await userEvent.click(await screen.findByRole('switch', { name: 'AI-помощник' }));

    expect(patch).toHaveBeenCalledWith('/admin/settings', { body: { ai_enabled: false } });
  });

  it('lists audit entries and filters them by action', async () => {
    get.mockImplementation((path: string, options?: { query?: Record<string, unknown> }) => {
      if (path === '/admin/status') return Promise.resolve(status);
      if (path === '/admin/settings') return Promise.resolve({ data: { ai_enabled: true } });

      return Promise.resolve({
        data:
          options?.query?.action === undefined
            ? [
                {
                  id: 'a1',
                  actor_id: 'u1',
                  actor_label: 'Алиса',
                  action: 'administration.settings.updated',
                  subject_type: 'setting',
                  subject_id: 'ai.enabled',
                  context: {},
                  created_at: '2026-08-25T10:00:00Z',
                },
              ]
            : [],
        meta: { next_cursor: null },
      });
    });
    renderPage();

    expect(await screen.findByText('administration.settings.updated')).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText('Фильтр по действию'), 'ai.revision.succeeded');

    expect(await screen.findByText('Записей нет')).toBeInTheDocument();
  });
});
