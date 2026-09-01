import React, { useState, useEffect } from 'react';
import {
  Database,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  RefreshCw,
  ExternalLink,
  Save,
  Trash2,
  HelpCircle,
  X,
  UploadCloud,
  DownloadCloud,
  ShieldCheck,
  Server,
} from 'lucide-react';
import {
  supabaseService,
  SUPABASE_SETUP_SQL,
  SupabaseConfig,
} from '../utils/supabaseService';

interface SupabaseSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSyncComplete?: () => void;
  onConfigChanged?: () => void;
  onPushLocalToCloud?: () => Promise<void>;
  onPullCloudToLocal?: () => Promise<void>;
}

export const SupabaseSettingsModal: React.FC<SupabaseSettingsModalProps> = ({
  isOpen,
  onClose,
  onSyncComplete,
  onConfigChanged,
  onPushLocalToCloud,
  onPullCloudToLocal,
}) => {
  const [url, setUrl] = useState('');
  const [anonKey, setAnonKey] = useState('');
  const [isEnvConfig, setIsEnvConfig] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message?: string;
    error?: string;
    tableExists?: boolean;
  } | null>(null);

  const [copiedSql, setCopiedSql] = useState(false);
  const [isPushing, setIsPushing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const { config, isFromEnv } = supabaseService.getStoredConfig();
      if (config) {
        setUrl(config.url);
        setAnonKey(config.anonKey);
      } else {
        setUrl('');
        setAnonKey('');
      }
      setIsEnvConfig(isFromEnv);
      setTestResult(null);
      setActionSuccessMsg(null);

      // Auto test if config exists
      if (config?.url && config?.anonKey) {
        handleTest(config.url, config.anonKey);
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTest = async (testUrl?: string, testKey?: string) => {
    setIsTesting(true);
    setTestResult(null);
    setActionSuccessMsg(null);

    const targetUrl = testUrl || url;
    const targetKey = testKey || anonKey;

    const res = await supabaseService.testConnection(targetUrl, targetKey);
    setTestResult(res);
    setIsTesting(false);
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionSuccessMsg(null);

    if (!url.trim() || !anonKey.trim()) {
      setTestResult({
        success: false,
        error: 'Please enter both Supabase Project URL and Anon API Key.',
      });
      return;
    }

    supabaseService.saveConfig(url.trim(), anonKey.trim());
    await handleTest(url.trim(), anonKey.trim());
    setActionSuccessMsg('Supabase credentials saved successfully!');
    if (onConfigChanged) onConfigChanged();
    if (onSyncComplete) onSyncComplete();
  };

  const handleClearConfig = () => {
    supabaseService.clearConfig();
    setUrl('');
    setAnonKey('');
    setTestResult(null);
    setActionSuccessMsg('Supabase configuration cleared. Reverted to local storage.');
    if (onConfigChanged) onConfigChanged();
    if (onSyncComplete) onSyncComplete();
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SETUP_SQL);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  const handlePush = async () => {
    if (!onPushLocalToCloud) return;
    setIsPushing(true);
    setActionSuccessMsg(null);
    try {
      await onPushLocalToCloud();
      setActionSuccessMsg('All local inventory, projects, and tickets successfully uploaded to Supabase!');
    } catch (e: any) {
      setTestResult({ success: false, error: e?.message || 'Failed uploading data to Supabase.' });
    } finally {
      setIsPushing(false);
    }
  };

  const handlePull = async () => {
    if (!onPullCloudToLocal) return;
    setIsPulling(true);
    setActionSuccessMsg(null);
    try {
      await onPullCloudToLocal();
      setActionSuccessMsg('Successfully downloaded and synchronized latest data from Supabase!');
    } catch (e: any) {
      setTestResult({ success: false, error: e?.message || 'Failed syncing data from Supabase.' });
    } finally {
      setIsPulling(false);
    }
  };

  return (
    <div
      id="supabase-settings-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto"
    >
      <div
        id="supabase-settings-modal-container"
        className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden my-6 animate-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="bg-[#0d1b2a] text-white px-6 py-5 flex items-center justify-between border-b border-slate-800 relative">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400 shadow-inner">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center space-x-2">
                <span>Supabase Cloud Database Settings</span>
                <span className="text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Shared Multi-User
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Persistent real-time storage across all devices, users, and Vercel deployments
              </p>
            </div>
          </div>

          <button
            id="btn-close-supabase-modal"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Status Banner */}
          {testResult && (
            <div
              id="supabase-status-alert"
              className={`p-4 rounded-2xl border text-xs flex items-start space-x-3 ${
                testResult.success
                  ? testResult.tableExists === false
                    ? 'bg-amber-50 border-amber-200 text-amber-900'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-rose-50 border-rose-200 text-rose-900'
              }`}
            >
              {testResult.success ? (
                testResult.tableExists === false ? (
                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                ) : (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                )
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <p className="font-bold text-sm">
                  {testResult.success
                    ? testResult.tableExists === false
                      ? 'Connected to Project (Table Setup Needed)'
                      : 'Connected & Live Sync Active'
                    : 'Connection Failed'}
                </p>
                <p className="mt-0.5 text-xs leading-relaxed">
                  {testResult.message || testResult.error}
                </p>
              </div>
            </div>
          )}

          {actionSuccessMsg && (
            <div className="p-3.5 bg-teal-50 border border-teal-200 text-teal-900 rounded-2xl text-xs flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-teal-600 flex-shrink-0" />
              <span>{actionSuccessMsg}</span>
            </div>
          )}

          {/* Credentials Form */}
          <form onSubmit={handleSaveConfig} className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Supabase Project URL
                </label>
                {isEnvConfig && (
                  <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-100 px-2 py-0.5 rounded-md">
                    Loaded from Vercel / Env
                  </span>
                )}
              </div>
              <input
                id="input-supabase-url"
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://your-project-id.supabase.co"
                required
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Supabase Anon / Public API Key
              </label>
              <input
                id="input-supabase-key"
                type="password"
                value={anonKey}
                onChange={(e) => setAnonKey(e.target.value)}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                required
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
              <div className="flex items-center space-x-2">
                <button
                  id="btn-save-supabase-config"
                  type="submit"
                  disabled={isTesting}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save & Connect</span>
                </button>

                <button
                  id="btn-test-supabase-config"
                  type="button"
                  onClick={() => handleTest()}
                  disabled={isTesting || !url || !anonKey}
                  className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
                  <span>{isTesting ? 'Testing...' : 'Test Connection'}</span>
                </button>
              </div>

              {url && (
                <button
                  id="btn-clear-supabase-config"
                  type="button"
                  onClick={handleClearConfig}
                  className="px-3 py-2 text-xs text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer flex items-center space-x-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear Config</span>
                </button>
              )}
            </div>
          </form>

          {/* Sync / Migrate Data Section */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <h3 className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
              <Server className="w-4 h-4 text-slate-600" />
              <span>Data Synchronization & Backup</span>
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Once connected, any changes made by any user automatically save to Supabase. You can also manually push all existing records to the cloud or download the latest data.
            </p>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                id="btn-push-supabase-data"
                type="button"
                onClick={handlePush}
                disabled={isPushing || !testResult?.success}
                className="px-3.5 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-semibold text-xs rounded-xl flex items-center space-x-1.5 transition-colors cursor-pointer shadow-2xs disabled:opacity-40"
              >
                <UploadCloud className={`w-3.5 h-3.5 text-teal-600 ${isPushing ? 'animate-bounce' : ''}`} />
                <span>{isPushing ? 'Uploading...' : 'Push Local Data to Supabase'}</span>
              </button>

              <button
                id="btn-pull-supabase-data"
                type="button"
                onClick={handlePull}
                disabled={isPulling || !testResult?.success}
                className="px-3.5 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-semibold text-xs rounded-xl flex items-center space-x-1.5 transition-colors cursor-pointer shadow-2xs disabled:opacity-40"
              >
                <DownloadCloud className={`w-3.5 h-3.5 text-blue-600 ${isPulling ? 'animate-bounce' : ''}`} />
                <span>{isPulling ? 'Downloading...' : 'Pull Latest from Supabase'}</span>
              </button>
            </div>
          </div>

          {/* SQL Setup Helper */}
          <div className="p-4 rounded-2xl bg-slate-900 text-slate-200 space-y-3 border border-slate-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold text-white">
                  Step-by-Step Supabase Setup (1-Minute Guide)
                </span>
              </div>
              <button
                id="btn-copy-supabase-sql"
                type="button"
                onClick={handleCopySql}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold rounded-lg flex items-center space-x-1 transition-colors cursor-pointer border border-slate-700"
              >
                {copiedSql ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span className="text-emerald-400">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3 text-slate-400" />
                    <span>Copy SQL</span>
                  </>
                )}
              </button>
            </div>

            <ol className="text-[11px] text-slate-300 space-y-1.5 list-decimal list-inside leading-relaxed">
              <li>
                Create a free project at{' '}
                <a
                  href="https://supabase.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-400 hover:underline inline-flex items-center space-x-0.5 font-semibold"
                >
                  <span>supabase.com</span>
                  <ExternalLink className="w-2.5 h-2.5 ml-0.5 inline" />
                </a>
              </li>
              <li>Open your project dashboard &rarr; click <strong>SQL Editor</strong> in the left sidebar.</li>
              <li>Paste the SQL script below and click <strong>Run</strong>:</li>
            </ol>

            <pre className="p-3 bg-slate-950 rounded-xl text-[11px] font-mono text-emerald-300 overflow-x-auto border border-slate-800 max-h-40">
              {SUPABASE_SETUP_SQL}
            </pre>

            <p className="text-[11px] text-slate-400">
              💡 <strong>Tip for Vercel:</strong> In your Vercel Project Settings &rarr; Environment Variables, you can also add <code className="text-emerald-300 font-mono">VITE_SUPABASE_URL</code> and <code className="text-emerald-300 font-mono">VITE_SUPABASE_ANON_KEY</code>.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-100 px-6 py-4 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Real-time multi-device cloud synchronization
          </span>
          <button
            id="btn-done-supabase-modal"
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
