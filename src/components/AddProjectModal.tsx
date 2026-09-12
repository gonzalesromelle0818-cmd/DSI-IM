import React, { useState } from 'react';
import { X, FolderPlus, Building2, MapPin, User, FileText, Sparkles, Plus, Trash2, LayoutGrid, CheckSquare, Layers } from 'lucide-react';
import { Project, WindowDoorItem } from '../types';
import { getInitialProjectChecklist } from '../utils/projectMilestones';

interface AddProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddProject: (project: Project) => void;
  existingProjects: Project[];
}

export const AddProjectModal: React.FC<AddProjectModalProps> = ({
  isOpen,
  onClose,
  onAddProject,
  existingProjects,
}) => {
  const generateProjectId = () => {
    const nextNum = existingProjects.length + 1;
    return `PRJ-${String(nextNum).padStart(3, '0')}`;
  };

  const [name, setName] = useState('');
  const [projectId, setProjectId] = useState(() => generateProjectId());
  const [location, setLocation] = useState('');
  const [leadPerson, setLeadPerson] = useState('');
  const [projectManager, setProjectManager] = useState('');
  const [status, setStatus] = useState<'Active' | 'For Turn over/Cleaning' | 'Completed' | 'On Hold'>('Active');
  const [budget, setBudget] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [windowsDoors, setWindowsDoors] = useState<WindowDoorItem[]>([]);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  if (!isOpen) return null;

  const handleAutoGenerateId = () => {
    setProjectId(generateProjectId());
  };

  const handleAddWindowDoor = (defaultType: 'Window' | 'Door' = 'Window') => {
    const count = windowsDoors.length + 1;
    const prefix = defaultType === 'Window' ? 'W' : 'D';
    const newItem: WindowDoorItem = {
      id: `WD-${Date.now()}-${count}`,
      tag: `${prefix}-${count}`,
      type: defaultType,
      qty: 1,
      height: '2100',
      width: defaultType === 'Window' ? '1800' : '900',
      unit: 'mm',
      location: '',
      remarks: '',
      isInstalled: false,
      installedQty: 0,
    };
    setWindowsDoors((prev) => [...prev, newItem]);
  };

  const handleUpdateWindowDoor = (index: number, field: keyof WindowDoorItem, value: any) => {
    setWindowsDoors((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleRemoveWindowDoor = (index: number) => {
    setWindowsDoors((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs: { [key: string]: string } = {};

    if (!name.trim()) {
      errs.name = 'Project name is required.';
    }
    if (!projectId.trim()) {
      errs.projectId = 'Project ID / Code is required.';
    } else if (
      existingProjects.some(
        (p) => p.id.toLowerCase() === projectId.trim().toLowerCase()
      )
    ) {
      errs.projectId = 'This Project ID already exists. Use a unique code.';
    }

    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    const initialChecklist = getInitialProjectChecklist();

    const newProject: Project = {
      id: projectId.trim().toUpperCase(),
      name: name.trim(),
      location: location.trim() || undefined,
      leadPerson: leadPerson.trim() || undefined,
      projectManager: projectManager.trim() || undefined,
      status,
      budget: budget ? parseFloat(budget) || undefined : undefined,
      notes: notes.trim() || undefined,
      windowsDoors: windowsDoors.length > 0 ? windowsDoors : undefined,
      checklist: initialChecklist,
      createdAt: new Date().toISOString().slice(0, 10),
    };

    onAddProject(newProject);
    onClose();

    // Reset form
    setName('');
    setLocation('');
    setLeadPerson('');
    setProjectManager('');
    setStatus('Active');
    setBudget('');
    setNotes('');
    setWindowsDoors([]);
    setErrors({});
  };

  const totalWindowDoorUnits = windowsDoors.reduce((acc, curr) => acc + (Number(curr.qty) || 0), 0);

  return (
    <div
      id="add-project-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="add-project-modal-card"
        className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] my-4"
      >
        {/* Modal Header */}
        <div className="bg-slate-900 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-teal-500/20 text-teal-400 border border-teal-500/30">
              <FolderPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">Add New Project</h2>
              <p className="text-xs text-slate-400">Register project details, windows & doors schedule, and 100% milestone checklist</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body / Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5">
          {/* General Project Info */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
            {/* Project Name */}
            <div className="sm:col-span-8">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Project Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (errors.name) setErrors((prev) => ({ ...prev, name: '' }));
                }}
                placeholder="e.g. Lumiere Residences Tower 2"
                className={`w-full px-3.5 py-2 text-sm bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                  errors.name ? 'border-red-500 bg-red-50/20' : 'border-slate-300'
                }`}
              />
              {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name}</p>}
            </div>

            {/* Project Code / ID */}
            <div className="sm:col-span-4">
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Code / ID <span className="text-red-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={handleAutoGenerateId}
                  className="text-[11px] text-teal-600 hover:text-teal-800 flex items-center space-x-1 font-medium cursor-pointer"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Auto-ID</span>
                </button>
              </div>
              <input
                type="text"
                value={projectId}
                onChange={(e) => {
                  setProjectId(e.target.value);
                  if (errors.projectId) setErrors((prev) => ({ ...prev, projectId: '' }));
                }}
                placeholder="e.g. PRJ-001"
                className={`w-full px-3.5 py-2 text-sm font-mono uppercase bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                  errors.projectId ? 'border-red-500 bg-red-50/20' : 'border-slate-300'
                }`}
              />
              {errors.projectId && <p className="text-xs text-red-600 mt-1">{errors.projectId}</p>}
            </div>
          </div>

          {/* Location, In-Charge, Project Manager, Status & Budget */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Site Location
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Pasig City"
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Project In-Charge
              </label>
              <input
                type="text"
                value={leadPerson}
                onChange={(e) => setLeadPerson(e.target.value)}
                placeholder="e.g. Engr. Santos / Site In-Charge"
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Project Manager
              </label>
              <input
                type="text"
                value={projectManager}
                onChange={(e) => setProjectManager(e.target.value)}
                placeholder="e.g. Engr. Roberto Santos"
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Project Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
              >
                <option value="Active">Active (Ongoing)</option>
                <option value="For Turn over/Cleaning">For Turn over/Cleaning</option>
                <option value="On Hold">On Hold</option>
                <option value="Completed">Completed</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Budget / Contract (₱)
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                placeholder="e.g. 500000"
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          {/* DYNAMIC WINDOWS & DOORS SCHEDULE SECTION */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 rounded-md bg-teal-100 text-teal-800">
                  <LayoutGrid className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Windows & Doors Schedule ({totalWindowDoorUnits} Total Units)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Specify window/door types, quantities, and dimensions for fabrication & milestone monitoring.
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => handleAddWindowDoor('Window')}
                  className="px-2.5 py-1.5 text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-colors flex items-center space-x-1 cursor-pointer shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Add Window</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleAddWindowDoor('Door')}
                  className="px-2.5 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center space-x-1 cursor-pointer shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Add Door</span>
                </button>
              </div>
            </div>

            {windowsDoors.length === 0 ? (
              <div className="p-5 text-center bg-white rounded-lg border border-dashed border-slate-300 text-slate-400">
                <Layers className="w-7 h-7 mx-auto text-slate-300 mb-1" />
                <p className="text-xs font-medium text-slate-600">No windows or doors added yet.</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Click the <strong>"+ Add Window"</strong> or <strong>"+ Add Door"</strong> button above to include dimension schedules.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                {windowsDoors.map((item, idx) => (
                  <div
                    key={item.id || idx}
                    className="p-3 bg-white rounded-lg border border-slate-200 shadow-2xs grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center text-xs"
                  >
                    {/* Tag / Code */}
                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase">Tag / Code</label>
                      <input
                        type="text"
                        value={item.tag}
                        onChange={(e) => handleUpdateWindowDoor(idx, 'tag', e.target.value)}
                        placeholder="e.g. W-1"
                        className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500"
                      />
                    </div>

                    {/* Type */}
                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase">Type</label>
                      <select
                        value={item.type}
                        onChange={(e) => handleUpdateWindowDoor(idx, 'type', e.target.value)}
                        className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500 cursor-pointer"
                      >
                        <option value="Window">Window</option>
                        <option value="Door">Door</option>
                        <option value="Curtain Wall">Curtain Wall</option>
                        <option value="Glass Partition">Partition</option>
                        <option value="Louvers">Louvers</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    {/* Quantity */}
                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase">Qty (Units)</label>
                      <input
                        type="number"
                        min="1"
                        value={item.qty}
                        onChange={(e) => handleUpdateWindowDoor(idx, 'qty', Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded font-bold text-teal-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500"
                      />
                    </div>

                    {/* Height */}
                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase">Height (mm)</label>
                      <input
                        type="text"
                        value={item.height}
                        onChange={(e) => handleUpdateWindowDoor(idx, 'height', e.target.value)}
                        placeholder="2100"
                        className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500"
                      />
                    </div>

                    {/* Width */}
                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase">Width (mm)</label>
                      <input
                        type="text"
                        value={item.width}
                        onChange={(e) => handleUpdateWindowDoor(idx, 'width', e.target.value)}
                        placeholder="1800"
                        className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500"
                      />
                    </div>

                    {/* Location / Remarks & Remove */}
                    <div className="sm:col-span-2 flex items-center space-x-1.5">
                      <div className="flex-1">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase">Location / Remarks</label>
                        <input
                          type="text"
                          value={item.location || ''}
                          onChange={(e) => handleUpdateWindowDoor(idx, 'location', e.target.value)}
                          placeholder="e.g. Master BR"
                          className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded text-slate-700 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500 text-[11px]"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveWindowDoor(idx)}
                        className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded mt-3.5 transition-colors cursor-pointer"
                        title="Remove this window/door"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Notes / Scope of Work
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Aluminum sliding windows, powder coated black, 6mm clear tempered glass..."
              className="w-full px-3.5 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
            />
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            <div className="text-xs text-slate-500 flex items-center space-x-1.5">
              <CheckSquare className="w-4 h-4 text-teal-600" />
              <span>Auto-attaches 14-point progress checklist (100% milestone monitoring)</span>
            </div>

            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-sm hover:shadow transition-all flex items-center space-x-1.5 cursor-pointer"
              >
                <FolderPlus className="w-4 h-4" />
                <span>Save Project</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

