import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { RetrieveTicket, Project } from '../types';

interface RetrievePDFOptions {
  ticket: RetrieveTicket;
  project?: Project;
  checkedBy?: string;
}

export function generateRetrievePDF({
  ticket,
  project,
  checkedBy = "M' Chrissna / Maricel",
}: RetrievePDFOptions) {
  // Landscape layout matching standard DSI Forms
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // ~297mm
  const marginX = 15;
  const contentWidth = pageWidth - marginX * 2; // ~267mm

  let currentY = 18;

  // 1. TITLE
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text('DIVERSIFIED SOURCE INC. RETRIEVE / RETURN-TO-INVENTORY FORM', pageWidth / 2, currentY, {
    align: 'center',
  });

  currentY += 8;

  // 2. HEADER BOXES
  const headerBoxY = currentY;
  const headerBoxHeight = 16;
  const leftColWidth = 175;
  const rightColWidth = contentWidth - leftColWidth; // ~92mm
  const midX = marginX + leftColWidth;

  // Outer Border & Grid Lines for Header
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.4);

  // Outer rectangle for top metadata
  doc.rect(marginX, headerBoxY, contentWidth, headerBoxHeight);
  // Horizontal divider
  doc.line(marginX, headerBoxY + 8, marginX + contentWidth, headerBoxY + 8);
  // Vertical divider between Left and Right
  doc.line(midX, headerBoxY, midX, headerBoxY + headerBoxHeight);

  // Divider between labels and values on left side
  const leftLabelWidth = 42;
  doc.line(marginX + leftLabelWidth, headerBoxY, marginX + leftLabelWidth, headerBoxY + headerBoxHeight);

  // Divider between labels and values on right side
  const rightLabelWidth = 46;
  doc.line(midX + rightLabelWidth, headerBoxY, midX + rightLabelWidth, headerBoxY + headerBoxHeight);

  // Format Date to MM/DD/YYYY
  let formattedDate = ticket.date;
  try {
    if (ticket.date.includes('-')) {
      const [yyyy, mm, dd] = ticket.date.split('-');
      if (yyyy && mm && dd) {
        formattedDate = `${mm}/${dd}/${yyyy}`;
      }
    }
  } catch {
    formattedDate = ticket.date;
  }

  // Row 1 Text
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('RETURNED FROM:', marginX + 2, headerBoxY + 5.5);

  doc.setFont('helvetica', 'normal');
  const projectLabel = `[${ticket.projectId}] ${ticket.projectName}`;
  doc.text(projectLabel, marginX + leftLabelWidth + 3, headerBoxY + 5.5);

  doc.setFont('helvetica', 'bold');
  doc.text('RETRIEVE FORM NO:', midX + 2, headerBoxY + 5.5);

  doc.setFont('helvetica', 'normal');
  doc.text(ticket.id, midX + rightLabelWidth + 3, headerBoxY + 5.5);

  // Row 2 Text
  doc.setFont('helvetica', 'bold');
  doc.text('SITE ADDRESS:', marginX + 2, headerBoxY + 13.5);

  doc.setFont('helvetica', 'normal');
  const addressText = ticket.projectLocation || project?.location || 'Site Location';
  doc.text(addressText, marginX + leftLabelWidth + 3, headerBoxY + 13.5);

  doc.setFont('helvetica', 'bold');
  doc.text('RETURN DATE :', midX + 2, headerBoxY + 13.5);

  doc.setFont('helvetica', 'normal');
  doc.text(formattedDate, midX + rightLabelWidth + 3, headerBoxY + 13.5);

  currentY += headerBoxHeight + 6;

  // 3. ITEMS TABLE
  // Columns: ITEM NO. | ASSET ID | DESCRIPTION | QUANTITY (Qty, Unit) | CONDITION / REMARKS | RETURNED TO
  const tableStartY = currentY;

  const tableRows: (string | number)[][] = [];

  ticket.items.forEach((item, index) => {
    const conditionRemarks = item.condition
      ? `${item.condition}${item.remarks ? ` (${item.remarks})` : ''}`
      : item.remarks || 'Good / Unused Surplus';

    tableRows.push([
      index + 1,
      item.assetId || '',
      item.description || '',
      item.quantity,
      item.unit || 'pcs',
      conditionRemarks,
      ticket.returnedTo || 'Lumiere Main Warehouse',
    ]);
  });

  // Filler rows
  const minRows = 7;
  const currentCount = ticket.items.length;
  const neededFiller = Math.max(0, minRows - currentCount - 1);

  for (let i = 0; i < neededFiller; i++) {
    tableRows.push(['', '', '', '', '', '', '']);
  }

  // Add "-Nothing Follows-" row
  tableRows.push(['', '', '-Nothing Follows-', '', '', '', '']);

  // Add one extra empty row
  tableRows.push(['', '', '', '', '', '', '']);

  autoTable(doc, {
    startY: tableStartY,
    margin: { left: marginX, right: marginX },
    tableWidth: contentWidth,
    head: [
      [
        { content: 'ITEM NO.', styles: { halign: 'center', valign: 'middle' } },
        { content: 'ASSET ID', styles: { halign: 'center', valign: 'middle' } },
        { content: 'DESCRIPTION', styles: { halign: 'center', valign: 'middle' } },
        { content: 'QTY', styles: { halign: 'center', valign: 'middle' } },
        { content: 'UNIT', styles: { halign: 'center', valign: 'middle' } },
        { content: 'CONDITION / REMARKS', styles: { halign: 'center', valign: 'middle' } },
        { content: 'RETURNED TO', styles: { halign: 'center', valign: 'middle' } },
      ],
    ],
    body: tableRows,
    theme: 'plain',
    styles: {
      fontSize: 9,
      textColor: [0, 0, 0],
      lineColor: [0, 0, 0],
      lineWidth: 0.35,
      cellPadding: 2.2,
      font: 'helvetica',
    },
    headStyles: {
      fontStyle: 'bold',
      fontSize: 9,
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      lineColor: [0, 0, 0],
      lineWidth: 0.4,
    },
    columnStyles: {
      0: { cellWidth: 22, halign: 'center' }, // ITEM NO.
      1: { cellWidth: 32, halign: 'center' }, // ASSET ID
      2: { cellWidth: 90, halign: 'left' }, // DESCRIPTION
      3: { cellWidth: 16, halign: 'center' }, // QTY
      4: { cellWidth: 18, halign: 'center' }, // UNIT
      5: { cellWidth: 48, halign: 'left' }, // CONDITION / REMARKS
      6: { cellWidth: 41, halign: 'center' }, // RETURNED TO
    },
    didDrawCell: (data) => {
      if (data.cell.raw === '-Nothing Follows-') {
        doc.setFont('helvetica', 'bold');
      }
    },
  });

  // 4. SIGNATURE / FOOTER BLOCK
  // @ts-ignore
  const finalY = doc.lastAutoTable ? doc.lastAutoTable.finalY : currentY + 80;
  const signatureStartY = Math.max(finalY + 12, 130);

  const sigLabelX = marginX + 2;
  const sigLineStartX = marginX + 48;
  const sigLineWidth = 95;

  const signatures = [
    { label: 'RETRIEVED / RETURNED BY:', value: ticket.retrievedBy || '' },
    { label: 'RECEIVED IN WAREHOUSE BY:', value: ticket.receivedBy || "M' Chrissna / Maricel" },
    { label: 'CHECKED & VERIFIED BY:', value: checkedBy },
  ];

  let sigY = signatureStartY;
  const rowSpacing = 12;

  signatures.forEach((sig) => {
    // Label
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    doc.text(sig.label, sigLabelX, sigY);

    // Name Value
    doc.setFont('helvetica', 'normal');
    doc.text(sig.value, sigLineStartX + 2, sigY);

    // Underline
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.4);
    doc.line(sigLineStartX, sigY + 1.5, sigLineStartX + sigLineWidth, sigY + 1.5);

    sigY += rowSpacing;
  });

  // Save the PDF file
  const safeId = ticket.id.replace(/[^a-zA-Z0-9-_]/g, '_');
  const safeDate = formattedDate.replace(/\//g, '-');
  const fileName = `Retrieve_${safeId}_${safeDate}.pdf`;
  doc.save(fileName);
}
