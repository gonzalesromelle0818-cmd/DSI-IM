import React, { useState } from 'react';
import {
  ShoppingBag,
  Plus,
  Trash2,
  Search,
  FileText,
  Building2,
  Calendar,
  User,
  ChevronDown,
  ChevronUp,
  Package,
  Layers,
  ArrowRight,
  ExternalLink,
  Printer,
  Download,
  FileDown,
} from 'lucide-react';
import { PullOutTicket, Project, InventoryItem } from '../types';
import { generatePullOutPDF } from '../utils/generatePullOutPDF';

interface PullOutViewProps {
  tickets: PullOutTicket[];
  projects: Project[];
  items: InventoryItem[];
  onOpenAddModal: () => void;
  onOpenRemoveModal: () => void;
  onDeleteTicket: (ticketId: string, returnStock: boolean) => void;
  onNavigateToInventory: () => void;
  onNavigateToProjects: () => void;
}

export const PullOutView: React.FC<PullOutViewProps> = ({
  tickets,
  projects,
  items,
  onOpenAddModal,
  onOpenRemoveModal,
  onDeleteTicket,
  onNavigateToInventory,
  onNavigateToProjects,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProjectFilter, setSelectedProjectFilter] = useState('all');
  const [expandedTicketId, setExpandedTicketId] = useState<string | null>(null);
  const [ticketToPrint, setTicketToPrint] = useState<PullOutTicket | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedTicketId((prev) => (prev === id ? null : id));
  };

  const filteredTickets = tickets.filter((ticket) => {
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      ticket.id.toLowerCase().includes(q) ||
      ticket.projectName.toLowerCase().includes(q) ||
      ticket.requestedBy.toLowerCase().includes(q) ||
      ticket.date.includes(q) ||
      ticket.items.some(
        (i) =>
          i.description.toLowerCase().includes(q) ||
          i.assetId.toLowerCase().includes(q)
      );

    const matchesProject =
      selectedProjectFilter === 'all'
        ? true
        : ticket.projectId === selectedProjectFilter;

    return matchesSearch && matchesProject;
  });

  const totalDispatchedUnits = tickets.reduce(
    (sum, t) => sum + t.items.reduce((s, i) => s + i.quantity, 0),
    0
  );

  const handleDownloadPDF = (ticket: PullOutTicket) => {
    const project = projects.find((p) => p.id === ticket.projectId);
    generatePullOutPDF({
      ticket,
      project,
      preparedBy: "M' Chrissna / Maricel",
      checkedBy: "M' Chrissna / Maricel",
      originatedFrom: 'Lumiere',
    });
  };

  return (
    <div id="pull-out-view-root" className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Header with Add & Remove Pull Out Buttons */}
      <div className="bg-white rounded-xl p-6 border border-slate-200/90 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-lg bg-teal-50 text-teal-700 border border-teal-200">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Pull Out / Material Dispatch
            </h2>
          </div>
          <p className="text-xs text-slate-500">
            Dispatch inventory items to site projects and track requisition slips.
          </p>
        </div>

        {/* Action Buttons: Add Pull Out & Remove Pull Out */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            id="btn-add-pullout"
            onClick={onOpenAddModal}
            className="px-4 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-sm hover:shadow transition-all flex items-center space-x-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Pull Out</span>
          </button>

          <button
            id="btn-remove-pullout"
            onClick={onOpenRemoveModal}
            disabled={tickets.length === 0}
            className={`px-3.5 py-2 text-xs font-semibold rounded-lg border transition-all flex items-center space-x-1.5 ${
              tickets.length === 0
                ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                : 'text-rose-700 bg-rose-50 hover:bg-rose-100/80 border-rose-200 cursor-pointer'
            }`}
          >
            <Trash2 className="w-4 h-4" />
            <span>Remove Pull Out</span>
          </button>

          <button
            onClick={onNavigateToInventory}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition-colors"
          >
            ← View Inventory
          </button>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block">
              Total Pull Out Tickets
            </span>
            <span className="text-2xl font-bold text-slate-900 mt-1 block">
              {tickets.length}
            </span>
            <span className="text-[11px] text-slate-400">Logged dispatch slips</span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-teal-50 text-teal-700 border border-teal-200 flex items-center justify-center">
            <FileText className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-700 block">
              Total Units Dispatched
            </span>
            <span className="text-2xl font-bold text-blue-900 mt-1 block">
              {totalDispatchedUnits.toLocaleString()}
            </span>
            <span className="text-[11px] text-blue-600/80">Deployed to project sites</span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center">
            <Package className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-600 block">
              Active Projects Receiving
            </span>
            <span className="text-2xl font-bold text-slate-900 mt-1 block">
              {new Set(tickets.map((t) => t.projectId)).size}
            </span>
            <span className="text-[11px] text-slate-400">Destination construction sites</span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
            <Building2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter / Search Bar if tickets exist */}
      {tickets.length > 0 && (
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by ticket #, project, item, requester..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <span className="text-xs text-slate-500 font-medium whitespace-nowrap">Filter Project:</span>
            <select
              value={selectedProjectFilter}
              onChange={(e) => setSelectedProjectFilter(e.target.value)}
              className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="all">All Destination Projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.id})
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Main Section: Recent Pull Out Tickets */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center space-x-2">
            <FileText className="w-4 h-4 text-teal-600" />
            <span>Recent Pull Out Tickets ({filteredTickets.length})</span>
          </h3>
          <span className="text-xs text-slate-500">
            {tickets.length === 0 ? 'Walang active pull out records' : 'All dispatched requisitions'}
          </span>
        </div>

        {tickets.length === 0 ? (
          <div className="p-12 text-center space-y-4">
            <div className="w-14 h-14 bg-teal-50 text-teal-600 border border-teal-200 rounded-2xl mx-auto flex items-center justify-center">
              <ShoppingBag className="w-7 h-7" />
            </div>
            <div className="max-w-md mx-auto space-y-1">
              <h4 className="text-base font-bold text-slate-900">Walang Pull Out Records</h4>
              <p className="text-xs text-slate-500">
                Lahat ng sample pull out tickets ay nabura na. I-click ang <strong>"Add Pull Out"</strong> upang mag-dispatch ng gamit patungo sa project site.
              </p>
            </div>
            <div className="pt-2 flex items-center justify-center gap-3">
              <button
                onClick={onOpenAddModal}
                className="inline-flex items-center space-x-2 px-5 py-2.5 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-sm hover:shadow transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Create First Pull Out Ticket</span>
              </button>
            </div>
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className="p-8 text-center text-slate-500 space-y-2">
            <p className="font-semibold text-sm">No pull out tickets matched your search filter.</p>
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedProjectFilter('all');
              }}
              className="text-xs text-teal-600 font-semibold hover:underline"
            >
              Reset filters
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {filteredTickets.map((ticket) => {
              const isExpanded = expandedTicketId === ticket.id;
              const totalItemsInTicket = ticket.items.reduce(
                (sum, item) => sum + item.quantity,
                0
              );

              return (
                <div key={ticket.id} className="transition-colors hover:bg-slate-50/60">
                  {/* Ticket Summary Row */}
                  <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono font-bold text-xs px-2.5 py-1 rounded-md bg-slate-900 text-white">
                          {ticket.id}
                        </span>
                        <div className="flex items-center space-x-1.5 text-slate-900 font-bold text-sm">
                          <Building2 className="w-4 h-4 text-teal-600" />
                          <span>{ticket.projectName}</span>
                          <span className="font-mono text-xs text-slate-400 font-normal">
                            ({ticket.projectId})
                          </span>
                        </div>
                      </div>

                      <div className="text-xs text-slate-500 flex flex-wrap items-center gap-x-4 gap-y-1">
                        <span className="flex items-center space-x-1">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span>
                            Req by: <strong className="text-slate-700">{ticket.requestedBy}</strong>
                          </span>
                        </span>
                        <span className="flex items-center space-x-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>Date: <strong>{ticket.date}</strong></span>
                        </span>
                        <span className="flex items-center space-x-1">
                          <Package className="w-3.5 h-3.5 text-teal-600" />
                          <span className="text-teal-800 font-semibold">
                            {totalItemsInTicket} units ({ticket.items.length} item {ticket.items.length > 1 ? 'lines' : 'line'})
                          </span>
                        </span>
                      </div>

                      {ticket.notes && (
                        <p className="text-xs text-slate-500 italic mt-1">
                          "{ticket.notes}"
                        </p>
                      )}
                    </div>

                    {/* Actions on row */}
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setTicketToPrint(ticket)}
                        className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors flex items-center space-x-1"
                        title="View slip summary"
                      >
                        <Printer className="w-3.5 h-3.5 text-slate-500" />
                        <span>View Slip</span>
                      </button>

                      <button
                        type="button"
                        id={`btn-download-pdf-${ticket.id}`}
                        onClick={() => handleDownloadPDF(ticket)}
                        className="px-3 py-1.5 text-xs font-bold text-teal-800 bg-teal-50 hover:bg-teal-100/90 border border-teal-300 rounded-lg transition-all flex items-center space-x-1.5 shadow-2xs hover:shadow-xs cursor-pointer"
                        title="Download DSI Pull-Out Form as PDF"
                      >
                        <FileDown className="w-3.5 h-3.5 text-teal-700" />
                        <span>Download Pull Out Form</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => toggleExpand(ticket.id)}
                        className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition-colors flex items-center space-x-1 cursor-pointer"
                      >
                        <span>{isExpanded ? 'Hide Items' : 'View Items'}</span>
                        {isExpanded ? (
                          <ChevronUp className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5" />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => onDeleteTicket(ticket.id, true)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors ml-1"
                        title="Cancel & return stock to warehouse"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Expanded Items List Drawer */}
                  {isExpanded && (
                    <div className="px-5 pb-5 pt-1 animate-in fade-in duration-100">
                      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
                        <div className="bg-slate-100/90 px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-600 grid grid-cols-12 gap-2">
                          <div className="col-span-3">Asset ID</div>
                          <div className="col-span-5">Item Description</div>
                          <div className="col-span-2">Category</div>
                          <div className="col-span-2 text-right">Dispatched Qty</div>
                        </div>
                        <div className="divide-y divide-slate-100">
                          {ticket.items.map((line, idx) => (
                            <div
                              key={idx}
                              className="px-4 py-2.5 text-xs grid grid-cols-12 gap-2 items-center hover:bg-slate-50"
                            >
                              <div className="col-span-3 font-mono font-bold text-slate-700">
                                {line.assetId}
                              </div>
                              <div className="col-span-5 text-slate-900 font-medium truncate">
                                {line.description}
                              </div>
                              <div className="col-span-2 text-slate-500 text-[11px]">
                                {line.category}
                              </div>
                              <div className="col-span-2 text-right">
                                <span className="font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                                  {line.quantity} {line.unit}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* View Slip Modal */}
      {ticketToPrint && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
          onClick={(e) => {
            if (e.target === e.currentTarget) setTicketToPrint(null);
          }}
        >
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-5">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <span className="font-mono text-xs font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                  {ticketToPrint.id}
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-1">Material Pull Out Slip</h3>
              </div>
              <button
                onClick={() => setTicketToPrint(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 text-xs bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <div className="flex justify-between">
                <span className="text-slate-500">Destination Project:</span>
                <strong className="text-slate-900">{ticketToPrint.projectName} ({ticketToPrint.projectId})</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Date Dispatched:</span>
                <strong className="text-slate-900">{ticketToPrint.date}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Requested By:</span>
                <strong className="text-slate-900">{ticketToPrint.requestedBy}</strong>
              </div>
              {ticketToPrint.notes && (
                <div className="flex justify-between border-t pt-1.5">
                  <span className="text-slate-500">Remarks:</span>
                  <span className="text-slate-800 italic">{ticketToPrint.notes}</span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Dispatched Items ({ticketToPrint.items.length})
              </h4>
              <div className="border border-slate-200 rounded-lg divide-y text-xs">
                {ticketToPrint.items.map((it, i) => (
                  <div key={i} className="p-2.5 flex justify-between items-center">
                    <div>
                      <span className="font-mono font-semibold text-slate-700 mr-2">[{it.assetId}]</span>
                      <span className="text-slate-900 font-medium">{it.description}</span>
                    </div>
                    <span className="font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded">
                      {it.quantity} {it.unit}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => handleDownloadPDF(ticketToPrint)}
                className="px-4 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-sm hover:shadow transition-all flex items-center space-x-1.5 cursor-pointer"
              >
                <FileDown className="w-4 h-4" />
                <span>Download Pull Out Form (PDF)</span>
              </button>
              <button
                type="button"
                onClick={() => setTicketToPrint(null)}
                className="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Close Slip
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
