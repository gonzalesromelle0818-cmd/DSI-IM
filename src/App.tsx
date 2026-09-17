import React, { useState, useEffect } from 'react';
import {
  TabType,
  InventoryItem,
  Project,
  PullOutTicket,
  DeploymentTicket,
  ManpowerPositionRate,
  PurchaseRecord,
  RetrieveTicket,
} from './types';
import { INITIAL_INVENTORY } from './data/mockInventory';
import { INITIAL_PROJECTS } from './data/initialProjects';
import { DEFAULT_MANPOWER_RATES } from './data/defaultManpower';
import { getReorderStatus } from './utils/inventoryHelpers';
import { Sidebar } from './components/Sidebar';
import { TopNav } from './components/TopNav';
import { DashboardView } from './components/DashboardView';
import { InventoryView } from './components/InventoryView';
import { PullOutView } from './components/PullOutView';
import { DeploymentView } from './components/DeploymentView';
import { ProjectsView } from './components/ProjectsView';
import { PurchasesView } from './components/PurchasesView';
import { AddItemModal } from './components/AddItemModal';
import { EditItemModal } from './components/EditItemModal';
import { ItemDetailsModal } from './components/ItemDetailsModal';
import { RemoveItemModal } from './components/RemoveItemModal';
import { AddProjectModal } from './components/AddProjectModal';
import { RemoveProjectModal } from './components/RemoveProjectModal';
import { AddPullOutModal } from './components/AddPullOutModal';
import { RemovePullOutModal } from './components/RemovePullOutModal';
import { AddDeploymentModal } from './components/AddDeploymentModal';
import { AddMobilizationModal } from './components/AddMobilizationModal';
import { RemoveDeploymentModal } from './components/RemoveDeploymentModal';
import { AddRetrieveModal } from './components/AddRetrieveModal';
import { RemoveRetrieveModal } from './components/RemoveRetrieveModal';
import { ManageManpowerModal } from './components/ManageManpowerModal';
import { LoginScreen } from './components/LoginScreen';
import { ChangePasswordModal } from './components/ChangePasswordModal';
import { RestoreConfirmationModal } from './components/RestoreConfirmationModal';
import { authService, AuthUser } from './utils/authService';
import { exportSystemData, parseBackupFile, SystemBackupPayload } from './utils/backupService';
import { CheckCircle, AlertCircle } from 'lucide-react';

const STORAGE_KEY = 'dsi_inventory_data_v2_user';
const PROJECTS_STORAGE_KEY = 'dsi_inventory_projects_v1';
const PULLOUT_STORAGE_KEY = 'dsi_inventory_pullouts_v1';
const DEPLOYMENT_STORAGE_KEY = 'dsi_inventory_deployment_v1';
const MANPOWER_RATES_STORAGE_KEY = 'dsi_inventory_manpower_rates_v1';
const PURCHASES_STORAGE_KEY = 'dsi_inventory_purchases_v1';
const RETRIEVE_STORAGE_KEY = 'dsi_inventory_retrieves_v1';

const INITIAL_PURCHASES: PurchaseRecord[] = [
  {
    id: 'PO-REC-2026-001',
    poNumber: 'PO-2026-101',
    date: '2026-08-20',
    itemId: 'item-1',
    assetId: 'DSI-EQ-001',
    description: 'Rotary Hammer Drill',
    category: 'Power Tools',
    quantity: 10,
    unit: 'pcs',
    unitPrice: 4500,
    totalCost: 45000,
    supplier: 'Bosch Official Distributor PH',
    receivedBy: "M' Chrissna",
    notes: 'Initial Q3 delivery batch',
  },
  {
    id: 'PO-REC-2026-002',
    poNumber: 'PO-2026-102',
    date: '2026-08-22',
    itemId: 'item-5',
    assetId: 'DSI-MAT-005',
    description: 'Expansion Bolt 1/2 x 4',
    category: 'Screw/Bolt',
    quantity: 200,
    unit: 'pcs',
    unitPrice: 45,
    totalCost: 9000,
    supplier: 'Manila Fasteners Depot',
    receivedBy: "M' Chrissna",
    notes: 'Warehouse restock replenishment',
  },
  {
    id: 'PO-REC-2026-003',
    poNumber: 'PO-2026-103',
    date: '2026-08-25',
    itemId: 'item-8',
    assetId: 'DSI-CON-008',
    description: 'N95 Respirator Masks',
    category: 'Consumables',
    quantity: 150,
    unit: 'pcs',
    unitPrice: 35,
    totalCost: 5250,
    supplier: 'Safety First Industrial Supplies',
    receivedBy: "M' Chrissna",
    notes: 'Safety PPE replenish',
  },
];

const ACTIVE_TAB_STORAGE_KEY = 'dsi_active_tab';

export default function App() {
  // Authentication State
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => {
    return authService.getStoredSession().user;
  });
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return authService.getStoredSession().isAuthenticated;
  });
  const [isVerifyingAuth, setIsVerifyingAuth] = useState<boolean>(true);
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState<boolean>(false);

  // Verify active session on initial mount
  useEffect(() => {
    let isMounted = true;
    authService.verifyCurrentSession().then((session) => {
      if (isMounted) {
        setIsAuthenticated(session.isAuthenticated);
        setCurrentUser(session.user);
        setIsVerifyingAuth(false);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleLoginSuccess = (user: AuthUser) => {
    setCurrentUser(user);
    setIsAuthenticated(true);
  };

  const handleLogout = async () => {
    await authService.logout();
    setCurrentUser(null);
    setIsAuthenticated(false);
  };

  const [currentTab, setCurrentTab] = useState<TabType>(() => {
    try {
      const savedTab = localStorage.getItem(ACTIVE_TAB_STORAGE_KEY) as TabType;
      if (
        savedTab &&
        ['dashboard', 'inventory', 'pullout', 'deployment', 'projects', 'purchases'].includes(
          savedTab
        )
      ) {
        return savedTab;
      }
    } catch (e) {
      console.error(e);
    }
    return 'dashboard';
  });

  // Keep active tab synced in local storage
  useEffect(() => {
    try {
      localStorage.setItem(ACTIVE_TAB_STORAGE_KEY, currentTab);
    } catch (e) {
      console.error('Failed to save active tab', e);
    }
  }, [currentTab]);

  // Clean inventory state with localStorage persistence
  const [items, setItems] = useState<InventoryItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed to parse saved inventory', e);
    }
    return INITIAL_INVENTORY;
  });

  // Projects state (starts clean without demo samples, persists deletions)
  const [projects, setProjects] = useState<Project[]>(() => {
    try {
      const saved = localStorage.getItem(PROJECTS_STORAGE_KEY);
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          // Purge legacy hardcoded demo projects if lingering from prior sessions
          return parsed.filter(
            (p) =>
              p.id !== 'PRJ-2026-001' &&
              p.id !== 'PRJ-2026-002' &&
              p.id !== 'PRJ-2026-003' &&
              p.name !== 'Ayala Alveo Commercial Tower' &&
              p.name !== 'Solinea Residential Condominium' &&
              p.name !== 'Nuvali Eco-Villa Residence'
          );
        }
      }
    } catch (e) {
      console.error('Failed to parse saved projects', e);
    }
    return [];
  });

  // Pull Out Tickets state (starts clean)
  const [pullOutTickets, setPullOutTickets] = useState<PullOutTicket[]>(() => {
    try {
      const saved = localStorage.getItem(PULLOUT_STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed to parse saved pull out tickets', e);
    }
    return [];
  });

  // Deployment Tickets state (starts clean)
  const [deploymentTickets, setDeploymentTickets] = useState<DeploymentTicket[]>(() => {
    try {
      const saved = localStorage.getItem(DEPLOYMENT_STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed to parse saved deployment tickets', e);
    }
    return [];
  });

  // Manpower Position Rates masterlist state
  const [manpowerRates, setManpowerRates] = useState<ManpowerPositionRate[]>(() => {
    try {
      const saved = localStorage.getItem(MANPOWER_RATES_STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed to parse saved manpower rates', e);
    }
    return DEFAULT_MANPOWER_RATES;
  });

  // Purchases & Stock Inflow Records state
  const [purchases, setPurchases] = useState<PurchaseRecord[]>(() => {
    try {
      const saved = localStorage.getItem(PURCHASES_STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed to parse saved purchases', e);
    }
    return INITIAL_PURCHASES;
  });

  // Retrieve Tickets state (returns from project sites back to inventory)
  const [retrieveTickets, setRetrieveTickets] = useState<RetrieveTicket[]>(() => {
    try {
      const saved = localStorage.getItem(RETRIEVE_STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed to parse saved retrieve tickets', e);
    }
    return [];
  });

  // Save to localStorage on change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      console.error('Failed to save inventory', e);
    }
  }, [items]);

  useEffect(() => {
    try {
      localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(projects));
    } catch (e) {
      console.error('Failed to save projects', e);
    }
  }, [projects]);

  useEffect(() => {
    try {
      localStorage.setItem(PULLOUT_STORAGE_KEY, JSON.stringify(pullOutTickets));
    } catch (e) {
      console.error('Failed to save pull out tickets', e);
    }
  }, [pullOutTickets]);

  useEffect(() => {
    try {
      localStorage.setItem(DEPLOYMENT_STORAGE_KEY, JSON.stringify(deploymentTickets));
    } catch (e) {
      console.error('Failed to save deployment tickets', e);
    }
  }, [deploymentTickets]);

  useEffect(() => {
    try {
      localStorage.setItem(MANPOWER_RATES_STORAGE_KEY, JSON.stringify(manpowerRates));
    } catch (e) {
      console.error('Failed to save manpower rates', e);
    }
  }, [manpowerRates]);

  useEffect(() => {
    try {
      localStorage.setItem(PURCHASES_STORAGE_KEY, JSON.stringify(purchases));
    } catch (e) {
      console.error('Failed to save purchases', e);
    }
  }, [purchases]);

  useEffect(() => {
    try {
      localStorage.setItem(RETRIEVE_STORAGE_KEY, JSON.stringify(retrieveTickets));
    } catch (e) {
      console.error('Failed to save retrieve tickets', e);
    }
  }, [retrieveTickets]);

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isRemoveModalOpen, setIsRemoveModalOpen] = useState(false);
  const [isAddProjectModalOpen, setIsAddProjectModalOpen] = useState(false);
  const [isRemoveProjectModalOpen, setIsRemoveProjectModalOpen] = useState(false);
  const [isAddPullOutModalOpen, setIsAddPullOutModalOpen] = useState(false);
  const [isRemovePullOutModalOpen, setIsRemovePullOutModalOpen] = useState(false);
  const [isAddDeploymentModalOpen, setIsAddDeploymentModalOpen] = useState(false);
  const [isAddMobilizationModalOpen, setIsAddMobilizationModalOpen] = useState(false);
  const [isRemoveDeploymentModalOpen, setIsRemoveDeploymentModalOpen] = useState(false);
  const [isAddRetrieveModalOpen, setIsAddRetrieveModalOpen] = useState(false);
  const [isRemoveRetrieveModalOpen, setIsRemoveRetrieveModalOpen] = useState(false);
  const [isManageRatesModalOpen, setIsManageRatesModalOpen] = useState(false);
  const [preselectedRestockItemId, setPreselectedRestockItemId] = useState<string | null>(null);
  const [preselectedPullOutProjectId, setPreselectedPullOutProjectId] = useState<string | null>(null);
  const [preselectedRetrieveProjectId, setPreselectedRetrieveProjectId] = useState<string | null>(null);

  // Backup & Restore states
  const [restorePayload, setRestorePayload] = useState<SystemBackupPayload | null>(null);
  const [restoreFileName, setRestoreFileName] = useState<string>('');
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [backupToast, setBackupToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [detailsItem, setDetailsItem] = useState<InventoryItem | null>(null);

  // Quick filter for reorder needed
  const [filterReorderActive, setFilterReorderActive] = useState(false);

  // Calculate items needing reorder count
  const reorderAlertCount = items.filter((item) => {
    const status = getReorderStatus(item.stockQty, item.minReorderLevel);
    return status === 'reorder_needed' || status === 'out_of_stock';
  }).length;

  const handleUpdateProject = (updatedProject: Project) => {
    setProjects((prev) =>
      prev.map((p) => (p.id === updatedProject.id ? updatedProject : p))
    );
  };

  // Inventory Handlers
  const handleAddItem = (newItem: InventoryItem) => {
    setItems((prev) => [newItem, ...prev]);

    // Also register an initial stock purchase inflow record if stockQty > 0
    if (newItem.stockQty > 0) {
      const initialRecord: PurchaseRecord = {
        id: 'pur-' + Date.now(),
        poNumber: `NEW-${newItem.assetId}`,
        date: new Date().toISOString().slice(0, 10),
        itemId: newItem.id,
        assetId: newItem.assetId,
        description: newItem.description,
        category: newItem.category,
        quantity: newItem.stockQty,
        unit: newItem.unit,
        unitPrice: newItem.unitPrice,
        totalCost: newItem.unitPrice ? newItem.stockQty * newItem.unitPrice : undefined,
        supplier: 'New Asset Initial Stock',
        receivedBy: "M' Chrissna",
        notes: newItem.notes || 'Catalog Registration Inflow',
      };
      setPurchases((prev) => [initialRecord, ...prev]);
    }
  };

  // Restock / Add Stock Handler (Inflow to Inventory)
  const handleRestockItem = (
    itemId: string,
    additionalQty: number,
    notes?: string,
    newUnitPrice?: number,
    poNumber?: string,
    supplier?: string,
    receivedBy?: string
  ) => {
    if (additionalQty <= 0) return;

    let targetItem: InventoryItem | undefined;

    // 1. Inflow into Inventory state
    setItems((prev) =>
      prev.map((item) => {
        const match =
          item.id === itemId ||
          item.assetId.trim().toLowerCase() === itemId.trim().toLowerCase();

        if (match) {
          targetItem = item;
          const updatedQty = item.stockQty + additionalQty;
          return {
            ...item,
            stockQty: updatedQty,
            unitPrice: newUnitPrice !== undefined ? newUnitPrice : item.unitPrice,
            lastUpdated: new Date().toISOString().slice(0, 10),
            notes: notes
              ? `${item.notes ? item.notes + ' | ' : ''}Restock +${additionalQty} ${item.unit}: ${notes}`
              : item.notes,
          };
        }
        return item;
      })
    );

    // 2. Automatically log the purchase inflow record
    const matchingItem =
      targetItem ||
      items.find(
        (i) => i.id === itemId || i.assetId.toLowerCase() === itemId.toLowerCase()
      );

    if (matchingItem) {
      const effectivePrice =
        newUnitPrice !== undefined ? newUnitPrice : matchingItem.unitPrice;
      const newPurchaseRecord: PurchaseRecord = {
        id: 'pur-' + Date.now(),
        poNumber:
          poNumber ||
          `PO-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
        date: new Date().toISOString().slice(0, 10),
        itemId: matchingItem.id,
        assetId: matchingItem.assetId,
        description: matchingItem.description,
        category: matchingItem.category,
        quantity: additionalQty,
        unit: matchingItem.unit,
        unitPrice: effectivePrice,
        totalCost: effectivePrice ? additionalQty * effectivePrice : undefined,
        supplier: supplier || 'DSI Authorized Supplier',
        receivedBy: receivedBy || "M' Chrissna",
        notes: notes || 'Warehouse Stock Replenishment',
      };

      setPurchases((prev) => [newPurchaseRecord, ...prev]);
    }
  };

  // Direct purchase from Purchases View
  const handleAddDirectPurchase = (
    itemId: string,
    quantity: number,
    unitPrice?: number,
    poNumber?: string,
    supplier?: string,
    receivedBy?: string,
    notes?: string
  ) => {
    handleRestockItem(
      itemId,
      quantity,
      notes,
      unitPrice,
      poNumber,
      supplier,
      receivedBy
    );
  };

  // Delete purchase record (with optional rollback)
  const handleDeletePurchaseRecord = (purchaseId: string, rollbackStock: boolean) => {
    const purchase = purchases.find((p) => p.id === purchaseId);
    if (!purchase) return;

    if (rollbackStock) {
      setItems((prev) =>
        prev.map((item) => {
          const match =
            item.id === purchase.itemId ||
            item.assetId.toLowerCase() === purchase.assetId.toLowerCase();
          if (match) {
            const newQty = Math.max(0, item.stockQty - purchase.quantity);
            return {
              ...item,
              stockQty: newQty,
              lastUpdated: new Date().toISOString().slice(0, 10),
              notes: `${item.notes ? item.notes + ' | ' : ''}Rollback inflow ${purchase.poNumber || purchase.id}, -${purchase.quantity} ${item.unit}`,
            };
          }
          return item;
        })
      );
    }

    setPurchases((prev) => prev.filter((p) => p.id !== purchaseId));
  };

  // Project Handlers
  const handleAddProject = (newProject: Project) => {
    setProjects((prev) => [newProject, ...prev]);
  };

  const handleDeleteProject = (projectId: string) => {
    setProjects((prev) => prev.filter((p) => p.id !== projectId));
  };

  const handleDeleteMultipleProjects = (projectIds: string[]) => {
    const set = new Set(projectIds);
    setProjects((prev) => prev.filter((p) => !set.has(p.id)));
  };

  // Deployment Handlers
  const handleAddDeployment = (newTicket: DeploymentTicket) => {
    // 1. Add ticket to records
    setDeploymentTickets((prev) => [newTicket, ...prev]);

    // 2. Auto-register project in masterlist if not already present
    if (newTicket.projectName) {
      setProjects((prevProjects) => {
        const pId = (newTicket.projectId || '').trim().toLowerCase();
        const pName = (newTicket.projectName || '').trim().toLowerCase();
        const exists = prevProjects.some(
          (p) =>
            (p.id && p.id.trim().toLowerCase() === pId) ||
            (p.name && p.name.trim().toLowerCase() === pName)
        );
        if (!exists) {
          const newProj: Project = {
            id: newTicket.projectId || `PRJ-${String(prevProjects.length + 1).padStart(3, '0')}`,
            name: newTicket.projectName,
            location: newTicket.projectLocation || 'Site Location',
            leadPerson: newTicket.supervisor || newTicket.preparedBy || 'Site In-Charge',
            status: 'Active',
            createdAt: newTicket.deploymentDate || new Date().toISOString().slice(0, 10),
          };
          return [newProj, ...prevProjects];
        }
        return prevProjects;
      });
    }
  };

  const handleDeleteDeployment = (ticketId: string) => {
    setDeploymentTickets((prev) => prev.filter((t) => t.id !== ticketId));
  };

  const handleDeleteMultipleDeployments = (ticketIds: string[]) => {
    const set = new Set(ticketIds);
    setDeploymentTickets((prev) => prev.filter((t) => !set.has(t.id)));
  };

  const handleUpdateDeploymentStatus = (
    ticketId: string,
    status: DeploymentTicket['status']
  ) => {
    setDeploymentTickets((prev) =>
      prev.map((t) => (t.id === ticketId ? { ...t, status } : t))
    );
  };

  const handleSaveManpowerRates = (newRates: ManpowerPositionRate[]) => {
    setManpowerRates(newRates);
  };

  // Pull Out Handlers
  const handleAddPullOut = (ticket: PullOutTicket) => {
    // 1. Add ticket to records
    setPullOutTickets((prev) => [ticket, ...prev]);

    // 2. Auto-register project in masterlist if not already present
    if (ticket.projectName) {
      setProjects((prevProjects) => {
        const pId = (ticket.projectId || '').trim().toLowerCase();
        const pName = (ticket.projectName || '').trim().toLowerCase();
        const exists = prevProjects.some(
          (p) =>
            (p.id && p.id.trim().toLowerCase() === pId) ||
            (p.name && p.name.trim().toLowerCase() === pName)
        );
        if (!exists) {
          const newProj: Project = {
            id: ticket.projectId || `PRJ-${String(prevProjects.length + 1).padStart(3, '0')}`,
            name: ticket.projectName,
            location: ticket.projectLocation || 'Site Location',
            leadPerson: ticket.requestedBy || 'Project In-Charge',
            status: 'Active',
            createdAt: ticket.date || new Date().toISOString().slice(0, 10),
          };
          return [newProj, ...prevProjects];
        }
        return prevProjects;
      });
    }

    // 3. Deduct quantities from warehouse stock and record project allocations
    setItems((prevItems) => {
      // Build lookup maps by ID and Asset ID
      const deductMap = new Map<string, number>();
      ticket.items.forEach((line) => {
        if (line.itemId) {
          deductMap.set(line.itemId.trim().toLowerCase(), (deductMap.get(line.itemId.trim().toLowerCase()) || 0) + line.quantity);
        }
        if (line.assetId) {
          deductMap.set(line.assetId.trim().toLowerCase(), (deductMap.get(line.assetId.trim().toLowerCase()) || 0) + line.quantity);
        }
      });

      return prevItems.map((item) => {
        const itemIdKey = (item.id || '').trim().toLowerCase();
        const assetIdKey = (item.assetId || '').trim().toLowerCase();

        let qtyToDeduct = 0;
        if (itemIdKey && deductMap.has(itemIdKey)) {
          qtyToDeduct = deductMap.get(itemIdKey)!;
        } else if (assetIdKey && deductMap.has(assetIdKey)) {
          qtyToDeduct = deductMap.get(assetIdKey)!;
        }

        if (qtyToDeduct > 0) {
          const newStock = Math.max(0, item.stockQty - qtyToDeduct);

          let allocations = [...(item.projectAllocations || [])];
          const ticketPId = (ticket.projectId || '').trim().toLowerCase();
          const ticketPName = (ticket.projectName || '').trim().toLowerCase();

          const existingAllocIndex = allocations.findIndex((a) => {
            const aId = (a.projectId || '').trim().toLowerCase();
            const aName = (a.projectName || '').trim().toLowerCase();
            return (
              (aId && aId === ticketPId) ||
              (aName && aName === ticketPName) ||
              (aId && aId === ticketPName) ||
              (aName && aName === ticketPId)
            );
          });

          if (existingAllocIndex >= 0) {
            allocations[existingAllocIndex] = {
              ...allocations[existingAllocIndex],
              quantity: allocations[existingAllocIndex].quantity + qtyToDeduct,
              allocatedDate: ticket.date,
              leadPerson: ticket.requestedBy || allocations[existingAllocIndex].leadPerson,
              location: ticket.projectLocation || allocations[existingAllocIndex].location,
            };
          } else {
            allocations.push({
              projectId: ticket.projectId,
              projectName: ticket.projectName,
              quantity: qtyToDeduct,
              allocatedDate: ticket.date,
              leadPerson: ticket.requestedBy,
              location: ticket.projectLocation,
            });
          }

          return {
            ...item,
            stockQty: newStock,
            projectAllocations: allocations,
            lastUpdated: new Date().toISOString().slice(0, 10),
            notes: `${item.notes ? item.notes + ' | ' : ''}Pull out ${qtyToDeduct} ${item.unit} to ${ticket.projectName} (${ticket.id})`,
          };
        }
        return item;
      });
    });
  };

  const handleDeletePullOut = (ticketId: string, returnStock: boolean) => {
    const ticket = pullOutTickets.find((t) => t.id === ticketId);
    if (!ticket) return;

    if (returnStock) {
      setItems((prevItems) => {
        const lineMap = new Map<string, number>();
        ticket.items.forEach((line) => {
          lineMap.set(line.itemId, (lineMap.get(line.itemId) || 0) + line.quantity);
        });

        return prevItems.map((item) => {
          if (lineMap.has(item.id)) {
            const qtyToReturn = lineMap.get(item.id)!;
            const newStock = item.stockQty + qtyToReturn;

            let allocations = (item.projectAllocations || [])
              .map((alloc) => {
                if (alloc.projectId === ticket.projectId) {
                  return {
                    ...alloc,
                    quantity: Math.max(0, alloc.quantity - qtyToReturn),
                  };
                }
                return alloc;
              })
              .filter((alloc) => alloc.quantity > 0);

            return {
              ...item,
              stockQty: newStock,
              projectAllocations: allocations,
              lastUpdated: new Date().toISOString().slice(0, 10),
              notes: `${item.notes ? item.notes + ' | ' : ''}Canceled pull out ${ticket.id}, restored +${qtyToReturn} ${item.unit}`,
            };
          }
          return item;
        });
      });
    }

    setPullOutTickets((prev) => prev.filter((t) => t.id !== ticketId));
  };

  const handleDeleteMultiplePullOuts = (ticketIds: string[], returnStock: boolean) => {
    ticketIds.forEach((id) => handleDeletePullOut(id, returnStock));
  };

  // Retrieve Tickets Handlers (Return surplus/unused items from site back to inventory)
  const handleAddRetrieveTicket = (ticket: RetrieveTicket) => {
    // 1. Add ticket to state
    setRetrieveTickets((prev) => [ticket, ...prev]);

    // 2. Restore item quantities back into warehouse stock and reduce project allocations
    setItems((prevItems) => {
      const addMap = new Map<string, number>();
      ticket.items.forEach((line) => {
        if (line.itemId) {
          addMap.set(line.itemId.trim().toLowerCase(), (addMap.get(line.itemId.trim().toLowerCase()) || 0) + line.quantity);
        }
        if (line.assetId) {
          addMap.set(line.assetId.trim().toLowerCase(), (addMap.get(line.assetId.trim().toLowerCase()) || 0) + line.quantity);
        }
      });

      return prevItems.map((item) => {
        const itemIdKey = (item.id || '').trim().toLowerCase();
        const assetIdKey = (item.assetId || '').trim().toLowerCase();

        let qtyToAdd = 0;
        if (itemIdKey && addMap.has(itemIdKey)) {
          qtyToAdd = addMap.get(itemIdKey)!;
        } else if (assetIdKey && addMap.has(assetIdKey)) {
          qtyToAdd = addMap.get(assetIdKey)!;
        }

        if (qtyToAdd > 0) {
          const newStock = item.stockQty + qtyToAdd;

          let allocations = [...(item.projectAllocations || [])];
          const ticketPId = (ticket.projectId || '').trim().toLowerCase();
          const ticketPName = (ticket.projectName || '').trim().toLowerCase();

          const existingAllocIndex = allocations.findIndex((a) => {
            const aId = (a.projectId || '').trim().toLowerCase();
            const aName = (a.projectName || '').trim().toLowerCase();
            return (
              (aId && aId === ticketPId) ||
              (aName && aName === ticketPName) ||
              (aId && aId === ticketPName) ||
              (aName && aName === ticketPId)
            );
          });

          if (existingAllocIndex >= 0) {
            const updatedQty = Math.max(0, allocations[existingAllocIndex].quantity - qtyToAdd);
            if (updatedQty > 0) {
              allocations[existingAllocIndex] = {
                ...allocations[existingAllocIndex],
                quantity: updatedQty,
              };
            } else {
              allocations.splice(existingAllocIndex, 1);
            }
          }

          return {
            ...item,
            stockQty: newStock,
            projectAllocations: allocations,
            lastUpdated: new Date().toISOString().slice(0, 10),
            notes: `${item.notes ? item.notes + ' | ' : ''}Retrieved +${qtyToAdd} ${item.unit} from ${ticket.projectName} (${ticket.id})`,
          };
        }
        return item;
      });
    });
  };

  const handleDeleteRetrieveTicket = (ticketId: string, revertStock: boolean) => {
    const ticket = retrieveTickets.find((t) => t.id === ticketId);
    if (!ticket) return;

    if (revertStock) {
      setItems((prevItems) => {
        const lineMap = new Map<string, number>();
        ticket.items.forEach((line) => {
          lineMap.set(line.itemId, (lineMap.get(line.itemId) || 0) + line.quantity);
        });

        return prevItems.map((item) => {
          if (lineMap.has(item.id)) {
            const qtyToDeduct = lineMap.get(item.id)!;
            const newStock = Math.max(0, item.stockQty - qtyToDeduct);
            return {
              ...item,
              stockQty: newStock,
              lastUpdated: new Date().toISOString().slice(0, 10),
              notes: `${item.notes ? item.notes + ' | ' : ''}Reverted retrieve ${ticket.id}, -${qtyToDeduct} ${item.unit}`,
            };
          }
          return item;
        });
      });
    }

    setRetrieveTickets((prev) => prev.filter((t) => t.id !== ticketId));
  };

  const handleDeleteMultipleRetrieveTickets = (ticketIds: string[], revertStock: boolean) => {
    ticketIds.forEach((id) => handleDeleteRetrieveTicket(id, revertStock));
  };

  const handleReturnStock = (itemId: string, projectId: string, quantityToReturn: number) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === itemId) {
          const newStockQty = item.stockQty + quantityToReturn;

          let updatedAllocations = item.projectAllocations || [];
          if (updatedAllocations.length > 0) {
            updatedAllocations = updatedAllocations
              .map((alloc) => {
                if (alloc.projectId === projectId || (!alloc.projectId && projectId === 'proj-general')) {
                  return {
                    ...alloc,
                    quantity: Math.max(0, alloc.quantity - quantityToReturn),
                  };
                }
                return alloc;
              })
              .filter((alloc) => alloc.quantity > 0);
          }

          return {
            ...item,
            stockQty: newStockQty,
            projectAllocations: updatedAllocations,
            lastUpdated: new Date().toISOString().slice(0, 10),
            notes: `${item.notes ? item.notes + ' | ' : ''}Returned ${quantityToReturn} ${item.unit} to warehouse stock`,
          };
        }
        return item;
      })
    );
  };

  const handleUpdateItem = (updatedItem: InventoryItem) => {
    setItems((prev) =>
      prev.map((item) => (item.id === updatedItem.id ? updatedItem : item))
    );
  };

  const handleDeleteItem = (itemId: string) => {
    setItems((prev) => prev.filter((item) => item.id !== itemId));
  };

  const handleDeleteMultiple = (itemIds: string[]) => {
    const set = new Set(itemIds);
    setItems((prev) => prev.filter((item) => !set.has(item.id)));
  };

  const handleDeductStock = (itemId: string, deductQty: number, reason: string) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === itemId) {
          const newStock = Math.max(0, item.stockQty - deductQty);
          return {
            ...item,
            stockQty: newStock,
            lastUpdated: new Date().toISOString().slice(0, 10),
            notes: `${item.notes ? item.notes + ' | ' : ''}Deducted -${deductQty} ${item.unit} (${reason})`,
          };
        }
        return item;
      })
    );
  };

  const handleClearAllInventory = () => {
    setItems([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.error(e);
    }
  };

  const handleResetData = () => {
    handleClearAllInventory();
  };

  // Download / Export System Data Backup
  const handleDownloadData = () => {
    try {
      exportSystemData({
        items,
        projects,
        pullOutTickets,
        deploymentTickets,
        manpowerRates,
        purchases,
        retrieveTickets,
      });
      setBackupToast({
        message: 'Matagumpay na na-download ang backup JSON file ng buong system data!',
        type: 'success',
      });
      setTimeout(() => {
        setBackupToast(null);
      }, 5000);
    } catch (err: any) {
      console.error('Failed to export data', err);
      setBackupToast({
        message: 'Nagka-problema sa pag-download ng backup: ' + (err.message || 'Unknown error'),
        type: 'error',
      });
    }
  };

  // Upload / Import System Data from File
  const handleUploadDataFile = async (file: File) => {
    try {
      const parsed = await parseBackupFile(file);
      setRestorePayload(parsed);
      setRestoreFileName(file.name);
      setIsRestoreModalOpen(true);
    } catch (err: any) {
      console.error('Failed to parse upload file', err);
      alert('Hindi mabasa ang backup file: ' + (err.message || 'Maling JSON format'));
    }
  };

  // Confirm and Execute Restore
  const handleConfirmRestore = async () => {
    if (!restorePayload) return;
    setIsRestoring(true);

    try {
      const { data } = restorePayload;

      // 1. Update React state
      if (Array.isArray(data.inventory)) setItems(data.inventory);
      if (Array.isArray(data.projects)) setProjects(data.projects);
      if (Array.isArray(data.pullOutTickets)) setPullOutTickets(data.pullOutTickets);
      if (Array.isArray(data.deploymentTickets)) setDeploymentTickets(data.deploymentTickets);
      if (Array.isArray(data.manpowerRates)) setManpowerRates(data.manpowerRates);
      if (Array.isArray(data.purchases)) setPurchases(data.purchases);
      if (Array.isArray(data.retrieveTickets)) setRetrieveTickets(data.retrieveTickets);

      // 2. Persist to localStorage
      try {
        if (Array.isArray(data.inventory)) localStorage.setItem(STORAGE_KEY, JSON.stringify(data.inventory));
        if (Array.isArray(data.projects)) localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(data.projects));
        if (Array.isArray(data.pullOutTickets)) localStorage.setItem(PULLOUT_STORAGE_KEY, JSON.stringify(data.pullOutTickets));
        if (Array.isArray(data.deploymentTickets)) localStorage.setItem(DEPLOYMENT_STORAGE_KEY, JSON.stringify(data.deploymentTickets));
        if (Array.isArray(data.manpowerRates)) localStorage.setItem(MANPOWER_RATES_STORAGE_KEY, JSON.stringify(data.manpowerRates));
        if (Array.isArray(data.purchases)) localStorage.setItem(PURCHASES_STORAGE_KEY, JSON.stringify(data.purchases));
        if (Array.isArray(data.retrieveTickets)) localStorage.setItem(RETRIEVE_STORAGE_KEY, JSON.stringify(data.retrieveTickets));
      } catch (storageErr) {
        console.warn('LocalStorage sync warning:', storageErr);
      }

      setIsRestoring(false);
      setIsRestoreModalOpen(false);
      setRestorePayload(null);

      setBackupToast({
        message: 'Tagumpay na na-restore ang data! Na-update na ang Inventory, Projects, at Dashboard.',
        type: 'success',
      });
      setTimeout(() => {
        setBackupToast(null);
      }, 6000);
    } catch (err: any) {
      setIsRestoring(false);
      alert('Nagka-problema sa pag-restore ng data: ' + (err.message || 'Unknown error'));
    }
  };

  // Open restock modal directly on a specific item
  const handleOpenRestockModalFor = (item: InventoryItem) => {
    setPreselectedRestockItemId(item.id);
    setIsAddModalOpen(true);
  };

  const handleOpenAddModal = () => {
    setPreselectedRestockItemId(null);
    setIsAddModalOpen(true);
  };

  // When unauthenticated, always enforce and present the secure LoginScreen
  if (!isAuthenticated) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div id="app-root-container" className="flex min-h-screen bg-slate-100 font-sans text-slate-900 antialiased">
      {/* Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={(tab) => {
          setCurrentTab(tab);
          if (tab === 'inventory') {
            setFilterReorderActive(false);
          }
        }}
        reorderAlertCount={reorderAlertCount}
        user={currentUser}
        onLogout={handleLogout}
        onChangePassword={() => setIsChangePasswordModalOpen(true)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header with Upper Right Download/Upload Data controls */}
        <TopNav
          currentTab={currentTab}
          reorderCount={reorderAlertCount}
          onQuickFilterReorder={() => {
            setCurrentTab('inventory');
            setFilterReorderActive(true);
          }}
          onResetData={handleResetData}
          onDownloadData={handleDownloadData}
          onUploadDataFile={handleUploadDataFile}
          user={currentUser}
          onLogout={handleLogout}
          onChangePassword={() => setIsChangePasswordModalOpen(true)}
        />

        {/* Dynamic Views based on active tab */}
        <main className="flex-1 overflow-y-auto bg-slate-50/50">
          {currentTab === 'dashboard' && (
            <DashboardView
              projects={projects}
              items={items}
              pullOutTickets={pullOutTickets}
              deploymentTickets={deploymentTickets}
              retrieveTickets={retrieveTickets}
              onNavigateTab={(tab) => setCurrentTab(tab)}
              onOpenAddProjectModal={() => {
                setCurrentTab('projects');
                setIsAddProjectModalOpen(true);
              }}
              onUpdateProject={handleUpdateProject}
            />
          )}

          {currentTab === 'inventory' && (
            <InventoryView
              items={items}
              onOpenAddItemModal={handleOpenAddModal}
              onOpenRemoveItemsModal={() => setIsRemoveModalOpen(true)}
              onOpenRestockModal={handleOpenRestockModalFor}
              onOpenEditModal={(item) => setEditingItem(item)}
              onOpenDetailsModal={(item) => setDetailsItem(item)}
              onDeleteItem={handleDeleteItem}
              activeFilterReorder={filterReorderActive}
              onClearReorderFilter={() => setFilterReorderActive(false)}
            />
          )}

          {currentTab === 'pull_out' && (
            <PullOutView
              tickets={pullOutTickets}
              projects={projects}
              items={items}
              onOpenAddModal={() => setIsAddPullOutModalOpen(true)}
              onOpenRemoveModal={() => setIsRemovePullOutModalOpen(true)}
              onDeleteTicket={handleDeletePullOut}
              onNavigateToInventory={() => setCurrentTab('inventory')}
              onNavigateToProjects={() => setCurrentTab('projects')}
            />
          )}

          {currentTab === 'deployment' && (
            <DeploymentView
              tickets={deploymentTickets}
              projects={projects}
              manpowerRates={manpowerRates}
              onOpenAddModal={() => setIsAddDeploymentModalOpen(true)}
              onOpenAddMobilizationModal={() => setIsAddMobilizationModalOpen(true)}
              onOpenRemoveModal={() => setIsRemoveDeploymentModalOpen(true)}
              onOpenManageRates={() => setIsManageRatesModalOpen(true)}
              onDeleteTicket={handleDeleteDeployment}
              onUpdateTicketStatus={handleUpdateDeploymentStatus}
              onNavigateToProjects={() => setCurrentTab('projects')}
              onNavigateToInventory={() => setCurrentTab('inventory')}
            />
          )}

          {currentTab === 'projects' && (
            <ProjectsView
              projects={projects}
              items={items}
              pullOutTickets={pullOutTickets}
              deploymentTickets={deploymentTickets}
              retrieveTickets={retrieveTickets}
              onOpenAddProjectModal={() => setIsAddProjectModalOpen(true)}
              onOpenRemoveProjectModal={() => setIsRemoveProjectModalOpen(true)}
              onDeleteProject={handleDeleteProject}
              onNavigateToInventory={() => setCurrentTab('inventory')}
              onOpenAddPullOutForProject={(pId) => {
                setPreselectedPullOutProjectId(pId);
                setIsAddPullOutModalOpen(true);
              }}
              onOpenAddDeploymentForProject={(pId) => {
                setIsAddDeploymentModalOpen(true);
              }}
              onOpenAddRetrieveForProject={(pId) => {
                setPreselectedRetrieveProjectId(pId);
                setIsAddRetrieveModalOpen(true);
              }}
              onOpenAddRetrieveModal={() => {
                setPreselectedRetrieveProjectId(null);
                setIsAddRetrieveModalOpen(true);
              }}
              onOpenRemoveRetrieveModal={() => setIsRemoveRetrieveModalOpen(true)}
              onDeleteRetrieveTicket={handleDeleteRetrieveTicket}
              onDeleteMultipleRetrieveTickets={handleDeleteMultipleRetrieveTickets}
              onUpdateProject={handleUpdateProject}
            />
          )}

          {currentTab === 'purchases' && (
            <PurchasesView
              items={items}
              purchases={purchases}
              onNavigateToInventory={() => setCurrentTab('inventory')}
              onRestockItem={handleOpenRestockModalFor}
              onOpenAddItemModal={handleOpenAddModal}
              onAddDirectPurchase={handleAddDirectPurchase}
              onDeletePurchaseRecord={handleDeletePurchaseRecord}
            />
          )}
        </main>
      </div>

      {/* Remove / Deduct Items Modal */}
      <RemoveItemModal
        isOpen={isRemoveModalOpen}
        onClose={() => setIsRemoveModalOpen(false)}
        items={items}
        onDeleteItem={handleDeleteItem}
        onDeleteMultiple={handleDeleteMultiple}
        onDeductStock={handleDeductStock}
        onClearAllInventory={handleClearAllInventory}
      />

      {/* Add / Restock Item Modal */}
      <AddItemModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setPreselectedRestockItemId(null);
        }}
        onAddItem={handleAddItem}
        onRestockItem={handleRestockItem}
        existingItems={items}
        preselectedItemId={preselectedRestockItemId}
      />

      {/* Add Project Modal */}
      <AddProjectModal
        isOpen={isAddProjectModalOpen}
        onClose={() => setIsAddProjectModalOpen(false)}
        onAddProject={handleAddProject}
        existingProjects={projects}
      />

      {/* Remove Project Modal */}
      <RemoveProjectModal
        isOpen={isRemoveProjectModalOpen}
        onClose={() => setIsRemoveProjectModalOpen(false)}
        projects={projects}
        items={items}
        onDeleteProject={handleDeleteProject}
        onDeleteMultipleProjects={handleDeleteMultipleProjects}
      />

      {/* Add Pull Out Modal */}
      <AddPullOutModal
        isOpen={isAddPullOutModalOpen}
        onClose={() => {
          setIsAddPullOutModalOpen(false);
          setPreselectedPullOutProjectId(null);
        }}
        projects={projects}
        inventoryItems={items}
        onAddPullOut={handleAddPullOut}
        existingTickets={pullOutTickets}
        preselectedProjectId={preselectedPullOutProjectId}
        onOpenAddProjectModal={() => {
          setCurrentTab('projects');
          setIsAddProjectModalOpen(true);
        }}
      />

      {/* Remove Pull Out Modal */}
      <RemovePullOutModal
        isOpen={isRemovePullOutModalOpen}
        onClose={() => setIsRemovePullOutModalOpen(false)}
        tickets={pullOutTickets}
        onDeleteTicket={handleDeletePullOut}
        onDeleteMultipleTickets={handleDeleteMultiplePullOuts}
      />

      {/* Add Deployment Modal */}
      <AddDeploymentModal
        isOpen={isAddDeploymentModalOpen}
        onClose={() => setIsAddDeploymentModalOpen(false)}
        projects={projects}
        manpowerRates={manpowerRates}
        existingTickets={deploymentTickets}
        onAddDeployment={handleAddDeployment}
        onOpenManageRates={() => setIsManageRatesModalOpen(true)}
        onOpenAddProjectModal={() => {
          setCurrentTab('projects');
          setIsAddProjectModalOpen(true);
        }}
      />

      {/* Add Mobilization Cost Modal */}
      <AddMobilizationModal
        isOpen={isAddMobilizationModalOpen}
        onClose={() => setIsAddMobilizationModalOpen(false)}
        projects={projects}
        existingTickets={deploymentTickets}
        onAddMobilization={handleAddDeployment}
        onOpenAddProjectModal={() => {
          setCurrentTab('projects');
          setIsAddProjectModalOpen(true);
        }}
      />

      {/* Remove Deployment Modal */}
      <RemoveDeploymentModal
        isOpen={isRemoveDeploymentModalOpen}
        onClose={() => setIsRemoveDeploymentModalOpen(false)}
        tickets={deploymentTickets}
        onDeleteTicket={handleDeleteDeployment}
        onDeleteMultipleTickets={handleDeleteMultipleDeployments}
      />

      {/* Add Retrieve Modal */}
      <AddRetrieveModal
        isOpen={isAddRetrieveModalOpen}
        onClose={() => {
          setIsAddRetrieveModalOpen(false);
          setPreselectedRetrieveProjectId(null);
        }}
        projects={projects}
        inventoryItems={items}
        pullOutTickets={pullOutTickets}
        existingRetrieveTickets={retrieveTickets}
        onAddRetrieveTicket={handleAddRetrieveTicket}
        existingTickets={retrieveTickets}
        preselectedProjectId={preselectedRetrieveProjectId}
      />

      {/* Remove Retrieve Modal */}
      <RemoveRetrieveModal
        isOpen={isRemoveRetrieveModalOpen}
        onClose={() => setIsRemoveRetrieveModalOpen(false)}
        tickets={retrieveTickets}
        onDeleteTicket={handleDeleteRetrieveTicket}
        onDeleteMultipleTickets={handleDeleteMultipleRetrieveTickets}
      />

      {/* Manage Manpower Rates Modal */}
      <ManageManpowerModal
        isOpen={isManageRatesModalOpen}
        onClose={() => setIsManageRatesModalOpen(false)}
        rates={manpowerRates}
        onSaveRates={handleSaveManpowerRates}
      />

      {/* Edit Item Modal */}
      <EditItemModal
        isOpen={!!editingItem}
        item={editingItem}
        onClose={() => setEditingItem(null)}
        onUpdate={handleUpdateItem}
        onDelete={handleDeleteItem}
      />

      {/* Detailed Item / Project Breakdown Modal */}
      <ItemDetailsModal
        isOpen={!!detailsItem}
        item={detailsItem}
        onClose={() => setDetailsItem(null)}
        onEdit={(item) => setEditingItem(item)}
        onRestock={handleOpenRestockModalFor}
      />

      {/* Change Password Modal (Triggered from TopNav or Sidebar) */}
      <ChangePasswordModal
        isOpen={isChangePasswordModalOpen}
        onClose={() => setIsChangePasswordModalOpen(false)}
        onSuccess={(msg) => {
          console.log(msg);
        }}
      />

      {/* Restore Data Confirmation Modal */}
      <RestoreConfirmationModal
        isOpen={isRestoreModalOpen}
        onClose={() => {
          if (!isRestoring) {
            setIsRestoreModalOpen(false);
            setRestorePayload(null);
          }
        }}
        onConfirm={handleConfirmRestore}
        payload={restorePayload}
        fileName={restoreFileName}
        isRestoring={isRestoring}
      />

      {/* Floating System Toast Notification for Backup/Restore Feedback */}
      {backupToast && (
        <div
          id="backup-restore-toast"
          className="fixed bottom-6 right-6 z-50 flex items-center space-x-3 px-4 py-3 rounded-xl shadow-2xl border text-xs font-semibold backdrop-blur-md animate-in fade-in slide-in-from-bottom-5 duration-200"
          style={{
            backgroundColor: backupToast.type === 'success' ? '#f0fdf4' : '#fef2f2',
            borderColor: backupToast.type === 'success' ? '#86efac' : '#fca5a5',
            color: backupToast.type === 'success' ? '#166534' : '#991b1b',
          }}
        >
          {backupToast.type === 'success' ? (
            <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          )}
          <span>{backupToast.message}</span>
          <button
            onClick={() => setBackupToast(null)}
            className="ml-2 text-slate-400 hover:text-slate-600 cursor-pointer font-bold"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
