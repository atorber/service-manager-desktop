import React from 'react';

const SettingsView: React.FC = () => {
  return (
    <main className="p-12 min-h-[calc(100vh-5rem)]">
      {/* Header Section */}
      <div className="mb-12">
        <h2 className="text-4xl font-black font-headline tracking-tighter text-on-surface mb-2">全局设置</h2>
        <p className="text-on-surface-variant max-w-2xl font-light">配置服务网格的核心引擎行为、网络协议和诊断日志保留策略。</p>
      </div>

      {/* Bento Grid Layout for Settings */}
      <div className="grid grid-cols-12 gap-8 items-start">

        {/* General Settings Section (Main Card) */}
        <section className="col-span-12 lg:col-span-8 glass-panel rounded-xl p-8 border border-white/5">
          <div className="flex items-center gap-3 mb-8">
            <span className="p-2 rounded bg-primary/10 text-primary">
              <span className="material-symbols-outlined">tune</span>
            </span>
            <h3 className="text-xl font-bold font-headline uppercase tracking-wide">常规配置</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
            {/* Language Selection */}
            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest">界面语言</label>
              <div className="relative">
                <select className="w-full bg-surface-container-lowest border-none text-on-surface p-4 rounded-lg appearance-none focus:ring-1 focus:ring-primary outline-none transition-all cursor-pointer">
                  <option defaultValue="zh-cn">简体中文</option>
                  <option>English (United States)</option>
                  <option>Deutsch (Standard)</option>
                  <option>日本語 (Japan)</option>
                  <option>Cyber-Synth 0.1</option>
                </select>
                <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">expand_more</span>
              </div>
            </div>

            {/* Theme Engine */}
            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest">视觉引擎</label>
              <div className="flex bg-surface-container-lowest p-1 rounded-lg">
                <button className="flex-1 py-3 px-4 rounded bg-primary/20 text-primary font-bold text-sm transition-all">深邃动能</button>
                <button className="flex-1 py-3 px-4 rounded text-slate-500 hover:text-on-surface font-medium text-sm transition-all">太阳耀斑</button>
                <button className="flex-1 py-3 px-4 rounded text-slate-500 hover:text-on-surface font-medium text-sm transition-all">系统默认</button>
              </div>
            </div>

            {/* Auto-start Toggle */}
            <div className="flex items-center justify-between p-4 bg-surface-container-lowest/50 rounded-lg border border-outline-variant/10">
              <div>
                <h4 className="font-bold text-on-surface">开机自启动</h4>
                <p className="text-xs text-on-surface-variant">在系统启动时初始化引擎</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" defaultChecked />
                <div className="w-11 h-6 bg-surface-container-highest rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-container"></div>
              </label>
            </div>

            {/* Update Channel */}
            <div className="flex items-center justify-between p-4 bg-surface-container-lowest/50 rounded-lg border border-outline-variant/10">
              <div>
                <h4 className="font-bold text-on-surface">测试版更新</h4>
                <p className="text-xs text-on-surface-variant">获取抢先体验功能版本</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" />
                <div className="w-11 h-6 bg-surface-container-highest rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-container"></div>
              </label>
            </div>
          </div>
        </section>

        {/* Network Settings (Asymmetric Small Card) */}
        <section className="col-span-12 lg:col-span-4 flex flex-col gap-8">
          <div className="glass-panel rounded-xl p-6 border border-white/5">
            <div className="flex items-center gap-3 mb-6">
              <span className="p-2 rounded bg-tertiary-dim/10 text-tertiary-dim">
                <span className="material-symbols-outlined">hub</span>
              </span>
              <h3 className="text-lg font-bold font-headline uppercase tracking-wide">网络中转</h3>
            </div>
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">代理地址</label>
                <input type="text" className="w-full bg-surface-container-lowest border-b-2 border-primary focus:border-tertiary-dim text-on-surface p-2 text-sm font-mono transition-all outline-none" defaultValue="127.0.0.1:8080" />
              </div>
              <div className="space-y-2">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">监听端口</label>
                <div className="flex gap-2">
                  <span className="px-2 py-1 rounded bg-surface-container-highest text-primary text-xs font-mono">8080</span>
                  <span className="px-2 py-1 rounded bg-surface-container-highest text-primary text-xs font-mono">443</span>
                  <button className="px-2 py-1 rounded bg-surface-container-highest text-slate-500 hover:text-primary text-xs font-mono transition-colors">+ Add</button>
                </div>
              </div>
              <button className="w-full py-2 bg-primary/10 text-primary border border-primary/20 rounded font-bold text-xs uppercase tracking-widest hover:bg-primary hover:text-on-primary transition-all active:scale-95">测试连通性</button>
            </div>
          </div>

          <div className="bg-surface-container-lowest rounded-xl p-6 border border-outline-variant/10 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
              <span className="material-symbols-outlined text-6xl">security</span>
            </div>
            <h4 className="text-sm font-bold text-on-surface mb-2">安全状态</h4>
            <p className="text-xs text-on-surface-variant mb-4 leading-relaxed">默认情况下，所有网络流量均通过 TLS 1.3 协议加密。</p>
            <a href="#" className="text-[10px] text-tertiary-dim font-black uppercase tracking-tighter flex items-center gap-1 hover:underline">管理证书 <span className="material-symbols-outlined text-xs">arrow_forward</span></a>
          </div>
        </section>

        {/* Log Management (Full Width Inset Style) */}
        <section className="col-span-12 bg-surface-container-low rounded-2xl p-10 border border-outline-variant/5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="p-2 rounded bg-amber-500/10 text-amber-500">
                  <span className="material-symbols-outlined">analytics</span>
                </span>
                <h3 className="text-2xl font-bold font-headline uppercase tracking-tight">诊断与保留</h3>
              </div>
              <p className="text-on-surface-variant text-sm">监控数据吞吐量并自动化存储清理周期。</p>
            </div>
            <div className="flex gap-4">
              <div className="px-6 py-4 bg-surface-container-lowest rounded-xl flex flex-col justify-center border border-outline-variant/10">
                <span className="text-[10px] text-slate-500 uppercase font-black">当前大小</span>
                <span className="text-2xl font-black text-primary">12.4 GB</span>
              </div>
              <div className="px-6 py-4 bg-surface-container-lowest rounded-xl flex flex-col justify-center border border-outline-variant/10">
                <span className="text-[10px] text-slate-500 uppercase font-black">可用空间</span>
                <span className="text-2xl font-black text-tertiary-dim">188 GB</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-on-surface uppercase tracking-widest flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>保留周期
              </h4>
              <div className="p-4 bg-surface-container-lowest rounded-lg">
                <input type="range" className="w-full accent-primary bg-surface-container-highest rounded-lg h-1.5 mb-2 cursor-pointer" />
                <div className="flex justify-between text-[10px] font-mono text-slate-400">
                  <span>1 天</span>
                  <span className="text-primary font-bold">30 天</span>
                  <span>365 天</span>
                </div>
              </div>
              <p className="text-xs text-on-surface-variant italic">超过 30 天的日志将被自动清除或存档。</p>
            </div>

            <div className="space-y-4">
              <h4 className="text-sm font-bold text-on-surface uppercase tracking-widest flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>存储限制
              </h4>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <input type="number" defaultValue="50" className="bg-surface-container-lowest border-none w-20 rounded p-2 text-sm font-mono text-primary outline-none focus:ring-1 focus:ring-primary" />
                  <span className="text-xs font-bold text-slate-500">GB</span>
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" defaultChecked className="rounded border-none bg-surface-container-highest text-primary focus:ring-0 cursor-pointer" />
                  <span className="text-xs text-on-surface-variant">空间存满时覆盖最早的数据</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-sm font-bold text-on-surface uppercase tracking-widest flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>导出路径
              </h4>
              <div className="flex items-center gap-2 p-2 bg-surface-container-lowest rounded-lg border border-outline-variant/10">
                <span className="material-symbols-outlined text-slate-500">folder_open</span>
                <span className="text-xs font-mono text-on-surface-variant truncate">/var/log/service_manager/production/core_v24/</span>
                <button className="ml-auto p-1 text-primary hover:bg-primary/10 rounded transition-colors">
                  <span className="material-symbols-outlined text-sm">edit</span>
                </button>
              </div>
              <button className="flex items-center gap-2 text-[10px] font-bold text-amber-500 uppercase tracking-widest hover:underline transition-all">
                <span className="material-symbols-outlined text-sm">delete_forever</span> 立即清除所有日志
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* Footer Actions */}
      <div className="fixed bottom-10 right-10 flex gap-4 z-20">
        <button className="px-8 py-3 bg-surface-container-highest text-on-surface rounded-xl font-bold hover:bg-surface-bright transition-all active:scale-95 shadow-xl border border-outline-variant/20">放弃修改</button>
        <button className="px-10 py-3 bg-gradient-to-r from-primary to-primary-container text-on-primary-container rounded-xl font-black uppercase tracking-widest hover:brightness-110 transition-all active:scale-95 shadow-[0_0_30px_rgba(0,229,255,0.3)]">部署设置</button>
      </div>
    </main>
  );
};

export default SettingsView;
