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
} from 'lucide-react';
import {
  Project,
  PullOutTicket,
  DeploymentTicket,
  InventoryItem,
} from '../types';
import { formatCurrency } from '../utils/inventoryHelpers';
import { generateProjectCostPDF } from '../utils/generateProjectCostPDF';

interface ProjectDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project | null;
  pullOutTickets: PullOutTicket[];
  deploymentTickets: DeploymentTicket[];
  inventoryItems: InventoryItem[];
  onOpenAddPullOutForProject?: (projectId: string) => void;
  onOpenAddDeploymentForProject?: (projectId: string) => void;
}

export const ProjectDetailsModal: React.FC<ProjectDetailsModalProps> = ({
  isOpen,
  onClose,
  project,
  pullOutTickets,
  deploymentTickets,
  inventoryItems,
  onOpenAddPullOutForProject,
  onOpenAddDeploymentForProject,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'materials' | 'manpower' | 'report'>('overview');
  const [materialSearch, setMaterialSearch] = useState('');
  const [materialCategoryFilter, setMaterialCategoryFilter] = useState('all');
  const [deploymentSearch, setDeploymentSearch] = useState('');

  if (!isOpen || !project) return null;

  const pId = project.id.toLowerCase();
  const pName = project.name.toLowerCase();

  // Filter Pull-Out tickets for this project
  const projectPullOuts = pullOutTickets.filter(
    (t) => t.projectId.toLowerCase() === pId || t.projectName.toLowerCase() === pName
  );

  // Filter Deployment tickets for this project
  const projectDeployments = deploymentTickets.filter(
    (t) => t.projectId.toLowerCase() === pId || t.projectName.toLowerCase() === pName
  );

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
          (i) => i.id === item.itemId || i.assetId === item.assetId
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
  const grandTotalCost = totalMaterialCost + totalDeploymentCost;

  // Percentage calculations
  const matPercent = grandTotalCost > 0 ? Math.round((totalMaterialCost / grandTotalCost) * 100) : 0;
  const laborPercent = grandTotalCost > 0 ? Math.round((totalLaborCost / grandTotalCost) * 100) : 0;
  const mobPercent = grandTotalCost > 0 ? Math.round((totalMobilizationCost / grandTotalCost) * 100) : 0;

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
      inventoryItems,
      preparedBy: "M' Chrissna / Maricel",
      supervisor: project.leadPerson,
      projectManager: 'Engr. Roberto Santos',
    });
  };

  const handlePrint = () => {
    window.print();
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

        {/* Financial Highlights KPI Strip */}
        <div className="bg-slate-50 border-b border-slate-200 px-5 sm:px-6 py-4 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Card 1: Materials Pull Out Cost */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider">Materials Pulled Out</span>
              <PackageOpen className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-base sm:text-lg font-extrabold text-slate-900">
              {formatCurrency(totalMaterialCost)}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              {totalMaterialUnits} unit(s) • {projectPullOuts.length} ticket(s)
            </div>
          </div>

          {/* Card 2: Manpower Labor Cost */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider">Manpower Labor</span>
              <Users className="w-4 h-4 text-teal-600" />
            </div>
            <div className="text-base sm:text-lg font-extrabold text-slate-900">
              {formatCurrency(totalLaborCost)}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              {totalHeadsDeployed} heads deployed
            </div>
          </div>

          {/* Card 3: Mobilization Cost */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider">Mobilization & Logistics</span>
              <Truck className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-base sm:text-lg font-extrabold text-slate-900">
              {formatCurrency(totalMobilizationCost)}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Transpo & fuel expenses
            </div>
          </div>

          {/* Card 4: Grand Total Project Expense */}
          <div className="bg-emerald-50 p-3.5 rounded-xl border border-emerald-200 shadow-2xs">
            <div className="flex items-center justify-between text-emerald-700 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider">Grand Total Expense</span>
              <Banknote className="w-4 h-4 text-emerald-700" />
            </div>
            <div className="text-base sm:text-lg font-black text-emerald-900">
              {formatCurrency(grandTotalCost)}
            </div>
            <div className="text-[11px] text-emerald-700 font-semibold mt-0.5">
              Total site investment
            </div>
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="px-5 sm:px-6 pt-3 bg-white border-b border-slate-200 flex items-center justify-between gap-4 overflow-x-auto">
          <div className="flex items-center space-x-1 sm:space-x-2">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-3.5 py-2 text-xs font-bold border-b-2 transition-all flex items-center space-x-1.5 whitespace-nowrap cursor-pointer ${
                activeTab === 'overview'
                  ? 'border-teal-600 text-teal-700 bg-teal-50/50 rounded-t-lg'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <PieChart className="w-4 h-4" />
              <span>Project Cost Overview</span>
            </button>

            <button
              onClick={() => setActiveTab('materials')}
              className={`px-3.5 py-2 text-xs font-bold border-b-2 transition-all flex items-center space-x-1.5 whitespace-nowrap cursor-pointer ${
                activeTab === 'materials'
                  ? 'border-blue-600 text-blue-700 bg-blue-50/50 rounded-t-lg'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <PackageOpen className="w-4 h-4" />
              <span>Materials Pulled Out ({flatMaterials.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('manpower')}
              className={`px-3.5 py-2 text-xs font-bold border-b-2 transition-all flex items-center space-x-1.5 whitespace-nowrap cursor-pointer ${
                activeTab === 'manpower'
                  ? 'border-teal-600 text-teal-700 bg-teal-50/50 rounded-t-lg'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <HardHat className="w-4 h-4" />
              <span>Manpower Deployments ({projectDeployments.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('report')}
              className={`px-3.5 py-2 text-xs font-bold border-b-2 transition-all flex items-center space-x-1.5 whitespace-nowrap cursor-pointer ${
                activeTab === 'report'
                  ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50 rounded-t-lg'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Cost Report & PDF</span>
            </button>
          </div>
        </div>

        {/* Tab Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 bg-slate-50/50 space-y-6">
          {/* TAB 1: OVERVIEW & COST BREAKDOWN */}
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
                  <div className="space-y-2">
                    <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden flex">
                      <div
                        style={{ width: `${matPercent}%` }}
                        className="bg-blue-500 h-full transition-all duration-500"
                        title={`Materials: ${formatCurrency(totalMaterialCost)} (${matPercent}%)`}
                      />
                      <div
                        style={{ width: `${laborPercent}%` }}
                        className="bg-teal-500 h-full transition-all duration-500"
                        title={`Labor: ${formatCurrency(totalLaborCost)} (${laborPercent}%)`}
                      />
                      <div
                        style={{ width: `${mobPercent}%` }}
                        className="bg-amber-500 h-full transition-all duration-500"
                        title={`Mobilization: ${formatCurrency(totalMobilizationCost)} (${mobPercent}%)`}
                      />
                    </div>

                    <div className="flex flex-wrap items-center justify-between text-xs text-slate-600 gap-2 pt-1">
                      <div className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-full bg-blue-500 inline-block" />
                        <span>
                          Materials Pull Out: <strong>{formatCurrency(totalMaterialCost)}</strong> ({matPercent}%)
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-full bg-teal-500 inline-block" />
                        <span>
                          Manpower Labor: <strong>{formatCurrency(totalLaborCost)}</strong> ({laborPercent}%)
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-full bg-amber-500 inline-block" />
                        <span>
                          Mobilization: <strong>{formatCurrency(totalMobilizationCost)}</strong> ({mobPercent}%)
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 text-center text-xs text-slate-400 bg-slate-50 rounded-lg">
                    Walang registered material pull-out o manpower deployment cost sa kasalukuyan.
                  </div>
                )}
              </div>

              {/* 2-Column Summary: Quick Details & Quick Actions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Project Details Box */}
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-slate-700" />
                    <span>Project Information</span>
                  </h4>
                  <div className="space-y-2 text-xs divide-y divide-slate-100">
                    <div className="flex justify-between py-1">
                      <span className="text-slate-500">Project Reference:</span>
                      <span className="font-mono font-bold text-slate-900">{project.id}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-slate-500">Site Location:</span>
                      <span className="font-semibold text-slate-900 text-right">{project.location || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-slate-500">Lead Supervisor / Engineer:</span>
                      <span className="font-semibold text-slate-900">{project.leadPerson || 'Unassigned'}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-slate-500">Operating Status:</span>
                      <span className="font-semibold text-teal-700">{project.status || 'Active'}</span>
                    </div>
                    {project.notes && (
                      <div className="pt-2 text-slate-600 italic">
                        "{project.notes}"
                      </div>
                    )}
                  </div>
                </div>

                {/* Operations Summary & Actions */}
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-3 flex flex-col justify-between">
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-slate-700" />
                      <span>Operations Summary</span>
                    </h4>
                    <div className="space-y-2 text-xs divide-y divide-slate-100">
                      <div className="flex justify-between py-1">
                        <span className="text-slate-500">Pull-Out Tickets:</span>
                        <span className="font-bold text-blue-700">{projectPullOuts.length} ticket(s)</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-slate-500">Unique Material Items:</span>
                        <span className="font-bold text-slate-900">{flatMaterials.length} item line(s)</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-slate-500">Manpower Deployments:</span>
                        <span className="font-bold text-teal-700">{projectDeployments.length} deployment(s)</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-slate-500">Total Manpower Heads:</span>
                        <span className="font-bold text-slate-900">{totalHeadsDeployed} person-days</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
                    <button
                      onClick={handleDownloadPDF}
                      className="w-full py-2 px-3 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs transition-colors flex items-center justify-center space-x-2 cursor-pointer"
                    >
                      <FileDown className="w-4 h-4 text-teal-400" />
                      <span>Download Full Project PDF Report</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: MATERIALS PULLED OUT LIST */}
          {activeTab === 'materials' && (
            <div className="space-y-4">
              {/* Filter and Search */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="relative w-full sm:w-80">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={materialSearch}
                    onChange={(e) => setMaterialSearch(e.target.value)}
                    placeholder="Search by Asset ID, description, ticket..."
                    className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex items-center space-x-2 w-full sm:w-auto">
                  <select
                    value={materialCategoryFilter}
                    onChange={(e) => setMaterialCategoryFilter(e.target.value)}
                    className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700"
                  >
                    <option value="all">All Categories</option>
                    <option value="Hand Tools">Hand Tools</option>
                    <option value="Power Tools">Power Tools</option>
                    <option value="Screw/Bolt">Screw/Bolt</option>
                    <option value="Consumables">Consumables</option>
                    <option value="Others">Others</option>
                  </select>
                </div>
              </div>

              {/* Materials Table */}
              {flatMaterials.length === 0 ? (
                <div className="bg-white rounded-xl border border-dashed border-slate-300 p-8 text-center space-y-3">
                  <PackageOpen className="w-8 h-8 text-slate-400 mx-auto" />
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">Walang Pull Out na Gamit o Materyales</h4>
                    <p className="text-xs text-slate-500 mt-1">
                      Wala pang naipapadalang gamit sa proyektong ito mula sa Pull Out tab.
                    </p>
                  </div>
                </div>
              ) : filteredMaterials.length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500">
                  Walang tumugmang gamit sa iyong search filter.
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                        <tr>
                          <th className="py-3 px-4">Date</th>
                          <th className="py-3 px-4">Pull-Out No.</th>
                          <th className="py-3 px-4">Asset Code</th>
                          <th className="py-3 px-4">Description</th>
                          <th className="py-3 px-4">Category</th>
                          <th className="py-3 px-4 text-center">Quantity</th>
                          <th className="py-3 px-4 text-right">Unit Price</th>
                          <th className="py-3 px-4 text-right">Total Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredMaterials.map((mat, index) => (
                          <tr key={`${mat.ticketId}-${mat.assetId}-${index}`} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3 px-4 text-slate-600 font-medium whitespace-nowrap">
                              {mat.ticketDate}
                            </td>
                            <td className="py-3 px-4">
                              <span className="font-mono font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200 text-[11px]">
                                {mat.ticketId}
                              </span>
                            </td>
                            <td className="py-3 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                              {mat.assetId}
                            </td>
                            <td className="py-3 px-4 font-medium text-slate-900 max-w-[200px] truncate">
                              {mat.description}
                            </td>
                            <td className="py-3 px-4">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700">
                                {mat.category}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center font-bold text-slate-800">
                              {mat.quantity} <span className="text-[10px] text-slate-500 font-normal">{mat.unit}</span>
                            </td>
                            <td className="py-3 px-4 text-right text-slate-600 font-mono">
                              {mat.unitPrice > 0 ? formatCurrency(mat.unitPrice) : '-'}
                            </td>
                            <td className="py-3 px-4 text-right font-bold text-blue-900 font-mono">
                              {formatCurrency(mat.totalCost)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-slate-50 font-bold border-t border-slate-200 text-slate-900">
                        <tr>
                          <td colSpan={5} className="py-3 px-4 text-right uppercase text-[10px] tracking-wider text-slate-500">
                            Total Material Cost ({filteredMaterials.reduce((acc, m) => acc + m.quantity, 0)} Units)
                          </td>
                          <td className="py-3 px-4 text-center font-black text-slate-900">
                            {filteredMaterials.reduce((acc, m) => acc + m.quantity, 0)}
                          </td>
                          <td className="py-3 px-4 text-right font-normal text-slate-400">-</td>
                          <td className="py-3 px-4 text-right font-extrabold text-blue-900 text-sm font-mono">
                            {formatCurrency(
                              filteredMaterials.reduce((acc, m) => acc + m.totalCost, 0)
                            )}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: MANPOWER DEPLOYMENTS LIST */}
          {activeTab === 'manpower' && (
            <div className="space-y-4">
              {/* Search and summary */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="relative w-full sm:w-80">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={deploymentSearch}
                    onChange={(e) => setDeploymentSearch(e.target.value)}
                    placeholder="Search by ticket ID, supervisor, role..."
                    className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div className="text-xs font-semibold text-slate-600">
                  Total Manpower Heads: <strong className="text-teal-700">{totalHeadsDeployed} heads</strong>
                </div>
              </div>

              {projectDeployments.length === 0 ? (
                <div className="bg-white rounded-xl border border-dashed border-slate-300 p-8 text-center space-y-3">
                  <HardHat className="w-8 h-8 text-slate-400 mx-auto" />
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">Walang Manpower Deployment</h4>
                    <p className="text-xs text-slate-500 mt-1">
                      Wala pang naitatalang deployment ng tauhan sa proyektong ito mula sa Deployment tab.
                    </p>
                  </div>
                </div>
              ) : filteredDeployments.length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500">
                  Walang deployment ticket na tumugma sa search filter.
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredDeployments.map((ticket) => (
                    <div
                      key={ticket.id}
                      className="bg-white rounded-xl border border-slate-200 shadow-2xs p-4.5 space-y-3.5 hover:border-slate-300 transition-all"
                    >
                      {/* Top Ticket Details */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                        <div className="flex items-center space-x-3">
                          <span className="font-mono text-xs font-bold text-teal-700 bg-teal-50 px-2.5 py-0.5 rounded-md border border-teal-200">
                            {ticket.id}
                          </span>
                          <span className="text-xs font-bold text-slate-900">
                            Date: {ticket.deploymentDate}
                          </span>
                          <span className="text-xs text-slate-500">
                            Duration: <strong>{ticket.daysCount} day(s)</strong>
                          </span>
                        </div>

                        <div className="flex items-center space-x-2">
                          <span
                            className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
                              ticket.status === 'Active On-Site'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : ticket.status === 'Completed'
                                ? 'bg-blue-50 text-blue-800 border-blue-200'
                                : 'bg-slate-100 text-slate-700 border-slate-200'
                            }`}
                          >
                            {ticket.status}
                          </span>
                          <span className="text-xs font-mono font-extrabold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200">
                            {formatCurrency(ticket.totalCost)}
                          </span>
                        </div>
                      </div>

                      {/* Deployed Roles Badges & Headcount */}
                      <div className="space-y-2">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                          Deployed Personnel & Salary Rates:
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                          {ticket.lines.map((line, lIdx) => (
                            <div
                              key={lIdx}
                              className="bg-slate-50 p-2.5 rounded-lg border border-slate-200/80 flex items-center justify-between text-xs"
                            >
                              <div>
                                <span className="font-bold text-slate-900 block">
                                  {line.quantity}x {line.role}
                                </span>
                                <span className="text-[10px] text-slate-500">
                                  {formatCurrency(line.dailyRate)}/day × {line.days}d
                                </span>
                              </div>
                              <span className="font-mono font-bold text-slate-800">
                                {formatCurrency(line.subtotal)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Cost Breakdown & Signatories */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 text-xs">
                        {/* Cost items */}
                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 space-y-1 text-slate-600">
                          <div className="flex justify-between">
                            <span>Labor Subtotal:</span>
                            <span className="font-bold text-slate-900">{formatCurrency(ticket.laborCost)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Mobilization & Logistics:</span>
                            <span className="font-bold text-slate-900">{formatCurrency(ticket.mobilizationCost)}</span>
                          </div>
                          {ticket.vehicleDetails && (
                            <div className="text-[10px] text-slate-500 pt-1">
                              Logistics / Vehicle: {ticket.vehicleDetails}
                            </div>
                          )}
                        </div>

                        {/* Signatories */}
                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 space-y-1 text-slate-600">
                          <div className="flex justify-between">
                            <span className="text-[11px] text-slate-500">Prepared By:</span>
                            <span className="font-semibold text-slate-900">{ticket.preparedBy || "M' Chrissna / Maricel"}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[11px] text-slate-500">Site Supervisor:</span>
                            <span className="font-semibold text-slate-900">{ticket.supervisor || ticket.leadSupervisor || 'N/A'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[11px] text-slate-500">Project Manager:</span>
                            <span className="font-semibold text-slate-900">{ticket.projectManager || 'N/A'}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Manpower Total Footer Card */}
                  <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-teal-800 tracking-wider block">
                        Total Manpower & Deployment Cost for {project.name}
                      </span>
                      <span className="text-slate-600">
                        {projectDeployments.length} tickets • {totalHeadsDeployed} heads deployed
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-black text-teal-950 font-mono block">
                        {formatCurrency(totalDeploymentCost)}
                      </span>
                      <span className="text-[10px] text-teal-700 font-semibold">
                        Labor: {formatCurrency(totalLaborCost)} | Mobilization: {formatCurrency(totalMobilizationCost)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: COST REPORT & PRINTABLE PREVIEW */}
          {activeTab === 'report' && (
            <div className="space-y-5">
              {/* Action Banner */}
              <div className="bg-indigo-900 text-white p-5 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
                <div className="space-y-1">
                  <h3 className="text-base font-bold flex items-center gap-2">
                    <FileText className="w-5 h-5 text-indigo-300" />
                    <span>Official Project Financial & Operational Cost Summary</span>
                  </h3>
                  <p className="text-xs text-indigo-200 max-w-xl">
                    I-download ang opisyal na PDF report na kumpleto sa Project Information, Listahan ng Pulled Out Materials at Tools, Manpower Deployments Breakdown, at pirma ng mga Authorized Signatories.
                  </p>
                </div>

                <button
                  onClick={handleDownloadPDF}
                  className="px-5 py-2.5 text-xs font-bold text-slate-900 bg-teal-400 hover:bg-teal-300 rounded-xl shadow-md transition-all flex items-center justify-center space-x-2 cursor-pointer whitespace-nowrap"
                >
                  <FileDown className="w-4 h-4" />
                  <span>Download PDF Report</span>
                </button>
              </div>

              {/* Formal Report Preview Slip */}
              <div className="bg-white p-6 sm:p-8 rounded-xl border border-slate-300 shadow-md space-y-6 text-slate-900 font-sans">
                {/* Header */}
                <div className="text-center border-b border-slate-300 pb-4 space-y-1">
                  <h2 className="text-lg font-black tracking-tight text-slate-900">
                    DIVERSIFIED SOURCE INC.
                  </h2>
                  <h3 className="text-xs font-bold text-teal-700 uppercase tracking-wider">
                    PROJECT COST & DISPATCH SUMMARY REPORT
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Report Ref: DSI-PRJ-{project.id} • Date: {new Date().toLocaleDateString()}
                  </p>
                </div>

                {/* Metadata Grid */}
                <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-lg border border-slate-200">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Project Name:</span>
                    <strong className="text-slate-900 text-sm">{project.name}</strong>
                    <div className="text-slate-600 mt-1">Location: {project.location || 'N/A'}</div>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Project In-Charge:</span>
                    <strong className="text-slate-900 text-sm">{project.leadPerson || 'Unassigned'}</strong>
                    <div className="text-slate-600 mt-1">Status: <strong className="text-teal-700">{project.status || 'Active'}</strong></div>
                  </div>
                </div>

                {/* Executive Summary Table */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    1. Executive Financial Summary
                  </h4>
                  <table className="w-full text-xs border border-slate-300">
                    <thead className="bg-slate-800 text-white font-bold">
                      <tr>
                        <th className="p-2 text-left">Category</th>
                        <th className="p-2 text-left">Details</th>
                        <th className="p-2 text-right">Subtotal Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      <tr>
                        <td className="p-2 font-bold text-slate-800">Materials & Tools Pulled Out</td>
                        <td className="p-2 text-slate-600">{flatMaterials.length} item lines ({totalMaterialUnits} units)</td>
                        <td className="p-2 text-right font-mono font-bold text-slate-900">{formatCurrency(totalMaterialCost)}</td>
                      </tr>
                      <tr>
                        <td className="p-2 font-bold text-slate-800">Manpower Labor Cost</td>
                        <td className="p-2 text-slate-600">{projectDeployments.length} tickets ({totalHeadsDeployed} heads)</td>
                        <td className="p-2 text-right font-mono font-bold text-slate-900">{formatCurrency(totalLaborCost)}</td>
                      </tr>
                      <tr>
                        <td className="p-2 font-bold text-slate-800">Mobilization & Logistics</td>
                        <td className="p-2 text-slate-600">Transportation, skyway, toll fees</td>
                        <td className="p-2 text-right font-mono font-bold text-slate-900">{formatCurrency(totalMobilizationCost)}</td>
                      </tr>
                      <tr className="bg-teal-50 font-extrabold text-teal-950">
                        <td className="p-2.5 text-sm" colSpan={2}>GRAND TOTAL PROJECT EXPENSE</td>
                        <td className="p-2.5 text-right text-base font-black text-teal-900 font-mono">
                          {formatCurrency(grandTotalCost)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Signatures Preview */}
                <div className="pt-6 border-t border-slate-300 grid grid-cols-3 gap-4 text-center text-xs">
                  <div className="space-y-3 bg-slate-50/70 p-3 rounded border border-slate-200">
                    <span className="text-[10px] font-bold uppercase text-slate-500 block">Prepared By</span>
                    <div className="border-b border-slate-400 pb-1 font-bold text-slate-900">
                      M' Chrissna / Maricel
                    </div>
                    <span className="text-[9px] text-slate-400">DSI Office Admin</span>
                  </div>

                  <div className="space-y-3 bg-slate-50/70 p-3 rounded border border-slate-200">
                    <span className="text-[10px] font-bold uppercase text-slate-500 block">Site Supervisor</span>
                    <div className="border-b border-slate-400 pb-1 font-bold text-slate-900">
                      {project.leadPerson || 'Lead Supervisor'}
                    </div>
                    <span className="text-[9px] text-slate-400">Site Operations In-Charge</span>
                  </div>

                  <div className="space-y-3 bg-slate-50/70 p-3 rounded border border-slate-200">
                    <span className="text-[10px] font-bold uppercase text-slate-500 block">Project Manager</span>
                    <div className="border-b border-slate-400 pb-1 font-bold text-slate-900">
                      Engr. Roberto Santos
                    </div>
                    <span className="text-[9px] text-slate-400">Project Operations Head</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 sm:px-6 py-3.5 bg-white border-t border-slate-200 flex items-center justify-between gap-3 text-xs">
          <div className="text-slate-500 text-[11px]">
            Project: <strong className="text-slate-800">{project.name}</strong> • Total Expense: <strong className="text-emerald-700 font-mono">{formatCurrency(grandTotalCost)}</strong>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadPDF}
              className="px-4 py-2 font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors flex items-center space-x-1.5 cursor-pointer shadow-2xs"
            >
              <FileDown className="w-4 h-4" />
              <span>Download PDF</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
