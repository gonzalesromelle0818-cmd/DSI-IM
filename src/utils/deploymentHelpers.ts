import { DeploymentTicket, DeploymentManpowerLine } from '../types';

/**
 * Format currency in Philippine Peso
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Total manpower headcount in a single deployment ticket
 */
export function getTotalHeadcount(lines: DeploymentManpowerLine[]): number {
  if (!lines || lines.length === 0) return 0;
  return lines.reduce((sum, line) => sum + (line.quantity || 0), 0);
}

/**
 * Export deployment tickets to CSV
 */
export function exportDeploymentToCSV(tickets: DeploymentTicket[]) {
  const headers = [
    'Deployment Ticket ID',
    'Project ID',
    'Project Name',
    'Location',
    'Lead / Supervisor',
    'Requested By',
    'Deployment Date',
    'Duration (Days)',
    'Total Heads',
    'Positions Summary',
    'Labor Cost (PHP)',
    'Mobilization Cost (PHP)',
    'Grand Total Cost (PHP)',
    'Status',
    'Scope of Work',
    'Vehicle Details',
    'Created At',
  ];

  const rows = tickets.map((t) => {
    const totalHeads = getTotalHeadcount(t.lines);
    const posSummary = t.lines
      .map((l) => `${l.quantity}x ${l.role} (@₱${l.dailyRate}/day for ${l.days}d)`)
      .join('; ');

    return [
      `"${t.id}"`,
      `"${t.projectId}"`,
      `"${(t.projectName || '').replace(/"/g, '""')}"`,
      `"${(t.projectLocation || '').replace(/"/g, '""')}"`,
      `"${(t.leadSupervisor || '').replace(/"/g, '""')}"`,
      `"${(t.requestedBy || '').replace(/"/g, '""')}"`,
      `"${t.deploymentDate}"`,
      t.daysCount,
      totalHeads,
      `"${posSummary.replace(/"/g, '""')}"`,
      t.laborCost,
      t.mobilizationCost,
      t.totalCost,
      `"${t.status}"`,
      `"${(t.scopeOfWork || '').replace(/"/g, '""')}"`,
      `"${(t.vehicleDetails || '').replace(/"/g, '""')}"`,
      `"${t.createdAt}"`,
    ].join(',');
  });

  const csvContent = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute(
    'download',
    `DSI_Manpower_Deployment_Report_${new Date().toISOString().slice(0, 10)}.csv`
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
