import React from 'react';

interface TopNavBarProps {
  onRefresh?: () => void;
}

const TopNavBar: React.FC<TopNavBarProps> = ({ onRefresh }) => {
  return (
    <header className="fixed top-0 right-0 left-64 h-20 z-30 bg-[#0c0e10]/80 backdrop-blur-xl flex justify-between items-center px-10 w-full font-['Space_Grotesk'] text-sm font-medium">
      <div className="flex items-center gap-6 w-1/3">
        <div className="relative w-full max-w-md group">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-lg group-focus-within:text-primary transition-colors">
            search
          </span>
          <input
            className="w-full bg-surface-container-highest/50 border-0 border-b-2 border-transparent focus:border-primary focus:ring-0 text-on-surface pl-11 py-2 text-sm transition-all rounded-t-lg outline-none"
            placeholder="搜索运行节点..."
            type="text"
          />
        </div>
      </div>

      <div className="flex items-center gap-8">
        <div className="flex flex-col items-end">
          <span className="text-[10px] text-slate-500 uppercase tracking-widest">系统负载</span>
          <span className="text-[#00E5FF] font-bold">CPU 24% | RAM 4.2GB</span>
        </div>

        <div className="flex items-center gap-5 text-slate-400">
          <button
            className="material-symbols-outlined hover:text-[#00E5FF] transition-colors cursor-pointer active:opacity-70"
            onClick={onRefresh}
          >
            refresh
          </button>
          <button className="relative hover:text-[#00E5FF] transition-colors cursor-pointer active:opacity-70">
            <span className="material-symbols-outlined">notifications_active</span>
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-error rounded-full"></span>
          </button>
          <button className="material-symbols-outlined text-2xl hover:text-[#00E5FF] transition-colors cursor-pointer active:opacity-70">
            account_circle
          </button>
        </div>
      </div>
    </header>
  );
};

export default TopNavBar;
