import { createBrowserRouter } from 'react-router-dom';
import { RedirectIfAuthenticated, RequireAuth } from './guards';
import { AdminPage } from '../pages/AdminPage';
import { ChatPage } from '../pages/ChatPage';
import { LoginPage } from '../pages/LoginPage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { NotificationsPage } from '../pages/NotificationsPage';
import { RoomSettingsPage } from '../pages/RoomSettingsPage';

// Маршруты собираются из feature-пакетов; guard-и добавляются на этапе 4.
export function createAppRouter() {
  return createBrowserRouter([
    { path: '/', element: <RequireAuth><ChatPage /></RequireAuth> },
    { path: '/rooms/:roomId', element: <RequireAuth><ChatPage /></RequireAuth> },
    { path: '/login', element: <RedirectIfAuthenticated><LoginPage /></RedirectIfAuthenticated> },
    { path: '/rooms/:roomId/settings', element: <RequireAuth><RoomSettingsPage /></RequireAuth> },
    { path: '/notifications', element: <RequireAuth><NotificationsPage /></RequireAuth> },
    // Права проверяет сервер: без них экран показывает документированный отказ.
    { path: '/admin', element: <RequireAuth><AdminPage /></RequireAuth> },
    { path: '*', element: <NotFoundPage /> },
  ]);
}
