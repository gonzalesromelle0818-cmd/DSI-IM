import React, { useState } from 'react';
import { X, Trash2, AlertTriangle, FileText, CheckSquare, Square, Search, RefreshCw, RotateCcw } from 'lucide-react';
import { RetrieveTicket } from '../types';

interface RemoveRetrieveModalProps {
  isOpen: boolean;
  onClose: () => void;
  tickets: RetrieveTicket[];
  onDeleteTicket: (ticketId: string, rollbackStock: boolean) => void;
  onDeleteMultipleTickets: (ticketIds: string[], rollbackStock: boolean) => void;
}

export const RemoveRetrieveModal: React.FC<RemoveRetrieveModalProps> = ({
  isOpen,
  onClose,
  tickets,
  onDeleteTicket,
  onDeleteMultipleTickets,
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [rollbackStock, setRollbackStock] = useState(true);
  const [ticketToDelete, setTicketToDelete] = useState<RetrieveTicket | null>(null);

  if (!isOpen) return null;

  const filteredTickets = tickets.filter((t) => {
    const q = searchTerm.toLowerCase();
    return (
      t.id.toLowerCase().includes(q) ||
      t.projectName.toLowerCase().includes(q) ||
      t.retrievedBy.toLowerCase().includes(q) ||
      t.date.includes(q)
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
      onDeleteTicket(ticketToDelete.id, rollbackStock);
      setTicketToDelete(null);
      setSelectedIds((prev) => prev.filter((id) => id !== ticketToDelete.id));
    }
  };

  const executeBulkDelete = () => {
    if (selectedIds.length === 0) return;
    onDeleteMultipleTickets(selectedIds, rollbackStock);
    setSelectedIds([]);
    onClose();
  };

  return (
    <div
      id="remove-retrieve-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="remove-retrieve-modal-card"
        className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Modal Header */}
        <div className="bg-slate-900 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Remove Retrieve Slip Record</h3>
              <p className="text-xs text-slate-400">
                Pumili ng mga Retrieve Ticket na nais alisin sa rekord ng system.
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

        {/* Content Body */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* Rollback Option Toggle */}
          <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl flex items-start space-x-3 text-xs text-amber-900">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1.5 flex-1">
              <div className="font-bold text-amber-950">Rollback Warehouse Inventory Stock?</div>
              <label className="flex items-center space-x-2 font-medium cursor-pointer text-slate-800">
                <input
                  type="checkbox"
                  checked={rollbackStock}
                  onChange={(e) => setRollbackStock(e.target.checked)}
                  className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 w-4 h-4 cursor-pointer"
                />
                <span>
                  Ibawas muli sa bodega ang mga dating naibalik na materyales (Revert restored stock quantities).
                </span>
              </label>
            </div>
          </div>

          {/* Search bar & Select All */}
          <div className="flex items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search ticket #, project, personnel..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            {filteredTickets.length > 0 && (
              <button
                type="button"
                onClick={handleSelectAll}
                className="px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-200 flex items-center space-x-1.5 transition-colors cursor-pointer shrink-0"
              >
                {selectedIds.length === filteredTickets.length ? (
                  <CheckSquare className="w-3.5 h-3.5 text-teal-600" />
                ) : (
                  <Square className="w-3.5 h-3.5 text-slate-400" />
                )}
                <span>Select All ({filteredTickets.length})</span>
              </button>
            )}
          </div>

          {/* Tickets List */}
          {tickets.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-xs bg-slate-50 rounded-xl border border-dashed border-slate-200">
              Walang naka-rekord na Retrieve Tickets sa kasalukuyan.
            </div>
          ) : filteredTickets.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-xs bg-slate-50 rounded-xl border border-dashed border-slate-200">
              Walang tumugma sa iyong hinahanap na ticket.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden max-h-72 overflow-y-auto">
              {filteredTickets.map((ticket) => {
                const isSelected = selectedIds.includes(ticket.id);
                const itemCount = ticket.items.reduce((s, i) => s + i.quantity, 0);

                return (
                  <div
                    key={ticket.id}
                    className={`p-3.5 flex items-center justify-between transition-colors ${
                      isSelected ? 'bg-rose-50/70' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <button
                        type="button"
                        onClick={() => handleToggleSelect(ticket.id)}
                        className="text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-rose-600" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-400" />
                        )}
                      </button>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-xs font-bold text-teal-800">
                            {ticket.id}
                          </span>
                          <span className="text-xs font-semibold text-slate-900">
                            {ticket.projectName}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {ticket.date} • Retrieved by: {ticket.retrievedBy} • {itemCount} units returned
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setTicketToDelete(ticket)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-100 rounded-lg transition-colors cursor-pointer"
                      title="Delete this ticket"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Confirm Single Delete Sub-Dialog */}
          {ticketToDelete && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-3 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-start space-x-2 text-rose-900 text-xs">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Kumpirmahin ang pagbura sa Retrieve Ticket {ticketToDelete.id}?</span>
                  <p className="text-[11px] text-rose-700 mt-0.5">
                    Ang tiket na ito para sa <strong>{ticketToDelete.projectName}</strong> ay permanenteng aalisin.
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setTicketToDelete(null)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Kanselahin
                </button>
                <button
                  type="button"
                  onClick={executeSingleDelete}
                  className="px-3 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs transition-colors cursor-pointer"
                >
                  Burahin ang Ticket
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500 font-medium">
            {selectedIds.length > 0 ? (
              <span className="text-rose-600 font-semibold">{selectedIds.length} napiling ticket para burahin</span>
            ) : (
              <span>Pumili ng ticket o pindutin ang trash icon.</span>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Isara
            </button>
            {selectedIds.length > 0 && (
              <button
                type="button"
                onClick={executeBulkDelete}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition-all flex items-center space-x-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Selected ({selectedIds.length})</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
