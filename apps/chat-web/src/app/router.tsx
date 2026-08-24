import { createBrowserRouter } from 'react-router-dom';
import { ChatPage } from '../pages/ChatPage';
import { LoginPage } from '../pages/LoginPage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { NotificationsPage } from '../pages/NotificationsPage';
import { ProfilePage } from '../pages/ProfilePage';
import { RoomSettingsPage } from '../pages/RoomSettingsPage';

// Маршруты собираются из feature-пакетов; guard-и добавляются на этапе 4.
export function createAppRouter() {
  return createBrowserRouter([
    { path: '/', element: <ChatPage /> },
    { path: '/login', element: <LoginPage /> },
    { path: '/rooms/:roomId/settings', element: <RoomSettingsPage /> },
    { path: '/profile', element: <ProfilePage /> },
    { path: '/notifications', element: <NotificationsPage /> },
    { path: '*', element: <NotFoundPage /> },
  ]);
}
