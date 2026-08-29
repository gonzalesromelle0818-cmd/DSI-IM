import React, { useState } from 'react';
import {
  X,
  Trash2,
  AlertTriangle,
  FileText,
  CheckSquare,
  Square,
  Search,
  ShoppingCart,
  RotateCcw,
  Calendar,
  Layers,
} from 'lucide-react';
import { PurchaseRecord } from '../types';
import { formatCurrency } from '../utils/inventoryHelpers';

interface RemovePurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  purchases: PurchaseRecord[];
  onDeletePurchase: (purchaseId: string, rollbackStock: boolean) => void;
  onDeleteMultiplePurchases: (purchaseIds: string[], rollbackStock: boolean) => void;
  onClearAllPurchases?: (rollbackStock: boolean) => void;
}

export const RemovePurchaseModal: React.FC<RemovePurchaseModalProps> = ({
  isOpen,
  onClose,
  purchases,
  onDeletePurchase,
  onDeleteMultiplePurchases,
  onClearAllPurchases,
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [rollbackStock, setRollbackStock] = useState(true);
  const [purchaseToDelete, setPurchaseToDelete] = useState<PurchaseRecord | null>(null);
  const [showClearAllConfirm, setShowClearAllConfirm] = useState(false);

  if (!isOpen) return null;

  const filteredPurchases = purchases.filter((p) => {
    const q = searchTerm.toLowerCase();
    return (
      p.id.toLowerCase().includes(q) ||
      (p.poNumber && p.poNumber.toLowerCase().includes(q)) ||
      p.assetId.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      (p.supplier && p.supplier.toLowerCase().includes(q)) ||
      (p.receivedBy && p.receivedBy.toLowerCase().includes(q)) ||
      p.date.includes(q)
    );
  });

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === filteredPurchases.length && filteredPurchases.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredPurchases.map((p) => p.id));
    }
  };

  const executeSingleDelete = () => {
    if (purchaseToDelete) {
      onDeletePurchase(purchaseToDelete.id, rollbackStock);
      setPurchaseToDelete(null);
      setSelectedIds((prev) => prev.filter((id) => id !== purchaseToDelete.id));
    }
  };

  const executeBulkDelete = () => {
    if (selectedIds.length === 0) return;
    onDeleteMultiplePurchases(selectedIds, rollbackStock);
    setSelectedIds([]);
    onClose();
  };

  const executeClearAll = () => {
    if (onClearAllPurchases) {
      onClearAllPurchases(rollbackStock);
    } else {
      onDeleteMultiplePurchases(
        purchases.map((p) => p.id),
        rollbackStock
      );
    }
    setShowClearAllConfirm(false);
    setSelectedIds([]);
    onClose();
  };

  return (
    <div
      id="remove-purchase-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="remove-purchase-modal-card"
        className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Modal Header */}
        <div className="bg-slate-900 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">Remove / Cancel PO & Purchase Records</h2>
              <p className="text-xs text-slate-400">
                Delete purchase intake history or rollback stock inflow from warehouse
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-4">
          {/* Option to rollback stock */}
          <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start space-x-3">
              <RotateCcw className="w-4 h-4 text-amber-700 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-bold text-amber-900">Inventory Stock Rollback Behavior</p>
                <p className="text-[11px] text-amber-700">
                  {rollbackStock
                    ? 'Enabled: Removing a PO will automatically deduct the received quantity from warehouse stock.'
                    : 'Disabled: Removing a PO will only delete the record from history without changing current stock.'}
                </p>
              </div>
            </div>
            <label className="flex items-center space-x-2 text-xs font-semibold text-slate-800 shrink-0 cursor-pointer bg-white px-3 py-1.5 rounded-lg border border-amber-300 shadow-2xs">
              <input
                type="checkbox"
                checked={rollbackStock}
                onChange={(e) => setRollbackStock(e.target.checked)}
                className="rounded text-teal-600 focus:ring-teal-500 cursor-pointer"
              />
              <span>Deduct stock from Inventory</span>
            </label>
          </div>

          {/* Search and Bulk Select controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Filter by PO#, asset, supplier, or date..."
                className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div className="flex items-center space-x-2 shrink-0">
              <button
                type="button"
                onClick={handleSelectAll}
                disabled={filteredPurchases.length === 0}
                className="px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 rounded-lg border border-slate-200 flex items-center space-x-1.5 transition-colors cursor-pointer"
              >
                {selectedIds.length === filteredPurchases.length && filteredPurchases.length > 0 ? (
                  <>
                    <CheckSquare className="w-3.5 h-3.5 text-teal-600" />
                    <span>Deselect All</span>
                  </>
                ) : (
                  <>
                    <Square className="w-3.5 h-3.5 text-slate-500" />
                    <span>Select All ({filteredPurchases.length})</span>
                  </>
                )}
              </button>

              {purchases.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowClearAllConfirm(true)}
                  className="px-3 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors flex items-center space-x-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear All</span>
                </button>
              )}
            </div>
          </div>

          {/* List of Purchases */}
          <div className="border border-slate-200 rounded-xl overflow-hidden max-h-[380px] overflow-y-auto divide-y divide-slate-100">
            {filteredPurchases.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <ShoppingCart className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                <p className="font-semibold text-slate-600 text-xs">No purchase records found</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {purchases.length === 0
                    ? 'No purchase inflow records currently exist in history.'
                    : 'Try adjusting your search terms.'}
                </p>
              </div>
            ) : (
              filteredPurchases.map((rec) => {
                const isSelected = selectedIds.includes(rec.id);
                const lineCost =
                  rec.totalCost !== undefined
                    ? rec.totalCost
                    : rec.unitPrice !== undefined
                    ? rec.quantity * rec.unitPrice
                    : 0;

                return (
                  <div
                    key={rec.id}
                    className={`p-3.5 flex items-center justify-between gap-3 transition-colors ${
                      isSelected ? 'bg-rose-50/50' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center space-x-3 min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={() => handleToggleSelect(rec.id)}
                        className="text-slate-400 hover:text-teal-600 cursor-pointer p-0.5"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-teal-600" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                          <span className="font-bold text-xs text-slate-900 font-mono">
                            {rec.poNumber || rec.id}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                            {rec.category}
                          </span>
                          <span className="text-[11px] text-slate-400 flex items-center space-x-1">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            <span>{rec.date}</span>
                          </span>
                        </div>

                        <p className="text-xs font-semibold text-slate-800 truncate mt-0.5">
                          [{rec.assetId}] {rec.description}
                        </p>

                        <div className="flex items-center space-x-3 text-[11px] text-slate-500 mt-1 flex-wrap gap-y-1">
                          <span className="text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                            +{rec.quantity} {rec.unit}
                          </span>
                          {lineCost > 0 && (
                            <span>
                              Total: <strong>{formatCurrency(lineCost)}</strong>
                            </span>
                          )}
                          {rec.supplier && <span>Supplier: {rec.supplier}</span>}
                          {rec.receivedBy && <span>Rec: {rec.receivedBy}</span>}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setPurchaseToDelete(rec)}
                      className="px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:text-white hover:bg-rose-600 border border-rose-200 rounded-lg transition-colors flex items-center space-x-1 shrink-0 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove</span>
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            {selectedIds.length > 0 ? (
              <span className="font-semibold text-rose-700">
                {selectedIds.length} of {filteredPurchases.length} record(s) selected
              </span>
            ) : (
              <span>Select records using checkboxes for bulk removal</span>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>

            {selectedIds.length > 0 && (
              <button
                type="button"
                onClick={executeBulkDelete}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm transition-colors flex items-center space-x-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Selected ({selectedIds.length})</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Single Delete Submodal */}
      {purchaseToDelete && (
        <div className="fixed inset-0 z-60 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center space-x-3 text-rose-600">
              <div className="p-2 rounded-lg bg-rose-50 border border-rose-200">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Confirm Remove Purchase Record</h3>
                <p className="text-xs text-slate-500 font-mono">
                  {purchaseToDelete.poNumber || purchaseToDelete.id}
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
              <p className="font-semibold text-slate-800">
                [{purchaseToDelete.assetId}] {purchaseToDelete.description}
              </p>
              <p className="text-slate-600">
                Quantity: <strong className="text-emerald-700">+{purchaseToDelete.quantity} {purchaseToDelete.unit}</strong>
              </p>
              {purchaseToDelete.supplier && (
                <p className="text-slate-500">Supplier: {purchaseToDelete.supplier}</p>
              )}
            </div>

            <p className="text-xs text-slate-600">
              {rollbackStock ? (
                <span className="text-amber-800 font-medium">
                  ⚠️ Note: <strong>{purchaseToDelete.quantity} {purchaseToDelete.unit}</strong> will be deducted from warehouse inventory.
                </span>
              ) : (
                <span className="text-slate-500">
                  Note: Warehouse inventory will remain untouched. Only this PO log will be removed.
                </span>
              )}
            </p>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setPurchaseToDelete(null)}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeSingleDelete}
                className="px-4 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm cursor-pointer"
              >
                Yes, Remove Record
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear All Confirmation Submodal */}
      {showClearAllConfirm && (
        <div className="fixed inset-0 z-60 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center space-x-3 text-rose-600">
              <div className="p-2 rounded-lg bg-rose-100 border border-rose-300">
                <AlertTriangle className="w-6 h-6 text-rose-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Clear All Purchase History?</h3>
                <p className="text-xs text-slate-500">This will remove all {purchases.length} purchase records</p>
              </div>
            </div>

            <p className="text-xs text-slate-600">
              Are you sure you want to clear the entire stock inflow history?
              {rollbackStock && (
                <span className="block mt-1 font-semibold text-rose-700">
                  All corresponding stock inflows will be rolled back from warehouse inventory.
                </span>
              )}
            </p>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowClearAllConfirm(false)}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeClearAll}
                className="px-4 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm cursor-pointer"
              >
                Clear All History
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
