import React from 'react';
import Sidebar, { ViewType } from './Sidebar';
import TopNavBar from './TopNavBar';

interface BaseLayoutProps {
  children: React.ReactNode;
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
  onRefresh?: () => void;
}

const BaseLayout: React.FC<BaseLayoutProps> = ({ children, currentView, onViewChange, onRefresh }) => {
  return (
    <div className="min-h-screen bg-background text-on-surface flex flex-col font-body selection:bg-primary/30">
      <Sidebar currentView={currentView} onViewChange={onViewChange} />
      <TopNavBar onRefresh={onRefresh} />

      {/* Main Content Area */}
      {/*
        Depending on the view, we might need padding or different flex layouts.
        The Dashboard needs `ml-64 pt-28 px-10 pb-12` while ServiceDetails needs `ml-64 pt-20 h-screen flex flex-col`.
        We'll let the children views handle their inner padding and specific classes,
        but we'll provide the base margin and min-height here.
      */}
      <div className="ml-64 pt-20 min-h-screen w-[calc(100%-16rem)]">
         {children}
      </div>

      {/* Overlay Scanline Texture (Global) */}
      <div className="fixed inset-0 pointer-events-none z-50 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.02),rgba(0,255,0,0.01),rgba(0,0,255,0.02))] bg-[length:100%_4px,3px_100%] opacity-20"></div>
    </div>
  );
};

export default BaseLayout;
