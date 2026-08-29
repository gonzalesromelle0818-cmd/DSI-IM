import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import {
  InventoryItem,
  Project,
  PullOutTicket,
  DeploymentTicket,
  ManpowerPositionRate,
  PurchaseRecord,
} from './types';
import { INITIAL_INVENTORY } from './data/mockInventory';
import { DEFAULT_MANPOWER_RATES } from './data/defaultManpower';

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const db = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

// Firestore Collection Names
export const COLLECTIONS = {
  INVENTORY: 'inventory',
  PROJECTS: 'projects',
  PULLOUTS: 'pullouts',
  DEPLOYMENTS: 'deployments',
  PURCHASES: 'purchases',
  MANPOWER_RATES: 'manpower_rates',
};

// Generic sanitize function to prevent undefined values in Firestore
export function sanitizeData<T extends object>(data: T): T {
  const sanitized = JSON.parse(JSON.stringify(data));
  return sanitized;
}

// -------------------------------------------------------------
// Real-time Listeners with Initial Seed Handlers
// -------------------------------------------------------------

export function subscribeToInventory(
  callback: (items: InventoryItem[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const colRef = collection(db, COLLECTIONS.INVENTORY);
  return onSnapshot(
    colRef,
    async (snapshot) => {
      if (snapshot.empty) {
        // If Firestore is completely empty on first launch, seed initial masterlist
        try {
          const batch = writeBatch(db);
          INITIAL_INVENTORY.forEach((item) => {
            const docRef = doc(db, COLLECTIONS.INVENTORY, item.id);
            batch.set(docRef, sanitizeData(item));
          });
          await batch.commit();
        } catch (e) {
          console.warn('Initial inventory seeding error (continuing with local cache):', e);
        }
        callback(INITIAL_INVENTORY);
        return;
      }

      const items: InventoryItem[] = [];
      snapshot.forEach((docSnap) => {
        items.push(docSnap.data() as InventoryItem);
      });
      // Sort items by Asset ID or last updated
      items.sort((a, b) => a.assetId.localeCompare(b.assetId, undefined, { numeric: true }));
      callback(items);
    },
    (err) => {
      console.error('Firestore inventory subscription error:', err);
      onError?.(err);
    }
  );
}

export function subscribeToProjects(
  callback: (projects: Project[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const colRef = collection(db, COLLECTIONS.PROJECTS);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const list: Project[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as Project);
      });
      list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      callback(list);
    },
    (err) => {
      console.error('Firestore projects subscription error:', err);
      onError?.(err);
    }
  );
}

export function subscribeToPullOuts(
  callback: (tickets: PullOutTicket[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const colRef = collection(db, COLLECTIONS.PULLOUTS);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const list: PullOutTicket[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as PullOutTicket);
      });
      list.sort((a, b) => (b.date || b.createdAt || '').localeCompare(a.date || a.createdAt || ''));
      callback(list);
    },
    (err) => {
      console.error('Firestore pullouts subscription error:', err);
      onError?.(err);
    }
  );
}

export function subscribeToDeployments(
  callback: (tickets: DeploymentTicket[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const colRef = collection(db, COLLECTIONS.DEPLOYMENTS);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const list: DeploymentTicket[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as DeploymentTicket);
      });
      list.sort((a, b) => (b.deploymentDate || b.createdAt || '').localeCompare(a.deploymentDate || a.createdAt || ''));
      callback(list);
    },
    (err) => {
      console.error('Firestore deployments subscription error:', err);
      onError?.(err);
    }
  );
}

export function subscribeToPurchases(
  callback: (purchases: PurchaseRecord[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const colRef = collection(db, COLLECTIONS.PURCHASES);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const list: PurchaseRecord[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as PurchaseRecord);
      });
      list.sort((a, b) => (b.createdAt || b.receivedDate || '').localeCompare(a.createdAt || a.receivedDate || ''));
      callback(list);
    },
    (err) => {
      console.error('Firestore purchases subscription error:', err);
      onError?.(err);
    }
  );
}

export function subscribeToManpowerRates(
  callback: (rates: ManpowerPositionRate[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const colRef = collection(db, COLLECTIONS.MANPOWER_RATES);
  return onSnapshot(
    colRef,
    async (snapshot) => {
      if (snapshot.empty) {
        try {
          const batch = writeBatch(db);
          DEFAULT_MANPOWER_RATES.forEach((rate) => {
            const docRef = doc(db, COLLECTIONS.MANPOWER_RATES, rate.id);
            batch.set(docRef, sanitizeData(rate));
          });
          await batch.commit();
        } catch (e) {
          console.warn('Initial manpower rates seeding error:', e);
        }
        callback(DEFAULT_MANPOWER_RATES);
        return;
      }

      const list: ManpowerPositionRate[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as ManpowerPositionRate);
      });
      callback(list);
    },
    (err) => {
      console.error('Firestore manpower rates subscription error:', err);
      onError?.(err);
    }
  );
}

// -------------------------------------------------------------
// Cloud Sync Write Mutations (Cloud Firestore + Auto Local Fallback)
// -------------------------------------------------------------

export async function saveInventoryItemCloud(item: InventoryItem): Promise<void> {
  const docRef = doc(db, COLLECTIONS.INVENTORY, item.id);
  await setDoc(docRef, sanitizeData(item), { merge: true });
}

export async function deleteInventoryItemCloud(itemId: string): Promise<void> {
  const docRef = doc(db, COLLECTIONS.INVENTORY, itemId);
  await deleteDoc(docRef);
}

export async function saveProjectCloud(project: Project): Promise<void> {
  const docRef = doc(db, COLLECTIONS.PROJECTS, project.id);
  await setDoc(docRef, sanitizeData(project), { merge: true });
}

export async function deleteProjectCloud(projectId: string): Promise<void> {
  const docRef = doc(db, COLLECTIONS.PROJECTS, projectId);
  await deleteDoc(docRef);
}

export async function savePullOutCloud(ticket: PullOutTicket): Promise<void> {
  const docRef = doc(db, COLLECTIONS.PULLOUTS, ticket.id);
  await setDoc(docRef, sanitizeData(ticket), { merge: true });
}

export async function deletePullOutCloud(ticketId: string): Promise<void> {
  const docRef = doc(db, COLLECTIONS.PULLOUTS, ticketId);
  await deleteDoc(docRef);
}

export async function saveDeploymentCloud(ticket: DeploymentTicket): Promise<void> {
  const docRef = doc(db, COLLECTIONS.DEPLOYMENTS, ticket.id);
  await setDoc(docRef, sanitizeData(ticket), { merge: true });
}

export async function deleteDeploymentCloud(ticketId: string): Promise<void> {
  const docRef = doc(db, COLLECTIONS.DEPLOYMENTS, ticketId);
  await deleteDoc(docRef);
}

export async function savePurchaseCloud(record: PurchaseRecord): Promise<void> {
  const docRef = doc(db, COLLECTIONS.PURCHASES, record.id);
  await setDoc(docRef, sanitizeData(record), { merge: true });
}

export async function deletePurchaseCloud(purchaseId: string): Promise<void> {
  const docRef = doc(db, COLLECTIONS.PURCHASES, purchaseId);
  await deleteDoc(docRef);
}

export async function saveManpowerRateCloud(rate: ManpowerPositionRate): Promise<void> {
  const docRef = doc(db, COLLECTIONS.MANPOWER_RATES, rate.id);
  await setDoc(docRef, sanitizeData(rate), { merge: true });
}

export async function deleteManpowerRateCloud(rateId: string): Promise<void> {
  const docRef = doc(db, COLLECTIONS.MANPOWER_RATES, rateId);
  await deleteDoc(docRef);
}
