import type { RequestOptions } from '../api/client';
import { openDB, IDBPDatabase } from 'idb';
import { isNetworkError } from '../utils/error';

interface QueuedRequest {
  id: string;
  endpoint: string;
  options: RequestOptions;
  priority: number;
  dependencies: string[];
  timestamp: number;
  attempts: number;
  maxAttempts: number;
}

type RequestExecutor = <T>(endpoint: string, options: RequestOptions) => Promise<T>;
type QueueUpdateListener = () => void;

// In-memory queue for fast access
const memoryQueue: QueuedRequest[] = [];
let executor: RequestExecutor | null = null;
let db: IDBPDatabase | null = null;
const queueUpdateListeners: QueueUpdateListener[] = [];

export function setRequestExecutor(fn: RequestExecutor) {
  executor = fn;
}

async function getDB(): Promise<IDBPDatabase> {
  if (!db) {
    db = await openDB('apiRequestQueue', 1, {
      upgrade(database) {
        if (!database.objectStoreNames.contains('requests')) {
          const store = database.createObjectStore('requests', { keyPath: 'id' });
          store.createIndex('priority', 'priority');
          store.createIndex('timestamp', 'timestamp');
        }
      }
    });
  }
  return db;
}

async function loadQueueFromDB(): Promise<void> {
  const database = await getDB();
  const storedRequests = await database.getAll('requests');
  
  // Clear memory queue and reload from DB
  memoryQueue.splice(0, memoryQueue.length);
  memoryQueue.push(...storedRequests);
  memoryQueue.sort((a, b) => b.priority - a.priority);
}

function notifyQueueUpdated(): void {
  queueUpdateListeners.forEach(listener => listener());
}

export function onQueueUpdate(listener: QueueUpdateListener): () => void {
  queueUpdateListeners.push(listener);
  return () => {
    const index = queueUpdateListeners.indexOf(listener);
    if (index !== -1) {
      queueUpdateListeners.splice(index, 1);
    }
  };
}

export async function queueRequest(endpoint: string, options: RequestOptions): Promise<string> {
  const id = `req_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const priority = options.priority ?? 0;
  const dependencies = options.dependencies ?? [];
  
  const item: QueuedRequest = { 
    id, 
    endpoint, 
    options, 
    priority, 
    dependencies,
    timestamp: Date.now(),
    attempts: 0,
    maxAttempts: (options as any).maxRetries ?? 3
  };
  
  // Replace existing request with same endpoint + method in memory queue
  const conflictIndex = memoryQueue.findIndex(
    r => r.endpoint === endpoint && r.options.method === options.method
  );
  
  if (conflictIndex !== -1) {
    memoryQueue[conflictIndex] = item;
  } else {
    memoryQueue.push(item);
  }
  memoryQueue.sort((a, b) => b.priority - a.priority);
  
  // Store in IndexedDB
  const database = await getDB();
  
  // Check if there's a conflict in the database too
  const existing = await database.getFromIndex('requests', 
    'endpoint_method', 
    `${endpoint}_${options.method}`
  );
  
  if (existing) {
    await database.put('requests', item);
  } else {
    await database.add('requests', item);
  }
  
  notifyQueueUpdated();
  return id;
}

function depsSatisfied(item: QueuedRequest, queue: QueuedRequest[]): boolean {
  return !item.dependencies.some(dep => queue.some(q => q.id === dep));
}

export async function processQueue(): Promise<void> {
  if (!executor) return;
  
  // Make sure memory queue is synced with DB
  await loadQueueFromDB();
  
  for (let i = 0; i < memoryQueue.length; ) {
    const item = memoryQueue[i];
    
    if (!depsSatisfied(item, memoryQueue)) {
      i++;
      continue;
    }
    
    try {
      await executor(item.endpoint, item.options);
      
      // Remove from both memory and persistent queue
      memoryQueue.splice(i, 1);
      const database = await getDB();
      await database.delete('requests', item.id);
      
    } catch (err: any) {
      if (isNetworkError(err)) {
        // Update retry count in both memory and DB
        item.attempts++;
        const database = await getDB();
        await database.put('requests', item);
        
        if (item.attempts >= item.maxAttempts) {
          // Remove after max attempts
          memoryQueue.splice(i, 1);
          await database.delete('requests', item.id);
        } else {
          // stop processing if still offline
          break;
        }
      } else {
        // For non-network errors, remove from queue
        memoryQueue.splice(i, 1);
        const database = await getDB();
        await database.delete('requests', item.id);
      }
    }
    
    notifyQueueUpdated();
  }
}

export async function getQueueLength(): Promise<number> {
  const database = await getDB();
  return await database.count('requests');
}

export async function clearQueue(): Promise<void> {
  memoryQueue.splice(0, memoryQueue.length);
  const database = await getDB();
  await database.clear('requests');
  notifyQueueUpdated();
}

export async function cancelRequest(requestId: string): Promise<boolean> {
  const index = memoryQueue.findIndex(req => req.id === requestId);
  if (index !== -1) {
    memoryQueue.splice(index, 1);
  }
  
  const database = await getDB();
  const request = await database.get('requests', requestId);
  
  if (!request) return false;
  
  await database.delete('requests', requestId);
  notifyQueueUpdated();
  return true;
}

// Initialize by loading from IndexedDB
if (typeof window !== 'undefined') {
  loadQueueFromDB().catch(console.error);
}
