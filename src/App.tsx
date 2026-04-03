import { useState, useEffect, useRef } from 'react';
import { Modal, message, Typography, Button, ConfigProvider, theme, Space } from 'antd';
import { ExclamationCircleOutlined, UnorderedListOutlined } from '@ant-design/icons';
import { api } from './api/tauri';
import type { ServiceConfig } from './types';
import ServiceSidebar from './components/ServiceSidebar';
import MainToolbar from './components/MainToolbar';
import LogConsole from './components/LogConsole';
import WeChatBotControls from './components/WeChatBotControls';
import ServiceLogDrawer from './components/ServiceLogDrawer';
import ServiceEditDialog from './components/ServiceEditDialog';

interface ServiceState {
  backend: { running: boolean; pid?: number; port: boolean };
  frontend: { running: boolean; pid?: number; port: boolean };
  wechat: { running: boolean; pid?: number; apiHealth?: boolean; port?: boolean };
  [key: string]: { running: boolean; pid?: number; port?: boolean; apiHealth?: boolean } | undefined;
}

interface LogEntry {
  timestamp: string;
  message: string;
  type: 'info' | 'success' | 'error' | 'warning';
}

function App() {
  const [serviceState, setServiceState] = useState<ServiceState>({
    backend: { running: false, port: false },
    frontend: { running: false, port: false },
    wechat: { running: false },
  });
  const [allServices, setAllServices] = useState<ServiceConfig[]>([]);
  const [serviceLogs, setServiceLogs] = useState<Record<string, LogEntry[]>>({});
  const [globalLogs, setGlobalLogs] = useState<string[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [ready, setReady] = useState(true);
  const [showWeChatConfig, setShowWeChatConfig] = useState(false);
  const [showServiceEdit, setShowServiceEdit] = useState(false);
  const [editService, setEditService] = useState<ServiceConfig | null>(null);
  const [logDrawerId, setLogDrawerId] = useState<string | null>(null);

  const wechatStatusFetchInProgress = useRef(false);

  const addLog = (msg: string, type: 'info' | 'success' | 'error' | 'warning' = 'info', serviceId?: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry: LogEntry = { timestamp, message: msg, type };
    const logPrefix =
      type === 'error' ? '[ERROR]' : type === 'success' ? '[SUCCESS]' : type === 'warning' ? '[WARNING]' : '[INFO]';
    const globalLogMessage = `${timestamp} ${logPrefix} ${msg}`;

    setGlobalLogs((prev) => [...prev, globalLogMessage].slice(-500));

    if (serviceId) {
      setServiceLogs((prev) => ({
        ...prev,
        [serviceId]: [...(prev[serviceId] || []), logEntry],
      }));
    } else {
      let inferred: string | null = null;
      if (msg.includes('后端') || msg.includes('backend')) inferred = 'backend';
      else if (msg.includes('前端') || msg.includes('frontend')) inferred = 'frontend';
      else if (msg.includes('微信') || msg.includes('wechat')) inferred = 'wechat';
      if (inferred) {
        setServiceLogs((prev) => ({
          ...prev,
          [inferred]: [...(prev[inferred] || []), logEntry],
        }));
      }
    }
  };

  const formatLogEntry = (l: LogEntry) => {
    const prefix =
      l.type === 'error'
        ? '[ERROR]'
        : l.type === 'success'
          ? '[SUCCESS]'
          : l.type === 'warning'
            ? '[WARNING]'
            : '[INFO]';
    return `${l.timestamp} ${prefix} ${l.message}`;
  };

  const formatLogsForConsole = (logs: LogEntry[]) => logs.map(formatLogEntry);

  const loadAllServices = async () => {
    try {
      const result = await api.config.getAllServices();
      if (result.success && result.data) {
        const list = result.data as ServiceConfig[];
        setAllServices(list);
        setSelectedServiceId((sel) => {
          if (sel && list.some((s) => s.id === sel)) return sel;
          return list[0]?.id ?? null;
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchStatus = async () => {
    try {
      const result = await api.serviceManager.status();
      if (result.success && result.data) {
        const data = result.data as Record<string, { running: boolean; pid?: number; port?: boolean }>;
        setServiceState((prev) => {
          const next: ServiceState = {} as ServiceState;
          Object.keys(data).forEach((id) => {
            const item = data[id];
            next[id] = item ? { ...item, port: item.port ?? false } : { running: false, port: false };
          });
          next.backend = next.backend ?? { running: false, port: false };
          next.frontend = next.frontend ?? { running: false, port: false };
          next.wechat = next.wechat
            ? { ...(prev.wechat || {}), ...next.wechat, port: next.wechat.port ?? false }
            : (prev.wechat ?? { running: false });

          if (next.wechat?.running) {
            api.wechatBot.checkApiHealth().then((healthResult: any) => {
              if (healthResult.success) {
                setServiceState((current) => ({
                  ...current,
                  wechat: {
                    ...(current.wechat || {}),
                    apiHealth: healthResult.health === true,
                  },
                }));
              }
            });
          }
          return next;
        });
      }
    } catch (error: any) {
      addLog(`获取状态失败: ${error.message}`, 'error');
    }
  };

  const fetchWeChatStatus = async () => {
    if (wechatStatusFetchInProgress.current) return;
    wechatStatusFetchInProgress.current = true;
    try {
      const statusResult = await api.serviceManager.status();
      if (statusResult.success && statusResult.data && (statusResult.data as any).wechat) {
        const wechatStatus = (statusResult.data as any).wechat;
        let apiHealth = false;
        if (wechatStatus.running) {
          try {
            const healthResult = await api.wechatBot.checkApiHealth();
            apiHealth = healthResult.success && healthResult.health === true;
          } catch {
            /* ignore */
          }
        }
        setServiceState((prev) => ({
          ...prev,
          wechat: {
            running: wechatStatus.running || false,
            pid: wechatStatus.pid,
            apiHealth,
          },
        }));
      }
    } finally {
      setTimeout(() => {
        wechatStatusFetchInProgress.current = false;
      }, 100);
    }
  };

  const startService = async (svc: string) => {
    const serviceId = svc;
    addLog(`正在启动${svc}服务...`, 'info', serviceId);
    try {
      const result = await api.serviceManager.start(svc);
      if (result.success) {
        addLog(`${svc}服务启动成功`, 'success', serviceId);
        addLog(result.message, 'info', serviceId);
        setServiceState((prev) => ({ ...prev, [svc]: { running: true, pid: undefined } }));
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
        addLog(`${svc}服务已停止`, 'success', serviceId);
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
        addLog(`${svc}服务重启成功`, 'success', serviceId);
        addLog(result.message, 'info', serviceId);
      } else {
        addLog(`${svc}服务重启失败: ${result.message}`, 'error', serviceId);
      }
      setTimeout(fetchStatus, 2000);
    } catch (error: any) {
      addLog(`重启${svc}服务异常: ${error.message}`, 'error', serviceId);
    }
  };

  const handleCreateService = async (data: Omit<ServiceConfig, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const result = await api.config.createService(data);
      if (result.success) {
        message.success('任务创建成功');
        await loadAllServices();
      } else {
        message.error('任务创建失败: ' + (result.message || '未知错误'));
      }
    } catch (error: any) {
      message.error('任务创建异常: ' + error.message);
    }
  };

  const handleUpdateService = async (data: Omit<ServiceConfig, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!editService) return;
    try {
      const result = await api.config.updateService(editService.id, data);
      if (result.success) {
        message.success('任务更新成功');
        await loadAllServices();
        setShowServiceEdit(false);
        setEditService(null);
      } else {
        message.error('任务更新失败: ' + (result.message || '未知错误'));
      }
    } catch (error: any) {
      message.error('任务更新异常: ' + error.message);
    }
  };

  const handleEditService = (service: ServiceConfig) => {
    setEditService(service);
    setShowServiceEdit(true);
  };

  const handleDeleteService = (serviceId: string, serviceName: string) => {
    Modal.confirm({
      title: '确认删除',
      icon: <ExclamationCircleOutlined />,
      content: `确定要删除任务 "${serviceName}" 吗？此操作不可撤销。`,
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          const result = await api.config.deleteService(serviceId);
          if (result.success) {
            message.success('任务已删除');
            await loadAllServices();
          } else {
            message.error('删除失败: ' + (result.message || '未知错误'));
          }
        } catch (error: any) {
          message.error('删除异常: ' + error.message);
        }
      },
    });
  };

  const unlistenWechatLog = useRef<(() => void) | undefined>(undefined);
  const unlistenServiceLog = useRef<(() => void) | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      addLog('正在初始化服务管理器...', 'info');
      try {
        await loadAllServices();
        await fetchStatus();
        addLog('已加载服务状态', 'info');
        try {
          const u = await api.onWeChatLog((msg) => addLog(msg, 'info'));
          if (!cancelled) unlistenWechatLog.current = u;
        } catch {
          /* 后端未发 wechat-log 事件时可忽略 */
        }

        try {
          const u = await api.onServiceLog((payload) => {
            const type = payload.type === 'error' ? 'error' : 'info';
            addLog(payload.message, type, payload.serviceId);
          });
          if (!cancelled) unlistenServiceLog.current = u;
        } catch {
          /* ignore */
        }
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
    let tick = 0;
    const interval = setInterval(() => {
      tick++;
      fetchStatus();
      if (tick % 2 === 0) fetchWeChatStatus();
    }, 2000);
    return () => clearInterval(interval);
  }, [ready]);

  const selected = allServices.find((s) => s.id === selectedServiceId) || null;
  const st = selectedServiceId ? serviceState[selectedServiceId] : undefined;
  const running = st?.running ?? false;
  const url =
    selected?.urlTemplate && running
      ? selected.urlTemplate.replace('{port}', String(selected.port))
      : null;

  const canRestart = selected ? selected.id !== 'wechat' && running : false;
  const fullCommand = selected?.command?.trim() ? selected.command : null;

  return (
    <ConfigProvider
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: {
          colorPrimary: '#1677ff',
          borderRadius: 6,
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif',
        },
      }}
    >
      <div className={`sm-app${selected ? ' sm-app--with-rail' : ''}`}>
        <ServiceSidebar
          services={allServices}
          serviceState={serviceState}
          selectedId={selectedServiceId}
          onSelect={setSelectedServiceId}
          onCreate={() => {
            setEditService(null);
            setShowServiceEdit(true);
          }}
        />

        <div className="sm-main">
          <MainToolbar
            title={selected ? selected.name : '日志'}
            subtitle={selected ? (running ? '运行中' : '已停止') : undefined}
            selectedService={selected}
            running={running}
            canRestart={canRestart}
            onStart={() => selected && startService(selected.id)}
            onStop={() => selected && stopService(selected.id)}
            onRestart={() => selected && restartService(selected.id)}
            onRefresh={() => {
              fetchStatus();
              fetchWeChatStatus();
            }}
            onOpenLogsDir={async () => {
              await api.openLogsDir();
            }}
            onWeChatConfig={() => setShowWeChatConfig(true)}
            onOpenUrl={(u) => api.openExternal(u)}
            url={url}
          />

          <div className="sm-main-body">
            <div className="sm-panel-head">
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                <UnorderedListOutlined /> 日志
              </Typography.Text>
              <Space>
                {selected && (
                  <Button type="link" size="small" onClick={() => setLogDrawerId(selected.id)}>
                    查看「{selected.name}」日志
                  </Button>
                )}
                <Button
                  type="link"
                  size="small"
                  onClick={() => {
                    if (!selectedServiceId) {
                      setGlobalLogs([]);
                      return;
                    }
                    setServiceLogs((prev) => ({
                      ...prev,
                      [selectedServiceId]: [],
                    }));
                  }}
                >
                  清空
                </Button>
              </Space>
            </div>
            <LogConsole
              lines={
                selectedServiceId
                  ? formatLogsForConsole(serviceLogs[selectedServiceId] || [])
                  : globalLogs
              }
            />
          </div>

          <footer className="sm-statusbar">
            <span>{globalLogs.length} 条</span>
            <span className="sm-statusbar-sep">|</span>
            <span>服务管理器 v{__APP_VERSION__}</span>
            {selected && (
              <>
                <span className="sm-statusbar-sep">|</span>
                <span>
                  {selected.name} · PID {st?.pid ?? '—'}
                </span>
              </>
            )}
          </footer>
        </div>

        {selected && (
          <aside className="sm-command-rail" aria-label="当前任务启动命令">
            <div className="sm-command-rail-head">
              <Typography.Text strong style={{ fontSize: 12 }}>
                {selected.name}
              </Typography.Text>
              <Typography.Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 4 }}>
                启动命令
              </Typography.Text>
            </div>
            <pre className="sm-command-rail-body">{fullCommand || '—'}</pre>
          </aside>
        )}

        {selected && (
          <div className="sm-floating-actions">
            <Button size="small" onClick={() => handleEditService(selected)}>
              编辑任务
            </Button>
            <Button size="small" danger onClick={() => handleDeleteService(selected.id, selected.name)}>
              删除
            </Button>
          </div>
        )}

        <WeChatBotControls
          serviceState={serviceState}
          isOpen={showWeChatConfig}
          onStart={() => startService('wechat')}
          onStop={() => stopService('wechat')}
          onRefresh={fetchWeChatStatus}
          addLog={addLog}
          onClose={() => setShowWeChatConfig(false)}
        />

        <ServiceLogDrawer
          visible={logDrawerId !== null}
          onClose={() => setLogDrawerId(null)}
          serviceId={logDrawerId || ''}
          serviceLogs={serviceLogs}
          onClear={(id) =>
            setServiceLogs((prev) => ({
              ...prev,
              [id]: [],
            }))
          }
        />

        <ServiceEditDialog
          visible={showServiceEdit}
          onClose={() => {
            setShowServiceEdit(false);
            setEditService(null);
          }}
          onSave={editService ? handleUpdateService : handleCreateService}
          editService={editService}
        />
      </div>
    </ConfigProvider>
  );
}

export default App;
