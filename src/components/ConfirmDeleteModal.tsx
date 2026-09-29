import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

export interface ConfirmDeleteDetail {
  label: string;
  value: string | number;
}

export interface ConfirmDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  entityTypeLabel?: string;
  itemTitle: string;
  itemSubtitle?: string;
  message?: string;
  details?: ConfirmDeleteDetail[];
  optionCheckbox?: {
    label: string;
    description?: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
  };
  confirmButtonText?: string;
  cancelButtonText?: string;
}

export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Kumpirmahin ang Pagbura (Confirm Delete)',
  entityTypeLabel,
  itemTitle,
  itemSubtitle,
  message = 'Sigurado ka ba na gusto mong burahin ang data na ito? Aalisin ito sa kasalukuyang talaan.',
  details,
  optionCheckbox,
  confirmButtonText = 'Oo, Burahin (Yes, Delete)',
  cancelButtonText = 'Hindi, Huwag Burahin (No, Cancel)',
}) => {
  if (!isOpen) return null;

  return (
    <div
      id="confirm-delete-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div
        id="confirm-delete-modal-container"
        className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="bg-rose-700 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-white/20 text-white border border-white/30 shrink-0">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold tracking-tight text-white">{title}</h3>
              <p className="text-xs text-rose-100">Mangyaring kumpirmahin kung nais magpatuloy sa pagbura</p>
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
          {/* Main Question Alert Box */}
          <div className="flex items-start space-x-3 p-4 bg-rose-50 border border-rose-200 rounded-xl">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              {entityTypeLabel && (
                <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-rose-200/80 text-rose-900 mb-1">
                  {entityTypeLabel}
                </span>
              )}
              <h4 className="text-sm font-bold text-slate-900 break-words">{itemTitle}</h4>
              {itemSubtitle && <p className="text-xs text-slate-600">{itemSubtitle}</p>}
              <p className="text-xs text-rose-800 font-medium pt-1">{message}</p>
            </div>
          </div>

          {/* Details Grid if provided */}
          {details && details.length > 0 && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 text-xs">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">
                Detalye ng Buburahin:
              </span>
              <div className="grid grid-cols-2 gap-2">
                {details.map((d, idx) => (
                  <div key={idx} className="bg-white p-2 rounded-lg border border-slate-200/80">
                    <span className="text-[10px] text-slate-400 block">{d.label}</span>
                    <span className="font-semibold text-slate-800 truncate block">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Optional Checkbox (e.g. Rollback Stock) */}
          {optionCheckbox && (
            <label className="flex items-start space-x-3 p-3.5 bg-amber-50 border border-amber-200 rounded-xl cursor-pointer text-xs select-none hover:bg-amber-100/60 transition-colors">
              <input
                type="checkbox"
                checked={optionCheckbox.checked}
                onChange={(e) => optionCheckbox.onChange(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-amber-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
              />
              <div className="space-y-0.5">
                <span className="font-bold text-amber-950 block">{optionCheckbox.label}</span>
                {optionCheckbox.description && (
                  <span className="text-[11px] text-amber-800 block">
                    {optionCheckbox.description}
                  </span>
                )}
              </div>
            </label>
          )}

          <p className="text-[11px] text-slate-400 italic text-center">
            Paalala: Maaaring ibalik ang binurang data gamit ang "Undo" button pagkatapos burahin.
          </p>
        </div>

        {/* Footer with Clear Yes / No buttons */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2.5 text-xs font-bold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition-colors cursor-pointer text-center"
          >
            {cancelButtonText}
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="w-full sm:w-auto px-5 py-2.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 rounded-xl shadow-sm hover:shadow transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            <span>{confirmButtonText}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
