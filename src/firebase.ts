import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getDatabase, ref, onValue, set, off, type Database } from 'firebase/database';

let app: FirebaseApp | null = null;
let db: Database | null = null;

export function isFirebaseConfigured(): boolean {
  return !!localStorage.getItem('banca_firebase_config');
}

export function getFirebaseConfig(): object | null {
  const c = localStorage.getItem('banca_firebase_config');
  return c ? JSON.parse(c) : null;
}

export function saveFirebaseConfig(config: object) {
  localStorage.setItem('banca_firebase_config', JSON.stringify(config));
}

export function initFirebase(): boolean {
  if (app) return true;
  const config = getFirebaseConfig();
  if (!config) return false;
  try {
    app = initializeApp(config);
    db = getDatabase(app);
    return true;
  } catch (e) {
    console.error('Firebase init error', e);
    return false;
  }
}

export function getDb(): Database | null {
  if (!db) initFirebase();
  return db;
}

export function firebaseRef(path: string) {
  const d = getDb();
  return d ? ref(d, 'banca/' + path) : null;
}

export function firebaseOnValue(path: string, callback: (data: unknown) => void) {
  const r = firebaseRef(path);
  if (!r) return () => {};
  onValue(r, snapshot => callback(snapshot.val()));
  return () => off(r);
}

export function firebaseSet(path: string, value: unknown): Promise<void> {
  const r = firebaseRef(path);
  if (!r) return Promise.reject('Firebase not configured');
  return set(r, value);
}
