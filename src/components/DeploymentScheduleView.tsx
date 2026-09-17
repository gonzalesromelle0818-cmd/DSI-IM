import React, { useState, useMemo, useRef } from 'react';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Download,
  Filter,
  Users,
  Building2,
  HardHat,
  Eye,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  CalendarDays,
  Layers,
  FileDown,
  Truck,
} from 'lucide-react';
import { DeploymentTicket, Project } from '../types';
import { formatCurrency, getTotalHeadcount } from '../utils/deploymentHelpers';
import { generateDeploymentSchedulePDF } from '../utils/generateDeploymentSchedulePDF';

interface DeploymentScheduleViewProps {
  tickets: DeploymentTicket[];
  projects: Project[];
  onViewTicketSlip: (ticket: DeploymentTicket) => void;
  onNavigateToAddDeployment: () => void;
}

type TimeframeView = 'days' | 'weeks';

export const DeploymentScheduleView: React.FC<DeploymentScheduleViewProps> = ({
  tickets,
  projects,
  onViewTicketSlip,
  onNavigateToAddDeployment,
}) => {
  const [selectedProjectFilter, setSelectedProjectFilter] = useState('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');
  const [timeframeView, setTimeframeView] = useState<TimeframeView>('days');
  const [selectedDateOffset, setSelectedDateOffset] = useState<number>(0); // weeks offset from today
  const [selectedTicketForDetail, setSelectedTicketForDetail] = useState<DeploymentTicket | null>(null);

  // Filter tickets based on status and project
  const filteredTickets = useMemo(() => {
    return tickets.filter((ticket) => {
      const matchesProject =
        selectedProjectFilter === 'all'
          ? true
          : ticket.projectId === selectedProjectFilter;

      const matchesStatus =
        selectedStatusFilter === 'all'
          ? true
          : ticket.status === selectedStatusFilter;

      return matchesProject && matchesStatus;
    });
  }, [tickets, selectedProjectFilter, selectedStatusFilter]);

  // Determine date range for the Gantt timeline
  // Base date anchor: start from monday of current week + offset
  const today = useMemo(() => new Date(), []);
  
  const timelineDates = useMemo(() => {
    const dates: Date[] = [];
    const base = new Date();
    base.setHours(0, 0, 0, 0);

    // If offset, shift base by offset * 7 days
    base.setDate(base.getDate() + selectedDateOffset * 7);

    // Get Monday of that week
    const dayOfWeek = base.getDay();
    const diffToMonday = (dayOfWeek + 6) % 7; // Monday = 0
    base.setDate(base.getDate() - diffToMonday);

    // Number of days to show: 21 days for 'days' view (3 weeks), 42 days for 'weeks' view (6 weeks)
    const count = timeframeView === 'days' ? 21 : 42;

    for (let i = 0; i < count; i++) {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      dates.push(d);
    }
    return dates;
  }, [selectedDateOffset, timeframeView]);

  const startDate = timelineDates[0];
  const endDate = timelineDates[timelineDates.length - 1];

  // Helper to parse YYYY-MM-DD to midnight Date object
  const parseDateStr = (dateStr?: string): Date | null => {
    if (!dateStr) return null;
    const parts = dateStr.split('-');
    if (parts.length !== 3) return null;
    return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  };

  const formatDateLabel = (d: Date): string => {
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const isToday = (d: Date): boolean => {
    const t = new Date();
    return (
      d.getDate() === t.getDate() &&
      d.getMonth() === t.getMonth() &&
      d.getFullYear() === t.getFullYear()
    );
  };

  const isWeekend = (d: Date): boolean => {
    const day = d.getDay();
    return day === 0 || day === 6;
  };

  // Group tickets by project for cleaner timeline layout
  const projectGroups = useMemo(() => {
    const groups: { [projectId: string]: { project?: Project; tickets: DeploymentTicket[] } } = {};

    filteredTickets.forEach((ticket) => {
      const pId = ticket.projectId || 'unassigned';
      if (!groups[pId]) {
        const proj = projects.find((p) => p.id === ticket.projectId);
        groups[pId] = {
          project: proj,
          tickets: [],
        };
      }
      groups[pId].tickets.push(ticket);
    });

    // Sort tickets inside each group by deploymentDate
    Object.values(groups).forEach((g) => {
      g.tickets.sort((a, b) => (a.deploymentDate || '').localeCompare(b.deploymentDate || ''));
    });

    return Object.entries(groups).map(([projectId, group]) => ({
      projectId,
      projectName: group.project?.name || group.tickets[0]?.projectName || projectId,
      location: group.project?.location || group.tickets[0]?.projectLocation,
      tickets: group.tickets,
    }));
  }, [filteredTickets, projects]);

  // Compute stats
  const activeCount = filteredTickets.filter((t) => t.status === 'Active On-Site').length;
  const scheduledCount = filteredTickets.filter((t) => t.status === 'Scheduled').length;
  const completedCount = filteredTickets.filter((t) => t.status === 'Completed').length;
  const totalHeads = filteredTickets.reduce((acc, t) => acc + getTotalHeadcount(t.lines), 0);
  const totalCost = filteredTickets.reduce((acc, t) => acc + (t.totalCost || 0), 0);

  // Status badge styling helper
  const getStatusStyles = (status: DeploymentTicket['status']) => {
    switch (status) {
      case 'Active On-Site':
        return {
          barBg: 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/20',
          badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          dot: 'bg-emerald-500',
          icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />,
        };
      case 'Scheduled':
        return {
          barBg: 'bg-blue-500 hover:bg-blue-600 text-white shadow-blue-500/20',
          badgeBg: 'bg-blue-50 text-blue-700 border-blue-200',
          dot: 'bg-blue-500',
          icon: <Clock className="w-3.5 h-3.5 text-blue-600" />,
        };
      case 'Completed':
        return {
          barBg: 'bg-slate-400 hover:bg-slate-500 text-white shadow-slate-400/20',
          badgeBg: 'bg-slate-100 text-slate-700 border-slate-200',
          dot: 'bg-slate-400',
          icon: <CheckCircle2 className="w-3.5 h-3.5 text-slate-500" />,
        };
      case 'Cancelled':
        return {
          barBg: 'bg-rose-400 hover:bg-rose-500 text-white shadow-rose-400/20',
          badgeBg: 'bg-rose-50 text-rose-700 border-rose-200',
          dot: 'bg-rose-400',
          icon: <XCircle className="w-3.5 h-3.5 text-rose-500" />,
        };
      default:
        return {
          barBg: 'bg-teal-500 hover:bg-teal-600 text-white',
          badgeBg: 'bg-slate-100 text-slate-700 border-slate-200',
          dot: 'bg-teal-500',
          icon: null,
        };
    }
  };

  // Calculate Gantt bar position & width percentage
  const calculateBarMetrics = (ticket: DeploymentTicket) => {
    const tStart = parseDateStr(ticket.deploymentDate);
    if (!tStart) return null;

    // End date calculation: use endDate if valid, or start + daysCount - 1
    let tEnd = parseDateStr(ticket.endDate);
    if (!tEnd || tEnd < tStart) {
      tEnd = new Date(tStart);
      tEnd.setDate(tStart.getDate() + Math.max(1, ticket.daysCount || 1) - 1);
    }

    const timelineStartMs = startDate.getTime();
    const timelineEndMs = endDate.getTime() + 24 * 60 * 60 * 1000; // end of final day
    const totalDurationMs = timelineEndMs - timelineStartMs;

    const barStartMs = tStart.getTime();
    const barEndMs = tEnd.getTime() + 24 * 60 * 60 * 1000; // inclusive end of that day

    // Check if within visible range
    if (barEndMs < timelineStartMs || barStartMs > timelineEndMs) {
      return {
        isVisible: false,
        isBefore: barEndMs < timelineStartMs,
        isAfter: barStartMs > timelineEndMs,
        tStart,
        tEnd,
      };
    }

    // Clamp to viewport
    const clampedStartMs = Math.max(timelineStartMs, barStartMs);
    const clampedEndMs = Math.min(timelineEndMs, barEndMs);

    const leftPercent = ((clampedStartMs - timelineStartMs) / totalDurationMs) * 100;
    const widthPercent = Math.max(1.5, ((clampedEndMs - clampedStartMs) / totalDurationMs) * 100);

    return {
      isVisible: true,
      leftPercent,
      widthPercent,
      isCutStart: barStartMs < timelineStartMs,
      isCutEnd: barEndMs > timelineEndMs,
      tStart,
      tEnd,
    };
  };

  const handleDownloadSchedule = () => {
    generateDeploymentSchedulePDF({
      tickets: filteredTickets,
      projects,
      statusFilter: selectedStatusFilter,
      projectFilter:
        selectedProjectFilter === 'all'
          ? 'All Projects'
          : projects.find((p) => p.id === selectedProjectFilter)?.name || selectedProjectFilter,
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Banner with Stats and Download PDF Action */}
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-lg bg-teal-50 text-teal-700 border border-teal-200">
              <CalendarDays className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <span>Manpower Deployment Schedule & Gantt Timeline</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 border border-teal-200">
                  Live Sync
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Visual interactive Gantt chart ng lahat ng active, scheduled, at completed manpower deployments sa lahat ng project sites.
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls: PDF Download & Add Deployment */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleDownloadSchedule}
            className="px-4 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-sm hover:shadow transition-all flex items-center space-x-1.5 cursor-pointer"
            title="Download Schedule as PDF"
          >
            <Download className="w-4 h-4" />
            <span>Download Schedule as PDF</span>
          </button>

          <button
            onClick={onNavigateToAddDeployment}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition-colors flex items-center space-x-1.5 cursor-pointer"
          >
            <HardHat className="w-4 h-4 text-slate-600" />
            <span>+ New Deployment</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-5 gap-3.5">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            Total In Schedule
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-slate-900">{filteredTickets.length}</span>
            <span className="text-xs text-slate-400">tickets</span>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-emerald-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider block">
            Active On-Site
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-emerald-800">{activeCount}</span>
            <span className="text-xs text-emerald-600 font-medium">ongoing</span>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-blue-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-blue-700 uppercase tracking-wider block">
            Scheduled Upcoming
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-blue-800">{scheduledCount}</span>
            <span className="text-xs text-blue-600 font-medium">pipeline</span>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-teal-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-teal-700 uppercase tracking-wider block">
            Manpower Deployed
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-teal-800">{totalHeads}</span>
            <span className="text-xs text-teal-600 font-medium">workers</span>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-amber-200 shadow-2xs col-span-2 sm:col-span-1">
          <span className="text-[11px] font-semibold text-amber-800 uppercase tracking-wider block">
            Deployment Cost
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-lg font-black text-amber-900 font-mono">
              {formatCurrency(totalCost)}
            </span>
          </div>
        </div>
      </div>

      {/* Filter and Date Navigation Controls */}
      <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Date Timeline Shifter */}
        <div className="flex items-center space-x-2 w-full md:w-auto">
          <button
            onClick={() => setSelectedDateOffset((prev) => prev - (timeframeView === 'days' ? 1 : 2))}
            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
            title="Previous Period"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <button
            onClick={() => setSelectedDateOffset(0)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
              selectedDateOffset === 0
                ? 'bg-teal-50 text-teal-800 border-teal-300 font-bold'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            Current Period (Today)
          </button>

          <button
            onClick={() => setSelectedDateOffset((prev) => prev + (timeframeView === 'days' ? 1 : 2))}
            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
            title="Next Period"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <span className="text-xs font-medium text-slate-600 ml-2 hidden sm:inline">
            Timeline: <strong>{formatDateLabel(startDate)}</strong> - <strong>{formatDateLabel(endDate)}</strong> ({timelineDates.length} days)
          </span>
        </div>

        {/* Filters and View Mode */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
          {/* Project Filter */}
          <div className="flex items-center space-x-1.5">
            <span className="text-xs text-slate-500 font-medium">Project:</span>
            <select
              value={selectedProjectFilter}
              onChange={(e) => setSelectedProjectFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-teal-500"
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
          <div className="flex items-center space-x-1.5">
            <span className="text-xs text-slate-500 font-medium">Status:</span>
            <select
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="all">All Statuses</option>
              <option value="Active On-Site">Active On-Site</option>
              <option value="Scheduled">Scheduled</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>

          {/* Timeframe Scope Toggle: 3 Weeks vs 6 Weeks */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            <button
              onClick={() => setTimeframeView('days')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                timeframeView === 'days'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              3 Weeks
            </button>
            <button
              onClick={() => setTimeframeView('weeks')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                timeframeView === 'weeks'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              6 Weeks
            </button>
          </div>
        </div>
      </div>

      {/* Gantt Legend */}
      <div className="flex flex-wrap items-center justify-between text-xs text-slate-600 bg-white px-4 py-2.5 rounded-xl border border-slate-200 shadow-2xs gap-3">
        <div className="flex flex-wrap items-center gap-4">
          <span className="font-semibold text-slate-700 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-slate-400" />
            Legend:
          </span>
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded-sm bg-emerald-500 inline-block shadow-2xs" />
            <span className="font-medium text-slate-700">Active On-Site</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded-sm bg-blue-500 inline-block shadow-2xs" />
            <span className="font-medium text-slate-700">Scheduled Upcoming</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded-sm bg-slate-400 inline-block shadow-2xs" />
            <span className="font-medium text-slate-700">Completed</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded-sm bg-rose-400 inline-block shadow-2xs" />
            <span className="font-medium text-slate-700">Cancelled</span>
          </div>
        </div>

        <div className="flex items-center space-x-3 text-slate-400 text-[11px]">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 bg-amber-100 border border-amber-300 rounded-xs inline-block" />
            <span>Today marker</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 bg-slate-100 border border-slate-200 rounded-xs inline-block" />
            <span>Weekend</span>
          </span>
        </div>
      </div>

      {/* Main Gantt Chart Interactive Board */}
      {filteredTickets.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center space-y-3 shadow-2xs">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <Calendar className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800">Walang Deployment sa Schedule</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Walang deployment tickets na tumutugma sa kasalukuyang filter. Kapag nag-add ka ng bagong ticket sa Deployments, awtomatiko itong lalabas dito.
          </p>
          <button
            onClick={onNavigateToAddDeployment}
            className="mt-2 px-4 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-sm transition-all inline-flex items-center space-x-1.5 cursor-pointer"
          >
            <HardHat className="w-4 h-4" />
            <span>Gumawa ng Unang Deployment</span>
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          {/* Timeline Scroll Area */}
          <div className="overflow-x-auto">
            <div className="min-w-[980px]">
              {/* Timeline Header Row (Dates) */}
              <div className="flex border-b border-slate-200 bg-slate-900 text-white sticky top-0 z-20">
                {/* Left fixed column header: Project & Ticket Info */}
                <div className="w-72 shrink-0 px-4 py-3 border-r border-slate-800 flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    Project / Site Deployment
                  </span>
                  <span className="text-[10px] text-teal-400 font-mono">
                    {projectGroups.length} Site(s)
                  </span>
                </div>

                {/* Date Columns Header */}
                <div className="flex-1 flex">
                  {timelineDates.map((date, idx) => {
                    const todayFlag = isToday(date);
                    const weekendFlag = isWeekend(date);
                    return (
                      <div
                        key={idx}
                        className={`flex-1 min-w-[36px] py-2 px-1 text-center border-r border-slate-800 flex flex-col items-center justify-center relative ${
                          todayFlag
                            ? 'bg-teal-500 text-slate-950 font-black'
                            : weekendFlag
                            ? 'bg-slate-800/80 text-slate-400'
                            : 'text-slate-300'
                        }`}
                      >
                        <span className="text-[9px] uppercase tracking-tighter opacity-80">
                          {date.toLocaleDateString('en-US', { weekday: 'narrow' })}
                        </span>
                        <span className="text-xs font-bold leading-none mt-0.5">
                          {date.getDate()}
                        </span>
                        {/* Month Indicator on 1st of month */}
                        {date.getDate() === 1 && (
                          <span className="absolute -top-1 bg-teal-400 text-slate-950 text-[8px] font-bold px-1 rounded">
                            {date.toLocaleDateString('en-US', { month: 'short' })}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Gantt Rows Grouped by Project */}
              <div className="divide-y divide-slate-100">
                {projectGroups.map((group) => (
                  <div key={group.projectId} className="bg-white hover:bg-slate-50/50 transition-colors">
                    {/* Project Header Sub-bar */}
                    <div className="flex items-center bg-slate-50/90 border-b border-slate-100 px-4 py-2">
                      <div className="w-72 shrink-0 flex items-center space-x-2">
                        <Building2 className="w-4 h-4 text-teal-600 shrink-0" />
                        <div className="truncate">
                          <span className="font-bold text-xs text-slate-900 block truncate">
                            {group.projectName}
                          </span>
                          <span className="text-[10px] text-slate-500 truncate block">
                            {group.location || 'Site Location'} • {group.tickets.length} ticket(s)
                          </span>
                        </div>
                      </div>
                      <div className="flex-1 text-[11px] text-slate-400 italic pl-3">
                        Total workforce on site: {group.tickets.reduce((sum, t) => sum + getTotalHeadcount(t.lines), 0)} workers
                      </div>
                    </div>

                    {/* Individual Deployment Tickets under this project */}
                    {group.tickets.map((ticket) => {
                      const metrics = calculateBarMetrics(ticket);
                      const styles = getStatusStyles(ticket.status);
                      const headcount = getTotalHeadcount(ticket.lines);
                      const supervisor = ticket.supervisor || ticket.leadSupervisor || 'Lead';

                      return (
                        <div
                          key={ticket.id}
                          className="flex items-center border-b border-slate-100/70 hover:bg-teal-50/30 transition-colors relative min-h-[46px]"
                        >
                          {/* Left Column: Ticket ID & Details */}
                          <div className="w-72 shrink-0 px-4 py-2 border-r border-slate-200 flex items-center justify-between">
                            <div className="space-y-0.5 truncate pr-2">
                              <div className="flex items-center space-x-2">
                                <span className={`font-mono text-xs font-bold px-1.5 py-0.5 rounded border ${
                                  ticket.id.startsWith('MOB-') || (ticket.lines.length === 0 && ticket.mobilizationCost > 0)
                                    ? 'text-amber-900 bg-amber-100 border-amber-300'
                                    : 'text-teal-800 bg-teal-50 border-teal-200'
                                }`}>
                                  {ticket.id}
                                </span>
                                <span
                                  className={`text-[10px] font-semibold px-2 py-0.2 rounded-full border ${styles.badgeBg}`}
                                >
                                  {ticket.status}
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-600 truncate flex items-center space-x-2 pt-0.5">
                                {ticket.id.startsWith('MOB-') || (ticket.lines.length === 0 && ticket.mobilizationCost > 0) ? (
                                  <span className="flex items-center space-x-1 font-bold text-amber-800 bg-amber-50 px-1 rounded">
                                    <Truck className="w-3 h-3 text-amber-600" />
                                    <span>Mobilization & Logistics</span>
                                  </span>
                                ) : (
                                  <span className="flex items-center space-x-1 font-medium text-slate-800">
                                    <Users className="w-3 h-3 text-slate-400" />
                                    <span>{headcount} heads</span>
                                  </span>
                                )}
                                <span className="text-slate-300">•</span>
                                <span className="truncate text-slate-500" title={supervisor}>
                                  Lead: {supervisor}
                                </span>
                              </div>
                            </div>

                            {/* View Slip Icon Button */}
                            <button
                              onClick={() => onViewTicketSlip(ticket)}
                              className="p-1.5 text-slate-400 hover:text-teal-700 hover:bg-teal-50 rounded-lg transition-colors cursor-pointer shrink-0"
                              title="View Deployment Form Slip"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </div>

                          {/* Gantt Timeline Lane */}
                          <div className="flex-1 flex relative h-full items-center py-2 px-1">
                            {/* Background Grid Lines (Day columns) */}
                            <div className="absolute inset-0 flex pointer-events-none">
                              {timelineDates.map((date, idx) => {
                                const todayFlag = isToday(date);
                                const weekendFlag = isWeekend(date);
                                return (
                                  <div
                                    key={idx}
                                    className={`flex-1 border-r border-slate-100 h-full ${
                                      todayFlag
                                        ? 'bg-amber-50/60'
                                        : weekendFlag
                                        ? 'bg-slate-50/70'
                                        : ''
                                    }`}
                                  />
                                );
                              })}
                            </div>

                            {/* Render Gantt Activity Bar */}
                            {metrics && metrics.isVisible ? (
                              <div
                                style={{
                                  left: `${metrics.leftPercent}%`,
                                  width: `${metrics.widthPercent}%`,
                                }}
                                onClick={() => setSelectedTicketForDetail(ticket)}
                                className={`absolute h-7 rounded-md px-2.5 flex items-center justify-between text-xs font-semibold shadow-xs transition-all cursor-pointer z-10 select-none overflow-hidden ${styles.barBg}`}
                                title={`${ticket.id}: ${ticket.projectName} (${ticket.deploymentDate} to ${ticket.endDate || ticket.deploymentDate}) - ${headcount} heads, ₱${ticket.totalCost.toLocaleString()}`}
                              >
                                <div className="flex items-center space-x-1.5 truncate">
                                  {ticket.id.startsWith('MOB-') || (ticket.lines.length === 0 && ticket.mobilizationCost > 0) ? (
                                    <>
                                      <Truck className="w-3.5 h-3.5 shrink-0 text-amber-900" />
                                      <span className="font-mono text-[10px] font-bold opacity-90 truncate">
                                        {ticket.id}
                                      </span>
                                      <span className="text-[11px] font-medium truncate hidden sm:inline">
                                        {ticket.projectName}
                                      </span>
                                      <span className="text-[10px] opacity-90 font-bold truncate">
                                        (₱{ticket.mobilizationCost.toLocaleString()})
                                      </span>
                                    </>
                                  ) : (
                                    <>
                                      <span className="font-mono text-[10px] font-bold opacity-90 truncate">
                                        {ticket.id}
                                      </span>
                                      <span className="text-[11px] font-medium truncate hidden sm:inline">
                                        {ticket.projectName}
                                      </span>
                                      <span className="text-[10px] opacity-90 font-normal truncate">
                                        ({headcount}p)
                                      </span>
                                    </>
                                  )}
                                </div>

                                <div className="text-[10px] font-mono opacity-90 shrink-0 pl-1 hidden md:block">
                                  {ticket.daysCount}d
                                </div>
                              </div>
                            ) : metrics && metrics.isBefore ? (
                              <div className="px-3 text-[11px] text-slate-400 italic z-10">
                                ← Ended before visible range ({ticket.endDate || ticket.deploymentDate})
                              </div>
                            ) : metrics && metrics.isAfter ? (
                              <div className="px-3 text-[11px] text-slate-400 italic z-10">
                                Scheduled after visible range ({ticket.deploymentDate}) →
                              </div>
                            ) : (
                              <div className="px-3 text-[11px] text-slate-400 italic z-10">
                                Date not specified
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Ticket Details Quick Drawer / Modal */}
      {selectedTicketForDetail && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
          onClick={() => setSelectedTicketForDetail(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-sm font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                    {selectedTicketForDetail.id}
                  </span>
                  <span
                    className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${
                      getStatusStyles(selectedTicketForDetail.status).badgeBg
                    }`}
                  >
                    {selectedTicketForDetail.status}
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900 mt-1">
                  {selectedTicketForDetail.projectName}
                </h3>
                <p className="text-xs text-slate-500">
                  {selectedTicketForDetail.projectLocation || 'Site Location'}
                </p>
              </div>

              <button
                onClick={() => setSelectedTicketForDetail(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            {/* Quick Details Grid */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Schedule Period</span>
                <span className="font-bold text-slate-800 mt-0.5 block">
                  {selectedTicketForDetail.deploymentDate}
                  {selectedTicketForDetail.endDate && selectedTicketForDetail.endDate !== selectedTicketForDetail.deploymentDate
                    ? ` to ${selectedTicketForDetail.endDate}`
                    : ''}
                </span>
                <span className="text-[11px] text-slate-500">{selectedTicketForDetail.daysCount} working days</span>
              </div>

              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Total Cost</span>
                <span className="font-bold text-slate-900 font-mono text-sm mt-0.5 block">
                  {formatCurrency(selectedTicketForDetail.totalCost)}
                </span>
                <span className="text-[11px] text-slate-500">Labor: {formatCurrency(selectedTicketForDetail.laborCost)}</span>
              </div>

              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Site Supervisor</span>
                <span className="font-semibold text-slate-800 mt-0.5 block">
                  {selectedTicketForDetail.supervisor || selectedTicketForDetail.leadSupervisor || 'Unassigned'}
                </span>
              </div>

              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Project Manager</span>
                <span className="font-semibold text-slate-800 mt-0.5 block">
                  {selectedTicketForDetail.projectManager || 'Engr. Roberto Santos'}
                </span>
              </div>
            </div>

            {/* Manpower or Mobilization Breakdown */}
            {selectedTicketForDetail.lines.length > 0 ? (
              <div>
                <span className="text-xs font-bold text-slate-700 block mb-1.5">
                  Manpower Composition ({getTotalHeadcount(selectedTicketForDetail.lines)} personnel):
                </span>
                <div className="space-y-1 max-h-36 overflow-y-auto">
                  {selectedTicketForDetail.lines.map((line, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between text-xs bg-slate-50 p-2 rounded border border-slate-100"
                    >
                      <span className="font-medium text-slate-800">
                        {line.quantity}x {line.role}
                      </span>
                      <span className="font-mono text-slate-600">
                        ₱{line.dailyRate.toLocaleString()}/day • Subtotal: {formatCurrency(line.subtotal)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 text-xs space-y-1">
                <div className="flex items-center space-x-1.5 text-amber-900 font-bold">
                  <Truck className="w-4 h-4 text-amber-700" />
                  <span>Mobilization, Trucking & Logistics Ticket</span>
                </div>
                <p className="text-amber-800 font-semibold text-sm">
                  Amount: {formatCurrency(selectedTicketForDetail.mobilizationCost)}
                </p>
                {selectedTicketForDetail.mobilizationNotes && (
                  <p className="text-slate-600 text-[11px] pt-1">
                    <strong>Breakdown:</strong> {selectedTicketForDetail.mobilizationNotes}
                  </p>
                )}
                {selectedTicketForDetail.vehicleDetails && (
                  <p className="text-slate-600 text-[11px]">
                    <strong>Vehicle / Driver:</strong> {selectedTicketForDetail.vehicleDetails}
                  </p>
                )}
              </div>
            )}

            {selectedTicketForDetail.scopeOfWork && (
              <div className="text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Scope of Work</span>
                <p className="text-slate-700 mt-0.5">{selectedTicketForDetail.scopeOfWork}</p>
              </div>
            )}

            {/* Actions in popup */}
            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => {
                  const t = selectedTicketForDetail;
                  setSelectedTicketForDetail(null);
                  onViewTicketSlip(t);
                }}
                className="px-3.5 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-sm transition-all flex items-center space-x-1.5 cursor-pointer"
              >
                <FileDown className="w-4 h-4" />
                <span>View Full Slip / Print</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
