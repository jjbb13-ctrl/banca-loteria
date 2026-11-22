import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue, set, off, get, child } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyD4wetc-BG_bNmf6mctGdLBzk-nPpR4wU8",
  authDomain: "banca-lottery.firebaseapp.com",
  databaseURL: "https://banca-lottery-default-rtdb.firebaseio.com",
  projectId: "banca-lottery",
  storageBucket: "banca-lottery.firebasestorage.app",
  messagingSenderId: "1059540016631",
  appId: "1:1059540016631:web:43020a6654f3d8639f22f2",
  measurementId: "G-9SY3MGN7HG"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

export function firebaseRef(path: string) {
  return ref(db, 'banca/' + path);
}

export function firebaseOnValue(path: string, callback: (data: unknown) => void) {
  const r = firebaseRef(path);
  onValue(r, snapshot => callback(snapshot.val()));
  return () => off(r);
}

export function firebaseSet(path: string, value: unknown): Promise<void> {
  return set(firebaseRef(path), value);
}

export async function firebaseGetOnce(path: string): Promise<unknown> {
  const snapshot = await get(child(ref(db), 'banca/' + path));
  return snapshot.val();
}

// Compatibilidad con store.ts
export function isFirebaseConfigured() { return true; }
export function initFirebase() { /* ya inicializado */ }