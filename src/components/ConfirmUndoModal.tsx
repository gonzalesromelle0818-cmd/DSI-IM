import React from 'react';
import { RotateCcw, CheckCircle2, X, Clock, HelpCircle } from 'lucide-react';
import { DeletedHistoryAction } from '../types';

export interface ConfirmUndoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  deletedAction: DeletedHistoryAction | null;
}

export const ConfirmUndoModal: React.FC<ConfirmUndoModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  deletedAction,
}) => {
  if (!isOpen || !deletedAction) return null;

  const getEntityTypeName = (type: string) => {
    switch (type) {
      case 'pull_out_ticket':
        return 'Pull Out Ticket';
      case 'deployment_ticket':
        return 'Deployment Ticket';
      case 'purchase_record':
        return 'Purchase / Stock Inflow Record';
      case 'inventory_item':
        return 'Warehouse Inventory Asset';
      case 'project':
        return 'Project Record';
      case 'retrieve_ticket':
        return 'Retrieve / Return Slip';
      case 'batch_inventory':
        return 'Multiple Inventory Items';
      case 'batch_pull_out':
        return 'Multiple Pull Out Tickets';
      case 'batch_deployment':
        return 'Multiple Deployment Tickets';
      case 'batch_purchases':
        return 'Multiple Purchase Records';
      case 'batch_retrieve':
        return 'Multiple Retrieve Slips';
      case 'batch_projects':
        return 'Multiple Projects';
      case 'all_inventory':
        return 'Buong Inventory Catalog';
      default:
        return 'Data Record';
    }
  };

  return (
    <div
      id="confirm-undo-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div
        id="confirm-undo-modal-container"
        className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="bg-teal-700 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-white/20 text-white border border-white/30 shrink-0">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold tracking-tight text-white">
                Kumpirmahin ang Pag-Undo (Undo Restore)
              </h3>
              <p className="text-xs text-teal-100">
                Ibalik ang pinakahuling binurang data sa system
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 space-y-4">
          <div className="flex items-start space-x-3 p-4 bg-teal-50 border border-teal-200 rounded-xl">
            <HelpCircle className="w-5 h-5 text-teal-700 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="inline-block px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-teal-200 text-teal-900 mb-1">
                {getEntityTypeName(deletedAction.entityType)}
              </span>
              <h4 className="text-sm font-bold text-slate-900 break-words">
                {deletedAction.title}
              </h4>
              {deletedAction.subtitle && (
                <p className="text-xs text-slate-600">{deletedAction.subtitle}</p>
              )}
              <div className="flex items-center space-x-1.5 text-[11px] text-slate-500 pt-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>Binura noong: <strong>{deletedAction.timestamp}</strong></span>
              </div>
            </div>
          </div>

          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs text-slate-700">
            <div className="font-bold text-slate-900 flex items-center space-x-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Ano ang mangyayari kapag nag-Yes?</span>
            </div>
            <p className="text-slate-600 pl-5">
              • Ibabalik ang data na ito sa aktibong listahan (tulad ng dati).
            </p>
            <p className="text-slate-600 pl-5">
              • Kung may nabagong bilang ng stock o project allocations dahil sa pagbura, kusang ibabalik ito sa dating tamang bilang.
            </p>
          </div>

          <p className="text-xs text-center font-semibold text-slate-700">
            Sigurado ka ba na gusto mong ibalik ang pinakahuling binurang data na ito?
          </p>
        </div>

        {/* Footer with Clear Yes / No buttons */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2.5 text-xs font-bold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition-colors cursor-pointer text-center"
          >
            Hindi, Huwag Ibalik (No, Cancel)
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="w-full sm:w-auto px-5 py-2.5 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 active:bg-teal-800 rounded-xl shadow-sm hover:shadow transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Oo, Ibalik ang Data (Yes, Restore)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
