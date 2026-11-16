import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, get, child, onValue, off } from 'firebase/database';

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
export const db = getDatabase(app);

export function setVal(path: string, val: any) {
  return set(ref(db, path), val);
}

export function getVal(path: string) {
  return get(child(ref(db), path));
}

export function onVal(path: string, cb: (val: any) => void) {
  const r = ref(db, path);
  onValue(r, snap => cb(snap.val()));
  return () => off(r, 'value');
}