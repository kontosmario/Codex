import { openDB } from 'idb';

import type { QueuedTransaction, QueuedTransactionPayload } from '../types';

const DB_NAME = 'family-budget-cats-db';
const DB_VERSION = 1;
const STORE_NAME = 'queued-transactions';

function notifyQueueChange() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('queue-updated'));
  }
}

const getDb = () =>
  openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'localId' });
        store.createIndex('by-user-id', 'userId');
        store.createIndex('by-created-at', 'createdAt');
      }
    }
  });

function safeRandomId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

export function createQueuedTransaction(input: {
  userId: string;
  payload: QueuedTransactionPayload;
  idempotencyKey?: string;
}): QueuedTransaction {
  return {
    localId: safeRandomId(),
    userId: input.userId,
    payload: input.payload,
    idempotencyKey: input.idempotencyKey || safeRandomId(),
    createdAt: new Date().toISOString()
  };
}

export async function enqueueTransaction(transaction: QueuedTransaction) {
  const db = await getDb();
  await db.put(STORE_NAME, transaction);
  notifyQueueChange();
  return transaction;
}

export async function listQueuedTransactions(userId?: string): Promise<QueuedTransaction[]> {
  const db = await getDb();

  if (userId) {
    return db.getAllFromIndex(STORE_NAME, 'by-user-id', userId);
  }

  return db.getAll(STORE_NAME);
}

export async function removeQueuedTransaction(localId: string) {
  const db = await getDb();
  await db.delete(STORE_NAME, localId);
  notifyQueueChange();
}

export async function countQueuedTransactions(userId?: string) {
  const rows = await listQueuedTransactions(userId);
  return rows.length;
}
