import React, { useState } from 'react';
import {
  LayoutDashboard,
  Building2,
  FolderKanban,
  PackageOpen,
  Users,
  Truck,
  Banknote,
  Percent,
  CheckSquare,
  TrendingUp,
  LayoutGrid,
  Search,
  ArrowRight,
  Sparkles,
  Layers,
  HardHat,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileDown,
  Calendar,
} from 'lucide-react';
import {
  Project,
  InventoryItem,
  PullOutTicket,
  DeploymentTicket,
  RetrieveTicket,
  TabType,
} from '../types';
import { formatCurrency } from '../utils/inventoryHelpers';
import { calculateProjectProgress } from '../utils/projectMilestones';
import { ProjectDetailsModal } from './ProjectDetailsModal';

interface DashboardViewProps {
  projects: Project[];
  items: InventoryItem[];
  pullOutTickets: PullOutTicket[];
  deploymentTickets: DeploymentTicket[];
  retrieveTickets?: RetrieveTicket[];
  onNavigateTab: (tab: TabType) => void;
  onOpenAddProjectModal: () => void;
  onUpdateProject?: (updatedProject: Project) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  projects,
  items,
  pullOutTickets,
  deploymentTickets,
  retrieveTickets = [],
  onNavigateTab,
  onOpenAddProjectModal,
  onUpdateProject,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Active' | 'For Turn over/Cleaning' | 'Completed' | 'On Hold' | 'Planning'>('all');
  const [selectedProjectForDetails, setSelectedProjectForDetails] = useState<Project | null>(null);

  // Compute metrics for each project
  const projectSummaries = projects.map((proj) => {
    const pId = (proj.id || '').trim().toLowerCase();
    const pName = (proj.name || '').trim().toLowerCase();

    // 1. Pull Out Materials Cost (Gross)
    const projPullOuts = pullOutTickets.filter((t) => {
      const tId = (t.projectId || '').trim().toLowerCase();
      const tName = (t.projectName || '').trim().toLowerCase();
      return (
        (tId && tId === pId) ||
        (tName && tName === pName) ||
        (tId && tId === pName) ||
        (tName && tName === pId)
      );
    });

    // 2. Retrieve / Returned Materials for this project
    const projRetrieves = retrieveTickets.filter((t) => {
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
    projPullOuts.forEach((ticket) => {
      ticket.items.forEach((item) => {
        let price = item.unitPrice || 0;
        if (price === 0 && items.length > 0) {
          const inv = items.find(
            (i) =>
              (item.itemId && i.id.toLowerCase() === item.itemId.toLowerCase()) ||
              (item.assetId && i.assetId.toLowerCase() === item.assetId.toLowerCase()) ||
              (item.description && i.description.toLowerCase() === item.description.toLowerCase())
          );
          if (inv && inv.unitPrice) price = inv.unitPrice;
        }
        grossMaterialCost += item.quantity * price;
        grossMaterialUnits += item.quantity;
      });
    });

    // Fallback: direct inventory allocations
    if (grossMaterialCost === 0 && items.length > 0) {
      items.forEach((inv) => {
        if (inv.projectAllocations) {
          inv.projectAllocations.forEach((alloc) => {
            const aId = (alloc.projectId || '').trim().toLowerCase();
            const aName = (alloc.projectName || '').trim().toLowerCase();
            if (
              (aId && aId === pId) ||
              (aName && aName === pName) ||
              (aId && aId === pName) ||
              (aName && aName === pId)
            ) {
              const price = inv.unitPrice || 0;
              grossMaterialCost += alloc.quantity * price;
              grossMaterialUnits += alloc.quantity;
            }
          });
        }
      });
    }

    let retrievedMaterialCost = 0;
    let retrievedUnits = 0;
    projRetrieves.forEach((ticket) => {
      ticket.items.forEach((item) => {
        let price = item.unitPrice || 0;
        if (price === 0 && items.length > 0) {
          const inv = items.find(
            (i) =>
              (item.itemId && i.id.toLowerCase() === item.itemId.toLowerCase()) ||
              (item.assetId && i.assetId.toLowerCase() === item.assetId.toLowerCase()) ||
              (item.description && i.description.toLowerCase() === item.description.toLowerCase())
          );
          if (inv && inv.unitPrice) price = inv.unitPrice;
        }
        retrievedMaterialCost += item.quantity * price;
        retrievedUnits += item.quantity;
      });
    });

    const netMaterialCost = Math.max(0, grossMaterialCost - retrievedMaterialCost);
    const netMaterialUnits = Math.max(0, grossMaterialUnits - retrievedUnits);

    // 3. Deployments: Labor Cost & Mobilization Cost
    const projDeployments = deploymentTickets.filter((t) => {
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

    projDeployments.forEach((dep) => {
      laborCost += dep.laborCost || 0;
      mobilizationCost += dep.mobilizationCost || 0;
      headsDeployed += dep.lines.reduce((acc, l) => acc + (l.quantity || 0), 0);
    });

    const totalProjectCost = netMaterialCost + laborCost + mobilizationCost;
    const progress = calculateProjectProgress(proj);
    const totalWindowsDoors = (proj.windowsDoors || []).reduce(
      (acc, curr) => acc + (Number(curr.qty) || 1),
      0
    );

    return {
      project: proj,
      grossMaterialCost,
      retrievedMaterialCost,
      netMaterialCost,
      materialCost: netMaterialCost,
      grossMaterialUnits,
      retrievedUnits,
      netMaterialUnits,
      materialUnits: netMaterialUnits,
      laborCost,
      mobilizationCost,
      totalProjectCost,
      progress,
      totalWindowsDoors,
      pullOutCount: projPullOuts.length,
      retrieveCount: projRetrieves.length,
      deploymentCount: projDeployments.length,
      headsDeployed,
    };
  });

  // Overall Company Grand Totals
  const grandTotalMaterials = projectSummaries.reduce((acc, curr) => acc + curr.netMaterialCost, 0);
  const grandTotalRetrieved = projectSummaries.reduce((acc, curr) => acc + curr.retrievedMaterialCost, 0);
  const grandTotalLabor = projectSummaries.reduce((acc, curr) => acc + curr.laborCost, 0);
  const grandTotalMobilization = projectSummaries.reduce((acc, curr) => acc + curr.mobilizationCost, 0);
  const grandTotalAllCosts = grandTotalMaterials + grandTotalLabor + grandTotalMobilization;

  const totalWindowsUnitsAllProjects = projectSummaries.reduce((acc, curr) => acc + curr.totalWindowsDoors, 0);
  const totalInstalledWindowsAllProjects = projectSummaries.reduce(
    (acc, curr) => acc + curr.progress.installedWindowsDoorsUnits,
    0
  );

  const averageCompletionPercent =
    projectSummaries.length > 0
      ? Math.round(
          (projectSummaries.reduce((acc, curr) => acc + curr.progress.percentage, 0) /
            projectSummaries.length) *
            10
        ) / 10
      : 0;

  // Filtered project list for dashboard table
  const filteredSummaries = projectSummaries.filter((s) => {
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      s.project.name.toLowerCase().includes(q) ||
      s.project.id.toLowerCase().includes(q) ||
      (s.project.location && s.project.location.toLowerCase().includes(q)) ||
      (s.project.leadPerson && s.project.leadPerson.toLowerCase().includes(q)) ||
      (s.project.projectManager && s.project.projectManager.toLowerCase().includes(q));

    const matchesStatus =
      statusFilter === 'all' ? true : (s.project.status || 'Active') === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div id="dashboard-view-container" className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Dashboard Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-[#0d1b2a] via-[#112338] to-[#0a1622] text-white p-6 rounded-2xl shadow-xl border border-slate-800">
        <div className="space-y-1">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-teal-500/15 border border-teal-500/30 text-teal-300 text-xs font-semibold">
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span>Executive Operations & Project Costing</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white pt-1">
            Operations & Project Completion Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-300">
            Real-time monitoring of project completion percentages, material costs, labor wages, mobilization, and company-wide expenses.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => onNavigateTab('projects')}
            className="px-4 py-2.5 bg-teal-600 hover:bg-teal-500 active:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center space-x-2 cursor-pointer"
          >
            <Building2 className="w-4 h-4" />
            <span>Manage Projects</span>
          </button>
        </div>
      </div>

      {/* 4 CORE EXECUTIVE FINANCIAL CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* CARD 1: TOTAL MATERIAL COST */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md transition-all space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Total Material Cost
            </span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
              <PackageOpen className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 font-mono">
            {formatCurrency(grandTotalMaterials)}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
            <span>
              {grandTotalRetrieved > 0 ? (
                <span className="text-emerald-700 font-bold">
                  -{formatCurrency(grandTotalRetrieved)} returned
                </span>
              ) : (
                'Across all active pull-outs'
              )}
            </span>
            <span className="font-semibold text-blue-700">
              {grandTotalAllCosts > 0
                ? `${Math.round((grandTotalMaterials / grandTotalAllCosts) * 100)}% of total`
                : '0%'}
            </span>
          </div>
        </div>

        {/* CARD 2: TOTAL LABOR COST */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md transition-all space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Total Labor Cost
            </span>
            <div className="p-2 rounded-xl bg-teal-50 text-teal-600 border border-teal-100">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 font-mono">
            {formatCurrency(grandTotalLabor)}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
            <span>Manpower payroll & wages</span>
            <span className="font-semibold text-teal-700">
              {grandTotalAllCosts > 0
                ? `${Math.round((grandTotalLabor / grandTotalAllCosts) * 100)}% of total`
                : '0%'}
            </span>
          </div>
        </div>

        {/* CARD 3: TOTAL MOBILIZATION COST */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md transition-all space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Total Mobilization Cost
            </span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 font-mono">
            {formatCurrency(grandTotalMobilization)}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
            <span>Transpo, fuel & logistics</span>
            <span className="font-semibold text-amber-700">
              {grandTotalAllCosts > 0
                ? `${Math.round((grandTotalMobilization / grandTotalAllCosts) * 100)}% of total`
                : '0%'}
            </span>
          </div>
        </div>

        {/* CARD 4: GRAND TOTAL ALL COSTS */}
        <div className="bg-gradient-to-br from-emerald-50 via-teal-50/40 to-slate-50 p-5 rounded-2xl border border-emerald-300/80 shadow-2xs hover:shadow-md transition-all space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
              Total All Project Costs
            </span>
            <div className="p-2 rounded-xl bg-emerald-600 text-white shadow-xs">
              <Banknote className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-950 font-mono">
            {formatCurrency(grandTotalAllCosts)}
          </div>
          <div className="flex items-center justify-between text-[11px] text-emerald-700 font-semibold pt-1 border-t border-emerald-200">
            <span>Overall Site Investment</span>
            <span>{projects.length} Registered Project(s)</span>
          </div>
        </div>
      </div>

      {/* QUICK STATUS PULSE & WINDOWS TRACKER BANNER */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-600 font-black text-lg">
            {averageCompletionPercent}%
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Average Project Completion</h3>
            <p className="text-sm font-extrabold text-slate-900">
              {projects.length} Total Monitored Projects
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-600 font-black text-lg">
            <LayoutGrid className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Windows & Doors Fabrication</h3>
            <p className="text-sm font-extrabold text-slate-900">
              {totalInstalledWindowsAllProjects} / {totalWindowsUnitsAllProjects} Units Installed
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 font-black text-lg">
            <HardHat className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Manpower Deployments</h3>
            <p className="text-sm font-extrabold text-slate-900">
              {deploymentTickets.length} Deployment Tickets Active
            </p>
          </div>
        </div>
      </div>

      {/* DETAILED PROJECT COST & 100% COMPLETION SUMMARY TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden space-y-4 p-5">
        {/* Table Filter and Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-200">
          <div>
            <h2 className="text-base font-extrabold text-slate-900 flex items-center space-x-2">
              <FolderKanban className="w-5 h-5 text-teal-600" />
              <span>Project Completion & Costing Breakdown (Per Project)</span>
            </h2>
            <p className="text-xs text-slate-500">
              Complete cost breakdown: Total Completion (%), Material Cost, Labor Cost, Mobilization Cost, and Grand Total Cost per project.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search project name, code..."
                className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 w-48 sm:w-56"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="text-xs px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="Active">Active</option>
              <option value="For Turn over/Cleaning">For Turn over/Cleaning</option>
              <option value="On Hold">On Hold</option>
              <option value="Completed">Completed</option>
            </select>
          </div>
        </div>

        {/* Projects Breakdown Table */}
        {filteredSummaries.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            <Building2 className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            <p className="text-xs font-semibold text-slate-600">No matching projects found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-900 text-white uppercase tracking-wider font-semibold">
                  <th className="py-3 px-4">Project ID & Name</th>
                  <th className="py-3 px-4 text-center min-w-[140px]">Total Completion</th>
                  <th className="py-3 px-4 text-center">Windows / Doors</th>
                  <th className="py-3 px-4 text-right">Material Cost</th>
                  <th className="py-3 px-4 text-right">Labor Cost</th>
                  <th className="py-3 px-4 text-right">Mobilization Cost</th>
                  <th className="py-3 px-4 text-right font-black text-teal-300">Total All Cost</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                {filteredSummaries.map((s) => {
                  const p = s.project;

                  return (
                    <tr
                      key={p.id}
                      onClick={() => setSelectedProjectForDetails(p)}
                      className="hover:bg-teal-50/30 transition-colors cursor-pointer group"
                    >
                      {/* Project ID & Name */}
                      <td className="py-3 px-4">
                        <div className="space-y-0.5">
                          <div className="flex items-center space-x-2">
                            <span className="font-mono font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded text-[11px] border border-teal-200">
                              {p.id}
                            </span>
                            <span className="font-bold text-slate-900 group-hover:text-teal-700 transition-colors">
                              {p.name}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 truncate max-w-xs">
                            {p.location || 'Site Location'} {p.leadPerson && `• In-Charge: ${p.leadPerson}`} {p.projectManager && `• PM: ${p.projectManager}`}
                          </div>
                        </div>
                      </td>

                      {/* Total Completion (Progress Bar + %) */}
                      <td className="py-3 px-4 text-center">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px] font-bold">
                            <span className="text-slate-600">Progress</span>
                            <span className="text-teal-800 font-mono">{s.progress.percentage}%</span>
                          </div>
                          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                            <div
                              className="h-full bg-teal-600 rounded-full transition-all duration-300"
                              style={{ width: `${s.progress.percentage}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-slate-400 block">
                            {s.progress.completedMilestonesCount}/14 Milestones
                          </span>
                        </div>
                      </td>

                      {/* Windows / Doors count */}
                      <td className="py-3 px-4 text-center">
                        <span className="inline-block px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-bold">
                          {s.totalWindowsDoors > 0 ? (
                            <span>
                              {s.progress.installedWindowsDoorsUnits} / {s.totalWindowsDoors} units
                            </span>
                          ) : (
                            <span className="text-slate-400 font-normal">None</span>
                          )}
                        </span>
                      </td>

                      {/* Material Cost */}
                      <td className="py-3 px-4 text-right font-mono text-slate-900">
                        {formatCurrency(s.materialCost)}
                        <span className="block text-[10px] text-slate-400">
                          {s.materialUnits} units
                        </span>
                      </td>

                      {/* Labor Cost */}
                      <td className="py-3 px-4 text-right font-mono text-slate-900">
                        {formatCurrency(s.laborCost)}
                        <span className="block text-[10px] text-slate-400">
                          {s.headsDeployed} heads
                        </span>
                      </td>

                      {/* Mobilization Cost */}
                      <td className="py-3 px-4 text-right font-mono text-slate-900">
                        {formatCurrency(s.mobilizationCost)}
                        <span className="block text-[10px] text-slate-400">Logistics</span>
                      </td>

                      {/* Total All Cost per Project */}
                      <td className="py-3 px-4 text-right font-mono font-black text-sm text-emerald-900 bg-emerald-50/50">
                        {formatCurrency(s.totalProjectCost)}
                      </td>

                      {/* Action */}
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedProjectForDetails(p);
                          }}
                          className="px-2.5 py-1 text-xs font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-lg transition-colors border border-teal-200 cursor-pointer"
                        >
                          Details
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-slate-900 text-white font-bold text-xs">
                  <td className="py-3 px-4">TOTALS ({filteredSummaries.length} Projects)</td>
                  <td className="py-3 px-4 text-center text-teal-300">
                    Avg: {averageCompletionPercent}%
                  </td>
                  <td className="py-3 px-4 text-center text-slate-300">
                    {totalInstalledWindowsAllProjects} / {totalWindowsUnitsAllProjects} units
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-blue-300">
                    {formatCurrency(grandTotalMaterials)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-teal-300">
                    {formatCurrency(grandTotalLabor)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-amber-300">
                    {formatCurrency(grandTotalMobilization)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-black text-sm text-emerald-300">
                    {formatCurrency(grandTotalAllCosts)}
                  </td>
                  <td className="py-3 px-4 text-center text-slate-400">—</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Project Details Modal */}
      <ProjectDetailsModal
        isOpen={!!selectedProjectForDetails}
        onClose={() => setSelectedProjectForDetails(null)}
        project={selectedProjectForDetails}
        pullOutTickets={pullOutTickets}
        deploymentTickets={deploymentTickets}
        retrieveTickets={retrieveTickets}
        inventoryItems={items}
        onUpdateProject={(updated) => {
          if (onUpdateProject) onUpdateProject(updated);
          setSelectedProjectForDetails(updated);
        }}
      />
    </div>
  );
};
