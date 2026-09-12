import React, { useState, useRef } from 'react';
import {
  Bell,
  Settings,
  HelpCircle,
  AlertTriangle,
  RefreshCw,
  Cloud,
  LogOut,
  KeyRound,
  ChevronDown,
  Shield,
  Download,
  Upload,
  HardDriveDownload,
  HardDriveUpload,
} from 'lucide-react';
import { TabType } from '../types';
import { AuthUser } from '../utils/authService';

interface TopNavProps {
  currentTab: TabType;
  reorderCount: number;
  onQuickFilterReorder?: () => void;
  onResetData?: () => void;
  onDownloadData?: () => void;
  onUploadDataFile?: (file: File) => void;
  isCloudConnected?: boolean;
  user?: AuthUser | null;
  onLogout?: () => void;
  onChangePassword?: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({
  currentTab,
  reorderCount,
  onQuickFilterReorder,
  onResetData,
  onDownloadData,
  onUploadDataFile,
  isCloudConnected = true,
  user,
  onLogout,
  onChangePassword,
}) => {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onUploadDataFile) {
      onUploadDataFile(file);
    }
    // Reset file input value so user can pick the same file again if needed
    if (e.target) {
      e.target.value = '';
    }
  };

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
      className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-20 shadow-xs select-none"
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
          <span>Cloud Synced</span>
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
      <div className="flex items-center space-x-2 sm:space-x-2.5">
        {/* Hidden File Input for Upload Data */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".json,application/json"
          className="hidden"
          id="backup-file-upload-input"
        />

        {/* Upper Right Backup & Restore Group */}
        <div className="flex items-center space-x-1.5 bg-slate-50/80 p-1 rounded-xl border border-slate-200 shadow-2xs">
          {/* Download Data Button */}
          <button
            id="btn-download-data"
            type="button"
            onClick={onDownloadData}
            title="Download Data (Export complete JSON backup of Inventory, Projects, Pull Outs, Deployment, Purchases)"
            className="flex items-center space-x-1.5 px-2.5 py-1.5 text-xs font-bold text-teal-700 hover:text-white bg-white hover:bg-teal-600 border border-teal-200 hover:border-teal-600 rounded-lg transition-all cursor-pointer shadow-2xs active:scale-95"
          >
            <Download className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">Download Data</span>
            <span className="sm:hidden text-[11px]">Download</span>
          </button>

          {/* Upload Data Button */}
          <button
            id="btn-upload-data"
            type="button"
            onClick={() => fileInputRef.current?.click()}
            title="Upload Data (Restore and import system data from previously downloaded backup JSON file)"
            className="flex items-center space-x-1.5 px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:text-teal-900 bg-white hover:bg-slate-100 border border-slate-200 hover:border-teal-300 rounded-lg transition-all cursor-pointer shadow-2xs active:scale-95"
          >
            <Upload className="w-3.5 h-3.5 text-slate-600 shrink-0" />
            <span className="hidden sm:inline">Upload Data</span>
            <span className="sm:hidden text-[11px]">Upload</span>
          </button>
        </div>

        {/* Quick Reset Mock Data if user wants clean slate */}
        {onResetData && (
          <button
            onClick={onResetData}
            title="Reset to default seed data"
            className="hidden xl:flex items-center space-x-1 px-2.5 py-1 text-xs text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reset Demo</span>
          </button>
        )}

        {/* Action icons */}
        <div className="flex items-center space-x-1 border-r border-slate-200 pr-1 sm:pr-2">
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
            onClick={onChangePassword}
            className="p-2 rounded-full text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Security & Password Settings"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>

        {/* User Profile & Logout Menu */}
        <div className="relative">
          <button
            id="user-profile-menu-trigger"
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="flex items-center space-x-2.5 pl-1 pr-2 py-1 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer text-left"
          >
            <div className="w-9 h-9 rounded-xl bg-[#0d1b2a] text-white flex items-center justify-center text-xs font-bold shadow-xs border border-slate-700">
              {user?.username ? user.username.substring(0, 2).toUpperCase() : 'AD'}
            </div>
            <div className="hidden sm:block">
              <div className="text-xs font-bold text-slate-800 leading-tight">
                {user?.name || 'Administrator'}
              </div>
              <div className="text-[10px] text-slate-500 font-medium capitalize">
                @{user?.username || 'admin'} • {user?.role || 'admin'}
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
          </button>

          {/* User Dropdown Menu */}
          {isUserMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-30"
                onClick={() => setIsUserMenuOpen(false)}
              />
              <div
                id="user-dropdown-menu"
                className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-40 animate-in fade-in zoom-in-95 duration-150"
              >
                <div className="px-4 py-2 border-b border-slate-100">
                  <div className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                    <Shield className="w-3.5 h-3.5 text-teal-600" />
                    <span>Signed In</span>
                  </div>
                  <div className="text-[11px] text-slate-500 truncate mt-0.5">
                    {user?.name || 'Administrator'} ({user?.username || 'admin'})
                  </div>
                </div>

                <div className="py-1">
                  {onDownloadData && (
                    <button
                      id="menu-btn-download-data"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        onDownloadData();
                      }}
                      className="w-full px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center space-x-2.5 transition-colors cursor-pointer"
                    >
                      <Download className="w-4 h-4 text-teal-600" />
                      <span>Download Data (Backup)</span>
                    </button>
                  )}

                  {onUploadDataFile && (
                    <button
                      id="menu-btn-upload-data"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        fileInputRef.current?.click();
                      }}
                      className="w-full px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center space-x-2.5 transition-colors cursor-pointer"
                    >
                      <Upload className="w-4 h-4 text-indigo-600" />
                      <span>Upload Data (Restore)</span>
                    </button>
                  )}

                  {onChangePassword && (
                    <button
                      id="menu-btn-change-password"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        onChangePassword();
                      }}
                      className="w-full px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center space-x-2.5 transition-colors cursor-pointer"
                    >
                      <KeyRound className="w-4 h-4 text-slate-500" />
                      <span>Change Password</span>
                    </button>
                  )}
                </div>

                <div className="border-t border-slate-100 pt-1">
                  {onLogout && (
                    <button
                      id="menu-btn-logout"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        onLogout();
                      }}
                      className="w-full px-4 py-2 text-xs text-rose-600 hover:bg-rose-50 font-semibold flex items-center space-x-2.5 transition-colors cursor-pointer"
                    >
                      <LogOut className="w-4 h-4 text-rose-500" />
                      <span>Sign Out (Logout)</span>
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Direct Logout Button in Header */}
        {onLogout && (
          <button
            id="btn-direct-logout"
            onClick={onLogout}
            title="Log out of application"
            className="hidden md:inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 transition-colors cursor-pointer shadow-2xs"
          >
            <LogOut className="w-3.5 h-3.5 text-slate-500 group-hover:text-rose-600" />
            <span>Sign Out</span>
          </button>
        )}
      </div>
    </header>
  );
};
