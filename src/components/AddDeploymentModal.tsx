import React, { useState, useEffect } from 'react';
import {
  X,
  Users,
  Plus,
  Trash2,
  Building2,
  Calendar,
  DollarSign,
  Truck,
  AlertTriangle,
  FileText,
  UserCheck,
  CheckCircle2,
  Briefcase,
  HelpCircle,
  PenTool,
  ShieldCheck,
  User,
} from 'lucide-react';
import {
  DeploymentTicket,
  DeploymentManpowerLine,
  Project,
  ManpowerPositionRate,
} from '../types';
import { formatCurrency } from '../utils/deploymentHelpers';

interface AddDeploymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects: Project[];
  manpowerRates: ManpowerPositionRate[];
  existingTickets: DeploymentTicket[];
  onAddDeployment: (ticket: DeploymentTicket) => void;
  onOpenManageRates: () => void;
  onOpenAddProjectModal: () => void;
}

export const AddDeploymentModal: React.FC<AddDeploymentModalProps> = ({
  isOpen,
  onClose,
  projects,
  manpowerRates,
  existingTickets,
  onAddDeployment,
  onOpenManageRates,
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

  // Deployment Lines in Draft
  const [lines, setLines] = useState<DeploymentManpowerLine[]>([]);

  // Line item builder inputs
  const [selectedRole, setSelectedRole] = useState(
    manpowerRates[0]?.role || 'Foreman'
  );
  const [lineQuantity, setLineQuantity] = useState<number | ''>(1);
  const [lineDailyRate, setLineDailyRate] = useState<number | ''>(
    manpowerRates[0]?.dailyRate || 1000
  );
  const [linePersonnelNames, setLinePersonnelNames] = useState('');
  const [lineNotes, setLineNotes] = useState('');

  // Mobilization Cost
  const [mobilizationCost, setMobilizationCost] = useState<number | ''>(0);
  const [mobilizationNotes, setMobilizationNotes] = useState('');

  // Form validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Generate Next Deployment Ticket ID e.g. DEP-2026-001
  const generateTicketId = () => {
    const currentYear = new Date().getFullYear();
    const prefix = `DEP-${currentYear}-`;
    const yearTickets = existingTickets.filter((t) => t.id.startsWith(prefix));
    const nextNum = (yearTickets.length + 1).toString().padStart(3, '0');
    return `${prefix}${nextNum}`;
  };

  const [ticketIdPreview, setTicketIdPreview] = useState(generateTicketId);

  // Sync selected project details
  useEffect(() => {
    if (projectId && projectId !== 'custom') {
      const p = projects.find((proj) => proj.id === projectId);
      if (p) {
        setProjectLocation(p.location || '');
        if (p.leadPerson && !supervisor) {
          setSupervisor(p.leadPerson);
        }
      }
    }
  }, [projectId, projects]);

  // Sync daily rate when changing selected role in picker
  useEffect(() => {
    const foundRate = manpowerRates.find((r) => r.role === selectedRole);
    if (foundRate) {
      setLineDailyRate(foundRate.dailyRate);
    }
  }, [selectedRole, manpowerRates]);

  // Sync date changes default
  useEffect(() => {
    if (deploymentDate) {
      setSupervisorDate(deploymentDate);
      setProjectManagerDate(deploymentDate);
    }
  }, [deploymentDate]);

  // Reset or initialize on modal open
  useEffect(() => {
    if (isOpen) {
      setTicketIdPreview(generateTicketId());
      setErrors({});
      if (projects.length > 0 && !projectId) {
        setProjectId(projects[0].id);
      }
    }
  }, [isOpen, projects]);

  if (!isOpen) return null;

  // Add Manpower Line to Draft
  const handleAddLine = () => {
    const qty = Number(lineQuantity);
    const rate = Number(lineDailyRate);
    const duration = Number(daysCount) || 1;

    if (!selectedRole.trim()) {
      alert('Pumili ng Manpower Position.');
      return;
    }
    if (!qty || qty <= 0) {
      alert('Maglagay ng bilang ng tao (Quantity/Heads).');
      return;
    }
    if (lineDailyRate === '' || rate < 0) {
      alert('Maglagay ng valid na Daily Salary Rate (₱).');
      return;
    }

    const subtotal = qty * rate * duration;
    const namesArray = linePersonnelNames
      .split(',')
      .map((n) => n.trim())
      .filter((n) => n.length > 0);

    // Check if role already exists in lines; if so, combine or add as distinct
    const existingIndex = lines.findIndex((l) => l.role === selectedRole);
    if (existingIndex >= 0) {
      const updatedLines = [...lines];
      const existing = updatedLines[existingIndex];
      const combinedQty = existing.quantity + qty;
      const combinedSubtotal = combinedQty * rate * duration;
      const combinedNames = [
        ...(existing.personnelNames || []),
        ...namesArray,
      ];

      updatedLines[existingIndex] = {
        ...existing,
        quantity: combinedQty,
        dailyRate: rate,
        days: duration,
        subtotal: combinedSubtotal,
        personnelNames: combinedNames.length > 0 ? combinedNames : undefined,
        notes: lineNotes ? `${existing.notes ? existing.notes + '; ' : ''}${lineNotes}` : existing.notes,
      };
      setLines(updatedLines);
    } else {
      const newLine: DeploymentManpowerLine = {
        role: selectedRole,
        quantity: qty,
        dailyRate: rate,
        days: duration,
        subtotal,
        personnelNames: namesArray.length > 0 ? namesArray : undefined,
        notes: lineNotes.trim() || undefined,
      };
      setLines([...lines, newLine]);
    }

    // Reset line input builder
    setLineQuantity(1);
    setLinePersonnelNames('');
    setLineNotes('');
  };

  const handleRemoveLine = (index: number) => {
    setLines(lines.filter((_, idx) => idx !== index));
  };

  // Calculations
  const totalHeads = lines.reduce((sum, l) => sum + l.quantity, 0);
  const totalLaborCost = lines.reduce((sum, l) => sum + l.subtotal, 0);
  const numMobilization = mobilizationCost === '' ? 0 : Number(mobilizationCost);
  const grandTotalCost = totalLaborCost + numMobilization;

  const validateForm = () => {
    const errs: Record<string, string> = {};

    if (!projectId) {
      errs.projectId = 'Please select a destination project';
    } else if (projectId === 'custom' && !customProjectName.trim()) {
      errs.customProjectName = 'Please enter project name';
    }

    if (!deploymentDate) {
      errs.deploymentDate = 'Please select deployment date';
    }

    if (!daysCount || Number(daysCount) <= 0) {
      errs.daysCount = 'Working duration must be at least 1 day';
    }

    if (lines.length === 0) {
      errs.lines = 'Magdagdag ng kahit isang Manpower Position sa deployment ticket';
    }

    if (!preparedBy.trim()) {
      errs.preparedBy = 'Ilagay kung sino ang nag-prepare ng deployment';
    }

    if (!supervisor.trim()) {
      errs.supervisor = 'Ilagay kung sino ang site supervisor';
    }

    if (!projectManager.trim()) {
      errs.projectManager = 'Ilagay kung sino ang Project Manager';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    let targetProjectName = '';
    let targetProjectId = projectId;

    if (projectId === 'custom') {
      targetProjectName = customProjectName.trim();
      targetProjectId = `PRJ-TMP-${Date.now().toString().slice(-4)}`;
    } else {
      const p = projects.find((proj) => proj.id === projectId);
      targetProjectName = p ? p.name : projectId;
    }

    const duration = Number(daysCount) || 1;

    const newTicket: DeploymentTicket = {
      id: ticketIdPreview,
      projectId: targetProjectId,
      projectName: targetProjectName,
      projectLocation: projectLocation.trim() || undefined,
      requestedBy: preparedBy.trim() || "M' Chrissna / Maricel",
      leadSupervisor: supervisor.trim() || undefined,
      deploymentDate,
      daysCount: duration,
      lines,
      mobilizationCost: numMobilization,
      mobilizationNotes: mobilizationNotes.trim() || undefined,
      laborCost: totalLaborCost,
      totalCost: grandTotalCost,
      status: 'Active On-Site',
      scopeOfWork: scopeOfWork.trim() || undefined,
      vehicleDetails: vehicleDetails.trim() || undefined,
      // Signatories with names and dates
      preparedBy: preparedBy.trim(),
      preparedDate: preparedDate || deploymentDate,
      supervisor: supervisor.trim(),
      supervisorDate: supervisorDate || deploymentDate,
      projectManager: projectManager.trim(),
      projectManagerDate: projectManagerDate || deploymentDate,
      createdAt: new Date().toISOString(),
    };

    onAddDeployment(newTicket);
    onClose();
  };

  return (
    <div
      id="add-deployment-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="add-deployment-modal-card"
        className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Modal Header */}
        <div className="bg-slate-900 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-teal-500/20 text-teal-400 border border-teal-500/30">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold tracking-tight">
                  Add Manpower Deployment
                </h2>
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-teal-900/60 text-teal-300 border border-teal-700/50">
                  {ticketIdPreview}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Ipadala ang manpower sa site, itakda ang headcount, salary rates, at mobilization cost.
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

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Section 1: Project & Schedule */}
          <div className="bg-slate-50/80 p-4.5 rounded-xl border border-slate-200 space-y-4">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Building2 className="w-4 h-4 text-teal-600" />
                <span>1. Project Destination & Schedule</span>
              </div>
              <button
                type="button"
                onClick={onOpenAddProjectModal}
                className="text-[11px] font-bold text-teal-700 hover:underline flex items-center space-x-1"
              >
                <Plus className="w-3 h-3" />
                <span>Add New Project</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              {/* Project Destination */}
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Destination Project *
                </label>
                <select
                  required
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="" disabled>
                    -- Piliin ang Destination Project --
                  </option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.id}) {p.location ? `— ${p.location}` : ''}
                    </option>
                  ))}
                  <option value="custom">+ Other / Custom Site Name</option>
                </select>
                {errors.projectId && (
                  <p className="text-[10px] text-rose-600 mt-1 font-semibold">
                    {errors.projectId}
                  </p>
                )}
              </div>

              {/* Deployment Date */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Deployment Date *
                </label>
                <input
                  type="date"
                  required
                  value={deploymentDate}
                  onChange={(e) => setDeploymentDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>

            {projectId === 'custom' && (
              <div className="animate-in fade-in">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Enter Custom Project Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Alveo Tower 2 Interior Fit-out"
                  value={customProjectName}
                  onChange={(e) => setCustomProjectName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Site Location */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Site Location / Address
                </label>
                <input
                  type="text"
                  placeholder="e.g. BGC Taguig / Pasig City"
                  value={projectLocation}
                  onChange={(e) => setProjectLocation(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              {/* Working Duration (Days) */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Duration (Days) *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    required
                    min="1"
                    step="1"
                    placeholder="1"
                    value={daysCount}
                    onChange={(e) =>
                      setDaysCount(e.target.value === '' ? '' : Math.max(1, Number(e.target.value)))
                    }
                    className="w-full px-3 py-2 text-xs font-bold bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-medium">
                    day(s)
                  </span>
                </div>
                {errors.daysCount && (
                  <p className="text-[10px] text-rose-600 mt-1 font-semibold">
                    {errors.daysCount}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Section 2: Manpower Positions & Daily Salary Rates */}
          <div className="bg-teal-50/40 p-4.5 rounded-xl border border-teal-200/80 space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold uppercase tracking-wider text-teal-950 flex items-center space-x-2">
                <UserCheck className="w-4 h-4 text-teal-700" />
                <span>2. Select Manpower Positions to Deploy</span>
              </div>
              <button
                type="button"
                onClick={onOpenManageRates}
                className="text-[11px] font-bold text-teal-800 hover:text-teal-950 bg-teal-100/80 px-2.5 py-1 rounded-md border border-teal-300 transition-colors flex items-center space-x-1"
              >
                <span>⚙️ Manage Rates / Salary Masterlist</span>
              </button>
            </div>

            {/* Line Item Picker Form */}
            <div className="p-4 bg-white rounded-xl border border-teal-100 shadow-2xs space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                {/* Role selection */}
                <div className="sm:col-span-4">
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Position / Role *
                  </label>
                  <select
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    {manpowerRates.map((r) => (
                      <option key={r.id} value={r.role}>
                        {r.role} (₱{r.dailyRate.toLocaleString()}/day)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Headcount Quantity */}
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Headcount (Ilan) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    placeholder="1"
                    value={lineQuantity}
                    onChange={(e) =>
                      setLineQuantity(e.target.value === '' ? '' : Math.max(1, Number(e.target.value)))
                    }
                    className="w-full px-3 py-2 text-xs font-bold text-center bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                {/* Daily Salary Rate */}
                <div className="sm:col-span-3">
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Rate / Day (PHP ₱) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                      ₱
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      placeholder="0.00"
                      value={lineDailyRate}
                      onChange={(e) =>
                        setLineDailyRate(e.target.value === '' ? '' : Number(e.target.value))
                      }
                      className="w-full pl-7 pr-3 py-2 text-xs font-bold text-slate-900 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>

                {/* Add to List Button */}
                <div className="sm:col-span-3">
                  <button
                    type="button"
                    onClick={handleAddLine}
                    className="w-full py-2 px-3 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-sm transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add to Ticket</span>
                  </button>
                </div>
              </div>

              {/* Optional Personnel Names & Remarks */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-slate-100">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                    Personnel Name(s) (Optional, comma-separated)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Juan Dela Cruz, Pedro Santos"
                    value={linePersonnelNames}
                    onChange={(e) => setLinePersonnelNames(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                    Role Specific Notes (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Specialized aluminum cladders"
                    value={lineNotes}
                    onChange={(e) => setLineNotes(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                </div>
              </div>
            </div>

            {/* List of Added Manpower Positions in Ticket */}
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5 flex items-center justify-between">
                <span>Manpower in this Ticket ({lines.length} Roles)</span>
                {lines.length > 0 && (
                  <div className="flex items-center space-x-3 text-xs">
                    <span className="text-teal-800 font-bold bg-teal-100/80 px-2 py-0.5 rounded">
                      {totalHeads} Total Heads
                    </span>
                    <span className="text-emerald-800 font-bold bg-emerald-100/80 px-2 py-0.5 rounded">
                      Labor Subtotal: {formatCurrency(totalLaborCost)}
                    </span>
                  </div>
                )}
              </div>

              {errors.lines && (
                <p className="text-xs text-rose-600 font-semibold mb-2">
                  {errors.lines}
                </p>
              )}

              {lines.length === 0 ? (
                <div className="p-6 bg-white border border-dashed border-slate-300 rounded-lg text-center text-slate-400 text-xs space-y-1">
                  <Users className="w-6 h-6 mx-auto text-slate-300" />
                  <p className="font-semibold text-slate-600">No manpower added yet.</p>
                  <p className="text-[11px]">
                    Pumili ng position sa itaas (e.g. Foreman, Installer, Labor) at i-click ang <strong>"Add to Ticket"</strong>.
                  </p>
                </div>
              ) : (
                <div className="border border-slate-200 rounded-lg overflow-hidden bg-white divide-y divide-slate-100">
                  <div className="bg-slate-100 px-3.5 py-2 text-[11px] font-bold text-slate-600 grid grid-cols-12 gap-2 uppercase tracking-wider">
                    <div className="col-span-3">Position / Role</div>
                    <div className="col-span-2 text-center">Headcount</div>
                    <div className="col-span-2 text-right">Daily Rate</div>
                    <div className="col-span-2 text-center">Duration</div>
                    <div className="col-span-2 text-right">Subtotal</div>
                    <div className="col-span-1 text-center">Action</div>
                  </div>

                  {lines.map((line, idx) => (
                    <div
                      key={idx}
                      className="px-3.5 py-2.5 text-xs grid grid-cols-12 gap-2 items-center hover:bg-slate-50/70"
                    >
                      <div className="col-span-3">
                        <div className="font-bold text-slate-900">{line.role}</div>
                        {line.personnelNames && line.personnelNames.length > 0 && (
                          <div className="text-[10px] text-slate-500 truncate">
                            {line.personnelNames.join(', ')}
                          </div>
                        )}
                      </div>

                      <div className="col-span-2 text-center">
                        <span className="font-extrabold text-teal-900 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                          {line.quantity} pax
                        </span>
                      </div>

                      <div className="col-span-2 text-right text-slate-700 font-semibold">
                        ₱{line.dailyRate.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                      </div>

                      <div className="col-span-2 text-center text-slate-600 font-medium">
                        {line.days} day(s)
                      </div>

                      <div className="col-span-2 text-right font-bold text-emerald-800">
                        {formatCurrency(line.subtotal)}
                      </div>

                      <div className="col-span-1 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveLine(idx)}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                          title="Remove role"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Section 3: Mobilization Cost & Logistics */}
          <div className="bg-amber-50/40 p-4.5 rounded-xl border border-amber-200/80 space-y-4">
            <div className="text-xs font-bold uppercase tracking-wider text-amber-950 flex items-center space-x-2">
              <Truck className="w-4 h-4 text-amber-700" />
              <span>3. Mobilization Cost & Logistics</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 items-start">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Mobilization Cost (PHP ₱) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
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
                    className="w-full pl-7 pr-3 py-2 text-xs font-bold text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  Pamasahe, diesel/fuel, toll fees, transpo allowance, o trucking.
                </p>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Mobilization Remarks / Breakdown
                </label>
                <input
                  type="text"
                  placeholder="e.g. Van service + Skyway toll + food allowance"
                  value={mobilizationNotes}
                  onChange={(e) => setMobilizationNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Vehicle / Driver Info (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. DSI L300 Van (NAE-4819) - Driver Alex"
                  value={vehicleDetails}
                  onChange={(e) => setVehicleDetails(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Scope of Work / Deployment Notes (Optional)
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Glass curtain wall installation and perimeter silicone sealing at 14th floor."
                value={scopeOfWork}
                onChange={(e) => setScopeOfWork(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          {/* Section 4: Signatories & Authorization (Prepared By, Supervisor, Project Manager) */}
          <div className="bg-indigo-50/40 p-4.5 rounded-xl border border-indigo-200/80 space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold uppercase tracking-wider text-indigo-950 flex items-center space-x-2">
                <PenTool className="w-4 h-4 text-indigo-700" />
                <span>4. Signatories & Authorization (Paghahanda at Pagpirma)</span>
              </div>
              <span className="text-[11px] text-indigo-700 font-medium bg-indigo-100/70 px-2 py-0.5 rounded">
                Mga Pipirma at Petsa
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
              {/* Signatory 1: Prepared By */}
              <div className="bg-white p-3.5 rounded-xl border border-indigo-100 shadow-2xs space-y-3">
                <div className="flex items-center space-x-2 border-b border-slate-100 pb-2">
                  <div className="p-1.5 rounded-md bg-teal-50 text-teal-700">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">1. Inihanda Ni (Prepared By)</h4>
                    <p className="text-[10px] text-slate-500">DSI Logistics / Office Admin</p>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Pangalan (Name) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. M' Chrissna / Maricel"
                    value={preparedBy}
                    onChange={(e) => setPreparedBy(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  {errors.preparedBy && (
                    <p className="text-[10px] text-rose-600 mt-1 font-semibold">
                      {errors.preparedBy}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Petsa (Date Prepared) *
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      required
                      value={preparedDate}
                      onChange={(e) => setPreparedDate(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* Signatory 2: Site Supervisor */}
              <div className="bg-white p-3.5 rounded-xl border border-indigo-100 shadow-2xs space-y-3">
                <div className="flex items-center space-x-2 border-b border-slate-100 pb-2">
                  <div className="p-1.5 rounded-md bg-amber-50 text-amber-700">
                    <UserCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">2. Supervisor (Site Lead)</h4>
                    <p className="text-[10px] text-slate-500">Lead Supervisor / Foreman on Site</p>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Pangalan (Name) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Foreman Jun / Engr. Mark"
                    value={supervisor}
                    onChange={(e) => setSupervisor(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  {errors.supervisor && (
                    <p className="text-[10px] text-rose-600 mt-1 font-semibold">
                      {errors.supervisor}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Petsa (Supervisor Date) *
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      required
                      value={supervisorDate}
                      onChange={(e) => setSupervisorDate(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* Signatory 3: Project Manager */}
              <div className="bg-white p-3.5 rounded-xl border border-indigo-100 shadow-2xs space-y-3">
                <div className="flex items-center space-x-2 border-b border-slate-100 pb-2">
                  <div className="p-1.5 rounded-md bg-emerald-50 text-emerald-700">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">3. Project Manager</h4>
                    <p className="text-[10px] text-slate-500">Project Manager / Operations Head</p>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Pangalan (Name) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Engr. Roberto Santos"
                    value={projectManager}
                    onChange={(e) => setProjectManager(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  {errors.projectManager && (
                    <p className="text-[10px] text-rose-600 mt-1 font-semibold">
                      {errors.projectManager}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Petsa (PM Approval Date) *
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      required
                      value={projectManagerDate}
                      onChange={(e) => setProjectManagerDate(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 5: Grand Total Cost Summary Panel */}
          <div className="p-4 bg-slate-900 text-white rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold tracking-wider text-teal-400 block">
                Deployment Cost Calculation Summary
              </span>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-300">
                <span>
                  Total Heads: <strong className="text-white">{totalHeads} Person(s)</strong>
                </span>
                <span>•</span>
                <span>
                  Labor Cost: <strong className="text-white">{formatCurrency(totalLaborCost)}</strong>
                </span>
                <span>•</span>
                <span>
                  Mobilization: <strong className="text-white">{formatCurrency(numMobilization)}</strong>
                </span>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 block font-semibold">
                Grand Total Deployment Expense
              </span>
              <div className="text-xl font-black text-teal-300">
                {formatCurrency(grandTotalCost)}
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={lines.length === 0}
              className={`px-5 py-2 text-xs font-bold rounded-lg shadow-sm transition-all flex items-center space-x-1.5 ${
                lines.length === 0
                  ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                  : 'text-white bg-teal-600 hover:bg-teal-700 cursor-pointer shadow-teal-900/20'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Create Deployment Ticket</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
