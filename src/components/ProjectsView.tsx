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
  TrendingUp,
} from 'lucide-react';
import { Project, InventoryItem, PullOutTicket, DeploymentTicket } from '../types';
import { formatCurrency } from '../utils/inventoryHelpers';
import { ProjectDetailsModal } from './ProjectDetailsModal';
import { generateProjectCostPDF } from '../utils/generateProjectCostPDF';

interface ProjectsViewProps {
  projects: Project[];
  items: InventoryItem[];
  pullOutTickets?: PullOutTicket[];
  deploymentTickets?: DeploymentTicket[];
  onOpenAddProjectModal: () => void;
  onOpenRemoveProjectModal: () => void;
  onDeleteProject: (projectId: string) => void;
  onNavigateToInventory: () => void;
  onOpenAddPullOutForProject?: (projectId: string) => void;
  onOpenAddDeploymentForProject?: (projectId: string) => void;
}

export const ProjectsView: React.FC<ProjectsViewProps> = ({
  projects,
  items,
  pullOutTickets = [],
  deploymentTickets = [],
  onOpenAddProjectModal,
  onOpenRemoveProjectModal,
  onDeleteProject,
  onNavigateToInventory,
  onOpenAddPullOutForProject,
  onOpenAddDeploymentForProject,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Active' | 'Planning' | 'Completed' | 'On Hold'>('all');
  const [selectedProjectForDetails, setSelectedProjectForDetails] = useState<Project | null>(null);

  // Calculate items deployed per project and total material expenses (from pullOutTickets & allocations)
  const getProjectComprehensiveMetrics = (projectId: string, projectName: string) => {
    const pId = projectId.toLowerCase();
    const pName = projectName.toLowerCase();

    // 1. Pull Out Materials
    const relatedPullOuts = pullOutTickets.filter(
      (t) => t.projectId.toLowerCase() === pId || t.projectName.toLowerCase() === pName
    );

    let materialCost = 0;
    let materialUnits = 0;

    relatedPullOuts.forEach((ticket) => {
      ticket.items.forEach((item) => {
        let price = item.unitPrice || 0;
        if (price === 0 && items.length > 0) {
          const invItem = items.find((i) => i.id === item.itemId || i.assetId === item.assetId);
          if (invItem && invItem.unitPrice) {
            price = invItem.unitPrice;
          }
        }
        materialCost += item.quantity * price;
        materialUnits += item.quantity;
      });
    });

    // Fallback: If no pull-outs recorded, check item.projectAllocations
    if (materialUnits === 0) {
      items.forEach((item) => {
        if (item.projectAllocations) {
          item.projectAllocations.forEach((alloc) => {
            if (alloc.projectId.toLowerCase() === pId) {
              materialUnits += alloc.quantity;
              if (item.unitPrice) {
                materialCost += alloc.quantity * item.unitPrice;
              }
            }
          });
        }
      });
    }

    // 2. Deployment Manpower & Mobilization
    const relatedDeployments = deploymentTickets.filter(
      (t) => t.projectId.toLowerCase() === pId || t.projectName.toLowerCase() === pName
    );

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
    const grandTotalCost = materialCost + totalDeploymentCost;

    return {
      materialCost,
      materialUnits,
      pullOutTicketsCount: relatedPullOuts.length,
      laborCost,
      mobilizationCost,
      totalDeploymentCost,
      headsDeployed,
      deploymentsCount: relatedDeployments.length,
      grandTotalCost,
    };
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

        {/* Action Buttons: Add Project & Remove Project */}
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
                    {/* View Details Button */}
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-teal-700 group-hover:text-teal-800 bg-teal-50 group-hover:bg-teal-100/80 px-2.5 py-1 rounded-md transition-colors">
                      <span>View Details</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </span>

                    {/* Delete Project */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteProject(project.id);
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="Delete project"
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

      {/* Project Details & Cost Breakdown Modal */}
      <ProjectDetailsModal
        isOpen={!!selectedProjectForDetails}
        onClose={() => setSelectedProjectForDetails(null)}
        project={selectedProjectForDetails}
        pullOutTickets={pullOutTickets}
        deploymentTickets={deploymentTickets}
        inventoryItems={items}
        onOpenAddPullOutForProject={onOpenAddPullOutForProject}
        onOpenAddDeploymentForProject={onOpenAddDeploymentForProject}
      />
    </div>
  );
};
