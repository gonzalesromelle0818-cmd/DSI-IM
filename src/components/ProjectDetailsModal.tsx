import React, { useState } from 'react';
import {
  X,
  Building2,
  MapPin,
  User,
  Calendar,
  Layers,
  PackageOpen,
  Users,
  Banknote,
  FileDown,
  Printer,
  Search,
  ExternalLink,
  Plus,
  ArrowUpRight,
  ShieldCheck,
  Truck,
  HardHat,
  FileText,
  Clock,
  CheckCircle2,
  DollarSign,
  PieChart,
  CheckSquare,
  Square,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  LayoutGrid,
  Trash2,
  Edit2,
  Save,
  AlertCircle,
  Percent,
  RotateCcw,
  Warehouse,
  Download,
} from 'lucide-react';
import {
  Project,
  PullOutTicket,
  DeploymentTicket,
  InventoryItem,
  WindowDoorItem,
  ProjectMilestone,
  RetrieveTicket,
} from '../types';
import { formatCurrency } from '../utils/inventoryHelpers';
import { generateProjectCostPDF } from '../utils/generateProjectCostPDF';
import { generateRetrievePDF } from '../utils/generateRetrievePDF';
import {
  calculateProjectProgress,
  getInitialProjectChecklist,
  DEFAULT_PROJECT_MILESTONES,
} from '../utils/projectMilestones';

interface ProjectDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project | null;
  pullOutTickets: PullOutTicket[];
  deploymentTickets: DeploymentTicket[];
  retrieveTickets?: RetrieveTicket[];
  inventoryItems: InventoryItem[];
  onOpenAddPullOutForProject?: (projectId: string) => void;
  onOpenAddDeploymentForProject?: (projectId: string) => void;
  onOpenAddRetrieveForProject?: (projectId: string) => void;
  onUpdateProject?: (updatedProject: Project) => void;
}

export const ProjectDetailsModal: React.FC<ProjectDetailsModalProps> = ({
  isOpen,
  onClose,
  project,
  pullOutTickets,
  deploymentTickets,
  retrieveTickets = [],
  inventoryItems,
  onOpenAddPullOutForProject,
  onOpenAddDeploymentForProject,
  onOpenAddRetrieveForProject,
  onUpdateProject,
}) => {
  const [activeTab, setActiveTab] = useState<'checklist' | 'windows_doors' | 'overview' | 'materials' | 'manpower' | 'retrieved' | 'report'>('checklist');
  const [materialSearch, setMaterialSearch] = useState('');
  const [materialCategoryFilter, setMaterialCategoryFilter] = useState('all');
  const [deploymentSearch, setDeploymentSearch] = useState('');
  const [retrieveSearch, setRetrieveSearch] = useState('');
  const [expandedRetrieveId, setExpandedRetrieveId] = useState<string | null>(null);

  
  // Accordion toggle for Milestone #9 Windows/Doors dropdown
  const [isMilestone9Expanded, setIsMilestone9Expanded] = useState(true);

  // New Window/Door item form inside modal
  const [showAddWindowModal, setShowAddWindowModal] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [newType, setNewType] = useState<'Window' | 'Door' | 'Curtain Wall' | 'Glass Partition' | 'Louvers' | 'Other'>('Window');
  const [newQty, setNewQty] = useState<number>(1);
  const [newHeight, setNewHeight] = useState('2100');
  const [newWidth, setNewWidth] = useState('1800');
  const [newLocation, setNewLocation] = useState('');
  const [newRemarks, setNewRemarks] = useState('');

  if (!isOpen || !project) return null;

  const pId = (project.id || '').trim().toLowerCase();
  const pName = (project.name || '').trim().toLowerCase();

  // Ensure project checklist is initialized
  const checklist: ProjectMilestone[] = getInitialProjectChecklist(project.checklist);
  const windowsDoors: WindowDoorItem[] = project.windowsDoors || [];

  // Calculate project progress stats
  const progressStats = calculateProjectProgress({
    ...project,
    checklist,
    windowsDoors,
  });

  // Filter Pull-Out tickets for this project
  const projectPullOuts = pullOutTickets.filter((t) => {
    const tId = (t.projectId || '').trim().toLowerCase();
    const tName = (t.projectName || '').trim().toLowerCase();
    return (
      (tId && tId === pId) ||
      (tName && tName === pName) ||
      (tId && tId === pName) ||
      (tName && tName === pId)
    );
  });

  // Filter Deployment tickets for this project
  const projectDeployments = deploymentTickets.filter((t) => {
    const tId = (t.projectId || '').trim().toLowerCase();
    const tName = (t.projectName || '').trim().toLowerCase();
    return (
      (tId && tId === pId) ||
      (tName && tName === pName) ||
      (tId && tId === pName) ||
      (tName && tName === pId)
    );
  });

  // Filter Retrieve tickets for this project
  const projectRetrieves = (retrieveTickets || []).filter((t) => {
    const tId = (t.projectId || '').trim().toLowerCase();
    const tName = (t.projectName || '').trim().toLowerCase();
    return (
      (tId && tId === pId) ||
      (tName && tName === pName) ||
      (tId && tId === pName) ||
      (tName && tName === pId)
    );
  });

  const totalRetrievedUnits = projectRetrieves.reduce(
    (sum, t) => sum + t.items.reduce((s, i) => s + (i.quantity || 0), 0),
    0
  );

  const totalRetrievedValue = projectRetrieves.reduce((sum, t) => {
    return (
      sum +
      t.items.reduce((s, line) => {
        const invMatch = inventoryItems.find(
          (inv) =>
            inv.id === line.itemId ||
            (inv.assetId && inv.assetId === line.assetId) ||
            inv.description.toLowerCase() === line.description.toLowerCase()
        );
        const price = line.unitPrice || invMatch?.unitPrice || 0;
        return s + line.quantity * price;
      }, 0)
    );
  }, 0);

  // Flatten material items
  interface FlatMaterialItem {
    ticketId: string;
    ticketDate: string;
    requestedBy: string;
    itemId: string;
    assetId: string;
    description: string;
    category: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    totalCost: number;
  }

  const flatMaterials: FlatMaterialItem[] = [];
  let totalMaterialCost = 0;
  let totalMaterialUnits = 0;

  projectPullOuts.forEach((ticket) => {
    ticket.items.forEach((item) => {
      let price = item.unitPrice || 0;
      if (price === 0 && inventoryItems.length > 0) {
        const invItem = inventoryItems.find(
          (i) =>
            (item.itemId && i.id.toLowerCase() === item.itemId.toLowerCase()) ||
            (item.assetId && i.assetId.toLowerCase() === item.assetId.toLowerCase()) ||
            (item.description && i.description.toLowerCase() === item.description.toLowerCase())
        );
        if (invItem && invItem.unitPrice) {
          price = invItem.unitPrice;
        }
      }
      const lineCost = item.quantity * price;
      totalMaterialCost += lineCost;
      totalMaterialUnits += item.quantity;

      flatMaterials.push({
        ticketId: ticket.id,
        ticketDate: ticket.date,
        requestedBy: ticket.requestedBy,
        itemId: item.itemId,
        assetId: item.assetId,
        description: item.description,
        category: item.category,
        quantity: item.quantity,
        unit: item.unit,
        unitPrice: price,
        totalCost: lineCost,
      });
    });
  });

  // Fallback: Check item.projectAllocations if no pull-out tickets
  if (flatMaterials.length === 0 && inventoryItems.length > 0) {
    inventoryItems.forEach((invItem) => {
      if (invItem.projectAllocations) {
        invItem.projectAllocations.forEach((alloc) => {
          const aId = (alloc.projectId || '').trim().toLowerCase();
          const aName = (alloc.projectName || '').trim().toLowerCase();
          if (
            (aId && aId === pId) ||
            (aName && aName === pName) ||
            (aId && aId === pName) ||
            (aName && aName === pId)
          ) {
            const price = invItem.unitPrice || 0;
            const lineCost = alloc.quantity * price;
            totalMaterialCost += lineCost;
            totalMaterialUnits += alloc.quantity;

            flatMaterials.push({
              ticketId: 'ALLOC-DIRECT',
              ticketDate: alloc.allocatedDate || 'Recorded',
              requestedBy: alloc.leadPerson || project.leadPerson || 'Project Staff',
              itemId: invItem.id,
              assetId: invItem.assetId,
              description: invItem.description,
              category: invItem.category,
              quantity: alloc.quantity,
              unit: invItem.unit,
              unitPrice: price,
              totalCost: lineCost,
            });
          }
        });
      }
    });
  }

  // Calculate manpower stats
  let totalLaborCost = 0;
  let totalMobilizationCost = 0;
  let totalHeadsDeployed = 0;

  projectDeployments.forEach((dep) => {
    totalLaborCost += dep.laborCost || 0;
    totalMobilizationCost += dep.mobilizationCost || 0;
    const heads = dep.lines.reduce((acc, l) => acc + (l.quantity || 0), 0);
    totalHeadsDeployed += heads;
  });

  const totalDeploymentCost = totalLaborCost + totalMobilizationCost;
  const netMaterialCost = Math.max(0, totalMaterialCost - totalRetrievedValue);
  const netMaterialUnits = Math.max(0, totalMaterialUnits - totalRetrievedUnits);
  const grandTotalCost = netMaterialCost + totalDeploymentCost;

  // Percentage calculations
  const matPercent = grandTotalCost > 0 ? Math.round((netMaterialCost / grandTotalCost) * 100) : 0;
  const laborPercent = grandTotalCost > 0 ? Math.round((totalLaborCost / grandTotalCost) * 100) : 0;
  const mobPercent = grandTotalCost > 0 ? Math.round((totalMobilizationCost / grandTotalCost) * 100) : 0;

  // Handlers for Checklist Updates
  const handleToggleMilestone = (milestoneNo: number) => {
    if (!onUpdateProject) return;

    const todayStr = new Date().toISOString().slice(0, 10);
    const updatedChecklist = checklist.map((m) => {
      if (m.no === milestoneNo) {
        const nextState = !m.completed;
        return {
          ...m,
          completed: nextState,
          completedDate: nextState ? m.completedDate || todayStr : undefined,
        };
      }
      return m;
    });

    onUpdateProject({
      ...project,
      checklist: updatedChecklist,
    });
  };

  const handleToggleWindowInstalled = (windowDoorId: string) => {
    if (!onUpdateProject) return;

    const todayStr = new Date().toISOString().slice(0, 10);
    const updatedWindows = windowsDoors.map((w) => {
      if (w.id === windowDoorId) {
        const nextInstalled = !w.isInstalled;
        return {
          ...w,
          isInstalled: nextInstalled,
          installedQty: nextInstalled ? w.qty : 0,
          installedDate: nextInstalled ? todayStr : undefined,
        };
      }
      return w;
    });

    // Check if all windows are installed to sync milestone #9
    const allDone = updatedWindows.length > 0 && updatedWindows.every((w) => w.isInstalled);
    const updatedChecklist = checklist.map((m) => {
      if (m.no === 9) {
        return {
          ...m,
          completed: allDone,
          completedDate: allDone ? todayStr : m.completedDate,
        };
      }
      return m;
    });

    onUpdateProject({
      ...project,
      windowsDoors: updatedWindows,
      checklist: updatedChecklist,
    });
  };

  const handleAddWindowDoorSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onUpdateProject) return;

    const count = windowsDoors.length + 1;
    const tag = newTag.trim() || `${newType === 'Window' ? 'W' : 'D'}-${count}`;

    const newItem: WindowDoorItem = {
      id: `WD-${Date.now()}-${count}`,
      tag,
      type: newType,
      qty: Math.max(1, newQty || 1),
      height: newHeight.trim() || '2100',
      width: newWidth.trim() || (newType === 'Window' ? '1800' : '900'),
      unit: 'mm',
      location: newLocation.trim() || undefined,
      remarks: newRemarks.trim() || undefined,
      isInstalled: false,
      installedQty: 0,
    };

    const updatedWindows = [...windowsDoors, newItem];

    onUpdateProject({
      ...project,
      windowsDoors: updatedWindows,
    });

    // Reset and close
    setNewTag('');
    setNewQty(1);
    setNewHeight('2100');
    setNewWidth('1800');
    setNewLocation('');
    setNewRemarks('');
    setShowAddWindowModal(false);
  };

  const handleRemoveWindowDoorItem = (windowDoorId: string) => {
    if (!onUpdateProject) return;
    const updatedWindows = windowsDoors.filter((w) => w.id !== windowDoorId);
    onUpdateProject({
      ...project,
      windowsDoors: updatedWindows,
    });
  };

  // Filter materials
  const filteredMaterials = flatMaterials.filter((m) => {
    const q = materialSearch.toLowerCase();
    const matchesSearch =
      m.assetId.toLowerCase().includes(q) ||
      m.description.toLowerCase().includes(q) ||
      m.ticketId.toLowerCase().includes(q) ||
      m.category.toLowerCase().includes(q);
    const matchesCat =
      materialCategoryFilter === 'all' ? true : m.category === materialCategoryFilter;
    return matchesSearch && matchesCat;
  });

  // Filter deployments
  const filteredDeployments = projectDeployments.filter((d) => {
    const q = deploymentSearch.toLowerCase();
    return (
      d.id.toLowerCase().includes(q) ||
      d.deploymentDate.includes(q) ||
      (d.supervisor && d.supervisor.toLowerCase().includes(q)) ||
      (d.projectManager && d.projectManager.toLowerCase().includes(q)) ||
      (d.preparedBy && d.preparedBy.toLowerCase().includes(q)) ||
      d.lines.some((l) => l.role.toLowerCase().includes(q))
    );
  });

  // Handle PDF Generation
  const handleDownloadPDF = () => {
    generateProjectCostPDF({
      project,
      pullOutTickets,
      deploymentTickets,
      retrieveTickets,
      inventoryItems,
      preparedBy: "M' Chrissna / Maricel",
      supervisor: project.leadPerson,
      projectManager: 'Engr. Roberto Santos',
    });
  };

  const statusColors = {
    Active: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    Planning: 'bg-blue-50 text-blue-800 border-blue-200',
    'On Hold': 'bg-amber-50 text-amber-800 border-amber-200',
    Completed: 'bg-slate-100 text-slate-700 border-slate-200',
  };

  return (
    <div
      id="project-details-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="project-details-modal-container"
        className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl border border-slate-200 flex flex-col my-4 max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Modal Header */}
        <div className="bg-slate-900 text-white p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded bg-teal-500/20 text-teal-300 border border-teal-500/30">
                {project.id}
              </span>
              <span
                className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
                  statusColors[project.status || 'Active'] || 'bg-emerald-50 text-emerald-800'
                }`}
              >
                {project.status || 'Active'}
              </span>
              <span className="text-xs text-slate-400">
                Created: {project.createdAt || 'Standard Site'}
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <Building2 className="w-6 h-6 text-teal-400 flex-shrink-0" />
              <span>{project.name}</span>
            </h2>

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300 pt-0.5">
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-teal-400" />
                <span>{project.location || 'No location set'}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-teal-400" />
                <span>Lead: <strong>{project.leadPerson || 'Unassigned'}</strong></span>
              </div>
              <div className="flex items-center gap-1.5 text-teal-300 font-medium">
                <Percent className="w-3.5 h-3.5" />
                <span>Completion: <strong className="text-white font-bold">{progressStats.percentage}%</strong></span>
              </div>
            </div>
          </div>

          {/* Action Buttons in Header */}
          <div className="flex items-center gap-2 self-end sm:self-center">
            <button
              onClick={handleDownloadPDF}
              className="px-3.5 py-2 text-xs font-bold text-slate-900 bg-teal-400 hover:bg-teal-300 rounded-xl shadow-xs transition-colors flex items-center space-x-1.5 cursor-pointer"
              title="Download Full Project Cost Report PDF"
            >
              <FileDown className="w-4 h-4" />
              <span className="hidden sm:inline">Download Cost Report</span>
              <span className="sm:hidden">PDF Report</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Progress & Milestone Overview Banner */}
        <div className="bg-slate-900/95 text-white px-5 sm:px-6 py-3 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3 flex-1">
            <div className="w-12 h-12 rounded-xl bg-teal-500/20 border border-teal-400/40 flex flex-col items-center justify-center text-teal-300 font-black shrink-0">
              <span className="text-sm leading-none">{Math.round(progressStats.percentage)}%</span>
              <span className="text-[9px] uppercase font-bold tracking-wider text-slate-400 mt-0.5">Done</span>
            </div>

            <div className="flex-1 min-w-[200px]">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-semibold text-slate-200">100% Progress Milestone Status</span>
                <span className="text-teal-400 font-bold">{progressStats.completedMilestonesCount} of {progressStats.totalMilestonesCount} Milestones Done</span>
              </div>
              <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                <div
                  className="h-full bg-gradient-to-r from-teal-500 to-emerald-400 rounded-full transition-all duration-300"
                  style={{ width: `${progressStats.percentage}%` }}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3 text-xs text-slate-300 shrink-0 border-t sm:border-t-0 sm:border-l border-slate-800 pt-2 sm:pt-0 sm:pl-4">
            <div>
              <span className="text-slate-400 block text-[10px] uppercase">Windows & Doors</span>
              <span className="font-bold text-white">
                {progressStats.installedWindowsDoorsUnits} / {progressStats.totalWindowsDoorsUnits} Units Installed ({progressStats.installationProgressPercent}%)
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase">Total Cost</span>
              <span className="font-bold text-teal-400">{formatCurrency(grandTotalCost)}</span>
            </div>
          </div>
        </div>

        {/* Financial Highlights KPI Strip */}
        <div className="bg-slate-50 border-b border-slate-200 px-5 sm:px-6 py-3.5 grid grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Card 1: Materials Pull Out Cost (Net) */}
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 mb-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wider">
                {totalRetrievedValue > 0 ? 'Net Materials' : 'Materials Pulled Out'}
              </span>
              <PackageOpen className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-base font-extrabold text-slate-900">
              {formatCurrency(netMaterialCost)}
            </div>
            <div className="text-[11px] text-slate-500">
              {totalRetrievedValue > 0 ? (
                <span className="text-emerald-700 font-semibold">
                  -{formatCurrency(totalRetrievedValue)} returned ({totalRetrievedUnits}u)
                </span>
              ) : (
                `${totalMaterialUnits} unit(s) • ${projectPullOuts.length} ticket(s)`
              )}
            </div>
          </div>

          {/* Card 2: Manpower Labor Cost */}
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 mb-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wider">Manpower Labor</span>
              <Users className="w-4 h-4 text-teal-600" />
            </div>
            <div className="text-base font-extrabold text-slate-900">
              {formatCurrency(totalLaborCost)}
            </div>
            <div className="text-[11px] text-slate-500">
              {totalHeadsDeployed} heads deployed
            </div>
          </div>

          {/* Card 3: Mobilization Cost */}
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 mb-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wider">Mobilization & Logistics</span>
              <Truck className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-base font-extrabold text-slate-900">
              {formatCurrency(totalMobilizationCost)}
            </div>
            <div className="text-[11px] text-slate-500">
              Transpo & logistics
            </div>
          </div>

          {/* Card 4: Grand Total Project Expense */}
          <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200 shadow-2xs">
            <div className="flex items-center justify-between text-emerald-700 mb-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wider">Grand Total Expense</span>
              <Banknote className="w-4 h-4 text-emerald-700" />
            </div>
            <div className="text-base font-black text-emerald-900">
              {formatCurrency(grandTotalCost)}
            </div>
            <div className="text-[11px] text-emerald-700 font-semibold">
              Total project cost to date
            </div>
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="px-5 sm:px-6 pt-2 bg-white border-b border-slate-200 flex items-center justify-between gap-4 overflow-x-auto">
          <div className="flex items-center space-x-1 sm:space-x-1.5">
            <button
              onClick={() => setActiveTab('checklist')}
              className={`px-3 py-2 text-xs font-bold border-b-2 transition-all flex items-center space-x-1.5 whitespace-nowrap cursor-pointer ${
                activeTab === 'checklist'
                  ? 'border-teal-600 text-teal-800 bg-teal-50/70 rounded-t-lg'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <CheckSquare className="w-4 h-4 text-teal-600" />
              <span>Project Progress Checklist ({progressStats.percentage}%)</span>
            </button>

            <button
              onClick={() => setActiveTab('windows_doors')}
              className={`px-3 py-2 text-xs font-bold border-b-2 transition-all flex items-center space-x-1.5 whitespace-nowrap cursor-pointer ${
                activeTab === 'windows_doors'
                  ? 'border-blue-600 text-blue-800 bg-blue-50/70 rounded-t-lg'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <LayoutGrid className="w-4 h-4 text-blue-600" />
              <span>Windows & Doors Schedule ({windowsDoors.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('overview')}
              className={`px-3 py-2 text-xs font-bold border-b-2 transition-all flex items-center space-x-1.5 whitespace-nowrap cursor-pointer ${
                activeTab === 'overview'
                  ? 'border-teal-600 text-teal-800 bg-teal-50/70 rounded-t-lg'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <PieChart className="w-4 h-4 text-teal-600" />
              <span>Cost Summary</span>
            </button>

            <button
              onClick={() => setActiveTab('materials')}
              className={`px-3 py-2 text-xs font-bold border-b-2 transition-all flex items-center space-x-1.5 whitespace-nowrap cursor-pointer ${
                activeTab === 'materials'
                  ? 'border-slate-800 text-slate-900 bg-slate-100 rounded-t-lg'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <PackageOpen className="w-4 h-4 text-slate-600" />
              <span>Materials Pulled Out ({flatMaterials.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('manpower')}
              className={`px-3 py-2 text-xs font-bold border-b-2 transition-all flex items-center space-x-1.5 whitespace-nowrap cursor-pointer ${
                activeTab === 'manpower'
                  ? 'border-slate-800 text-slate-900 bg-slate-100 rounded-t-lg'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <HardHat className="w-4 h-4 text-slate-600" />
              <span>Manpower Deployments ({projectDeployments.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('retrieved')}
              className={`px-3 py-2 text-xs font-bold border-b-2 transition-all flex items-center space-x-1.5 whitespace-nowrap cursor-pointer ${
                activeTab === 'retrieved'
                  ? 'border-emerald-600 text-emerald-800 bg-emerald-50/70 rounded-t-lg'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <RotateCcw className="w-4 h-4 text-emerald-600" />
              <span>Retrieved Items ({projectRetrieves.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('report')}
              className={`px-3 py-2 text-xs font-bold border-b-2 transition-all flex items-center space-x-1.5 whitespace-nowrap cursor-pointer ${
                activeTab === 'report'
                  ? 'border-indigo-600 text-indigo-800 bg-indigo-50/70 rounded-t-lg'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <FileText className="w-4 h-4 text-indigo-600" />
              <span>Cost Report & PDF</span>
            </button>
          </div>
        </div>

        {/* Tab Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 bg-slate-50/50 space-y-5">
          {/* TAB 1: 14-POINT PROJECT PROGRESS CHECKLIST */}
          {activeTab === 'checklist' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                    <span>Windows & Doors Project — Project Progress Checklist</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Click checkboxes to update milestone completion. Milestone #9 expands into a dropdown checklist with each window and door unit.
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold px-3 py-1 bg-teal-50 text-teal-800 border border-teal-200 rounded-lg">
                    Total Progress: {progressStats.percentage}% / 100%
                  </span>
                </div>
              </div>

              {/* Checklist Table (Exact format as uploaded image) */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-900 text-white uppercase tracking-wider font-semibold">
                        <th className="py-3 px-4 w-14 text-center">No.</th>
                        <th className="py-3 px-4 min-w-[280px]">Activity / Milestone</th>
                        <th className="py-3 px-4 w-28 text-center">Weight</th>
                        <th className="py-3 px-4 w-28 text-center">Earned %</th>
                        <th className="py-3 px-4 w-24 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                      {progressStats.milestoneScores.map((m) => {
                        const isM9 = m.no === 9;

                        return (
                          <React.Fragment key={m.no}>
                            <tr
                              className={`transition-colors ${
                                m.completed
                                  ? 'bg-emerald-50/40 hover:bg-emerald-50/70'
                                  : isM9 && progressStats.installedWindowsDoorsUnits > 0
                                  ? 'bg-teal-50/30 hover:bg-teal-50/50'
                                  : 'hover:bg-slate-50'
                              }`}
                            >
                              {/* No. */}
                              <td className="py-3 px-4 text-center font-mono font-bold text-slate-600">
                                {m.no}
                              </td>

                              {/* Activity Name */}
                              <td className="py-3 px-4">
                                <div className="flex items-center justify-between gap-2">
                                  <span className={`font-semibold ${m.completed ? 'text-emerald-950 font-bold' : 'text-slate-800'}`}>
                                    {m.activity}
                                  </span>

                                  {/* Expand/Collapse Dropdown trigger for Milestone 9 */}
                                  {isM9 && (
                                    <button
                                      type="button"
                                      onClick={() => setIsMilestone9Expanded(!isMilestone9Expanded)}
                                      className="px-2 py-0.5 text-[11px] font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-md transition-colors flex items-center space-x-1 cursor-pointer"
                                      title="Toggle Windows & Doors sub-checklist"
                                    >
                                      <span>Dropdown Checklist ({windowsDoors.length} items)</span>
                                      {isMilestone9Expanded ? (
                                        <ChevronDown className="w-3.5 h-3.5" />
                                      ) : (
                                        <ChevronRight className="w-3.5 h-3.5" />
                                      )}
                                    </button>
                                  )}
                                </div>
                              </td>

                              {/* Weight */}
                              <td className="py-3 px-4 text-center font-bold text-slate-700">
                                {m.weight}%
                              </td>

                              {/* Earned % */}
                              <td className="py-3 px-4 text-center">
                                <span
                                  className={`inline-block font-mono font-bold px-2 py-0.5 rounded text-xs ${
                                    m.earned === m.weight
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : m.earned > 0
                                      ? 'bg-teal-100 text-teal-800'
                                      : 'bg-slate-100 text-slate-500'
                                  }`}
                                >
                                  {m.earned}%
                                </span>
                              </td>

                              {/* Checkbox Status */}
                              <td className="py-3 px-4 text-center">
                                {isM9 && windowsDoors.length > 0 ? (
                                  <button
                                    type="button"
                                    onClick={() => setIsMilestone9Expanded(!isMilestone9Expanded)}
                                    className="p-1 rounded text-teal-600 hover:text-teal-800 cursor-pointer"
                                    title="View windows and doors installation progress below"
                                  >
                                    {m.completed ? (
                                      <CheckSquare className="w-5 h-5 text-emerald-600 mx-auto" />
                                    ) : m.earned > 0 ? (
                                      <span className="font-bold text-[11px] text-teal-700">
                                        {progressStats.installationProgressPercent}%
                                      </span>
                                    ) : (
                                      <Square className="w-5 h-5 text-slate-400 mx-auto" />
                                    )}
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleToggleMilestone(m.no)}
                                    className="p-1 rounded hover:bg-slate-200/60 transition-colors cursor-pointer"
                                    title={m.completed ? 'Mark as incomplete' : 'Mark milestone as completed'}
                                  >
                                    {m.completed ? (
                                      <CheckSquare className="w-5 h-5 text-emerald-600 mx-auto" />
                                    ) : (
                                      <Square className="w-5 h-5 text-slate-400 hover:text-slate-600 mx-auto" />
                                    )}
                                  </button>
                                )}
                              </td>
                            </tr>

                            {/* MILESTONE 9 EXPANDABLE DROPDOWN SUB-CHECKLIST */}
                            {isM9 && isMilestone9Expanded && (
                              <tr className="bg-slate-900 text-slate-100">
                                <td colSpan={5} className="p-4">
                                  <div className="bg-[#0f1d2e] rounded-xl p-4 border border-slate-700/80 space-y-3">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-700">
                                      <div className="flex items-center space-x-2">
                                        <LayoutGrid className="w-4 h-4 text-teal-400" />
                                        <div>
                                          <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                                            Milestone #9 Installation Sub-Checklist (Weight: 25%)
                                          </h4>
                                          <p className="text-[11px] text-slate-400">
                                            Installed: <strong>{progressStats.installedWindowsDoorsUnits}</strong> of <strong>{progressStats.totalWindowsDoorsUnits}</strong> units ({progressStats.installationProgressPercent}% done • Earned: +{progressStats.installationWeightContribution}%)
                                          </p>
                                        </div>
                                      </div>

                                      <button
                                        type="button"
                                        onClick={() => setShowAddWindowModal(true)}
                                        className="px-2.5 py-1 text-xs font-bold bg-teal-600 hover:bg-teal-500 text-white rounded-lg transition-colors flex items-center space-x-1 cursor-pointer self-start sm:self-auto"
                                      >
                                        <Plus className="w-3.5 h-3.5" />
                                        <span>+ Add Window / Door</span>
                                      </button>
                                    </div>

                                    {windowsDoors.length === 0 ? (
                                      <div className="p-4 text-center bg-slate-900/60 rounded-lg border border-dashed border-slate-700 text-slate-400">
                                        <p className="text-xs font-medium text-slate-300">No windows or doors schedule added for this project yet.</p>
                                        <p className="text-[11px] text-slate-500 mt-1">
                                          Click <strong>"+ Add Window / Door"</strong> to specify quantities and dimensions, or check milestone 9 directly above.
                                        </p>
                                      </div>
                                    ) : (
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-64 overflow-y-auto pr-1">
                                        {windowsDoors.map((item) => {
                                          const isDone = item.isInstalled || false;

                                          return (
                                            <div
                                              key={item.id}
                                              className={`p-3 rounded-lg border transition-all flex items-start justify-between gap-3 ${
                                                isDone
                                                  ? 'bg-emerald-950/40 border-emerald-600/50 text-emerald-200'
                                                  : 'bg-slate-800/80 border-slate-700 text-slate-200 hover:border-slate-600'
                                              }`}
                                            >
                                              <div className="flex items-start space-x-2.5 flex-1 min-w-0">
                                                <button
                                                  type="button"
                                                  onClick={() => handleToggleWindowInstalled(item.id)}
                                                  className="mt-0.5 text-teal-400 hover:text-teal-300 cursor-pointer"
                                                  title={isDone ? 'Mark as pending installation' : 'Mark as installed on site'}
                                                >
                                                  {isDone ? (
                                                    <CheckSquare className="w-4 h-4 text-emerald-400" />
                                                  ) : (
                                                    <Square className="w-4 h-4 text-slate-400" />
                                                  )}
                                                </button>

                                                <div className="flex-1 min-w-0 text-xs">
                                                  <div className="flex items-center space-x-2">
                                                    <span className="font-bold text-white uppercase">{item.tag}</span>
                                                    <span className="px-1.5 py-0.2 rounded bg-slate-700 text-[10px] text-slate-300">{item.type}</span>
                                                    <span className="font-mono text-teal-300 font-bold">Qty: {item.qty}</span>
                                                  </div>
                                                  <div className="text-[11px] text-slate-400 mt-0.5">
                                                    Size: {item.height}mm (H) × {item.width}mm (W)
                                                    {item.location && ` • ${item.location}`}
                                                  </div>
                                                  {item.remarks && (
                                                    <div className="text-[10px] text-slate-400 italic truncate mt-0.5">
                                                      {item.remarks}
                                                    </div>
                                                  )}
                                                </div>
                                              </div>

                                              <div className="text-right shrink-0 flex flex-col items-end">
                                                <span
                                                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                                    isDone
                                                      ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-600/40'
                                                      : 'bg-amber-900/40 text-amber-300 border border-amber-600/30'
                                                  }`}
                                                >
                                                  {isDone ? '✓ Installed' : 'Pending'}
                                                </span>
                                                <button
                                                  type="button"
                                                  onClick={() => handleRemoveWindowDoorItem(item.id)}
                                                  className="mt-1 text-slate-400 hover:text-rose-400 p-1 cursor-pointer"
                                                  title="Delete this window schedule item"
                                                >
                                                  <Trash2 className="w-3 h-3" />
                                                </button>
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-900 text-white font-bold text-xs">
                        <td className="py-3 px-4 text-center">TOTAL</td>
                        <td className="py-3 px-4 font-bold">14 Project Milestones Completion</td>
                        <td className="py-3 px-4 text-center text-teal-300">100%</td>
                        <td className="py-3 px-4 text-center text-teal-300 font-mono text-sm">
                          {progressStats.percentage}%
                        </td>
                        <td className="py-3 px-4 text-center">
                          {progressStats.percentage === 100 ? (
                            <span className="text-emerald-400 font-bold">100% Complete</span>
                          ) : (
                            <span className="text-slate-400">{100 - progressStats.percentage}% Left</span>
                          )}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: WINDOWS & DOORS SCHEDULE */}
          {activeTab === 'windows_doors' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                    <LayoutGrid className="w-5 h-5 text-blue-600" />
                    <span>Windows & Doors Schedule ({progressStats.totalWindowsDoorsUnits} Total Units)</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Fabrication dimensions, glass specifications, and installation tracking.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowAddWindowModal(true)}
                  className="px-3.5 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-sm transition-colors flex items-center space-x-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Add Window / Door</span>
                </button>
              </div>

              {windowsDoors.length === 0 ? (
                <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-slate-400">
                  <LayoutGrid className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                  <p className="font-semibold text-slate-600">No windows or doors added to this project yet.</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Click the <strong>"+ Add Window / Door"</strong> button to specify quantities, height, and width.
                  </p>
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-900 text-white uppercase tracking-wider font-semibold">
                          <th className="py-3 px-3 w-10 text-center">Status</th>
                          <th className="py-3 px-3.5">Tag / Code</th>
                          <th className="py-3 px-3.5">Type</th>
                          <th className="py-3 px-3.5 text-center">Quantity</th>
                          <th className="py-3 px-3.5">Height (mm)</th>
                          <th className="py-3 px-3.5">Width (mm)</th>
                          <th className="py-3 px-3.5">Location / Floor</th>
                          <th className="py-3 px-3.5">Remarks / Specs</th>
                          <th className="py-3 px-3.5 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {windowsDoors.map((item) => {
                          const isDone = item.isInstalled || false;

                          return (
                            <tr
                              key={item.id}
                              className={`transition-colors ${
                                isDone ? 'bg-emerald-50/40 hover:bg-emerald-50/70' : 'hover:bg-slate-50'
                              }`}
                            >
                              <td className="py-3 px-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleToggleWindowInstalled(item.id)}
                                  className="cursor-pointer"
                                  title={isDone ? 'Mark as pending' : 'Mark as installed'}
                                >
                                  {isDone ? (
                                    <CheckSquare className="w-4 h-4 text-emerald-600 mx-auto" />
                                  ) : (
                                    <Square className="w-4 h-4 text-slate-400 mx-auto" />
                                  )}
                                </button>
                              </td>
                              <td className="py-3 px-3.5 font-bold text-slate-900 uppercase">
                                {item.tag}
                              </td>
                              <td className="py-3 px-3.5">
                                <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
                                  {item.type}
                                </span>
                              </td>
                              <td className="py-3 px-3.5 text-center font-bold text-teal-800">
                                {item.qty} {item.qty > 1 ? 'units' : 'unit'}
                              </td>
                              <td className="py-3 px-3.5 font-mono">{item.height}</td>
                              <td className="py-3 px-3.5 font-mono">{item.width}</td>
                              <td className="py-3 px-3.5 text-slate-600">{item.location || '—'}</td>
                              <td className="py-3 px-3.5 text-slate-600">{item.remarks || '—'}</td>
                              <td className="py-3 px-3.5 text-right">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveWindowDoorItem(item.id)}
                                  className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                                  title="Delete item"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
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
          )}

          {/* TAB 3: OVERVIEW & COST BREAKDOWN */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Cost Allocation Progress Bar */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <PieChart className="w-4 h-4 text-teal-600" />
                    <span>Cost Distribution Breakdown</span>
                  </h3>
                  <span className="text-xs font-bold text-slate-700">
                    Grand Total: {formatCurrency(grandTotalCost)}
                  </span>
                </div>

                {/* Progress multi-bar */}
                {grandTotalCost > 0 ? (
                  <div className="space-y-3">
                    <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden flex">
                      <div
                        className="bg-blue-500 transition-all duration-300"
                        style={{ width: `${matPercent}%` }}
                        title={`Materials: ${matPercent}%`}
                      />
                      <div
                        className="bg-teal-500 transition-all duration-300"
                        style={{ width: `${laborPercent}%` }}
                        title={`Labor: ${laborPercent}%`}
                      />
                      <div
                        className="bg-amber-500 transition-all duration-300"
                        style={{ width: `${mobPercent}%` }}
                        title={`Mobilization: ${mobPercent}%`}
                      />
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-blue-500" />
                        <span className="text-slate-600">Materials:</span>
                        <strong className="text-slate-900">{formatCurrency(totalMaterialCost)} ({matPercent}%)</strong>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-teal-500" />
                        <span className="text-slate-600">Labor:</span>
                        <strong className="text-slate-900">{formatCurrency(totalLaborCost)} ({laborPercent}%)</strong>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-amber-500" />
                        <span className="text-slate-600">Mobilization:</span>
                        <strong className="text-slate-900">{formatCurrency(totalMobilizationCost)} ({mobPercent}%)</strong>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="py-6 text-center text-slate-400 text-xs">
                    No pull-outs or manpower deployments recorded for this project yet.
                  </div>
                )}
              </div>

              {/* Quick Actions Panel */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
                  <div className="space-y-1.5">
                    <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <PackageOpen className="w-4 h-4 text-blue-600" />
                      <span>Pull Out Materials</span>
                    </h4>
                    <p className="text-xs text-slate-500">
                      Allocate additional tools, screws, or consumables from warehouse inventory for this project site.
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      if (onOpenAddPullOutForProject) {
                        onOpenAddPullOutForProject(project.id);
                      }
                    }}
                    className="mt-4 w-full py-2.5 px-4 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs rounded-lg border border-blue-200 transition-colors flex items-center justify-center space-x-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create Pull-Out</span>
                  </button>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
                  <div className="space-y-1.5">
                    <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <HardHat className="w-4 h-4 text-teal-600" />
                      <span>Deploy Manpower</span>
                    </h4>
                    <p className="text-xs text-slate-500">
                      Schedule supervisors, installers, and laborers along with mobilization logistics.
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      if (onOpenAddDeploymentForProject) {
                        onOpenAddDeploymentForProject(project.id);
                      }
                    }}
                    className="mt-4 w-full py-2.5 px-4 bg-teal-50 hover:bg-teal-100 text-teal-700 font-bold text-xs rounded-lg border border-teal-200 transition-colors flex items-center justify-center space-x-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create Deployment</span>
                  </button>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
                  <div className="space-y-1.5">
                    <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <RotateCcw className="w-4 h-4 text-emerald-600" />
                      <span>Retrieve Surplus Items</span>
                    </h4>
                    <p className="text-xs text-slate-500">
                      Return unused excess items, materials, or tools back to warehouse inventory stock.
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      if (onOpenAddRetrieveForProject) {
                        onOpenAddRetrieveForProject(project.id);
                      }
                    }}
                    className="mt-4 w-full py-2.5 px-4 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs rounded-lg border border-emerald-200 transition-colors flex items-center justify-center space-x-1.5 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Retrieve Surplus Items</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: MATERIALS PULLED OUT */}
          {activeTab === 'materials' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={materialSearch}
                    onChange={(e) => setMaterialSearch(e.target.value)}
                    placeholder="Search materials by code, description..."
                    className="w-full pl-9 pr-4 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div className="text-xs font-bold text-slate-700 bg-white px-3 py-1.5 rounded-lg border border-slate-200">
                  Total Materials Cost: <span className="text-teal-700">{formatCurrency(totalMaterialCost)}</span>
                </div>
              </div>

              {filteredMaterials.length === 0 ? (
                <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-slate-400 text-xs">
                  No materials recorded for this project.
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-900 text-white uppercase tracking-wider font-semibold">
                        <th className="py-3 px-3.5">Asset ID</th>
                        <th className="py-3 px-3.5">Description</th>
                        <th className="py-3 px-3.5">Category</th>
                        <th className="py-3 px-3.5 text-center">Qty Pulled Out</th>
                        <th className="py-3 px-3.5 text-right">Unit Price (₱)</th>
                        <th className="py-3 px-3.5 text-right">Total Cost (₱)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredMaterials.map((mat, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3.5 font-mono font-bold text-teal-800">{mat.assetId}</td>
                          <td className="py-2.5 px-3.5 font-medium text-slate-900">{mat.description}</td>
                          <td className="py-2.5 px-3.5">{mat.category}</td>
                          <td className="py-2.5 px-3.5 text-center font-bold">{mat.quantity} {mat.unit}</td>
                          <td className="py-2.5 px-3.5 text-right font-mono">{formatCurrency(mat.unitPrice)}</td>
                          <td className="py-2.5 px-3.5 text-right font-mono font-bold text-slate-900">{formatCurrency(mat.totalCost)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: MANPOWER & DEPLOYMENTS */}
          {activeTab === 'manpower' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={deploymentSearch}
                    onChange={(e) => setDeploymentSearch(e.target.value)}
                    placeholder="Search deployment tickets..."
                    className="w-full pl-9 pr-4 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div className="text-xs font-bold text-slate-700 bg-white px-3 py-1.5 rounded-lg border border-slate-200">
                  Total Manpower + Mob: <span className="text-teal-700">{formatCurrency(totalDeploymentCost)}</span>
                </div>
              </div>

              {filteredDeployments.length === 0 ? (
                <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-slate-400 text-xs">
                  No manpower deployment tickets recorded for this project.
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredDeployments.map((dep) => (
                    <div key={dep.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono font-bold text-xs text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                            {dep.id}
                          </span>
                          <span className="text-xs text-slate-600">
                            Date: <strong>{dep.deploymentDate}</strong> • {dep.daysCount} working days
                          </span>
                        </div>
                        <div className="text-xs font-bold text-slate-900">
                          Ticket Cost: <span className="text-emerald-700">{formatCurrency(dep.totalCost)}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-xs">
                        <div className="p-2 bg-slate-50 rounded-lg">
                          <span className="text-slate-500 block text-[10px] uppercase">Supervisor</span>
                          <strong className="text-slate-800">{dep.supervisor || dep.leadSupervisor || 'N/A'}</strong>
                        </div>
                        <div className="p-2 bg-slate-50 rounded-lg">
                          <span className="text-slate-500 block text-[10px] uppercase">Labor Subtotal</span>
                          <strong className="text-slate-800">{formatCurrency(dep.laborCost)}</strong>
                        </div>
                        <div className="p-2 bg-slate-50 rounded-lg">
                          <span className="text-slate-500 block text-[10px] uppercase">Mobilization</span>
                          <strong className="text-slate-800">{formatCurrency(dep.mobilizationCost)}</strong>
                        </div>
                        <div className="p-2 bg-slate-50 rounded-lg">
                          <span className="text-slate-500 block text-[10px] uppercase">Status</span>
                          <strong className="text-teal-700">{dep.status}</strong>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 6: RETRIEVED / RETURNED ITEMS */}
          {activeTab === 'retrieved' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={retrieveSearch}
                    onChange={(e) => setRetrieveSearch(e.target.value)}
                    placeholder="Search retrieved items or slip #..."
                    className="w-full pl-9 pr-4 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <div className="text-xs font-bold text-slate-700 bg-white px-3 py-1.5 rounded-lg border border-slate-200">
                    Restored Units: <span className="text-emerald-700">{totalRetrievedUnits} pcs</span>
                  </div>
                  {totalRetrievedValue > 0 && (
                    <div className="text-xs font-bold text-slate-700 bg-white px-3 py-1.5 rounded-lg border border-slate-200">
                      Restored Value: <span className="text-emerald-700 font-mono">{formatCurrency(totalRetrievedValue)}</span>
                    </div>
                  )}
                  {onOpenAddRetrieveForProject && (
                    <button
                      type="button"
                      onClick={() => onOpenAddRetrieveForProject(project.id)}
                      className="px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-2xs transition-colors flex items-center space-x-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Retrieve Items</span>
                    </button>
                  )}
                </div>
              </div>

              {projectRetrieves.length === 0 ? (
                <div className="bg-white p-10 rounded-xl border border-dashed border-slate-300 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                    <RotateCcw className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-800">Walang Naibalik na Gamit Para sa Project na Ito</h4>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Kung may sobra o hindi nagamit na materyales o pull-out tools galing sa site, pindutin ang <strong>"Retrieve Items"</strong> upang maibalik ang stock sa bodega.
                  </p>
                  {onOpenAddRetrieveForProject && (
                    <button
                      type="button"
                      onClick={() => onOpenAddRetrieveForProject(project.id)}
                      className="px-4 py-2 text-xs font-bold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 rounded-lg transition-colors cursor-pointer inline-flex items-center space-x-1.5"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Gumawa ng Retrieve Slip Para sa Project na Ito</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {projectRetrieves
                    .filter((ticket) => {
                      const q = retrieveSearch.toLowerCase();
                      if (!q) return true;
                      return (
                        ticket.id.toLowerCase().includes(q) ||
                        ticket.retrievedBy.toLowerCase().includes(q) ||
                        ticket.receivedBy.toLowerCase().includes(q) ||
                        ticket.date.includes(q) ||
                        ticket.items.some(
                          (item) =>
                            item.description.toLowerCase().includes(q) ||
                            (item.assetId && item.assetId.toLowerCase().includes(q)) ||
                            (item.remarks && item.remarks.toLowerCase().includes(q))
                        )
                      );
                    })
                    .map((ticket) => {
                      const isExpanded = expandedRetrieveId === ticket.id;
                      const ticketUnits = ticket.items.reduce((s, i) => s + (i.quantity || 0), 0);
                      const ticketVal = ticket.items.reduce((sum, line) => {
                        const invMatch = inventoryItems.find(
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
                          className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden"
                        >
                          <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-start space-x-3">
                              <div className="p-2 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0 mt-0.5">
                                <RotateCcw className="w-4 h-4" />
                              </div>
                              <div>
                                <div className="flex items-center space-x-2">
                                  <span className="font-mono text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                    {ticket.id}
                                  </span>
                                  <span className="text-xs text-slate-600">
                                    Date: <strong>{ticket.date}</strong> • Returned To: <strong>{ticket.returnedToWarehouse || ticket.returnedTo || 'Bodega'}</strong>
                                  </span>
                                </div>
                                <div className="text-[11px] text-slate-500 mt-1">
                                  Retrieved By: <strong>{ticket.retrievedBy}</strong> • Received By: <strong>{ticket.receivedBy}</strong> • {ticket.items.length} line items ({ticketUnits} pcs)
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center space-x-2 shrink-0">
                              {ticketVal > 0 && (
                                <span className="text-xs font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-200">
                                  {formatCurrency(ticketVal)}
                                </span>
                              )}

                              <button
                                type="button"
                                onClick={() => setExpandedRetrieveId(isExpanded ? null : ticket.id)}
                                className="px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-200 flex items-center space-x-1 cursor-pointer"
                              >
                                <span>{isExpanded ? 'Hide' : 'View'}</span>
                                {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                              </button>

                              <button
                                type="button"
                                onClick={() => generateRetrievePDF({ ticket, project })}
                                className="px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-2xs transition-colors flex items-center space-x-1 cursor-pointer"
                                title="Download Material Return Slip PDF"
                              >
                                <Download className="w-3.5 h-3.5" />
                                <span>PDF</span>
                              </button>
                            </div>
                          </div>

                          {isExpanded && (
                            <div className="px-4 pb-4 pt-2 bg-slate-50 border-t border-slate-200">
                              <table className="w-full text-left text-xs border-collapse bg-white rounded-lg border border-slate-200 overflow-hidden">
                                <thead>
                                  <tr className="bg-slate-100 text-slate-700 text-[11px]">
                                    <th className="py-2 px-3 font-bold">#</th>
                                    <th className="py-2 px-3 font-bold">Asset ID</th>
                                    <th className="py-2 px-3 font-bold">Description</th>
                                    <th className="py-2 px-3 font-bold text-center">Qty Returned</th>
                                    <th className="py-2 px-3 font-bold">Condition</th>
                                    <th className="py-2 px-3 font-bold">Remarks</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {ticket.items.map((item, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50/80">
                                      <td className="py-1.5 px-3 text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                                      <td className="py-1.5 px-3 font-mono text-emerald-800 font-semibold">{item.assetId || '-'}</td>
                                      <td className="py-1.5 px-3 font-medium text-slate-900">{item.description}</td>
                                      <td className="py-1.5 px-3 text-center font-bold text-emerald-900 font-mono">+{item.quantity} {item.unit || 'pcs'}</td>
                                      <td className="py-1.5 px-3">
                                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                                          {item.condition || 'Good'}
                                        </span>
                                      </td>
                                      <td className="py-1.5 px-3 text-slate-500 text-[11px]">{item.remarks || '-'}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          )}

          {/* TAB 7: PRINTABLE REPORT / PDF */}
          {activeTab === 'report' && (
            <div className="space-y-4">
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Official Project Cost & Progress Statement</h3>
                    <p className="text-xs text-slate-500">
                      Comprehensive breakdown for client billing, company audits, and 14-point milestone progress tracking.
                    </p>
                  </div>
                  <button
                    onClick={handleDownloadPDF}
                    className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center space-x-2 cursor-pointer"
                  >
                    <FileDown className="w-4 h-4" />
                    <span>Download PDF Now</span>
                  </button>
                </div>

                <div className="space-y-3 text-xs text-slate-700">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <span className="text-slate-500 block text-[10px] uppercase font-bold">Project Completion</span>
                      <strong className="text-base text-teal-800">{progressStats.percentage}%</strong>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <span className="text-slate-500 block text-[10px] uppercase font-bold">Materials Pulled Out</span>
                      <strong className="text-base text-blue-800">{formatCurrency(totalMaterialCost)}</strong>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <span className="text-slate-500 block text-[10px] uppercase font-bold">Manpower Labor</span>
                      <strong className="text-base text-teal-800">{formatCurrency(totalLaborCost)}</strong>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <span className="text-slate-500 block text-[10px] uppercase font-bold">Total Project Cost</span>
                      <strong className="text-base text-emerald-800">{formatCurrency(grandTotalCost)}</strong>
                    </div>
                  </div>

                  <div className="p-4 bg-teal-50/70 border border-teal-200 rounded-xl">
                    <h4 className="text-xs font-bold text-teal-900 mb-1 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-teal-700" />
                      <span>PDF Document Inclusions & Verification</span>
                    </h4>
                    <p className="text-[11px] text-teal-800 leading-relaxed">
                      Generated PDF contains: <strong>Executive Financial Summary</strong>, <strong>Complete 14-Point Progress Milestone Schedule</strong> (with activity weight, completion dates, and remarks), <strong>Windows & Doors Schedule breakdown</strong>, full <strong>Material Pull-Out records</strong>, <strong>Warehouse Returns</strong>, <strong>Manpower Deployments</strong>, and official authorization sign-off blocks.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div>
            Project: <strong className="text-slate-800">{project.name}</strong> ({project.id})
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>

      {/* QUICK ADD WINDOW/DOOR MODAL */}
      {showAddWindowModal && (
        <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <LayoutGrid className="w-4 h-4 text-teal-600" />
                <span>Add Window / Door Item</span>
              </h4>
              <button
                type="button"
                onClick={() => setShowAddWindowModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddWindowDoorSubmit} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Tag / Mark</label>
                  <input
                    type="text"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    placeholder="e.g. W-1, D-2"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Type</label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
                  >
                    <option value="Window">Window</option>
                    <option value="Door">Door</option>
                    <option value="Curtain Wall">Curtain Wall</option>
                    <option value="Glass Partition">Partition</option>
                    <option value="Louvers">Louvers</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Qty (Units)</label>
                  <input
                    type="number"
                    min="1"
                    value={newQty}
                    onChange={(e) => setNewQty(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 font-bold text-teal-800"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Height (mm)</label>
                  <input
                    type="text"
                    value={newHeight}
                    onChange={(e) => setNewHeight(e.target.value)}
                    placeholder="2100"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Width (mm)</label>
                  <input
                    type="text"
                    value={newWidth}
                    onChange={(e) => setNewWidth(e.target.value)}
                    placeholder="1800"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Location / Floor</label>
                <input
                  type="text"
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  placeholder="e.g. 2nd Floor Master Bedroom"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Remarks / Glass Specs</label>
                <input
                  type="text"
                  value={newRemarks}
                  onChange={(e) => setNewRemarks(e.target.value)}
                  placeholder="e.g. 4-track sliding, 6mm tempered glass"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddWindowModal(false)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-lg shadow-sm cursor-pointer"
                >
                  Add Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
