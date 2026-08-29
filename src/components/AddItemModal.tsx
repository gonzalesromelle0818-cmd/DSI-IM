import React, { useState } from 'react';
import { X, Plus, PackagePlus, Sparkles, AlertCircle, ArrowUpRight } from 'lucide-react';
import { InventoryItem, ItemCategory } from '../types';
import { generateNextAssetId } from '../utils/inventoryHelpers';

interface AddItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddItem: (item: InventoryItem) => void;
  onRestockItem: (
    itemId: string,
    additionalQty: number,
    notes?: string,
    unitPrice?: number,
    supplier?: string,
    poNumber?: string
  ) => void;
  existingItems: InventoryItem[];
  preselectedItemId?: string | null;
}

const CATEGORIES: ItemCategory[] = [
  'Hand Tools',
  'Power Tools',
  'Screw/Bolt',
  'Consumables',
  'Others',
];

const COMMON_UNITS = [
  'pcs',
  'sets',
  'meters',
  'rolls',
  'units',
  'boxes',
  'packs',
  'pairs',
  'drums',
  'liters',
  'kgs',
];

export const AddItemModal: React.FC<AddItemModalProps> = ({
  isOpen,
  onClose,
  onAddItem,
  onRestockItem,
  existingItems,
  preselectedItemId,
}) => {
  // Mode: 'new_item' (brand new asset) or 'add_stock' (restock existing)
  const [mode, setMode] = useState<'new_item' | 'add_stock'>('new_item');

  // Form states for New Item
  const [category, setCategory] = useState<ItemCategory>('Hand Tools');
  const [assetId, setAssetId] = useState('');
  const [description, setDescription] = useState('');
  const [unit, setUnit] = useState('pcs');
  const [customUnit, setCustomUnit] = useState('');
  const [stockQty, setStockQty] = useState<number | ''>(1);
  const [minReorderLevel, setMinReorderLevel] = useState<number | ''>(5);
  const [unitPrice, setUnitPrice] = useState<number | ''>('');
  const [location, setLocation] = useState('Lumiere');
  const [brandModel, setBrandModel] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Form states for Restock Existing
  const [selectedRestockId, setSelectedRestockId] = useState<string>('');
  const [restockQty, setRestockQty] = useState<number | ''>(10);
  const [restockUnitPrice, setRestockUnitPrice] = useState<number | ''>('');
  const [restockSupplier, setRestockSupplier] = useState('');
  const [restockNote, setRestockNote] = useState('');
  const [restockPONumber, setRestockPONumber] = useState('');

  // Sync state when modal opens or preselectedItemId changes
  React.useEffect(() => {
    if (isOpen) {
      setErrors({});
      if (preselectedItemId) {
        setMode('add_stock');
        setSelectedRestockId(preselectedItemId);
        const item = existingItems.find((i) => i.id === preselectedItemId);
        if (item) {
          if (item.unitPrice) setRestockUnitPrice(item.unitPrice);
          const suggested = Math.max(1, (item.minReorderLevel * 2) - item.stockQty);
          setRestockQty(suggested > 0 ? suggested : 10);
        }
      } else {
        setMode('new_item');
        setAssetId(generateNextAssetId('Hand Tools', existingItems));
        if (existingItems.length > 0) {
          setSelectedRestockId(existingItems[0].id);
          if (existingItems[0].unitPrice) {
            setRestockUnitPrice(existingItems[0].unitPrice);
          }
        }
      }
    }
  }, [isOpen, preselectedItemId, existingItems]);

  // When selectedRestockId changes, update default unit price
  React.useEffect(() => {
    if (selectedRestockId) {
      const item = existingItems.find((i) => i.id === selectedRestockId);
      if (item && item.unitPrice !== undefined) {
        setRestockUnitPrice(item.unitPrice);
      }
    }
  }, [selectedRestockId, existingItems]);

  if (!isOpen) return null;

  const handleCategoryChange = (newCat: ItemCategory) => {
    setCategory(newCat);
    setAssetId(generateNextAssetId(newCat, existingItems));
  };

  const handleAutoGenerateId = () => {
    setAssetId(generateNextAssetId(category, existingItems));
  };

  const validateNewItem = () => {
    const errs: { [key: string]: string } = {};
    if (!assetId.trim()) errs.assetId = 'Asset ID is required.';
    // Check duplicate asset ID
    if (existingItems.some((i) => i.assetId.toLowerCase() === assetId.trim().toLowerCase())) {
      errs.assetId = 'This Asset ID is already registered.';
    }
    if (!description.trim()) errs.description = 'Item description is required.';
    const finalUnit = unit === 'custom' ? customUnit.trim() : unit;
    if (!finalUnit) errs.unit = 'Please specify unit.';
    if (stockQty === '' || Number(stockQty) < 0) errs.stockQty = 'Stock qty must be 0 or greater.';
    if (minReorderLevel === '' || Number(minReorderLevel) < 0)
      errs.minReorderLevel = 'Reorder threshold is required.';

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmitNewItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateNewItem()) return;

    const finalUnit = unit === 'custom' ? customUnit.trim() : unit;
    const numericUnitPrice = unitPrice === '' ? undefined : Math.max(0, Number(unitPrice));
    const newItem: InventoryItem = {
      id: 'item-' + Date.now(),
      assetId: assetId.trim().toUpperCase(),
      description: description.trim(),
      category,
      stockQty: Number(stockQty) || 0,
      unit: finalUnit,
      minReorderLevel: Number(minReorderLevel) || 0,
      unitPrice: numericUnitPrice,
      location: location.trim() || undefined,
      brandModel: brandModel.trim() || undefined,
      notes: notes.trim() || undefined,
      lastUpdated: new Date().toISOString().slice(0, 10),
      projectAllocations: [],
    };

    onAddItem(newItem);
    onClose();
  };

  const handleSubmitRestock = (e: React.FormEvent) => {
    e.preventDefault();
    const targetId = selectedRestockId || (existingItems.length > 0 ? existingItems[0].id : '');
    if (!targetId) {
      setErrors({ restockTarget: 'Please select an item from inventory to restock.' });
      return;
    }
    const numQty = Number(restockQty);
    if (restockQty === '' || isNaN(numQty) || numQty <= 0) {
      setErrors({ restockQty: 'Quantity to add must be greater than 0' });
      return;
    }

    const priceNum = restockUnitPrice === '' ? undefined : Number(restockUnitPrice);

    onRestockItem(
      targetId,
      numQty,
      restockNote.trim() || undefined,
      priceNum !== undefined && !isNaN(priceNum) && priceNum >= 0 ? priceNum : undefined,
      restockSupplier.trim() || undefined,
      restockPONumber.trim() || undefined
    );
    onClose();
  };

  const selectedRestockItem = existingItems.find(
    (i) => i.id === (selectedRestockId || (existingItems.length > 0 ? existingItems[0].id : ''))
  );

  return (
    <div
      id="add-item-modal-overlay"
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="add-item-modal-container"
        className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden my-8"
      >
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-teal-500/20 text-teal-400 border border-teal-500/30">
              <PackagePlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">
                Add Inventory / Stock Inflow
              </h2>
              <p className="text-xs text-slate-300">
                Register new assets or replenish existing inventory stocks.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection: New Item vs Quick Restock */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-3 space-x-4">
          <button
            type="button"
            onClick={() => {
              setMode('new_item');
              setErrors({});
            }}
            className={`pb-3 text-sm font-semibold flex items-center space-x-2 border-b-2 transition-all cursor-pointer ${
              mode === 'new_item'
                ? 'border-teal-600 text-teal-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>Create New Asset / Item</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('add_stock');
              setErrors({});
            }}
            className={`pb-3 text-sm font-semibold flex items-center space-x-2 border-b-2 transition-all cursor-pointer ${
              mode === 'add_stock'
                ? 'border-teal-600 text-teal-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <ArrowUpRight className="w-4 h-4" />
            <span>Replenish Existing Stocks (Restock)</span>
          </button>
        </div>

        {/* Form Body */}
        {mode === 'new_item' ? (
          <form onSubmit={handleSubmitNewItem} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
            {/* Category & Asset ID */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Category *
                </label>
                <select
                  value={category}
                  onChange={(e) => handleCategoryChange(e.target.value as ItemCategory)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Asset ID *
                  </label>
                  <button
                    type="button"
                    onClick={handleAutoGenerateId}
                    className="text-[11px] text-teal-600 hover:text-teal-700 font-semibold flex items-center space-x-1"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Auto-ID</span>
                  </button>
                </div>
                <input
                  type="text"
                  value={assetId}
                  onChange={(e) => setAssetId(e.target.value)}
                  placeholder="e.g. DSI-EQ-020"
                  className={`w-full px-3 py-2 font-mono text-sm uppercase bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                    errors.assetId ? 'border-red-500 bg-red-50/20' : 'border-slate-300'
                  }`}
                />
                {errors.assetId && (
                  <p className="text-xs text-red-600 mt-1">{errors.assetId}</p>
                )}
              </div>
            </div>

            {/* Description / Item Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Description / Item Name *
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Heavy Duty Rotary Hammer Drill 800W with SDS-Plus Chuck Kit"
                className={`w-full px-3 py-2 text-sm bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                  errors.description ? 'border-red-500 bg-red-50/20' : 'border-slate-300'
                }`}
              />
              {errors.description && (
                <p className="text-xs text-red-600 mt-1">{errors.description}</p>
              )}
            </div>

            {/* Brand / Model & Storage Location */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Brand / Model / Spec
                </label>
                <input
                  type="text"
                  value={brandModel}
                  onChange={(e) => setBrandModel(e.target.value)}
                  placeholder="e.g. Bosch GBH 2-26 DRE"
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Storage Location / Bin
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Lumiere"
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>

            {/* Quantities: Stock, Min Reorder Level, Unit */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center justify-between">
                <span>Quantities & Stock Controls</span>
                <span className="text-[11px] text-teal-700 font-normal">
                  Auto-status calculated
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Available Stock */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Available Stock Qty *
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={stockQty}
                    onChange={(e) => setStockQty(e.target.value === '' ? '' : Number(e.target.value))}
                    className={`w-full px-2.5 py-1.5 text-sm font-semibold bg-white border rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                      errors.stockQty ? 'border-red-500' : 'border-slate-300'
                    }`}
                  />
                  {errors.stockQty && <p className="text-[10px] text-red-600 mt-0.5">{errors.stockQty}</p>}
                </div>

                {/* Min Reorder Threshold */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Min Reorder Level *
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={minReorderLevel}
                    onChange={(e) =>
                      setMinReorderLevel(e.target.value === '' ? '' : Number(e.target.value))
                    }
                    title="If available stock falls below or equal to this, alert for replenishment is shown"
                    className={`w-full px-2.5 py-1.5 text-sm font-semibold bg-white border rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                      errors.minReorderLevel ? 'border-red-500' : 'border-slate-300'
                    }`}
                  />
                  {errors.minReorderLevel && (
                    <p className="text-[10px] text-red-600 mt-0.5">{errors.minReorderLevel}</p>
                  )}
                </div>

                {/* Unit */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Unit *
                  </label>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    {COMMON_UNITS.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                    <option value="custom">Other (Custom)</option>
                  </select>
                </div>
              </div>

              {unit === 'custom' && (
                <div className="pt-1">
                  <input
                    type="text"
                    placeholder="Enter custom unit (e.g. bundle, length, spool)"
                    value={customUnit}
                    onChange={(e) => setCustomUnit(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                  {errors.unit && <p className="text-xs text-red-600 mt-1">{errors.unit}</p>}
                </div>
              )}

              {/* Threshold Note Helper */}
              <div className="text-[11px] text-slate-500 flex items-center space-x-1.5 pt-1">
                <AlertCircle className="w-3.5 h-3.5 text-teal-600 flex-shrink-0" />
                <span>
                  Status will automatically mark as <strong>"Order to Replenish"</strong> whenever
                  Warehouse Stock ≤ Min Reorder Level.
                </span>
              </div>
            </div>

            {/* Price & Valuation Section */}
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
                    Halagang presyo bawat unit/piraso para sa project cost summary.
                  </p>
                </div>

                <div className="bg-white p-3 rounded-lg border border-emerald-100/90 shadow-2xs space-y-1">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                    Estimated Stock Value
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
                    {stockQty || 0} {unit === 'custom' ? (customUnit || 'unit') : unit} × ₱
                    {unitPrice !== '' ? Number(unitPrice).toLocaleString() : '0.00'}
                  </div>
                </div>
              </div>
            </div>

            {/* Notes / Supplier Reference */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Notes / Supplier Reference
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Lead time: 3 days. Preferred supplier: DSI Manila Depot"
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                id="btn-save-new-item"
                className="px-5 py-2 text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-sm transition-colors flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>Save New Item</span>
              </button>
            </div>
          </form>
        ) : (
          /* Mode: Replenish Existing Stocks */
          existingItems.length === 0 ? (
            <div className="p-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-800">No Inventory Items Registered Yet</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                There are no existing assets in the inventory to replenish. Please switch to "Create New Asset" to register your first item.
              </p>
              <button
                type="button"
                onClick={() => setMode('new_item')}
                className="mt-2 px-4 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors inline-flex items-center space-x-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create New Asset Now</span>
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmitRestock} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {errors.restockTarget && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 font-semibold">
                  {errors.restockTarget}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Select Asset to Restock *
                </label>
                <select
                  value={selectedRestockId}
                  onChange={(e) => setSelectedRestockId(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  {existingItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      [{item.assetId}] {item.description} — (Current Stock: {item.stockQty} {item.unit})
                    </option>
                  ))}
                </select>
              </div>

              {selectedRestockItem && (
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1.5">
                  <div className="flex items-center justify-between text-slate-700">
                    <span className="font-semibold">Current In-Stock Quantity:</span>
                    <span className="font-bold text-slate-900 text-sm">
                      {selectedRestockItem.stockQty} {selectedRestockItem.unit}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Min Reorder Level:</span>
                    <span className="font-medium text-amber-700">
                      {selectedRestockItem.minReorderLevel} {selectedRestockItem.unit}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Storage Location:</span>
                    <span className="font-medium text-slate-800">
                      {selectedRestockItem.location || 'Not specified'}
                    </span>
                  </div>
                  {selectedRestockItem.unitPrice !== undefined && (
                    <div className="flex items-center justify-between text-slate-600">
                      <span>Registered Unit Price:</span>
                      <span className="font-semibold text-emerald-800">
                        ₱{selectedRestockItem.unitPrice.toLocaleString()} / {selectedRestockItem.unit}
                      </span>
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Quantity to Add / Inflow *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={restockQty}
                    onChange={(e) => setRestockQty(e.target.value === '' ? '' : Number(e.target.value))}
                    className={`w-full px-3 py-2 text-sm font-bold bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                      errors.restockQty ? 'border-red-500' : 'border-slate-300'
                    }`}
                    placeholder="e.g. 10"
                  />
                  {errors.restockQty && (
                    <p className="text-xs text-red-600 mt-1">{errors.restockQty}</p>
                  )}
                  {selectedRestockItem && restockQty !== '' && (
                    <p className="text-[11px] text-teal-700 font-medium mt-1">
                      New Stock will be:{' '}
                      <strong>
                        {selectedRestockItem.stockQty + Number(restockQty)} {selectedRestockItem.unit}
                      </strong>
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Unit Purchase Price (₱)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                      ₱
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={restockUnitPrice}
                      onChange={(e) =>
                        setRestockUnitPrice(e.target.value === '' ? '' : Number(e.target.value))
                      }
                      className="w-full pl-7 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  {restockUnitPrice !== '' && restockQty !== '' && (
                    <p className="text-[11px] text-emerald-700 font-semibold mt-1">
                      Total Inflow Cost: ₱
                      {(Number(restockUnitPrice) * Number(restockQty)).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    PO / DR Reference #
                  </label>
                  <input
                    type="text"
                    value={restockPONumber}
                    onChange={(e) => setRestockPONumber(e.target.value)}
                    placeholder="e.g. PO-2026-881 / DR-4092"
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Supplier / Vendor
                  </label>
                  <input
                    type="text"
                    value={restockSupplier}
                    onChange={(e) => setRestockSupplier(e.target.value)}
                    placeholder="e.g. DSI Central Hardware / Wilcon"
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Delivery Notes / Remarks
                </label>
                <input
                  type="text"
                  value={restockNote}
                  onChange={(e) => setRestockNote(e.target.value)}
                  placeholder="e.g. Received in good condition at Lumiere tool room"
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  id="btn-confirm-restock"
                  className="px-5 py-2 text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-sm transition-colors flex items-center space-x-2"
                >
                  <ArrowUpRight className="w-4 h-4" />
                  <span>Confirm Stock Replenishment</span>
                </button>
              </div>
            </form>
          )
        )}
      </div>
    </div>
  );
};
