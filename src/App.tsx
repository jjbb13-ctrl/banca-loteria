import { useState, useEffect } from 'react';
import Login from './pages/Login';
import Vendor from './pages/Vendor';
import Admin from './pages/Admin';
import { store } from './store';

function getUrlMode(): 'login' | 'vendor' | 'admin' {
  const params = new URLSearchParams(window.location.search);
  if (params.has('vendor')) return 'vendor';
  if (params.has('admin')) return 'admin';
  return 'login';
}

export default function App() {
  const urlMode = getUrlMode();
  const [view, setView] = useState<'login' | 'vendor' | 'admin'>('login');
  const [taq, setTaq] = useState('');
  const [, setTick] = useState(0);

  useEffect(() => {
    const saved = sessionStorage.getItem('banca_session');
    if (saved) {
      const s = JSON.parse(saved);
      if (s.role === 'vendor') { setTaq(s.taq); setView('vendor'); }
      else if (s.role === 'admin') { setView('admin'); }
    }
    const unsub = store.startFirebaseSync(() => setTick(t => t + 1));
    return unsub;
  }, []);

  const loginVendor = (code: string) => {
    sessionStorage.setItem('banca_session', JSON.stringify({ role: 'vendor', taq: code }));
    setTaq(code);
    setView('vendor');
  };

  const loginAdmin = () => {
    sessionStorage.setItem('banca_session', JSON.stringify({ role: 'admin' }));
    setView('admin');
  };

  const logout = () => {
    sessionStorage.removeItem('banca_session');
    setTaq('');
    setView('login');
  };

  if (view === 'vendor') return <Vendor taq={taq} onLogout={logout} />;
  if (view === 'admin') return <Admin onLogout={logout} />;
  return <Login onVendorLogin={loginVendor} onAdminLogin={loginAdmin} initialMode={urlMode === 'login' ? undefined : urlMode} />;
}
