import React from 'react';
import { RotateCcw, X, Trash2 } from 'lucide-react';
import { DeletedHistoryAction } from '../types';

export interface UndoFloatingBannerProps {
  deletedAction: DeletedHistoryAction | null;
  onRequestUndo: () => void;
  onDismiss: () => void;
  undoCount?: number;
}

export const UndoFloatingBanner: React.FC<UndoFloatingBannerProps> = ({
  deletedAction,
  onRequestUndo,
  onDismiss,
  undoCount = 1,
}) => {
  if (!deletedAction) return null;

  return (
    <div
      id="undo-floating-banner"
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] w-[94%] max-w-xl bg-slate-900/95 backdrop-blur-md text-white px-4 py-3.5 rounded-2xl shadow-2xl border border-slate-700/80 flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-5 duration-200"
    >
      <div className="flex items-center space-x-3 min-w-0">
        <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 shrink-0">
          <Trash2 className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <div className="text-xs font-bold text-white truncate flex items-center space-x-1.5">
            <span>Nabura:</span>
            <span className="text-teal-300 font-semibold truncate">{deletedAction.title}</span>
            {undoCount > 1 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/30 text-amber-300 border border-amber-500/40 shrink-0">
                +{undoCount - 1} pa
              </span>
            )}
          </div>
          <div className="text-[11px] text-slate-400 truncate">
            {deletedAction.subtitle || 'Pindutin ang Undo upang kumpirmahin at ibalik ang data'}
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-2 shrink-0">
        <button
          type="button"
          onClick={onRequestUndo}
          className="px-3.5 py-1.5 text-xs font-bold bg-teal-400 hover:bg-teal-300 text-slate-950 rounded-xl transition-all shadow-md hover:shadow-lg active:scale-95 flex items-center space-x-1.5 cursor-pointer ring-2 ring-teal-400/40"
        >
          <RotateCcw className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>I-Undo (Bawiin)</span>
        </button>

        <button
          type="button"
          onClick={onDismiss}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          title="Isara ang banner"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
