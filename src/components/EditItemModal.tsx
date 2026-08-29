import React, { useState } from 'react';
import { X, Save, Trash2, AlertCircle } from 'lucide-react';
import { InventoryItem, ItemCategory } from '../types';

interface EditItemModalProps {
  isOpen: boolean;
  item: InventoryItem | null;
  onClose: () => void;
  onUpdate: (updatedItem: InventoryItem) => void;
  onDelete: (itemId: string) => void;
}

const CATEGORIES: ItemCategory[] = [
  'Hand Tools',
  'Power Tools',
  'Screw/Bolt',
  'Consumables',
  'Others',
];

export const EditItemModal: React.FC<EditItemModalProps> = ({
  isOpen,
  item,
  onClose,
  onUpdate,
  onDelete,
}) => {
  if (!isOpen || !item) return null;

  const [assetId, setAssetId] = useState(item.assetId);
  const [description, setDescription] = useState(item.description);
  const [category, setCategory] = useState<ItemCategory>(item.category);
  const [stockQty, setStockQty] = useState<number | ''>(item.stockQty);
  const [unit, setUnit] = useState(item.unit);
  const [minReorderLevel, setMinReorderLevel] = useState<number | ''>(item.minReorderLevel);
  const [unitPrice, setUnitPrice] = useState<number | ''>(
    item.unitPrice !== undefined ? item.unitPrice : ''
  );
  const [location, setLocation] = useState(item.location || '');
  const [brandModel, setBrandModel] = useState(item.brandModel || '');
  const [notes, setNotes] = useState(item.notes || '');

  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assetId.trim() || !description.trim()) return;

    const updated: InventoryItem = {
      ...item,
      assetId: assetId.trim().toUpperCase(),
      description: description.trim(),
      category,
      stockQty: stockQty === '' ? 0 : Number(stockQty),
      unit: unit.trim(),
      minReorderLevel: minReorderLevel === '' ? 0 : Number(minReorderLevel),
      unitPrice: unitPrice === '' ? undefined : Math.max(0, Number(unitPrice)),
      location: location.trim() || undefined,
      brandModel: brandModel.trim() || undefined,
      notes: notes.trim() || undefined,
      lastUpdated: new Date().toISOString().slice(0, 10),
    };

    onUpdate(updated);
    onClose();
  };

  return (
    <div
      id="edit-item-modal-overlay"
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight flex items-center space-x-2">
              <span>Edit Asset Details</span>
              <span className="text-xs font-mono font-normal px-2 py-0.5 rounded bg-teal-900/60 text-teal-300 border border-teal-500/40">
                {item.assetId}
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Update item specifications, quantities, or threshold settings.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Asset ID & Category */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Asset ID *
              </label>
              <input
                type="text"
                value={assetId}
                onChange={(e) => setAssetId(e.target.value)}
                className="w-full px-3 py-2 font-mono text-sm uppercase bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Category *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ItemCategory)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Description / Item Name *
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
              required
            />
          </div>

          {/* Brand & Location */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Brand / Model
              </label>
              <input
                type="text"
                value={brandModel}
                onChange={(e) => setBrandModel(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Storage Location
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          {/* Quantities & Status */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Quantity & Reorder Management
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Stock Qty (Warehouse)
                </label>
                <input
                  type="number"
                  min="0"
                  value={stockQty}
                  onChange={(e) => setStockQty(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 text-sm font-semibold bg-white border border-slate-300 rounded-md focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Min Reorder Level
                </label>
                <input
                  type="number"
                  min="0"
                  value={minReorderLevel}
                  onChange={(e) =>
                    setMinReorderLevel(e.target.value === '' ? '' : Number(e.target.value))
                  }
                  className="w-full px-2.5 py-1.5 text-sm font-semibold bg-white border border-slate-300 rounded-md focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Unit
                </label>
                <input
                  type="text"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-sm bg-white border border-slate-300 rounded-md focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>
          </div>

          {/* Unit Price & Costing Section */}
          <div className="p-4 bg-emerald-50/40 border border-emerald-200/80 rounded-lg space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-emerald-950 flex items-center justify-between">
              <span>Unit Price & Costing (PHP ₱)</span>
              <span className="text-[11px] text-emerald-700 font-semibold">
                For Project Expenses & Valuation
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Unit Price (PHP / ₱)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-500">
                    ₱
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00 (e.g. 1500.00)"
                    value={unitPrice}
                    onChange={(e) =>
                      setUnitPrice(e.target.value === '' ? '' : Number(e.target.value))
                    }
                    className="w-full pl-8 pr-3 py-2 text-sm font-semibold bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  Presyo bawat unit para sa project costing summary.
                </p>
              </div>

              <div className="bg-white p-3 rounded-lg border border-emerald-100/90 shadow-2xs space-y-1">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                  Current Total Asset Value
                </span>
                <div className="text-base font-extrabold text-emerald-800">
                  {unitPrice !== '' && stockQty !== ''
                    ? new Intl.NumberFormat('en-PH', {
                        style: 'currency',
                        currency: 'PHP',
                      }).format(Number(unitPrice) * Number(stockQty))
                    : '₱ 0.00'}
                </div>
                <div className="text-[10px] text-slate-400">
                  {stockQty || 0} {unit} × ₱
                  {unitPrice !== '' ? Number(unitPrice).toLocaleString() : '0.00'}
                </div>
              </div>
            </div>
          </div>

          {/* Notes / Specs */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Notes / Specs
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
            />
          </div>

          {/* Delete Danger Section */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
            {isConfirmingDelete ? (
              <div className="flex items-center space-x-2">
                <span className="text-xs text-red-600 font-semibold">Confirm delete?</span>
                <button
                  type="button"
                  onClick={() => {
                    onDelete(item.id);
                    onClose();
                  }}
                  className="px-3 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-md"
                >
                  Yes, Delete Item
                </button>
                <button
                  type="button"
                  onClick={() => setIsConfirmingDelete(false)}
                  className="px-2.5 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-md"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsConfirmingDelete(true)}
                className="inline-flex items-center space-x-1.5 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 px-2.5 py-1.5 rounded-md transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete Asset</span>
              </button>
            )}

            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                id="btn-save-edit-item"
                className="px-5 py-2 text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-sm transition-colors flex items-center space-x-2"
              >
                <Save className="w-4 h-4" />
                <span>Save Changes</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
