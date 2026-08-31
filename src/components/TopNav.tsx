import React from 'react';
import { Bell, Settings, HelpCircle, AlertTriangle, RefreshCw, Cloud } from 'lucide-react';
import { TabType } from '../types';

interface TopNavProps {
  currentTab: TabType;
  reorderCount: number;
  onQuickFilterReorder?: () => void;
  onResetData?: () => void;
  isCloudConnected?: boolean;
}

export const TopNav: React.FC<TopNavProps> = ({
  currentTab,
  reorderCount,
  onQuickFilterReorder,
  onResetData,
  isCloudConnected = true,
}) => {
  const getTabTitle = (tab: TabType) => {
    switch (tab) {
      case 'dashboard':
        return 'Executive Operations Dashboard';
      case 'inventory':
        return 'Inventory';
      case 'pull_out':
        return 'Pull Out Management';
      case 'deployment':
        return 'Manpower Deployment & Logistics';
      case 'projects':
        return 'Projects Allocation & Milestones';
      case 'purchases':
        return 'Purchases & Reorders';
      default:
        return 'Inventory';
    }
  };

  return (
    <header
      id="app-top-nav"
      className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-20 shadow-xs"
    >
      {/* Tab Title & Cloud Sync Badge */}
      <div className="flex items-center space-x-3">
        <h1 className="text-xl font-bold text-slate-800 tracking-tight">
          {getTabTitle(currentTab)}
        </h1>

        {/* Live Cloud Database Connected Badge */}
        <div
          className="hidden md:flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200"
          title="All devices and users are connected to the shared Cloud Firestore database in real-time"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <Cloud className="w-3 h-3 text-emerald-600" />
          <span>Cloud Synced (Shared)</span>
        </div>

        {currentTab === 'inventory' && reorderCount > 0 && (
          <button
            onClick={onQuickFilterReorder}
            className="hidden sm:inline-flex items-center space-x-1.5 px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 transition-colors cursor-pointer"
            title="Click to view items needing replenishment"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            <span>{reorderCount} item(s) for replenishment</span>
          </button>
        )}
      </div>

      {/* Right Controls */}
      <div className="flex items-center space-x-4">
        {/* Quick Reset Mock Data if user wants clean slate */}
        {onResetData && (
          <button
            onClick={onResetData}
            title="Reset to default seed data"
            className="hidden md:flex items-center space-x-1 px-2.5 py-1 text-xs text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reset Demo Data</span>
          </button>
        )}

        {/* Action icons */}
        <div className="flex items-center space-x-1 border-r border-slate-200 pr-3">
          <button
            id="btn-notifications"
            onClick={onQuickFilterReorder}
            className="relative p-2 rounded-full text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            title={reorderCount > 0 ? `${reorderCount} items need replenish` : 'No new notifications'}
          >
            <Bell className="w-5 h-5" />
            {reorderCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full ring-2 ring-white animate-pulse" />
            )}
          </button>

          <button
            id="btn-settings"
            className="p-2 rounded-full text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Settings"
          >
            <Settings className="w-5 h-5" />
          </button>

          <button
            id="btn-help"
            className="p-2 rounded-full text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Help & Documentation"
          >
            <HelpCircle className="w-5 h-5" />
          </button>
        </div>

        {/* User Profile */}
        <div id="user-profile-badge" className="flex items-center space-x-3 pl-1">
          <div className="w-9 h-9 rounded-full bg-[#0d1b2a] text-white flex items-center justify-center text-xs font-bold shadow-xs">
            DSI
          </div>
          <div className="hidden sm:block text-left">
            <div className="text-xs font-semibold text-slate-800 leading-tight">
              Administrator
            </div>
            <div className="text-[11px] text-slate-500 font-medium">
              System Admin
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
