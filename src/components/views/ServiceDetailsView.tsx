import React, { useRef, useEffect } from 'react';
import type { ServiceConfig } from '../../types';
import type { ServiceStateItem } from '../layout/ServiceSidebar';

interface ServiceDetailsViewProps {
  service: ServiceConfig;
  state: ServiceStateItem | undefined;
  logs: Array<{ type: 'info' | 'error' | 'warn'; text: string; timestamp: number }>;
  onStart: () => void;
  onStop: () => void;
  onRestart: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onOpenLogsDir: () => void;
  onClearLogs: () => void;
}

const ServiceDetailsView: React.FC<ServiceDetailsViewProps> = ({
  service,
  state,
  logs,
  onStart,
  onStop,
  onRestart,
  onEdit,
  onDelete,
  onOpenLogsDir,
  onClearLogs
}) => {
  const isRunning = state?.running ?? false;
  const consoleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (consoleRef.current) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="h-[calc(100vh-5rem)] flex flex-col bg-surface overflow-hidden">
      {/* Header Controls */}
      <div className="px-10 py-6 flex justify-between items-end shrink-0">
        <div>
          <div className="flex items-center gap-3 mb-1">
            {isRunning ? (
              <>
                <div className="w-3 h-3 rounded-full bg-tertiary-dim shadow-[0_0_8px_#00ef99]"></div>
                <span className="text-tertiary-dim font-headline text-xs font-bold tracking-widest uppercase">正在运行</span>
              </>
            ) : (
              <>
                <div className="w-3 h-3 rounded-full bg-slate-500"></div>
                <span className="text-slate-500 font-headline text-xs font-bold tracking-widest uppercase">已停止</span>
              </>
            )}
          </div>
          <h1 className="text-4xl font-headline font-black tracking-tight text-on-surface">{service.name}</h1>
          <p className="text-on-surface-variant mt-1">
            服务ID: <span className="font-mono text-primary">{service.id}</span>
            {state?.pid && ` • PID: ${state.pid}`}
            {service.port ? ` • 端口: ${service.port}` : ''}
          </p>
        </div>
        <div className="flex gap-4">
          <button onClick={onEdit} className="px-4 py-3 bg-surface-container-highest rounded-xl text-on-surface font-headline font-bold flex items-center gap-2 hover:bg-surface-container-high transition-all active:scale-95 group">
            <span className="material-symbols-outlined text-primary">edit</span>
            编辑
          </button>
          {isRunning ? (
            <>
              <button onClick={onRestart} className="px-6 py-3 bg-surface-container-highest rounded-xl text-on-surface font-headline font-bold flex items-center gap-2 hover:bg-surface-container-high transition-all active:scale-95 group">
                <span className="material-symbols-outlined text-primary group-hover:rotate-180 transition-transform duration-500">refresh</span>
                重启
              </button>
              <button onClick={onStop} className="px-6 py-3 bg-gradient-to-r from-error-container to-error-dim rounded-xl text-white font-headline font-bold flex items-center gap-2 hover:opacity-90 transition-all active:scale-95 shadow-lg shadow-error-container/20">
                <span className="material-symbols-outlined">stop</span>
                终止
              </button>
            </>
          ) : (
            <button onClick={onStart} className="px-6 py-3 bg-gradient-to-r from-tertiary-dim to-tertiary rounded-xl text-on-primary-fixed font-headline font-bold flex items-center gap-2 hover:opacity-90 transition-all active:scale-95 shadow-lg shadow-tertiary-dim/20">
              <span className="material-symbols-outlined">play_arrow</span>
              启动
            </button>
          )}
          <button onClick={onDelete} className="px-4 py-3 bg-error-container/20 text-error rounded-xl font-headline font-bold flex items-center gap-2 hover:bg-error-container/40 transition-all active:scale-95 ml-2">
            <span className="material-symbols-outlined">delete</span>
          </button>
        </div>
      </div>

      {/* Top Half: System Metrics */}
      <div className="px-10 pb-6 grid grid-cols-12 gap-6 h-[30%] shrink-0">
        <div className="col-span-4 bg-surface-container rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start">
              <p className="text-on-surface-variant font-headline text-sm font-bold tracking-wider uppercase">CPU 使用率</p>
              <span className="text-primary font-headline text-2xl font-black">{isRunning ? '24.8%' : '0%'}</span>
            </div>
          </div>
          <div className="mt-4 flex-1 flex items-end gap-1">
            {isRunning && (
              <div className="w-full h-16 flex items-end justify-between px-1">
                <div className="w-2 bg-primary/20 h-8 rounded-t-sm"></div>
                <div className="w-2 bg-primary/20 h-12 rounded-t-sm"></div>
                <div className="w-2 bg-primary/20 h-10 rounded-t-sm"></div>
                <div className="w-2 bg-primary/40 h-14 rounded-t-sm"></div>
                <div className="w-2 bg-primary/60 h-16 rounded-t-sm"></div>
                <div className="w-2 bg-primary/40 h-12 rounded-t-sm"></div>
                <div className="w-2 bg-primary/20 h-8 rounded-t-sm"></div>
                <div className="w-2 bg-primary/50 h-11 rounded-t-sm"></div>
                <div className="w-2 bg-primary h-14 rounded-t-sm"></div>
              </div>
            )}
          </div>
        </div>

        <div className="col-span-4 bg-surface-container rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start">
              <p className="text-on-surface-variant font-headline text-sm font-bold tracking-wider uppercase">内存占用</p>
              <span className="text-tertiary-dim font-headline text-2xl font-black">{isRunning ? '4.2 GB' : '0 MB'}</span>
            </div>
          </div>
          <div className="mt-4">
            <div className="w-full bg-surface-container-lowest h-2 rounded-full overflow-hidden">
              <div className={`h-full bg-gradient-to-r from-tertiary-dim to-tertiary shadow-[0_0_10px_rgba(0,239,153,0.3)] ${isRunning ? 'w-[62%]' : 'w-0'}`}></div>
            </div>
            <div className="flex justify-between mt-2">
              <span className="text-[10px] text-on-surface-variant uppercase font-bold tracking-widest">0 GB</span>
              <span className="text-[10px] text-on-surface-variant uppercase font-bold tracking-widest">8 GB 限制</span>
            </div>
          </div>
        </div>

        <div className="col-span-4 bg-surface-container rounded-2xl p-6 relative overflow-hidden">
           <p className="text-on-surface-variant font-headline text-sm font-bold tracking-wider uppercase mb-4">执行命令</p>
           <div className="font-mono text-sm text-primary break-all">
             {service.command}
           </div>
           {service.urlTemplate && (
             <div className="mt-4">
                <p className="text-on-surface-variant font-headline text-xs font-bold tracking-wider uppercase mb-1">访问地址</p>
                <a href={service.urlTemplate.replace('{port}', String(service.port))} target="_blank" rel="noreferrer" className="text-tertiary-dim text-sm hover:underline">
                  {service.urlTemplate.replace('{port}', String(service.port))}
                </a>
             </div>
           )}
        </div>
      </div>

      {/* Bottom Half: Console Window */}
      <div className="flex-1 px-10 pb-10 overflow-hidden flex flex-col">
        <div className="flex-1 bg-surface-container-lowest rounded-2xl relative overflow-hidden flex flex-col shadow-2xl border border-outline-variant/10">
          <div className="h-10 bg-surface-container-highest/50 px-5 flex items-center justify-between border-b border-outline-variant/5 shrink-0">
            <div className="flex items-center gap-3">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-error-dim/40"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500/40"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-tertiary-dim/40"></div>
              </div>
              <span className="text-[10px] font-mono text-on-surface-variant uppercase tracking-widest ml-2">控制台输出 — {service.id}</span>
            </div>
            <div className="flex items-center gap-4 text-[10px] font-mono text-on-surface-variant">
              <button onClick={onOpenLogsDir} className="hover:text-primary transition-colors flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">folder_open</span> 打开日志目录
              </button>
              <span className="mx-2 opacity-30">|</span>
              <button onClick={onClearLogs} className="hover:text-primary transition-colors flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">delete</span> 清空当前
              </button>
            </div>
          </div>

          <div ref={consoleRef} className="flex-1 overflow-y-auto p-6 font-mono text-sm relative custom-scrollbar">
            <div className="scanline-overlay absolute inset-0 z-10 opacity-10 pointer-events-none"></div>
            <div className="space-y-1 relative z-0">
              {logs.map((log, idx) => (
                <div key={idx} className="flex gap-4 hover:bg-white/5 px-2 -mx-2 rounded">
                  <span className="text-on-surface-variant shrink-0 select-none">{String(idx + 1).padStart(4, ' ')}</span>
                  <span className={`break-all whitespace-pre-wrap ${log.type === 'error' ? 'text-error' : log.type === 'warn' ? 'text-amber-400' : 'text-on-surface/80'}`}>
                    {log.text}
                  </span>
                </div>
              ))}
              {logs.length === 0 && <div className="text-slate-600 italic">等待输出...</div>}
              {isRunning && (
                <div className="flex gap-4 animate-pulse pt-2">
                  <span className="w-2 h-4 bg-primary/40 inline-block"></span>
                </div>
              )}
            </div>
          </div>

          <div className="h-12 bg-surface-container-highest/30 px-5 flex items-center border-t border-outline-variant/5 shrink-0">
            <span className="text-primary font-bold font-mono mr-3">~$</span>
            <span className="text-on-surface-variant/40 font-mono text-sm italic">Service input not attached...</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServiceDetailsView;
