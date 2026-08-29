import React, { useState } from 'react';
import {
  X,
  Users,
  Plus,
  Trash2,
  Check,
  Edit2,
  DollarSign,
  Briefcase,
  RotateCcw,
} from 'lucide-react';
import { ManpowerPositionRate } from '../types';
import { DEFAULT_MANPOWER_RATES } from '../data/defaultManpower';

interface ManageManpowerModalProps {
  isOpen: boolean;
  onClose: () => void;
  rates: ManpowerPositionRate[];
  onSaveRates: (newRates: ManpowerPositionRate[]) => void;
}

export const ManageManpowerModal: React.FC<ManageManpowerModalProps> = ({
  isOpen,
  onClose,
  rates,
  onSaveRates,
}) => {
  const [localRates, setLocalRates] = useState<ManpowerPositionRate[]>(rates);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tempRate, setTempRate] = useState<number | ''>('');

  // New Position form
  const [newRole, setNewRole] = useState('');
  const [newDailyRate, setNewDailyRate] = useState<number | ''>('');
  const [newDesc, setNewDesc] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Keep localRates in sync when opening modal
  React.useEffect(() => {
    if (isOpen) {
      setLocalRates(rates);
      setEditingId(null);
      setShowAddForm(false);
      setErrorMsg('');
    }
  }, [isOpen, rates]);

  if (!isOpen) return null;

  const startEdit = (item: ManpowerPositionRate) => {
    setEditingId(item.id);
    setTempRate(item.dailyRate);
  };

  const saveEdit = (id: string) => {
    if (tempRate === '' || Number(tempRate) < 0) return;
    const updated = localRates.map((r) =>
      r.id === id ? { ...r, dailyRate: Number(tempRate) } : r
    );
    setLocalRates(updated);
    onSaveRates(updated);
    setEditingId(null);
  };

  const handleDeletePosition = (id: string) => {
    const updated = localRates.filter((r) => r.id !== id);
    setLocalRates(updated);
    onSaveRates(updated);
  };

  const handleAddNewPosition = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRole.trim()) {
      setErrorMsg('Please enter a role / position name.');
      return;
    }
    if (newDailyRate === '' || Number(newDailyRate) <= 0) {
      setErrorMsg('Please specify a valid daily salary rate (PHP).');
      return;
    }

    const created: ManpowerPositionRate = {
      id: `rate-${Date.now()}`,
      role: newRole.trim(),
      dailyRate: Number(newDailyRate),
      description: newDesc.trim() || undefined,
      isDefault: false,
    };

    const updated = [...localRates, created];
    setLocalRates(updated);
    onSaveRates(updated);

    // Reset form
    setNewRole('');
    setNewDailyRate('');
    setNewDesc('');
    setShowAddForm(false);
    setErrorMsg('');
  };

  const handleResetDefaults = () => {
    if (window.confirm('Reset all manpower daily rates to default standards?')) {
      setLocalRates(DEFAULT_MANPOWER_RATES);
      onSaveRates(DEFAULT_MANPOWER_RATES);
    }
  };

  return (
    <div
      id="manage-manpower-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="manage-manpower-modal-card"
        className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Modal Header */}
        <div className="bg-slate-900 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-teal-500/20 text-teal-400 border border-teal-500/30">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">
                Manpower Positions & Daily Salary Rates
              </h2>
              <p className="text-xs text-slate-400">
                I-set ang rate per day (₱) para sa Foreman, Installer, Labor, Engineer, atbp.
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
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Action Top Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <div>
              <span className="text-xs font-bold text-slate-800 block">
                Standard Daily Labor Rates ({localRates.length} Positions)
              </span>
              <span className="text-[11px] text-slate-500">
                Gagamitin ito bilang auto-fill sa tuwing magde-deploy ng tao.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowAddForm(!showAddForm)}
                className="px-3 py-1.5 text-xs font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-lg transition-colors flex items-center space-x-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{showAddForm ? 'Cancel Add' : 'Add Position'}</span>
              </button>

              <button
                type="button"
                onClick={handleResetDefaults}
                className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-200 rounded-lg border border-slate-200 transition-colors"
                title="Reset to default rates"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Add Custom Position Inline Form */}
          {showAddForm && (
            <form
              onSubmit={handleAddNewPosition}
              className="p-4 bg-teal-50/50 border border-teal-200 rounded-xl space-y-3 animate-in fade-in"
            >
              <div className="text-xs font-bold uppercase tracking-wider text-teal-900 flex items-center space-x-1.5">
                <Briefcase className="w-3.5 h-3.5" />
                <span>Magdagdag ng Bagong Manpower Position</span>
              </div>

              {errorMsg && (
                <div className="p-2 text-xs bg-rose-50 text-rose-700 border border-rose-200 rounded-md">
                  {errorMsg}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Position / Role Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Master Electrician, Welder, Painter"
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Salary / Daily Rate (₱ per day) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                      ₱
                    </span>
                    <input
                      type="number"
                      required
                      min="0"
                      step="1"
                      placeholder="e.g. 900"
                      value={newDailyRate}
                      onChange={(e) =>
                        setNewDailyRate(e.target.value === '' ? '' : Number(e.target.value))
                      }
                      className="w-full pl-7 pr-3 py-2 text-xs font-semibold bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Description / Role Scope (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Specialized wiring, conduit bending and panel termination"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-xs cursor-pointer"
                >
                  Save Position
                </button>
              </div>
            </form>
          )}

          {/* Rates List Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden bg-white divide-y divide-slate-100">
            <div className="bg-slate-100 px-4 py-2.5 text-[11px] font-bold text-slate-600 grid grid-cols-12 gap-2 uppercase tracking-wider">
              <div className="col-span-4">Position / Role</div>
              <div className="col-span-4">Description / Scope</div>
              <div className="col-span-3 text-right">Daily Rate (₱/day)</div>
              <div className="col-span-1 text-center">Action</div>
            </div>

            {localRates.map((pos) => {
              const isEditing = editingId === pos.id;

              return (
                <div
                  key={pos.id}
                  className="px-4 py-3 grid grid-cols-12 gap-2 items-center hover:bg-slate-50/80 transition-colors text-xs"
                >
                  {/* Role Name */}
                  <div className="col-span-4 font-bold text-slate-900 flex items-center space-x-2">
                    <span className="w-2 h-2 rounded-full bg-teal-500" />
                    <span>{pos.role}</span>
                  </div>

                  {/* Description */}
                  <div className="col-span-4 text-slate-500 text-[11px] truncate">
                    {pos.description || 'Standard site position'}
                  </div>

                  {/* Daily Rate */}
                  <div className="col-span-3 text-right">
                    {isEditing ? (
                      <div className="flex items-center justify-end space-x-1">
                        <span className="text-xs font-bold text-slate-400">₱</span>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={tempRate}
                          onChange={(e) =>
                            setTempRate(e.target.value === '' ? '' : Number(e.target.value))
                          }
                          className="w-24 px-2 py-1 text-xs font-bold text-right bg-white border border-teal-500 rounded focus:outline-none"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveEdit(pos.id);
                            if (e.key === 'Escape') setEditingId(null);
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => saveEdit(pos.id)}
                          className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                          title="Save"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <span className="font-extrabold text-teal-900 bg-teal-50 px-2.5 py-1 rounded-md border border-teal-200">
                        ₱{pos.dailyRate.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                        <span className="text-[10px] text-teal-600 font-normal"> / day</span>
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="col-span-1 flex items-center justify-center space-x-1">
                    {!isEditing ? (
                      <button
                        type="button"
                        onClick={() => startEdit(pos)}
                        className="p-1 text-slate-400 hover:text-teal-700 hover:bg-teal-50 rounded transition-colors"
                        title="Edit Salary Rate"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="p-1 text-slate-400 hover:text-slate-600 rounded"
                        title="Cancel"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {!pos.isDefault && (
                      <button
                        type="button"
                        onClick={() => handleDeletePosition(pos.id)}
                        className="p-1 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                        title="Delete custom position"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Ang mga salary rates na ito ay awtomatikong maglo-load sa <strong>Add Deployment</strong> form.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
