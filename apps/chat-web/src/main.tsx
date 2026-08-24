import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { AppProviders } from './app/providers';
import { createAppRouter } from './app/router';
import { createRealtimeAdapter } from './app/echo';
import { loadRuntimeConfig } from './app/runtime-config';
import './styles/index.css';

async function bootstrap() {
  const config = await loadRuntimeConfig();
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
