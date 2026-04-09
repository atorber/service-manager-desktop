import React from 'react';
import packageJson from '../../../package.json';

export type ViewType = 'dashboard' | 'create' | 'logs' | 'settings';

interface SidebarProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, onViewChange }) => {
  const version = `v${packageJson.version}`;
  const getNavClass = (view: ViewType) => {
    const baseClass = "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 font-['Space_Grotesk'] font-bold tracking-tight active:scale-95 ";
    if (currentView === view) {
      return baseClass + "text-[#00E5FF] bg-[#00E5FF]/10 border-r-4 border-[#00E5FF] shadow-[0_0_15px_rgba(0,229,255,0.2)]";
    }
    return baseClass + "text-slate-500 hover:text-slate-200 hover:bg-white/5";
  };

  return (
    <aside className="h-screen w-64 fixed left-0 top-0 z-40 bg-gradient-to-b from-[#16191d] to-[#0c0e10] shadow-[10px_0_30px_rgba(0,0,0,0.5)] flex flex-col py-8 px-4">
      <div className="mb-10 px-2">
        <h1 className="text-xl font-black text-[#00E5FF] uppercase tracking-widest font-['Space_Grotesk']">Service Manager</h1>
        <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-[0.2em]">System Engine {version}</p>
      </div>

      <nav className="flex-1 space-y-2">
        <button
          className={getNavClass('dashboard') + " w-full text-left"}
          onClick={() => onViewChange('dashboard')}
        >
          <span className="material-symbols-outlined" style={{ fontVariationSettings: currentView === 'dashboard' ? "'FILL' 1" : "'FILL' 0" }}>dashboard</span>
          <span>仪表盘</span>
        </button>

        <button
          className={getNavClass('create') + " w-full text-left"}
          onClick={() => onViewChange('create')}
        >
          <span className="material-symbols-outlined" style={{ fontVariationSettings: currentView === 'create' ? "'FILL' 1" : "'FILL' 0" }}>add_box</span>
          <span>创建服务</span>
        </button>

        <button
          className={getNavClass('logs') + " w-full text-left"}
          onClick={() => onViewChange('logs')}
        >
          <span className="material-symbols-outlined" style={{ fontVariationSettings: currentView === 'logs' ? "'FILL' 1" : "'FILL' 0" }}>terminal</span>
          <span>日志</span>
        </button>

        <button
          className={getNavClass('settings') + " w-full text-left"}
          onClick={() => onViewChange('settings')}
        >
          <span className="material-symbols-outlined" style={{ fontVariationSettings: currentView === 'settings' ? "'FILL' 1" : "'FILL' 0" }}>settings</span>
          <span>设置</span>
        </button>
      </nav>

      <div className="mt-auto pt-6 border-t border-outline-variant/10 flex items-center gap-3 px-2">
        <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center overflow-hidden ring-1 ring-primary/20">
          <img
            alt="管理员用户"
            className="w-full h-full object-cover"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuCrDrVUCrYrm4zESosx69cMAqIPikP_XafMCwkZy4oOWIqZTJnBrpqFpG_pXHtSBC3YIUvPAmQyHeNTC30xiXNkh3m4mohFE6K7V77MAIapS3vEb4Z-bEt6G6mYNW1LF1Z3GcsNFdeAYFViyh0GEvnfkZnxK88iNf2vYd-htwwUB0mmuafyz1EPgKuVsBSbbR0DNJ4M5UCbmxN-7ck5SPIoPOfztwyO88mwKWfnK2MWizUsu36QonCzDH8YyikwiVHXCDjuP3j3iCw"
          />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-bold text-on-surface">Admin User</span>
          <span className="text-[10px] text-primary uppercase tracking-tighter">Root Access</span>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
