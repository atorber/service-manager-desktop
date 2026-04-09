import React, { useEffect, useState, useRef } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { message } from 'antd';
import { api } from './api/tauri';
import type { ServiceConfig } from './types';
import type { ServiceStateItem } from './components/layout/ServiceSidebar';

// Layout & Views
import BaseLayout from './components/layout/BaseLayout';
import type { ViewType } from './components/layout/Sidebar';
import DashboardView from './components/views/DashboardView';
import CreateServiceView from './components/views/CreateServiceView';
import SettingsView from './components/views/SettingsView';
import ServiceDetailsView from './components/views/ServiceDetailsView';

function App() {
  const [ready, setReady] = useState(false);
  const [allServices, setAllServices] = useState<ServiceConfig[]>([]);
  const [serviceState, setServiceState] = useState<Record<string, ServiceStateItem | undefined>>({});

  // Navigation State
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);

  // Edit State
  const [editService, setEditService] = useState<ServiceConfig | null>(null);

  // Logs state
  const [globalLogs, setGlobalLogs] = useState<string[]>([]);
  const [serviceLogs, setServiceLogs] = useState<Record<string, Array<{ type: 'info' | 'error' | 'warn'; text: string; timestamp: number }>>>({});

  const MAX_LOGS = 500;

  const addLog = (text: string, type: 'info' | 'error' | 'warn' = 'info', serviceId?: string) => {
    const ts = Date.now();
    if (serviceId) {
      setServiceLogs((prev) => {
        const arr = prev[serviceId] || [];
        const next = [...arr, { type, text, timestamp: ts }];
        if (next.length > MAX_LOGS) next.shift();
        return { ...prev, [serviceId]: next };
      });
      // also forward service logs to global minimally
      setGlobalLogs((prev) => {
        const next = [...prev, `[${serviceId}] ${text}`];
        if (next.length > MAX_LOGS) next.shift();
        return next;
      });
    } else {
      setGlobalLogs((prev) => {
        const next = [...prev, text];
        if (next.length > MAX_LOGS) next.shift();
        return next;
      });
    }
  };

  const loadAllServices = async () => {
    try {
      const result = await api.config.getAllServices();
      if (result.success && result.data) {
        setAllServices(result.data);
      } else {
        addLog(`加载服务配置失败: ${result.message}`, 'error');
      }
    } catch (error: any) {
      addLog(`加载服务配置异常: ${error.message}`, 'error');
    }
  };

  const fetchStatus = async () => {
    try {
      const result = await api.serviceManager.status();
      if (result.success && result.data) {
         setServiceState(result.data);
         setReady(true);
      }
    } catch (error: any) {
      addLog(`获取状态失败: ${error.message}`, 'error');
    }
  };

  const startService = async (svc: string) => {
    const serviceId = svc;
    addLog(`正在启动${svc}服务...`, 'info', serviceId);
    try {
      const result = await api.serviceManager.start(svc);
      if (result.success) {
        addLog(`${svc}服务已启动`, 'info', serviceId);
        addLog(result.message, 'info', serviceId);
      } else {
        addLog(`${svc}服务启动失败: ${result.message}`, 'error', serviceId);
      }
      setTimeout(fetchStatus, 1000);
    } catch (error: any) {
      addLog(`启动${svc}服务异常: ${error.message}`, 'error', serviceId);
    }
  };

  const stopService = async (svc: string) => {
    const serviceId = svc;
    addLog(`正在停止${svc}服务...`, 'info', serviceId);
    try {
      const result = await api.serviceManager.stop(svc);
      if (result.success) {
        addLog(`${svc}服务已停止`, 'info', serviceId);
        addLog(result.message, 'info', serviceId);
      } else {
        addLog(`${svc}服务停止失败: ${result.message}`, 'error', serviceId);
      }
      setTimeout(fetchStatus, 1000);
    } catch (error: any) {
      addLog(`停止${svc}服务异常: ${error.message}`, 'error', serviceId);
    }
  };

  const restartService = async (svc: string) => {
    const serviceId = svc;
    addLog(`正在重启${svc}服务...`, 'info', serviceId);
    try {
      const result = await api.serviceManager.restart(svc);
      if (result.success) {
        addLog(`${svc}服务重启成功`, 'info', serviceId);
        addLog(result.message, 'info', serviceId);
      } else {
        addLog(`${svc}服务重启失败: ${result.message}`, 'error', serviceId);
      }
      setTimeout(fetchStatus, 2000);
    } catch (error: any) {
      addLog(`重启${svc}服务异常: ${error.message}`, 'error', serviceId);
    }
  };

  const handleCreateService = async (data: Omit<ServiceConfig, 'id' | 'createdAt' | 'updatedAt'>): Promise<boolean> => {
    try {
      const result = await api.config.createService(data);
      if (result.success) {
        message.success('任务创建成功');
        await loadAllServices();
        return true;
      } else {
        message.error('任务创建失败: ' + (result.message || '未知错误'));
        return false;
      }
    } catch (error: any) {
      message.error('任务创建异常: ' + error.message);
      return false;
    }
  };

  const handleUpdateService = async (data: Omit<ServiceConfig, 'id' | 'createdAt' | 'updatedAt'>): Promise<boolean> => {
    if (!editService) return false;
    try {
      const result = await api.config.updateService(editService.id, data);
      if (result.success) {
        message.success('任务更新成功');
        await loadAllServices();
        setEditService(null);
        return true;
      } else {
        message.error('任务更新失败: ' + (result.message || '未知错误'));
        return false;
      }
    } catch (error: any) {
      message.error('任务更新异常: ' + error.message);
      return false;
    }
  };

  const handleDeleteService = async (serviceId: string) => {
    if (window.confirm(`确定要删除任务吗？此操作不可撤销。`)) {
        try {
          const result = await api.config.deleteService(serviceId);
          if (result.success) {
            message.success('任务已删除');
            await loadAllServices();
            if (selectedServiceId === serviceId) {
                setSelectedServiceId(null);
            }
          } else {
            message.error('删除失败: ' + (result.message || '未知错误'));
          }
        } catch (error: any) {
          message.error('删除异常: ' + error.message);
        }
    }
  };

  const unlistenWechatLog = useRef<(() => void) | undefined>(undefined);
  const unlistenServiceLog = useRef<(() => void) | undefined>(undefined);

  useEffect(() => {
    const globalTitle = `Service Manager v${__APP_VERSION__}`;
    document.title = globalTitle;
    getCurrentWindow().setTitle(globalTitle).catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      addLog('正在初始化服务管理器...', 'info');
      try {
        await loadAllServices();
        await fetchStatus();
        addLog('已加载服务状态', 'info');
        try {
          const u = await api.onWeChatLog((msg: string) => addLog(msg, 'info'));
          if (!cancelled) unlistenWechatLog.current = u;
        } catch {}

        try {
          const u = await api.onServiceLog((payload: any) => {
            const type = payload.type === 'error' ? 'error' : 'info';
            addLog(payload.message, type, payload.serviceId);
          });
          if (!cancelled) unlistenServiceLog.current = u;
        } catch {}
      } catch {
        addLog('初始化失败', 'error');
      }
    })();
    return () => {
      cancelled = true;
      unlistenWechatLog.current?.();
      unlistenServiceLog.current?.();
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    fetchStatus();
    const interval = setInterval(() => {
      fetchStatus();
    }, 2000);
    return () => clearInterval(interval);
  }, [ready]);


  const renderMainContent = () => {
    // If we are showing a specific service details
    if (selectedServiceId && currentView === 'dashboard') {
      const selected = allServices.find(s => s.id === selectedServiceId);
      if (selected) {
         return (
           <ServiceDetailsView
             service={selected}
             state={serviceState[selected.id]}
             logs={serviceLogs[selected.id] || []}
             onStart={() => startService(selected.id)}
             onStop={() => stopService(selected.id)}
             onRestart={() => restartService(selected.id)}
             onEdit={() => {
                setEditService(selected);
                setCurrentView('create');
             }}
             onDelete={() => handleDeleteService(selected.id)}
             onOpenLogsDir={() => api.openLogsDir()}
             onClearLogs={() => setServiceLogs(prev => ({ ...prev, [selected.id]: [] }))}
           />
         );
      }
    }

    // Default Views mapping
    switch (currentView) {
      case 'dashboard':
        return (
          <DashboardView
            services={allServices}
            serviceState={serviceState}
            onStartService={startService}
            onStopService={stopService}
            onRestartService={restartService}
            onViewLogs={(id) => {
              setSelectedServiceId(id);
            }}
            globalLogs={globalLogs}
            onCreateNew={() => setCurrentView('create')}
          />
        );
      case 'create':
        return (
          <CreateServiceView
            editService={editService}
            onSave={editService ? handleUpdateService : handleCreateService}
            onCancel={() => {
              setEditService(null);
              setCurrentView('dashboard');
            }}
          />
        );
      case 'logs':
        return (
          <div className="p-10 pb-12 text-on-surface">
            <div className="mb-10">
              <h1 className="font-headline text-4xl font-black text-on-surface tracking-tight mb-2">全局日志</h1>
              <p className="text-on-surface-variant font-light">查看所有服务的实时输出与历史打印，支持快速清空当前缓存。</p>
            </div>
            <div className="flex justify-end items-center mb-4">
                <button onClick={() => setGlobalLogs([])} className="hover:text-primary transition-colors flex items-center gap-1 text-sm text-slate-500">
                    <span className="material-symbols-outlined text-sm">delete</span> 清空当前
                </button>
            </div>
            <div className="bg-surface-container-low p-6 rounded-xl font-mono text-sm max-h-[70vh] overflow-y-auto">
               {globalLogs.map((log, i) => <div key={i}>{log}</div>)}
               {globalLogs.length === 0 && <span className="text-slate-500">暂无日志</span>}
            </div>
          </div>
        );
      case 'settings':
        return <SettingsView />;
      default:
        return null;
    }
  };

  const handleViewChange = (view: ViewType) => {
    if (view === 'dashboard' && selectedServiceId) {
      // Clear selection if clicking dashboard again
      setSelectedServiceId(null);
    }
    if (view === 'create') {
      setEditService(null);
    }
    setCurrentView(view);
  };

  return (
    <BaseLayout
      currentView={currentView}
      onViewChange={handleViewChange}
      onRefresh={fetchStatus}
      showBackButton={currentView === 'dashboard' && !!selectedServiceId}
      onBack={() => setSelectedServiceId(null)}
    >
      {renderMainContent()}
    </BaseLayout>
  );
}

export default App;
