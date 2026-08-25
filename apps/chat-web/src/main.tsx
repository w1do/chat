import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { AppProviders } from './app/providers';
import { createAppRouter } from './app/router';
import { createRealtimeAdapter } from './app/echo';
import { loadRuntimeConfig } from './app/runtime-config';
import { registerServiceWorker } from './app/service-worker';
import './styles/index.css';

async function bootstrap() {
  const config = await loadRuntimeConfig();

  // Service worker обслуживает push и экран без связи; приложение работает и
  // без него, поэтому регистрация ничего не блокирует.
  void registerServiceWorker((apply) => {
    window.dispatchEvent(new CustomEvent('chat:update-ready', { detail: { apply } }));
  });
  createRealtimeAdapter(config);
  const router = createAppRouter();

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <AppProviders>
        <RouterProvider router={router} />
      </AppProviders>
    </StrictMode>,
  );
}

void bootstrap();
