import React from 'react';
import { Package, ShoppingBag, Users, FolderKanban, ShoppingCart, AlertCircle } from 'lucide-react';
import { TabType } from '../types';

interface SidebarProps {
  currentTab: TabType;
  onSelectTab: (tab: TabType) => void;
  reorderAlertCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  reorderAlertCount,
}) => {
  const navItems = [
    {
      id: 'inventory' as TabType,
      label: 'Inventory',
      icon: Package,
      badge: reorderAlertCount > 0 ? reorderAlertCount : null,
      badgeColor: 'bg-amber-500 text-white',
    },
    {
      id: 'pull_out' as TabType,
      label: 'Pull Out',
      icon: ShoppingBag,
    },
    {
      id: 'deployment' as TabType,
      label: 'Deployment',
      icon: Users,
    },
    {
      id: 'projects' as TabType,
      label: 'Projects',
      icon: FolderKanban,
    },
    {
      id: 'purchases' as TabType,
      label: 'Purchases',
      icon: ShoppingCart,
      badge: reorderAlertCount > 0 ? 'PO' : null,
      badgeColor: 'bg-teal-500 text-white',
    },
  ];

  return (
    <aside
      id="app-sidebar"
      className="w-64 bg-[#0d1b2a] text-slate-200 flex flex-col flex-shrink-0 min-h-screen select-none transition-all duration-200 border-r border-slate-800"
    >
      {/* Brand Header */}
      <div className="px-6 py-6 border-b border-slate-800/80">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-teal-500/15 border border-teal-400/30 flex items-center justify-center text-teal-400 font-extrabold shadow-inner">
            <span className="text-base tracking-tight font-black">DS<span className="text-teal-300 font-bold lowercase text-sm">i</span></span>
          </div>
          <div>
            <h1 className="text-base font-bold text-white tracking-tight leading-tight">
              diversifiedsource
            </h1>
            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-semibold">
              INCORPORATED
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 px-3 py-6 space-y-1.5 overflow-y-auto">
        <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          Core Operations
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              id={`nav-tab-${item.id}`}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium transition-all duration-150 group ${
                isActive
                  ? 'bg-teal-600 text-white shadow-md shadow-teal-900/30'
                  : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
              }`}
            >
              <div className="flex items-center space-x-3.5">
                <Icon
                  className={`w-5 h-5 transition-colors ${
                    isActive ? 'text-white' : 'text-slate-400 group-hover:text-teal-400'
                  }`}
                />
                <span>{item.label}</span>
              </div>

              {item.badge && (
                <span
                  className={`px-2 py-0.5 text-[11px] font-bold rounded-full ${
                    item.badgeColor || 'bg-slate-700 text-white'
                  }`}
                  title={`${item.badge} notifications`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Reorder Summary Quick Alert Banner in Sidebar */}
      {reorderAlertCount > 0 && (
        <div className="p-3 mx-3 mb-4 rounded-lg bg-amber-950/40 border border-amber-500/30 text-amber-200 text-xs">
          <div className="flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-300">Replenish Alert</p>
              <p className="text-[11px] text-amber-200/80 mt-0.5">
                {reorderAlertCount} item(s) below reorder threshold.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Footer Info */}
      <div className="p-4 border-t border-slate-800/80 text-slate-400 text-xs flex items-center justify-between">
        <div>
          <span className="block text-slate-300 font-medium">Inventory System</span>
          <span className="text-[10px] text-slate-400">v2.4.0 • Real-time DB</span>
        </div>
        <div className="w-2 h-2 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20" title="System Online" />
      </div>
    </aside>
  );
};
