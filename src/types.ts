export type TabType = 'dashboard' | 'inventory' | 'pull_out' | 'deployment' | 'projects' | 'purchases';

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

export interface WindowDoorItem {
  id: string; // e.g. "WD-001"
  tag: string; // e.g. "W-1", "D-1", "Master Bedroom Sliding Window"
  type: 'Window' | 'Door' | 'Curtain Wall' | 'Glass Partition' | 'Louvers' | 'Other';
  qty: number; // Quantity of units
  height: number | string; // Height (e.g. 2100 or "2100mm")
  width: number | string; // Width (e.g. 1800 or "1800mm")
  unit?: string; // "mm", "cm", "m", "in", "ft"
  location?: string; // Floor / Area
  remarks?: string; // Profile, glass spec, hardware
  isInstalled?: boolean; // Installation status for milestone tracking
  installedQty?: number; // How many installed out of qty
  installedDate?: string;
  installerNotes?: string;
}

export interface ProjectMilestone {
  id: number; // 1 to 14
  no: number;
  activity: string;
  weight: number; // e.g. 5, 10, 10, 5, 5, 15, 5, 5, 25, 2, 3, 5, 3, 2 (Total = 100%)
  completed: boolean;
  completedDate?: string;
  remarks?: string;
}

export type ProjectStatus = 'Active' | 'For Turn over/Cleaning' | 'Completed' | 'On Hold' | 'Planning';

export interface Project {
  id: string; // e.g. "PRJ-001"
  name: string;
  location?: string;
  leadPerson?: string; // Project In-Charge
  projectManager?: string; // Project Manager
  status?: ProjectStatus;
  createdAt?: string;
  startDate?: string;
  targetCompletionDate?: string;
  budget?: number; // Total Project Contract / Budget (₱)
  notes?: string;
  description?: string;
  windowsDoors?: WindowDoorItem[];
  checklist?: ProjectMilestone[];
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
  poNumber?: string; // e.g. "PO-2026-881" or "DR-1204"
  date: string; // YYYY-MM-DD
  supplier?: string;
  itemId: string;
  assetId: string;
  description: string;
  category: ItemCategory;
  quantity: number; // Added stock quantity
  unit: string;
  unitPrice?: number; // Cost per unit in PHP (₱)
  totalCost?: number; // quantity * unitPrice
  receivedBy?: string;
  notes?: string;
  createdAt?: string;
}

export type RetrieveItemCondition =
  | 'Good / Unused'
  | 'Excess Material'
  | 'Used / Functional'
  | 'Needs Repair'
  | 'Damaged / Scrap'
  | 'Good'
  | 'Excess'
  | 'Damaged'
  | 'Used';

export interface RetrieveItemLine {
  itemId: string;
  assetId: string;
  description: string;
  category: ItemCategory;
  quantity: number; // Quantity returned back to inventory
  unit: string;
  unitPrice?: number;
  condition?: RetrieveItemCondition;
  remarks?: string;
}

export interface RetrieveTicket {
  id: string; // e.g. "RET-2026-001" or "DSI-RET-001"
  projectId: string;
  projectName: string;
  projectLocation?: string;
  location?: string;
  retrievedBy: string; // Sino nagbalik galing sa site / Project In-charge
  receivedBy: string; // Sino tumanggap sa bodega (e.g. M' Chrissna / Maricel)
  returnedTo?: string; // e.g. "Lumiere Main Warehouse", "Tool Room #2"
  returnedToWarehouse?: string;
  reasonForReturn?: string;
  date: string; // YYYY-MM-DD
  items: RetrieveItemLine[];
  totalQuantity: number;
  totalValue?: number;
  notes?: string;
  createdAt: string;
}

