import React, { useState } from 'react';
import {
  FolderKanban,
  Building2,
  MapPin,
  User,
  Plus,
  Trash2,
  Search,
  CheckCircle2,
  Clock,
  Briefcase,
  Layers,
  ArrowRight,
  ExternalLink,
  Banknote,
  HardHat,
  PackageOpen,
  FileDown,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  Lock,
  Eye,
  EyeOff,
  ShieldAlert,
  X,
  LayoutGrid,
  CheckSquare,
  Percent,
  RotateCcw,
  Package,
  FileText,
  Warehouse,
  Printer,
  Download,
} from 'lucide-react';
import {
  Project,
  InventoryItem,
  PullOutTicket,
  DeploymentTicket,
  RetrieveTicket,
} from '../types';
import { formatCurrency } from '../utils/inventoryHelpers';
import { ProjectDetailsModal } from './ProjectDetailsModal';
import { generateProjectCostPDF } from '../utils/generateProjectCostPDF';
import { generateRetrievePDF } from '../utils/generateRetrievePDF';
import { calculateProjectProgress } from '../utils/projectMilestones';

interface ProjectsViewProps {
  projects: Project[];
  items: InventoryItem[];
  pullOutTickets?: PullOutTicket[];
  deploymentTickets?: DeploymentTicket[];
  retrieveTickets?: RetrieveTicket[];
  onOpenAddProjectModal: () => void;
  onOpenRemoveProjectModal: () => void;
  onOpenAddRetrieveModal?: (projectId?: string) => void;
  onOpenRemoveRetrieveModal?: () => void;
  onOpenAddRetrieveForProject?: (projectId: string) => void;
  onDeleteRetrieveTicket?: (ticketId: string, rollbackStock: boolean) => void;
  onDeleteMultipleRetrieveTickets?: (ticketIds: string[], rollbackStock: boolean) => void;
  onDeleteProject: (projectId: string) => void;
  onNavigateToInventory: () => void;
  onOpenAddPullOutForProject?: (projectId: string) => void;
  onOpenAddDeploymentForProject?: (projectId: string) => void;
  onUpdateProject?: (updatedProject: Project) => void;
}

const REQUIRED_DELETE_PASSWORD = 'aerith0818';

export const ProjectsView: React.FC<ProjectsViewProps> = ({
  projects,
  items,
  pullOutTickets = [],
  deploymentTickets = [],
  retrieveTickets = [],
  onOpenAddProjectModal,
  onOpenRemoveProjectModal,
  onOpenAddRetrieveModal,
  onOpenRemoveRetrieveModal,
  onOpenAddRetrieveForProject,
  onDeleteRetrieveTicket,
  onDeleteMultipleRetrieveTickets,
  onDeleteProject,
  onNavigateToInventory,
  onOpenAddPullOutForProject,
  onOpenAddDeploymentForProject,
  onUpdateProject,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Active' | 'Planning' | 'Completed' | 'On Hold'>('all');
  const [selectedProjectForDetails, setSelectedProjectForDetails] = useState<Project | null>(null);

  // Retrieve Tickets UI state in bottom section
  const [retrieveSearch, setRetrieveSearch] = useState('');
  const [retrieveProjectFilter, setRetrieveProjectFilter] = useState('all');
  const [expandedRetrieveTicketId, setExpandedRetrieveTicketId] = useState<string | null>(null);

  // Card single project delete with password confirmation
  const [projectToSecureDelete, setProjectToSecureDelete] = useState<Project | null>(null);
  const [cardPasswordInput, setCardPasswordInput] = useState('');
  const [cardPasswordError, setCardPasswordError] = useState('');
  const [showCardPassword, setShowCardPassword] = useState(false);


  // Calculate items deployed per project and total material expenses (from pullOutTickets, retrieveTickets & allocations)
  const getProjectComprehensiveMetrics = (projectId: string, projectName: string) => {
    const pId = (projectId || '').trim().toLowerCase();
    const pName = (projectName || '').trim().toLowerCase();

    // 1. Pull Out Materials - match by projectId or projectName robustly
    const relatedPullOuts = pullOutTickets.filter((t) => {
      const tId = (t.projectId || '').trim().toLowerCase();
      const tName = (t.projectName || '').trim().toLowerCase();
      return (
        (tId && tId === pId) ||
        (tName && tName === pName) ||
        (tId && tId === pName) ||
        (tName && tName === pId)
      );
    });

    let grossMaterialCost = 0;
    let grossMaterialUnits = 0;

    relatedPullOuts.forEach((ticket) => {
      ticket.items.forEach((item) => {
        let price = item.unitPrice || 0;
        if (price === 0 && items.length > 0) {
          const invItem = items.find(
            (i) =>
              (item.itemId && i.id.toLowerCase() === item.itemId.toLowerCase()) ||
              (item.assetId && i.assetId.toLowerCase() === item.assetId.toLowerCase()) ||
              (item.description && i.description.toLowerCase() === item.description.toLowerCase())
          );
          if (invItem && invItem.unitPrice) {
            price = invItem.unitPrice;
          }
        }
        grossMaterialCost += item.quantity * price;
        grossMaterialUnits += item.quantity;
      });
    });

    // Fallback: If no pull-outs recorded, check item.projectAllocations
    if (grossMaterialUnits === 0) {
      items.forEach((item) => {
        if (item.projectAllocations) {
          item.projectAllocations.forEach((alloc) => {
            const aId = (alloc.projectId || '').trim().toLowerCase();
            const aName = (alloc.projectName || '').trim().toLowerCase();
            if (
              (aId && aId === pId) ||
              (aName && aName === pName) ||
              (aId && aId === pName) ||
              (aName && aName === pId)
            ) {
              grossMaterialUnits += alloc.quantity;
              if (item.unitPrice) {
                grossMaterialCost += alloc.quantity * item.unitPrice;
              }
            }
          });
        }
      });
    }

    // 2. Retrieve / Returned Materials from site back to warehouse
    const relatedRetrieves = retrieveTickets.filter((t) => {
      const tId = (t.projectId || '').trim().toLowerCase();
      const tName = (t.projectName || '').trim().toLowerCase();
      return (
        (tId && tId === pId) ||
        (tName && tName === pName) ||
        (tId && tId === pName) ||
        (tName && tName === pId)
      );
    });

    let retrievedMaterialCost = 0;
    let retrievedUnits = 0;

    relatedRetrieves.forEach((ticket) => {
      ticket.items.forEach((item) => {
        let price = item.unitPrice || 0;
        if (price === 0 && items.length > 0) {
          const invItem = items.find(
            (i) =>
              (item.itemId && i.id.toLowerCase() === item.itemId.toLowerCase()) ||
              (item.assetId && i.assetId.toLowerCase() === item.assetId.toLowerCase()) ||
              (item.description && i.description.toLowerCase() === item.description.toLowerCase())
          );
          if (invItem && invItem.unitPrice) {
            price = invItem.unitPrice;
          }
        }
        retrievedMaterialCost += item.quantity * price;
        retrievedUnits += item.quantity;
      });
    });

    const netMaterialCost = Math.max(0, grossMaterialCost - retrievedMaterialCost);
    const netMaterialUnits = Math.max(0, grossMaterialUnits - retrievedUnits);

    // 3. Deployment Manpower & Mobilization
    const relatedDeployments = deploymentTickets.filter((t) => {
      const tId = (t.projectId || '').trim().toLowerCase();
      const tName = (t.projectName || '').trim().toLowerCase();
      return (
        (tId && tId === pId) ||
        (tName && tName === pName) ||
        (tId && tId === pName) ||
        (tName && tName === pId)
      );
    });

    let laborCost = 0;
    let mobilizationCost = 0;
    let headsDeployed = 0;

    relatedDeployments.forEach((dep) => {
      laborCost += dep.laborCost || 0;
      mobilizationCost += dep.mobilizationCost || 0;
      const heads = dep.lines.reduce((acc, l) => acc + (l.quantity || 0), 0);
      headsDeployed += heads;
    });

    const totalDeploymentCost = laborCost + mobilizationCost;
    const grandTotalCost = netMaterialCost + totalDeploymentCost;

    return {
      grossMaterialCost,
      retrievedMaterialCost,
      netMaterialCost,
      materialCost: netMaterialCost,
      grossMaterialUnits,
      retrievedUnits,
      netMaterialUnits,
      materialUnits: netMaterialUnits,
      pullOutTicketsCount: relatedPullOuts.length,
      retrieveTicketsCount: relatedRetrieves.length,
      laborCost,
      mobilizationCost,
      totalDeploymentCost,
      headsDeployed,
      deploymentsCount: relatedDeployments.length,
      grandTotalCost,
    };
  };

  const handleOpenSecureDelete = (e: React.MouseEvent, project: Project) => {
    e.stopPropagation();
    setProjectToSecureDelete(project);
    setCardPasswordInput('');
    setCardPasswordError('');
    setShowCardPassword(false);
  };

  const handleConfirmSecureDelete = (e: React.FormEvent) => {
    e.preventDefault();
    if (cardPasswordInput !== REQUIRED_DELETE_PASSWORD) {
      setCardPasswordError('Maling password! Ilagay ang tamang security password para ma-delete ang project.');
      return;
    }

    if (projectToSecureDelete) {
      onDeleteProject(projectToSecureDelete.id);
      setProjectToSecureDelete(null);
      setCardPasswordInput('');
      setCardPasswordError('');
    }
  };

  const filteredProjects = projects.filter((project) => {
    const matchesSearch =
      project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (project.location && project.location.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (project.leadPerson && project.leadPerson.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus =
      statusFilter === 'all' ? true : project.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const activeProjectsCount = projects.filter((p) => p.status === 'Active' || !p.status).length;
  const planningProjectsCount = projects.filter((p) => p.status === 'Planning' || p.status === 'On Hold').length;

  // Overall totals across all projects
  const overallMaterialCost = projects.reduce(
    (acc, p) => acc + getProjectComprehensiveMetrics(p.id, p.name).materialCost,
    0
  );
  const overallDeploymentCost = projects.reduce(
    (acc, p) => acc + getProjectComprehensiveMetrics(p.id, p.name).totalDeploymentCost,
    0
  );
  const overallGrandCost = overallMaterialCost + overallDeploymentCost;

  return (
    <div id="projects-view-root" className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Header with Add Project and Remove Project Action Buttons */}
      <div className="bg-white rounded-xl p-6 border border-slate-200/90 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-lg bg-teal-50 text-teal-700 border border-teal-200">
              <FolderKanban className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Projects & Site Cost Management
            </h2>
          </div>
          <p className="text-xs text-slate-500">
            I-click ang bawat <strong>Project Card</strong> upang makita ang kumpletong listahan ng na-pull out na materyales, manpower deployments, at mag-download ng PDF Cost Summary Report.
          </p>
        </div>

        {/* Action Buttons: Add Project, Remove Project, Retrieve Items, and Back to Inventory */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            id="btn-add-project"
            onClick={onOpenAddProjectModal}
            className="px-4 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-sm hover:shadow transition-all flex items-center space-x-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Project</span>
          </button>

          <button
            id="btn-remove-project"
            onClick={onOpenRemoveProjectModal}
            disabled={projects.length === 0}
            className={`px-3.5 py-2 text-xs font-semibold rounded-lg border transition-all flex items-center space-x-1.5 ${
              projects.length === 0
                ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                : 'text-rose-700 bg-rose-50 hover:bg-rose-100/80 border-rose-200 cursor-pointer'
            }`}
          >
            <Trash2 className="w-4 h-4" />
            <span>Remove Project</span>
          </button>

          {/* Retrieve Items button placed right next to Back to Inventory as requested */}
          <button
            id="btn-retrieve-items"
            onClick={() => onOpenAddRetrieveModal ? onOpenAddRetrieveModal() : null}
            className="px-4 py-2 text-xs font-bold text-teal-900 bg-teal-100 hover:bg-teal-200 border border-teal-300 rounded-lg shadow-xs hover:shadow transition-all flex items-center space-x-1.5 cursor-pointer"
            title="Retrieve pull out items, excess materials, and unused tools back to warehouse inventory"
          >
            <RotateCcw className="w-4 h-4 text-teal-700" />
            <span>Retrieve Items</span>
          </button>

          <button
            onClick={onNavigateToInventory}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            ← Back to Inventory
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Projects */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block">
              Total Projects
            </span>
            <span className="text-2xl font-bold text-slate-900 mt-1 block">
              {projects.length}
            </span>
            <span className="text-[11px] text-slate-400">
              {activeProjectsCount} active site(s)
            </span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
            <Building2 className="w-5 h-5" />
          </div>
        </div>

        {/* Total Pull-Out Materials Cost */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-700 block">
              Total Materials Dispatched
            </span>
            <span className="text-xl font-extrabold text-blue-900 mt-1 block font-mono">
              {formatCurrency(overallMaterialCost)}
            </span>
            <span className="text-[11px] text-blue-600/80">All pulled-out inventory items</span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center">
            <PackageOpen className="w-5 h-5" />
          </div>
        </div>

        {/* Total Manpower & Deployment Cost */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-teal-700 block">
              Total Manpower Cost
            </span>
            <span className="text-xl font-extrabold text-teal-900 mt-1 block font-mono">
              {formatCurrency(overallDeploymentCost)}
            </span>
            <span className="text-[11px] text-teal-600/80">Labor & mobilization expenses</span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-teal-50 text-teal-700 border border-teal-200 flex items-center justify-center">
            <HardHat className="w-5 h-5" />
          </div>
        </div>

        {/* Grand Total All Projects Expense */}
        <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-800 block">
              Combined Projects Cost
            </span>
            <span className="text-xl font-black text-emerald-950 mt-1 block font-mono">
              {formatCurrency(overallGrandCost)}
            </span>
            <span className="text-[11px] text-emerald-700">Total Materials + Deployments</span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-100/80 text-emerald-800 border border-emerald-300 flex items-center justify-center">
            <Banknote className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      {projects.length > 0 && (
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by project name, ID, location, engineer..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div className="flex items-center space-x-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            {(['all', 'Active', 'Planning', 'On Hold', 'Completed'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  statusFilter === st
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {st === 'all' ? 'All Projects' : st}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Projects Display: Empty State vs Interactive Clickable Cards Grid */}
      {projects.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center space-y-4 shadow-2xs">
          <div className="w-14 h-14 bg-teal-50 text-teal-600 border border-teal-200 rounded-2xl mx-auto flex items-center justify-center">
            <FolderKanban className="w-7 h-7" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-base font-bold text-slate-900">Walang Registered Projects</h3>
            <p className="text-xs text-slate-500">
              Kasalukuyang walang nakatalang proyekto. I-click ang <strong>"Add Project"</strong> upang mag-register ng bagong site project para sa material pull-outs at tracking.
            </p>
          </div>
          <div className="pt-2">
            <button
              onClick={onOpenAddProjectModal}
              className="inline-flex items-center space-x-2 px-5 py-2.5 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-sm hover:shadow transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Your First Project</span>
            </button>
          </div>
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500 space-y-2">
          <p className="font-semibold text-sm">No projects matched your search criteria.</p>
          <button
            onClick={() => {
              setSearchTerm('');
              setStatusFilter('all');
            }}
            className="text-xs text-teal-600 font-semibold hover:underline cursor-pointer"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredProjects.map((project) => {
            const metrics = getProjectComprehensiveMetrics(project.id, project.name);
            const status = project.status || 'Active';
            const progress = calculateProjectProgress(project);
            const windowsCount = (project.windowsDoors || []).reduce((acc, curr) => acc + (Number(curr.qty) || 1), 0);

            const statusColors = {
              Active: 'bg-emerald-50 text-emerald-800 border-emerald-200',
              Planning: 'bg-blue-50 text-blue-800 border-blue-200',
              'On Hold': 'bg-amber-50 text-amber-800 border-amber-200',
              Completed: 'bg-slate-100 text-slate-700 border-slate-200',
            };

            return (
              <div
                key={project.id}
                onClick={() => setSelectedProjectForDetails(project)}
                className="group bg-white rounded-xl border border-slate-200/90 shadow-2xs hover:border-teal-400 hover:shadow-md transition-all flex flex-col justify-between overflow-hidden cursor-pointer relative"
              >
                {/* Top Clickable Indicator Banner */}
                <div className="p-5 space-y-3.5">
                  {/* Top Badges */}
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-mono text-xs font-bold text-teal-700 bg-teal-50 group-hover:bg-teal-100 px-2.5 py-0.5 rounded-md border border-teal-200 transition-colors">
                      {project.id}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                          statusColors[status] || statusColors.Active
                        }`}
                      >
                        {status}
                      </span>
                    </div>
                  </div>

                  {/* Project Name with Arrow icon on hover */}
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-base font-bold text-slate-900 group-hover:text-teal-700 transition-colors leading-snug">
                      {project.name}
                    </h3>
                    <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-teal-600 group-hover:translate-x-1 transition-all flex-shrink-0" />
                  </div>

                  {/* Progress Milestone Strip */}
                  <div className="space-y-1.5 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-slate-700 flex items-center gap-1">
                        <CheckSquare className="w-3.5 h-3.5 text-teal-600" />
                        <span>Completion Milestone</span>
                      </span>
                      <span className="font-mono font-bold text-teal-800">
                        {progress.percentage}%
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-teal-600 rounded-full transition-all duration-300"
                        style={{ width: `${progress.percentage}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-500 pt-0.5">
                      <span>{progress.completedMilestonesCount}/14 Milestones</span>
                      <span>
                        {windowsCount > 0 ? `${progress.installedWindowsDoorsUnits}/${windowsCount} Windows/Doors` : 'No window sched'}
                      </span>
                    </div>
                  </div>

                  {/* Location & Engineer */}
                  <div className="space-y-1.5 text-xs text-slate-600 bg-slate-50 group-hover:bg-slate-50/90 p-3 rounded-lg border border-slate-100">
                    <div className="flex items-center space-x-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <span className="truncate">
                        {project.location || <span className="text-slate-400 italic">No site location</span>}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <User className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <span className="truncate">
                        Lead: <strong>{project.leadPerson || <span className="font-normal text-slate-400 italic">Unassigned</span>}</strong>
                      </span>
                    </div>
                  </div>

                  {/* Cost Summary Breakdown Badges on Card */}
                  <div className="space-y-1.5 pt-1">
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      {/* Material Pull Out Badge */}
                      <div className="bg-blue-50/70 p-2 rounded-lg border border-blue-100 flex items-center justify-between">
                        <div className="space-y-0.5">
                          <span className="text-[10px] uppercase font-bold text-blue-700 block">
                            Materials
                          </span>
                          <span className="font-bold text-blue-950 font-mono">
                            {formatCurrency(metrics.materialCost)}
                          </span>
                        </div>
                        <span className="text-[10px] text-blue-700 font-semibold bg-blue-100/70 px-1.5 py-0.5 rounded">
                          {metrics.materialUnits}u
                        </span>
                      </div>

                      {/* Manpower Deployment Badge */}
                      <div className="bg-teal-50/70 p-2 rounded-lg border border-teal-100 flex items-center justify-between">
                        <div className="space-y-0.5">
                          <span className="text-[10px] uppercase font-bold text-teal-700 block">
                            Manpower
                          </span>
                          <span className="font-bold text-teal-950 font-mono">
                            {formatCurrency(metrics.totalDeploymentCost)}
                          </span>
                        </div>
                        <span className="text-[10px] text-teal-700 font-semibold bg-teal-100/70 px-1.5 py-0.5 rounded">
                          {metrics.headsDeployed}h
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Footer with Combined Total & Action Button */}
                <div className="px-5 py-3 bg-slate-50/90 border-t border-slate-100 flex items-center justify-between text-xs gap-2">
                  <div className="flex items-center space-x-1.5">
                    <span className="text-[10px] uppercase font-bold text-slate-500">Total:</span>
                    <span className="font-black text-xs sm:text-sm text-emerald-900 font-mono">
                      {formatCurrency(metrics.grandTotalCost)}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Quick Retrieve Items for this project */}
                    {onOpenAddRetrieveModal && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenAddRetrieveModal(project.id);
                        }}
                        className="p-1.5 text-teal-700 bg-teal-50 hover:bg-teal-100/90 rounded-lg transition-colors cursor-pointer border border-teal-200"
                        title="Retrieve excess/unused items from this project back to warehouse"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {/* View Details Button */}
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-teal-700 group-hover:text-teal-800 bg-teal-50 group-hover:bg-teal-100/80 px-2.5 py-1 rounded-md transition-colors">
                      <span>View Details</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </span>

                    {/* Delete Project with Password Authorization */}
                    <button
                      onClick={(e) => handleOpenSecureDelete(e, project)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="Delete project (Requires Password)"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* RETRIEVE TICKETS SUMMARY (MGA NA-RETRIEVE NA GAMIT / MATERIAL RETURNS) */}
      {/* ========================================================================= */}
      <div id="retrieve-tickets-summary-section" className="mt-10 pt-8 border-t-2 border-dashed border-slate-200 space-y-5">
        {/* Section Header */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2.5">
              <div className="p-2.5 rounded-xl bg-teal-50 text-teal-700 border border-teal-200">
                <RotateCcw className="w-5 h-5 text-teal-700" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  <span>Retrieve Ticket Summary</span>
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-800 border border-teal-200">
                    {retrieveTickets.length} Slips
                  </span>
                </h3>
                <p className="text-xs text-slate-500">
                  Talaan ng mga naibalik na pull-out items, sobra at hindi nagamit na gamit o materyales galing sa bawat site project pabalik sa bodega. Pwedeng i-download bilang PDF form.
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons for Retrieve Section */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => onOpenAddRetrieveModal && onOpenAddRetrieveModal()}
              className="px-4 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-sm hover:shadow transition-all flex items-center space-x-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Retrieve Items</span>
            </button>

            {retrieveTickets.length > 0 && onOpenRemoveRetrieveModal && (
              <button
                onClick={onOpenRemoveRetrieveModal}
                className="px-3.5 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors cursor-pointer flex items-center space-x-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>Remove Slip</span>
              </button>
            )}
          </div>
        </div>

        {/* Retrieve KPI Badges */}
        {(() => {
          const totalSlips = retrieveTickets.length;
          const totalUnitsReturned = retrieveTickets.reduce(
            (sum, t) => sum + t.items.reduce((s, i) => s + (i.quantity || 0), 0),
            0
          );
          const totalEstimatedValue = retrieveTickets.reduce((sum, t) => {
            return (
              sum +
              t.items.reduce((s, line) => {
                const itemMatch = items.find(
                  (inv) =>
                    inv.id === line.itemId ||
                    (inv.assetId && inv.assetId === line.assetId) ||
                    inv.description.toLowerCase() === line.description.toLowerCase()
                );
                const price = line.unitPrice || itemMatch?.unitPrice || 0;
                return s + line.quantity * price;
              }, 0)
            );
          }, 0);

          const uniqueProjectsCount = new Set(
            retrieveTickets.map((t) => t.projectId || t.projectName).filter(Boolean)
          ).size;

          return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                    Total Return Slips
                  </span>
                  <div className="text-xl font-black text-slate-900 mt-0.5">{totalSlips}</div>
                  <span className="text-[10px] text-teal-600 font-semibold">Recorded return tickets</span>
                </div>
                <div className="p-2.5 rounded-lg bg-teal-50 text-teal-600 border border-teal-100">
                  <FileText className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                    Total Units Restored
                  </span>
                  <div className="text-xl font-black text-teal-900 mt-0.5 font-mono">{totalUnitsReturned}</div>
                  <span className="text-[10px] text-teal-600 font-semibold">Added back to bodega</span>
                </div>
                <div className="p-2.5 rounded-lg bg-teal-50 text-teal-600 border border-teal-100">
                  <Warehouse className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                    Value of Restored Items
                  </span>
                  <div className="text-xl font-black text-emerald-800 mt-0.5 font-mono">
                    {formatCurrency(totalEstimatedValue)}
                  </div>
                  <span className="text-[10px] text-emerald-600 font-semibold">Recovered project assets</span>
                </div>
                <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100">
                  <Banknote className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                    Participating Sites
                  </span>
                  <div className="text-xl font-black text-slate-900 mt-0.5">{uniqueProjectsCount}</div>
                  <span className="text-[10px] text-slate-500 font-semibold">Projects with returns</span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-100 text-slate-600 border border-slate-200">
                  <Building2 className="w-5 h-5" />
                </div>
              </div>
            </div>
          );
        })()}

        {/* Filter and Search Bar for Retrieve Tickets */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search slip #, project, item description, personnel..."
              value={retrieveSearch}
              onChange={(e) => setRetrieveSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-slate-600 shrink-0">Filter by Project:</label>
            <select
              value={retrieveProjectFilter}
              onChange={(e) => setRetrieveProjectFilter(e.target.value)}
              className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium cursor-pointer"
            >
              <option value="all">All Projects ({retrieveTickets.length})</option>
              {projects.map((p) => {
                const count = retrieveTickets.filter(
                  (t) =>
                    t.projectId === p.id ||
                    t.projectName.toLowerCase() === p.name.toLowerCase()
                ).length;
                return (
                  <option key={p.id} value={p.id}>
                    {p.name} ({count})
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        {/* Retrieve Tickets List */}
        {(() => {
          const filtered = retrieveTickets.filter((ticket) => {
            const matchesProj =
              retrieveProjectFilter === 'all' ||
              ticket.projectId === retrieveProjectFilter ||
              ticket.projectName.toLowerCase() ===
                projects.find((p) => p.id === retrieveProjectFilter)?.name.toLowerCase();

            const q = retrieveSearch.toLowerCase();
            const loc = (ticket.projectLocation || ticket.location || '').toLowerCase();
            const matchesSearch =
              !q ||
              ticket.id.toLowerCase().includes(q) ||
              ticket.projectName.toLowerCase().includes(q) ||
              loc.includes(q) ||
              ticket.retrievedBy.toLowerCase().includes(q) ||
              ticket.receivedBy.toLowerCase().includes(q) ||
              ticket.date.includes(q) ||
              ticket.items.some(
                (item) =>
                  item.description.toLowerCase().includes(q) ||
                  (item.assetId && item.assetId.toLowerCase().includes(q)) ||
                  (item.remarks && item.remarks.toLowerCase().includes(q))
              );

            return matchesProj && matchesSearch;
          });

          if (retrieveTickets.length === 0) {
            return (
              <div className="bg-white rounded-2xl p-10 border border-dashed border-slate-300 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center mx-auto">
                  <RotateCcw className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-slate-800">Walang Naka-rekord na Retrieve Ticket</h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Gamitin ang <strong>"Retrieve Items"</strong> button kapag may mga materyales, gamit o tools na natira sa site project at ibinabalik sa bodega upang muling maibalik sa warehouse inventory.
                </p>
                <button
                  onClick={() => onOpenAddRetrieveModal && onOpenAddRetrieveModal()}
                  className="px-4 py-2 text-xs font-bold text-teal-800 bg-teal-100 hover:bg-teal-200 border border-teal-300 rounded-lg transition-colors cursor-pointer inline-flex items-center space-x-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Gumawa ng Unang Retrieve Slip</span>
                </button>
              </div>
            );
          }

          if (filtered.length === 0) {
            return (
              <div className="bg-white rounded-2xl p-8 border border-dashed border-slate-300 text-center space-y-2">
                <p className="text-xs font-semibold text-slate-600">Walang tumugmang Retrieve Ticket sa iyong search o filter.</p>
                <button
                  onClick={() => {
                    setRetrieveSearch('');
                    setRetrieveProjectFilter('all');
                  }}
                  className="text-xs text-teal-700 hover:underline font-bold"
                >
                  I-reset ang filter
                </button>
              </div>
            );
          }

          return (
            <div className="space-y-3">
              {filtered.map((ticket) => {
                const isExpanded = expandedRetrieveTicketId === ticket.id;
                const totalUnits = ticket.items.reduce((s, i) => s + (i.quantity || 0), 0);
                const relatedProject = projects.find(
                  (p) =>
                    p.id === ticket.projectId ||
                    p.name.toLowerCase() === ticket.projectName.toLowerCase()
                );

                const ticketTotalValue = ticket.items.reduce((sum, line) => {
                  const invMatch = items.find(
                    (inv) =>
                      inv.id === line.itemId ||
                      (inv.assetId && inv.assetId === line.assetId) ||
                      inv.description.toLowerCase() === line.description.toLowerCase()
                  );
                  const price = line.unitPrice || invMatch?.unitPrice || 0;
                  return sum + line.quantity * price;
                }, 0);

                return (
                  <div
                    key={ticket.id}
                    className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden transition-all hover:border-teal-300"
                  >
                    {/* Card Header Row */}
                    <div className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="flex items-start space-x-3.5">
                        <div className="p-2.5 rounded-xl bg-teal-50 text-teal-700 border border-teal-200 shrink-0 mt-0.5">
                          <RotateCcw className="w-5 h-5" />
                        </div>
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-xs font-bold text-teal-800 bg-teal-50 px-2.5 py-0.5 rounded-md border border-teal-200">
                              {ticket.id}
                            </span>
                            <span className="font-bold text-sm text-slate-900">
                              {ticket.projectName}
                            </span>
                            {(ticket.projectLocation || ticket.location) && (
                              <span className="text-[11px] text-slate-500 flex items-center space-x-1">
                                <MapPin className="w-3 h-3 text-slate-400" />
                                <span>{ticket.projectLocation || ticket.location}</span>
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                            <span>
                              <strong>Date:</strong> {ticket.date}
                            </span>
                            <span>
                              <strong>Returned To:</strong> {ticket.returnedToWarehouse || ticket.returnedTo || 'Main Bodega'}
                            </span>
                            <span>
                              <strong>Retrieved By:</strong> {ticket.retrievedBy}
                            </span>
                            <span>
                              <strong>Received By:</strong> {ticket.receivedBy}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right KPI & Action Buttons */}
                      <div className="flex flex-wrap items-center justify-between lg:justify-end gap-3 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                        <div className="flex items-center space-x-4 text-right">
                          <div>
                            <span className="text-[10px] uppercase font-bold text-slate-400 block">
                              Returned Items
                            </span>
                            <span className="text-xs font-bold text-slate-900">
                              {ticket.items.length} lines ({totalUnits} pcs)
                            </span>
                          </div>
                          {ticketTotalValue > 0 && (
                            <div>
                              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                                Est. Value
                              </span>
                              <span className="text-xs font-mono font-bold text-teal-800">
                                {formatCurrency(ticketTotalValue)}
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center space-x-2">
                          {/* Toggle Expand Line Items Button */}
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedRetrieveTicketId(isExpanded ? null : ticket.id)
                            }
                            className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-200 flex items-center space-x-1 transition-colors cursor-pointer"
                          >
                            <span>{isExpanded ? 'Hide Items' : 'View Items'}</span>
                            {isExpanded ? (
                              <ChevronUp className="w-3.5 h-3.5" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5" />
                            )}
                          </button>

                          {/* Download PDF Form Button */}
                          <button
                            type="button"
                            onClick={() => generateRetrievePDF({ ticket, project: relatedProject })}
                            className="px-3 py-1.5 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-2xs hover:shadow transition-all flex items-center space-x-1.5 cursor-pointer"
                            title="Download Material Return Slip PDF"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>PDF Form</span>
                          </button>

                          {/* Delete Slip Record Button */}
                          {onDeleteRetrieveTicket && (
                            <button
                              type="button"
                              onClick={() => {
                                if (
                                  window.confirm(
                                    `Burahin ang Retrieve Ticket ${ticket.id} (${ticket.projectName})?`
                                  )
                                ) {
                                  onDeleteRetrieveTicket(ticket.id, false);
                                }
                              }}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Delete this ticket"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Expanded Items Table */}
                    {isExpanded && (
                      <div className="px-4 sm:px-6 pb-5 pt-2 bg-slate-50/70 border-t border-slate-200">
                        <div className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5 flex items-center justify-between">
                          <span>List of Retrieved Materials & Tools:</span>
                          <span className="text-[11px] text-slate-500 font-normal">
                            Reason: {ticket.reasonForReturn || ticket.notes || 'Excess / Unused Materials'}
                          </span>
                        </div>

                        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="bg-slate-100/90 text-slate-700 border-b border-slate-200 text-[11px]">
                                <th className="py-2 px-3 font-bold w-12 text-center">#</th>
                                <th className="py-2 px-3 font-bold">Asset ID / Code</th>
                                <th className="py-2 px-3 font-bold">Item Description</th>
                                <th className="py-2 px-3 font-bold text-center">Qty Returned</th>
                                <th className="py-2 px-3 font-bold text-center">Unit</th>
                                <th className="py-2 px-3 font-bold">Condition Status</th>
                                <th className="py-2 px-3 font-bold">Remarks / Notes</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {ticket.items.map((line, idx) => {
                                const condStr = line.condition || 'Good / Unused';
                                const isGood = condStr.includes('Good') || condStr.includes('Excess');
                                const isRepair = condStr.includes('Repair');
                                const isDamaged = condStr.includes('Damaged') || condStr.includes('Scrap');

                                return (
                                  <tr key={idx} className="hover:bg-slate-50/80">
                                    <td className="py-2 px-3 text-center text-slate-400 font-mono text-[11px]">
                                      {idx + 1}
                                    </td>
                                    <td className="py-2 px-3 font-mono text-[11px] text-teal-800 font-semibold">
                                      {line.assetId || '-'}
                                    </td>
                                    <td className="py-2 px-3 font-semibold text-slate-900">
                                      {line.description}
                                    </td>
                                    <td className="py-2 px-3 text-center font-bold text-teal-900 font-mono">
                                      +{line.quantity}
                                    </td>
                                    <td className="py-2 px-3 text-center text-slate-600 font-medium">
                                      {line.unit || 'pcs'}
                                    </td>
                                    <td className="py-2 px-3">
                                      <span
                                        className={`inline-block px-2 py-0.5 text-[10px] font-bold rounded-md border ${
                                          isGood
                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                            : isRepair
                                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                                            : isDamaged
                                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                                            : 'bg-slate-100 text-slate-700 border-slate-200'
                                        }`}
                                      >
                                        {line.condition || 'Good / Unused'}
                                      </span>
                                    </td>
                                    <td className="py-2 px-3 text-slate-500 text-[11px]">
                                      {line.remarks || '-'}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })()}
      </div>

      {/* Project Details & Cost Breakdown Modal */}
      <ProjectDetailsModal
        isOpen={!!selectedProjectForDetails}
        onClose={() => setSelectedProjectForDetails(null)}
        project={selectedProjectForDetails}
        pullOutTickets={pullOutTickets}
        deploymentTickets={deploymentTickets}
        retrieveTickets={retrieveTickets}
        inventoryItems={items}
        onOpenAddPullOutForProject={onOpenAddPullOutForProject}
        onOpenAddDeploymentForProject={onOpenAddDeploymentForProject}
        onOpenAddRetrieveForProject={(projectId) => {
          if (onOpenAddRetrieveModal) onOpenAddRetrieveModal(projectId);
        }}
        onUpdateProject={(updated) => {
          if (onUpdateProject) onUpdateProject(updated);
          setSelectedProjectForDetails(updated);
        }}
      />

      {/* Direct Card Delete with Password Confirmation Modal */}
      {projectToSecureDelete && (
        <div
          id="secure-delete-project-modal-backdrop"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setProjectToSecureDelete(null);
            }
          }}
        >
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="bg-slate-900 px-5 py-4 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">Delete Project Record</h3>
                  <p className="text-xs text-slate-400">Admin Security Password Required</p>
                </div>
              </div>
              <button
                onClick={() => setProjectToSecureDelete(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleConfirmSecureDelete} className="p-5 space-y-4">
              <div className="p-3 bg-rose-50/80 border border-rose-200 rounded-xl space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-[11px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded">
                    {projectToSecureDelete.id}
                  </span>
                  <span className="font-bold text-xs text-rose-950 truncate">
                    {projectToSecureDelete.name}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600">
                  Sigurado ka ba na gusto mong burahin ang project na ito? Hindi na ito mababawi kapag nabura.
                </p>
              </div>

              {/* Password Input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1">
                  <Lock className="w-3.5 h-3.5 text-rose-600" />
                  <span>Ilagay ang Password</span>
                </label>
                <div className="relative">
                  <input
                    type={showCardPassword ? 'text' : 'password'}
                    value={cardPasswordInput}
                    onChange={(e) => {
                      setCardPasswordInput(e.target.value);
                      if (cardPasswordError) setCardPasswordError('');
                    }}
                    placeholder="Enter password..."
                    autoFocus
                    className={`w-full pl-3 pr-10 py-2 text-xs bg-slate-50 border rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 font-mono ${
                      cardPasswordError ? 'border-red-500 bg-red-50/40' : 'border-slate-300'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCardPassword(!showCardPassword)}
                    className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
                  >
                    {showCardPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {cardPasswordError && (
                  <p className="text-xs text-red-600 font-semibold">{cardPasswordError}</p>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setProjectToSecureDelete(null)}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm flex items-center space-x-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Confirm Delete</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
