import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '@vendor/api-client';
import { apiClient } from './api';

export interface SystemStatus {
  components: Record<string, { status: string; detail?: string }>;
  features: { ai: boolean; search: boolean };
  version: string;
}

export interface AuditEntry {
  id: string;
  actor_id: string | null;
  actor_label: string | null;
  action: string;
  subject_type: string | null;
  subject_id: string | null;
  context: Record<string, unknown>;
  created_at: string;
}

const STATUS_KEY = ['admin', 'status'] as const;
const SETTINGS_KEY = ['admin', 'settings'] as const;
const AUDIT_KEY = ['admin', 'audit'] as const;

/** Нет права смотреть админку — 403; это не ошибка сети, а отдельное состояние. */
export function isForbidden(error: unknown): boolean {
  return error instanceof ApiError ? error.status === 403 : false;
}

export function useSystemStatus() {
  return useQuery({
    queryKey: STATUS_KEY,
    queryFn: async () => ((await apiClient().get('/admin/status')) as { data: SystemStatus }).data,
    retry: false,
  });
}

export function useAdminSettings() {
  return useQuery({
    queryKey: SETTINGS_KEY,
    queryFn: async () =>
      ((await apiClient().get('/admin/settings')) as { data: { ai_enabled: boolean } }).data,
    retry: false,
  });
}

export function useUpdateAdminSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (aiEnabled: boolean) =>
      ((await apiClient().patch('/admin/settings', { body: { ai_enabled: aiEnabled } })) as {
        data: { ai_enabled: boolean };
      }).data,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: SETTINGS_KEY });
      void queryClient.invalidateQueries({ queryKey: STATUS_KEY });
    },
  });
}

export function useAuditLog(action?: string) {
  return useQuery({
    queryKey: [...AUDIT_KEY, { action: action ?? '' }],
    queryFn: async () =>
      (await apiClient().get('/admin/audit-logs', {
        query: { action: action || undefined, limit: 50 },
      })) as { data: AuditEntry[]; meta: { next_cursor: string | null } },
    retry: false,
  });
}
