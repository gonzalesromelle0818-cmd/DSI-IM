import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { DeploymentTicket, Project } from '../types';
import { isDriverOrLogistics } from './deploymentHelpers';

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
  doc.setFontSize(13);
  doc.setTextColor(0, 0, 0);
  doc.text('DIVERSIFIED SOURCE INC. MANPOWER DEPLOYMENT FORM', pageWidth / 2, currentY, {
    align: 'center',
  });

  currentY += 7;

  // 2. HEADER BOXES (ACCOUNT TO, DEPLOYMENT FORM NO, ADDRESS, DATE)
  const headerBoxY = currentY;
  const headerBoxHeight = 18;
  const leftColWidth = 158;
  const midX = marginX + leftColWidth; // 15 + 158 = 173mm
  const rightColWidth = contentWidth - leftColWidth; // 267 - 158 = 109mm

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
  const leftLabelWidth = 40;
  doc.line(marginX + leftLabelWidth, headerBoxY, marginX + leftLabelWidth, headerBoxY + headerBoxHeight);

  // Divider between labels and values on right side
  const rightLabelWidth = 40;
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
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('ACCOUNT / PROJECT:', marginX + 2.5, headerBoxY + 5.8);

  doc.setFont('helvetica', 'normal');
  const projectLabel = `[${ticket.projectId}] ${ticket.projectName}`;
  doc.text(projectLabel, marginX + leftLabelWidth + 2.5, headerBoxY + 5.8, {
    maxWidth: leftColWidth - leftLabelWidth - 5,
  });

  doc.setFont('helvetica', 'bold');
  doc.text('DEPLOYMENT NO.:', midX + 2.5, headerBoxY + 5.8);

  doc.setFont('helvetica', 'bold');
  doc.text(ticket.id, midX + rightLabelWidth + 2.5, headerBoxY + 5.8, {
    maxWidth: rightColWidth - rightLabelWidth - 5,
  });

  // Row 2 Text
  const locationLabel = ticket.projectLocation || project?.location || 'On-Site';
  doc.setFont('helvetica', 'bold');
  doc.text('SITE ADDRESS / LOC:', marginX + 2.5, headerBoxY + 14.8);

  doc.setFont('helvetica', 'normal');
  doc.text(locationLabel, marginX + leftLabelWidth + 2.5, headerBoxY + 14.8, {
    maxWidth: leftColWidth - leftLabelWidth - 5,
  });

  doc.setFont('helvetica', 'bold');
  doc.text('DATE & DURATION:', midX + 2.5, headerBoxY + 14.8);

  doc.setFont('helvetica', 'normal');
  const dateStr = `${formattedDate} (${ticket.daysCount || 1} day${(ticket.daysCount || 1) > 1 ? 's' : ''})`;
  doc.text(dateStr, midX + rightLabelWidth + 2.5, headerBoxY + 14.8, {
    maxWidth: rightColWidth - rightLabelWidth - 5,
  });

  currentY += headerBoxHeight + 3;

  // 3. TABLE OF DEPLOYED MANPOWER
  const formatCurrency = (val: number) => {
    return 'PHP ' + Number(val || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const tableData = ticket.lines.length > 0
    ? ticket.lines.map((line, index) => {
        const personnelStr = line.personnelNames && line.personnelNames.length > 0
          ? ` [${line.personnelNames.join(', ')}]`
          : '';
        const remarks = (line.notes || '') + personnelStr;
        const dailyRateStr = formatCurrency(line.dailyRate);
        const subtotalStr = formatCurrency(line.subtotal);

        return [
          (index + 1).toString(),
          line.role,
          line.quantity.toString(),
          `${line.days} day(s)`,
          dailyRateStr,
          subtotalStr,
          remarks || '—',
        ];
      })
    : [
        [
          '1',
          'Mobilization & Logistics (Trucking / Pamasahe / Diesel / Toll)',
          '—',
          `${ticket.daysCount || 1} day(s)`,
          '—',
          formatCurrency(ticket.mobilizationCost),
          ticket.mobilizationNotes || ticket.vehicleDetails || 'Site Logistics & Mobilization',
        ],
      ];

  const totalHeads = ticket.lines.reduce((s, l) => s + l.quantity, 0);

  autoTable(doc, {
    startY: currentY,
    head: [
      [
        'ITEM',
        'MANPOWER POSITION / ROLE',
        'HEADCOUNT',
        'DURATION',
        'DAILY RATE (PHP)',
        'LABOR SUBTOTAL (PHP)',
        'ASSIGNED PERSONNEL / REMARKS',
      ],
    ],
    body: tableData,
    theme: 'plain',
    margin: { left: marginX, right: marginX },
    styles: {
      fontSize: 8,
      textColor: [0, 0, 0],
      lineColor: [0, 0, 0],
      lineWidth: 0.3,
      valign: 'middle',
      overflow: 'linebreak',
    },
    headStyles: {
      fillColor: [240, 240, 240],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      halign: 'center',
      lineWidth: 0.4,
      cellPadding: 2.5,
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 12, cellPadding: 2 },
      1: { halign: 'left', cellWidth: 50, fontStyle: 'bold', cellPadding: { top: 2.5, bottom: 2.5, left: 3, right: 3 } },
      2: { halign: 'center', cellWidth: 22, cellPadding: 2 },
      3: { halign: 'center', cellWidth: 22, cellPadding: 2 },
      4: { halign: 'right', cellWidth: 32, cellPadding: { top: 2.5, bottom: 2.5, left: 2, right: 4 } },
      5: { halign: 'right', cellWidth: 35, fontStyle: 'bold', cellPadding: { top: 2.5, bottom: 2.5, left: 2, right: 4 } },
      6: { halign: 'left', cellWidth: 94, cellPadding: { top: 2.5, bottom: 2.5, left: 4, right: 3 } },
    },
  });

  // Calculate final Y after table
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lastAutoTable = (doc as any).lastAutoTable;
  currentY = (lastAutoTable?.finalY || currentY + 40) + 3.5;

  // Check if we need a new page for cost breakdown & signature boxes to prevent overflow
  if (currentY + 28 + 26 + 10 > 200) {
    doc.addPage();
    currentY = 16;
  }

  // 4. COST BREAKDOWN & SUMMARY BOX
  const costBoxHeight = 28;
  const leftBoxWidth = 135;
  const rightBoxWidth = contentWidth - leftBoxWidth; // 132mm
  const costSplitX = marginX + leftBoxWidth; // 15 + 135 = 150mm
  const rightNumX = marginX + contentWidth - 4; // 278mm

  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.4);
  doc.rect(marginX, currentY, contentWidth, costBoxHeight);
  doc.line(costSplitX, currentY, costSplitX, currentY + costBoxHeight);

  // Left Details (Scope & Logistics)
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('SCOPE OF WORK / DEPLOYMENT REMARKS:', marginX + 3.5, currentY + 5.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  const scopeText = ticket.scopeOfWork || 'General project manpower deployment & installation.';
  doc.text(scopeText, marginX + 3.5, currentY + 10.5, { maxWidth: leftBoxWidth - 7 });

  if (ticket.vehicleDetails) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text('Vehicle / Transport:', marginX + 3.5, currentY + 21);
    doc.setFont('helvetica', 'normal');
    doc.text(ticket.vehicleDetails, marginX + 30, currentY + 21, { maxWidth: leftBoxWidth - 34 });
  }

  // Calculate Driver/Logistics cost from manpower lines to derive mobilization cost
  const driverLogisticsCost = ticket.lines
    .filter((l) => isDriverOrLogistics(l.role))
    .reduce((sum, l) => sum + l.subtotal, 0);

  const calculatedMobilizationCost = driverLogisticsCost > 0
    ? driverLogisticsCost
    : (ticket.mobilizationCost || 0);

  const calculatedLaborCost = driverLogisticsCost > 0
    ? ticket.lines.filter((l) => !isDriverOrLogistics(l.role)).reduce((sum, l) => sum + l.subtotal, 0)
    : (ticket.laborCost ?? (ticket.totalCost - calculatedMobilizationCost));

  const calculatedTotalCost = calculatedLaborCost + calculatedMobilizationCost;

  // Right Costing Summary (Neat, bounded, right-aligned numbers)
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(50, 50, 50);
  doc.text('Total Workforce Deployed:', costSplitX + 4, currentY + 5.2);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(`${totalHeads} Person(s) / ${ticket.lines.length} Role(s)`, rightNumX, currentY + 5.2, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(50, 50, 50);
  doc.text('Labor Subtotal (Site Crew):', costSplitX + 4, currentY + 9.8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(formatCurrency(calculatedLaborCost), rightNumX, currentY + 9.8, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(50, 50, 50);
  doc.text('Mobilization Cost (Driver/Logistics):', costSplitX + 4, currentY + 14.4);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(formatCurrency(calculatedMobilizationCost), rightNumX, currentY + 14.4, { align: 'right' });

  if (ticket.mobilizationNotes) {
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(100, 100, 100);
    doc.text(`Note: ${ticket.mobilizationNotes}`, costSplitX + 4, currentY + 18.2, { maxWidth: rightBoxWidth - 8 });
  }

  // Grand Total Highlighted Strip
  doc.setFillColor(243, 244, 246);
  doc.rect(costSplitX, currentY + 20.5, rightBoxWidth, 7.5, 'FD');
  doc.line(costSplitX, currentY + 20.5, marginX + contentWidth, currentY + 20.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(0, 0, 0);
  doc.text('TOTAL DEPLOYMENT COST:', costSplitX + 4, currentY + 25.4);
  doc.setFontSize(9);
  doc.text(
    formatCurrency(calculatedTotalCost),
    rightNumX,
    currentY + 25.4,
    { align: 'right' }
  );

  currentY += costBoxHeight + 4;

  // 5. SIGNATURE SECTION (3 Signatories: Prepared By, Supervisor, Project Manager)
  const sigBoxHeight = 26;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.4);
  doc.rect(marginX, currentY, contentWidth, sigBoxHeight);

  const colWidth = contentWidth / 3; // 89mm
  doc.line(marginX + colWidth, currentY, marginX + colWidth, currentY + sigBoxHeight);
  doc.line(marginX + colWidth * 2, currentY, marginX + colWidth * 2, currentY + sigBoxHeight);

  const sigInnerWidth = colWidth - 7;

  // Column 1: Prepared By
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('1. PREPARED BY (Inihanda Ni):', marginX + 3.5, currentY + 5.5, { maxWidth: sigInnerWidth });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  const prepName = ticket.preparedBy || preparedBy || "M' Chrissna / Maricel";
  doc.text(prepName, marginX + 3.5, currentY + 13, { maxWidth: sigInnerWidth });
  doc.setLineWidth(0.3);
  doc.line(marginX + 3.5, currentY + 14.5, marginX + colWidth - 5, currentY + 14.5);
  doc.setFontSize(7.5);
  doc.setTextColor(90, 90, 90);
  doc.text('DSI Logistics / Office Admin', marginX + 3.5, currentY + 18.5, { maxWidth: sigInnerWidth });
  doc.setFontSize(7.5);
  doc.setTextColor(0, 0, 0);
  doc.text(`Date: ${ticket.preparedDate || ticket.deploymentDate}`, marginX + 3.5, currentY + 22.5, { maxWidth: sigInnerWidth });

  // Column 2: Site Supervisor
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('2. SITE SUPERVISOR (Supervisor):', marginX + colWidth + 3.5, currentY + 5.5, { maxWidth: sigInnerWidth });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  const supName = ticket.supervisor || ticket.leadSupervisor || supervisor || 'Site Supervisor';
  doc.text(supName, marginX + colWidth + 3.5, currentY + 13, { maxWidth: sigInnerWidth });
  doc.setLineWidth(0.3);
  doc.line(marginX + colWidth + 3.5, currentY + 14.5, marginX + colWidth * 2 - 5, currentY + 14.5);
  doc.setFontSize(7.5);
  doc.setTextColor(90, 90, 90);
  doc.text('Lead Supervisor / Site Foreman', marginX + colWidth + 3.5, currentY + 18.5, { maxWidth: sigInnerWidth });
  doc.setFontSize(7.5);
  doc.setTextColor(0, 0, 0);
  doc.text(`Date: ${ticket.supervisorDate || ticket.deploymentDate}`, marginX + colWidth + 3.5, currentY + 22.5, { maxWidth: sigInnerWidth });

  // Column 3: Project Manager
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('3. PROJECT MANAGER (Approved By):', marginX + colWidth * 2 + 3.5, currentY + 5.5, { maxWidth: sigInnerWidth });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  const pmName = ticket.projectManager || projectManager || 'Engr. Roberto Santos';
  doc.text(pmName, marginX + colWidth * 2 + 3.5, currentY + 13, { maxWidth: sigInnerWidth });
  doc.setLineWidth(0.3);
  doc.line(marginX + colWidth * 2 + 3.5, currentY + 14.5, marginX + contentWidth - 5, currentY + 14.5);
  doc.setFontSize(7.5);
  doc.setTextColor(90, 90, 90);
  doc.text('Project Manager / Operations In-Charge', marginX + colWidth * 2 + 3.5, currentY + 18.5, { maxWidth: sigInnerWidth });
  doc.setFontSize(7.5);
  doc.setTextColor(0, 0, 0);
  doc.text(`Date: ${ticket.projectManagerDate || ticket.deploymentDate}`, marginX + colWidth * 2 + 3.5, currentY + 22.5, { maxWidth: sigInnerWidth });

  // Save the PDF
  doc.save(`DSI_Deployment_Slip_${ticket.id}_${ticket.projectName.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
}
