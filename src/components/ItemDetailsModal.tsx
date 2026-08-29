import React from 'react';
import {
  X,
  Building2,
  Package,
  Layers,
  MapPin,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Edit,
  PlusCircle,
  Clock,
  TrendingDown,
} from 'lucide-react';
import { InventoryItem } from '../types';
import { getReorderStatus, formatCurrency } from '../utils/inventoryHelpers';

interface ItemDetailsModalProps {
  isOpen: boolean;
  item: InventoryItem | null;
  onClose: () => void;
  onEdit: (item: InventoryItem) => void;
  onRestock: (item: InventoryItem) => void;
}

export const ItemDetailsModal: React.FC<ItemDetailsModalProps> = ({
  isOpen,
  item,
  onClose,
  onEdit,
  onRestock,
}) => {
  if (!isOpen || !item) return null;

  const status = getReorderStatus(item.stockQty, item.minReorderLevel);

  return (
    <div
      id="item-details-modal-overlay"
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden my-8 animate-fadeIn">
        {/* Header */}
        <div className="px-6 py-5 bg-[#0d1b2a] text-white flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded font-mono text-xs font-bold bg-teal-500/20 text-teal-300 border border-teal-500/40">
                {item.assetId}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                {item.category}
              </span>
            </div>
            <h2 className="text-lg font-bold text-white tracking-tight">
              {item.description}
            </h2>
            {item.brandModel && (
              <p className="text-xs text-slate-300">
                Brand / Model: <span className="font-semibold text-white">{item.brandModel}</span>
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Status Alert Banner */}
          {status === 'reorder_needed' ? (
            <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-red-800 flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="text-xs flex-1">
                <p className="font-bold text-red-900">
                  REORDER NEEDED (Below Minimum Threshold)
                </p>
                <p className="mt-0.5 text-red-700">
                  Current warehouse stock ({item.stockQty} {item.unit}) is at or below the minimum reorder level ({item.minReorderLevel} {item.unit}). Purchase order or replenishment is recommended.
                </p>
              </div>
              <button
                onClick={() => {
                  onClose();
                  onRestock(item);
                }}
                className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-semibold shadow-xs"
              >
                Replenish
              </button>
            </div>
          ) : status === 'out_of_stock' ? (
            <div className="p-3.5 rounded-lg bg-red-100 border border-red-300 text-red-900 flex items-start space-x-3">
              <TrendingDown className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="text-xs flex-1">
                <p className="font-bold">OUT OF STOCK (0 Available in Warehouse)</p>
                <p className="mt-0.5">
                  Stock is depleted. Please replenish this asset.
                </p>
              </div>
              <button
                onClick={() => {
                  onClose();
                  onRestock(item);
                }}
                className="px-3 py-1 bg-red-700 hover:bg-red-800 text-white rounded text-xs font-semibold shadow-xs"
              >
                Add Inflow
              </button>
            </div>
          ) : status === 'low' ? (
            <div className="p-3.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 flex items-center space-x-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
              <div className="text-xs flex-1">
                <p className="font-semibold text-amber-900">LOW STOCK WARNING</p>
                <p className="text-amber-700">Stock is nearing the minimum threshold of {item.minReorderLevel} {item.unit}.</p>
              </div>
            </div>
          ) : (
            <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center space-x-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <div className="text-xs flex-1">
                <p className="font-semibold text-emerald-900">HEALTHY STOCK LEVEL</p>
                <p className="text-emerald-700">Warehouse stock is well above reorder threshold.</p>
              </div>
            </div>
          )}

          {/* Key Metrics Breakdown */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 text-center">
              <span className="text-[11px] font-semibold text-slate-500 block uppercase">
                Stock Qty (Warehouse)
              </span>
              <span className="text-2xl font-bold text-slate-900 mt-1 block">
                {item.stockQty}{' '}
                <span className="text-xs font-normal text-slate-500">{item.unit}</span>
              </span>
            </div>

            <div className="p-3.5 rounded-lg bg-emerald-50/60 border border-emerald-200 text-center">
              <span className="text-[11px] font-semibold text-emerald-800 block uppercase">
                Unit Price (₱)
              </span>
              <span className="text-xl font-bold text-emerald-900 mt-1 block">
                {item.unitPrice !== undefined ? formatCurrency(item.unitPrice) : '—'}
              </span>
              <span className="text-[10px] text-emerald-700">per {item.unit}</span>
            </div>

            <div className="p-3.5 rounded-lg bg-emerald-50/80 border border-emerald-200 text-center">
              <span className="text-[11px] font-semibold text-emerald-800 block uppercase">
                Total Stock Valuation
              </span>
              <span className="text-xl font-bold text-emerald-900 mt-1 block">
                {item.unitPrice !== undefined ? formatCurrency(item.stockQty * item.unitPrice) : '—'}
              </span>
              <span className="text-[10px] text-emerald-700">{item.stockQty} {item.unit}</span>
            </div>

            <div className="p-3.5 rounded-lg bg-amber-50/60 border border-amber-200 text-center">
              <span className="text-[11px] font-semibold text-amber-800 block uppercase">
                Min Reorder Level
              </span>
              <span className="text-2xl font-bold text-amber-900 mt-1 block">
                {item.minReorderLevel}{' '}
                <span className="text-xs font-normal text-amber-700">{item.unit}</span>
              </span>
            </div>
          </div>

          {/* Location & Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-lg border border-slate-200">
            <div className="flex items-center space-x-2 text-slate-700">
              <MapPin className="w-4 h-4 text-teal-600" />
              <span className="font-semibold text-slate-900">Storage Location:</span>
              <span className="font-medium text-slate-800">{item.location || 'Lumiere'}</span>
            </div>
            <div className="flex items-center space-x-2 text-slate-700">
              <Calendar className="w-4 h-4 text-slate-400" />
              <span className="font-semibold text-slate-900">Last Stock Audit:</span>
              <span>{item.lastUpdated}</span>
            </div>
          </div>

          {/* Notes */}
          {item.notes && (
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg text-xs">
              <span className="font-bold text-slate-800 block mb-0.5">Asset Notes / Supplier Ref:</span>
              <p className="text-slate-600 leading-relaxed">{item.notes}</p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-lg transition-colors"
          >
            Close View
          </button>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                onClose();
                onRestock(item);
              }}
              className="px-3.5 py-2 text-xs font-semibold text-teal-800 bg-teal-100 hover:bg-teal-200 border border-teal-300 rounded-lg flex items-center space-x-1.5 transition-colors"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Add Stock / Replenish</span>
            </button>
            <button
              onClick={() => {
                onClose();
                onEdit(item);
              }}
              className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm flex items-center space-x-1.5 transition-colors"
            >
              <Edit className="w-4 h-4" />
              <span>Edit Asset</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
