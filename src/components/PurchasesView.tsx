import React, { useState, useMemo } from 'react';
import {
  ShoppingCart,
  AlertTriangle,
  Plus,
  CheckCircle2,
  ArrowRight,
  PackagePlus,
  RefreshCw,
  Search,
  Filter,
  DollarSign,
  TrendingUp,
  Boxes,
  FileSpreadsheet,
  Clock,
  Trash2,
  ExternalLink,
  ShieldCheck,
  Check,
  Building2,
  Calendar,
  Layers,
  ArrowDownToLine,
  Truck,
} from 'lucide-react';
import { InventoryItem, PurchaseRecord, ItemCategory } from '../types';
import { getReorderStatus, formatCurrency } from '../utils/inventoryHelpers';

interface PurchasesViewProps {
  items: InventoryItem[];
  purchases: PurchaseRecord[];
  onNavigateToInventory: () => void;
  onRestockItem: (
    itemId: string,
    additionalQty: number,
    notes?: string,
    unitPrice?: number,
    supplier?: string,
    poNumber?: string
  ) => void;
  onOpenAddAssetModal: () => void;
  onOpenRestockModal: (item: InventoryItem) => void;
  onDeletePurchaseRecord: (purchaseId: string, revertStock: boolean) => void;
}

const CATEGORIES: ItemCategory[] = [
  'Hand Tools',
  'Power Tools',
  'Screw/Bolt',
  'Consumables',
  'Others',
];

export const PurchasesView: React.FC<PurchasesViewProps> = ({
  items,
  purchases,
  onNavigateToInventory,
  onRestockItem,
  onOpenAddAssetModal,
  onOpenRestockModal,
  onDeletePurchaseRecord,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'reorders' | 'all_items' | 'history'>('reorders');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [successToast, setSuccessToast] = useState<{ message: string; visible: boolean }>({
    message: '',
    visible: false,
  });

  // Quick Inflow form state for quick restock card
  const [quickItemId, setQuickItemId] = useState<string>(items.length > 0 ? items[0].id : '');
  const [quickQty, setQuickQty] = useState<number | ''>(10);
  const [quickPrice, setQuickPrice] = useState<number | ''>('');
  const [quickSupplier, setQuickSupplier] = useState('');
  const [quickPoNumber, setQuickPoNumber] = useState('');
  const [quickNotes, setQuickNotes] = useState('');

  // Inline replenishment states for list rows
  const [inlineQtys, setInlineQtys] = useState<{ [itemId: string]: number }>({});
  const [inlineSuppliers, setInlineSuppliers] = useState<{ [itemId: string]: string }>({});

  const showToast = (message: string) => {
    setSuccessToast({ message, visible: true });
    setTimeout(() => {
      setSuccessToast((prev) => ({ ...prev, visible: false }));
    }, 3500);
  };

  // Reorder items
  const itemsNeedingReorder = useMemo(() => {
    return items.filter((item) => {
      const status = getReorderStatus(item.stockQty, item.minReorderLevel);
      return status === 'reorder_needed' || status === 'out_of_stock';
    });
  }, [items]);

  // Filtered all items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch =
        item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.assetId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.brandModel && item.brandModel.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.location && item.location.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCat = categoryFilter === 'all' || item.category === categoryFilter;

      return matchesSearch && matchesCat;
    });
  }, [items, searchQuery, categoryFilter]);

  // Filtered purchases history
  const filteredPurchases = useMemo(() => {
    return purchases.filter((p) => {
      const matchesSearch =
        p.poNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.assetId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.supplier && p.supplier.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (p.notes && p.notes.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCat = categoryFilter === 'all' || p.category === categoryFilter;

      return matchesSearch && matchesCat;
    });
  }, [purchases, searchQuery, categoryFilter]);

  // Total valuation of purchases
  const totalPurchasesCost = useMemo(() => {
    return purchases.reduce((sum, p) => sum + (p.totalCost || (p.unitPrice ? p.unitPrice * p.quantityAdded : 0)), 0);
  }, [purchases]);

  // Total units received across purchases
  const totalUnitsReceived = useMemo(() => {
    return purchases.reduce((sum, p) => sum + p.quantityAdded, 0);
  }, [purchases]);

  // Handle Quick Inflow form submission
  const handleQuickRestockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const targetId = quickItemId || (items.length > 0 ? items[0].id : '');
    if (!targetId) return;

    const numQty = Number(quickQty);
    if (!quickQty || isNaN(numQty) || numQty <= 0) {
      alert('Please enter a valid replenishment quantity greater than 0.');
      return;
    }

    const item = items.find((i) => i.id === targetId);
    if (!item) return;

    const priceNum = quickPrice !== '' ? Number(quickPrice) : item.unitPrice;

    onRestockItem(
      targetId,
      numQty,
      quickNotes.trim() || undefined,
      priceNum !== undefined && priceNum >= 0 ? priceNum : undefined,
      quickSupplier.trim() || undefined,
      quickPoNumber.trim() || undefined
    );

    showToast(`✓ Replenished +${numQty} ${item.unit} for [${item.assetId}] into inventory!`);

    // Reset some quick fields
    setQuickNotes('');
    setQuickPoNumber('');
  };

  // Handle direct 1-click replenish from reorder card
  const handleInlineReplenish = (item: InventoryItem) => {
    const qty = inlineQtys[item.id] !== undefined ? inlineQtys[item.id] : Math.max(1, (item.minReorderLevel * 2) - item.stockQty);
    if (qty <= 0) {
      alert('Please enter a quantity greater than 0.');
      return;
    }

    const supplier = inlineSuppliers[item.id] || undefined;

    onRestockItem(
      item.id,
      qty,
      'Reorder replenish inflow',
      item.unitPrice,
      supplier,
      `PO-${new Date().getFullYear()}-${String(Math.floor(1000 + Math.random() * 9000))}`
    );

    showToast(`✓ Added +${qty} ${item.unit} to inventory for [${item.assetId}]!`);

    // Clear inline state for this item
    setInlineQtys((prev) => {
      const next = { ...prev };
      delete next[item.id];
      return next;
    });
  };

  // Export Purchase history to CSV
  const handleExportPurchasesCSV = () => {
    if (purchases.length === 0) {
      alert('No purchase records to export.');
      return;
    }

    const headers = [
      'PO / DR Reference',
      'Received Date',
      'Asset ID',
      'Item Description',
      'Category',
      'Quantity Added',
      'Unit',
      'Unit Cost (PHP)',
      'Total Cost (PHP)',
      'Supplier / Vendor',
      'Notes',
    ];

    const rows = purchases.map((p) => [
      `"${p.poNumber.replace(/"/g, '""')}"`,
      `"${p.receivedDate}"`,
      `"${p.assetId.replace(/"/g, '""')}"`,
      `"${p.description.replace(/"/g, '""')}"`,
      `"${p.category}"`,
      p.quantityAdded,
      `"${p.unit}"`,
      p.unitPrice ? p.unitPrice.toFixed(2) : '0.00',
      p.totalCost ? p.totalCost.toFixed(2) : p.unitPrice ? (p.unitPrice * p.quantityAdded).toFixed(2) : '0.00',
      `"${(p.supplier || '').replace(/"/g, '""')}"`,
      `"${(p.notes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `DSI_Purchases_StockInflows_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div id="purchases-view-root" className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Toast Notification */}
      {successToast.visible && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-800 text-white px-5 py-3.5 rounded-xl shadow-xl flex items-center space-x-3 border border-emerald-600 animate-slideUp">
          <CheckCircle2 className="w-5 h-5 text-emerald-300 shrink-0" />
          <span className="text-sm font-medium">{successToast.message}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2.5">
            <div className="p-2.5 rounded-lg bg-teal-50 text-teal-700 border border-teal-200">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                Purchases & Stock Replenishment
              </h2>
              <p className="text-xs text-slate-500">
                Receive purchased equipment, restock low warehouse inventory, and log delivery receipts (DR / PO).
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={onNavigateToInventory}
            className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            ← View Inventory
          </button>
          <button
            onClick={onOpenAddAssetModal}
            className="px-4 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-2xs flex items-center space-x-1.5 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Register New Asset</span>
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Reorder Alerts */}
        <div
          onClick={() => setActiveSubTab('reorders')}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            activeSubTab === 'reorders'
              ? 'bg-amber-50/70 border-amber-300 ring-2 ring-amber-400/30'
              : 'bg-white border-slate-200 hover:border-amber-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Reorder Alerts
            </span>
            <div className="p-2 rounded-lg bg-amber-100 text-amber-700">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-black text-amber-800">
              {itemsNeedingReorder.length}
            </span>
            <span className="text-xs text-slate-500 font-medium">assets low in stock</span>
          </div>
          <p className="text-[11px] text-amber-700 mt-1">
            {itemsNeedingReorder.length > 0
              ? 'Click to review & replenish items below safe levels'
              : 'All inventory stock levels are healthy'}
          </p>
        </div>

        {/* Total Warehouse Items */}
        <div
          onClick={() => setActiveSubTab('all_items')}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            activeSubTab === 'all_items'
              ? 'bg-teal-50/70 border-teal-300 ring-2 ring-teal-400/30'
              : 'bg-white border-slate-200 hover:border-teal-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Warehouse Catalog
            </span>
            <div className="p-2 rounded-lg bg-teal-100 text-teal-700">
              <Boxes className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-black text-slate-900">{items.length}</span>
            <span className="text-xs text-slate-500 font-medium">registered assets</span>
          </div>
          <p className="text-[11px] text-teal-700 mt-1">
            Click to quickly replenish any existing warehouse stock
          </p>
        </div>

        {/* Purchases / Inflow Records */}
        <div
          onClick={() => setActiveSubTab('history')}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            activeSubTab === 'history'
              ? 'bg-blue-50/70 border-blue-300 ring-2 ring-blue-400/30'
              : 'bg-white border-slate-200 hover:border-blue-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Purchases Logged
            </span>
            <div className="p-2 rounded-lg bg-blue-100 text-blue-700">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-black text-blue-900">{purchases.length}</span>
            <span className="text-xs text-slate-500 font-medium">deliveries received</span>
          </div>
          <p className="text-[11px] text-blue-700 mt-1">
            +{totalUnitsReceived.toLocaleString()} total units replenished into stock
          </p>
        </div>

        {/* Total Purchases Valuation */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total Inflow Value
            </span>
            <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-black text-emerald-800">
              {formatCurrency(totalPurchasesCost)}
            </span>
          </div>
          <p className="text-[11px] text-emerald-600 mt-1">
            Cumulative cost of logged purchase replenishments
          </p>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-2">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setActiveSubTab('reorders')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center space-x-2 ${
              activeSubTab === 'reorders'
                ? 'bg-amber-600 text-white shadow-2xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Reorder Alert Queue</span>
            {itemsNeedingReorder.length > 0 && (
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                  activeSubTab === 'reorders'
                    ? 'bg-white text-amber-700'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {itemsNeedingReorder.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveSubTab('all_items')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center space-x-2 ${
              activeSubTab === 'all_items'
                ? 'bg-teal-600 text-white shadow-2xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Boxes className="w-3.5 h-3.5" />
            <span>Quick Replenish Catalog</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                activeSubTab === 'all_items'
                  ? 'bg-white text-teal-700'
                  : 'bg-slate-100 text-slate-700'
              }`}
            >
              {items.length}
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('history')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center space-x-2 ${
              activeSubTab === 'history'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Purchase & Inflow History</span>
            {purchases.length > 0 && (
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                  activeSubTab === 'history'
                    ? 'bg-white text-blue-700'
                    : 'bg-blue-100 text-blue-800'
                }`}
              >
                {purchases.length}
              </span>
            )}
          </button>
        </div>

        {/* Subtab actions */}
        {activeSubTab === 'history' && purchases.length > 0 && (
          <button
            onClick={handleExportPurchasesCSV}
            className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg flex items-center space-x-1.5 shadow-2xs"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Export Purchases CSV</span>
          </button>
        )}
      </div>

      {/* TAB 1: REORDER ALERT QUEUE */}
      {activeSubTab === 'reorders' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-amber-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Critical Low & Out-of-Stock Items Needing Replenishment
                </h3>
              </div>
              <span className="text-xs text-slate-500">
                Triggered automatically when Stock Qty ≤ Minimum Reorder Threshold
              </span>
            </div>

            {itemsNeedingReorder.length === 0 ? (
              <div className="p-12 text-center text-slate-500 space-y-2">
                <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <p className="text-base font-bold text-slate-800">
                  All inventory stocks are in good standing!
                </p>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  No items currently fall below their required reorder safety levels. You can still replenish any item using the "Quick Replenish Catalog" tab.
                </p>
                <button
                  onClick={() => setActiveSubTab('all_items')}
                  className="mt-3 px-4 py-2 text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-lg transition-colors inline-flex items-center space-x-1.5"
                >
                  <Boxes className="w-3.5 h-3.5" />
                  <span>Browse Full Inventory Catalog</span>
                </button>
              </div>
            ) : (
              <div className="divide-y divide-slate-200">
                {itemsNeedingReorder.map((item) => {
                  const suggestedReplenish = Math.max(1, (item.minReorderLevel * 2) - item.stockQty);
                  const currentQtyInput =
                    inlineQtys[item.id] !== undefined ? inlineQtys[item.id] : suggestedReplenish;
                  const isOutOfStock = item.stockQty <= 0;

                  return (
                    <div
                      key={item.id}
                      className="p-5 hover:bg-slate-50/80 transition-colors flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                    >
                      {/* Item info */}
                      <div className="space-y-1.5 min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono font-bold text-xs px-2.5 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                            {item.assetId}
                          </span>
                          <span className="font-bold text-slate-900 text-sm">{item.description}</span>
                          <span
                            className={`px-2 py-0.5 text-[10px] font-extrabold uppercase rounded-full ${
                              isOutOfStock
                                ? 'bg-red-100 text-red-800 border border-red-200'
                                : 'bg-amber-100 text-amber-800 border border-amber-200'
                            }`}
                          >
                            {isOutOfStock ? 'Out of Stock (0)' : 'Low Stock Level'}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                          <span>
                            Current Stock:{' '}
                            <strong className={isOutOfStock ? 'text-red-600 font-extrabold' : 'text-amber-700 font-bold'}>
                              {item.stockQty} {item.unit}
                            </strong>
                          </span>
                          <span>
                            Min Threshold:{' '}
                            <strong className="text-slate-700">
                              {item.minReorderLevel} {item.unit}
                            </strong>
                          </span>
                          <span>
                            Category: <strong className="text-slate-700">{item.category}</strong>
                          </span>
                          {item.location && (
                            <span>
                              Storage: <strong className="text-slate-700">{item.location}</strong>
                            </span>
                          )}
                          {item.unitPrice !== undefined && (
                            <span>
                              Unit Cost: <strong className="text-emerald-700">₱{item.unitPrice.toLocaleString()}</strong>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Replenishment Action Section */}
                      <div className="flex flex-wrap items-center gap-2.5 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                        <div className="flex items-center space-x-1.5">
                          <label className="text-[11px] font-bold text-slate-600">Qty to Inflow:</label>
                          <input
                            type="number"
                            min="1"
                            value={currentQtyInput}
                            onChange={(e) =>
                              setInlineQtys((prev) => ({
                                ...prev,
                                [item.id]: Number(e.target.value) || 0,
                              }))
                            }
                            className="w-18 px-2 py-1 text-xs font-bold text-slate-900 bg-white border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-teal-500 text-center"
                          />
                          <span className="text-xs text-slate-500 font-medium">{item.unit}</span>
                        </div>

                        <button
                          onClick={() => handleInlineReplenish(item)}
                          className="px-3.5 py-1.5 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-2xs flex items-center space-x-1 transition-colors cursor-pointer"
                          title="Instantly add this quantity into warehouse inventory"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Replenish (+{currentQtyInput})</span>
                        </button>

                        <button
                          onClick={() => onOpenRestockModal(item)}
                          className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors"
                          title="Open detailed restock modal with supplier, PO #, and unit cost"
                        >
                          Full Details...
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: ALL INVENTORY QUICK REPLENISH CATALOG */}
      {activeSubTab === 'all_items' && (
        <div className="space-y-4">
          {/* Quick Receive Drawer / Form */}
          <div className="bg-white rounded-xl border border-teal-200 p-5 shadow-2xs">
            <div className="flex items-center space-x-2 mb-3">
              <PackagePlus className="w-4 h-4 text-teal-600" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Direct Stock Inflow & Receiving Form
              </h3>
            </div>

            <form onSubmit={handleQuickRestockSubmit} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* Select Asset */}
                <div className="lg:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Select Target Asset to Restock *
                  </label>
                  <select
                    value={quickItemId}
                    onChange={(e) => setQuickItemId(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium"
                  >
                    {items.map((item) => (
                      <option key={item.id} value={item.id}>
                        [{item.assetId}] {item.description} — Stock: {item.stockQty} {item.unit}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Quantity */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Inflow Quantity *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={quickQty}
                    onChange={(e) => setQuickQty(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="e.g. 20"
                    className="w-full px-3 py-2 text-xs font-bold bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                {/* Unit Price */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Unit Cost (₱)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Optional ₱/unit"
                    value={quickPrice}
                    onChange={(e) => setQuickPrice(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    PO / DR Reference
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. PO-2026-092"
                    value={quickPoNumber}
                    onChange={(e) => setQuickPoNumber(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Supplier / Vendor
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. DSI Central Depot / Wilcon"
                    value={quickSupplier}
                    onChange={(e) => setQuickSupplier(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Delivery Remarks
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Delivered directly to Lumiere warehouse"
                    value={quickNotes}
                    onChange={(e) => setQuickNotes(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end pt-2">
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-2xs flex items-center space-x-1.5 transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Receive & Credit Inventory Stock</span>
                </button>
              </div>
            </form>
          </div>

          {/* Search & Filter Bar */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search warehouse catalog by Asset ID, Description, Model, Location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-700 font-medium"
              >
                <option value="all">All Categories</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Catalog Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            {filteredItems.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                <Boxes className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                <p className="font-semibold text-slate-800">No matching assets found.</p>
                <p className="text-xs text-slate-400 mt-1">Try adjusting your search query or filter.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3">Asset ID</th>
                      <th className="px-4 py-3">Description & Category</th>
                      <th className="px-4 py-3 text-center">Current Stock</th>
                      <th className="px-4 py-3 text-center">Min Threshold</th>
                      <th className="px-4 py-3">Storage Location</th>
                      <th className="px-4 py-3 text-right">Quick Replenish Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredItems.map((item) => {
                      const reorderStatus = getReorderStatus(item.stockQty, item.minReorderLevel);
                      const isLow = reorderStatus === 'reorder_needed' || reorderStatus === 'out_of_stock';

                      return (
                        <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-4 py-3 font-mono font-bold text-slate-800 whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200">
                              {item.assetId}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-semibold text-slate-900">{item.description}</div>
                            <div className="text-[11px] text-slate-500 font-normal">
                              {item.category} {item.brandModel ? `• ${item.brandModel}` : ''}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center whitespace-nowrap">
                            <span
                              className={`font-bold px-2 py-0.5 rounded text-xs ${
                                isLow
                                  ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                  : 'text-slate-800'
                              }`}
                            >
                              {item.stockQty} {item.unit}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center text-slate-600 whitespace-nowrap">
                            {item.minReorderLevel} {item.unit}
                          </td>
                          <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                            {item.location || '—'}
                          </td>
                          <td className="px-4 py-3 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end space-x-1.5">
                              {/* Quick +10 button */}
                              <button
                                onClick={() => {
                                  onRestockItem(
                                    item.id,
                                    10,
                                    'Quick restock +10',
                                    item.unitPrice,
                                    undefined,
                                    `PO-${new Date().getFullYear()}-${String(Math.floor(1000 + Math.random() * 9000))}`
                                  );
                                  showToast(`✓ Added +10 ${item.unit} to [${item.assetId}] stock!`);
                                }}
                                className="px-2 py-1 text-[11px] font-bold text-slate-700 bg-slate-100 hover:bg-teal-50 hover:text-teal-800 border border-slate-200 rounded transition-colors"
                                title="Quick add 10 units"
                              >
                                +10
                              </button>

                              {/* Quick +50 button */}
                              <button
                                onClick={() => {
                                  onRestockItem(
                                    item.id,
                                    50,
                                    'Quick restock +50',
                                    item.unitPrice,
                                    undefined,
                                    `PO-${new Date().getFullYear()}-${String(Math.floor(1000 + Math.random() * 9000))}`
                                  );
                                  showToast(`✓ Added +50 ${item.unit} to [${item.assetId}] stock!`);
                                }}
                                className="px-2 py-1 text-[11px] font-bold text-slate-700 bg-slate-100 hover:bg-teal-50 hover:text-teal-800 border border-slate-200 rounded transition-colors"
                                title="Quick add 50 units"
                              >
                                +50
                              </button>

                              {/* Open modal */}
                              <button
                                onClick={() => onOpenRestockModal(item)}
                                className="px-3 py-1 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded transition-colors flex items-center space-x-1"
                              >
                                <Plus className="w-3 h-3" />
                                <span>Receive Stock</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: PURCHASE & INFLOW HISTORY */}
      {activeSubTab === 'history' && (
        <div className="space-y-4">
          {/* Search & Filter Bar */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search purchase logs by PO #, Asset ID, Item Description, Supplier..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-700 font-medium"
              >
                <option value="all">All Categories</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Inflows Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            {filteredPurchases.length === 0 ? (
              <div className="p-12 text-center text-slate-500 space-y-2">
                <Truck className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                <p className="font-semibold text-slate-800">No purchase records found.</p>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  When you replenish stocks or receive new asset deliveries, every transaction is automatically recorded here with timestamp, PO/DR reference, and cost calculations.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3">PO / DR Ref</th>
                      <th className="px-4 py-3">Received Date</th>
                      <th className="px-4 py-3">Asset ID & Item</th>
                      <th className="px-4 py-3 text-center">Qty Inflow</th>
                      <th className="px-4 py-3 text-right">Unit Price</th>
                      <th className="px-4 py-3 text-right">Total Cost</th>
                      <th className="px-4 py-3">Supplier / Remarks</th>
                      <th className="px-4 py-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredPurchases.map((purchase) => {
                      const totalCost =
                        purchase.totalCost ||
                        (purchase.unitPrice ? purchase.unitPrice * purchase.quantityAdded : undefined);

                      return (
                        <tr key={purchase.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-4 py-3 font-mono font-bold text-blue-800 whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded bg-blue-50 border border-blue-200">
                              {purchase.poNumber}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                            {purchase.receivedDate}
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-semibold text-slate-900">
                              <span className="font-mono text-slate-500 mr-1.5">[{purchase.assetId}]</span>
                              {purchase.description}
                            </div>
                            <div className="text-[11px] text-slate-400">{purchase.category}</div>
                          </td>
                          <td className="px-4 py-3 text-center font-bold text-emerald-700 whitespace-nowrap">
                            +{purchase.quantityAdded} {purchase.unit}
                          </td>
                          <td className="px-4 py-3 text-right text-slate-700 whitespace-nowrap">
                            {purchase.unitPrice !== undefined ? `₱${purchase.unitPrice.toLocaleString()}` : '—'}
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-slate-900 whitespace-nowrap">
                            {totalCost !== undefined ? formatCurrency(totalCost) : '—'}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            <div className="font-medium text-slate-800">
                              {purchase.supplier || 'Warehouse Supplier'}
                            </div>
                            {purchase.notes && (
                              <div className="text-[11px] text-slate-400">{purchase.notes}</div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center whitespace-nowrap">
                            <button
                              onClick={() => {
                                if (
                                  window.confirm(
                                    `Delete purchase record ${purchase.poNumber}? Revert inventory stock (-${purchase.quantityAdded} ${purchase.unit})?`
                                  )
                                ) {
                                  onDeletePurchaseRecord(purchase.id, true);
                                  showToast(`Reverted purchase ${purchase.poNumber} from inventory.`);
                                }
                              }}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                              title="Delete & revert stock"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
