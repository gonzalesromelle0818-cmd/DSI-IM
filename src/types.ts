export type TabType = 'inventory' | 'pull_out' | 'deployment' | 'projects' | 'purchases';

export type ItemCategory =
  | 'Hand Tools'
  | 'Power Tools'
  | 'Screw/Bolt'
  | 'Consumables'
  | 'Others';

export type ReorderStatus = 'good' | 'low' | 'reorder_needed' | 'out_of_stock';

export type ManpowerRole =
  | 'Foreman'
  | 'Installer'
  | 'Labor'
  | 'Engineer'
  | 'Architect'
  | 'Safety Officer'
  | 'Driver'
  | 'Other';

export interface ManpowerPositionRate {
  id: string;
  role: string;
  dailyRate: number; // Salary per day in PHP (₱)
  description?: string;
  isDefault?: boolean;
}

export interface ManpowerProfile {
  id: string; // e.g. "MP-001"
  name: string;
  role: string;
  dailyRate: number; // Salary per day in PHP (₱)
  contactNumber?: string;
  status?: 'Available' | 'Deployed' | 'On Leave';
  notes?: string;
}

export interface DeploymentManpowerLine {
  role: string; // e.g. "Foreman", "Installer", "Labor", "Engineer", "Architect"
  quantity: number; // Number of manpower heads
  dailyRate: number; // Salary per day in PHP (₱)
  days: number; // Number of days deployed
  subtotal: number; // quantity * dailyRate * days
  personnelNames?: string[]; // Optional names
  notes?: string;
}

export interface DeploymentTicket {
  id: string; // e.g. "DEP-2026-001"
  projectId: string;
  projectName: string;
  projectLocation?: string;
  requestedBy?: string; // Legacy/Optional
  leadSupervisor?: string; // Legacy/alias for supervisor
  deploymentDate: string; // Start date (YYYY-MM-DD)
  endDate?: string; // End date (YYYY-MM-DD)
  daysCount: number; // Total working days
  lines: DeploymentManpowerLine[];
  mobilizationCost: number; // Mobilization cost (₱) for transpo, fuel, logistics
  mobilizationNotes?: string;
  laborCost: number; // Sum of manpower labor subtotal
  totalCost: number; // laborCost + mobilizationCost
  status: 'Scheduled' | 'Active On-Site' | 'Completed' | 'Cancelled';
  scopeOfWork?: string;
  vehicleDetails?: string;
  notes?: string;
  // Signatories & Authorization
  preparedBy: string; // Sino nag prepare
  preparedDate: string; // Petsa ng pag-prepare
  supervisor: string; // Sino ang supervisor
  supervisorDate: string; // Petsa ng pirma ng supervisor
  projectManager: string; // Sino ang Project Manager
  projectManagerDate: string; // Petsa ng pirma ng Project Manager
  createdAt: string;
}

export interface Project {
  id: string; // e.g. "PRJ-001"
  name: string;
  location?: string;
  leadPerson?: string; // Project In-charge / Engineer
  status?: 'Active' | 'Planning' | 'Completed' | 'On Hold';
  createdAt?: string;
  notes?: string;
}

export interface ProjectAllocation {
  projectId: string;
  projectName: string;
  quantity: number;
  allocatedDate: string;
  leadPerson?: string;
  location?: string;
}

export interface InventoryItem {
  id: string; // unique internal id
  assetId: string; // e.g. "AST-2024-001" or "DSI-EL-012"
  description: string;
  category: ItemCategory;
  stockQty: number; // Qty in warehouse/stock
  unit: string; // e.g. "pcs", "sets", "meters", "rolls", "units", "boxes"
  minReorderLevel: number; // Threshold triggering replenish
  unitPrice?: number; // Unit price in PHP (₱) for project costing & asset valuation
  location?: string; // e.g. "Lumiere", "Tool Room #2"
  brandModel?: string; // e.g. "Bosch GSB 13 RE"
  notes?: string;
  lastUpdated: string;
  projectAllocations?: ProjectAllocation[];
}

export interface PullOutItemLine {
  itemId: string;
  assetId: string;
  description: string;
  category: ItemCategory;
  quantity: number;
  unit: string;
  unitPrice?: number;
}

export interface PullOutTicket {
  id: string; // e.g. "PO-2026-001"
  projectId: string;
  projectName: string;
  projectLocation?: string;
  requestedBy: string;
  date: string;
  items: PullOutItemLine[];
  notes?: string;
  createdAt: string;
}

export interface InventoryStats {
  totalAssets: number;
  totalStockUnits: number;
  needsReorderCount: number;
  outOfStockCount: number;
}

export interface PurchaseRecord {
  id: string; // e.g. "PUR-2026-001"
  poNumber: string; // e.g. "PO-2026-001" or "DR-1092"
  itemId: string;
  assetId: string;
  description: string;
  category: ItemCategory;
  quantityAdded: number;
  unit: string;
  unitPrice?: number;
  totalCost?: number;
  supplier?: string;
  notes?: string;
  receivedDate: string; // YYYY-MM-DD
  receivedBy?: string;
  createdAt: string;
}

