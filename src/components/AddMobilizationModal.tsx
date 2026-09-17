import React, { useState, useEffect } from 'react';
import {
  X,
  Truck,
  Building2,
  Calendar,
  DollarSign,
  AlertTriangle,
  FileText,
  UserCheck,
  CheckCircle2,
  PenTool,
  ShieldCheck,
  User,
  Plus,
} from 'lucide-react';
import { DeploymentTicket, Project } from '../types';
import { formatCurrency } from '../utils/deploymentHelpers';

interface AddMobilizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects: Project[];
  existingTickets: DeploymentTicket[];
  onAddMobilization: (ticket: DeploymentTicket) => void;
  onOpenAddProjectModal: () => void;
}

export const AddMobilizationModal: React.FC<AddMobilizationModalProps> = ({
  isOpen,
  onClose,
  projects,
  existingTickets,
  onAddMobilization,
  onOpenAddProjectModal,
}) => {
  // Ticket Meta
  const [projectId, setProjectId] = useState('');
  const [customProjectName, setCustomProjectName] = useState('');
  const [projectLocation, setProjectLocation] = useState('');
  const [deploymentDate, setDeploymentDate] = useState(
    () => new Date().toISOString().slice(0, 10)
  );
  const [daysCount, setDaysCount] = useState<number | ''>(1);

  // Mobilization Cost & Logistics Fields (same as original Section 3)
  const [mobilizationCost, setMobilizationCost] = useState<number | ''>('');
  const [mobilizationNotes, setMobilizationNotes] = useState('');
  const [vehicleDetails, setVehicleDetails] = useState('');
  const [scopeOfWork, setScopeOfWork] = useState('');

  // Signatories & Authorization
  const [preparedBy, setPreparedBy] = useState("M' Chrissna / Maricel");
  const [preparedDate, setPreparedDate] = useState(
    () => new Date().toISOString().slice(0, 10)
  );
  const [supervisor, setSupervisor] = useState('');
  const [supervisorDate, setSupervisorDate] = useState(
    () => new Date().toISOString().slice(0, 10)
  );
  const [projectManager, setProjectManager] = useState('');
  const [projectManagerDate, setProjectManagerDate] = useState(
    () => new Date().toISOString().slice(0, 10)
  );

  // Form validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Generate Next Mobilization Deployment Ticket ID e.g. MOB-2026-001 or DEP-2026-001
  const generateTicketId = () => {
    const currentYear = new Date().getFullYear();
    const prefix = `MOB-${currentYear}-`;
    const yearTickets = existingTickets.filter((t) => t.id.startsWith(prefix));
    let nextNum = yearTickets.length + 1;

    let candidate = `${prefix}${String(nextNum).padStart(3, '0')}`;
    while (existingTickets.some((t) => t.id === candidate)) {
      nextNum += 1;
      candidate = `${prefix}${String(nextNum).padStart(3, '0')}`;
    }
    return candidate;
  };

  const [ticketIdPreview, setTicketIdPreview] = useState(generateTicketId);

  // When project changes, auto-fill location and supervisor/PM
  useEffect(() => {
    if (projectId && projectId !== 'custom') {
      const p = projects.find((proj) => proj.id === projectId);
      if (p) {
        if (p.location) setProjectLocation(p.location);
        if (p.leadPerson) setSupervisor(p.leadPerson);
        if (p.projectManager) setProjectManager(p.projectManager);
        else if (!projectManager) setProjectManager('Engr. Roberto Santos');
      }
    }
  }, [projectId, projects]);

  // Sync dates
  useEffect(() => {
    if (deploymentDate) {
      setSupervisorDate(deploymentDate);
      setProjectManagerDate(deploymentDate);
    }
  }, [deploymentDate]);

  // Reset or initialize on modal open
  const prevIsOpenRef = React.useRef(false);
  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      setTicketIdPreview(generateTicketId());
      setErrors({});
      if (projects.length > 0 && !projectId) {
        setProjectId(projects[0].id);
      }
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen]);

  if (!isOpen) return null;

  const numMobilization = mobilizationCost === '' ? 0 : Number(mobilizationCost);

  const validateForm = () => {
    const errs: Record<string, string> = {};

    if (!projectId) {
      errs.projectId = 'Please select a destination project';
    } else if (projectId === 'custom' && !customProjectName.trim()) {
      errs.customProjectName = 'Please enter project name';
    }

    if (!deploymentDate) {
      errs.deploymentDate = 'Please select deployment / mobilization date';
    }

    if (!daysCount || Number(daysCount) <= 0) {
      errs.daysCount = 'Working duration must be at least 1 day';
    }

    if (numMobilization <= 0) {
      errs.mobilizationCost = 'Ilagay ang halaga ng mobilization cost (mas mataas sa ₱0.00)';
    }

    if (!preparedBy.trim()) {
      errs.preparedBy = 'Ilagay kung sino ang nag-prepare ng mobilization ticket';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      return;
    }

    const durationDays = Number(daysCount) || 1;

    // Calculate End Date
    let endDateStr = deploymentDate;
    if (deploymentDate && durationDays > 1) {
      const parts = deploymentDate.split('-');
      if (parts.length === 3) {
        const start = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        start.setDate(start.getDate() + durationDays - 1);
        endDateStr = start.toISOString().slice(0, 10);
      }
    }

    const selectedProj = projects.find((p) => p.id === projectId);
    const finalProjectName =
      projectId === 'custom'
        ? customProjectName.trim()
        : selectedProj?.name || 'Project Site';

    const finalLocation =
      projectLocation.trim() || selectedProj?.location || undefined;

    // Build mobilization note
    const defaultMobNote = mobilizationNotes.trim()
      ? mobilizationNotes.trim()
      : 'Site Mobilization, Transpo & Logistics';

    const newTicket: DeploymentTicket = {
      id: ticketIdPreview,
      projectId: projectId === 'custom' ? 'CUSTOM-SITE' : projectId,
      projectName: finalProjectName,
      projectLocation: finalLocation,
      deploymentDate,
      endDate: endDateStr,
      daysCount: durationDays,
      lines: [], // No manpower lines for pure mobilization ticket
      mobilizationCost: numMobilization,
      mobilizationNotes: defaultMobNote,
      laborCost: 0,
      totalCost: numMobilization,
      status: 'Active On-Site',
      vehicleDetails: vehicleDetails.trim() || undefined,
      scopeOfWork: scopeOfWork.trim() || (defaultMobNote ? `Mobilization: ${defaultMobNote}` : undefined),
      preparedBy: preparedBy.trim(),
      preparedDate,
      supervisor: supervisor.trim() || 'Site Supervisor',
      supervisorDate,
      projectManager: projectManager.trim() || 'Engr. Roberto Santos',
      projectManagerDate,
      createdAt: new Date().toISOString(),
    };

    onAddMobilization(newTicket);
    onClose();
  };

  return (
    <div
      id="add-mobilization-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto"
    >
      <div
        id="add-mobilization-modal-card"
        className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-5 my-8 max-h-[92vh] overflow-y-auto"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-amber-50 text-amber-700 border border-amber-200">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <span>Add Mobilization Cost & Logistics</span>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                  {ticketIdPreview}
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                Hiwalay na record para sa trucking, pamasahe, diesel, toll fees, at logistical mobilization. Papasok ito sa records at Schedule Gantt Chart.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Section 1: Project & Schedule Details */}
          <div className="bg-slate-50/70 p-4.5 rounded-xl border border-slate-200 space-y-4">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center space-x-2">
              <Building2 className="w-4 h-4 text-teal-600" />
              <span>1. Destination Project & Logistics Schedule</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Project Select */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Destination Project *
                </label>
                <select
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                >
                  <option value="">-- Pumili ng Project --</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.id}) {p.location ? `- ${p.location}` : ''}
                    </option>
                  ))}
                  <option value="custom">+ Iba pa / Custom Site Project</option>
                </select>
                {errors.projectId && (
                  <p className="text-xs text-rose-600 mt-1 font-semibold">
                    {errors.projectId}
                  </p>
                )}
              </div>

              {/* Site Location */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Site Address / Destination *
                </label>
                <input
                  type="text"
                  placeholder="e.g. BGC Taguig, Tower 2 Site"
                  value={projectLocation}
                  onChange={(e) => setProjectLocation(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {projectId === 'custom' && (
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Custom Project / Client Name *
                  </label>
                  <input
                    type="text"
                    placeholder="Enter project name..."
                    value={customProjectName}
                    onChange={(e) => setCustomProjectName(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  {errors.customProjectName && (
                    <p className="text-xs text-rose-600 mt-1 font-semibold">
                      {errors.customProjectName}
                    </p>
                  )}
                </div>
              )}

              {/* Mobilization Start Date */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Mobilization / Departure Date *
                </label>
                <input
                  type="date"
                  value={deploymentDate}
                  onChange={(e) => setDeploymentDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                />
                {errors.deploymentDate && (
                  <p className="text-xs text-rose-600 mt-1 font-semibold">
                    {errors.deploymentDate}
                  </p>
                )}
              </div>

              {/* Duration in Days */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Duration (Days Covered) *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    step="1"
                    placeholder="1"
                    value={daysCount}
                    onChange={(e) =>
                      setDaysCount(e.target.value === '' ? '' : Math.max(1, parseInt(e.target.value, 10)))
                    }
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 font-bold"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-medium pointer-events-none">
                    day(s)
                  </span>
                </div>
                {errors.daysCount && (
                  <p className="text-xs text-rose-600 mt-1 font-semibold">
                    {errors.daysCount}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Section 2: Mobilization Cost & Logistics Details */}
          <div className="bg-amber-50/50 p-4.5 rounded-xl border border-amber-200 space-y-4">
            <div className="text-xs font-bold uppercase tracking-wider text-amber-950 flex items-center space-x-2">
              <Truck className="w-4 h-4 text-amber-700" />
              <span>2. Mobilization Cost, Transpo & Trucking</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
              {/* Mobilization Amount */}
              <div>
                <label className="block text-[11px] font-bold text-slate-800 mb-1">
                  Mobilization Cost (PHP ₱) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-500">
                    ₱
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={mobilizationCost}
                    onChange={(e) =>
                      setMobilizationCost(e.target.value === '' ? '' : Number(e.target.value))
                    }
                    className="w-full pl-8 pr-3 py-2.5 text-sm font-black text-amber-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  Pamasahe, diesel, toll fees, trucking service, o hauling allowance.
                </p>
                {errors.mobilizationCost && (
                  <p className="text-xs text-rose-600 mt-1 font-semibold">
                    {errors.mobilizationCost}
                  </p>
                )}
              </div>

              {/* Vehicle & Driver Info */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Vehicle / Driver Info (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. DSI L300 Van (NAE-4819) - Driver Alex"
                  value={vehicleDetails}
                  onChange={(e) => setVehicleDetails(e.target.value)}
                  className="w-full px-3 py-2.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Plaka ng sasakyan, trucking company, o pangalan ng driver.
                </p>
              </div>

              {/* Mobilization Remarks */}
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Mobilization Breakdown / Remarks
                </label>
                <input
                  type="text"
                  placeholder="e.g. Trucking delivery of aluminum profiles + SLEX toll + gas allowance"
                  value={mobilizationNotes}
                  onChange={(e) => setMobilizationNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Scope of Work */}
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Scope of Work / Dispatch Description (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Mobilization of site materials, tools, scaffolding and equipment setup."
                  value={scopeOfWork}
                  onChange={(e) => setScopeOfWork(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Signatories & Authorization */}
          <div className="bg-indigo-50/40 p-4.5 rounded-xl border border-indigo-200 space-y-4">
            <div className="text-xs font-bold uppercase tracking-wider text-indigo-950 flex items-center space-x-2">
              <PenTool className="w-4 h-4 text-indigo-700" />
              <span>3. Signatories & Authorization</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              {/* Prepared By */}
              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-1">
                  Prepared By (Logistics / Admin) *
                </label>
                <input
                  type="text"
                  value={preparedBy}
                  onChange={(e) => setPreparedBy(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Supervisor */}
              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-1">
                  Site In-Charge / Supervisor
                </label>
                <input
                  type="text"
                  value={supervisor}
                  onChange={(e) => setSupervisor(e.target.value)}
                  placeholder="e.g. Engr. Santos"
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Project Manager */}
              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-1">
                  Project Manager (Approval)
                </label>
                <input
                  type="text"
                  value={projectManager}
                  onChange={(e) => setProjectManager(e.target.value)}
                  placeholder="e.g. Engr. Roberto Santos"
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Grand Total Footer Summary */}
          <div className="bg-slate-900 text-white p-4 rounded-xl flex items-center justify-between shadow-md">
            <div>
              <span className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider block">
                Total Mobilization Amount
              </span>
              <span className="text-xl font-black text-white font-mono mt-0.5 block">
                {formatCurrency(numMobilization)}
              </span>
            </div>

            <div className="flex items-center space-x-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                className="px-5 py-2 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg shadow-sm hover:shadow transition-all flex items-center space-x-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4 text-slate-950" />
                <span>Save Mobilization Ticket</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
