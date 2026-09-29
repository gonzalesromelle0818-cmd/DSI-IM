import React from 'react';
import { RotateCcw, X, Trash2 } from 'lucide-react';
import { DeletedHistoryAction } from '../types';

export interface UndoFloatingBannerProps {
  deletedAction: DeletedHistoryAction | null;
  onRequestUndo: () => void;
  onDismiss: () => void;
}

export const UndoFloatingBanner: React.FC<UndoFloatingBannerProps> = ({
  deletedAction,
  onRequestUndo,
  onDismiss,
}) => {
  if (!deletedAction) return null;

  return (
    <div
      id="undo-floating-banner"
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-xl bg-slate-900/95 backdrop-blur-md text-white px-4 py-3.5 rounded-2xl shadow-2xl border border-slate-700 flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-5 duration-200"
    >
      <div className="flex items-center space-x-3 min-w-0">
        <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 shrink-0">
          <Trash2 className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <div className="text-xs font-bold text-white truncate flex items-center space-x-1.5">
            <span>Nabura ang data:</span>
            <span className="text-teal-300 font-semibold">{deletedAction.title}</span>
          </div>
          <div className="text-[11px] text-slate-400 truncate">
            {deletedAction.subtitle || 'Pindutin ang Undo upang ibalik ang data'}
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-2 shrink-0">
        <button
          type="button"
          onClick={onRequestUndo}
          className="px-3.5 py-1.5 text-xs font-bold bg-teal-500 hover:bg-teal-400 text-slate-950 rounded-xl transition-all shadow-sm hover:shadow active:scale-95 flex items-center space-x-1.5 cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>I-Undo (Bawiin)</span>
        </button>

        <button
          type="button"
          onClick={onDismiss}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          title="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
