import React, { useState } from 'react';
import {
  X,
  Trash2,
  AlertTriangle,
  Building2,
  CheckSquare,
  Square,
  Search,
  Lock,
  Eye,
  EyeOff,
  ShieldAlert,
} from 'lucide-react';
import { Project, InventoryItem } from '../types';

interface RemoveProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects: Project[];
  items: InventoryItem[];
  onDeleteProject: (projectId: string) => void;
  onDeleteMultipleProjects: (projectIds: string[]) => void;
}

const REQUIRED_DELETE_PASSWORD = 'aerith0818';

export const RemoveProjectModal: React.FC<RemoveProjectModalProps> = ({
  isOpen,
  onClose,
  projects,
  items,
  onDeleteProject,
  onDeleteMultipleProjects,
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [isBulkDeleteConfirm, setIsBulkDeleteConfirm] = useState(false);

  // Security password state
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  if (!isOpen) return null;

  const filteredProjects = projects.filter((p) => {
    const q = searchTerm.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.id.toLowerCase().includes(q) ||
      (p.location && p.location.toLowerCase().includes(q))
    );
  });

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === filteredProjects.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredProjects.map((p) => p.id));
    }
  };

  const getActiveAllocationsCount = (projectId: string) => {
    let count = 0;
    items.forEach((item) => {
      if (item.projectAllocations) {
        item.projectAllocations.forEach((alloc) => {
          if (
            alloc.projectId?.toLowerCase() === projectId.toLowerCase() ||
            alloc.projectName?.toLowerCase() === projectId.toLowerCase()
          ) {
            count += alloc.quantity;
          }
        });
      }
    });
    return count;
  };

  const resetPasswordState = () => {
    setPasswordInput('');
    setPasswordError('');
    setShowPassword(false);
  };

  const handleStartSingleDelete = (project: Project) => {
    resetPasswordState();
    setIsBulkDeleteConfirm(false);
    setProjectToDelete(project);
  };

  const handleStartBulkDelete = () => {
    if (selectedIds.length === 0) return;
    resetPasswordState();
    setProjectToDelete(null);
    setIsBulkDeleteConfirm(true);
  };

  const cancelDeleteConfirm = () => {
    setProjectToDelete(null);
    setIsBulkDeleteConfirm(false);
    resetPasswordState();
  };

  const executeSingleDelete = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput !== REQUIRED_DELETE_PASSWORD) {
      setPasswordError('Maling password! Ilagay ang tamang security password para ma-delete ang project.');
      return;
    }

    if (projectToDelete) {
      onDeleteProject(projectToDelete.id);
      setSelectedIds((prev) => prev.filter((id) => id !== projectToDelete.id));
      cancelDeleteConfirm();
    }
  };

  const executeBulkDelete = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput !== REQUIRED_DELETE_PASSWORD) {
      setPasswordError('Maling password! Ilagay ang tamang security password para ma-delete ang projects.');
      return;
    }

    if (selectedIds.length > 0) {
      onDeleteMultipleProjects(selectedIds);
      setSelectedIds([]);
      cancelDeleteConfirm();
      onClose();
    }
  };

  return (
    <div
      id="remove-project-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          cancelDeleteConfirm();
          onClose();
        }
      }}
    >
      <div
        id="remove-project-modal-card"
        className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Modal Header */}
        <div className="bg-slate-900 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">Remove / Delete Projects</h2>
              <p className="text-xs text-slate-400">
                Ligtas na magbura ng project record (Nangangailangan ng Admin Password)
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              cancelDeleteConfirm();
              onClose();
            }}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-4">
          {projects.length === 0 ? (
            <div className="py-12 text-center text-slate-500 space-y-2">
              <Building2 className="w-10 h-10 mx-auto text-slate-300" />
              <p className="font-semibold text-slate-700">No Projects to Remove</p>
              <p className="text-xs text-slate-400">There are currently no projects recorded in the system.</p>
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
                    placeholder="Search projects..."
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>

                <div className="flex items-center space-x-3 w-full sm:w-auto justify-between sm:justify-end">
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center space-x-1"
                  >
                    {selectedIds.length === filteredProjects.length && filteredProjects.length > 0 ? (
                      <CheckSquare className="w-4 h-4 text-teal-600" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-400" />
                    )}
                    <span>Select All ({selectedIds.length}/{filteredProjects.length})</span>
                  </button>

                  {selectedIds.length > 0 && (
                    <button
                      type="button"
                      onClick={handleStartBulkDelete}
                      className="px-3 py-1 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm transition-colors flex items-center space-x-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete Selected ({selectedIds.length})</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Projects List */}
              <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 max-h-80 overflow-y-auto">
                {filteredProjects.map((project) => {
                  const isSelected = selectedIds.includes(project.id);
                  const activeAllocations = getActiveAllocationsCount(project.id);

                  return (
                    <div
                      key={project.id}
                      className={`p-3.5 flex items-center justify-between gap-3 transition-colors ${
                        isSelected ? 'bg-rose-50/50' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <button
                          type="button"
                          onClick={() => handleToggleSelect(project.id)}
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
                              {project.id}
                            </span>
                            <span className="text-sm font-bold text-slate-900">{project.name}</span>
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5 flex items-center space-x-3">
                            {project.location && <span>{project.location}</span>}
                            {project.leadPerson && <span>• In-Charge: {project.leadPerson}</span>}
                            {project.projectManager && <span>• PM: {project.projectManager}</span>}
                            {activeAllocations > 0 && (
                              <span className="text-amber-700 font-semibold bg-amber-50 px-1.5 py-0.5 rounded">
                                {activeAllocations} units deployed
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleStartSingleDelete(project)}
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

          {/* Single Delete Confirmation with Password Required */}
          {projectToDelete && (
            <form
              onSubmit={executeSingleDelete}
              className="p-4 bg-rose-50/90 border border-rose-200 rounded-xl space-y-3 animate-in fade-in"
            >
              <div className="flex items-start space-x-3">
                <ShieldAlert className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-rose-900 space-y-1">
                  <p className="font-bold text-sm">
                    Kumpirmahin ang Pag-delete sa "{projectToDelete.name}" ({projectToDelete.id})
                  </p>
                  <p className="text-slate-600">
                    Upang maiwasan ang aksidenteng pagbura, kailangan ilagay ang admin authorization password.
                  </p>
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-1.5 pt-1">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1">
                  <Lock className="w-3.5 h-3.5 text-rose-600" />
                  <span>Admin Password</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={passwordInput}
                    onChange={(e) => {
                      setPasswordInput(e.target.value);
                      if (passwordError) setPasswordError('');
                    }}
                    placeholder="Enter security password to confirm..."
                    autoFocus
                    className={`w-full pl-3 pr-10 py-2 text-xs bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 font-mono ${
                      passwordError ? 'border-red-500 bg-red-50/30' : 'border-slate-300'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {passwordError && (
                  <p className="text-xs text-red-600 font-semibold">{passwordError}</p>
                )}
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={cancelDeleteConfirm}
                  className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-white rounded-lg border border-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm flex items-center space-x-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Authorize & Delete Project</span>
                </button>
              </div>
            </form>
          )}

          {/* Bulk Delete Confirmation with Password Required */}
          {isBulkDeleteConfirm && (
            <form
              onSubmit={executeBulkDelete}
              className="p-4 bg-rose-50/90 border border-rose-200 rounded-xl space-y-3 animate-in fade-in"
            >
              <div className="flex items-start space-x-3">
                <ShieldAlert className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-rose-900 space-y-1">
                  <p className="font-bold text-sm">
                    Delete {selectedIds.length} Selected Project(s)?
                  </p>
                  <p className="text-slate-600">
                    Mabubura ang lahat ng napiling projects. Ilagay ang admin password para ituloy.
                  </p>
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-1.5 pt-1">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1">
                  <Lock className="w-3.5 h-3.5 text-rose-600" />
                  <span>Admin Password</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={passwordInput}
                    onChange={(e) => {
                      setPasswordInput(e.target.value);
                      if (passwordError) setPasswordError('');
                    }}
                    placeholder="Enter security password to confirm..."
                    autoFocus
                    className={`w-full pl-3 pr-10 py-2 text-xs bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 font-mono ${
                      passwordError ? 'border-red-500 bg-red-50/30' : 'border-slate-300'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {passwordError && (
                  <p className="text-xs text-red-600 font-semibold">{passwordError}</p>
                )}
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={cancelDeleteConfirm}
                  className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-white rounded-lg border border-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm flex items-center space-x-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Authorize & Delete All Selected</span>
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span className="flex items-center space-x-1">
            <Lock className="w-3.5 h-3.5 text-slate-400" />
            <span>Protected by Admin Password</span>
          </span>
          <button
            type="button"
            onClick={() => {
              cancelDeleteConfirm();
              onClose();
            }}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
