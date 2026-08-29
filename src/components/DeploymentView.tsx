import React, { useState } from 'react';
import {
  Users,
  Plus,
  Trash2,
  Search,
  FileText,
  Building2,
  Calendar,
  User,
  ChevronDown,
  ChevronUp,
  Briefcase,
  DollarSign,
  Truck,
  Download,
  Printer,
  ExternalLink,
  Settings,
  HardHat,
  CheckCircle2,
  Clock,
  Banknote,
  FileDown,
  PenTool,
  UserCheck,
  ShieldCheck,
} from 'lucide-react';
import {
  DeploymentTicket,
  Project,
  ManpowerPositionRate,
} from '../types';
import {
  formatCurrency,
  getTotalHeadcount,
  exportDeploymentToCSV,
} from '../utils/deploymentHelpers';
import { generateDeploymentPDF } from '../utils/generateDeploymentPDF';
import { DeploymentSlipModal } from './DeploymentSlipModal';

interface DeploymentViewProps {
  tickets: DeploymentTicket[];
  projects: Project[];
  manpowerRates: ManpowerPositionRate[];
  onOpenAddModal: () => void;
  onOpenRemoveModal: () => void;
  onOpenManageRates: () => void;
  onDeleteTicket: (ticketId: string) => void;
  onUpdateTicketStatus: (ticketId: string, status: DeploymentTicket['status']) => void;
  onNavigateToProjects: () => void;
  onNavigateToInventory: () => void;
}

export const DeploymentView: React.FC<DeploymentViewProps> = ({
  tickets,
  projects,
  manpowerRates,
  onOpenAddModal,
  onOpenRemoveModal,
  onOpenManageRates,
  onDeleteTicket,
  onUpdateTicketStatus,
  onNavigateToProjects,
  onNavigateToInventory,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProjectFilter, setSelectedProjectFilter] = useState('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');
  const [expandedTicketId, setExpandedTicketId] = useState<string | null>(null);
  const [slipTicket, setSlipTicket] = useState<DeploymentTicket | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedTicketId((prev) => (prev === id ? null : id));
  };

  const filteredTickets = tickets.filter((ticket) => {
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      ticket.id.toLowerCase().includes(q) ||
      ticket.projectName.toLowerCase().includes(q) ||
      (ticket.leadSupervisor && ticket.leadSupervisor.toLowerCase().includes(q)) ||
      (ticket.supervisor && ticket.supervisor.toLowerCase().includes(q)) ||
      (ticket.preparedBy && ticket.preparedBy.toLowerCase().includes(q)) ||
      (ticket.projectManager && ticket.projectManager.toLowerCase().includes(q)) ||
      (ticket.requestedBy && ticket.requestedBy.toLowerCase().includes(q)) ||
      ticket.deploymentDate.includes(q) ||
      ticket.lines.some((l) => l.role.toLowerCase().includes(q));

    const matchesProject =
      selectedProjectFilter === 'all'
        ? true
        : ticket.projectId === selectedProjectFilter;

    const matchesStatus =
      selectedStatusFilter === 'all'
        ? true
        : ticket.status === selectedStatusFilter;

    return matchesSearch && matchesProject && matchesStatus;
  });

  // KPI Calculations
  const totalTickets = tickets.length;
  const totalHeadsDispatched = tickets.reduce(
    (sum, t) => sum + getTotalHeadcount(t.lines),
    0
  );
  const totalLaborCost = tickets.reduce((sum, t) => sum + (t.laborCost || 0), 0);
  const totalMobilizationCost = tickets.reduce(
    (sum, t) => sum + (t.mobilizationCost || 0),
    0
  );
  const grandTotalCost = tickets.reduce((sum, t) => sum + (t.totalCost || 0), 0);

  const handleDownloadPDF = (ticket: DeploymentTicket) => {
    const project = projects.find((p) => p.id === ticket.projectId);
    generateDeploymentPDF({
      ticket,
      project,
      preparedBy: ticket.preparedBy || "M' Chrissna / Maricel",
      supervisor: ticket.supervisor || ticket.leadSupervisor,
      projectManager: ticket.projectManager,
    });
  };

  return (
    <div id="deployment-view-root" className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Header with Add & Remove Deployment Buttons */}
      <div className="bg-white rounded-xl p-6 border border-slate-200/90 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-lg bg-teal-50 text-teal-700 border border-teal-200">
              <Users className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Manpower Deployment & Logistics
            </h2>
          </div>
          <p className="text-xs text-slate-500">
            I-dispatch ang Foreman, Installer, Labor, Engineer, Architect sa project sites at i-track ang labor & mobilization costing.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            id="btn-add-deployment"
            onClick={onOpenAddModal}
            className="px-4 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-sm hover:shadow transition-all flex items-center space-x-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Deployment</span>
          </button>

          <button
            onClick={onOpenManageRates}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition-colors flex items-center space-x-1.5 cursor-pointer"
            title="Manage Salary & Daily Rates"
          >
            <Settings className="w-4 h-4 text-slate-500" />
            <span>Manpower Rates</span>
          </button>

          <button
            id="btn-remove-deployment"
            onClick={onOpenRemoveModal}
            disabled={tickets.length === 0}
            className={`px-3.5 py-2 text-xs font-semibold rounded-lg border transition-all flex items-center space-x-1.5 ${
              tickets.length === 0
                ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                : 'text-rose-700 bg-rose-50 hover:bg-rose-100/80 border-rose-200 cursor-pointer'
            }`}
          >
            <Trash2 className="w-4 h-4" />
            <span>Remove Deployment</span>
          </button>

          {tickets.length > 0 && (
            <button
              onClick={() => exportDeploymentToCSV(tickets)}
              className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition-colors flex items-center space-x-1.5 cursor-pointer"
              title="Export all deployment tickets to CSV"
            >
              <FileDown className="w-4 h-4 text-slate-500" />
              <span>Export CSV</span>
            </button>
          )}

          <button
            onClick={onNavigateToProjects}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition-colors"
          >
            ← View Projects
          </button>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Tickets */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block">
              Deployment Tickets
            </span>
            <span className="text-2xl font-bold text-slate-900 mt-1 block">
              {totalTickets}
            </span>
            <span className="text-[11px] text-slate-400">Total tickets logged</span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-teal-50 text-teal-700 border border-teal-200 flex items-center justify-center">
            <FileText className="w-5 h-5" />
          </div>
        </div>

        {/* Total Heads Dispatched */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-700 block">
              Total Heads Deployed
            </span>
            <span className="text-2xl font-bold text-blue-900 mt-1 block">
              {totalHeadsDispatched}
            </span>
            <span className="text-[11px] text-blue-600/80">Active workforce deployed</span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center">
            <HardHat className="w-5 h-5" />
          </div>
        </div>

        {/* Total Labor Cost */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-600 block">
              Total Labor Cost
            </span>
            <span className="text-xl font-bold text-slate-900 mt-1 block">
              {formatCurrency(totalLaborCost)}
            </span>
            <span className="text-[11px] text-slate-400">Salaries & daily rates</span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
            <Banknote className="w-5 h-5" />
          </div>
        </div>

        {/* Mobilization Cost */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-700 block">
              Mobilization Total
            </span>
            <span className="text-xl font-bold text-amber-900 mt-1 block">
              {formatCurrency(totalMobilizationCost)}
            </span>
            <span className="text-[11px] text-amber-700/80">Transpo, fuel & logistics</span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center">
            <Truck className="w-5 h-5" />
          </div>
        </div>

        {/* Grand Total Cost */}
        <div className="bg-white rounded-xl p-4 border border-emerald-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-800 block">
              Grand Total Cost
            </span>
            <span className="text-xl font-black text-emerald-900 mt-1 block">
              {formatCurrency(grandTotalCost)}
            </span>
            <span className="text-[11px] text-emerald-700">Labor + Mobilization</span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Quick Manpower Salary Rates Overview Strip */}
      <div className="bg-slate-900 text-white rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-teal-400 flex items-center space-x-1.5 mr-2">
            <HardHat className="w-4 h-4" />
            <span>Standard Daily Rates:</span>
          </span>
          {manpowerRates.slice(0, 5).map((r) => (
            <span
              key={r.id}
              className="px-2.5 py-1 text-xs rounded-lg bg-slate-800 border border-slate-700 text-slate-200 flex items-center space-x-1.5"
            >
              <span className="font-semibold text-white">{r.role}:</span>
              <span className="font-mono font-bold text-teal-300">
                ₱{r.dailyRate.toLocaleString()}
              </span>
              <span className="text-[10px] text-slate-400">/day</span>
            </span>
          ))}
          {manpowerRates.length > 5 && (
            <span className="text-xs text-slate-400">
              +{manpowerRates.length - 5} more
            </span>
          )}
        </div>

        <button
          onClick={onOpenManageRates}
          className="text-xs font-bold text-teal-300 hover:text-white underline whitespace-nowrap cursor-pointer"
        >
          I-edit ang mga Rates →
        </button>
      </div>

      {/* Filter / Search Bar */}
      {tickets.length > 0 && (
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search ticket #, project, supervisor, role..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {/* Project Filter */}
            <div className="flex items-center space-x-2">
              <span className="text-xs text-slate-500 font-medium whitespace-nowrap">
                Project:
              </span>
              <select
                value={selectedProjectFilter}
                onChange={(e) => setSelectedProjectFilter(e.target.value)}
                className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="all">All Projects</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.id})
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div className="flex items-center space-x-2">
              <span className="text-xs text-slate-500 font-medium whitespace-nowrap">
                Status:
              </span>
              <select
                value={selectedStatusFilter}
                onChange={(e) => setSelectedStatusFilter(e.target.value)}
                className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="all">All Statuses</option>
                <option value="Active On-Site">Active On-Site</option>
                <option value="Scheduled">Scheduled</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Main Section: Recent Deployment Tickets */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center space-x-2">
            <Users className="w-4 h-4 text-teal-600" />
            <span>Manpower Deployment Tickets ({filteredTickets.length})</span>
          </h3>
          <span className="text-xs text-slate-500">
            {tickets.length === 0
              ? 'Walang active deployment records'
              : 'All dispatched manpower requisitions'}
          </span>
        </div>

        {tickets.length === 0 ? (
          <div className="p-12 text-center space-y-4">
            <div className="w-14 h-14 bg-teal-50 text-teal-600 border border-teal-200 rounded-2xl mx-auto flex items-center justify-center">
              <Users className="w-7 h-7" />
            </div>
            <div className="max-w-md mx-auto space-y-1">
              <h4 className="text-base font-bold text-slate-900">
                Walang Deployment Records
              </h4>
              <p className="text-xs text-slate-500">
                I-click ang <strong>"Add Deployment"</strong> upang magpadala ng Foreman, Installer, Labor, Engineer, o Architect sa inyong proyekto kasama ang mobilization cost.
              </p>
            </div>
            <div className="pt-2 flex items-center justify-center gap-3">
              <button
                onClick={onOpenAddModal}
                className="inline-flex items-center space-x-2 px-5 py-2.5 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-sm hover:shadow transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Create First Deployment Ticket</span>
              </button>
            </div>
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className="p-8 text-center text-slate-500 space-y-2">
            <p className="font-semibold text-sm">
              No deployment tickets matched your filter.
            </p>
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedProjectFilter('all');
                setSelectedStatusFilter('all');
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
              const totalHeads = getTotalHeadcount(ticket.lines);

              const statusColorMap = {
                'Active On-Site': 'bg-emerald-50 text-emerald-800 border-emerald-200',
                Scheduled: 'bg-blue-50 text-blue-800 border-blue-200',
                Completed: 'bg-slate-100 text-slate-700 border-slate-200',
                Cancelled: 'bg-rose-50 text-rose-800 border-rose-200',
              };

              return (
                <div key={ticket.id} className="transition-colors hover:bg-slate-50/60">
                  {/* Ticket Summary Row */}
                  <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1.5 flex-1">
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

                        {/* Status Badge */}
                        <span
                          className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                            statusColorMap[ticket.status] || 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {ticket.status}
                        </span>
                      </div>

                      <div className="text-xs text-slate-500 flex flex-wrap items-center gap-x-4 gap-y-1">
                        {ticket.leadSupervisor && (
                          <span className="flex items-center space-x-1">
                            <User className="w-3.5 h-3.5 text-slate-400" />
                            <span>
                              Lead: <strong className="text-slate-700">{ticket.leadSupervisor}</strong>
                            </span>
                          </span>
                        )}

                        <span className="flex items-center space-x-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>
                            Date: <strong className="text-slate-700">{ticket.deploymentDate}</strong> ({ticket.daysCount}d)
                          </span>
                        </span>

                        {ticket.projectLocation && (
                          <span>
                            Loc: <strong className="text-slate-700">{ticket.projectLocation}</strong>
                          </span>
                        )}
                      </div>

                      {/* Positions Summary Badge Bar */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <span className="text-[11px] font-bold text-teal-900 bg-teal-50 px-2 py-0.5 rounded border border-teal-200 flex items-center space-x-1">
                          <HardHat className="w-3 h-3 text-teal-600" />
                          <span>{totalHeads} Heads</span>
                        </span>

                        {ticket.lines.map((l, idx) => (
                          <span
                            key={idx}
                            className="text-[11px] px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-700 font-medium"
                          >
                            {l.quantity}x {l.role}
                          </span>
                        ))}

                        {ticket.mobilizationCost > 0 && (
                          <span className="text-[11px] font-bold text-amber-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 flex items-center space-x-1">
                            <Truck className="w-3 h-3 text-amber-600" />
                            <span>Mob: {formatCurrency(ticket.mobilizationCost)}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Costing Summary & Actions */}
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="text-right pr-2">
                        <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                          Total Cost
                        </span>
                        <span className="text-base font-extrabold text-emerald-800 block">
                          {formatCurrency(ticket.totalCost)}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          Labor: {formatCurrency(ticket.laborCost)}
                        </span>
                      </div>

                      <button
                        onClick={() => setSlipTicket(ticket)}
                        className="px-3 py-1.5 text-xs font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-lg transition-colors flex items-center space-x-1.5 cursor-pointer"
                        title="View & Print Official Deployment Slip"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>View Slip</span>
                      </button>

                      <button
                        onClick={() => handleDownloadPDF(ticket)}
                        className="p-1.5 text-slate-500 hover:text-teal-700 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
                        title="Download PDF"
                      >
                        <Download className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => toggleExpand(ticket.id)}
                        className="px-2.5 py-1.5 text-xs font-semibold text-slate-600 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors flex items-center space-x-1"
                      >
                        <span>{isExpanded ? 'Hide Details' : 'Details'}</span>
                        {isExpanded ? (
                          <ChevronUp className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5" />
                        )}
                      </button>

                      <button
                        onClick={() => onDeleteTicket(ticket.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Delete Ticket"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Expanded Breakdown Table */}
                  {isExpanded && (
                    <div className="px-5 pb-5 pt-1 animate-in fade-in">
                      <div className="bg-slate-50/80 rounded-xl p-4 border border-slate-200 space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2">
                          <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                            Workforce Breakdown ({ticket.lines.length} Positions • {totalHeads} Heads)
                          </span>

                          {/* Quick Status Updater */}
                          <div className="flex items-center space-x-2 text-xs">
                            <span className="text-slate-500 font-medium">Update Status:</span>
                            <select
                              value={ticket.status}
                              onChange={(e) =>
                                onUpdateTicketStatus(
                                  ticket.id,
                                  e.target.value as DeploymentTicket['status']
                                )
                              }
                              className="px-2.5 py-1 text-xs bg-white border border-slate-300 rounded font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-500"
                            >
                              <option value="Active On-Site">Active On-Site</option>
                              <option value="Scheduled">Scheduled</option>
                              <option value="Completed">Completed</option>
                              <option value="Cancelled">Cancelled</option>
                            </select>
                          </div>
                        </div>

                        {/* Line items table */}
                        <div className="border border-slate-200 rounded-lg overflow-hidden bg-white divide-y divide-slate-100">
                          <div className="bg-slate-100 px-3.5 py-2 text-[11px] font-bold text-slate-600 grid grid-cols-12 gap-2 uppercase tracking-wider">
                            <div className="col-span-3">Position / Role</div>
                            <div className="col-span-2 text-center">Headcount</div>
                            <div className="col-span-2 text-right">Daily Rate</div>
                            <div className="col-span-2 text-center">Duration</div>
                            <div className="col-span-3 text-right">Subtotal</div>
                          </div>

                          {ticket.lines.map((line, idx) => (
                            <div
                              key={idx}
                              className="px-3.5 py-2 text-xs grid grid-cols-12 gap-2 items-center hover:bg-slate-50"
                            >
                              <div className="col-span-3 font-bold text-slate-900">
                                {line.role}
                                {line.personnelNames && line.personnelNames.length > 0 && (
                                  <div className="text-[10px] text-slate-500 font-normal">
                                    {line.personnelNames.join(', ')}
                                  </div>
                                )}
                              </div>

                              <div className="col-span-2 text-center">
                                <span className="font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200 text-xs">
                                  {line.quantity} pax
                                </span>
                              </div>

                              <div className="col-span-2 text-right text-slate-700 font-medium">
                                ₱{line.dailyRate.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                              </div>

                              <div className="col-span-2 text-center text-slate-600">
                                {line.days} day(s)
                              </div>

                              <div className="col-span-3 text-right font-bold text-emerald-800">
                                {formatCurrency(line.subtotal)}
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Logistics & Scope Notes */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs pt-1">
                          <div className="p-3 bg-white border border-slate-200 rounded-lg space-y-1">
                            <span className="font-bold text-slate-700 block text-[11px] uppercase tracking-wider">
                              Scope of Work / Remarks
                            </span>
                            <p className="text-slate-600 text-[11px]">
                              {ticket.scopeOfWork || 'General manpower deployment.'}
                            </p>
                            {ticket.vehicleDetails && (
                              <p className="text-[11px] text-slate-500 pt-1">
                                <strong>Vehicle:</strong> {ticket.vehicleDetails}
                              </p>
                            )}
                          </div>

                          <div className="p-3 bg-white border border-slate-200 rounded-lg space-y-1.5">
                            <span className="font-bold text-slate-700 block text-[11px] uppercase tracking-wider">
                              Costing Summary
                            </span>
                            <div className="flex justify-between text-[11px]">
                              <span className="text-slate-500">Labor Subtotal:</span>
                              <span className="font-bold text-slate-800">{formatCurrency(ticket.laborCost)}</span>
                            </div>
                            <div className="flex justify-between text-[11px]">
                              <span className="text-slate-500">Mobilization Cost:</span>
                              <span className="font-bold text-amber-800">
                                {formatCurrency(ticket.mobilizationCost)}
                                {ticket.mobilizationNotes && (
                                  <span className="font-normal text-[10px] text-slate-400 block text-right">
                                    ({ticket.mobilizationNotes})
                                  </span>
                                )}
                              </span>
                            </div>
                            <div className="flex justify-between text-xs font-bold pt-1 border-t border-slate-100">
                              <span className="text-slate-800">Total Deployment Cost:</span>
                              <span className="text-emerald-800 font-extrabold">{formatCurrency(ticket.totalCost)}</span>
                            </div>
                          </div>
                        </div>

                        {/* Signatories Information Block */}
                        <div className="bg-white border border-slate-200 rounded-lg p-3.5 space-y-2.5">
                          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-700 flex items-center space-x-1.5 border-b border-slate-100 pb-2">
                            <PenTool className="w-3.5 h-3.5 text-indigo-600" />
                            <span>Authorized Signatories (Mga Pipirma at Petsa)</span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                            {/* Prepared By */}
                            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200/80">
                              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                                Inihanda Ni (Prepared By)
                              </span>
                              <span className="font-bold text-slate-900 block mt-0.5">
                                {ticket.preparedBy || ticket.requestedBy || "M' Chrissna / Maricel"}
                              </span>
                              <span className="text-[10px] text-slate-500 block">
                                Date: <strong className="text-slate-700">{ticket.preparedDate || ticket.deploymentDate}</strong>
                              </span>
                            </div>

                            {/* Site Supervisor */}
                            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200/80">
                              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                                Site Supervisor (Lead)
                              </span>
                              <span className="font-bold text-slate-900 block mt-0.5">
                                {ticket.supervisor || ticket.leadSupervisor || 'Site Supervisor'}
                              </span>
                              <span className="text-[10px] text-slate-500 block">
                                Date: <strong className="text-slate-700">{ticket.supervisorDate || ticket.deploymentDate}</strong>
                              </span>
                            </div>

                            {/* Project Manager */}
                            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200/80">
                              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                                Project Manager (Approval)
                              </span>
                              <span className="font-bold text-slate-900 block mt-0.5">
                                {ticket.projectManager || 'Project Manager'}
                              </span>
                              <span className="text-[10px] text-slate-500 block">
                                Date: <strong className="text-slate-700">{ticket.projectManagerDate || ticket.deploymentDate}</strong>
                              </span>
                            </div>
                          </div>
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

      {/* Official Deployment Slip Viewer Modal */}
      <DeploymentSlipModal
        isOpen={!!slipTicket}
        onClose={() => setSlipTicket(null)}
        ticket={slipTicket}
        projects={projects}
      />
    </div>
  );
};
