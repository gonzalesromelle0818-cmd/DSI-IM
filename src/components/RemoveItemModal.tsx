import React, { useState, useMemo } from 'react';
import {
  X,
  Trash2,
  MinusCircle,
  Search,
  AlertTriangle,
  CheckCircle2,
  Package,
  Layers,
  ArrowDownCircle,
  RotateCcw,
} from 'lucide-react';
import { InventoryItem } from '../types';

interface RemoveItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: InventoryItem[];
  onDeleteItem: (itemId: string) => void;
  onDeleteMultiple?: (itemIds: string[]) => void;
  onDeductStock?: (itemId: string, deductQty: number, reason: string) => void;
  onClearAllInventory?: () => void;
}

type RemoveActionTab = 'delete_item' | 'deduct_qty' | 'batch_remove';

export const RemoveItemModal: React.FC<RemoveItemModalProps> = ({
  isOpen,
  onClose,
  items,
  onDeleteItem,
  onDeleteMultiple,
  onDeductStock,
  onClearAllInventory,
}) => {
  const [activeTab, setActiveTab] = useState<RemoveActionTab>('delete_item');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // In-app confirmation dialog for single item deletion
  const [itemPendingDeletion, setItemPendingDeletion] = useState<InventoryItem | null>(null);

  // In-app confirmation dialog for batch deletion
  const [isConfirmingBatchDelete, setIsConfirmingBatchDelete] = useState(false);

  // Form states for stock deduction
  const [deductItemId, setDeductItemId] = useState<string>('');
  const [deductQty, setDeductQty] = useState<number>(1);
  const [deductReason, setDeductReason] = useState<string>('Damaged / Defective');
  const [customReason, setCustomReason] = useState<string>('');

  // Confirmation state for Clear All
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [confirmKeyword, setConfirmKeyword] = useState('');

  // Filter items based on search term
  const filteredItems = useMemo(() => {
    if (!searchTerm.trim()) return items;
    const term = searchTerm.toLowerCase();
    return items.filter(
      (item) =>
        item.assetId.toLowerCase().includes(term) ||
        item.description.toLowerCase().includes(term) ||
        item.category.toLowerCase().includes(term) ||
        (item.location && item.location.toLowerCase().includes(term))
    );
  }, [items, searchTerm]);

  // Selected item for deduct mode
  const selectedDeductItem = useMemo(() => {
    return items.find((i) => i.id === deductItemId) || null;
  }, [items, deductItemId]);

  const showFeedback = (type: 'success' | 'error', text: string) => {
    setStatusMessage({ type, text });
    setTimeout(() => setStatusMessage(null), 4000);
  };

  // Triggered when user clicks "Remove" on a specific row
  const handleInitiateSingleDelete = (item: InventoryItem) => {
    setItemPendingDeletion(item);
  };

  // Triggered when user confirms "Yes, Remove"
  const handleConfirmSingleDelete = () => {
    if (!itemPendingDeletion) return;
    const target = itemPendingDeletion;
    onDeleteItem(target.id);
    showFeedback('success', `Item "${target.assetId} - ${target.description}" was successfully removed from inventory.`);
    setItemPendingDeletion(null);
  };

  // Triggered when user clicks "No, Cancel"
  const handleCancelSingleDelete = () => {
    setItemPendingDeletion(null);
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllFiltered = () => {
    if (selectedIds.length === filteredItems.length && filteredItems.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredItems.map((i) => i.id));
    }
  };

  const handleInitiateBatchDelete = () => {
    if (selectedIds.length === 0) return;
    setIsConfirmingBatchDelete(true);
  };

  const handleConfirmBatchDelete = () => {
    if (selectedIds.length === 0) return;

    if (onDeleteMultiple) {
      onDeleteMultiple(selectedIds);
    } else {
      selectedIds.forEach((id) => onDeleteItem(id));
    }

    showFeedback('success', `Successfully removed ${selectedIds.length} items from inventory.`);
    setSelectedIds([]);
    setIsConfirmingBatchDelete(false);
  };

  const handleDeductStockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDeductItem) {
      showFeedback('error', 'Please select an item to deduct stock from.');
      return;
    }

    if (deductQty <= 0) {
      showFeedback('error', 'Please enter a valid deduction quantity (minimum 1).');
      return;
    }

    if (deductQty > selectedDeductItem.stockQty) {
      showFeedback(
        'error',
        `Cannot deduct ${deductQty} units. Only ${selectedDeductItem.stockQty} ${selectedDeductItem.unit} currently available in warehouse stock.`
      );
      return;
    }

    const finalReason =
      deductReason === 'Other' ? customReason.trim() || 'Manual Deduction / Write-off' : deductReason;

    if (onDeductStock) {
      onDeductStock(selectedDeductItem.id, deductQty, finalReason);
      showFeedback(
        'success',
        `Deducted ${deductQty} ${selectedDeductItem.unit} from ${selectedDeductItem.assetId} (Reason: ${finalReason}).`
      );
      setDeductItemId('');
      setDeductQty(1);
      setCustomReason('');
    }
  };

  const handleExecuteClearAll = () => {
    if (confirmKeyword.trim().toUpperCase() !== 'DELETE') {
      showFeedback('error', 'Please type "DELETE" to confirm clearing all inventory records.');
      return;
    }

    if (onClearAllInventory) {
      onClearAllInventory();
      showFeedback('success', 'All inventory items have been cleared.');
      setShowClearConfirm(false);
      setConfirmKeyword('');
    }
  };

  if (!isOpen) return null;

  return (
    <div
      id="remove-item-modal-overlay"
      className="fixed inset-0 z-50 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget && !itemPendingDeletion && !isConfirmingBatchDelete) {
          onClose();
        }
      }}
    >
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden my-6 flex flex-col max-h-[92vh] relative">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-rose-500/20 border border-rose-400/30 flex items-center justify-center text-rose-400">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-white">Remove / Deduct Items</h2>
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  {items.length} Total Registered Assets
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Remove obsolete items, dispose defective stocks, or manage inventory removals.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-md hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback Alert */}
        {statusMessage && (
          <div
            className={`px-6 py-2.5 border-b text-xs font-semibold flex items-center space-x-2 ${
              statusMessage.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="px-6 bg-slate-50 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center space-x-1 py-2">
            <button
              onClick={() => setActiveTab('delete_item')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer ${
                activeTab === 'delete_item'
                  ? 'bg-white text-slate-900 shadow-2xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-500" />
              <span>Remove Items ({items.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('deduct_qty')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer ${
                activeTab === 'deduct_qty'
                  ? 'bg-white text-slate-900 shadow-2xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <MinusCircle className="w-3.5 h-3.5 text-amber-600" />
              <span>Deduct / Dispose Stock Qty</span>
            </button>

            <button
              onClick={() => setActiveTab('batch_remove')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer ${
                activeTab === 'batch_remove'
                  ? 'bg-white text-slate-900 shadow-2xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-blue-600" />
              <span>Batch Selection</span>
              {selectedIds.length > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-rose-100 text-rose-700 font-bold">
                  {selectedIds.length}
                </span>
              )}
            </button>
          </div>

          {/* Clear all button */}
          {items.length > 0 && onClearAllInventory && (
            <button
              onClick={() => setShowClearConfirm(true)}
              className="text-xs text-rose-600 hover:text-rose-800 font-semibold flex items-center space-x-1 py-1.5 px-2.5 rounded-md hover:bg-rose-50 border border-rose-200/70 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Clear All Inventory</span>
            </button>
          )}
        </div>

        {/* Clear All Confirmation Box */}
        {showClearConfirm && (
          <div className="p-4 bg-rose-50 border-b border-rose-200 text-slate-800 space-y-3 animate-fadeIn">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-xs font-bold text-rose-900">
                  Warning: This will permanently delete ALL {items.length} items from your inventory!
                </p>
                <p className="text-xs text-rose-700">
                  All current inventory records will be wiped to provide a clean slate.
                  Type the word <strong className="font-mono bg-rose-100 px-1 py-0.5 rounded">DELETE</strong> below to proceed:
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2 max-w-md">
              <input
                type="text"
                value={confirmKeyword}
                onChange={(e) => setConfirmKeyword(e.target.value)}
                placeholder='Type "DELETE"'
                className="px-3 py-1.5 text-xs bg-white border border-rose-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 font-mono"
              />
              <button
                onClick={handleExecuteClearAll}
                disabled={confirmKeyword.trim().toUpperCase() !== 'DELETE'}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
              >
                Confirm & Clear All
              </button>
              <button
                onClick={() => {
                  setShowClearConfirm(false);
                  setConfirmKeyword('');
                }}
                className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Modal Main Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {items.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <Package className="w-12 h-12 mx-auto text-slate-300 mb-2" />
              <p className="font-bold text-slate-700 text-sm">Inventory is currently empty (0 items).</p>
              <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                No items found. You can add new assets using the <strong>"+ Add Items"</strong> button on the inventory page.
              </p>
            </div>
          ) : (
            <>
              {/* TAB 1: DELETE ITEM RECORD (Single row deletes) */}
              {activeTab === 'delete_item' && (
                <div className="space-y-4">
                  {/* Search Bar */}
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search by Asset ID, description, category, or location..."
                      className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 focus:bg-white"
                    />
                  </div>

                  {/* List of items with delete button */}
                  <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                          <th className="py-2.5 px-4">Asset ID</th>
                          <th className="py-2.5 px-4">Description</th>
                          <th className="py-2.5 px-4">Category</th>
                          <th className="py-2.5 px-4 text-center">Warehouse Stock</th>
                          <th className="py-2.5 px-4 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredItems.map((item) => (
                          <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                            <td className="py-3 px-4 font-mono font-bold text-slate-800">
                              {item.assetId}
                            </td>
                            <td className="py-3 px-4">
                              <div className="font-semibold text-slate-900">{item.description}</div>
                              {item.brandModel && (
                                <div className="text-[11px] text-slate-400">{item.brandModel}</div>
                              )}
                            </td>
                            <td className="py-3 px-4 text-slate-600">{item.category}</td>
                            <td className="py-3 px-4 text-center font-semibold text-slate-900">
                              {item.stockQty} {item.unit}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <button
                                type="button"
                                onClick={() => handleInitiateSingleDelete(item)}
                                className="inline-flex items-center space-x-1 px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 active:bg-rose-200 border border-rose-200 rounded-md transition-colors cursor-pointer"
                                title="Remove item from inventory"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Remove</span>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 2: DEDUCT / DISPOSE STOCK QUANTITY */}
              {activeTab === 'deduct_qty' && (
                <form onSubmit={handleDeductStockSubmit} className="space-y-5 max-w-2xl mx-auto py-2">
                  <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-lg text-xs text-amber-900 space-y-1">
                    <div className="font-bold flex items-center space-x-1.5 text-amber-900">
                      <ArrowDownCircle className="w-4 h-4 text-amber-600" />
                      <span>Deduct Warehouse Stock Without Deleting Master Asset Record</span>
                    </div>
                    <p className="text-amber-800">
                      Use this when items in the warehouse are damaged, scrapped, expired, or written off.
                    </p>
                  </div>

                  {/* Select Item */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700">
                      Select Item to Deduct From:
                    </label>
                    <select
                      value={deductItemId}
                      onChange={(e) => setDeductItemId(e.target.value)}
                      required
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white cursor-pointer font-medium"
                    >
                      <option value="">-- Choose an item from the list --</option>
                      {items.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.assetId} - {item.description} (Stock: {item.stockQty} {item.unit})
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedDeductItem && (
                    <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-slate-400 block text-[11px]">Warehouse Stock:</span>
                        <strong className="text-slate-900 text-sm">
                          {selectedDeductItem.stockQty} {selectedDeductItem.unit}
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">Storage Location:</span>
                        <strong className="text-slate-900 text-sm">
                          {selectedDeductItem.location || 'Lumiere'}
                        </strong>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Quantity to Deduct */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-700">
                        Quantity to Deduct:
                      </label>
                      <input
                        type="number"
                        min="1"
                        max={selectedDeductItem ? selectedDeductItem.stockQty : 99999}
                        value={deductQty}
                        onChange={(e) => setDeductQty(parseInt(e.target.value, 10) || 1)}
                        required
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white"
                      />
                    </div>

                    {/* Reason for deduction */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-700">
                        Reason for Deduction:
                      </label>
                      <select
                        value={deductReason}
                        onChange={(e) => setDeductReason(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white cursor-pointer font-medium"
                      >
                        <option value="Damaged / Defective">Damaged / Defective</option>
                        <option value="Scrapped / Decommissioned">Scrapped / Decommissioned</option>
                        <option value="Expired / Degraded Quality">Expired / Degraded Quality</option>
                        <option value="Lost / Unaccounted in Warehouse">Lost / Unaccounted in Warehouse</option>
                        <option value="Sold / Direct Clearance">Sold / Direct Clearance</option>
                        <option value="Other">Other / Custom Reason...</option>
                      </select>
                    </div>
                  </div>

                  {deductReason === 'Other' && (
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-700">
                        Custom Reason / Remark:
                      </label>
                      <input
                        type="text"
                        value={customReason}
                        onChange={(e) => setCustomReason(e.target.value)}
                        placeholder="e.g., Transferred to headquarters, donation, write-down"
                        required
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white"
                      />
                    </div>
                  )}

                  <div className="pt-2 flex justify-end">
                    <button
                      type="submit"
                      disabled={!selectedDeductItem || selectedDeductItem.stockQty === 0}
                      className="inline-flex items-center space-x-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-sm transition-all cursor-pointer"
                    >
                      <MinusCircle className="w-4 h-4" />
                      <span>Confirm Stock Deduction</span>
                    </button>
                  </div>
                </form>
              )}

              {/* TAB 3: BATCH REMOVE (Select multiple items) */}
              {activeTab === 'batch_remove' && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="relative flex-1 w-full">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search items for batch selection..."
                        className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 focus:bg-white"
                      />
                    </div>

                    <div className="flex items-center space-x-2 w-full sm:w-auto">
                      <button
                        type="button"
                        onClick={handleSelectAllFiltered}
                        className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                      >
                        {selectedIds.length === filteredItems.length && filteredItems.length > 0
                          ? 'Deselect All'
                          : 'Select All Filtered'}
                      </button>

                      <button
                        type="button"
                        onClick={handleInitiateBatchDelete}
                        disabled={selectedIds.length === 0}
                        className="px-3.5 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg shadow-xs transition-all cursor-pointer flex items-center space-x-1.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove Selected ({selectedIds.length})</span>
                      </button>
                    </div>
                  </div>

                  <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                          <th className="py-2.5 px-3 w-10 text-center">
                            <input
                              type="checkbox"
                              checked={
                                selectedIds.length === filteredItems.length &&
                                filteredItems.length > 0
                              }
                              onChange={handleSelectAllFiltered}
                              className="rounded border-slate-300 text-rose-600 focus:ring-rose-500 cursor-pointer"
                            />
                          </th>
                          <th className="py-2.5 px-3">Asset ID</th>
                          <th className="py-2.5 px-3">Description</th>
                          <th className="py-2.5 px-3">Category</th>
                          <th className="py-2.5 px-3 text-center">Warehouse Stock</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredItems.map((item) => {
                          const isSelected = selectedIds.includes(item.id);
                          return (
                            <tr
                              key={item.id}
                              onClick={() => handleToggleSelect(item.id)}
                              className={`cursor-pointer transition-colors ${
                                isSelected ? 'bg-rose-50/70' : 'hover:bg-slate-50'
                              }`}
                            >
                              <td className="py-2.5 px-3 text-center">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => handleToggleSelect(item.id)}
                                  onClick={(e) => e.stopPropagation()}
                                  className="rounded border-slate-300 text-rose-600 focus:ring-rose-500 cursor-pointer"
                                />
                              </td>
                              <td className="py-2.5 px-3 font-mono font-bold text-slate-800">
                                {item.assetId}
                              </td>
                              <td className="py-2.5 px-3 font-medium text-slate-900">
                                {item.description}
                              </td>
                              <td className="py-2.5 px-3 text-slate-600">{item.category}</td>
                              <td className="py-2.5 px-3 text-center font-semibold">
                                {item.stockQty} {item.unit}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div>
            Total <strong className="text-slate-800">{items.length}</strong> items in inventory
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold rounded-lg transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>

        {/* ========================================================================= */}
        {/* IN-APP CONFIRMATION DIALOG FOR SINGLE ITEM REMOVAL                        */}
        {/* ========================================================================= */}
        {itemPendingDeletion && (
          <div
            id="single-delete-confirm-overlay"
            className="absolute inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4"
          >
            <div className="bg-white rounded-xl shadow-2xl border border-rose-200 max-w-md w-full p-6 space-y-4 animate-scaleUp">
              <div className="flex items-start space-x-3">
                <div className="p-2.5 bg-rose-100 text-rose-600 rounded-full flex-shrink-0">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-slate-900">
                    Are you sure to remove this Item?
                  </h3>
                  <p className="text-xs text-slate-500">
                    This action will permanently delete this asset record from your inventory.
                  </p>
                </div>
              </div>

              {/* Item Card Details */}
              <div className="bg-slate-50 rounded-lg p-3.5 border border-slate-200 space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200">
                    {itemPendingDeletion.assetId}
                  </span>
                  <span className="text-slate-500 font-medium">{itemPendingDeletion.category}</span>
                </div>
                <div className="font-semibold text-slate-900 text-sm">
                  {itemPendingDeletion.description}
                </div>
                <div className="flex items-center space-x-4 text-slate-600 pt-1 text-[11px]">
                  <span>Warehouse Stock: <strong>{itemPendingDeletion.stockQty} {itemPendingDeletion.unit}</strong></span>
                  <span>Storage Location: <strong>{itemPendingDeletion.location || 'Lumiere'}</strong></span>
                </div>
              </div>

              {/* Action Buttons: Yes / No */}
              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={handleCancelSingleDelete}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                >
                  No, Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmSingleDelete}
                  className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm transition-colors cursor-pointer flex items-center space-x-1.5"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Yes, Remove Item</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* IN-APP CONFIRMATION DIALOG FOR BATCH ITEMS REMOVAL                         */}
        {/* ========================================================================= */}
        {isConfirmingBatchDelete && (
          <div
            id="batch-delete-confirm-overlay"
            className="absolute inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4"
          >
            <div className="bg-white rounded-xl shadow-2xl border border-rose-200 max-w-md w-full p-6 space-y-4 animate-scaleUp">
              <div className="flex items-start space-x-3">
                <div className="p-2.5 bg-rose-100 text-rose-600 rounded-full flex-shrink-0">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-slate-900">
                    Remove {selectedIds.length} Selected Items?
                  </h3>
                  <p className="text-xs text-slate-500">
                    Are you sure you want to remove all {selectedIds.length} selected items from your inventory?
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsConfirmingBatchDelete(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                >
                  No, Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmBatchDelete}
                  className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm transition-colors cursor-pointer flex items-center space-x-1.5"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Yes, Remove {selectedIds.length} Items</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
