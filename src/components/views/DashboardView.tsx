import React, { useMemo, useState } from 'react';
import type { ServiceConfig } from '../../types';
import type { ServiceStateItem } from '../layout/ServiceSidebar';

interface DashboardViewProps {
  services: ServiceConfig[];
  serviceState: Record<string, ServiceStateItem | undefined>;
  onStartService: (id: string) => void;
  onStopService: (id: string) => void;
  onRestartService: (id: string) => void;
  onViewLogs: (id: string) => void;
  globalLogs: string[];
  onCreateNew: () => void;
}

const DashboardView: React.FC<DashboardViewProps> = ({
  services,
  serviceState,
  onStartService,
  onStopService,
  onRestartService,
  onViewLogs,
  globalLogs,
  onCreateNew
}) => {
  const runningCount = services.filter(s => serviceState[s.id]?.running).length;
  const [statusFilter, setStatusFilter] = useState<'all' | 'running' | 'stopped'>('all');
  const formatMemory = (bytes?: number) => {
    if (!bytes || bytes <= 0) return '0 B';
    if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${bytes} B`;
  };
  const filteredServices = useMemo(() => {
    if (statusFilter === 'running') {
      return services.filter((s) => serviceState[s.id]?.running);
    }
    if (statusFilter === 'stopped') {
      return services.filter((s) => !serviceState[s.id]?.running);
    }
    return services;
  }, [services, serviceState, statusFilter]);

  return (
    <div className="p-10 pb-12">
      <div className="mb-10 flex justify-between items-end">
        <div>
          <h1 className="font-headline text-4xl font-black text-on-surface tracking-tight mb-2">运行服务</h1>
          <p className="text-on-surface-variant font-light flex items-center gap-2">
            <span className="w-2 h-2 bg-tertiary-dim rounded-full pulse-tertiary"></span>
            {runningCount} 个服务运行中 • {services.length} 个总服务
          </p>
        </div>
        <div className="flex gap-4 items-center">
          <div className="bg-surface-container-highest/70 rounded-xl border border-outline-variant/20 p-1 flex items-center gap-1">
            <span className="material-symbols-outlined text-sm text-on-surface-variant pl-2 pr-1">filter_list</span>
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold tracking-widest uppercase transition-all ${
                statusFilter === 'all'
                  ? 'bg-primary/15 text-primary ring-1 ring-primary/30'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-white/5'
              }`}
            >
              全部
            </button>
            <button
              onClick={() => setStatusFilter('running')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold tracking-widest uppercase transition-all ${
                statusFilter === 'running'
                  ? 'bg-tertiary-dim/15 text-tertiary-dim ring-1 ring-tertiary-dim/30'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-white/5'
              }`}
            >
              运行中
            </button>
            <button
              onClick={() => setStatusFilter('stopped')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold tracking-widest uppercase transition-all ${
                statusFilter === 'stopped'
                  ? 'bg-error/15 text-error ring-1 ring-error/30'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-white/5'
              }`}
            >
              已停止
            </button>
          </div>
          <button
            onClick={onCreateNew}
            className="bg-gradient-to-r from-primary to-primary-container px-6 py-2 rounded-xl text-sm font-black text-on-primary shadow-[0_4px_20px_rgba(0,229,255,0.3)] hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-sm">add</span> 创建服务
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
        {/* Render Services */}
        {filteredServices.map((svc) => {
          const st = serviceState[svc.id];
          const isRunning = st?.running ?? false;
          const cpuPercent = isRunning ? Math.max(0, Math.min(100, st?.cpuPercent ?? 0)) : 0;
          const memoryBytes = isRunning ? (st?.memoryBytes ?? 0) : 0;
          // 以 2GB 为可视化基线，避免不同服务间条形图不可比较。
          const memoryPercent = Math.max(0, Math.min(100, (memoryBytes / (2 * 1024 * 1024 * 1024)) * 100));

          return (
            <div key={svc.id} className="group relative bg-surface-container-high rounded-xl overflow-hidden hover:bg-surface-container-highest transition-all duration-500 flex flex-col">
              {isRunning && <div className="absolute inset-0 scanline-effect opacity-10 pointer-events-none"></div>}
              <div className="p-6 relative">
                <div className="flex justify-between items-start mb-6">
                  <div className="min-w-0 w-full">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-[0.2em] mb-1 block truncate ${isRunning ? 'text-primary' : 'text-slate-500'}`}
                      title={svc.id}
                    >
                      {svc.id}
                    </span>
                    <div className="flex items-center gap-3 min-w-0">
                      <h3 className={`text-xl font-headline font-bold text-on-surface truncate ${!isRunning && 'opacity-60'}`}>{svc.name}</h3>
                      <span className={`shrink-0 flex items-center gap-1.5 px-3 py-1 text-[10px] font-bold rounded-full uppercase tracking-wider ${isRunning ? 'bg-tertiary/10 text-tertiary-dim' : 'bg-surface-container-highest text-slate-500'}`}>
                      {isRunning && <span className="w-1.5 h-1.5 bg-tertiary-dim rounded-full pulse-tertiary"></span>}
                      {!isRunning && <span className="w-1.5 h-1.5 bg-slate-500 rounded-full"></span>}
                      {isRunning ? `运行中 · PID ${st?.pid || '—'}` : '已停止'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  {/* Faux Resource Monitor */}
                  <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 ${!isRunning && 'opacity-30'}`}>
                    <div className="flex flex-col gap-2">
                      <div className="flex justify-between items-center text-[11px] font-medium uppercase text-on-surface-variant">
                        <span>CPU 负载</span>
                        <span className={isRunning ? 'text-primary' : ''}>{cpuPercent.toFixed(1)}%</span>
                      </div>
                      <div className="h-1 w-full bg-surface-container-lowest rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${isRunning ? 'bg-primary shadow-[0_0_8px_rgba(129,236,255,0.6)]' : 'w-0'}`}
                          style={isRunning ? { width: `${cpuPercent}%` } : undefined}
                        ></div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <div className="flex justify-between items-center text-[11px] font-medium uppercase text-on-surface-variant">
                        <span>内存使用</span>
                        <span className={isRunning ? 'text-primary' : ''}>{formatMemory(memoryBytes)}</span>
                      </div>
                      <div className="h-1 w-full bg-surface-container-lowest rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${isRunning ? 'bg-primary-dim' : 'w-0'}`}
                          style={isRunning ? { width: `${memoryPercent}%` } : undefined}
                        ></div>
                      </div>
                    </div>
                  </div>

                </div>
              </div>

              {/* Hover Actions */}
              <div className="mt-auto p-4 bg-surface-container-lowest/50 flex justify-between items-center border-t border-outline-variant/10">
                <div className="flex gap-2">
                  {isRunning ? (
                    <>
                      <button onClick={() => onStopService(svc.id)} className="w-9 h-9 rounded-lg flex items-center justify-center bg-error/10 text-error hover:bg-error/20 transition-colors" title="停止">
                        <span className="material-symbols-outlined text-lg">stop</span>
                      </button>
                      <button onClick={() => onRestartService(svc.id)} className="w-9 h-9 rounded-lg flex items-center justify-center bg-primary/10 text-primary hover:bg-primary/20 transition-colors" title="重启">
                        <span className="material-symbols-outlined text-lg">restart_alt</span>
                      </button>
                    </>
                  ) : (
                    <button onClick={() => onStartService(svc.id)} className="px-6 h-9 rounded-lg flex items-center justify-center bg-tertiary-dim/10 text-tertiary-dim hover:bg-tertiary-dim/20 transition-colors font-bold text-xs uppercase tracking-widest">
                      <span className="material-symbols-outlined text-lg mr-2">play_arrow</span> 启动节点
                    </button>
                  )}
                </div>
                <button
                  onClick={() => onViewLogs(svc.id)}
                  className="text-[11px] font-bold text-on-surface-variant hover:text-primary uppercase flex items-center gap-1 transition-colors"
                >
                  查看日志 <span className="material-symbols-outlined text-sm">arrow_forward_ios</span>
                </button>
              </div>
            </div>
          );
        })}
        {filteredServices.length === 0 && (
          <div className="md:col-span-2 xl:col-span-3 bg-surface-container-high rounded-xl p-8 text-center text-on-surface-variant border border-outline-variant/10">
            当前筛选条件下暂无服务
          </div>
        )}

        {/* Global Terminal Widget */}
        <div className="md:col-span-2 xl:col-span-3 bg-surface-container-lowest rounded-xl p-8 relative overflow-hidden border border-outline-variant/10">
          <div className="absolute top-0 right-0 p-4 flex gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-error-dim"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-tertiary-dim"></div>
          </div>
          <h4 className="text-[11px] font-bold text-primary uppercase tracking-[0.3em] mb-6 flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">terminal</span>
            全局日志流 — 实时输出
          </h4>
          <div className="font-mono text-sm space-y-2 overflow-y-auto max-h-[300px] text-slate-400 custom-scrollbar">
            {globalLogs.slice(-50).map((log, idx) => (
              <div key={idx} className="flex gap-4">
                 {/* Faux timestamp for layout */}
                 <span className="text-slate-600 shrink-0">[{new Date().toLocaleTimeString()}]</span>
                 <span className="break-all">{log}</span>
              </div>
            ))}
            {globalLogs.length === 0 && (
              <div className="text-slate-600 italic">暂无日志输出...</div>
            )}
            <div className="flex gap-4 pt-2">
              <span className="text-primary animate-pulse">_</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardView;
