import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { PullOutTicket, Project, InventoryItem } from '../types';

interface PDFOptions {
  ticket: PullOutTicket;
  project?: Project;
  preparedBy?: string;
  checkedBy?: string;
  originatedFrom?: string;
}

export function generatePullOutPDF({
  ticket,
  project,
  preparedBy = "M' Chrissna / Maricel",
  checkedBy = "M' Chrissna / Maricel",
  originatedFrom = 'Lumiere',
}: PDFOptions) {
  // Landscape or Portrait: The image is in Landscape / Wide layout (approx standard letter/A4 landscape)
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // ~297mm
  const marginX = 15;
  const contentWidth = pageWidth - marginX * 2; // ~267mm

  let currentY = 18;

  // 1. TITLE: DIVERSIFIED SOURCE INC. PULL-OUT FORM
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text('DIVERSIFIED SOURCE INC. PULL-OUT FORM', pageWidth / 2, currentY, {
    align: 'center',
  });

  currentY += 8;

  // 2. HEADER BOXES (ACCOUNT TO, PULL-OUT FORM NO, ADDRESS, DATE)
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
  // Vertical divider between Left (Account/Address) and Right (Form No/Date)
  doc.line(midX, headerBoxY, midX, headerBoxY + headerBoxHeight);

  // Divider between labels and values on left side (e.g. at marginX + 35)
  const leftLabelWidth = 36;
  doc.line(marginX + leftLabelWidth, headerBoxY, marginX + leftLabelWidth, headerBoxY + headerBoxHeight);

  // Divider between labels and values on right side (e.g. at midX + 48)
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
  doc.text('ACCOUNT TO:', marginX + 2, headerBoxY + 5.5);

  doc.setFont('helvetica', 'normal');
  const projectLabel = `[${ticket.projectId}] ${ticket.projectName}`;
  doc.text(projectLabel, marginX + leftLabelWidth + 3, headerBoxY + 5.5);

  doc.setFont('helvetica', 'bold');
  doc.text('PULL-OUT FORM NO:', midX + 2, headerBoxY + 5.5);

  doc.setFont('helvetica', 'normal');
  doc.text(ticket.id, midX + rightLabelWidth + 3, headerBoxY + 5.5);

  // Row 2 Text
  doc.setFont('helvetica', 'bold');
  doc.text('ADDRESS:', marginX + 2, headerBoxY + 13.5);

  doc.setFont('helvetica', 'normal');
  const addressText = ticket.projectLocation || project?.location || 'Site Location';
  doc.text(addressText, marginX + leftLabelWidth + 3, headerBoxY + 13.5);

  doc.setFont('helvetica', 'bold');
  doc.text('DATE :', midX + 2, headerBoxY + 13.5);

  doc.setFont('helvetica', 'normal');
  doc.text(formattedDate, midX + rightLabelWidth + 3, headerBoxY + 13.5);

  currentY += headerBoxHeight + 6;

  // 3. ITEMS TABLE
  // Columns: ITEM NO. | ASSET ID | DESCRIPTION | QUANTITY (Qty, Unit) | ORIGINATED FROM
  const tableStartY = currentY;

  // Prepare table rows
  const tableRows: (string | number)[][] = [];

  ticket.items.forEach((item, index) => {
    tableRows.push([
      index + 1,
      item.assetId || '',
      item.description || '',
      item.quantity,
      item.unit || 'pcs',
      index === 0 ? originatedFrom : '',
    ]);
  });

  // Add empty filler rows to create the visual height as shown in template (at least 7 total rows)
  const minRows = 7;
  const currentCount = ticket.items.length;
  const neededFiller = Math.max(0, minRows - currentCount - 1);

  for (let i = 0; i < neededFiller; i++) {
    tableRows.push(['', '', '', '', '', '']);
  }

  // Add "-Nothing Follows-" row
  tableRows.push(['', '', '-Nothing Follows-', '', '', '']);

  // Add one extra empty row after nothing follows if space allows
  tableRows.push(['', '', '', '', '', '']);

  autoTable(doc, {
    startY: tableStartY,
    margin: { left: marginX, right: marginX },
    tableWidth: contentWidth,
    head: [
      [
        { content: 'ITEM NO.', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
        { content: 'ASSET ID', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
        { content: 'DESCRIPTION', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
        { content: 'QUANTITY', colSpan: 2, styles: { halign: 'center', valign: 'middle' } },
        { content: 'ORIGINATED FROM', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
      ],
      [
        // sub header for quantity if needed (hidden or 0 height, handled in head)
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
      0: { cellWidth: 26, halign: 'center' }, // ITEM NO.
      1: { cellWidth: 32, halign: 'center', fontStyle: 'normal' }, // ASSET ID
      2: { cellWidth: 105, halign: 'left' }, // DESCRIPTION
      3: { cellWidth: 20, halign: 'center' }, // QTY
      4: { cellWidth: 20, halign: 'center' }, // UNIT
      5: { cellWidth: 64, halign: 'center', valign: 'middle' }, // ORIGINATED FROM
    },
    didDrawCell: (data) => {
      // If cell is '-Nothing Follows-', style it bold/italic and centered
      if (data.cell.raw === '-Nothing Follows-') {
        doc.setFont('helvetica', 'bold');
      }
    },
  });

  // Calculate position for signatures
  // @ts-ignore
  const finalY = doc.lastAutoTable ? doc.lastAutoTable.finalY : currentY + 80;
  const signatureStartY = Math.max(finalY + 12, 130);

  // 4. SIGNATURE / FOOTER BLOCK
  // Labels: REQUESTED BY:, PREPARED BY:, CHECKED BY:
  const sigLabelX = marginX + 2;
  const sigLineStartX = marginX + 38;
  const sigLineWidth = 95;

  const signatures = [
    { label: 'REQUESTED BY:', value: ticket.requestedBy || '' },
    { label: 'PREPARED BY:', value: preparedBy },
    { label: 'CHECKED BY:', value: checkedBy },
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
  const fileName = `PullOut_${ticket.id.replace(/[^a-zA-Z0-9-_]/g, '_')}_${formattedDate.replace(/\//g, '-')}.pdf`;
  doc.save(fileName);
}
