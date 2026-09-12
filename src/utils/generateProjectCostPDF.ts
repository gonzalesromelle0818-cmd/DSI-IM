import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Project, PullOutTicket, DeploymentTicket, RetrieveTicket, InventoryItem } from '../types';
import { calculateProjectProgress, getInitialProjectChecklist } from './projectMilestones';

interface ProjectCostPDFOptions {
  project: Project;
  pullOutTickets: PullOutTicket[];
  deploymentTickets: DeploymentTicket[];
  retrieveTickets?: RetrieveTicket[];
  inventoryItems?: InventoryItem[];
  preparedBy?: string;
  supervisor?: string;
  projectManager?: string;
}

export function generateProjectCostPDF({
  project,
  pullOutTickets,
  deploymentTickets,
  retrieveTickets = [],
  inventoryItems = [],
  preparedBy = "M' Chrissna / Maricel",
  supervisor = '',
  projectManager = 'Engr. Roberto Santos',
}: ProjectCostPDFOptions) {
  // Filter records for this project
  const pId = (project.id || '').trim().toLowerCase();
  const pName = (project.name || '').trim().toLowerCase();

  const relatedPullOuts = pullOutTickets.filter((t) => {
    const tId = (t.projectId || '').trim().toLowerCase();
    const tName = (t.projectName || '').trim().toLowerCase();
    return (
      (tId && tId === pId) ||
      (tName && tName === pName) ||
      (tId && tId === pName) ||
      (tName && tName === pId)
    );
  });

  const relatedRetrieves = retrieveTickets.filter((t) => {
    const tId = (t.projectId || '').trim().toLowerCase();
    const tName = (t.projectName || '').trim().toLowerCase();
    return (
      (tId && tId === pId) ||
      (tName && tName === pName) ||
      (tId && tId === pName) ||
      (tName && tName === pId)
    );
  });

  const relatedDeployments = deploymentTickets.filter((t) => {
    const tId = (t.projectId || '').trim().toLowerCase();
    const tName = (t.projectName || '').trim().toLowerCase();
    return (
      (tId && tId === pId) ||
      (tName && tName === pName) ||
      (tId && tId === pName) ||
      (tName && tName === pId)
    );
  });

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
  let grossMaterialCost = 0;
  let grossMaterialUnits = 0;

  relatedPullOuts.forEach((ticket) => {
    ticket.items.forEach((item) => {
      let price = item.unitPrice || 0;
      if (price === 0 && inventoryItems.length > 0) {
        const invItem = inventoryItems.find(
          (i) =>
            (item.itemId && i.id.toLowerCase() === item.itemId.toLowerCase()) ||
            (item.assetId && i.assetId.toLowerCase() === item.assetId.toLowerCase()) ||
            (item.description && i.description.toLowerCase() === item.description.toLowerCase())
        );
        if (invItem && invItem.unitPrice) {
          price = invItem.unitPrice;
        }
      }
      const lineCost = item.quantity * price;
      grossMaterialCost += lineCost;
      grossMaterialUnits += item.quantity;

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

  // Fallback: If no pull-out tickets were matched, check inventory items' projectAllocations
  if (materialLines.length === 0 && inventoryItems.length > 0) {
    inventoryItems.forEach((invItem) => {
      if (invItem.projectAllocations) {
        invItem.projectAllocations.forEach((alloc) => {
          const aId = (alloc.projectId || '').trim().toLowerCase();
          const aName = (alloc.projectName || '').trim().toLowerCase();
          if (
            (aId && aId === pId) ||
            (aName && aName === pName) ||
            (aId && aId === pName) ||
            (aName && aName === pId)
          ) {
            const price = invItem.unitPrice || 0;
            const lineCost = alloc.quantity * price;
            grossMaterialCost += lineCost;
            grossMaterialUnits += alloc.quantity;

            materialLines.push({
              date: alloc.allocatedDate || 'Recorded',
              ticketId: 'DIRECT-ALLOC',
              assetId: invItem.assetId,
              description: invItem.description,
              category: invItem.category,
              quantity: alloc.quantity,
              unit: invItem.unit,
              unitPrice: price,
              totalCost: lineCost,
            });
          }
        });
      }
    });
  }

  // Extract all retrieved item lines
  interface RetrieveLine {
    date: string;
    ticketId: string;
    assetId: string;
    description: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    totalCost: number;
    condition: string;
  }

  const retrieveLines: RetrieveLine[] = [];
  let totalRetrievedCost = 0;
  let totalRetrievedUnits = 0;

  relatedRetrieves.forEach((ticket) => {
    ticket.items.forEach((item) => {
      let price = item.unitPrice || 0;
      if (price === 0 && inventoryItems.length > 0) {
        const invItem = inventoryItems.find(
          (i) =>
            (item.itemId && i.id.toLowerCase() === item.itemId.toLowerCase()) ||
            (item.assetId && i.assetId.toLowerCase() === item.assetId.toLowerCase()) ||
            (item.description && i.description.toLowerCase() === item.description.toLowerCase())
        );
        if (invItem && invItem.unitPrice) {
          price = invItem.unitPrice;
        }
      }
      const lineVal = item.quantity * price;
      totalRetrievedCost += lineVal;
      totalRetrievedUnits += item.quantity;

      retrieveLines.push({
        date: ticket.date,
        ticketId: ticket.id,
        assetId: item.assetId,
        description: item.description,
        quantity: item.quantity,
        unit: item.unit,
        unitPrice: price,
        totalCost: lineVal,
        condition: item.condition,
      });
    });
  });

  const netMaterialCost = Math.max(0, grossMaterialCost - totalRetrievedCost);

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
  const grandTotalCost = netMaterialCost + totalDeploymentCost;

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

  // 1.5 CALCULATE PROGRESS STATS & CHECKLIST
  const progress = calculateProjectProgress(project);
  const checklist = getInitialProjectChecklist(project.checklist);

  // 2. PROJECT METADATA CARD (Box)
  const metaBoxY = currentY;
  const metaBoxHeight = 28;
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

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('TARGET DATE:', marginX + 3, metaBoxY + 22.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  doc.text(project.targetCompletionDate || project.startDate || 'Not specified', marginX + 26, metaBoxY + 22.5);

  // Right Column: In-Charge, PM, Status, Total Expense
  const rightColX = marginX + 104;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('PROJECT IN-CHARGE:', rightColX, metaBoxY + 5.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(project.leadPerson || supervisor || 'Unassigned', rightColX + 38, metaBoxY + 5.5);

  if (project.projectManager || projectManager) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text('PROJECT MANAGER:', rightColX, metaBoxY + 10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(project.projectManager || projectManager || 'Engr. Roberto Santos', rightColX + 38, metaBoxY + 10);
  }

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('STATUS:', rightColX, metaBoxY + 14.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(13, 148, 136);
  doc.text(project.status || 'Active', rightColX + 38, metaBoxY + 14.5);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('PROGRESS STATUS:', rightColX, metaBoxY + 16.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 118, 110);
  doc.text(`${progress.percentage}% (${progress.completedMilestonesCount}/14 Done)`, rightColX + 34, metaBoxY + 16.5);

  // Visual Progress Indicator Mini Bar
  const pBarX = rightColX + 34;
  const pBarY = metaBoxY + 18.2;
  const pBarWidth = 44;
  const pBarHeight = 2.2;
  doc.setFillColor(226, 232, 240); // slate-200
  doc.roundedRect(pBarX, pBarY, pBarWidth, pBarHeight, 1, 1, 'F');
  const fillW = Math.max(0, Math.min(pBarWidth, (progress.percentage / 100) * pBarWidth));
  if (fillW > 0) {
    doc.setFillColor(13, 148, 136); // teal-600
    doc.roundedRect(pBarX, pBarY, fillW, pBarHeight, 1, 1, 'F');
  }

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('TOTAL EXPENSE:', rightColX, metaBoxY + 24);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(formatPHP(grandTotalCost), rightColX + 34, metaBoxY + 24);

  currentY += metaBoxHeight + 6;

  // 3. EXECUTIVE FINANCIAL SUMMARY TABLE
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('1. EXECUTIVE COST SUMMARY', marginX, currentY);

  currentY += 2;

  const costSummaryRows: string[][] = [
    [
      'A. Materials & Inventory Pull-Out (Gross)',
      `${relatedPullOuts.length} ticket(s) / ${grossMaterialUnits} unit(s) dispatched`,
      formatPHP(grossMaterialCost),
    ],
  ];

  if (totalRetrievedCost > 0) {
    costSummaryRows.push([
      'B. Returned / Retrieved to Warehouse (Credit)',
      `${relatedRetrieves.length} retrieve ticket(s) / ${totalRetrievedUnits} unit(s) returned`,
      `- ${formatPHP(totalRetrievedCost)}`,
    ]);
    costSummaryRows.push([
      'C. Net Project Material Cost',
      `Gross Material (A) less Warehouse Returns (B)`,
      formatPHP(netMaterialCost),
    ]);
  }

  costSummaryRows.push(
    [
      totalRetrievedCost > 0 ? 'D. Manpower Labor Cost' : 'B. Manpower Labor Cost',
      `${relatedDeployments.length} deployment(s) / ${totalHeadsDeployed} heads`,
      formatPHP(totalLaborCost),
    ],
    [
      totalRetrievedCost > 0 ? 'E. Mobilization & Logistics Cost' : 'C. Mobilization & Logistics Cost',
      'Transportation, fuel & logistics allowances',
      formatPHP(totalMobilizationCost),
    ],
    [
      'GRAND TOTAL PROJECT EXPENSE',
      'Net Materials + Manpower Labor + Mobilization',
      formatPHP(grandTotalCost),
    ]
  );

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
      0: { cellWidth: 72, fontStyle: 'bold' },
      1: { cellWidth: 73 },
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

  // 4. PROJECT COMPLETION & MILESTONE STATUS SECTION
  if (currentY > 215) {
    doc.addPage();
    currentY = 16;
  }

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`2. PROJECT COMPLETION & MILESTONE STATUS (OVERALL: ${progress.percentage}%)`, marginX, currentY);

  currentY += 4;

  // Overview info line
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  const winStat = progress.totalWindowsDoorsUnits > 0
    ? `Windows & Doors Installed: ${progress.installedWindowsDoorsUnits}/${progress.totalWindowsDoorsUnits} units (${progress.installationProgressPercent}%)`
    : 'Windows/Doors: Direct milestone checklist tracking';
  doc.text(
    `Verified Milestones: ${progress.completedMilestonesCount} of ${progress.totalMilestonesCount} Completed | Total Weight: ${progress.percentage}% of 100% | ${winStat}`,
    marginX,
    currentY
  );

  currentY += 2.5;

  const milestoneRows = checklist.map((m) => {
    const score = progress.milestoneScores.find((s) => s.no === m.no);
    const earned = score ? score.earned : m.completed ? m.weight : 0;

    let statusText = 'PENDING';
    if (m.no === 9) {
      if (progress.totalWindowsDoorsUnits > 0) {
        if (progress.installedWindowsDoorsUnits >= progress.totalWindowsDoorsUnits) {
          statusText = 'COMPLETED (100%)';
        } else if (progress.installedWindowsDoorsUnits > 0) {
          statusText = `IN PROGRESS (${progress.installationProgressPercent}%)`;
        } else {
          statusText = 'PENDING (0%)';
        }
      } else {
        statusText = m.completed ? 'COMPLETED (100%)' : 'PENDING (0%)';
      }
    } else {
      statusText = m.completed ? 'COMPLETED' : 'PENDING';
    }

    let dateText = '-';
    if (m.completedDate) {
      dateText = m.completedDate;
    } else if (m.completed) {
      dateText = 'Completed';
    } else if (statusText.startsWith('IN PROGRESS')) {
      dateText = 'In Progress';
    }

    let remarksText = m.remarks || '';
    if (m.no === 9 && progress.totalWindowsDoorsUnits > 0) {
      const wDetail = `${progress.installedWindowsDoorsUnits}/${progress.totalWindowsDoorsUnits} units (${progress.installationProgressPercent}%)`;
      remarksText = remarksText ? `${wDetail} | ${remarksText}` : wDetail;
    }
    if (!remarksText) remarksText = '-';

    return [
      m.no.toString(),
      m.activity,
      `${m.weight}%`,
      statusText,
      `${earned.toFixed(1)}%`,
      dateText,
      remarksText,
    ];
  });

  autoTable(doc, {
    startY: currentY,
    head: [['#', 'Milestone Activity', 'Weight', 'Milestone Status', 'Earned', 'Completed Date', 'Remarks / Details']],
    body: milestoneRows,
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
      1: { cellWidth: 64 },
      2: { cellWidth: 14, halign: 'center' },
      3: { cellWidth: 28, halign: 'center' },
      4: { cellWidth: 16, halign: 'right', fontStyle: 'bold' },
      5: { cellWidth: 24, halign: 'center' },
      6: { cellWidth: 32 },
    },
    foot: [
      [
        '',
        'TOTAL PROJECT COMPLETION PROGRESS',
        '100.0%',
        `${progress.completedMilestonesCount}/14 Completed`,
        `${progress.percentage.toFixed(1)}%`,
        '',
        progress.percentage === 100 ? 'Project Fully Turned Over' : 'Active On-Going Execution',
      ],
    ],
    footStyles: {
      fillColor: [240, 253, 250], // teal-50
      textColor: [13, 148, 136], // teal-600
      fontStyle: 'bold',
      fontSize: 8,
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 3) {
        const txt = String(data.cell.raw || '');
        if (txt.includes('COMPLETED')) {
          data.cell.styles.textColor = [16, 149, 106]; // emerald-600
          data.cell.styles.fontStyle = 'bold';
        } else if (txt.includes('IN PROGRESS')) {
          data.cell.styles.textColor = [217, 119, 6]; // amber-600
          data.cell.styles.fontStyle = 'bold';
        } else {
          data.cell.styles.textColor = [148, 163, 184]; // slate-400
        }
      }
    },
  });

  currentY = (doc as any).lastAutoTable.finalY + 7;

  // 4.1 WINDOW & DOOR INSTALLATION SCHEDULE (IF ANY ITEMS EXIST)
  if (project.windowsDoors && project.windowsDoors.length > 0) {
    if (currentY > 215) {
      doc.addPage();
      currentY = 16;
    }

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(
      `2.1 WINDOW & DOOR INSTALLATION SCHEDULE (${project.windowsDoors.length} Scheduled Types)`,
      marginX,
      currentY
    );

    currentY += 2;

    const wdRows = project.windowsDoors.map((w, idx) => {
      const q = Number(w.qty) || 1;
      const inst = w.isInstalled
        ? (w.installedQty !== undefined ? Number(w.installedQty) : q)
        : (Number(w.installedQty) || 0);
      const isDone = inst >= q || w.isInstalled;
      const stat = isDone
        ? 'COMPLETED'
        : inst > 0
        ? `PARTIAL (${Math.round((inst / q) * 100)}%)`
        : 'PENDING';

      const dim = `${w.width || '-'} x ${w.height || '-'} ${w.unit || 'mm'}`;

      return [
        (idx + 1).toString(),
        w.tag || `WD-${idx + 1}`,
        w.type || 'Window',
        dim,
        w.location || 'Site Area',
        q.toString(),
        inst.toString(),
        stat,
        w.remarks || '-',
      ];
    });

    autoTable(doc, {
      startY: currentY,
      head: [['#', 'Tag', 'Type', 'Dimensions (WxH)', 'Location', 'Qty', 'Installed', 'Status', 'Remarks']],
      body: wdRows,
      theme: 'grid',
      margin: { left: marginX, right: marginX },
      styles: {
        fontSize: 7.5,
        cellPadding: 1.8,
        textColor: [30, 41, 59],
        valign: 'middle',
      },
      headStyles: {
        fillColor: [51, 65, 85], // slate-700
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 7.5,
      },
      columnStyles: {
        0: { cellWidth: 8, halign: 'center' },
        1: { cellWidth: 16, fontStyle: 'bold' },
        2: { cellWidth: 18 },
        3: { cellWidth: 26 },
        4: { cellWidth: 38 },
        5: { cellWidth: 14, halign: 'center' },
        6: { cellWidth: 16, halign: 'center', fontStyle: 'bold' },
        7: { cellWidth: 24, halign: 'center' },
        8: { cellWidth: 26 },
      },
      foot: [
        [
          '',
          '',
          '',
          'TOTAL SCHEDULED UNITS',
          '',
          progress.totalWindowsDoorsUnits.toString(),
          progress.installedWindowsDoorsUnits.toString(),
          `${progress.installationProgressPercent}% Installed`,
          '',
        ],
      ],
      footStyles: {
        fillColor: [241, 245, 249],
        textColor: [15, 23, 42],
        fontStyle: 'bold',
        fontSize: 7.5,
      },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 7) {
          const txt = String(data.cell.raw || '');
          if (txt.includes('COMPLETED')) {
            data.cell.styles.textColor = [16, 149, 106];
            data.cell.styles.fontStyle = 'bold';
          } else if (txt.includes('PARTIAL')) {
            data.cell.styles.textColor = [217, 119, 6];
            data.cell.styles.fontStyle = 'bold';
          } else {
            data.cell.styles.textColor = [148, 163, 184];
          }
        }
      },
    });

    currentY = (doc as any).lastAutoTable.finalY + 7;
  }

  // 5. MATERIALS & INVENTORY PULL-OUT TABLE
  if (currentY > 215) {
    doc.addPage();
    currentY = 16;
  }

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`3. MATERIALS & TOOLS PULLED OUT (${materialLines.length} Item Records)`, marginX, currentY);

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
          'GROSS MATERIAL COST',
          `${grossMaterialUnits} units dispatched`,
          '',
          '',
          formatPHP(grossMaterialCost),
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

  // 6. RETRIEVED / RETURNED MATERIALS TABLE (IF ANY)
  if (retrieveLines.length > 0) {
    if (currentY > 215) {
      doc.addPage();
      currentY = 16;
    }

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(13, 148, 136); // teal-600
    doc.text(`4. RETRIEVED / RETURNED TO WAREHOUSE (${retrieveLines.length} Item Records)`, marginX, currentY);

    currentY += 2;

    const retTableRows = retrieveLines.map((r, idx) => [
      (idx + 1).toString(),
      r.date,
      r.ticketId,
      r.assetId,
      r.description,
      `${r.quantity} ${r.unit}`,
      r.condition,
      formatPHP(r.totalCost),
    ]);

    autoTable(doc, {
      startY: currentY,
      head: [['#', 'Date', 'Ticket #', 'Asset Code', 'Description', 'Returned Qty', 'Condition', 'Restored Value']],
      body: retTableRows,
      theme: 'grid',
      margin: { left: marginX, right: marginX },
      styles: {
        fontSize: 7.5,
        cellPadding: 1.8,
        textColor: [30, 41, 59],
        valign: 'middle',
      },
      headStyles: {
        fillColor: [13, 148, 136], // teal-600
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 7.5,
      },
      columnStyles: {
        0: { cellWidth: 8, halign: 'center' },
        1: { cellWidth: 18, halign: 'center' },
        2: { cellWidth: 20, halign: 'center' },
        3: { cellWidth: 22, fontStyle: 'bold' },
        4: { cellWidth: 46 },
        5: { cellWidth: 22, halign: 'center', fontStyle: 'bold' },
        6: { cellWidth: 26 },
        7: { cellWidth: 24, halign: 'right', fontStyle: 'bold' },
      },
      foot: [
        [
          '',
          '',
          '',
          'TOTAL RESTORED VALUE',
          `${totalRetrievedUnits} units returned`,
          '',
          '',
          formatPHP(totalRetrievedCost),
        ],
      ],
      footStyles: {
        fillColor: [240, 253, 250],
        textColor: [13, 148, 136],
        fontStyle: 'bold',
        fontSize: 8,
      },
    });

    currentY = (doc as any).lastAutoTable.finalY + 7;
  }

  // 7. MANPOWER DEPLOYMENTS TABLE
  const depSectionNum = retrieveLines.length > 0 ? '5' : '4';
  if (currentY > 215) {
    doc.addPage();
    currentY = 16;
  }

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`${depSectionNum}. MANPOWER DEPLOYMENT HISTORY (${relatedDeployments.length} Deployments)`, marginX, currentY);

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

  // 8. SIGNATORIES & AUTHORIZATION SECTION
  if (currentY > 230) {
    doc.addPage();
    currentY = 16;
  }

  const sigColWidth = contentWidth / 3;
  const sigY = currentY;

  // Box for signatures
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.setFillColor(248, 250, 252); // slate-50
  doc.roundedRect(marginX, sigY, contentWidth, 24, 2, 2, 'FD');

  // Prepared by
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text('PREPARED BY (INVENTORY / ADMIN):', marginX + 4, sigY + 5);
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text(preparedBy || "M' Chrissna / Maricel", marginX + 4, sigY + 12);
  doc.setDrawColor(203, 213, 225);
  doc.line(marginX + 4, sigY + 16.5, marginX + sigColWidth - 6, sigY + 16.5);
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`Date: ${dateGenerated}`, marginX + 4, sigY + 20.5);

  // Checked / In-Charge
  const sig2X = marginX + sigColWidth;
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text('CHECKED BY (PROJECT IN-CHARGE):', sig2X + 4, sigY + 5);
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text(supervisor || project.leadPerson || 'Engr. In-Charge', sig2X + 4, sigY + 12);
  doc.line(sig2X + 4, sigY + 16.5, sig2X + sigColWidth - 6, sigY + 16.5);
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`Date: ${dateGenerated}`, sig2X + 4, sigY + 20.5);

  // Approved / Project Manager
  const sig3X = marginX + sigColWidth * 2;
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text('NOTED & APPROVED (PROJECT MANAGER):', sig3X + 4, sigY + 5);
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text(project.projectManager || projectManager || 'Engr. Roberto Santos', sig3X + 4, sigY + 12);
  doc.line(sig3X + 4, sigY + 16.5, sig3X + sigColWidth - 6, sigY + 16.5);
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`Date: ${dateGenerated}`, sig3X + 4, sigY + 20.5);

  currentY = sigY + 28;

  // 9. SYSTEM-GENERATED REPORT AUDIT FOOTER & NOTICE
  if (currentY > 265) {
    doc.addPage();
    currentY = 16;
  }

  const noticeBoxY = currentY;
  const noticeBoxHeight = 15;
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(marginX, noticeBoxY, contentWidth, noticeBoxHeight, 2, 2, 'FD');

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(13, 148, 136); // teal-600
  doc.text('SYSTEM-GENERATED REPORT & AUDIT VERIFICATION', marginX + 4, noticeBoxY + 5);

  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text(
    'This official Project Cost & Milestone Progress Report was automatically compiled from verified warehouse pull-outs, return slips, and site deployments.',
    marginX + 4,
    noticeBoxY + 9
  );
  doc.text(
    `Project: [${project.id}] ${project.name} | Progress: ${progress.percentage}% (${progress.completedMilestonesCount}/14 Done) | Verified as of: ${new Date().toLocaleString('en-US')}`,
    marginX + 4,
    noticeBoxY + 13
  );

  // 10. PAGE NUMBERS (Draw on all pages)
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text(
      `DSI Project Report - [${project.id}] ${project.name} | Page ${i} of ${totalPages}`,
      pageWidth / 2,
      290,
      { align: 'center' }
    );
  }

  // Save the PDF
  const cleanProjName = project.name.replace(/[^a-zA-Z0-9]/g, '_');
  doc.save(`DSI_Project_Report_${project.id}_${cleanProjName}.pdf`);
}
