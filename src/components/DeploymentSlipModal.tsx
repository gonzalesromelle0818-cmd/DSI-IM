import React from 'react';
import {
  X,
  Printer,
  Download,
  Building2,
  Calendar,
  User,
  Truck,
  CheckCircle2,
  Users,
  Briefcase,
} from 'lucide-react';
import { DeploymentTicket, Project } from '../types';
import { formatCurrency, getTotalHeadcount } from '../utils/deploymentHelpers';
import { generateDeploymentPDF } from '../utils/generateDeploymentPDF';

interface DeploymentSlipModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticket: DeploymentTicket | null;
  projects: Project[];
}

export const DeploymentSlipModal: React.FC<DeploymentSlipModalProps> = ({
  isOpen,
  onClose,
  ticket,
  projects,
}) => {
  if (!isOpen || !ticket) return null;

  const project = projects.find((p) => p.id === ticket.projectId);
  const totalHeads = getTotalHeadcount(ticket.lines);

  const handleDownloadPDF = () => {
    generateDeploymentPDF({
      ticket,
      project,
      preparedBy: ticket.preparedBy || "M' Chrissna / Maricel",
      supervisor: ticket.supervisor || ticket.leadSupervisor,
      projectManager: ticket.projectManager,
    });
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      id="deployment-slip-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150 print:p-0 print:bg-white print:static"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="deployment-slip-card"
        className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] print:max-h-none print:shadow-none print:border-none print:w-full"
      >
        {/* Top Control Bar (Hidden on Print) */}
        <div className="bg-slate-900 px-6 py-4 text-white flex items-center justify-between print:hidden">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-teal-500/20 text-teal-400 border border-teal-500/30">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold tracking-tight">
                  Manpower Deployment Slip
                </h2>
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-teal-900 text-teal-300 border border-teal-700">
                  {ticket.id}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Official workforce dispatch & labor costing ticket
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleDownloadPDF}
              className="px-3 py-1.5 text-xs font-bold text-teal-300 bg-teal-900/60 hover:bg-teal-800 border border-teal-700 rounded-lg transition-colors flex items-center space-x-1.5 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Download PDF</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-3 py-1.5 text-xs font-bold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors flex items-center space-x-1.5 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print Slip</span>
            </button>

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div className="p-6 md:p-8 overflow-y-auto space-y-6 print:p-4 text-slate-900">
          {/* Header Title */}
          <div className="text-center pb-2 border-b-2 border-slate-900">
            <h1 className="text-lg md:text-xl font-black tracking-tight uppercase">
              Diversified Source Incorporated
            </h1>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-800 mt-0.5">
              Manpower Deployment & Workforce Dispatch Slip
            </p>
          </div>

          {/* Ticket Metadata Box */}
          <div className="border border-slate-300 rounded-lg overflow-hidden grid grid-cols-1 md:grid-cols-2 text-xs divide-y md:divide-y-0 md:divide-x divide-slate-300 bg-slate-50/40">
            <div className="p-3.5 space-y-2">
              <div className="flex">
                <span className="w-32 font-bold text-slate-600">Account / Project:</span>
                <span className="font-bold text-slate-900 flex-1">
                  [{ticket.projectId}] {ticket.projectName}
                </span>
              </div>
              <div className="flex">
                <span className="w-32 font-bold text-slate-600">Site Location:</span>
                <span className="text-slate-800 flex-1">
                  {ticket.projectLocation || project?.location || 'On-Site Construction'}
                </span>
              </div>
              <div className="flex">
                <span className="w-32 font-bold text-slate-600">Site Supervisor:</span>
                <span className="text-slate-900 font-semibold flex-1">
                  {ticket.supervisor || ticket.leadSupervisor || 'N/A'}
                </span>
              </div>
              <div className="flex">
                <span className="w-32 font-bold text-slate-600">Project Manager:</span>
                <span className="text-slate-900 font-semibold flex-1">
                  {ticket.projectManager || 'N/A'}
                </span>
              </div>
            </div>

            <div className="p-3.5 space-y-2">
              <div className="flex">
                <span className="w-32 font-bold text-slate-600">Deployment No.:</span>
                <span className="font-mono font-bold text-slate-900 flex-1">
                  {ticket.id}
                </span>
              </div>
              <div className="flex">
                <span className="w-32 font-bold text-slate-600">Deployment Date:</span>
                <span className="text-slate-800 flex-1">
                  {ticket.deploymentDate} ({ticket.daysCount} working day{ticket.daysCount > 1 ? 's' : ''})
                </span>
              </div>
              <div className="flex">
                <span className="w-32 font-bold text-slate-600">Prepared By:</span>
                <span className="text-slate-900 font-semibold flex-1">
                  {ticket.preparedBy || ticket.requestedBy || "M' Chrissna / Maricel"}
                </span>
              </div>
              <div className="flex">
                <span className="w-32 font-bold text-slate-600">Status:</span>
                <span className="font-bold text-teal-800 flex-1">
                  {ticket.status}
                </span>
              </div>
            </div>
          </div>

          {/* Manpower Positions Table */}
          <div className="border border-slate-300 rounded-lg overflow-hidden">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 font-bold text-slate-700 uppercase tracking-wider border-b border-slate-300">
                <tr>
                  <th className="p-2.5 text-center w-12">#</th>
                  <th className="p-2.5">Position / Role</th>
                  <th className="p-2.5 text-center">Headcount</th>
                  <th className="p-2.5 text-center">Duration</th>
                  <th className="p-2.5 text-right">Daily Rate</th>
                  <th className="p-2.5 text-right">Subtotal</th>
                  <th className="p-2.5">Personnel Names / Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {ticket.lines.map((line, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="p-2.5 text-center font-mono text-slate-500">{idx + 1}</td>
                    <td className="p-2.5 font-bold text-slate-900">{line.role}</td>
                    <td className="p-2.5 text-center font-bold text-teal-800 bg-teal-50/50">
                      {line.quantity} pax
                    </td>
                    <td className="p-2.5 text-center text-slate-600">{line.days} day(s)</td>
                    <td className="p-2.5 text-right text-slate-700">
                      ₱{line.dailyRate.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-2.5 text-right font-bold text-emerald-800">
                      {formatCurrency(line.subtotal)}
                    </td>
                    <td className="p-2.5 text-slate-600">
                      {line.personnelNames && line.personnelNames.length > 0 ? (
                        <span className="font-medium text-slate-800">
                          {line.personnelNames.join(', ')}
                        </span>
                      ) : (
                        '—'
                      )}
                      {line.notes && (
                        <span className="text-[10px] text-slate-500 block italic mt-0.5">
                          {line.notes}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Costing & Logistics Breakdown Box */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 border border-slate-300 rounded-lg p-4 bg-slate-50/60 text-xs">
            <div className="md:col-span-7 space-y-2">
              <div className="font-bold text-slate-700 uppercase tracking-wider text-[11px] flex items-center space-x-1.5">
                <Truck className="w-3.5 h-3.5 text-slate-500" />
                <span>Scope of Work & Logistics</span>
              </div>
              <p className="text-slate-700 text-[11px] leading-relaxed">
                {ticket.scopeOfWork || 'General project manpower deployment and on-site works.'}
              </p>
              {ticket.vehicleDetails && (
                <div className="text-[11px] text-slate-600">
                  <strong className="text-slate-700">Vehicle / Driver:</strong> {ticket.vehicleDetails}
                </div>
              )}
            </div>

            <div className="md:col-span-5 space-y-2 border-t md:border-t-0 md:border-l border-slate-300 md:pl-4 pt-2 md:pt-0">
              <div className="flex justify-between items-center text-slate-600">
                <span>Total Headcount:</span>
                <span className="font-bold text-slate-900">{totalHeads} Person(s)</span>
              </div>
              <div className="flex justify-between items-center text-slate-600">
                <span>Subtotal Labor Cost:</span>
                <span className="font-semibold text-slate-900">{formatCurrency(ticket.laborCost)}</span>
              </div>
              <div className="flex justify-between items-center text-slate-600">
                <span>Mobilization Cost:</span>
                <span className="font-semibold text-slate-900">{formatCurrency(ticket.mobilizationCost)}</span>
              </div>
              {ticket.mobilizationNotes && (
                <p className="text-[10px] text-slate-500 italic text-right">
                  ({ticket.mobilizationNotes})
                </p>
              )}
              <div className="flex justify-between items-center pt-2 border-t border-slate-300 text-sm font-black text-slate-900">
                <span>Total Deployment Cost:</span>
                <span className="text-emerald-700">{formatCurrency(ticket.totalCost)}</span>
              </div>
            </div>
          </div>

          {/* Signatures Row - 3 Signatories with Name, Title, Signature Line, and Date */}
          <div className="pt-5 border-t border-slate-300 grid grid-cols-1 md:grid-cols-3 gap-6 text-center text-xs">
            {/* 1. Prepared By */}
            <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-200 space-y-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                Prepared By (Inihanda Ni)
              </span>
              <div className="border-b border-slate-400 pb-1.5 pt-2">
                <span className="font-bold text-sm text-slate-900 block">
                  {ticket.preparedBy || "M' Chrissna / Maricel"}
                </span>
                <span className="text-[10px] text-slate-500 font-medium">DSI Logistics / Office Admin</span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-600 pt-1">
                <span className="font-semibold text-slate-400 uppercase text-[9px]">Petsa / Date:</span>
                <span className="font-bold text-slate-800">{ticket.preparedDate || ticket.deploymentDate}</span>
              </div>
            </div>

            {/* 2. Site Supervisor */}
            <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-200 space-y-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                Site Supervisor (Supervisor)
              </span>
              <div className="border-b border-slate-400 pb-1.5 pt-2">
                <span className="font-bold text-sm text-slate-900 block">
                  {ticket.supervisor || ticket.leadSupervisor || 'Site Supervisor'}
                </span>
                <span className="text-[10px] text-slate-500 font-medium">Site Supervisor / Lead Foreman</span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-600 pt-1">
                <span className="font-semibold text-slate-400 uppercase text-[9px]">Petsa / Date:</span>
                <span className="font-bold text-slate-800">{ticket.supervisorDate || ticket.deploymentDate}</span>
              </div>
            </div>

            {/* 3. Project Manager */}
            <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-200 space-y-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                Approved By (Project Manager)
              </span>
              <div className="border-b border-slate-400 pb-1.5 pt-2">
                <span className="font-bold text-sm text-slate-900 block">
                  {ticket.projectManager || 'Project Manager'}
                </span>
                <span className="text-[10px] text-slate-500 font-medium">Project Manager / Operations Head</span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-600 pt-1">
                <span className="font-semibold text-slate-400 uppercase text-[9px]">Petsa / Date:</span>
                <span className="font-bold text-slate-800">{ticket.projectManagerDate || ticket.deploymentDate}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer (Hidden on print) */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between print:hidden">
          <span className="text-xs text-slate-500">
            Official DSI Deployment Ticket Record
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
