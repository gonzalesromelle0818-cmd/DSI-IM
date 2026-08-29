import React, { useState, useMemo } from 'react';
import {
  ShoppingCart,
  AlertTriangle,
  Plus,
  CheckCircle2,
  ArrowRight,
  Search,
  Download,
  Filter,
  PackagePlus,
  Building2,
  Banknote,
  Layers,
  Trash2,
  Calendar,
  Truck,
  UserCheck,
  FileText,
  RotateCcw,
  Sparkles,
  CheckSquare,
  Square,
  SlidersHorizontal,
} from 'lucide-react';
import { InventoryItem, PurchaseRecord, ItemCategory } from '../types';
import { getReorderStatus, formatCurrency } from '../utils/inventoryHelpers';
import { RemovePurchaseModal } from './RemovePurchaseModal';

interface PurchasesViewProps {
  items: InventoryItem[];
  purchases: PurchaseRecord[];
  onNavigateToInventory: () => void;
  onRestockItem: (item: InventoryItem) => void;
  onOpenAddItemModal: () => void;
  onAddDirectPurchase: (
    itemId: string,
    quantity: number,
    unitPrice?: number,
    poNumber?: string,
    supplier?: string,
    receivedBy?: string,
    notes?: string
  ) => void;
  onDeletePurchaseRecord?: (purchaseId: string, rollbackStock: boolean) => void;
  onDeleteMultiplePurchases?: (purchaseIds: string[], rollbackStock: boolean) => void;
  onClearAllPurchases?: (rollbackStock: boolean) => void;
}

export const PurchasesView: React.FC<PurchasesViewProps> = ({
  items,
  purchases,
  onNavigateToInventory,
  onRestockItem,
  onOpenAddItemModal,
  onAddDirectPurchase,
  onDeletePurchaseRecord,
  onDeleteMultiplePurchases,
  onClearAllPurchases,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [historyTab, setHistoryTab] = useState<'all' | 'recent' | 'bulk_manage'>('all');
  const [isDirectIntakeModalOpen, setIsDirectIntakeModalOpen] = useState(false);
  const [isRemoveModalOpen, setIsRemoveModalOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [rollbackStockOption, setRollbackStockOption] = useState(true);
  const [selectedTableIds, setSelectedTableIds] = useState<string[]>([]);
  const [showBatchDeleteConfirm, setShowBatchDeleteConfirm] = useState(false);

  // Form states for inline direct purchase intake
  const [formItemId, setFormItemId] = useState<string>(items.length > 0 ? items[0].id : '');
  const [formQty, setFormQty] = useState<number | ''>(10);
  const [formUnitPrice, setFormUnitPrice] = useState<number | ''>('');
  const [formPoNumber, setFormPoNumber] = useState('');
  const [formSupplier, setFormSupplier] = useState('');
  const [formReceivedBy, setFormReceivedBy] = useState("M' Chrissna");
  const [formNotes, setFormNotes] = useState('');
  const [formDate, setFormDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [formError, setFormError] = useState('');

  // Extract all items currently needing replenishment
  const itemsNeedingReorder = useMemo(() => {
    return items.filter((item) => {
      const status = getReorderStatus(item.stockQty, item.minReorderLevel);
      return status === 'reorder_needed' || status === 'out_of_stock';
    });
  }, [items]);

  // Sync unit price when item selection changes in intake form
  const selectedFormItem = useMemo(() => {
    return items.find((i) => i.id === formItemId);
  }, [items, formItemId]);

  const handleOpenDirectIntakeFor = (item?: InventoryItem) => {
    if (item) {
      setFormItemId(item.id);
      setFormUnitPrice(item.unitPrice !== undefined ? item.unitPrice : '');
      const needed = Math.max(1, (item.minReorderLevel || 5) * 2 - item.stockQty);
      setFormQty(needed > 0 ? needed : 10);
    } else if (items.length > 0) {
      setFormItemId(items[0].id);
      setFormUnitPrice(items[0].unitPrice !== undefined ? items[0].unitPrice : '');
      setFormQty(10);
    }
    setFormPoNumber(`PO-${new Date().getFullYear()}-${String(Math.floor(100 + Math.random() * 900))}`);
    setFormSupplier('DSI Authorized Depot');
    setFormReceivedBy("M' Chrissna");
    setFormNotes('');
    setFormError('');
    setIsDirectIntakeModalOpen(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formItemId) {
      setFormError('Please select an item from inventory to restock.');
      return;
    }
    if (formQty === '' || Number(formQty) <= 0) {
      setFormError('Quantity to add must be greater than 0.');
      return;
    }

    const numericPrice = formUnitPrice === '' ? undefined : Math.max(0, Number(formUnitPrice));
    onAddDirectPurchase(
      formItemId,
      Number(formQty),
      numericPrice,
      formPoNumber.trim() || undefined,
      formSupplier.trim() || undefined,
      formReceivedBy.trim() || undefined,
      formNotes.trim() || undefined
    );

    setIsDirectIntakeModalOpen(false);
  };

  // Filtered Purchases History
  const filteredPurchases = useMemo(() => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().slice(0, 10);

    return purchases.filter((p) => {
      const term = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !term ||
        p.assetId.toLowerCase().includes(term) ||
        p.description.toLowerCase().includes(term) ||
        (p.poNumber && p.poNumber.toLowerCase().includes(term)) ||
        (p.supplier && p.supplier.toLowerCase().includes(term)) ||
        (p.receivedBy && p.receivedBy.toLowerCase().includes(term)) ||
        p.date.includes(term);

      const matchesCat = selectedCategory === 'all' || p.category === selectedCategory;

      let matchesTab = true;
      if (historyTab === 'recent') {
        matchesTab = p.date >= thirtyDaysAgoStr;
      }

      return matchesSearch && matchesCat && matchesTab;
    });
  }, [purchases, searchTerm, selectedCategory, historyTab]);

  // Multi-select table actions
  const handleToggleTableSelect = (id: string) => {
    setSelectedTableIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllTable = () => {
    if (selectedTableIds.length === filteredPurchases.length && filteredPurchases.length > 0) {
      setSelectedTableIds([]);
    } else {
      setSelectedTableIds(filteredPurchases.map((p) => p.id));
    }
  };

  const handleExecuteBatchDelete = () => {
    if (selectedTableIds.length === 0) return;
    if (onDeleteMultiplePurchases) {
      onDeleteMultiplePurchases(selectedTableIds, rollbackStockOption);
    } else if (onDeletePurchaseRecord) {
      selectedTableIds.forEach((id) => onDeletePurchaseRecord(id, rollbackStockOption));
    }
    setSelectedTableIds([]);
    setShowBatchDeleteConfirm(false);
  };

  // Statistics
  const stats = useMemo(() => {
    let totalPurchasedValuation = 0;
    let totalUnitsInflow = 0;

    purchases.forEach((p) => {
      totalUnitsInflow += p.quantity;
      if (p.totalCost) {
        totalPurchasedValuation += p.totalCost;
      } else if (p.unitPrice) {
        totalPurchasedValuation += p.quantity * p.unitPrice;
      }
    });

    return {
      totalPurchasesCount: purchases.length,
      totalPurchasedValuation,
      totalUnitsInflow,
      itemsNeedingReorderCount: itemsNeedingReorder.length,
    };
  }, [purchases, itemsNeedingReorder]);

  // Export CSV
  const handleExportCSV = () => {
    if (filteredPurchases.length === 0) return;

    const headers = [
      'Record ID',
      'PO / DR #',
      'Date',
      'Asset ID',
      'Item Description',
      'Category',
      'Qty Added',
      'Unit',
      'Unit Price (PHP)',
      'Total Cost (PHP)',
      'Supplier',
      'Received By',
      'Notes',
    ];

    const rows = filteredPurchases.map((p) => [
      `"${p.id}"`,
      `"${p.poNumber || ''}"`,
      `"${p.date}"`,
      `"${p.assetId}"`,
      `"${p.description.replace(/"/g, '""')}"`,
      `"${p.category}"`,
      p.quantity,
      `"${p.unit}"`,
      p.unitPrice || 0,
      p.totalCost || (p.unitPrice ? p.quantity * p.unitPrice : 0),
      `"${p.supplier || ''}"`,
      `"${p.receivedBy || ''}"`,
      `"${(p.notes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `DSI_Purchases_Inflow_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div id="purchases-view-root" className="p-6 space-y-6 max-w-[1600px] mx-auto animate-fadeIn">
      {/* 1. Header & Quick Actions */}
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-lg bg-teal-50 text-teal-700 border border-teal-200">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                Purchases & Stock Inflow Management
              </h2>
              <p className="text-xs text-slate-500">
                Replenish inventory stocks, record incoming deliveries, and track purchase valuation.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={onNavigateToInventory}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            ← View Inventory Table
          </button>

          <button
            id="btn-remove-po-records-top"
            onClick={() => setIsRemoveModalOpen(true)}
            disabled={purchases.length === 0}
            className="px-3.5 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 disabled:opacity-50 border border-rose-200 rounded-lg transition-colors flex items-center space-x-1.5 cursor-pointer"
            title="Remove or cancel PO records from history"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-600" />
            <span>🗑️ Remove PO Records</span>
          </button>

          <button
            id="btn-new-item-purchase"
            onClick={onOpenAddItemModal}
            className="px-3.5 py-2 text-xs font-semibold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-lg transition-colors flex items-center space-x-1.5 cursor-pointer"
            title="Register a completely new asset to catalog"
          >
            <Plus className="w-3.5 h-3.5 text-teal-700" />
            <span>+ Create New Asset</span>
          </button>

          <button
            id="btn-add-purchase-stock"
            onClick={() => handleOpenDirectIntakeFor()}
            className="px-4 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 active:bg-teal-800 rounded-lg shadow-sm shadow-teal-700/20 transition-all flex items-center space-x-2 cursor-pointer"
          >
            <PackagePlus className="w-4 h-4" />
            <span>+ Add Stock / Purchase Replenish</span>
          </button>
        </div>
      </div>

      {/* 2. Metric Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Purchases Recorded */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Inflow Records
            </span>
            <div className="text-2xl font-bold text-slate-900">{stats.totalPurchasesCount}</div>
            <span className="text-[11px] text-slate-400 font-medium">Logged delivery batches</span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700">
            <Truck className="w-5 h-5" />
          </div>
        </div>

        {/* Total Stock Units Inflow */}
        <div className="bg-white rounded-xl p-4 border border-teal-200 shadow-2xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-teal-800">
              Stock Units Inflow
            </span>
            <div className="text-2xl font-bold text-teal-900">{stats.totalUnitsInflow.toLocaleString()}</div>
            <span className="text-[11px] text-teal-600 font-medium">Replenished into warehouse</span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        {/* Total Inflow Valuation */}
        <div className="bg-white rounded-xl p-4 border border-emerald-200 shadow-2xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-800">
              Purchases Valuation
            </span>
            <div className="text-xl font-extrabold text-emerald-900">
              {formatCurrency(stats.totalPurchasedValuation)}
            </div>
            <span className="text-[11px] text-emerald-700 font-medium">Total purchase acquisition</span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
            <Banknote className="w-5 h-5" />
          </div>
        </div>

        {/* Low Stock / Needs Replenish Warning */}
        <div
          className={`rounded-xl p-4 border shadow-2xs flex items-center justify-between ${
            stats.itemsNeedingReorderCount > 0
              ? 'bg-amber-50/80 border-amber-300'
              : 'bg-white border-slate-200'
          }`}
        >
          <div className="space-y-1">
            <div className="flex items-center space-x-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-800">
                Items For Replenish
              </span>
              {stats.itemsNeedingReorderCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
              )}
            </div>
            <div className="text-2xl font-bold text-amber-900">{stats.itemsNeedingReorderCount}</div>
            <span className="text-[11px] text-amber-700 font-medium">
              {stats.itemsNeedingReorderCount > 0 ? 'Stock ≤ min threshold' : 'All stocks healthy'}
            </span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-800">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 3. Reorder Queue Section (Items Flagged For Reorder) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Low Stock & Reorder Queue ({itemsNeedingReorder.length})
            </h3>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            Items currently at or below minimum reorder threshold
          </span>
        </div>

        {itemsNeedingReorder.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500 mb-1.5" />
            <p className="font-semibold text-slate-800 text-sm">All inventory stock levels are healthy.</p>
            <p className="text-xs text-slate-400">No items currently below minimum safe stock levels.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {itemsNeedingReorder.map((item) => (
              <div
                key={item.id}
                className="p-4 hover:bg-slate-50/80 flex flex-col md:flex-row md:items-center justify-between gap-3 text-sm transition-colors"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                      {item.assetId}
                    </span>
                    <span className="font-semibold text-slate-900">{item.description}</span>
                    {item.stockQty === 0 ? (
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-red-100 text-red-800 border border-red-200">
                        Out of Stock
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                        Low Stock
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                    <span>
                      Current Stock:{' '}
                      <strong className={item.stockQty === 0 ? 'text-red-600' : 'text-amber-600'}>
                        {item.stockQty} {item.unit}
                      </strong>
                    </span>
                    <span>
                      • Min Threshold:{' '}
                      <strong className="text-slate-800">
                        {item.minReorderLevel} {item.unit}
                      </strong>
                    </span>
                    <span>
                      • Recommended Order:{' '}
                      <strong className="text-teal-700">
                        +{Math.max(1, item.minReorderLevel * 2 - item.stockQty)} {item.unit}
                      </strong>
                    </span>
                    {item.unitPrice !== undefined && (
                      <span>
                        • Current Unit Price: <strong>{formatCurrency(item.unitPrice)}</strong>
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleOpenDirectIntakeFor(item)}
                    className="px-3.5 py-1.5 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 active:bg-teal-800 rounded-lg shadow-2xs flex items-center space-x-1.5 transition-colors cursor-pointer"
                  >
                    <span>⚡ Quick Replenish / Add Stock</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4. Purchases History & Stock Inflow Log */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden space-y-4 p-4">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center space-x-2">
              <FileText className="w-4 h-4 text-teal-600" />
              <span>Stock Inflow & Purchases History Log</span>
            </h3>
            <p className="text-xs text-slate-500">
              Audit trail of all registered purchases, deliveries, and stock replenishment entries with remove & rollback capability.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              id="btn-remove-po-history"
              onClick={() => setIsRemoveModalOpen(true)}
              disabled={purchases.length === 0}
              className="px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 disabled:opacity-50 border border-rose-200 rounded-lg transition-colors flex items-center space-x-1.5 cursor-pointer"
              title="Open modal to remove PO records or rollback stock"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
              <span>Remove / Cancel POs</span>
            </button>

            <button
              onClick={handleExportCSV}
              disabled={filteredPurchases.length === 0}
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 border border-slate-200 rounded-lg transition-colors flex items-center space-x-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Inflow CSV</span>
            </button>
          </div>
        </div>

        {/* Filter Tabs & Search Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* History Tabs */}
          <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-lg border border-slate-200 self-start">
            <button
              onClick={() => setHistoryTab('all')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                historyTab === 'all'
                  ? 'bg-white text-teal-800 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Inflows ({purchases.length})
            </button>
            <button
              onClick={() => setHistoryTab('recent')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                historyTab === 'recent'
                  ? 'bg-white text-teal-800 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Recent (Last 30 Days)
            </button>
            <button
              onClick={() => setHistoryTab('bulk_manage')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer flex items-center space-x-1 ${
                historyTab === 'bulk_manage'
                  ? 'bg-rose-50 text-rose-800 border border-rose-200 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-rose-700'
              }`}
            >
              <SlidersHorizontal className="w-3 h-3 text-rose-500" />
              <span>Manage & Remove Mode</span>
            </button>
          </div>

          {/* Search & Category Filter */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 flex-1 lg:max-w-xl justify-end">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by PO#, asset, description, supplier..."
                className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div className="flex items-center space-x-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 shrink-0">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-transparent font-medium focus:outline-none cursor-pointer pr-1"
              >
                <option value="all">All Categories</option>
                <option value="Hand Tools">Hand Tools</option>
                <option value="Power Tools">Power Tools</option>
                <option value="Screw/Bolt">Screw/Bolt</option>
                <option value="Consumables">Consumables</option>
                <option value="Others">Others</option>
              </select>
            </div>
          </div>
        </div>

        {/* Selected Batch Action Banner */}
        {selectedTableIds.length > 0 && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in">
            <div className="flex items-center space-x-2.5 text-xs">
              <span className="p-1 bg-rose-100 text-rose-800 rounded font-bold">
                {selectedTableIds.length} PO Record(s) Selected
              </span>
              <span className="text-slate-600">
                Choose action to delete or rollback stock for selected records.
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setSelectedTableIds([])}
                className="px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-white rounded border border-slate-200 transition-colors cursor-pointer"
              >
                Deselect All
              </button>
              <button
                type="button"
                onClick={() => setShowBatchDeleteConfirm(true)}
                className="px-3.5 py-1 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded shadow-xs transition-colors flex items-center space-x-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Selected POs</span>
              </button>
            </div>
          </div>
        )}

        {/* History Table */}
        <div className="overflow-x-auto border border-slate-200 rounded-lg">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-900 text-white uppercase tracking-wider font-semibold select-none">
                <th className="py-3 px-3 w-10 text-center">
                  <button
                    type="button"
                    onClick={handleSelectAllTable}
                    title="Select / Deselect all visible"
                    className="p-1 text-slate-400 hover:text-white cursor-pointer"
                  >
                    {selectedTableIds.length === filteredPurchases.length && filteredPurchases.length > 0 ? (
                      <CheckSquare className="w-4 h-4 text-teal-400" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>
                <th className="py-3 px-3.5">Date & PO #</th>
                <th className="py-3 px-3.5 min-w-[180px]">Asset & Description</th>
                <th className="py-3 px-3.5 text-center">Category</th>
                <th className="py-3 px-3.5 text-center">Qty Inflow</th>
                <th className="py-3 px-3.5 text-right">Unit Price (₱)</th>
                <th className="py-3 px-3.5 text-right">Total Cost (₱)</th>
                <th className="py-3 px-3.5">Supplier / Receiver</th>
                <th className="py-3 px-3.5">Remarks</th>
                <th className="py-3 px-3.5 text-right">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200">
              {filteredPurchases.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-10 text-center text-slate-400">
                    <ShoppingCart className="w-8 h-8 mx-auto text-slate-300 mb-1.5" />
                    <p className="font-semibold text-slate-600">No purchase inflow records found.</p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Click "+ Add Stock / Purchase Replenish" above to record incoming stock deliveries.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredPurchases.map((rec) => {
                  const isSelected = selectedTableIds.includes(rec.id);
                  const lineTotal =
                    rec.totalCost !== undefined
                      ? rec.totalCost
                      : rec.unitPrice !== undefined
                      ? rec.quantity * rec.unitPrice
                      : 0;

                  return (
                    <tr
                      key={rec.id}
                      className={`transition-colors ${
                        isSelected ? 'bg-rose-50/40' : 'hover:bg-slate-50/80'
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-3 px-3 align-top text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleTableSelect(rec.id)}
                          className="p-1 text-slate-400 hover:text-teal-600 cursor-pointer"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-teal-600" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </td>

                      {/* Date & PO */}
                      <td className="py-3 px-3.5 align-top">
                        <div className="font-semibold text-slate-800 flex items-center space-x-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span>{rec.date}</span>
                        </div>
                        {rec.poNumber ? (
                          <div className="font-mono text-[11px] text-teal-700 font-bold mt-0.5">
                            {rec.poNumber}
                          </div>
                        ) : (
                          <div className="text-[10px] text-slate-400 mt-0.5">Direct Restock</div>
                        )}
                      </td>

                      {/* Asset & Description */}
                      <td className="py-3 px-3.5 align-top">
                        <div className="font-mono font-bold text-xs text-slate-800">{rec.assetId}</div>
                        <div className="text-slate-900 font-medium line-clamp-1">{rec.description}</div>
                      </td>

                      {/* Category */}
                      <td className="py-3 px-3.5 align-top text-center">
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-semibold">
                          {rec.category}
                        </span>
                      </td>

                      {/* Qty Inflow */}
                      <td className="py-3 px-3.5 align-top text-center">
                        <div className="inline-flex items-center space-x-1 px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-md font-bold">
                          <span>+{rec.quantity}</span>
                          <span className="text-[10px] font-normal text-emerald-700">{rec.unit}</span>
                        </div>
                      </td>

                      {/* Unit Price */}
                      <td className="py-3 px-3.5 align-top text-right font-medium text-slate-700">
                        {rec.unitPrice !== undefined && rec.unitPrice > 0 ? (
                          formatCurrency(rec.unitPrice)
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>

                      {/* Total Cost */}
                      <td className="py-3 px-3.5 align-top text-right font-bold text-emerald-800">
                        {lineTotal > 0 ? formatCurrency(lineTotal) : <span className="text-slate-300">—</span>}
                      </td>

                      {/* Supplier & Receiver */}
                      <td className="py-3 px-3.5 align-top">
                        <div className="text-slate-800 font-semibold">{rec.supplier || 'Warehouse Restock'}</div>
                        {rec.receivedBy && (
                          <div className="text-[10px] text-slate-400">Rec: {rec.receivedBy}</div>
                        )}
                      </td>

                      {/* Remarks */}
                      <td className="py-3 px-3.5 align-top text-slate-500 italic max-w-[180px] truncate">
                        {rec.notes || '—'}
                      </td>

                      {/* Action */}
                      <td className="py-3 px-3.5 align-top text-right">
                        <button
                          onClick={() => setDeleteConfirmId(rec.id)}
                          title="Remove this PO record (with rollback option)"
                          className="px-2 py-1 rounded text-rose-600 hover:text-white hover:bg-rose-600 border border-rose-200 transition-colors flex items-center space-x-1 ml-auto cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span className="text-[11px] font-semibold">Remove</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Dedicated RemovePurchaseModal */}
      <RemovePurchaseModal
        isOpen={isRemoveModalOpen}
        onClose={() => setIsRemoveModalOpen(false)}
        purchases={purchases}
        onDeletePurchase={(id, rollback) => {
          if (onDeletePurchaseRecord) {
            onDeletePurchaseRecord(id, rollback);
          }
        }}
        onDeleteMultiplePurchases={(ids, rollback) => {
          if (onDeleteMultiplePurchases) {
            onDeleteMultiplePurchases(ids, rollback);
          } else if (onDeletePurchaseRecord) {
            ids.forEach((id) => onDeletePurchaseRecord(id, rollback));
          }
        }}
        onClearAllPurchases={onClearAllPurchases}
      />

      {/* 6. Direct Purchase & Stock Replenishment Modal */}
      {isDirectIntakeModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden my-8">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-lg bg-teal-500/20 text-teal-400 border border-teal-500/30">
                  <PackagePlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white tracking-tight">
                    Record Stock Inflow / Purchase Replenish
                  </h3>
                  <p className="text-xs text-slate-300">
                    Directly adds stock to warehouse inventory and registers the purchase.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsDirectIntakeModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 text-xs text-red-700 rounded-lg font-medium">
                  {formError}
                </div>
              )}

              {/* Target Item Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Select Item to Restock *
                </label>
                <select
                  value={formItemId}
                  onChange={(e) => {
                    setFormItemId(e.target.value);
                    const item = items.find((i) => i.id === e.target.value);
                    if (item && item.unitPrice !== undefined) {
                      setFormUnitPrice(item.unitPrice);
                    }
                  }}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
                >
                  {items.map((i) => (
                    <option key={i.id} value={i.id}>
                      [{i.assetId}] {i.description} — (Current Stock: {i.stockQty} {i.unit})
                    </option>
                  ))}
                </select>
              </div>

              {selectedFormItem && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs flex items-center justify-between">
                  <div>
                    <span className="text-slate-500">Current Warehouse Stock:</span>{' '}
                    <strong className="text-slate-900">
                      {selectedFormItem.stockQty} {selectedFormItem.unit}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Min Threshold:</span>{' '}
                    <strong className="text-amber-700">
                      {selectedFormItem.minReorderLevel} {selectedFormItem.unit}
                    </strong>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Quantity to Add */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Quantity to Add / Inflow *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formQty}
                    onChange={(e) => setFormQty(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm font-bold bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                    placeholder="e.g. 10"
                    required
                  />
                  {selectedFormItem && formQty !== '' && (
                    <p className="text-[11px] text-teal-700 font-medium mt-1">
                      New Stock will be:{' '}
                      <strong>
                        {selectedFormItem.stockQty + Number(formQty)} {selectedFormItem.unit}
                      </strong>
                    </p>
                  )}
                </div>

                {/* Unit Purchase Price */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Unit Purchase Cost (PHP / ₱)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                      ₱
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formUnitPrice}
                      onChange={(e) =>
                        setFormUnitPrice(e.target.value === '' ? '' : Number(e.target.value))
                      }
                      placeholder="0.00"
                      className="w-full pl-8 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">Updates inventory unit valuation</p>
                </div>
              </div>

              {/* Total Cost preview */}
              {formUnitPrice !== '' && formQty !== '' && (
                <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-lg flex items-center justify-between text-xs">
                  <span className="font-semibold text-emerald-900">Total Purchase Acquisition Cost:</span>
                  <span className="text-base font-extrabold text-emerald-800">
                    {formatCurrency(Number(formUnitPrice) * Number(formQty))}
                  </span>
                </div>
              )}

              {/* PO Number & Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    PO / DR / Receipt #
                  </label>
                  <input
                    type="text"
                    value={formPoNumber}
                    onChange={(e) => setFormPoNumber(e.target.value)}
                    placeholder="e.g. PO-2026-881"
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Delivery / Inflow Date
                  </label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              {/* Supplier & Receiver */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Supplier / Vendor
                  </label>
                  <input
                    type="text"
                    value={formSupplier}
                    onChange={(e) => setFormSupplier(e.target.value)}
                    placeholder="e.g. DSI Manila Depot"
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Received By
                  </label>
                  <input
                    type="text"
                    value={formReceivedBy}
                    onChange={(e) => setFormReceivedBy(e.target.value)}
                    placeholder="e.g. M' Chrissna"
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Notes / Remarks
                </label>
                <input
                  type="text"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="e.g. Restock batch delivered via express freight"
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsDirectIntakeModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-sm transition-colors flex items-center space-x-1.5 cursor-pointer"
                >
                  <PackagePlus className="w-4 h-4" />
                  <span>Confirm & Add to Inventory</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. Single Delete / Rollback Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <div className="flex items-center space-x-3 text-rose-600">
              <div className="p-2 rounded-lg bg-rose-50 border border-rose-200">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Delete Purchase Log Record</h3>
                <p className="text-xs text-slate-500">Record ID: {deleteConfirmId}</p>
              </div>
            </div>

            <p className="text-xs text-slate-600">
              Are you sure you want to remove this purchase log? You can choose whether to rollback the added stock from the warehouse.
            </p>

            <label className="flex items-start space-x-2.5 p-3 bg-amber-50 border border-amber-200 rounded-lg cursor-pointer text-xs font-medium text-amber-900">
              <input
                type="checkbox"
                checked={rollbackStockOption}
                onChange={(e) => setRollbackStockOption(e.target.checked)}
                className="mt-0.5 rounded text-teal-600 focus:ring-teal-500 cursor-pointer"
              />
              <div>
                <span className="font-bold block">Deduct / Rollback added stock from warehouse</span>
                <span className="text-[11px] text-amber-700">
                  Deducts the stock quantity received in this PO from the current inventory.
                </span>
              </div>
            </label>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onDeletePurchaseRecord) {
                    onDeletePurchaseRecord(deleteConfirmId, rollbackStockOption);
                  }
                  setDeleteConfirmId(null);
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm cursor-pointer"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. Batch Delete Confirmation Modal */}
      {showBatchDeleteConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <div className="flex items-center space-x-3 text-rose-600">
              <div className="p-2 rounded-lg bg-rose-50 border border-rose-200">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Delete {selectedTableIds.length} PO Records</h3>
                <p className="text-xs text-slate-500">Bulk delete selected purchase inflow entries</p>
              </div>
            </div>

            <p className="text-xs text-slate-600">
              You are about to delete <strong>{selectedTableIds.length}</strong> selected purchase order record(s).
            </p>

            <label className="flex items-start space-x-2.5 p-3 bg-amber-50 border border-amber-200 rounded-lg cursor-pointer text-xs font-medium text-amber-900">
              <input
                type="checkbox"
                checked={rollbackStockOption}
                onChange={(e) => setRollbackStockOption(e.target.checked)}
                className="mt-0.5 rounded text-teal-600 focus:ring-teal-500 cursor-pointer"
              />
              <div>
                <span className="font-bold block">Deduct / Rollback added stock from warehouse</span>
                <span className="text-[11px] text-amber-700">
                  Automatically reverses the quantities added by these {selectedTableIds.length} purchase records.
                </span>
              </div>
            </label>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setShowBatchDeleteConfirm(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteBatchDelete}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm cursor-pointer"
              >
                Yes, Delete ({selectedTableIds.length}) Records
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
