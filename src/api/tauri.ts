import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import { open as openDialog } from '@tauri-apps/plugin-dialog';

type R<T = unknown> = Promise<T>;

export const api = {
  serviceManager: {
    start: (service: string): R<{ success: boolean; message: string }> =>
      invoke('start_service', { service }),
    stop: (service: string): R<{ success: boolean; message: string }> =>
      invoke('stop_service', { service }),
    restart: (service: string): R<{ success: boolean; message: string }> =>
      invoke('restart_service', { service }),
    status: (): R<{ success: boolean; data?: Record<string, any>; message?: string }> =>
      invoke('get_service_status'),
  },

  wechatBot: {
    start: (): R<{ success: boolean; message: string }> =>
      invoke('start_wechat'),
    stop: (): R<{ success: boolean; message: string }> =>
      invoke('stop_wechat'),
    status: (): R<{ success: boolean; data?: any; message?: string }> =>
      invoke('get_wechat_status'),
    checkApiHealth: (): R<{ success: boolean; health?: boolean }> =>
      invoke('check_wechat_api_health'),
    getPushConfig: (): R<{ success: boolean; config?: any }> =>
      invoke('get_wechat_push_config'),
    setPushConfig: (enabled: boolean, callbackUrl: string): R<{ success: boolean; message: string }> =>
      invoke('set_wechat_push_config', { enabled, callbackUrl }),
  },

  config: {
    getAll: (): R<{ success: boolean; data?: any; message?: string }> =>
      invoke('get_all_config'),
    getAllServices: (): R<{ success: boolean; data?: any[]; message?: string }> =>
      invoke('get_all_services'),
    getService: (serviceId: string): R<{ success: boolean; data?: any; message?: string }> =>
      invoke('get_service_config', { serviceId }),
    createService: (serviceData: any): R<{ success: boolean; data?: any; message?: string }> =>
      invoke('create_service', { serviceData }),
    updateService: (serviceId: string, updates: any): R<{ success: boolean; message?: string }> =>
      invoke('update_service', { serviceId, updates }),
    deleteService: (serviceId: string): R<{ success: boolean; message?: string }> =>
      invoke('delete_service', { serviceId }),
    resetDefaults: (): R<{ success: boolean; message?: string }> =>
      invoke('reset_defaults'),
  },

  openExternal: (url: string): R<void> =>
    invoke('open_external', { url }),

  openLogsDir: (): R<{ success: boolean }> =>
    invoke('open_logs_dir'),

  selectDirectory: async (): Promise<{ success: boolean; canceled?: boolean; filePath?: string; message?: string }> => {
    try {
      const selected = await openDialog({ directory: true, title: '选择工作目录' });
      if (selected) {
        return { success: true, filePath: selected as string };
      }
      return { success: false, canceled: true };
    } catch (e: any) {
      return { success: false, message: e.message || String(e) };
    }
  },

  onWeChatLog: (callback: (msg: string) => void): Promise<UnlistenFn> =>
    listen<string>('wechat-log', (event) => callback(event.payload)),
};
