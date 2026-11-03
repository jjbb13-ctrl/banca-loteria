import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { store } from '@/store';

export default function Login({ onVendorLogin, onAdminLogin, initialMode }: { onVendorLogin: (c: string) => void; onAdminLogin: () => void; initialMode?: 'vendor' | 'admin' }) {
  const [code, setCode] = useState('');
  const [adminPw, setAdminPw] = useState('');
  const [err, setErr] = useState('');
  const [mode, setMode] = useState<'vendor' | 'admin'>(initialMode || 'vendor');

  const vendorLogin = () => {
    setErr('');
    const t = store.terminalByCod(code.trim().toUpperCase());
    if (!t) { setErr('Código de terminal no encontrado'); return; }
    if (!t.activo || t.bloqueado) { setErr('Terminal inactiva o bloqueada'); return; }
    onVendorLogin(t.codigo);
  };

  const adminLogin = () => {
    setErr('');
    if (adminPw !== 'banca2024') { setErr('Contraseña incorrecta'); return; }
    onAdminLogin();
  };

  return (
    <div className="min-h-screen bg-[#f4f6f9] flex items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-xl text-[#12355b]">🎫 Banca Lottery</CardTitle>
          <p className="text-xs text-gray-500">Sistema de venta y control</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {!initialMode && (
            <div className="flex gap-2">
              <Button variant={mode === 'vendor' ? 'default' : 'outline'} className="flex-1" onClick={() => { setMode('vendor'); setErr(''); }}>Vendedor</Button>
              <Button variant={mode === 'admin' ? 'default' : 'outline'} className="flex-1" onClick={() => { setMode('admin'); setErr(''); }}>Administrador</Button>
            </div>
          )}

          {mode === 'vendor' ? (
            <div className="space-y-3">
              <label className="text-xs font-semibold text-gray-600">Código de taquilla</label>
              <Input value={code} onChange={e => setCode(e.target.value.toUpperCase())} placeholder="Ej: TQ-001" onKeyDown={e => e.key === 'Enter' && vendorLogin()} />
              <Button className="w-full bg-[#0e7c4a] hover:bg-[#0b6b3e]" onClick={vendorLogin}>Ingresar</Button>
            </div>
          ) : (
            <div className="space-y-3">
              <label className="text-xs font-semibold text-gray-600">Contraseña de administrador</label>
              <Input type="password" value={adminPw} onChange={e => setAdminPw(e.target.value)} placeholder="••••••••" onKeyDown={e => e.key === 'Enter' && adminLogin()} />
              <Button className="w-full bg-[#12355b] hover:bg-[#0e2847]" onClick={adminLogin}>Ingresar</Button>
            </div>
          )}

          {err && <p className="text-red-600 text-sm text-center">{err}</p>}
        </CardContent>
      </Card>
    </div>
  );
}
