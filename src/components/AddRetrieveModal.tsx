import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  RotateCcw,
  Building2,
  Calendar,
  User,
  Package,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Warehouse,
  ArrowDownLeft,
  Sparkles,
  Layers,
  ArrowRight,
  Info,
  Check,
} from 'lucide-react';
import {
  Project,
  InventoryItem,
  PullOutTicket,
  RetrieveTicket,
  RetrieveItemLine,
  RetrieveItemCondition,
  ItemCategory,
} from '../types';
import { formatCurrency } from '../utils/inventoryHelpers';

interface AddRetrieveModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects: Project[];
  inventoryItems: InventoryItem[];
  pullOutTickets?: PullOutTicket[];
  existingRetrieveTickets?: RetrieveTicket[];
  existingTickets?: RetrieveTicket[];
  onAddRetrieveTicket: (ticket: RetrieveTicket) => void;
  preselectedProjectId?: string | null;
}

export interface ProjectDispatchedItem {
  itemId: string;
  assetId: string;
  description: string;
  category: ItemCategory;
  unit: string;
  unitPrice: number;
  totalPulledOut: number;
  alreadyRetrieved: number;
  currentlyOnSite: number;
  availableToRetrieve: number;
}

export const AddRetrieveModal: React.FC<AddRetrieveModalProps> = ({
  isOpen,
  onClose,
  projects,
  inventoryItems,
  pullOutTickets = [],
  existingRetrieveTickets,
  existingTickets,
  onAddRetrieveTicket,
  preselectedProjectId,
}) => {
  const allExistingTickets = existingRetrieveTickets || existingTickets || [];
  
  const generateTicketNumber = () => {
    const nextNum = allExistingTickets.length + 1;
    const year = new Date().getFullYear();
    return `RET-${year}-${String(nextNum).padStart(3, '0')}`;
  };

  const [ticketId, setTicketId] = useState(() => generateTicketNumber());
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [retrievedBy, setRetrievedBy] = useState('');
  const [receivedBy, setReceivedBy] = useState("M' Chrissna / Maricel");
  const [returnedTo, setReturnedTo] = useState('Lumiere Main Warehouse');
  const [notes, setNotes] = useState('');

  // Item draft fields
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [retrieveQty, setRetrieveQty] = useState<number | ''>('');
  const [itemCondition, setItemCondition] = useState<RetrieveItemCondition>('Good / Unused');
  const [itemRemarks, setItemRemarks] = useState('');
  const [retrievedItems, setRetrievedItems] = useState<RetrieveItemLine[]>([]);
  const [showFullWarehouseList, setShowFullWarehouseList] = useState(false);

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const currentProject = useMemo(() => {
    return projects.find((p) => p.id === selectedProjectId);
  }, [projects, selectedProjectId]);

  // Aggregate all items pulled out to the selected project and subtract previously retrieved items
  const siteDispatchedItems = useMemo<ProjectDispatchedItem[]>(() => {
    if (!currentProject) return [];

    const pId = (currentProject.id || '').trim().toLowerCase();
    const pName = (currentProject.name || '').trim().toLowerCase();

    // 1. Pull Out Tickets for this project
    const projectPullOuts = pullOutTickets.filter((t) => {
      const tId = (t.projectId || '').trim().toLowerCase();
      const tName = (t.projectName || '').trim().toLowerCase();
      return (
        (tId && tId === pId) ||
        (tName && tName === pName) ||
        (tId && tId === pName) ||
        (tName && tName === pId)
      );
    });

    // 2. Existing Retrieve Tickets for this project
    const projectExistingRetrieves = allExistingTickets.filter((t) => {
      const tId = (t.projectId || '').trim().toLowerCase();
      const tName = (t.projectName || '').trim().toLowerCase();
      return (
        (tId && tId === pId) ||
        (tName && tName === pName) ||
        (tId && tId === pName) ||
        (tName && tName === pId)
      );
    });

    // Map by key: itemId or assetId
    const itemMap = new Map<string, ProjectDispatchedItem>();

    // Add from Pull Out Tickets
    projectPullOuts.forEach((ticket) => {
      ticket.items.forEach((item) => {
        const invMatch = inventoryItems.find(
          (i) =>
            (item.itemId && i.id.toLowerCase() === item.itemId.toLowerCase()) ||
            (item.assetId && i.assetId.toLowerCase() === item.assetId.toLowerCase()) ||
            (item.description && i.description.toLowerCase() === item.description.toLowerCase())
        );

        const key = (invMatch?.id || item.itemId || item.assetId || item.description).toLowerCase();
        const price = item.unitPrice || invMatch?.unitPrice || 0;

        if (!itemMap.has(key)) {
          itemMap.set(key, {
            itemId: invMatch?.id || item.itemId || key,
            assetId: invMatch?.assetId || item.assetId || 'N/A',
            description: invMatch?.description || item.description,
            category: (invMatch?.category || item.category || 'Others') as ItemCategory,
            unit: invMatch?.unit || item.unit || 'pcs',
            unitPrice: price,
            totalPulledOut: 0,
            alreadyRetrieved: 0,
            currentlyOnSite: 0,
            availableToRetrieve: 0,
          });
        }

        const entry = itemMap.get(key)!;
        entry.totalPulledOut += item.quantity;
      });
    });

    // Also include direct inventory allocations if any
    inventoryItems.forEach((invItem) => {
      if (invItem.projectAllocations) {
        invItem.projectAllocations.forEach((alloc) => {
          const aId = (alloc.projectId || '').trim().toLowerCase();
          const aName = (alloc.projectName || '').trim().toLowerCase();
          if (
            (aId && aId === pId) ||
            (aName && aName === pName) ||
            (aId && aId === pName) ||
            (aName && aName === pId)
          ) {
            const key = invItem.id.toLowerCase();
            if (!itemMap.has(key)) {
              itemMap.set(key, {
                itemId: invItem.id,
                assetId: invItem.assetId,
                description: invItem.description,
                category: invItem.category,
                unit: invItem.unit,
                unitPrice: invItem.unitPrice || 0,
                totalPulledOut: 0,
                alreadyRetrieved: 0,
                currentlyOnSite: 0,
                availableToRetrieve: 0,
              });
            }
            const entry = itemMap.get(key)!;
            // If not already covered by pull-outs
            if (projectPullOuts.length === 0) {
              entry.totalPulledOut += alloc.quantity;
            }
          }
        });
      }
    });

    // Subtract already retrieved items
    projectExistingRetrieves.forEach((ticket) => {
      ticket.items.forEach((rItem) => {
        const invMatch = inventoryItems.find(
          (i) =>
            (rItem.itemId && i.id.toLowerCase() === rItem.itemId.toLowerCase()) ||
            (rItem.assetId && i.assetId.toLowerCase() === rItem.assetId.toLowerCase()) ||
            (rItem.description && i.description.toLowerCase() === rItem.description.toLowerCase())
        );
        const key = (invMatch?.id || rItem.itemId || rItem.assetId || rItem.description).toLowerCase();
        if (itemMap.has(key)) {
          const entry = itemMap.get(key)!;
          entry.alreadyRetrieved += rItem.quantity;
        }
      });
    });

    // Calculate currently on site and available
    const result: ProjectDispatchedItem[] = [];
    itemMap.forEach((entry) => {
      entry.currentlyOnSite = Math.max(0, entry.totalPulledOut - entry.alreadyRetrieved);
      
      // Calculate draft usage
      const draftQty = retrievedItems
        .filter((line) => line.itemId.toLowerCase() === entry.itemId.toLowerCase() || line.assetId.toLowerCase() === entry.assetId.toLowerCase())
        .reduce((sum, line) => sum + line.quantity, 0);

      entry.availableToRetrieve = Math.max(0, entry.currentlyOnSite - draftQty);
      result.push(entry);
    });

    return result.sort((a, b) => b.currentlyOnSite - a.currentlyOnSite);
  }, [currentProject, pullOutTickets, allExistingTickets, inventoryItems, retrievedItems]);

  const prevIsOpenRef = React.useRef(false);
  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      setTicketId(generateTicketNumber());
      setErrors({});
      setRetrievedItems([]);
      setRetrieveQty('');
      setItemRemarks('');
      setItemCondition('Good / Unused');
      setShowFullWarehouseList(false);

      if (preselectedProjectId) {
        setSelectedProjectId(preselectedProjectId);
        const match = projects.find((p) => p.id === preselectedProjectId);
        if (match && match.leadPerson) {
          setRetrievedBy(match.leadPerson);
        }
      } else if (projects.length > 0) {
        setSelectedProjectId(projects[0].id);
        if (projects[0].leadPerson) {
          setRetrievedBy(projects[0].leadPerson);
        }
      }
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen, preselectedProjectId, projects]);

  // Set default selected item when project or dispatched items change
  useEffect(() => {
    if (isOpen) {
      if (siteDispatchedItems.length > 0) {
        const firstAvail = siteDispatchedItems.find((i) => i.availableToRetrieve > 0) || siteDispatchedItems[0];
        setSelectedItemId(firstAvail.itemId);
      } else if (inventoryItems.length > 0) {
        setSelectedItemId(inventoryItems[0].id);
      }
    }
  }, [selectedProjectId, siteDispatchedItems, isOpen, inventoryItems]);

  if (!isOpen) return null;

  // Selected item information
  const selectedDispatchedItem = siteDispatchedItems.find(
    (i) => i.itemId.toLowerCase() === selectedItemId.toLowerCase()
  );
  const selectedInventoryItem = inventoryItems.find((i) => i.id === selectedItemId);

  const activeItemDetails = selectedDispatchedItem || (selectedInventoryItem ? {
    itemId: selectedInventoryItem.id,
    assetId: selectedInventoryItem.assetId,
    description: selectedInventoryItem.description,
    category: selectedInventoryItem.category,
    unit: selectedInventoryItem.unit,
    unitPrice: selectedInventoryItem.unitPrice || 0,
    totalPulledOut: 0,
    alreadyRetrieved: 0,
    currentlyOnSite: 0,
    availableToRetrieve: 999999,
  } : null);

  // Maximum quantity allowed to retrieve
  const maxAvailableForActive = selectedDispatchedItem
    ? selectedDispatchedItem.availableToRetrieve
    : 999999;

  // Handle changing project
  const handleProjectSelectChange = (pId: string) => {
    setSelectedProjectId(pId);
    setRetrievedItems([]);
    setRetrieveQty('');
    if (errors.project) setErrors((prev) => ({ ...prev, project: '' }));
    const p = projects.find((proj) => proj.id === pId);
    if (p && p.leadPerson) {
      setRetrievedBy(p.leadPerson);
    }
  };

  // Quick 1-Click action: Add all remaining units of a site item to slip
  const handleQuickAddAllItem = (item: ProjectDispatchedItem) => {
    if (item.availableToRetrieve <= 0) return;

    const existingIndex = retrievedItems.findIndex(
      (line) => line.itemId.toLowerCase() === item.itemId.toLowerCase() && line.condition === 'Good / Unused'
    );

    if (existingIndex >= 0) {
      const updated = [...retrievedItems];
      updated[existingIndex].quantity += item.availableToRetrieve;
      setRetrievedItems(updated);
    } else {
      const newLine: RetrieveItemLine = {
        itemId: item.itemId,
        assetId: item.assetId,
        description: item.description,
        category: item.category,
        quantity: item.availableToRetrieve,
        unit: item.unit,
        unitPrice: item.unitPrice,
        condition: 'Good / Unused',
        remarks: 'Direct return from site inventory',
      };
      setRetrievedItems([...retrievedItems, newLine]);
    }
  };

  // Add single item line to retrieve list
  const handleAddItemLine = () => {
    if (!selectedItemId || !activeItemDetails) {
      setErrors((prev) => ({ ...prev, item: 'Pumili ng item na ibabalik sa bodega.' }));
      return;
    }

    const qty = Number(retrieveQty);
    if (!qty || qty <= 0) {
      setErrors((prev) => ({ ...prev, qty: 'Maglagay ng valid na quantity na higit sa 0.' }));
      return;
    }

    if (selectedDispatchedItem && qty > selectedDispatchedItem.availableToRetrieve) {
      setErrors((prev) => ({
        ...prev,
        qty: `Hindi pwedeng lumagpas sa ${selectedDispatchedItem.availableToRetrieve} ${selectedDispatchedItem.unit} na natitira sa site.`,
      }));
      return;
    }

    // Check if already in list
    const existingIndex = retrievedItems.findIndex(
      (line) =>
        (line.itemId.toLowerCase() === activeItemDetails.itemId.toLowerCase() ||
         line.assetId.toLowerCase() === activeItemDetails.assetId.toLowerCase()) &&
        line.condition === itemCondition
    );

    if (existingIndex >= 0) {
      const updated = [...retrievedItems];
      updated[existingIndex].quantity += qty;
      if (itemRemarks.trim()) {
        updated[existingIndex].remarks = itemRemarks.trim();
      }
      setRetrievedItems(updated);
    } else {
      const newLine: RetrieveItemLine = {
        itemId: activeItemDetails.itemId,
        assetId: activeItemDetails.assetId,
        description: activeItemDetails.description,
        category: activeItemDetails.category,
        quantity: qty,
        unit: activeItemDetails.unit,
        unitPrice: activeItemDetails.unitPrice,
        condition: itemCondition,
        remarks: itemRemarks.trim() || undefined,
      };
      setRetrievedItems([...retrievedItems, newLine]);
    }

    // Reset inputs
    setRetrieveQty('');
    setItemRemarks('');
    setErrors({});
  };

  const handleRemoveItemLine = (index: number) => {
    setRetrievedItems(retrievedItems.filter((_, i) => i !== index));
  };

  // Submit complete Retrieve Ticket
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: { [key: string]: string } = {};

    if (!selectedProjectId) {
      newErrors.project = 'Pumili ng source project.';
    }

    if (!ticketId.trim()) {
      newErrors.ticketId = 'Kailangan ang Retrieve Ticket #.';
    }

    if (retrievedItems.length === 0) {
      newErrors.items = 'Magdagdag ng kahit isang item na ibabalik sa bodega.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const proj = projects.find((p) => p.id === selectedProjectId);
    const projectName = proj ? proj.name : 'Site Project';
    const projectLocation = proj ? proj.location : 'Project Site';

    const totalQty = retrievedItems.reduce((sum, item) => sum + item.quantity, 0);
    const totalVal = retrievedItems.reduce(
      (sum, item) => sum + item.quantity * (item.unitPrice || 0),
      0
    );

    const newRetrieveTicket: RetrieveTicket = {
      id: ticketId.trim(),
      projectId: selectedProjectId,
      projectName,
      projectLocation,
      location: projectLocation,
      retrievedBy: retrievedBy.trim() || (proj?.leadPerson || 'Project Staff'),
      receivedBy: receivedBy.trim() || "M' Chrissna / Maricel",
      returnedTo: returnedTo.trim() || 'Lumiere Main Warehouse',
      returnedToWarehouse: returnedTo.trim() || 'Lumiere Main Warehouse',
      date: date || new Date().toISOString().slice(0, 10),
      items: retrievedItems,
      totalQuantity: totalQty,
      totalValue: totalVal > 0 ? totalVal : undefined,
      notes: notes.trim() || undefined,
      reasonForReturn: notes.trim() || 'Excess / Surplus Materials from Site',
      createdAt: new Date().toISOString(),
    };

    onAddRetrieveTicket(newRetrieveTicket);
    onClose();
  };

  const totalItemsCount = retrievedItems.reduce((acc, curr) => acc + curr.quantity, 0);
  const totalEstimatedValue = retrievedItems.reduce(
    (acc, curr) => acc + curr.quantity * (curr.unitPrice || 0),
    0
  );

  return (
    <div
      id="add-retrieve-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto"
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[94vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-auto">
        {/* Modal Header */}
        <div className="bg-slate-900 px-6 py-4 flex items-center justify-between text-white shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-teal-500/20 text-teal-400 border border-teal-500/30">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <span>Retrieve Items / Return to Inventory</span>
                <span className="text-xs font-normal px-2 py-0.5 bg-teal-900/80 text-teal-300 border border-teal-700/50 rounded-md">
                  Material Inflow & Cost Credit
                </span>
              </h3>
              <p className="text-xs text-slate-300">
                Pumili mula sa mga gamit at materyales na na-pull out sa project para ibalik sa bodega. Awtomatikong maibabalik ang stock at mababawas ang project material cost.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Top Metadata Strip */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
            {/* Retrieve Ticket ID */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Retrieve Form No. <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={ticketId}
                onChange={(e) => setTicketId(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono font-bold bg-white border border-slate-300 rounded-lg text-teal-800 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                placeholder="e.g. RET-2026-001"
              />
              {errors.ticketId && (
                <p className="text-[11px] text-rose-500 mt-1">{errors.ticketId}</p>
              )}
            </div>

            {/* Source Project */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Source Project <span className="text-rose-500">*</span>
              </label>
              <select
                value={selectedProjectId}
                onChange={(e) => handleProjectSelectChange(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg font-semibold text-slate-900 focus:ring-2 focus:ring-teal-500 focus:outline-none"
              >
                {projects.length === 0 ? (
                  <option value="">Walang projects available</option>
                ) : (
                  projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      [{p.id}] {p.name}
                    </option>
                  ))
                )}
              </select>
              {errors.project && (
                <p className="text-[11px] text-rose-500 mt-1">{errors.project}</p>
              )}
            </div>

            {/* Return Date */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center space-x-1">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                <span>Return Date</span>
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
            </div>

            {/* Destination Warehouse */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center space-x-1">
                <Warehouse className="w-3.5 h-3.5 text-slate-500" />
                <span>Returned To (Warehouse)</span>
              </label>
              <input
                type="text"
                value={returnedTo}
                onChange={(e) => setReturnedTo(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                placeholder="e.g. Lumiere Main Warehouse"
              />
            </div>
          </div>

          {/* Personnel Signatories Box */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center space-x-1">
                <User className="w-3.5 h-3.5 text-slate-500" />
                <span>Retrieved / Returned By (Site Lead / Staff)</span>
              </label>
              <input
                type="text"
                value={retrievedBy}
                onChange={(e) => setRetrievedBy(e.target.value)}
                placeholder="e.g. Engr. Romelle Gonzales / Foreman"
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center space-x-1">
                <User className="w-3.5 h-3.5 text-slate-500" />
                <span>Received in Warehouse By (Bodega In-charge)</span>
              </label>
              <input
                type="text"
                value={receivedBy}
                onChange={(e) => setReceivedBy(e.target.value)}
                placeholder="e.g. M' Chrissna / Maricel"
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
            </div>
          </div>

          {/* 1. PROJECT SITE ACTIVE MATERIALS PANEL */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 pb-2.5">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center space-x-2">
                  <Package className="w-4 h-4 text-teal-600" />
                  <span>Items & Materials Currently at {currentProject?.name || 'Project Site'}</span>
                </h4>
                <p className="text-[11px] text-slate-500">
                  Lahat ng items na na-pull out mula sa Lumiere warehouse at nasa site ngayon na pwedeng i-retrieve.
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setShowFullWarehouseList(!showFullWarehouseList)}
                  className={`text-[11px] px-2.5 py-1 rounded-lg border font-semibold transition-colors cursor-pointer ${
                    showFullWarehouseList
                      ? 'bg-amber-50 text-amber-800 border-amber-300'
                      : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  {showFullWarehouseList ? '✓ Showing All Warehouse Items' : '+ Show All Warehouse Items'}
                </button>
              </div>
            </div>

            {siteDispatchedItems.length === 0 ? (
              <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-4 text-center space-y-1.5">
                <AlertCircle className="w-5 h-5 text-amber-600 mx-auto" />
                <p className="text-xs font-bold text-amber-900">
                  Walang na-pull out na materyales sa proyektong ito.
                </p>
                <p className="text-[11px] text-amber-700">
                  Hindi pa nagkakaroon ng Pull-Out Ticket papunta sa <strong>{currentProject?.name}</strong>. Pindutin ang button sa itaas para pumili mula sa buong bodega kung kinakailangan.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto max-h-56 overflow-y-auto bg-white rounded-xl border border-slate-200 shadow-2xs">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-100/90 sticky top-0 z-10 text-slate-600 font-bold uppercase text-[10px] border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-3">Asset ID</th>
                      <th className="py-2 px-3">Description</th>
                      <th className="py-2 px-3 text-center">Total Dispatched</th>
                      <th className="py-2 px-3 text-center">Previously Returned</th>
                      <th className="py-2 px-3 text-center">Available at Site</th>
                      <th className="py-2 px-3 text-right">Unit Value</th>
                      <th className="py-2 px-3 text-center">Quick Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {siteDispatchedItems.map((item, idx) => {
                      const isSelected = selectedItemId.toLowerCase() === item.itemId.toLowerCase();
                      const isFullyReturned = item.availableToRetrieve <= 0;

                      return (
                        <tr
                          key={idx}
                          onClick={() => {
                            setSelectedItemId(item.itemId);
                            if (item.availableToRetrieve > 0) {
                              setRetrieveQty(item.availableToRetrieve);
                            }
                          }}
                          className={`transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-teal-50/80 font-medium'
                              : isFullyReturned
                              ? 'opacity-60 bg-slate-50/50'
                              : 'hover:bg-slate-50'
                          }`}
                        >
                          <td className="py-2 px-3 font-mono font-bold text-teal-800">
                            {item.assetId}
                          </td>
                          <td className="py-2 px-3">
                            <div className="font-semibold text-slate-900">{item.description}</div>
                            <span className="text-[10px] text-slate-400">{item.category}</span>
                          </td>
                          <td className="py-2 px-3 text-center font-mono text-slate-700">
                            {item.totalPulledOut} {item.unit}
                          </td>
                          <td className="py-2 px-3 text-center font-mono text-slate-500">
                            {item.alreadyRetrieved > 0 ? `${item.alreadyRetrieved} ${item.unit}` : '0'}
                          </td>
                          <td className="py-2 px-3 text-center">
                            {isFullyReturned ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500">
                                Fully Returned
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold font-mono bg-emerald-100 text-emerald-900 border border-emerald-300">
                                {item.availableToRetrieve} {item.unit}
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-slate-700">
                            {formatCurrency(item.unitPrice)}
                          </td>
                          <td className="py-2 px-3 text-center">
                            {!isFullyReturned ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleQuickAddAllItem(item);
                                }}
                                className="px-2 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded text-[11px] font-bold shadow-2xs transition-colors flex items-center justify-center space-x-1 mx-auto cursor-pointer"
                                title="Add all remaining units to retrieve slip"
                              >
                                <Plus className="w-3 h-3" />
                                <span>Return All ({item.availableToRetrieve})</span>
                              </button>
                            ) : (
                              <span className="text-[10px] text-slate-400 font-semibold">Done</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* 2. CUSTOM / SELECTIVE ITEM ADDITION FORM */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center justify-between">
              <span className="flex items-center space-x-2">
                <ArrowDownLeft className="w-4 h-4 text-teal-600" />
                <span>Pumili ng Item at Ilagay ang Dami na Ibabalik</span>
              </span>
              {activeItemDetails && selectedDispatchedItem && (
                <span className="text-xs font-bold text-teal-800 bg-teal-100/70 border border-teal-300 px-2.5 py-0.5 rounded-md">
                  Natitira sa Site: {selectedDispatchedItem.availableToRetrieve} {activeItemDetails.unit}
                </span>
              )}
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              {/* Item Selector */}
              <div className="sm:col-span-5">
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Item / Asset Source
                </label>
                <select
                  value={selectedItemId}
                  onChange={(e) => {
                    setSelectedItemId(e.target.value);
                    const match = siteDispatchedItems.find(
                      (i) => i.itemId.toLowerCase() === e.target.value.toLowerCase()
                    );
                    if (match && match.availableToRetrieve > 0) {
                      setRetrieveQty(match.availableToRetrieve);
                    }
                    if (errors.item) setErrors((prev) => ({ ...prev, item: '' }));
                    if (errors.qty) setErrors((prev) => ({ ...prev, qty: '' }));
                  }}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg font-semibold text-slate-800 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                >
                  {siteDispatchedItems.length > 0 && (
                    <optgroup label="--- Items Currently at Project Site ---">
                      {siteDispatchedItems.map((item) => (
                        <option
                          key={`site-${item.itemId}`}
                          value={item.itemId}
                          disabled={item.availableToRetrieve <= 0}
                        >
                          [{item.assetId}] {item.description} ({item.availableToRetrieve} {item.unit} available at site)
                        </option>
                      ))}
                    </optgroup>
                  )}

                  {showFullWarehouseList && (
                    <optgroup label="--- All Warehouse Inventory Masterlist ---">
                      {inventoryItems.map((item) => (
                        <option key={`wh-${item.id}`} value={item.id}>
                          [{item.assetId}] {item.description} (Stock: {item.stockQty} {item.unit})
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
                {errors.item && <p className="text-[11px] text-rose-500 mt-1">{errors.item}</p>}
              </div>

              {/* Quantity */}
              <div className="sm:col-span-2">
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-semibold text-slate-600">
                    Return Qty ({activeItemDetails?.unit || 'pcs'})
                  </label>
                  {selectedDispatchedItem && selectedDispatchedItem.availableToRetrieve > 0 && (
                    <button
                      type="button"
                      onClick={() => setRetrieveQty(selectedDispatchedItem.availableToRetrieve)}
                      className="text-[10px] font-bold text-teal-700 hover:text-teal-900 underline cursor-pointer"
                    >
                      MAX ({selectedDispatchedItem.availableToRetrieve})
                    </button>
                  )}
                </div>
                <input
                  type="number"
                  min="1"
                  max={maxAvailableForActive}
                  step="any"
                  value={retrieveQty}
                  onChange={(e) => {
                    const val = e.target.value === '' ? '' : parseFloat(e.target.value);
                    setRetrieveQty(val);
                    if (errors.qty) setErrors((prev) => ({ ...prev, qty: '' }));
                  }}
                  placeholder="0"
                  className="w-full px-3 py-2 text-xs font-bold text-center bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
                {errors.qty && <p className="text-[11px] text-rose-500 mt-1">{errors.qty}</p>}
              </div>

              {/* Condition */}
              <div className="sm:col-span-3">
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Condition / Status
                </label>
                <select
                  value={itemCondition}
                  onChange={(e) => setItemCondition(e.target.value as RetrieveItemCondition)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                >
                  <option value="Good / Unused">Good / Unused (Surplus Materials)</option>
                  <option value="Excess Material">Excess Material (Leftover Cut / Offcut)</option>
                  <option value="Used / Functional">Used / Functional (Equipment/Tools)</option>
                  <option value="Needs Repair">Needs Repair / Maintenance</option>
                  <option value="Damaged / Scrap">Damaged / Scrap</option>
                </select>
              </div>

              {/* Add Button */}
              <div className="sm:col-span-2 flex items-end">
                <button
                  type="button"
                  onClick={handleAddItemLine}
                  className="w-full py-2 px-3 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-lg shadow-sm hover:shadow transition-all flex items-center justify-center space-x-1 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add to Slip</span>
                </button>
              </div>
            </div>

            {/* Optional Remarks for this item line */}
            <div>
              <input
                type="text"
                value={itemRemarks}
                onChange={(e) => setItemRemarks(e.target.value)}
                placeholder="Optional notes para sa item na ito (e.g. Unopened boxes, fully functional power tool, certified by lead)..."
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-teal-500"
              />
            </div>
          </div>

          {/* 3. DRAFT RETRIEVE SLIP TABLE */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                <span>Items in this Retrieve / Return Slip</span>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-teal-100 text-teal-800">
                  {retrievedItems.length} lines • {totalItemsCount} total units
                </span>
              </label>

              {totalEstimatedValue > 0 && (
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
                  Total Restored Material Value: {formatCurrency(totalEstimatedValue)}
                </span>
              )}
            </div>

            {retrievedItems.length === 0 ? (
              <div className="bg-slate-50 rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-400 text-xs">
                <Package className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                <p className="font-medium">Walang naka-draft na item para ibalik sa bodega.</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Pumili ng item sa itaas o pindutin ang <strong>"Return All"</strong> sa site materials table.
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                      <th className="py-2.5 px-3 w-12 text-center">#</th>
                      <th className="py-2.5 px-3">Asset ID</th>
                      <th className="py-2.5 px-3">Description</th>
                      <th className="py-2.5 px-3 text-center">Qty to Return</th>
                      <th className="py-2.5 px-3 text-right">Unit Cost</th>
                      <th className="py-2.5 px-3 text-right">Subtotal Value</th>
                      <th className="py-2.5 px-3">Condition / Remarks</th>
                      <th className="py-2.5 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                    {retrievedItems.map((line, idx) => {
                      const subtotal = line.quantity * (line.unitPrice || 0);
                      return (
                        <tr key={idx} className="hover:bg-slate-50 transition-colors">
                          <td className="py-2.5 px-3 text-center font-mono text-slate-400 font-bold">
                            {idx + 1}
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold text-teal-800">
                            {line.assetId}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="font-semibold text-slate-900">{line.description}</div>
                            <span className="text-[10px] text-slate-400">{line.category}</span>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className="inline-block px-2.5 py-0.5 bg-emerald-50 text-emerald-800 font-bold font-mono rounded border border-emerald-200">
                              +{line.quantity} {line.unit}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                            {formatCurrency(line.unitPrice || 0)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-800">
                            {formatCurrency(subtotal)}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600">
                            <div className="flex items-center space-x-1.5">
                              <span
                                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                                  line.condition === 'Good / Unused'
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : line.condition === 'Excess Material'
                                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                                    : line.condition === 'Needs Repair'
                                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                                    : 'bg-slate-100 text-slate-700 border-slate-200'
                                }`}
                              >
                                {line.condition}
                              </span>
                              {line.remarks && (
                                <span className="text-[11px] text-slate-500 italic">
                                  ({line.remarks})
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <button
                              type="button"
                              onClick={() => handleRemoveItemLine(idx)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Remove from slip"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {errors.items && <p className="text-xs text-rose-500 font-semibold">{errors.items}</p>}
          </div>

          {/* General Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              General Requisition Notes / Remarks (Optional)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Halimbawa: Surplus materials returned upon completion of Milestone #9; verified in good condition..."
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
            />
          </div>
        </form>

        {/* Modal Footer Actions */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-600">
            <span className="font-bold text-teal-800">Awtomatikong Update:</span> Ang stock ay babalik sa bodega, at ang net material cost at units sa <strong>{currentProject?.name || 'Project'}</strong> at Dashboard ay agad mababawasan.
          </div>

          <div className="flex items-center space-x-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="w-full sm:w-auto px-5 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-md transition-all flex items-center justify-center space-x-2 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Confirm & Return to Inventory</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
