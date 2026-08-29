import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Project, PullOutTicket, DeploymentTicket, InventoryItem } from '../types';
import { formatCurrency } from './inventoryHelpers';

interface ProjectCostPDFOptions {
  project: Project;
  pullOutTickets: PullOutTicket[];
  deploymentTickets: DeploymentTicket[];
  inventoryItems?: InventoryItem[];
  preparedBy?: string;
  supervisor?: string;
  projectManager?: string;
}

export function generateProjectCostPDF({
  project,
  pullOutTickets,
  deploymentTickets,
  inventoryItems = [],
  preparedBy = "M' Chrissna / Maricel",
  supervisor,
  projectManager = 'Engr. Roberto Santos',
}: ProjectCostPDFOptions) {
  // Filter records for this project
  const pId = project.id.toLowerCase();
  const pName = project.name.toLowerCase();

  const relatedPullOuts = pullOutTickets.filter(
    (t) => t.projectId.toLowerCase() === pId || t.projectName.toLowerCase() === pName
  );

  const relatedDeployments = deploymentTickets.filter(
    (t) => t.projectId.toLowerCase() === pId || t.projectName.toLowerCase() === pName
  );

  // Extract all pulled out item lines
  interface MaterialLine {
    date: string;
    ticketId: string;
    assetId: string;
    description: string;
    category: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    totalCost: number;
  }

  const materialLines: MaterialLine[] = [];
  let totalMaterialCost = 0;
  let totalMaterialUnits = 0;

  relatedPullOuts.forEach((ticket) => {
    ticket.items.forEach((item) => {
      // Find unit price from item line or inventory masterlist
      let price = item.unitPrice || 0;
      if (price === 0 && inventoryItems.length > 0) {
        const invItem = inventoryItems.find((i) => i.id === item.itemId || i.assetId === item.assetId);
        if (invItem && invItem.unitPrice) {
          price = invItem.unitPrice;
        }
      }
      const lineCost = item.quantity * price;
      totalMaterialCost += lineCost;
      totalMaterialUnits += item.quantity;

      materialLines.push({
        date: ticket.date,
        ticketId: ticket.id,
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

  // Calculate manpower & mobilization costs
  let totalLaborCost = 0;
  let totalMobilizationCost = 0;
  let totalHeadsDeployed = 0;

  relatedDeployments.forEach((dep) => {
    totalLaborCost += dep.laborCost || 0;
    totalMobilizationCost += dep.mobilizationCost || 0;
    const heads = dep.lines.reduce((acc, l) => acc + (l.quantity || 0), 0);
    totalHeadsDeployed += heads;
  });

  const totalDeploymentCost = totalLaborCost + totalMobilizationCost;
  const grandTotalCost = totalMaterialCost + totalDeploymentCost;

  // Initialize PDF
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // ~210mm
  const marginX = 12;
  const contentWidth = pageWidth - marginX * 2; // ~186mm
  let currentY = 14;

  // Helper formatting
  const formatPHP = (val: number) => {
    return 'PHP ' + Number(val || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // 1. HEADER SECTION
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text('DIVERSIFIED SOURCE INC.', pageWidth / 2, currentY, { align: 'center' });

  currentY += 5.5;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(13, 148, 136); // teal-600
  doc.text('PROJECT COST & OPERATIONS DISPATCH SUMMARY REPORT', pageWidth / 2, currentY, { align: 'center' });

  currentY += 4.5;
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139); // slate-500
  const dateGenerated = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  doc.text(`Generated on: ${dateGenerated} | System Report Reference: DSI-PRJ-${project.id}`, pageWidth / 2, currentY, {
    align: 'center',
  });

  currentY += 6;

  // 2. PROJECT METADATA CARD (Box)
  const metaBoxY = currentY;
  const metaBoxHeight = 22;
  doc.setDrawColor(203, 213, 225); // slate-300
  doc.setFillColor(248, 250, 252); // slate-50
  doc.roundedRect(marginX, metaBoxY, contentWidth, metaBoxHeight, 2, 2, 'FD');

  // Left Column: Project Details
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('PROJECT ID:', marginX + 3, metaBoxY + 5.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(project.id, marginX + 26, metaBoxY + 5.5);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('PROJECT NAME:', marginX + 3, metaBoxY + 11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(project.name, marginX + 26, metaBoxY + 11);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('SITE LOCATION:', marginX + 3, metaBoxY + 16.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  doc.text(project.location || 'N/A', marginX + 26, metaBoxY + 16.5);

  // Right Column: Lead & Status
  const rightColX = marginX + 110;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('PROJECT LEAD / PM:', rightColX, metaBoxY + 5.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(project.leadPerson || supervisor || 'Unassigned', rightColX + 32, metaBoxY + 5.5);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('STATUS:', rightColX, metaBoxY + 11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(13, 148, 136);
  doc.text(project.status || 'Active', rightColX + 32, metaBoxY + 11);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('TOTAL EXPENSE:', rightColX, metaBoxY + 16.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(formatPHP(grandTotalCost), rightColX + 32, metaBoxY + 16.5);

  currentY += metaBoxHeight + 5;

  // 3. EXECUTIVE FINANCIAL SUMMARY TABLE
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('1. EXECUTIVE COST SUMMARY', marginX, currentY);

  currentY += 2;

  const costSummaryRows = [
    [
      'A. Materials & Inventory Pull-Out',
      `${relatedPullOuts.length} ticket(s) / ${totalMaterialUnits} unit(s)`,
      formatPHP(totalMaterialCost),
    ],
    [
      'B. Manpower Labor Cost',
      `${relatedDeployments.length} deployment(s) / ${totalHeadsDeployed} heads`,
      formatPHP(totalLaborCost),
    ],
    [
      'C. Mobilization & Logistics Cost',
      'Transportation, fuel & toll allowances',
      formatPHP(totalMobilizationCost),
    ],
    [
      'GRAND TOTAL PROJECT EXPENSE',
      'Total Dispatched Materials + Manpower Labor + Mobilization',
      formatPHP(grandTotalCost),
    ],
  ];

  autoTable(doc, {
    startY: currentY,
    head: [['Cost Category', 'Scope & Quantity', 'Subtotal Amount (PHP)']],
    body: costSummaryRows,
    theme: 'grid',
    margin: { left: marginX, right: marginX },
    styles: {
      fontSize: 8,
      cellPadding: 2.2,
      textColor: [30, 41, 59],
      valign: 'middle',
    },
    headStyles: {
      fillColor: [15, 23, 42], // slate-900
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'left',
    },
    columnStyles: {
      0: { cellWidth: 70, fontStyle: 'bold' },
      1: { cellWidth: 75 },
      2: { cellWidth: 41, halign: 'right', fontStyle: 'bold' },
    },
    didParseCell: (data) => {
      if (data.row.index === costSummaryRows.length - 1) {
        data.cell.styles.fillColor = [241, 245, 249]; // slate-100
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.textColor = [13, 148, 136]; // teal-600
        data.cell.styles.fontSize = 8.5;
      }
    },
  });

  currentY = (doc as any).lastAutoTable.finalY + 7;

  // 4. MATERIALS & INVENTORY PULL-OUT TABLE
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`2. MATERIALS & TOOLS PULLED OUT (${materialLines.length} Item Records)`, marginX, currentY);

  currentY += 2;

  if (materialLines.length === 0) {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(148, 163, 184);
    doc.text('Walang naitalang pull out na gamit o materyales para sa proyektong ito.', marginX, currentY + 4);
    currentY += 10;
  } else {
    const matTableRows = materialLines.map((m, idx) => [
      (idx + 1).toString(),
      m.date,
      m.ticketId,
      m.assetId,
      m.description,
      `${m.quantity} ${m.unit}`,
      m.unitPrice > 0 ? formatPHP(m.unitPrice) : '-',
      formatPHP(m.totalCost),
    ]);

    autoTable(doc, {
      startY: currentY,
      head: [['#', 'Date', 'Ticket #', 'Asset Code', 'Description', 'Qty', 'Unit Price', 'Total Cost']],
      body: matTableRows,
      theme: 'grid',
      margin: { left: marginX, right: marginX },
      styles: {
        fontSize: 7.5,
        cellPadding: 1.8,
        textColor: [30, 41, 59],
        valign: 'middle',
      },
      headStyles: {
        fillColor: [30, 41, 59], // slate-800
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 7.5,
      },
      columnStyles: {
        0: { cellWidth: 8, halign: 'center' },
        1: { cellWidth: 18, halign: 'center' },
        2: { cellWidth: 20, halign: 'center' },
        3: { cellWidth: 22, fontStyle: 'bold' },
        4: { cellWidth: 54 },
        5: { cellWidth: 18, halign: 'center' },
        6: { cellWidth: 22, halign: 'right' },
        7: { cellWidth: 24, halign: 'right', fontStyle: 'bold' },
      },
      foot: [
        [
          '',
          '',
          '',
          'TOTAL MATERIAL COST',
          `${totalMaterialUnits} units total`,
          '',
          '',
          formatPHP(totalMaterialCost),
        ],
      ],
      footStyles: {
        fillColor: [241, 245, 249],
        textColor: [15, 23, 42],
        fontStyle: 'bold',
        fontSize: 8,
      },
    });

    currentY = (doc as any).lastAutoTable.finalY + 7;
  }

  // 5. MANPOWER DEPLOYMENTS TABLE
  // Check if we need a new page
  if (currentY > 215) {
    doc.addPage();
    currentY = 16;
  }

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`3. MANPOWER DEPLOYMENT HISTORY (${relatedDeployments.length} Deployments)`, marginX, currentY);

  currentY += 2;

  if (relatedDeployments.length === 0) {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(148, 163, 184);
    doc.text('Walang naitalang deployment ng manpower para sa proyektong ito.', marginX, currentY + 4);
    currentY += 10;
  } else {
    const depTableRows = relatedDeployments.map((d, idx) => {
      const rolesSummary = d.lines.map((l) => `${l.quantity}x ${l.role}`).join(', ');
      return [
        (idx + 1).toString(),
        d.deploymentDate,
        d.id,
        `${d.daysCount} day(s)`,
        rolesSummary || 'Personnel',
        formatPHP(d.laborCost),
        formatPHP(d.mobilizationCost),
        formatPHP(d.totalCost),
      ];
    });

    autoTable(doc, {
      startY: currentY,
      head: [['#', 'Date', 'Ticket #', 'Days', 'Deployed Positions / Heads', 'Labor Cost', 'Mobilization', 'Total Cost']],
      body: depTableRows,
      theme: 'grid',
      margin: { left: marginX, right: marginX },
      styles: {
        fontSize: 7.5,
        cellPadding: 1.8,
        textColor: [30, 41, 59],
        valign: 'middle',
      },
      headStyles: {
        fillColor: [15, 118, 110], // teal-700
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 7.5,
      },
      columnStyles: {
        0: { cellWidth: 8, halign: 'center' },
        1: { cellWidth: 18, halign: 'center' },
        2: { cellWidth: 20, halign: 'center' },
        3: { cellWidth: 14, halign: 'center' },
        4: { cellWidth: 54 },
        5: { cellWidth: 23, halign: 'right' },
        6: { cellWidth: 23, halign: 'right' },
        7: { cellWidth: 26, halign: 'right', fontStyle: 'bold' },
      },
      foot: [
        [
          '',
          '',
          '',
          'TOTAL DEPLOYMENT COST',
          `${totalHeadsDeployed} heads deployed`,
          formatPHP(totalLaborCost),
          formatPHP(totalMobilizationCost),
          formatPHP(totalDeploymentCost),
        ],
      ],
      footStyles: {
        fillColor: [240, 253, 250], // teal-50
        textColor: [13, 148, 136], // teal-600
        fontStyle: 'bold',
        fontSize: 8,
      },
    });

    currentY = (doc as any).lastAutoTable.finalY + 8;
  }

  // 6. SYSTEM-GENERATED REPORT FOOTER & NOTICE
  // Ensure enough room on the current page or add new page
  if (currentY > 260) {
    doc.addPage();
    currentY = 16;
  }

  const noticeBoxY = currentY;
  const noticeBoxHeight = 16;
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.setFillColor(248, 250, 252); // slate-50
  doc.roundedRect(marginX, noticeBoxY, contentWidth, noticeBoxHeight, 2, 2, 'FD');

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(13, 148, 136); // teal-600
  doc.text('SYSTEM-GENERATED REPORT - NO SIGNATURE REQUIRED', marginX + 4, noticeBoxY + 5.5);

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text(
    'This official Project Cost & Operations Dispatch Summary Report was automatically compiled and verified by DSI Management System.',
    marginX + 4,
    noticeBoxY + 10
  );
  doc.text(
    `Project: [${project.id}] ${project.name} | Verified as of: ${new Date().toLocaleString('en-US')}`,
    marginX + 4,
    noticeBoxY + 14
  );

  // Save the PDF
  const cleanProjName = project.name.replace(/[^a-zA-Z0-9]/g, '_');
  doc.save(`DSI_Project_Cost_Report_${project.id}_${cleanProjName}.pdf`);
}
