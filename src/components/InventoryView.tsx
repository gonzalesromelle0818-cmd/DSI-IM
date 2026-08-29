import React, { useState, useMemo } from 'react';
import {
  Search,
  Plus,
  Filter,
  Download,
  AlertTriangle,
  CheckCircle2,
  Package,
  Layers,
  Building2,
  ArrowUpRight,
  Edit2,
  Copy,
  Check,
  Eye,
  SlidersHorizontal,
  Trash2,
  Banknote,
} from 'lucide-react';
import { InventoryItem } from '../types';
import { getReorderStatus, exportInventoryToCSV, formatCurrency } from '../utils/inventoryHelpers';

interface InventoryViewProps {
  items: InventoryItem[];
  onOpenAddItemModal: () => void;
  onOpenRemoveItemsModal: () => void;
  onOpenRestockModal: (item: InventoryItem) => void;
  onOpenEditModal: (item: InventoryItem) => void;
  onOpenDetailsModal: (item: InventoryItem) => void;
  onDeleteItem?: (itemId: string) => void;
  activeFilterReorder?: boolean;
  onClearReorderFilter?: () => void;
}

export const InventoryView: React.FC<InventoryViewProps> = ({
  items,
  onOpenAddItemModal,
  onOpenRemoveItemsModal,
  onOpenRestockModal,
  onOpenEditModal,
  onOpenDetailsModal,
  onDeleteItem,
  activeFilterReorder = false,
  onClearReorderFilter,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>(
    activeFilterReorder ? 'reorder_needed' : 'all'
  );
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Sync if filter reorder triggered from top nav
  React.useEffect(() => {
    if (activeFilterReorder) {
      setSelectedStatus('reorder_needed');
    }
  }, [activeFilterReorder]);

  // Copy Asset ID helper
  const handleCopyAssetId = (assetId: string) => {
    navigator.clipboard.writeText(assetId);
    setCopiedId(assetId);
    setTimeout(() => setCopiedId(null), 1800);
  };

  // Calculated Stats
  const stats = useMemo(() => {
    let totalStockUnits = 0;
    let totalDeployedInProjects = 0;
    let needsReorderCount = 0;
    let outOfStockCount = 0;
    let totalInventoryValuation = 0;

    items.forEach((item) => {
      totalStockUnits += item.stockQty;
      if (item.unitPrice) {
        totalInventoryValuation += item.stockQty * item.unitPrice;
      }
      if (item.projectAllocations && item.projectAllocations.length > 0) {
        totalDeployedInProjects += item.projectAllocations.reduce((sum, p) => sum + (p.quantity || 0), 0);
      }
      const status = getReorderStatus(item.stockQty, item.minReorderLevel);
      if (status === 'reorder_needed') needsReorderCount++;
      else if (status === 'out_of_stock') {
        outOfStockCount++;
        needsReorderCount++; // out of stock also needs order
      }
    });

    return {
      totalAssets: items.length,
      totalStockUnits,
      totalDeployedInProjects,
      needsReorderCount,
      outOfStockCount,
      totalInventoryValuation,
    };
  }, [items]);

  // Filtered Items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Search matches Asset ID, Description, Category, Brand, Location
      const term = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !term ||
        item.assetId.toLowerCase().includes(term) ||
        item.description.toLowerCase().includes(term) ||
        item.category.toLowerCase().includes(term) ||
        (item.brandModel && item.brandModel.toLowerCase().includes(term)) ||
        (item.location && item.location.toLowerCase().includes(term));

      // Category filter
      const matchesCategory =
        selectedCategory === 'all' || item.category === selectedCategory;

      // Status filter
      const itemStatus = getReorderStatus(item.stockQty, item.minReorderLevel);
      let matchesStatus = true;
      if (selectedStatus === 'reorder_needed') {
        matchesStatus = itemStatus === 'reorder_needed' || itemStatus === 'out_of_stock';
      } else if (selectedStatus === 'low') {
        matchesStatus = itemStatus === 'low';
      } else if (selectedStatus === 'good') {
        matchesStatus = itemStatus === 'good';
      } else if (selectedStatus === 'out_of_stock') {
        matchesStatus = itemStatus === 'out_of_stock';
      }

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [items, searchTerm, selectedCategory, selectedStatus]);

  // Categories list for dropdown
  const categories = useMemo(() => {
    const set = new Set<string>();
    items.forEach((i) => set.add(i.category));
    return Array.from(set);
  }, [items]);

  return (
    <div id="inventory-view-root" className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* 1. Metric Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Registered Assets */}
        <div
          id="stat-total-assets"
          className="bg-white rounded-xl p-4 border border-slate-200/90 shadow-2xs flex items-center justify-between"
        >
          <div className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Assets
            </span>
            <div className="text-2xl font-bold text-slate-900">{stats.totalAssets}</div>
            <span className="text-[11px] text-slate-400 font-medium">Distinct catalog items</span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700">
            <Package className="w-5 h-5" />
          </div>
        </div>

        {/* Total Available Warehouse Stock */}
        <div
          id="stat-warehouse-stock"
          className="bg-white rounded-xl p-4 border border-slate-200/90 shadow-2xs flex items-center justify-between"
        >
          <div className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-teal-700">
              Qty ng Stock
            </span>
            <div className="text-2xl font-bold text-teal-900">{stats.totalStockUnits.toLocaleString()}</div>
            <span className="text-[11px] text-teal-600/80 font-medium">Warehouse available</span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        {/* Total Inventory Valuation (PHP) */}
        <div
          id="stat-inventory-valuation"
          className="bg-white rounded-xl p-4 border border-emerald-200/90 shadow-2xs flex items-center justify-between"
        >
          <div className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-800">
              Inventory Valuation
            </span>
            <div className="text-xl font-extrabold text-emerald-900">
              {formatCurrency(stats.totalInventoryValuation)}
            </div>
            <span className="text-[11px] text-emerald-700 font-medium">Total warehouse asset value</span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
            <Banknote className="w-5 h-5" />
          </div>
        </div>

        {/* Qty Deployed in Projects */}
        <div
          id="stat-deployed-projects"
          className="bg-white rounded-xl p-4 border border-slate-200/90 shadow-2xs flex items-center justify-between"
        >
          <div className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-700">
              Deployed in Sites
            </span>
            <div className="text-2xl font-bold text-blue-900">
              {stats.totalDeployedInProjects.toLocaleString()}
            </div>
            <span className="text-[11px] text-blue-600/80 font-medium">Active project sites</span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700">
            <Building2 className="w-5 h-5" />
          </div>
        </div>

        {/* Needs Replenish / Reorder Alert */}
        <div
          id="stat-reorder-alert"
          onClick={() => {
            setSelectedStatus(selectedStatus === 'reorder_needed' ? 'all' : 'reorder_needed');
          }}
          className={`rounded-xl p-4 border transition-all cursor-pointer shadow-2xs flex items-center justify-between ${
            stats.needsReorderCount > 0
              ? selectedStatus === 'reorder_needed'
                ? 'bg-amber-100 border-amber-400 ring-2 ring-amber-400'
                : 'bg-amber-50/70 border-amber-300 hover:bg-amber-100/80'
              : 'bg-white border-slate-200'
          }`}
          title="Click to toggle filter for items needing reorder"
        >
          <div className="space-y-1">
            <div className="flex items-center space-x-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-800">
                Order to Replenish
              </span>
              {stats.needsReorderCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
              )}
            </div>
            <div className="text-2xl font-bold text-amber-900">{stats.needsReorderCount}</div>
            <span className="text-[11px] text-amber-700 font-medium">
              {stats.needsReorderCount > 0
                ? 'Stock ≤ min threshold'
                : 'All stocks healthy'}
            </span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-800">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 2. Control Toolbar: Search, Filters, Add Items Button */}
      <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Left: Search input */}
          <div className="relative flex-1 min-w-[260px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              id="input-inventory-search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by Asset ID (e.g. DSI-EQ-001), description, category, brand, or location..."
              className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all placeholder:text-slate-400"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
              >
                Clear
              </button>
            )}
          </div>

          {/* Center: Dropdown Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Category Dropdown */}
            <div className="flex items-center space-x-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700">
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
              <select
                id="filter-category"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-transparent font-medium focus:outline-none cursor-pointer pr-1"
              >
                <option value="all">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Replenish Status Dropdown */}
            <div className="flex items-center space-x-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                id="filter-status"
                value={selectedStatus}
                onChange={(e) => {
                  setSelectedStatus(e.target.value);
                  if (e.target.value !== 'reorder_needed' && onClearReorderFilter) {
                    onClearReorderFilter();
                  }
                }}
                className="bg-transparent font-medium focus:outline-none cursor-pointer pr-1"
              >
                <option value="all">All Stock Status</option>
                <option value="reorder_needed">⚠️ Need Reorder (Replenish)</option>
                <option value="low">🟡 Low Stock</option>
                <option value="good">🟢 Healthy / In Stock</option>
                <option value="out_of_stock">🔴 Out of Stock (0)</option>
              </select>
            </div>

            {/* Export CSV button */}
            <button
              onClick={() => exportInventoryToCSV(filteredItems)}
              className="inline-flex items-center space-x-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer border border-slate-200"
              title="Export filtered inventory table as CSV spreadsheet"
            >
              <Download className="w-3.5 h-3.5 text-slate-600" />
              <span>Export CSV</span>
            </button>
          </div>

          {/* Right: Primary Actions (Remove Items & Add Items) */}
          <div className="flex items-center space-x-2">
            <button
              id="btn-remove-items"
              onClick={onOpenRemoveItemsModal}
              className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-3.5 py-2 text-sm font-semibold text-rose-700 bg-rose-50/70 hover:bg-rose-100/80 active:bg-rose-200/80 border border-rose-200 hover:border-rose-300 rounded-lg shadow-2xs transition-all cursor-pointer"
              title="Remove items or deduct/dispose stocks from inventory"
            >
              <Trash2 className="w-4 h-4 text-rose-600" />
              <span>Remove Items</span>
              {items.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-[11px] font-bold bg-white text-rose-800 rounded-full border border-rose-200">
                  {items.length}
                </span>
              )}
            </button>

            <button
              id="btn-add-items"
              onClick={onOpenAddItemModal}
              className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-4 py-2 text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 active:bg-teal-800 rounded-lg shadow-sm shadow-teal-700/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Items</span>
            </button>
          </div>
        </div>

        {/* Active Filter Indicators */}
        {(selectedStatus !== 'all' || selectedCategory !== 'all' || searchTerm) && (
          <div className="flex items-center flex-wrap gap-2 pt-2 border-t border-slate-100 text-xs">
            <span className="text-slate-500 font-medium">Active filters:</span>
            {selectedStatus !== 'all' && (
              <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-semibold border border-amber-200">
                <span>
                  Status:{' '}
                  {selectedStatus === 'reorder_needed'
                    ? 'Need Reorder (Replenish)'
                    : selectedStatus === 'low'
                    ? 'Low Stock'
                    : selectedStatus === 'good'
                    ? 'In Stock'
                    : 'Out of Stock'}
                </span>
                <button
                  onClick={() => {
                    setSelectedStatus('all');
                    if (onClearReorderFilter) onClearReorderFilter();
                  }}
                  className="hover:text-amber-950 font-bold ml-1"
                >
                  ×
                </button>
              </span>
            )}

            {selectedCategory !== 'all' && (
              <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold border border-slate-200">
                <span>Category: {selectedCategory}</span>
                <button
                  onClick={() => setSelectedCategory('all')}
                  className="hover:text-slate-900 font-bold ml-1"
                >
                  ×
                </button>
              </span>
            )}

            {searchTerm && (
              <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-800 font-semibold border border-teal-200">
                <span>Keyword: "{searchTerm}"</span>
                <button
                  onClick={() => setSearchTerm('')}
                  className="hover:text-teal-950 font-bold ml-1"
                >
                  ×
                </button>
              </span>
            )}

            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedCategory('all');
                setSelectedStatus('all');
                if (onClearReorderFilter) onClearReorderFilter();
              }}
              className="text-xs text-teal-700 hover:text-teal-900 font-semibold underline underline-offset-2 ml-1"
            >
              Reset all filters
            </button>
          </div>
        )}
      </div>

      {/* 3. Main Data Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table id="inventory-data-table" className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white text-[11px] uppercase tracking-wider font-semibold select-none border-b border-slate-800">
                <th className="py-3.5 px-4">Asset ID</th>
                <th className="py-3.5 px-4 min-w-[240px]">Description & Specifications</th>
                <th className="py-3.5 px-4 text-center">Qty ng Stock</th>
                <th className="py-3.5 px-4 text-center">Unit</th>
                <th className="py-3.5 px-4 text-right">Unit Price (₱)</th>
                <th className="py-3.5 px-4 text-right">Total Value</th>
                <th className="py-3.5 px-4 text-center">Reorder Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200 text-sm">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <Package className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    <p className="font-semibold text-slate-600">No inventory items matched your criteria.</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Try clearing search filters or click "Add Items" to register new stocks.
                    </p>
                    <button
                      onClick={onOpenAddItemModal}
                      className="mt-3 px-3.5 py-1.5 text-xs font-semibold bg-teal-600 text-white rounded-lg hover:bg-teal-700 inline-flex items-center space-x-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add New Item</span>
                    </button>
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const status = getReorderStatus(item.stockQty, item.minReorderLevel);
                  const isLowOrReorder = status === 'reorder_needed' || status === 'out_of_stock';

                  return (
                    <tr
                      key={item.id}
                      id={`inventory-row-${item.assetId}`}
                      className={`group hover:bg-slate-50/80 transition-colors ${
                        status === 'out_of_stock'
                          ? 'bg-red-50/30'
                          : status === 'reorder_needed'
                          ? 'bg-amber-50/20'
                          : ''
                      }`}
                    >
                      {/* 1. Asset ID Column */}
                      <td className="py-3.5 px-4 align-top">
                        <div className="flex items-center space-x-1.5">
                          <span className="font-mono font-bold text-xs px-2 py-1 rounded bg-slate-100 text-slate-800 border border-slate-200 group-hover:border-slate-300">
                            {item.assetId}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyAssetId(item.assetId)}
                            title="Copy Asset ID"
                            className="text-slate-400 hover:text-slate-600 p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            {copiedId === item.assetId ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                        {item.location && (
                          <div className="text-[11px] text-slate-400 mt-1 truncate max-w-[130px]" title={item.location}>
                            📍 {item.location}
                          </div>
                        )}
                      </td>

                      {/* 2. Description & Details Column */}
                      <td className="py-3.5 px-4 align-top">
                        <div className="space-y-1">
                          <button
                            onClick={() => onOpenDetailsModal(item)}
                            className="font-semibold text-slate-900 hover:text-teal-700 text-left transition-colors line-clamp-2 leading-snug cursor-pointer"
                          >
                            {item.description}
                          </button>

                          <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 font-medium">
                              {item.category}
                            </span>
                            {item.brandModel && (
                              <span className="text-slate-500 font-medium">
                                • {item.brandModel}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* 3. Qty ng Stock Column */}
                      <td className="py-3.5 px-4 align-top text-center">
                        <div className="inline-flex flex-col items-center">
                          <div className="flex items-baseline space-x-1">
                            <span
                              className={`text-base font-extrabold ${
                                item.stockQty === 0
                                  ? 'text-red-600'
                                  : item.stockQty <= item.minReorderLevel
                                  ? 'text-amber-600'
                                  : 'text-slate-900'
                              }`}
                            >
                              {item.stockQty}
                            </span>
                            <span className="text-xs text-slate-500 font-medium">{item.unit}</span>
                          </div>

                          {/* Reorder Level indicator */}
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            Min Threshold: <span className="font-semibold text-slate-600">{item.minReorderLevel}</span>
                          </div>

                          {/* Mini visual indicator bar */}
                          <div className="w-16 bg-slate-100 rounded-full h-1.5 mt-1 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                item.stockQty === 0
                                  ? 'bg-red-500 w-0'
                                  : item.stockQty <= item.minReorderLevel
                                  ? 'bg-amber-500'
                                  : 'bg-emerald-500'
                              }`}
                              style={{
                                width: `${Math.min(
                                  100,
                                  (item.stockQty / Math.max(item.minReorderLevel * 2, 1)) * 100
                                )}%`,
                              }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* 4. Unit Column */}
                      <td className="py-3.5 px-4 align-top text-center">
                        <span className="inline-block px-2.5 py-1 rounded bg-slate-100 text-slate-700 text-xs font-mono font-medium border border-slate-200">
                          {item.unit}
                        </span>
                      </td>

                      {/* 5. Unit Price Column */}
                      <td className="py-3.5 px-4 align-top text-right">
                        {item.unitPrice !== undefined ? (
                          <span className="font-semibold text-slate-800 text-xs">
                            {formatCurrency(item.unitPrice)}
                          </span>
                        ) : (
                          <span className="text-slate-300 text-xs">—</span>
                        )}
                      </td>

                      {/* 6. Total Stock Valuation Column */}
                      <td className="py-3.5 px-4 align-top text-right">
                        {item.unitPrice !== undefined ? (
                          <span className="font-bold text-emerald-800 text-xs">
                            {formatCurrency(item.stockQty * item.unitPrice)}
                          </span>
                        ) : (
                          <span className="text-slate-300 text-xs">—</span>
                        )}
                      </td>

                      {/* 7. Reorder Status Column */}
                      <td className="py-3.5 px-4 align-top text-center">
                        {status === 'out_of_stock' ? (
                          <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-200 shadow-2xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-600" />
                            <span>Out of Stock</span>
                          </span>
                        ) : status === 'reorder_needed' ? (
                          <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200 shadow-2xs">
                            <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                            <span>Order to Replenish</span>
                          </span>
                        ) : status === 'low' ? (
                          <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            <span>Low Stock</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>In Stock (Good)</span>
                          </span>
                        )}
                      </td>

                      {/* 7. Action Buttons */}
                      <td className="py-3.5 px-4 align-top text-right">
                        <div className="inline-flex items-center space-x-1">
                          {/* Quick Restock button */}
                          <button
                            onClick={() => onOpenRestockModal(item)}
                            title="Add Stocks / Restock Item"
                            className="p-1.5 rounded-md text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 transition-colors"
                          >
                            <ArrowUpRight className="w-4 h-4" />
                          </button>

                          {/* View details */}
                          <button
                            onClick={() => onOpenDetailsModal(item)}
                            title="View Asset Details & Project Allocations"
                            className="p-1.5 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Edit Item */}
                          <button
                            onClick={() => onOpenEditModal(item)}
                            title="Edit Item Info"
                            className="p-1.5 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer Count & Summary */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            Showing <strong className="text-slate-800">{filteredItems.length}</strong> of{' '}
            <strong className="text-slate-800">{items.length}</strong> registered assets
          </div>
          <div className="flex items-center space-x-4">
            <span className="inline-flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
              <span>Healthy Stock</span>
            </span>
            <span className="inline-flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
              <span>Low Stock</span>
            </span>
            <span className="inline-flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
              <span>Replenish Needed</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
