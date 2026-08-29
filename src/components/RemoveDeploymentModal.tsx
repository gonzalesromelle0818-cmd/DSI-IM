import React, { useState } from 'react';
import {
  X,
  Trash2,
  AlertTriangle,
  FileText,
  CheckSquare,
  Square,
  Search,
  Users,
} from 'lucide-react';
import { DeploymentTicket } from '../types';
import { formatCurrency, getTotalHeadcount } from '../utils/deploymentHelpers';

interface RemoveDeploymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  tickets: DeploymentTicket[];
  onDeleteTicket: (ticketId: string) => void;
  onDeleteMultipleTickets: (ticketIds: string[]) => void;
}

export const RemoveDeploymentModal: React.FC<RemoveDeploymentModalProps> = ({
  isOpen,
  onClose,
  tickets,
  onDeleteTicket,
  onDeleteMultipleTickets,
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [ticketToDelete, setTicketToDelete] = useState<DeploymentTicket | null>(null);

  if (!isOpen) return null;

  const filteredTickets = tickets.filter((t) => {
    const q = searchTerm.toLowerCase();
    return (
      t.id.toLowerCase().includes(q) ||
      t.projectName.toLowerCase().includes(q) ||
      (t.leadSupervisor && t.leadSupervisor.toLowerCase().includes(q)) ||
      (t.requestedBy && t.requestedBy.toLowerCase().includes(q)) ||
      t.deploymentDate.includes(q)
    );
  });

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === filteredTickets.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredTickets.map((t) => t.id));
    }
  };

  const executeSingleDelete = () => {
    if (ticketToDelete) {
      onDeleteTicket(ticketToDelete.id);
      setTicketToDelete(null);
      setSelectedIds((prev) => prev.filter((id) => id !== ticketToDelete.id));
    }
  };

  const executeBulkDelete = () => {
    if (selectedIds.length === 0) return;
    onDeleteMultipleTickets(selectedIds);
    setSelectedIds([]);
    onClose();
  };

  return (
    <div
      id="remove-deployment-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="remove-deployment-modal-card"
        className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Modal Header */}
        <div className="bg-slate-900 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">
                Remove / Delete Deployment Ticket
              </h2>
              <p className="text-xs text-slate-400">
                Pumili ng deployment ticket na nais tanggalin sa database
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
        <div className="p-6 overflow-y-auto space-y-4">
          {tickets.length === 0 ? (
            <div className="py-12 text-center text-slate-500 space-y-2">
              <FileText className="w-10 h-10 mx-auto text-slate-300" />
              <p className="font-semibold text-slate-700">Walang Deployment Tickets</p>
              <p className="text-xs text-slate-400">Walang active deployment records na mabubura.</p>
            </div>
          ) : (
            <>
              {/* Search & Bulk Select bar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="relative w-full sm:w-72">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search ticket #, project, supervisor..."
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>

                <div className="flex items-center space-x-3 w-full sm:w-auto justify-between sm:justify-end">
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center space-x-1"
                  >
                    {selectedIds.length === filteredTickets.length && filteredTickets.length > 0 ? (
                      <CheckSquare className="w-4 h-4 text-teal-600" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-400" />
                    )}
                    <span>
                      Select All ({selectedIds.length}/{filteredTickets.length})
                    </span>
                  </button>

                  {selectedIds.length > 0 && (
                    <button
                      type="button"
                      onClick={executeBulkDelete}
                      className="px-3 py-1 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm transition-colors flex items-center space-x-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete Selected ({selectedIds.length})</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Tickets List */}
              <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 max-h-80 overflow-y-auto">
                {filteredTickets.map((ticket) => {
                  const isSelected = selectedIds.includes(ticket.id);
                  const totalHeads = getTotalHeadcount(ticket.lines);

                  return (
                    <div
                      key={ticket.id}
                      className={`p-3.5 flex items-center justify-between gap-3 transition-colors ${
                        isSelected ? 'bg-rose-50/50' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <button
                          type="button"
                          onClick={() => handleToggleSelect(ticket.id)}
                          className="text-slate-400 hover:text-slate-700 focus:outline-none"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-rose-600" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-mono text-[11px] font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                              {ticket.id}
                            </span>
                            <span className="text-xs font-bold text-slate-900">
                              {ticket.projectName}
                            </span>
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                            <span>
                              Lead: <strong>{ticket.leadSupervisor || 'N/A'}</strong>
                            </span>
                            <span>• Date: {ticket.deploymentDate}</span>
                            <span>• <strong>{totalHeads} Heads</strong></span>
                            <span className="font-bold text-emerald-700">
                              • Total: {formatCurrency(ticket.totalCost)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setTicketToDelete(ticket)}
                        className="px-2.5 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100/70 border border-rose-200 rounded-md transition-colors cursor-pointer"
                      >
                        Delete
                      </button>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* Delete Single Confirmation Box */}
          {ticketToDelete && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-3 animate-in fade-in">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-rose-900">
                  <p className="font-bold text-sm">
                    Delete Deployment Ticket "{ticketToDelete.id}"?
                  </p>
                  <p className="mt-1">
                    Destination: <strong>{ticketToDelete.projectName}</strong> | Deployed Date:{' '}
                    <strong>{ticketToDelete.deploymentDate}</strong> ({ticketToDelete.daysCount} days)
                  </p>
                  <p className="mt-1 text-rose-800">
                    Total Cost recorded: <strong>{formatCurrency(ticketToDelete.totalCost)}</strong>
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setTicketToDelete(null)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-white rounded-lg border border-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={executeSingleDelete}
                  className="px-3 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm cursor-pointer"
                >
                  Yes, Remove Ticket
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
