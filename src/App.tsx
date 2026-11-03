import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router';
import Login from './pages/Login';
import Vendor from './pages/Vendor';
import Admin from './pages/Admin';
import { store } from './store';

function VendorRoute({ taq, onLogout }: { taq: string; onLogout: () => void }) {
  const saved = sessionStorage.getItem('banca_session');
  if (!saved || JSON.parse(saved).role !== 'vendor') {
    return <Navigate to="/taquilla" replace />;
  }
  return <Vendor taq={taq} onLogout={onLogout} />;
}

function AdminRoute({ onLogout }: { onLogout: () => void }) {
  const saved = sessionStorage.getItem('banca_session');
  if (!saved || JSON.parse(saved).role !== 'admin') {
    return <Navigate to="/admin" replace />;
  }
  return <Admin onLogout={onLogout} />;
}

export default function App() {
  const navigate = useNavigate();
  const [taq, setTaq] = useState('');
  const [, setTick] = useState(0);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const saved = sessionStorage.getItem('banca_session');
    if (saved) {
      const s = JSON.parse(saved);
      if (s.role === 'vendor') {
        setTaq(s.taq);
        navigate('/panel', { replace: true });
      } else if (s.role === 'admin') {
        navigate('/dashboard', { replace: true });
      }
    }
    setIsReady(true);
    const unsub = store.startFirebaseSync(() => setTick(t => t + 1));
    return unsub;
  }, []);

  const loginVendor = (code: string) => {
    sessionStorage.setItem('banca_session', JSON.stringify({ role: 'vendor', taq: code }));
    setTaq(code);
    navigate('/panel', { replace: true });
  };

  const loginAdmin = () => {
    sessionStorage.setItem('banca_session', JSON.stringify({ role: 'admin' }));
    navigate('/dashboard', { replace: true });
  };

  const logout = () => {
    sessionStorage.removeItem('banca_session');
    setTaq('');
    navigate('/', { replace: true });
  };

  if (!isReady) return null;

  return (
    <Routes>
      <Route path="/" element={<Login onVendorLogin={loginVendor} onAdminLogin={loginAdmin} initialMode={undefined} />} />
      <Route path="/taquilla" element={<Login onVendorLogin={loginVendor} onAdminLogin={loginAdmin} initialMode="vendor" />} />
      <Route path="/admin" element={<Login onVendorLogin={loginVendor} onAdminLogin={loginAdmin} initialMode="admin" />} />
      <Route path="/panel" element={<VendorRoute taq={taq} onLogout={logout} />} />
      <Route path="/dashboard" element={<AdminRoute onLogout={logout} />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}