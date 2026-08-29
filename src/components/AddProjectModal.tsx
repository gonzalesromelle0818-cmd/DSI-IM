import React, { useState } from 'react';
import { X, FolderPlus, Building2, MapPin, User, FileText, Sparkles } from 'lucide-react';
import { Project } from '../types';

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
  const [status, setStatus] = useState<'Active' | 'Planning' | 'Completed' | 'On Hold'>('Active');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  if (!isOpen) return null;

  const handleAutoGenerateId = () => {
    setProjectId(generateProjectId());
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

    const newProject: Project = {
      id: projectId.trim().toUpperCase(),
      name: name.trim(),
      location: location.trim() || undefined,
      leadPerson: leadPerson.trim() || undefined,
      status,
      notes: notes.trim() || undefined,
      createdAt: new Date().toISOString().slice(0, 10),
    };

    onAddProject(newProject);
    onClose();

    // Reset form
    setName('');
    setLocation('');
    setLeadPerson('');
    setStatus('Active');
    setNotes('');
    setErrors({});
  };

  return (
    <div
      id="add-project-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="add-project-modal-card"
        className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Modal Header */}
        <div className="bg-slate-900 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-teal-500/20 text-teal-400 border border-teal-500/30">
              <FolderPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">Add New Project</h2>
              <p className="text-xs text-slate-400">Register a new site project for material pull-outs</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body / Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
          {/* Project Name */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Project Name <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (errors.name) setErrors((prev) => ({ ...prev, name: '' }));
                }}
                placeholder="e.g. Lumiere Residences Tower 2"
                className={`w-full px-3.5 py-2.5 text-sm bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                  errors.name ? 'border-red-500 bg-red-50/20' : 'border-slate-300'
                }`}
              />
            </div>
            {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name}</p>}
          </div>

          {/* Project Code / ID */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Project Code / ID <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={handleAutoGenerateId}
                className="text-[11px] text-teal-600 hover:text-teal-800 flex items-center space-x-1 font-medium"
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

          {/* Location & Site In-Charge */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Site Location
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Pasig City, Metro Manila"
                  className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Project Engineer / Lead
              </label>
              <input
                type="text"
                value={leadPerson}
                onChange={(e) => setLeadPerson(e.target.value)}
                placeholder="e.g. Engr. Santos"
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          {/* Project Status */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Project Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="Active">Active (Ongoing Site)</option>
              <option value="Planning">Planning / Preparing</option>
              <option value="On Hold">On Hold</option>
              <option value="Completed">Completed</option>
            </select>
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
              placeholder="e.g. Electrical fit-out, MEP works, duration: 6 months"
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
            />
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-sm font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-sm hover:shadow transition-all flex items-center space-x-1.5"
            >
              <FolderPlus className="w-4 h-4" />
              <span>Save Project</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
