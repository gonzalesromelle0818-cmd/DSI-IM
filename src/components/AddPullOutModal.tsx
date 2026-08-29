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
  MapPin,
  FolderPlus,
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
  preselectedProjectId?: string | null;
}

export const AddPullOutModal: React.FC<AddPullOutModalProps> = ({
  isOpen,
  onClose,
  projects,
  inventoryItems,
  onAddPullOut,
  existingTickets,
  onOpenAddProjectModal,
  preselectedProjectId,
}) => {
  const generateTicketNumber = () => {
    const nextNum = existingTickets.length + 1;
    const year = new Date().getFullYear();
    return `PO-${year}-${String(nextNum).padStart(3, '0')}`;
  };

  const [ticketId, setTicketId] = useState(() => generateTicketNumber());
  const [destinationMode, setDestinationMode] = useState<'select' | 'new'>('select');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectLocation, setNewProjectLocation] = useState('');
  const [newProjectCode, setNewProjectCode] = useState('');

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

      if (preselectedProjectId) {
        setSelectedProjectId(preselectedProjectId);
        setDestinationMode('select');
        const match = projects.find((p) => p.id === preselectedProjectId);
        if (match && match.leadPerson && !requestedBy) {
          setRequestedBy(match.leadPerson);
        }
      } else if (projects.length > 0) {
        setDestinationMode('select');
        if (!selectedProjectId) {
          setSelectedProjectId(projects[0].id);
          if (projects[0].leadPerson && !requestedBy) {
            setRequestedBy(projects[0].leadPerson);
          }
        }
      } else {
        setDestinationMode('new');
        setNewProjectCode(`PRJ-${String(projects.length + 1).padStart(3, '0')}`);
      }

      // Reset items in draft if opened fresh
      if (pullItems.length === 0 && inventoryItems.length > 0) {
        const firstInStock = inventoryItems.find((i) => i.stockQty > 0) || inventoryItems[0];
        if (firstInStock) {
          setSelectedItemId(firstInStock.id);
        }
      }
    }
  }, [isOpen, projects, inventoryItems, preselectedProjectId]);

  // When project changes in dropdown, auto-fill lead
  const handleProjectSelectChange = (pId: string) => {
    setSelectedProjectId(pId);
    if (errors.project) setErrors((prev) => ({ ...prev, project: '' }));
    const p = projects.find((proj) => proj.id === pId);
    if (p && p.leadPerson) {
      setRequestedBy(p.leadPerson);
    }
  };

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
        unitPrice: currentSelectedItem.unitPrice || 0,
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

    let targetProjectId = '';
    let targetProjectName = '';
    let targetProjectLocation = '';

    if (destinationMode === 'select') {
      if (!selectedProjectId) {
        errs.project = 'Please select a destination project.';
      } else {
        const found = projects.find((p) => p.id === selectedProjectId);
        targetProjectId = selectedProjectId;
        targetProjectName = found ? found.name : selectedProjectId;
        targetProjectLocation = found?.location || '';
      }
    } else {
      if (!newProjectName.trim()) {
        errs.projectName = 'Please enter the project name.';
      }
      targetProjectId = newProjectCode.trim() || `PRJ-${String(projects.length + 1).padStart(3, '0')}`;
      targetProjectName = newProjectName.trim();
      targetProjectLocation = newProjectLocation.trim() || 'Site Location';
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

    const ticket: PullOutTicket = {
      id: ticketId.trim().toUpperCase(),
      projectId: targetProjectId,
      projectName: targetProjectName,
      projectLocation: targetProjectLocation,
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
    setPullQty('');
    setRequestedBy('');
    setNotes('');
    setNewProjectName('');
    setNewProjectLocation('');
    setNewProjectCode('');
    setErrors({});
  };

  const totalPullCost = pullItems.reduce(
    (sum, line) => sum + line.quantity * (line.unitPrice || 0),
    0
  );

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
                Mag-dispatch ng items mula sa Warehouse stock papunta sa Site Project
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
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

          {/* Project Selection Mode */}
          <div className="space-y-3 p-4 bg-slate-50/80 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Destination Project (Pupuntahang Project) <span className="text-red-500">*</span>
              </label>

              {/* Mode Toggle Buttons */}
              <div className="flex items-center space-x-1 bg-white p-0.5 rounded-lg border border-slate-200 text-xs">
                <button
                  type="button"
                  onClick={() => setDestinationMode('select')}
                  className={`px-2.5 py-1 rounded font-semibold transition-colors cursor-pointer ${
                    destinationMode === 'select'
                      ? 'bg-teal-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Pumili sa Listahan ({projects.length})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDestinationMode('new');
                    if (!newProjectCode) {
                      setNewProjectCode(`PRJ-${String(projects.length + 1).padStart(3, '0')}`);
                    }
                  }}
                  className={`px-2.5 py-1 rounded font-semibold transition-colors cursor-pointer flex items-center space-x-1 ${
                    destinationMode === 'new'
                      ? 'bg-teal-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Plus className="w-3 h-3" />
                  <span>Bagong Project</span>
                </button>
              </div>
            </div>

            {destinationMode === 'select' && projects.length > 0 ? (
              <div className="space-y-1.5">
                <select
                  value={selectedProjectId}
                  onChange={(e) => handleProjectSelectChange(e.target.value)}
                  className={`w-full px-3.5 py-2.5 text-xs bg-white border rounded-lg focus:ring-2 focus:ring-teal-500 font-medium ${
                    errors.project ? 'border-red-500 bg-red-50/20' : 'border-slate-300'
                  }`}
                >
                  <option value="">-- Pumili ng Destination Project --</option>
                  {projects.map((proj) => (
                    <option key={proj.id} value={proj.id}>
                      [{proj.id}] {proj.name} {proj.location ? `— ${proj.location}` : ''}
                    </option>
                  ))}
                </select>
                {errors.project && <p className="text-xs text-red-600">{errors.project}</p>}
              </div>
            ) : (
              /* New Project Fields */
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Project Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newProjectName}
                    onChange={(e) => {
                      setNewProjectName(e.target.value);
                      if (errors.projectName) setErrors((prev) => ({ ...prev, projectName: '' }));
                    }}
                    placeholder="hal. SM Mall Tower A expansion..."
                    className={`w-full px-3 py-2 text-xs bg-white border rounded-lg focus:ring-2 focus:ring-teal-500 ${
                      errors.projectName ? 'border-red-500 bg-red-50/20' : 'border-slate-300'
                    }`}
                  />
                  {errors.projectName && (
                    <p className="text-xs text-red-600 mt-0.5">{errors.projectName}</p>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Site Location
                  </label>
                  <input
                    type="text"
                    value={newProjectLocation}
                    onChange={(e) => setNewProjectLocation(e.target.value)}
                    placeholder="hal. Pasay City"
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Requester & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Requested By (Sino ang nag-request / Lead) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={requestedBy}
                onChange={(e) => {
                  setRequestedBy(e.target.value);
                  if (errors.requestedBy) setErrors((prev) => ({ ...prev, requestedBy: '' }));
                }}
                placeholder="hal. Engr. Mark Santos / Site Supervisor"
                className={`w-full px-3 py-2 text-xs bg-white border rounded-lg focus:ring-2 focus:ring-teal-500 ${
                  errors.requestedBy ? 'border-red-500 bg-red-50/20' : 'border-slate-300'
                }`}
              />
              {errors.requestedBy && <p className="text-xs text-red-600 mt-1">{errors.requestedBy}</p>}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Delivery Notes / Vehicle Ref
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional notes or truck plate number..."
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          {/* Section: Select & Add Items to Pull Out */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                Select Materials & Equipment from Stock
              </label>
              <span className="text-[11px] text-teal-700 font-semibold bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                {inventoryItems.length} Registered Items
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
              {/* Item Selector */}
              <div className="sm:col-span-8">
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Item Description / Asset Code
                </label>
                <select
                  value={selectedItemId}
                  onChange={(e) => setSelectedItemId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                >
                  {inventoryItems.map((item) => (
                    <option
                      key={item.id}
                      value={item.id}
                      disabled={getAvailableStockForItem(item.id) <= 0}
                    >
                      [{item.assetId}] {item.description} — Stock: {getAvailableStockForItem(item.id)}{' '}
                      {item.unit} {getAvailableStockForItem(item.id) <= 0 ? '(OUT OF STOCK)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Quantity */}
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Qty ({currentSelectedItem?.unit || 'pcs'})
                </label>
                <input
                  type="number"
                  min="1"
                  max={availableStockForSelected}
                  value={pullQty}
                  onChange={(e) => {
                    const val = e.target.value === '' ? '' : Number(e.target.value);
                    setPullQty(val);
                    if (errors.qty) setErrors((prev) => ({ ...prev, qty: '' }));
                  }}
                  placeholder="0"
                  className={`w-full px-3 py-2 text-xs bg-white border rounded-lg focus:ring-2 focus:ring-teal-500 ${
                    errors.qty ? 'border-red-500 bg-red-50/20' : 'border-slate-300'
                  }`}
                />
              </div>

              {/* Add to Draft Button */}
              <div className="sm:col-span-2">
                <button
                  type="button"
                  onClick={handleAddItemLine}
                  disabled={availableStockForSelected <= 0}
                  className="w-full py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 rounded-lg shadow-sm flex items-center justify-center space-x-1 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Item</span>
                </button>
              </div>
            </div>

            {errors.qty && <p className="text-xs text-red-600">{errors.qty}</p>}
            {errors.item && <p className="text-xs text-red-600">{errors.item}</p>}

            {currentSelectedItem && (
              <div className="text-[11px] text-slate-500 flex items-center space-x-3 pt-0.5">
                <span>
                  Available in Warehouse:{' '}
                  <strong className="text-teal-700">
                    {availableStockForSelected} {currentSelectedItem.unit}
                  </strong>
                </span>
                <span>• Category: {currentSelectedItem.category}</span>
                {currentSelectedItem.unitPrice !== undefined && (
                  <span>• Unit Price: ₱{currentSelectedItem.unitPrice.toLocaleString()}</span>
                )}
              </div>
            )}
          </div>

          {/* Table of Items Added to this Pull Out Ticket */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Items to Dispatch ({pullItems.length})
              </label>
              {pullItems.length > 0 && totalPullCost > 0 && (
                <span className="text-xs font-bold text-teal-800 bg-teal-50 px-2.5 py-0.5 rounded border border-teal-200">
                  Est. Valuation: ₱{totalPullCost.toLocaleString()}
                </span>
              )}
            </div>

            {errors.itemsList && <p className="text-xs text-red-600">{errors.itemsList}</p>}

            {pullItems.length === 0 ? (
              <div className="p-6 border-2 border-dashed border-slate-200 rounded-xl text-center text-xs text-slate-400 space-y-1">
                <Package className="w-8 h-8 mx-auto text-slate-300 mb-1" />
                <p className="font-semibold text-slate-600">No items added to this pull out yet</p>
                <p>Select an item above and specify quantity to add to the dispatch list.</p>
              </div>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                <div className="bg-slate-100/80 px-4 py-2 text-[11px] font-bold text-slate-600 grid grid-cols-12 gap-2">
                  <span className="col-span-3">Asset ID</span>
                  <span className="col-span-5">Description</span>
                  <span className="col-span-2 text-right">Quantity</span>
                  <span className="col-span-2 text-center">Action</span>
                </div>

                {pullItems.map((line) => (
                  <div
                    key={line.itemId}
                    className="px-4 py-2.5 text-xs text-slate-800 grid grid-cols-12 gap-2 items-center hover:bg-slate-50"
                  >
                    <span className="col-span-3 font-mono font-bold text-slate-700">
                      {line.assetId}
                    </span>
                    <div className="col-span-5 truncate">
                      <span className="font-medium text-slate-900 block truncate">
                        {line.description}
                      </span>
                      <span className="text-[10px] text-slate-400">{line.category}</span>
                    </div>
                    <span className="col-span-2 text-right font-bold font-mono text-teal-800">
                      {line.quantity} {line.unit}
                    </span>
                    <div className="col-span-2 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveItemLine(line.itemId)}
                        className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5 mx-auto" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-200 cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={pullItems.length === 0}
              className="px-6 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 rounded-lg shadow-sm flex items-center space-x-1.5 transition-colors cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Confirm & Dispatch Pull Out</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
