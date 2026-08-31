import React, { useState } from 'react';
import {
  Lock,
  User,
  Eye,
  EyeOff,
  ShieldCheck,
  KeyRound,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Building2,
  Boxes,
} from 'lucide-react';
import { authService, AuthUser } from '../utils/authService';
import { ChangePasswordModal } from './ChangePasswordModal';

interface LoginScreenProps {
  onLoginSuccess: (user: AuthUser) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!username.trim() || !password) {
      setErrorMessage('Please enter both username and password.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await authService.login(username.trim(), password);

      if (res.success && res.user) {
        onLoginSuccess(res.user);
      } else {
        setErrorMessage(res.error || 'Invalid username or password. Please try again.');
      }
    } catch {
      setErrorMessage('An unexpected error occurred during login. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordChanged = (msg: string) => {
    setSuccessMessage(msg);
    setPassword('');
    setErrorMessage(null);
  };

  return (
    <div
      id="login-screen"
      className="min-h-screen w-full bg-linear-to-br from-slate-950 via-[#0d1b2a] to-slate-900 flex items-center justify-center p-4 sm:p-6 lg:p-8 select-none"
    >
      {/* Background Decorative Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b15_1px,transparent_1px),linear-gradient(to_bottom,#1e293b15_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Main Brand Card */}
        <div className="bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl shadow-black/50 border border-white/20 overflow-hidden">
          {/* Header Banner */}
          <div className="bg-[#0d1b2a] px-8 pt-8 pb-7 text-center relative overflow-hidden border-b border-slate-800">
            {/* Ambient teal glow */}
            <div className="absolute -top-12 -left-12 w-36 h-36 bg-teal-500/20 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -bottom-12 -right-12 w-36 h-36 bg-teal-600/20 rounded-full blur-2xl pointer-events-none" />

            {/* Logo Badge */}
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-teal-600 to-teal-400 text-white font-black text-2xl shadow-lg shadow-teal-900/40 mb-3 border border-teal-300/30 ring-4 ring-white/5">
              <span>DS<span className="text-teal-200 lowercase text-lg">i</span></span>
            </div>

            <h1 className="text-xl font-extrabold text-white tracking-tight leading-snug">
              Diversified Source Inc.
            </h1>
            <p className="text-xs uppercase tracking-[0.25em] text-teal-400 font-bold mt-0.5">
              Operations & Inventory System
            </p>
          </div>

          {/* Form Container */}
          <div className="p-7 sm:p-8">
            <div className="mb-6 text-center">
              <h2 className="text-lg font-bold text-slate-900">System Sign In</h2>
              <p className="text-xs text-slate-500 mt-1">
                Enter your administrative credentials to access the portal
              </p>
            </div>

            {/* Error Message Display */}
            {errorMessage && (
              <div
                id="login-error-alert"
                className="mb-5 p-3.5 bg-rose-50 border border-rose-200/80 rounded-xl flex items-start space-x-2.5 text-xs text-rose-800 font-medium animate-in fade-in duration-200"
              >
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                <span className="leading-relaxed">{errorMessage}</span>
              </div>
            )}

            {/* Success Message (from password change) */}
            {successMessage && (
              <div
                id="login-success-alert"
                className="mb-5 p-3.5 bg-emerald-50 border border-emerald-200/80 rounded-xl flex items-start space-x-2.5 text-xs text-emerald-800 font-medium animate-in fade-in duration-200"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                <span className="leading-relaxed">{successMessage}</span>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleLogin} className="space-y-4">
              {/* Username Input */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Username
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    id="input-username"
                    type="text"
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    placeholder="e.g. admin"
                    autoComplete="username"
                    required
                    disabled={isLoading}
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all shadow-xs"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    Password
                  </label>
                  <button
                    id="btn-trigger-change-password"
                    type="button"
                    onClick={() => setIsChangePasswordOpen(true)}
                    className="text-xs text-teal-600 hover:text-teal-700 font-semibold transition-colors cursor-pointer hover:underline"
                  >
                    Change Password?
                  </button>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="input-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    required
                    disabled={isLoading}
                    className="w-full pl-10 pr-11 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all shadow-xs"
                  />
                  <button
                    id="btn-toggle-password-visibility"
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  id="btn-login-submit"
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 px-4 bg-teal-600 hover:bg-teal-700 active:bg-teal-800 disabled:opacity-60 text-white font-bold text-sm rounded-xl shadow-md shadow-teal-700/20 flex items-center justify-center space-x-2 transition-all cursor-pointer"
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Authenticating...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign In to System</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Quick Action: Change Password Link Box */}
            <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span className="flex items-center space-x-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
                <span>Protected Enterprise Access</span>
              </span>

              <button
                id="btn-change-password-link"
                type="button"
                onClick={() => setIsChangePasswordOpen(true)}
                className="inline-flex items-center space-x-1 text-slate-600 hover:text-teal-700 font-semibold cursor-pointer transition-colors"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Change Password</span>
              </button>
            </div>
          </div>

          {/* Footer Card Ribbon */}
          <div className="bg-slate-50 border-t border-slate-100 px-7 py-3 flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center space-x-1">
              <Building2 className="w-3 h-3 text-slate-400" />
              <span>Diversified Source Incorporated</span>
            </span>
            <span className="flex items-center space-x-1">
              <Boxes className="w-3 h-3 text-slate-400" />
              <span>Lumiere Warehouse</span>
            </span>
          </div>
        </div>

        {/* Outer security badge */}
        <div className="text-center mt-6 text-slate-400 text-xs flex items-center justify-center space-x-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>Active End-to-End Encrypted Session</span>
        </div>
      </div>

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={isChangePasswordOpen}
        onClose={() => setIsChangePasswordOpen(false)}
        onSuccess={handlePasswordChanged}
      />
    </div>
  );
};
