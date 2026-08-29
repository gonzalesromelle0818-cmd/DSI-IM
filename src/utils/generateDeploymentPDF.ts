import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { DeploymentTicket, Project } from '../types';

interface DeploymentPDFOptions {
  ticket: DeploymentTicket;
  project?: Project;
  preparedBy?: string;
  supervisor?: string;
  projectManager?: string;
  checkedBy?: string;
  originatedFrom?: string;
}

export function generateDeploymentPDF({
  ticket,
  project,
  preparedBy = "M' Chrissna / Maricel",
  supervisor,
  projectManager,
}: DeploymentPDFOptions) {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // ~297mm
  const marginX = 15;
  const contentWidth = pageWidth - marginX * 2; // ~267mm

  let currentY = 18;

  // 1. TITLE: DIVERSIFIED SOURCE INC. MANPOWER DEPLOYMENT FORM
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text('DIVERSIFIED SOURCE INC. MANPOWER DEPLOYMENT FORM', pageWidth / 2, currentY, {
    align: 'center',
  });

  currentY += 8;

  // 2. HEADER BOXES (ACCOUNT TO, DEPLOYMENT FORM NO, ADDRESS, DATE)
  const headerBoxY = currentY;
  const headerBoxHeight = 18;
  const leftColWidth = 175;
  const midX = marginX + leftColWidth;

  // Outer Border & Grid Lines for Header
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.4);

  // Outer rectangle for top metadata
  doc.rect(marginX, headerBoxY, contentWidth, headerBoxHeight);
  // Horizontal divider
  doc.line(marginX, headerBoxY + 9, marginX + contentWidth, headerBoxY + 9);
  // Vertical divider between Left (Account/Address) and Right (Form No/Date)
  doc.line(midX, headerBoxY, midX, headerBoxY + headerBoxHeight);

  // Divider between labels and values on left side
  const leftLabelWidth = 38;
  doc.line(marginX + leftLabelWidth, headerBoxY, marginX + leftLabelWidth, headerBoxY + headerBoxHeight);

  // Divider between labels and values on right side
  const rightLabelWidth = 48;
  doc.line(midX + rightLabelWidth, headerBoxY, midX + rightLabelWidth, headerBoxY + headerBoxHeight);

  // Format Date to MM/DD/YYYY
  let formattedDate = ticket.deploymentDate;
  try {
    if (ticket.deploymentDate.includes('-')) {
      const [yyyy, mm, dd] = ticket.deploymentDate.split('-');
      if (yyyy && mm && dd) {
        formattedDate = `${mm}/${dd}/${yyyy}`;
      }
    }
  } catch {
    formattedDate = ticket.deploymentDate;
  }

  // Row 1 Text
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.text('ACCOUNT / PROJECT:', marginX + 2, headerBoxY + 6);

  doc.setFont('helvetica', 'normal');
  const projectLabel = `[${ticket.projectId}] ${ticket.projectName}`;
  doc.text(projectLabel, marginX + leftLabelWidth + 3, headerBoxY + 6);

  doc.setFont('helvetica', 'bold');
  doc.text('DEPLOYMENT NO.:', midX + 2, headerBoxY + 6);

  doc.setFont('helvetica', 'bold');
  doc.text(ticket.id, midX + rightLabelWidth + 3, headerBoxY + 6);

  // Row 2 Text
  const locationLabel = ticket.projectLocation || project?.location || 'On-Site';
  doc.setFont('helvetica', 'bold');
  doc.text('SITE ADDRESS / LOC:', marginX + 2, headerBoxY + 15);

  doc.setFont('helvetica', 'normal');
  doc.text(locationLabel, marginX + leftLabelWidth + 3, headerBoxY + 15);

  doc.setFont('helvetica', 'bold');
  doc.text('DATE & DURATION:', midX + 2, headerBoxY + 15);

  doc.setFont('helvetica', 'normal');
  const dateStr = `${formattedDate} (${ticket.daysCount || 1} day${(ticket.daysCount || 1) > 1 ? 's' : ''})`;
  doc.text(dateStr, midX + rightLabelWidth + 3, headerBoxY + 15);

  currentY += headerBoxHeight + 3;

  // 3. TABLE OF DEPLOYED MANPOWER
  const tableData = ticket.lines.map((line, index) => {
    const personnelStr = line.personnelNames && line.personnelNames.length > 0
      ? ` [${line.personnelNames.join(', ')}]`
      : '';
    const remarks = (line.notes || '') + personnelStr;
    const dailyRateStr = `₱${line.dailyRate.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const subtotalStr = `₱${line.subtotal.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    return [
      (index + 1).toString(),
      line.role,
      line.quantity.toString(),
      `${line.days} day(s)`,
      dailyRateStr,
      subtotalStr,
      remarks || '—',
    ];
  });

  const totalHeads = ticket.lines.reduce((s, l) => s + l.quantity, 0);

  autoTable(doc, {
    startY: currentY,
    head: [
      [
        'ITEM',
        'MANPOWER POSITION / ROLE',
        'HEADCOUNT',
        'DURATION',
        'DAILY RATE (₱)',
        'LABOR SUBTOTAL',
        'ASSIGNED PERSONNEL / REMARKS',
      ],
    ],
    body: tableData,
    theme: 'plain',
    margin: { left: marginX, right: marginX },
    styles: {
      fontSize: 8.5,
      cellPadding: 2,
      textColor: [0, 0, 0],
      lineColor: [0, 0, 0],
      lineWidth: 0.3,
      valign: 'middle',
    },
    headStyles: {
      fillColor: [240, 240, 240],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      halign: 'center',
      lineWidth: 0.4,
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 15 },
      1: { halign: 'left', cellWidth: 50, fontStyle: 'bold' },
      2: { halign: 'center', cellWidth: 25 },
      3: { halign: 'center', cellWidth: 25 },
      4: { halign: 'right', cellWidth: 35 },
      5: { halign: 'right', cellWidth: 40, fontStyle: 'bold' },
      6: { halign: 'left' },
    },
  });

  // Calculate final Y after table
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lastAutoTable = (doc as any).lastAutoTable;
  currentY = (lastAutoTable?.finalY || currentY + 40) + 4;

  // 4. COST BREAKDOWN & SUMMARY BOX
  const costBoxHeight = 22;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.4);
  doc.rect(marginX, currentY, contentWidth, costBoxHeight);

  // Vertical split in Cost Box: Left (Scope/Vehicle notes) vs Right (Calculations)
  const costSplitX = marginX + 160;
  doc.line(costSplitX, currentY, costSplitX, currentY + costBoxHeight);

  // Left Details
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('SCOPE OF WORK / LOGISTICS NOTES:', marginX + 2, currentY + 5);
  doc.setFont('helvetica', 'normal');
  const scopeText = ticket.scopeOfWork || 'General project manpower deployment & installation.';
  doc.text(scopeText, marginX + 2, currentY + 10, { maxWidth: 155 });

  if (ticket.vehicleDetails) {
    doc.setFont('helvetica', 'bold');
    doc.text(`Vehicle: ${ticket.vehicleDetails}`, marginX + 2, currentY + 18);
  }

  // Right Costing
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`Total Headcount: ${totalHeads} Person(s)`, costSplitX + 3, currentY + 5);
  doc.text(
    `Subtotal Labor Cost: ₱${ticket.laborCost.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`,
    costSplitX + 3,
    currentY + 10
  );
  doc.text(
    `Mobilization Cost: ₱${ticket.mobilizationCost.toLocaleString('en-PH', { minimumFractionDigits: 2 })}${ticket.mobilizationNotes ? ` (${ticket.mobilizationNotes})` : ''}`,
    costSplitX + 3,
    currentY + 15
  );

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text(
    `GRAND TOTAL DEPLOYMENT COST: ₱${ticket.totalCost.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`,
    costSplitX + 3,
    currentY + 20
  );

  currentY += costBoxHeight + 5;

  // 5. SIGNATURE SECTION (3 Signatories: Prepared By, Supervisor, Project Manager)
  const sigBoxHeight = 26;
  doc.rect(marginX, currentY, contentWidth, sigBoxHeight);

  const colWidth = contentWidth / 3;
  doc.line(marginX + colWidth, currentY, marginX + colWidth, currentY + sigBoxHeight);
  doc.line(marginX + colWidth * 2, currentY, marginX + colWidth * 2, currentY + sigBoxHeight);

  // Column 1: Prepared By
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('1. PREPARED BY (Inihanda Ni):', marginX + 3, currentY + 5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  const prepName = ticket.preparedBy || preparedBy || "M' Chrissna / Maricel";
  doc.text(prepName, marginX + 3, currentY + 14);
  doc.setFontSize(7.5);
  doc.setTextColor(90, 90, 90);
  doc.text('DSI Logistics / Office Admin', marginX + 3, currentY + 18);
  doc.setFontSize(7.5);
  doc.setTextColor(0, 0, 0);
  doc.text(`Date: ${ticket.preparedDate || ticket.deploymentDate}`, marginX + 3, currentY + 22);

  // Column 2: Site Supervisor
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('2. SITE SUPERVISOR (Supervisor):', marginX + colWidth + 3, currentY + 5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  const supName = ticket.supervisor || ticket.leadSupervisor || supervisor || 'Site Supervisor';
  doc.text(supName, marginX + colWidth + 3, currentY + 14);
  doc.setFontSize(7.5);
  doc.setTextColor(90, 90, 90);
  doc.text('Lead Supervisor / Site Foreman', marginX + colWidth + 3, currentY + 18);
  doc.setFontSize(7.5);
  doc.setTextColor(0, 0, 0);
  doc.text(`Date: ${ticket.supervisorDate || ticket.deploymentDate}`, marginX + colWidth + 3, currentY + 22);

  // Column 3: Project Manager
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('3. PROJECT MANAGER (Approved By):', marginX + colWidth * 2 + 3, currentY + 5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  const pmName = ticket.projectManager || projectManager || 'Project Manager';
  doc.text(pmName, marginX + colWidth * 2 + 3, currentY + 14);
  doc.setFontSize(7.5);
  doc.setTextColor(90, 90, 90);
  doc.text('Project Manager / Operations In-Charge', marginX + colWidth * 2 + 3, currentY + 18);
  doc.setFontSize(7.5);
  doc.setTextColor(0, 0, 0);
  doc.text(`Date: ${ticket.projectManagerDate || ticket.deploymentDate}`, marginX + colWidth * 2 + 3, currentY + 22);

  // Save the PDF
  doc.save(`DSI_Deployment_Slip_${ticket.id}_${ticket.projectName.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
}
