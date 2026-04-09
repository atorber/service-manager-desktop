import React from 'react';

interface TopNavBarProps {
  onRefresh?: () => void;
  showBackButton?: boolean;
  onBack?: () => void;
}

const TopNavBar: React.FC<TopNavBarProps> = ({ onRefresh, showBackButton, onBack }) => {
  return (
    <header className="fixed top-0 right-0 left-64 h-20 z-30 bg-[#0c0e10]/80 backdrop-blur-xl flex justify-between items-center px-10 w-full font-['Space_Grotesk'] text-sm font-medium">
      <div className="flex items-center gap-6 w-1/3">
        {showBackButton && (
          <button
            onClick={onBack}
            className="px-4 py-2 rounded-lg bg-surface-container-highest/60 text-on-surface-variant hover:text-primary hover:bg-surface-container-highest transition-all flex items-center gap-2 border border-outline-variant/20 active:scale-95"
          >
            <span className="material-symbols-outlined text-lg">arrow_back</span>
            返回
          </button>
        )}
      </div>

      <div className="flex items-center gap-8">
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
