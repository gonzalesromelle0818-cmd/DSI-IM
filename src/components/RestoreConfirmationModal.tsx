import React from 'react';
import { SystemBackupPayload } from '../utils/backupService';
import {
  Upload,
  AlertTriangle,
  CheckCircle2,
  Database,
  Calendar,
  X,
  Boxes,
  Briefcase,
  FileSpreadsheet,
  Users,
  ShoppingCart,
  RotateCcw,
} from 'lucide-react';

interface RestoreConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  payload: SystemBackupPayload | null;
  fileName: string;
  isRestoring?: boolean;
}

export const RestoreConfirmationModal: React.FC<RestoreConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  payload,
  fileName,
  isRestoring = false,
}) => {
  if (!isOpen || !payload) return null;

  const { summary, exportedAt } = payload;
  const formattedDate = exportedAt ? new Date(exportedAt).toLocaleString() : 'Unknown Date';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center border border-teal-200 shadow-2xs">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Confirm Data Restore (Upload)
              </h3>
              <p className="text-xs text-slate-500 truncate max-w-[280px]">
                File: <span className="font-semibold text-slate-700">{fileName}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isRestoring}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Warning Callout */}
        <div className="mt-4 p-3.5 bg-amber-50 rounded-xl border border-amber-200 flex items-start space-x-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-900">
            <p className="font-bold">Paalala sa Pag-restore:</p>
            <p className="mt-0.5 text-amber-800 leading-relaxed">
              Ang kasalukuyang data ng system sa iyong computer ay papalitan ng mga records na nasa backup file na ito. Siguraduhing tama ang backup file bago magpatuloy.
            </p>
          </div>
        </div>

        {/* Backup Content Breakdown */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span className="font-semibold text-slate-700 flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-slate-500" />
              NILALAMAN NG BACKUP FILE:
            </span>
            <span className="flex items-center gap-1 text-[11px] text-slate-500">
              <Calendar className="w-3 h-3" />
              {formattedDate}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-left">
              <div className="flex items-center gap-1.5 text-slate-500 text-[11px] font-medium">
                <Boxes className="w-3.5 h-3.5 text-teal-600" />
                <span>Inventory</span>
              </div>
              <div className="text-sm font-bold text-slate-800 mt-1">
                {summary.inventoryCount} items
              </div>
            </div>

            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-left">
              <div className="flex items-center gap-1.5 text-slate-500 text-[11px] font-medium">
                <Briefcase className="w-3.5 h-3.5 text-indigo-600" />
                <span>Projects</span>
              </div>
              <div className="text-sm font-bold text-slate-800 mt-1">
                {summary.projectsCount} projects
              </div>
            </div>

            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-left">
              <div className="flex items-center gap-1.5 text-slate-500 text-[11px] font-medium">
                <FileSpreadsheet className="w-3.5 h-3.5 text-amber-600" />
                <span>Pull-Outs</span>
              </div>
              <div className="text-sm font-bold text-slate-800 mt-1">
                {summary.pullOutTicketsCount} tickets
              </div>
            </div>

            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-left">
              <div className="flex items-center gap-1.5 text-slate-500 text-[11px] font-medium">
                <Users className="w-3.5 h-3.5 text-blue-600" />
                <span>Deployment</span>
              </div>
              <div className="text-sm font-bold text-slate-800 mt-1">
                {summary.deploymentTicketsCount} tickets
              </div>
            </div>

            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-left">
              <div className="flex items-center gap-1.5 text-slate-500 text-[11px] font-medium">
                <ShoppingCart className="w-3.5 h-3.5 text-emerald-600" />
                <span>Purchases</span>
              </div>
              <div className="text-sm font-bold text-slate-800 mt-1">
                {summary.purchasesCount} records
              </div>
            </div>

            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-left">
              <div className="flex items-center gap-1.5 text-slate-500 text-[11px] font-medium">
                <RotateCcw className="w-3.5 h-3.5 text-purple-600" />
                <span>Returns</span>
              </div>
              <div className="text-sm font-bold text-slate-800 mt-1">
                {summary.retrieveTicketsCount} returns
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={isRestoring}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
          >
            Kanselahin
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isRestoring}
            className="inline-flex items-center space-x-2 px-5 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 active:bg-teal-800 rounded-xl shadow-md shadow-teal-700/20 transition-all cursor-pointer disabled:opacity-50"
          >
            {isRestoring ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Ina-apply ang data...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>I-restore ang Data</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
