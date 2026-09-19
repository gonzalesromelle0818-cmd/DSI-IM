import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { DeploymentTicket, Project } from '../types';
import { formatCurrency, getTotalHeadcount } from './deploymentHelpers';

interface DeploymentSchedulePDFOptions {
  tickets: DeploymentTicket[];
  projects?: Project[];
  title?: string;
  statusFilter?: string;
  projectFilter?: string;
  preparedBy?: string;
  projectManager?: string;
}

export function generateDeploymentSchedulePDF({
  tickets,
  projects = [],
  title = 'DIVERSIFIED SOURCE INC. - MANPOWER DEPLOYMENT SCHEDULE & TIMELINE',
  statusFilter = 'all',
  projectFilter = 'all',
  preparedBy = "M' Chrissna / Maricel",
  projectManager = 'Engr. Roberto Santos',
}: DeploymentSchedulePDFOptions) {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 297mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 210mm
  const marginX = 14;
  const contentWidth = pageWidth - marginX * 2; // 269mm
  const dateGenerated = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  let currentY = 14;

  // 1. HEADER BANNER
  doc.setFillColor(15, 23, 42); // slate-900
  doc.roundedRect(marginX, currentY, contentWidth, 18, 2, 2, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(255, 255, 255);
  doc.text('DIVERSIFIED SOURCE INC.', marginX + 6, currentY + 6.5);

  doc.setFontSize(9.5);
  doc.setTextColor(45, 212, 191); // teal-400
  doc.text('MANPOWER DEPLOYMENT SCHEDULE & SITE TIMELINE REPORT', marginX + 6, currentY + 12.5);

  // Date and stats on top right
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(203, 213, 225); // slate-300
  doc.text(`Generated: ${dateGenerated}`, pageWidth - marginX - 6, currentY + 6.5, { align: 'right' });
  doc.text(
    `Total Tickets: ${tickets.length}  |  Filter: Status (${statusFilter}), Project (${projectFilter})`,
    pageWidth - marginX - 6,
    currentY + 12.5,
    { align: 'right' }
  );

  currentY += 23;

  // 2. SUMMARY METRICS ROW
  const totalCost = tickets.reduce((acc, t) => acc + (t.totalCost || 0), 0);
  const activeTickets = tickets.filter((t) => t.status === 'Active On-Site').length;
  const scheduledTickets = tickets.filter((t) => t.status === 'Scheduled').length;
  const completedTickets = tickets.filter((t) => t.status === 'Completed').length;
  const totalHeads = tickets.reduce((acc, t) => acc + getTotalHeadcount(t.lines), 0);

  const kpiBoxWidth = (contentWidth - 12) / 5;
  const kpiHeight = 12;

  const formatPHP = (amt: number) =>
    'PHP ' + Number(amt || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const kpis = [
    { label: 'ACTIVE ON-SITE', val: `${activeTickets} ticket(s)`, bg: [236, 253, 245], text: [4, 120, 87] },
    { label: 'SCHEDULED UPCOMING', val: `${scheduledTickets} ticket(s)`, bg: [239, 246, 255], text: [29, 78, 216] },
    { label: 'COMPLETED DEPLOYMENTS', val: `${completedTickets} ticket(s)`, bg: [241, 245, 249], text: [71, 85, 105] },
    { label: 'TOTAL WORKFORCE DEPLOYED', val: `${totalHeads} head(s)`, bg: [240, 253, 250], text: [13, 148, 136] },
    { label: 'OVERALL DEPLOYMENT COST', val: formatPHP(totalCost), bg: [254, 252, 232], text: [161, 98, 7] },
  ];

  kpis.forEach((kpi, idx) => {
    const kpiX = marginX + idx * (kpiBoxWidth + 3);
    doc.setFillColor(kpi.bg[0], kpi.bg[1], kpi.bg[2]);
    doc.roundedRect(kpiX, currentY, kpiBoxWidth, kpiHeight, 1.5, 1.5, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.2);
    doc.roundedRect(kpiX, currentY, kpiBoxWidth, kpiHeight, 1.5, 1.5, 'D');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5.5);
    doc.setTextColor(100, 116, 139);
    doc.text(kpi.label, kpiX + 3, currentY + 4);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(kpi.text[0], kpi.text[1], kpi.text[2]);
    doc.text(kpi.val, kpiX + 3, currentY + 9.5, { maxWidth: kpiBoxWidth - 6 });
  });

  currentY += kpiHeight + 6;

  // 3. TABLE DATA WITH GANTT/SCHEDULE BAR DETAILS
  // We sort tickets by deploymentDate asc
  const sortedTickets = [...tickets].sort((a, b) => {
    const dateA = a.deploymentDate || '';
    const dateB = b.deploymentDate || '';
    return dateA.localeCompare(dateB);
  });

  const tableRows = sortedTickets.map((t, idx) => {
    const headcount = getTotalHeadcount(t.lines);
    const rolesSummary = t.lines.map((l) => `${l.quantity}x ${l.role}`).join(', ') || 'N/A';
    const supervisor = t.supervisor || t.leadSupervisor || 'N/A';
    const projManager = t.projectManager || 'N/A';
    const dates = t.endDate && t.endDate !== t.deploymentDate
      ? `${t.deploymentDate} to ${t.endDate} (${t.daysCount} days)`
      : `${t.deploymentDate} (${t.daysCount} day)`;

    return [
      String(idx + 1),
      t.id,
      t.projectName + (t.projectLocation ? `\n(${t.projectLocation})` : ''),
      dates,
      `${headcount} heads\n${rolesSummary}`,
      `Lead: ${supervisor}\nPM: ${projManager}`,
      t.status,
      formatPHP(t.totalCost || 0),
    ];
  });

  autoTable(doc, {
    startY: currentY,
    head: [
      [
        '#',
        'Ticket ID',
        'Project Name & Site',
        'Schedule & Duration',
        'Manpower Allocation',
        'Site Supervisors & In-Charge',
        'Status',
        'Total Cost',
      ],
    ],
    body: tableRows,
    theme: 'grid',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.5,
      halign: 'center',
      cellPadding: 2.5,
    },
    bodyStyles: {
      fontSize: 7,
      textColor: [30, 41, 59],
      cellPadding: 2.2,
      valign: 'middle',
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 9 },
      1: { halign: 'center', fontStyle: 'bold', cellWidth: 24 },
      2: { halign: 'left', cellWidth: 52 },
      3: { halign: 'center', cellWidth: 46 },
      4: { halign: 'left', cellWidth: 56 },
      5: { halign: 'left', cellWidth: 44 },
      6: { halign: 'center', fontStyle: 'bold', cellWidth: 22 },
      7: { halign: 'right', fontStyle: 'bold', cellWidth: 16 },
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 6) {
        const val = String(data.cell.raw);
        if (val === 'Active On-Site') {
          data.cell.styles.textColor = [4, 120, 87]; // emerald
          data.cell.styles.fillColor = [236, 253, 245];
        } else if (val === 'Scheduled') {
          data.cell.styles.textColor = [29, 78, 216]; // blue
          data.cell.styles.fillColor = [239, 246, 255];
        } else if (val === 'Completed') {
          data.cell.styles.textColor = [71, 85, 105]; // slate
          data.cell.styles.fillColor = [248, 250, 252];
        } else if (val === 'Cancelled') {
          data.cell.styles.textColor = [185, 28, 28]; // red
          data.cell.styles.fillColor = [254, 242, 242];
        }
      }
    },
    margin: { left: marginX, right: marginX, bottom: 25 },
  });

  // SIGNATORIES BLOCK AT BOTTOM OF LAST PAGE
  const finalY = (doc as any).lastAutoTable?.finalY || currentY + 30;
  const remainingSpace = pageHeight - finalY;

  let sigY = finalY + 8;
  if (remainingSpace < 26) {
    doc.addPage();
    sigY = 20;
  }

  const sigWidth = contentWidth / 3;

  // Box 1: Prepared By
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text('PREPARED BY (DISPATCH / ADMIN):', marginX, sigY);
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text(preparedBy, marginX, sigY + 6);
  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.3);
  doc.line(marginX, sigY + 8, marginX + sigWidth - 10, sigY + 8);
  doc.setFontSize(6);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`Date: ${dateGenerated}`, marginX, sigY + 11.5);

  // Box 2: Verified By
  const sig2X = marginX + sigWidth;
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text('VERIFIED BY (SITE IN-CHARGE / FOREMAN):', sig2X, sigY);
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text('Site Lead / Supervisor', sig2X, sigY + 6);
  doc.line(sig2X, sigY + 8, sig2X + sigWidth - 10, sigY + 8);
  doc.setFontSize(6);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Signature over Printed Name', sig2X, sigY + 11.5);

  // Box 3: Approved By
  const sig3X = marginX + sigWidth * 2;
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text('APPROVED BY (PROJECT MANAGER):', sig3X, sigY);
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text(projectManager, sig3X, sigY + 6);
  doc.line(sig3X, sigY + 8, marginX + contentWidth, sigY + 8);
  doc.setFontSize(6);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Diversified Source Inc.', sig3X, sigY + 11.5);

  // Page Numbers
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184);
    doc.text(
      `DSI Deployment Schedule System • Page ${i} of ${totalPages}`,
      pageWidth / 2,
      pageHeight - 6,
      { align: 'center' }
    );
  }

  // Save the PDF
  const filename = `DSI_Deployment_Schedule_${dateGenerated.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
  doc.save(filename);
}
