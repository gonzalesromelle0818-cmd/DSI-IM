import {
  InventoryItem,
  Project,
  PullOutTicket,
  DeploymentTicket,
  ManpowerPositionRate,
  PurchaseRecord,
  RetrieveTicket,
} from '../types';

export interface SystemBackupPayload {
  version: string;
  exportedAt: string;
  app: string;
  data: {
    inventory: InventoryItem[];
    projects: Project[];
    pullOutTickets: PullOutTicket[];
    deploymentTickets: DeploymentTicket[];
    manpowerRates: ManpowerPositionRate[];
    purchases: PurchaseRecord[];
    retrieveTickets: RetrieveTicket[];
  };
  summary: {
    inventoryCount: number;
    projectsCount: number;
    pullOutTicketsCount: number;
    deploymentTicketsCount: number;
    purchasesCount: number;
    retrieveTicketsCount: number;
  };
}

/**
 * Generates and downloads a timestamped .json backup of all application data
 */
export function exportSystemData({
  items,
  projects,
  pullOutTickets,
  deploymentTickets,
  manpowerRates,
  purchases,
  retrieveTickets,
}: {
  items: InventoryItem[];
  projects: Project[];
  pullOutTickets: PullOutTicket[];
  deploymentTickets: DeploymentTicket[];
  manpowerRates: ManpowerPositionRate[];
  purchases: PurchaseRecord[];
  retrieveTickets: RetrieveTicket[];
}) {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const timeStr = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
  
  const payload: SystemBackupPayload = {
    version: '1.0.0',
    exportedAt: now.toISOString(),
    app: 'DSI Operations & Inventory Management System',
    data: {
      inventory: items || [],
      projects: projects || [],
      pullOutTickets: pullOutTickets || [],
      deploymentTickets: deploymentTickets || [],
      manpowerRates: manpowerRates || [],
      purchases: purchases || [],
      retrieveTickets: retrieveTickets || [],
    },
    summary: {
      inventoryCount: items?.length || 0,
      projectsCount: projects?.length || 0,
      pullOutTicketsCount: pullOutTickets?.length || 0,
      deploymentTicketsCount: deploymentTickets?.length || 0,
      purchasesCount: purchases?.length || 0,
      retrieveTicketsCount: retrieveTickets?.length || 0,
    },
  };

  const jsonString = JSON.stringify(payload, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `DSI_System_Backup_${dateStr}_${timeStr}.json`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Validates and parses an uploaded JSON file
 */
export async function parseBackupFile(file: File): Promise<SystemBackupPayload> {
  return new Promise((resolve, reject) => {
    if (!file.name.endsWith('.json') && file.type !== 'application/json') {
      return reject(new Error('Invalid file format. Please select a valid .json backup file.'));
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const rawContent = event.target?.result as string;
        if (!rawContent) {
          throw new Error('File content is empty.');
        }

        const parsed = JSON.parse(rawContent);

        // Support both structured payload and direct data object format
        const targetData = parsed.data || parsed;

        if (
          !Array.isArray(targetData.inventory) &&
          !Array.isArray(targetData.projects) &&
          !Array.isArray(targetData.pullOutTickets)
        ) {
          throw new Error(
            'The selected file does not appear to be a recognized DSI system backup. Missing inventory/projects data array.'
          );
        }

        const normalizedPayload: SystemBackupPayload = {
          version: parsed.version || '1.0.0',
          exportedAt: parsed.exportedAt || new Date().toISOString(),
          app: parsed.app || 'DSI System Backup',
          data: {
            inventory: Array.isArray(targetData.inventory) ? targetData.inventory : [],
            projects: Array.isArray(targetData.projects) ? targetData.projects : [],
            pullOutTickets: Array.isArray(targetData.pullOutTickets) ? targetData.pullOutTickets : [],
            deploymentTickets: Array.isArray(targetData.deploymentTickets) ? targetData.deploymentTickets : [],
            manpowerRates: Array.isArray(targetData.manpowerRates) ? targetData.manpowerRates : [],
            purchases: Array.isArray(targetData.purchases) ? targetData.purchases : [],
            retrieveTickets: Array.isArray(targetData.retrieveTickets) ? targetData.retrieveTickets : [],
          },
          summary: {
            inventoryCount: targetData.inventory?.length || 0,
            projectsCount: targetData.projects?.length || 0,
            pullOutTicketsCount: targetData.pullOutTickets?.length || 0,
            deploymentTicketsCount: targetData.deploymentTickets?.length || 0,
            purchasesCount: targetData.purchases?.length || 0,
            retrieveTicketsCount: targetData.retrieveTickets?.length || 0,
          },
        };

        resolve(normalizedPayload);
      } catch (err: any) {
        reject(new Error(err.message || 'Failed to parse JSON backup file.'));
      }
    };

    reader.onerror = () => {
      reject(new Error('Error reading the backup file.'));
    };

    reader.readAsText(file);
  });
}
