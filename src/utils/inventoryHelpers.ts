import { InventoryItem, ReorderStatus } from '../types';

export function getReorderStatus(stockQty: number, minReorderLevel: number): ReorderStatus {
  if (stockQty <= 0) {
    return 'out_of_stock';
  }
  if (stockQty <= minReorderLevel) {
    return 'reorder_needed';
  }
  if (stockQty <= minReorderLevel * 1.5) {
    return 'low';
  }
  return 'good';
}

export function formatCurrency(amount?: number): string {
  if (amount === undefined || amount === null) return '—';
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 2,
  }).format(amount);
}

export function generateNextAssetId(category: string, currentItems: InventoryItem[]): string {
  let prefix = 'DSI-AST';
  const cat = category.toLowerCase();
  if (cat.includes('power')) prefix = 'DSI-PT';
  else if (cat.includes('hand')) prefix = 'DSI-HT';
  else if (cat.includes('screw') || cat.includes('bolt')) prefix = 'DSI-SB';
  else if (cat.includes('consum')) prefix = 'DSI-CON';
  else if (cat.includes('other')) prefix = 'DSI-OTH';

  const count = currentItems.length + 1;
  const numStr = String(count).padStart(3, '0');
  return `${prefix}-${numStr}`;
}

export function exportInventoryToCSV(items: InventoryItem[]): void {
  const headers = [
    'Asset ID',
    'Description',
    'Category',
    'Stock Qty (Warehouse)',
    'Unit',
    'Unit Price (PHP)',
    'Total Valuation (PHP)',
    'Min Reorder Level',
    'Reorder Status',
    'Location',
    'Last Updated',
  ];

  const rows = items.map((item) => {
    const status = getReorderStatus(item.stockQty, item.minReorderLevel);
    const statusLabel =
      status === 'out_of_stock'
        ? 'OUT OF STOCK'
        : status === 'reorder_needed'
        ? 'REORDER NEEDED'
        : status === 'low'
        ? 'LOW STOCK'
        : 'IN STOCK';

    const unitPriceVal = item.unitPrice !== undefined ? item.unitPrice : 0;
    const totalValuation = item.stockQty * unitPriceVal;

    return [
      `"${item.assetId}"`,
      `"${item.description.replace(/"/g, '""')}"`,
      `"${item.category}"`,
      item.stockQty,
      `"${item.unit}"`,
      unitPriceVal,
      totalValuation,
      item.minReorderLevel,
      `"${statusLabel}"`,
      `"${item.location || ''}"`,
      `"${item.lastUpdated}"`,
    ].join(',');
  });

  const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `DSI_Inventory_Report_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
