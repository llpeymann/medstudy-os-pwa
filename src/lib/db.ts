/* ============ لایه ذخیره‌سازی IndexedDB با fallback به localStorage ============ */
import type { AppState } from '../types';

const DB_NAME = 'medstudy-os';
const STORE = 'kv';
const STATE_KEY = 'app-state-v1';
const TIMER_KEY = 'study-timer-v1';

let dbPromise: Promise<IDBDatabase> | null = null;
let idbAvailable: boolean | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      idbAvailable = false;
      reject(new Error('IndexedDB در این مرورگر در دسترس نیست'));
      return;
    }
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => {
      idbAvailable = false;
      reject(req.error ?? new Error('خطای بازشدن IndexedDB'));
    };
  });
  return dbPromise;
}

async function kvSet(key: string, value: unknown): Promise<void> {
  if (idbAvailable === false) throw new Error('IndexedDB ناموجود');
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    idbAvailable = false;
    throw new Error('خطا در نوشتن IndexedDB');
  }
}

async function kvGet<T>(key: string): Promise<T | null> {
  if (idbAvailable === false) throw new Error('IndexedDB ناموجود');
  const db = await openDB();
  return new Promise<T | null>((resolve, reject) => {
    const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(key);
    req.onsuccess = () => resolve((req.result as T | undefined) ?? null);
    req.onerror = () => reject(req.error);
  });
}

/** ذخیره وضعیت اصلی — با fallback به localStorage */
export async function saveState(state: AppState): Promise<'idb' | 'local'> {
  try {
    await kvSet(STATE_KEY, state);
    return 'idb';
  } catch {
    try {
      localStorage.setItem(STATE_KEY, JSON.stringify(state));
      return 'local';
    } catch {
      throw new Error('ذخیره‌سازی امکان‌پذیر نیست');
    }
  }
}

/** بارگذاری وضعیت */
export async function loadState(): Promise<AppState | null> {
  try {
    const v = await kvGet<AppState>(STATE_KEY);
    if (v) return v;
  } catch {
    /* fallthrough */
  }
  try {
    const raw = localStorage.getItem(STATE_KEY);
    if (raw) return JSON.parse(raw) as AppState;
  } catch {
    /* ignore */
  }
  return null;
}

/** ذخیره تایمر (برای مقاومت در برابر رفرش) */
export async function saveTimer(timer: unknown): Promise<void> {
  try {
    await kvSet(TIMER_KEY, timer);
  } catch {
    localStorage.setItem(TIMER_KEY, JSON.stringify(timer));
  }
}

export async function loadTimer<T>(): Promise<T | null> {
  try {
    const v = await kvGet<T>(TIMER_KEY);
    if (v) return v;
  } catch {
    /* fallthrough */
  }
  try {
    const raw = localStorage.getItem(TIMER_KEY);
    if (raw) return JSON.parse(raw) as T;
  } catch {
    /* ignore */
  }
  return null;
}

export async function clearTimer(): Promise<void> {
  try {
    await kvSet(TIMER_KEY, null);
  } catch {
    localStorage.removeItem(TIMER_KEY);
  }
}

export async function clearAll(): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    localStorage.clear();
  }
}

/** وضعیت موتور ذخیره‌سازی فعال */
export async function storageBackend(): Promise<'idb' | 'local' | 'none'> {
  try {
    await openDB();
    return 'idb';
  } catch {
    return typeof localStorage !== 'undefined' ? 'local' : 'none';
  }
}
