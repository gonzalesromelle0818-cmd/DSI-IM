import React, { useState, useEffect } from 'react';
import {
  X,
  Send,
  Building2,
  Calendar,
  User,
  Package,
  Plus,
  Trash2,
  AlertCircle,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import { Project, InventoryItem, PullOutTicket, PullOutItemLine } from '../types';

interface AddPullOutModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects: Project[];
  inventoryItems: InventoryItem[];
  onAddPullOut: (ticket: PullOutTicket) => void;
  existingTickets: PullOutTicket[];
  onOpenAddProjectModal: () => void;
}

export const AddPullOutModal: React.FC<AddPullOutModalProps> = ({
  isOpen,
  onClose,
  projects,
  inventoryItems,
  onAddPullOut,
  existingTickets,
  onOpenAddProjectModal,
}) => {
  const generateTicketNumber = () => {
    const nextNum = existingTickets.length + 1;
    const year = new Date().getFullYear();
    return `PO-${year}-${String(nextNum).padStart(3, '0')}`;
  };

  const [ticketId, setTicketId] = useState(() => generateTicketNumber());
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [requestedBy, setRequestedBy] = useState('');
  const [notes, setNotes] = useState('');

  // Selected item line for adding
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [pullQty, setPullQty] = useState<number | ''>('');
  const [pullItems, setPullItems] = useState<PullOutItemLine[]>([]);

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (isOpen) {
      setTicketId(generateTicketNumber());
      if (projects.length > 0 && !selectedProjectId) {
        setSelectedProjectId(projects[0].id);
      }
      // Reset items in draft if opened fresh
      if (pullItems.length === 0 && inventoryItems.length > 0) {
        const firstInStock = inventoryItems.find((i) => i.stockQty > 0) || inventoryItems[0];
        if (firstInStock) {
          setSelectedItemId(firstInStock.id);
        }
      }
    }
  }, [isOpen, projects, inventoryItems]);

  if (!isOpen) return null;

  const currentSelectedItem = inventoryItems.find((i) => i.id === selectedItemId);

  // Calculate remaining stock considering items already in draft list
  const getAvailableStockForItem = (itemId: string) => {
    const originalItem = inventoryItems.find((i) => i.id === itemId);
    if (!originalItem) return 0;
    const alreadyAddedQty = pullItems
      .filter((line) => line.itemId === itemId)
      .reduce((sum, line) => sum + line.quantity, 0);
    return Math.max(0, originalItem.stockQty - alreadyAddedQty);
  };

  const availableStockForSelected = currentSelectedItem
    ? getAvailableStockForItem(currentSelectedItem.id)
    : 0;

  // Add item line to pull out list
  const handleAddItemLine = () => {
    if (!selectedItemId || !currentSelectedItem) {
      setErrors((prev) => ({ ...prev, item: 'Please select an item to pull out.' }));
      return;
    }

    const qty = Number(pullQty);
    if (!qty || qty <= 0) {
      setErrors((prev) => ({ ...prev, qty: 'Enter a valid quantity greater than 0.' }));
      return;
    }

    if (qty > availableStockForSelected) {
      setErrors((prev) => ({
        ...prev,
        qty: `Insufficient stock! Maximum available is ${availableStockForSelected} ${currentSelectedItem.unit}.`,
      }));
      return;
    }

    // Check if already in list, if so increment, otherwise append
    const existingIndex = pullItems.findIndex((line) => line.itemId === currentSelectedItem.id);
    if (existingIndex >= 0) {
      const updated = [...pullItems];
      updated[existingIndex].quantity += qty;
      setPullItems(updated);
    } else {
      const newLine: PullOutItemLine = {
        itemId: currentSelectedItem.id,
        assetId: currentSelectedItem.assetId,
        description: currentSelectedItem.description,
        category: currentSelectedItem.category,
        quantity: qty,
        unit: currentSelectedItem.unit,
        unitPrice: currentSelectedItem.unitPrice,
      };
      setPullItems([...pullItems, newLine]);
    }

    // Reset line inputs
    setPullQty('');
    setErrors((prev) => ({ ...prev, item: '', qty: '', itemsList: '' }));
  };

  const handleRemoveItemLine = (itemId: string) => {
    setPullItems((prev) => prev.filter((line) => line.itemId !== itemId));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs: { [key: string]: string } = {};

    if (!selectedProjectId) {
      errs.project = 'Please select a destination project.';
    }

    if (!date) {
      errs.date = 'Date is required.';
    }

    if (!requestedBy.trim()) {
      errs.requestedBy = 'Please state who requested the pull out.';
    }

    if (pullItems.length === 0) {
      errs.itemsList = 'Please add at least one item to pull out.';
    }

    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    const targetProject = projects.find((p) => p.id === selectedProjectId);

    const ticket: PullOutTicket = {
      id: ticketId.trim().toUpperCase(),
      projectId: selectedProjectId,
      projectName: targetProject ? targetProject.name : selectedProjectId,
      projectLocation: targetProject?.location,
      requestedBy: requestedBy.trim(),
      date,
      items: pullItems,
      notes: notes.trim() || undefined,
      createdAt: new Date().toISOString().slice(0, 10),
    };

    onAddPullOut(ticket);
    onClose();

    // Reset
    setPullItems([]);
    setRequestedBy('');
    setNotes('');
    setErrors({});
  };

  return (
    <div
      id="add-pullout-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="add-pullout-modal-card"
        className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Modal Header */}
        <div className="bg-slate-900 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-teal-500/20 text-teal-400 border border-teal-500/30">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">Create Pull Out Form</h2>
              <p className="text-xs text-slate-400">
                Dispatch items from Warehouse stock to an active site project
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5">
          {/* Top Row: Ticket Number & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Pull Out Ticket # / DR No.
              </label>
              <input
                type="text"
                value={ticketId}
                onChange={(e) => setTicketId(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono font-bold bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 uppercase"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Pull Out Date <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={date}
                  onChange={(e) => {
                    setDate(e.target.value);
                    if (errors.date) setErrors((prev) => ({ ...prev, date: '' }));
                  }}
                  className={`w-full px-3 py-2 text-xs bg-white border rounded-lg focus:ring-2 focus:ring-teal-500 ${
                    errors.date ? 'border-red-500 bg-red-50/20' : 'border-slate-300'
                  }`}
                />
              </div>
              {errors.date && <p className="text-xs text-red-600 mt-1">{errors.date}</p>}
            </div>
          </div>

          {/* Project Selection & Requester */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Saang Project sya ipapadala */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Saang Project Ipapadala <span className="text-red-500">*</span>
                </label>
                {projects.length === 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenAddProjectModal();
                    }}
                    className="text-[11px] text-teal-600 hover:text-teal-800 font-semibold underline"
                  >
                    + Create Project First
                  </button>
                )}
              </div>

              {projects.length === 0 ? (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 space-y-1.5">
                  <p className="font-semibold flex items-center space-x-1">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>No projects found in Project Tab</span>
                  </p>
                  <p className="text-[11px]">
                    Mag-add muna ng Project sa <strong>Projects Tab</strong> upang makapili ng pupuntahan ng items.
                  </p>
                </div>
              ) : (
                <select
                  value={selectedProjectId}
                  onChange={(e) => {
                    setSelectedProjectId(e.target.value);
                    if (errors.project) setErrors((prev) => ({ ...prev, project: '' }));
                  }}
                  className={`w-full px-3.5 py-2.5 text-xs bg-white border rounded-lg focus:ring-2 focus:ring-teal-500 ${
                    errors.project ? 'border-red-500 bg-red-50/20' : 'border-slate-300'
                  }`}
                >
                  <option value="">-- Select Destination Project --</option>
                  {projects.map((proj) => (
                    <option key={proj.id} value={proj.id}>
                      [{proj.id}] {proj.name} {proj.location ? `(${proj.location})` : ''}
                    </option>
                  ))}
                </select>
              )}
              {errors.project && <p className="text-xs text-red-600 mt-1">{errors.project}</p>}
            </div>

            {/* Kung sino ang nag request */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Requested By (Sino ang nag-request) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={requestedBy}
                  onChange={(e) => {
                    setRequestedBy(e.target.value);
                    if (errors.requestedBy) setErrors((prev) => ({ ...prev, requestedBy: '' }));
                  }}
                  placeholder="e.g. Engr. Santos / Foreman Carlo"
                  className={`w-full px-3.5 py-2.5 text-xs bg-white border rounded-lg focus:ring-2 focus:ring-teal-500 ${
                    errors.requestedBy ? 'border-red-500 bg-red-50/20' : 'border-slate-300'
                  }`}
                />
              </div>
              {errors.requestedBy && (
                <p className="text-xs text-red-600 mt-1">{errors.requestedBy}</p>
              )}
            </div>
          </div>

          {/* Items to Pull Out Section */}
          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/60 space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-1.5">
                <Package className="w-4 h-4 text-teal-600" />
                <span>Anong Items From Inventory ang I-pull out?</span>
              </label>
              <span className="text-[11px] text-slate-500">Piliin ang item at ilagay ang Qty</span>
            </div>

            {/* Item selector row */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
              <div className="sm:col-span-7">
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Select Item from Warehouse
                </label>
                <select
                  value={selectedItemId}
                  onChange={(e) => {
                    setSelectedItemId(e.target.value);
                    if (errors.item) setErrors((prev) => ({ ...prev, item: '' }));
                  }}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                >
                  <option value="">-- Choose Inventory Item --</option>
                  {inventoryItems.map((item) => (
                    <option
                      key={item.id}
                      value={item.id}
                      disabled={item.stockQty <= 0}
                    >
                      [{item.assetId}] {item.description} ({item.category}) — Stock: {item.stockQty} {item.unit} {item.stockQty <= 0 ? '(OUT OF STOCK)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-3">
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Qty to Pull Out {currentSelectedItem ? `(${currentSelectedItem.unit})` : ''}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max={availableStockForSelected || 1}
                    value={pullQty}
                    onChange={(e) => {
                      setPullQty(e.target.value === '' ? '' : Number(e.target.value));
                      if (errors.qty) setErrors((prev) => ({ ...prev, qty: '' }));
                    }}
                    placeholder={`Max: ${availableStockForSelected}`}
                    className="w-full px-3 py-2 text-xs font-semibold bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div className="sm:col-span-2">
                <button
                  type="button"
                  onClick={handleAddItemLine}
                  disabled={!selectedItemId || availableStockForSelected <= 0}
                  className={`w-full py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center space-x-1 ${
                    !selectedItemId || availableStockForSelected <= 0
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      : 'bg-teal-600 text-white hover:bg-teal-700 shadow-sm cursor-pointer'
                  }`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Line</span>
                </button>
              </div>
            </div>

            {/* Error alerts for line */}
            {(errors.item || errors.qty) && (
              <p className="text-xs text-red-600 font-medium">{errors.item || errors.qty}</p>
            )}

            {/* Stock Availability indicator */}
            {currentSelectedItem && (
              <div className="text-[11px] text-slate-600 flex items-center space-x-3 bg-white p-2.5 rounded-lg border border-slate-200">
                <span>
                  Current Warehouse Stock: <strong>{currentSelectedItem.stockQty} {currentSelectedItem.unit}</strong>
                </span>
                <span>•</span>
                <span>
                  Available for this Ticket:{' '}
                  <strong className={availableStockForSelected > 0 ? 'text-teal-700' : 'text-rose-600'}>
                    {availableStockForSelected} {currentSelectedItem.unit}
                  </strong>
                </span>
                <span>•</span>
                <span>Location: <strong>{currentSelectedItem.location || 'Lumiere'}</strong></span>
              </div>
            )}

            {/* Added Items Table */}
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5 flex items-center justify-between">
                <span>Items in this Pull Out Ticket ({pullItems.length})</span>
                {pullItems.length > 0 && (
                  <div className="flex items-center space-x-3 text-xs">
                    <span className="text-teal-700 font-semibold">
                      Total: {pullItems.reduce((sum, item) => sum + item.quantity, 0)} units
                    </span>
                    <span className="text-emerald-700 font-bold">
                      Est. Cost: ₱
                      {pullItems
                        .reduce((sum, item) => sum + (item.unitPrice ? item.quantity * item.unitPrice : 0), 0)
                        .toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
              </div>

              {pullItems.length === 0 ? (
                <div className="p-4 bg-white border border-dashed border-slate-300 rounded-lg text-center text-xs text-slate-400">
                  Wala pang naka-add na item. Piliin ang gamit sa itaas at i-click ang "+ Add Line".
                </div>
              ) : (
                <div className="border border-slate-200 rounded-lg overflow-hidden bg-white divide-y divide-slate-100">
                  <div className="bg-slate-100/80 px-3.5 py-2 text-[11px] font-bold text-slate-600 grid grid-cols-12 gap-2">
                    <div className="col-span-3">Asset ID</div>
                    <div className="col-span-4">Description</div>
                    <div className="col-span-2 text-right">Unit Price</div>
                    <div className="col-span-2 text-right">Pull Qty</div>
                    <div className="col-span-1 text-center">Action</div>
                  </div>
                  {pullItems.map((line) => (
                    <div
                      key={line.itemId}
                      className="px-3.5 py-2 text-xs grid grid-cols-12 gap-2 items-center hover:bg-slate-50"
                    >
                      <div className="col-span-3 font-mono font-semibold text-slate-800">
                        {line.assetId}
                      </div>
                      <div className="col-span-4 text-slate-900 font-medium truncate">
                        {line.description}
                      </div>
                      <div className="col-span-2 text-right text-slate-600 font-medium text-[11px]">
                        {line.unitPrice !== undefined
                          ? `₱${line.unitPrice.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`
                          : '—'}
                      </div>
                      <div className="col-span-2 text-right">
                        <span className="font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                          {line.quantity} {line.unit}
                        </span>
                      </div>
                      <div className="col-span-1 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveItemLine(line.itemId)}
                          className="text-slate-400 hover:text-rose-600 p-1 transition-colors"
                          title="Remove item from ticket"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {errors.itemsList && <p className="text-xs text-red-600 mt-1">{errors.itemsList}</p>}
            </div>
          </div>

          {/* Notes / Purpose */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Purpose / Remarks (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. For Phase 1 installation & roughing-in works"
              className="w-full px-3.5 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
            />
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={projects.length === 0}
              className="px-5 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-sm hover:shadow transition-all flex items-center space-x-1.5 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>Confirm & Dispatch Pull Out</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
