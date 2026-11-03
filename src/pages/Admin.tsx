import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { store, hoy, cop, NOMJ, NOMT, uid } from '@/store';
import type { Ticket, Modalidad, Loteria, Turno } from '@/types';

const MODS: { key: Modalidad; label: string }[] = [
  { key: 'triple', label: 'Triples (3 cifras)' },
  { key: 'cuadrupla', label: '4 Cifras' },
  { key: 'terminal', label: 'Terminales' },
  { key: 'triple_zodiacal', label: 'Triple Zodiacal' },
  { key: '4_zodiacal', label: '4 Zodiacal' },
  { key: '2_zodiacal', label: '2 Zodiacal' },
];

export default function Admin({ onLogout }: { onLogout: () => void }) {
  const [tab, setTab] = useState<'monitoreo' | 'vendedores' | 'terminales' | 'loterias' | 'ventas' | 'premiar' | 'cuadre' | 'auditoria' | 'nube'>('monitoreo');
  const [tick, setTick] = useState(0);
  const force = () => setTick(t => t + 1);

  // Auto-refresh cada 5 segundos en monitoreo
  useEffect(() => {
    if (tab !== 'monitoreo') return;
    const iv = setInterval(force, 5000);
    return () => clearInterval(iv);
  }, [tab]);

  const [ticketModal, setTicketModal] = useState<Ticket | null>(null);

  return (
    <div className="min-h-screen bg-[#f4f6f9]">
      <header className="bg-[#12355b] text-white px-4 py-3 flex justify-between items-center sticky top-0 z-10">
        <div>
          <h1 className="text-base font-bold">🎫 BANCA MANAGER</h1>
          <p className="text-[11px] opacity-75">Panel Administrativo · {new Date().toLocaleString('es-VE', { timeZone: 'America/Caracas' })}</p>
        </div>
        <Button variant="ghost" size="sm" className="text-white" onClick={onLogout}>Salir</Button>
      </header>

      <nav className="flex gap-2 bg-white px-3 py-2 border-b overflow-x-auto sticky top-[52px] z-10">
        {[
          { k: 'monitoreo', l: '📊 Monitoreo' },
          { k: 'vendedores', l: '👤 Vendedores' },
          { k: 'terminales', l: '🖥️ Terminales' },
          { k: 'loterias', l: '🏆 Loterías' },
          { k: 'ventas', l: '🧾 Tickets' },
          { k: 'premiar', l: '🎯 Premiar' },
          { k: 'cuadre', l: '💰 Cuadre' },
          { k: 'auditoria', l: '📋 Auditoría' },
          { k: 'nube', l: '☁️ Nube' },
        ].map(t => (
          <button key={t.k} className={`px-3 py-1.5 rounded-full text-sm border whitespace-nowrap ${tab === t.k ? 'bg-[#12355b] text-white border-[#12355b]' : 'bg-gray-50 text-gray-700 border-gray-200'}`} onClick={() => setTab(t.k as typeof tab)}>{t.l}</button>
        ))}
      </nav>

      <main className="max-w-5xl mx-auto p-4 pb-20">
        {tab === 'monitoreo' && <MonitoreoTab key={tick} />}
        {tab === 'vendedores' && <VendedoresTab onChange={force} />}
        {tab === 'terminales' && <TerminalesTab onChange={force} />}
        {tab === 'loterias' && <LoteriasTab onChange={force} />}
        {tab === 'ventas' && <VentasTab onTicket={setTicketModal} />}
        {tab === 'premiar' && <PremiarTab onChange={force} />}
        {tab === 'cuadre' && <CuadreTab />}
        {tab === 'auditoria' && <AuditoriaTab />}
        {tab === 'nube' && <NubeTab />}
      </main>

      <Dialog open={!!ticketModal} onOpenChange={() => setTicketModal(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="text-[#12355b]">Ticket #{ticketModal?.numero}</DialogTitle></DialogHeader>
          {ticketModal && (
            <div className="space-y-3">
              <div className="bg-[#fffdf5] border border-dashed border-[#c9a227] rounded-lg p-3 font-mono text-sm whitespace-pre-wrap">
                {store.txtTicket(ticketModal).replace(/\*/g, '')}
              </div>
              {ticketModal.estado === 'valido' && (
                <Button className="w-full bg-[#0e7c4a]" onClick={() => {
                  const res = store.pagarPremio(ticketModal.id, 'ADMIN');
                  alert(res.msg);
                  force();
                }}>💰 Pagar premio</Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================
// 1. MONITOREO EN TIEMPO REAL
// ============================================================
function MonitoreoTab() {
  const [lotId, setLotId] = useState('all');
  const [turno, setTurno] = useState<Turno | 'all'>('all');
  const [fecha, setFecha] = useState(hoy());
  const [buscarNum, setBuscarNum] = useState('');

  const loteriasFiltradas = lotId === 'all'
    ? store.loterias.filter(l => turno === 'all' || l.turno === turno)
    : store.loterias.filter(l => l.id === lotId);

  // Totales globales
  const totalesGlobales = { ventas: 0, jugadas: 0, premios: 0, terminalesActivos: 0, terminalesBloqueados: 0 };
  store.tickets.forEach(t => {
    if (t.estado === 'anulado') return;
    if (t.fechaSorteo !== fecha) return;
    const l = store.loteById(t.loteriaId);
    if (!l) return;
    if (turno !== 'all' && l.turno !== turno) return;
    if (lotId !== 'all' && t.loteriaId !== lotId) return;
    totalesGlobales.ventas += t.total;
    totalesGlobales.jugadas += t.jugadas.length;
    if (t.estado === 'pagado') totalesGlobales.premios += t.montoPremio || 0;
  });
  store.terminales.forEach(t => {
    if (t.activo) totalesGlobales.terminalesActivos++;
    if (t.bloqueado) totalesGlobales.terminalesBloqueados++;
  });

  // Buscador de número jugado
  const resultadosBusqueda: { loteriaId: string; loteria: string; modalidad: string; numero: string; monto: number; apuestas: number }[] = [];
  if (buscarNum.trim()) {
    const b = buscarNum.trim();
    const map: Record<string, { loteriaId: string; loteria: string; modalidad: string; numero: string; monto: number; apuestas: number }> = {};
    store.tickets.forEach(t => {
      if (t.estado === 'anulado') return;
      if (t.fechaSorteo !== fecha) return;
      t.jugadas.forEach(j => {
        if (!j.numero.includes(b)) return;
        const lote = store.loteById(t.loteriaId);
        const key = t.loteriaId + '|' + j.modalidad + '|' + j.numero;
        if (!map[key]) {
          map[key] = { loteriaId: t.loteriaId, loteria: lote?.nombre || '?', modalidad: NOMJ[j.modalidad], numero: j.numero, monto: 0, apuestas: 0 };
        }
        map[key].monto += j.monto;
        map[key].apuestas += 1;
      });
    });
    resultadosBusqueda.push(...Object.values(map).sort((a, b) => b.monto - a.monto));
  }

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <Card>
        <CardContent className="p-3 flex gap-2 flex-wrap items-end">
          <div>
            <label className="text-xs text-gray-500 block mb-1">Lotería</label>
            <Select value={lotId} onValueChange={setLotId}>
              <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">🌎 Todas las loterías</SelectItem>
                {store.loterias.map(l => <SelectItem key={l.id} value={l.id}>{l.nombre}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Turno</label>
            <Select value={turno} onValueChange={(v) => setTurno(v as Turno | 'all')}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="manana">☀️ Mañana</SelectItem>
                <SelectItem value="tarde">🌤️ Tarde</SelectItem>
                <SelectItem value="noche">🌙 Noche</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Fecha</label>
            <Input type="date" value={fecha} onChange={e => setFecha(e.target.value)} className="w-36" />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Buscar número</label>
            <Input placeholder="Ej: 517, 17..." value={buscarNum} onChange={e => setBuscarNum(e.target.value)} className="w-40" />
          </div>
        </CardContent>
      </Card>

      {/* Resultados de búsqueda */}
      {buscarNum.trim() && (
        <Card className="border-indigo-200 bg-indigo-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-indigo-900">🔍 Resultados para "{buscarNum}" — {resultadosBusqueda.length} encontrados</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {resultadosBusqueda.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="bg-indigo-100/50 text-left text-xs text-indigo-800"><th className="p-3">Lotería</th><th className="p-3">Modalidad</th><th className="p-3">Número</th><th className="p-3">Monto jugado</th><th className="p-3">Apuestas</th></tr></thead>
                  <tbody>
                    {resultadosBusqueda.map((r, i) => (
                      <tr key={i} className="border-t border-indigo-100">
                        <td className="p-3">{r.loteria}</td>
                        <td className="p-3"><span className="px-2 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-700">{r.modalidad}</span></td>
                        <td className="p-3 font-bold text-lg">{r.numero}</td>
                        <td className="p-3 font-bold">{cop(r.monto)}</td>
                        <td className="p-3">{r.apuestas}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="p-4 text-sm text-indigo-400">No se encontró el número "{buscarNum}" en la fecha seleccionada.</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* KPIs en vivo */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="bg-blue-50 border-blue-200"><CardContent className="p-3"><p className="text-xs text-gray-500">VENTAS</p><p className="text-lg font-bold text-[#12355b]">{cop(totalesGlobales.ventas)}</p></CardContent></Card>
        <Card className="bg-green-50 border-green-200"><CardContent className="p-3"><p className="text-xs text-gray-500">JUGADAS</p><p className="text-lg font-bold text-green-700">{totalesGlobales.jugadas}</p></CardContent></Card>
        <Card className="bg-red-50 border-red-200"><CardContent className="p-3"><p className="text-xs text-gray-500">PREMIOS</p><p className="text-lg font-bold text-red-700">{cop(totalesGlobales.premios)}</p></CardContent></Card>
        <Card className="bg-emerald-50 border-emerald-200"><CardContent className="p-3"><p className="text-xs text-gray-500">TERMINALES OK</p><p className="text-lg font-bold text-emerald-700">{totalesGlobales.terminalesActivos}</p></CardContent></Card>
        <Card className={`border ${totalesGlobales.terminalesBloqueados > 0 ? 'bg-red-50 border-red-300' : 'bg-gray-50 border-gray-200'}`}><CardContent className="p-3"><p className="text-xs text-gray-500">BLOQUEADOS</p><p className={`text-lg font-bold ${totalesGlobales.terminalesBloqueados > 0 ? 'text-red-700' : 'text-gray-600'}`}>{totalesGlobales.terminalesBloqueados}</p></CardContent></Card>
      </div>

      {/* Alertas de cupo */}
      <AlertasCupo lotId={lotId} fecha={fecha} />

      {/* Secciones por modalidad */}
      {MODS.map(mod => (
        <SeccionModalidad key={mod.key} modalidad={mod.key} label={mod.label} loterias={loteriasFiltradas} fecha={fecha} />
      ))}
    </div>
  );
}

function AlertasCupo({ lotId, fecha }: { lotId: string; fecha: string }) {
  const alertas = lotId === 'all'
    ? store.loterias.flatMap(l => store.alertasCupo(l.id, fecha)).slice(0, 20)
    : store.alertasCupo(lotId, fecha);

  if (alertas.length === 0) return null;

  return (
    <Card className="border-amber-300 bg-amber-50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-amber-800">⚠️ Alertas de cupo ({alertas.length})</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="bg-amber-100/50 text-left text-xs text-amber-800"><th className="p-3">Lotería</th><th className="p-3">Modalidad</th><th className="p-3">Número</th><th className="p-3">Acumulado</th><th className="p-3">Límite</th><th className="p-3">%</th></tr></thead>
            <tbody>
              {alertas.map((c, i) => {
                const lote = store.loteById(c.loteriaId);
                const pct = Math.round(c.acumulado / c.limite * 100);
                return (
                  <tr key={i} className="border-t border-amber-200">
                    <td className="p-3">{lote?.nombre}</td>
                    <td className="p-3">{NOMJ[c.modalidad]}</td>
                    <td className="p-3 font-bold">{c.numero}</td>
                    <td className="p-3 font-bold">{cop(c.acumulado)}</td>
                    <td className="p-3">{cop(c.limite)}</td>
                    <td className="p-3"><span className={`font-bold ${pct >= 100 ? 'text-red-700' : 'text-amber-700'}`}>{pct}%</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function SeccionModalidad({ modalidad, label, loterias, fecha }: { modalidad: Modalidad; label: string; loterias: Loteria[]; fecha: string }) {
  const nums: Record<string, { numero: string; monto: number; jugadas: number; loteriaId: string; loteriaNombre: string }> = {};

  store.tickets.forEach(t => {
    if (t.estado === 'anulado' || t.fechaSorteo !== fecha) return;
    if (!loterias.some(l => l.id === t.loteriaId)) return;
    t.jugadas.forEach(j => {
      if (j.modalidad !== modalidad) return;
      const key = t.loteriaId + '|' + j.numero;
      if (!nums[key]) {
        nums[key] = { numero: j.numero, monto: 0, jugadas: 0, loteriaId: t.loteriaId, loteriaNombre: store.loteById(t.loteriaId)?.nombre || '?' };
      }
      nums[key].monto += j.monto;
      nums[key].jugadas += 1;
    });
  });

  const rows = Object.values(nums).sort((a, b) => b.monto - a.monto);
  const total = rows.reduce((s, r) => s + r.monto, 0);

  if (rows.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-[#12355b] flex justify-between items-center">
          <span>{label}</span>
          <span className="text-xs font-normal text-gray-500">Total: {cop(total)} · {rows.length} números</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 text-left text-xs text-gray-500"><th className="p-3">#</th><th className="p-3">Número</th><th className="p-3">Lotería</th><th className="p-3">Monto</th><th className="p-3">Apuestas</th><th className="p-3">Exposición</th></tr></thead>
            <tbody>
              {rows.slice(0, 30).map((r, i) => {
                const lote = store.loteById(r.loteriaId);
                const limite = lote?.maxNumero || store.config.maxNumero;
                const pct = Math.min(100, r.monto / limite * 100);
                return (
                  <tr key={i} className="border-t hover:bg-gray-50">
                    <td className="p-3 text-xs text-gray-400">{i + 1}</td>
                    <td className="p-3 font-bold text-base">{r.numero}</td>
                    <td className="p-3 text-xs">{r.loteriaNombre}</td>
                    <td className="p-3 font-bold">{cop(r.monto)}</td>
                    <td className="p-3 text-xs">{r.jugadas}</td>
                    <td className="p-3">
                      <div className="w-20 h-1.5 bg-gray-200 rounded overflow-hidden"><div className={`h-full ${pct >= 90 ? 'bg-red-600' : pct >= 60 ? 'bg-amber-500' : 'bg-green-600'}`} style={{ width: pct + '%' }} /></div>
                      <span className={`text-xs font-bold ${pct >= 100 ? 'text-red-600' : pct >= 90 ? 'text-amber-600' : 'text-green-600'}`}>{pct.toFixed(0)}%</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================
// 2. VENDEDORES
// ============================================================
function VendedoresTab({ onChange }: { onChange: () => void }) {
  const [nom, setNom] = useState('');
  const [tel, setTel] = useState('');
  const [ced, setCed] = useState('');
  const [com, setCom] = useState(10);

  const crear = () => {
    if (!nom.trim() || !ced.trim()) return alert('Nombre y cédula son obligatorios');
    store.vendedores.push({ id: uid(), nombre: nom.trim(), telefono: tel, cedula: ced.trim(), comisionPct: com, activo: true, fechaAlta: hoy(), notas: '' });
    store.save(); onChange(); setNom(''); setTel(''); setCed(''); setCom(10);
  };

  const eliminar = (id: string) => {
    if (!confirm('¿Eliminar vendedor?')) return;
    if (store.terminales.some(t => t.vendedorId === id)) { alert('No se puede eliminar: tiene terminales asignadas'); return; }
    store.vendedores = store.vendedores.filter(v => v.id !== id);
    store.save(); onChange();
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm text-[#12355b]">Nuevo vendedor</CardTitle></CardHeader>
        <CardContent className="flex gap-2 flex-wrap">
          <Input placeholder="Nombre completo" value={nom} onChange={e => setNom(e.target.value)} className="flex-1" />
          <Input placeholder="Cédula" value={ced} onChange={e => setCed(e.target.value)} className="w-36" />
          <Input placeholder="Teléfono" value={tel} onChange={e => setTel(e.target.value)} className="w-36" />
          <Input type="number" placeholder="% Comisión default" value={com} onChange={e => setCom(+e.target.value)} className="w-32" />
          <Button className="bg-[#0e7c4a]" onClick={crear}>Crear</Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm text-[#12355b]">Vendedores ({store.vendedores.length})</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="bg-gray-50 text-left text-xs text-gray-500"><th className="p-3">Nombre</th><th className="p-3">Cédula</th><th className="p-3">Teléfono</th><th className="p-3">Comisión default</th><th className="p-3">Estado</th><th className="p-3"></th></tr></thead>
              <tbody>
                {store.vendedores.map(v => (
                  <>
                    <tr key={v.id} className="border-t">
                      <td className="p-3">
                        <Input className="h-7 text-xs font-bold" value={v.nombre} onChange={e => { v.nombre = e.target.value; store.save(); onChange(); }} />
                      </td>
                      <td className="p-3">
                        <Input className="h-7 text-xs" value={v.cedula} onChange={e => { v.cedula = e.target.value; store.save(); onChange(); }} />
                      </td>
                      <td className="p-3">
                        <Input className="h-7 text-xs" value={v.telefono} onChange={e => { v.telefono = e.target.value; store.save(); onChange(); }} />
                      </td>
                      <td className="p-3">
                        <Input type="number" className="h-7 text-xs w-20" value={v.comisionPct} onChange={e => { v.comisionPct = +e.target.value; store.save(); onChange(); }} />
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${v.activo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{v.activo ? 'Activo' : 'Inactivo'}</span>
                      </td>
                      <td className="p-3">
                        <Button size="sm" variant="outline" className="mr-1" onClick={() => { v.activo = !v.activo; store.save(); onChange(); }}>{v.activo ? 'Desact.' : 'Activar'}</Button>
                        <Button size="sm" variant="ghost" className="text-red-600" onClick={() => eliminar(v.id)}>🗑️</Button>
                      </td>
                    </tr>
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================
// 3. TERMINALES
// ============================================================
function TerminalesTab({ onChange }: { onChange: () => void }) {
  const [cod, setCod] = useState('');
  const [nom, setNom] = useState('');
  const [ubi, setUbi] = useState('');
  const [venId, setVenId] = useState('');
  const [expandido, setExpandido] = useState<string | null>(null);

  const crear = () => {
    if (!nom.trim()) return;
    const id = 'T' + (store.terminales.length + 1);
    const c = cod.trim() || 'TQ-' + String(store.terminales.length + 1).padStart(3, '0');
    store.terminales.push({
      id, codigo: c, nombre: nom.trim(), ubicacion: ubi, vendedorId: venId,
      activo: true, bloqueado: false, motivoBloqueo: '', fondo: 0, saldo: 0,
      comisionLoterias: store.config.comisionDefault, comisionAnimalitos: store.config.comisionDefault, comisionZodiacales: store.config.comisionDefault,
      cuposPorLoteria: {}, fechaAlta: hoy()
    });
    store.save(); onChange(); setCod(''); setNom(''); setUbi(''); setVenId('');
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm text-[#12355b]">Nueva terminal</CardTitle></CardHeader>
        <CardContent className="flex gap-2 flex-wrap">
          <Input placeholder="Código (ej: TQ-001)" value={cod} onChange={e => setCod(e.target.value)} className="w-36" />
          <Input placeholder="Nombre" value={nom} onChange={e => setNom(e.target.value)} className="flex-1" />
          <Input placeholder="Ubicación" value={ubi} onChange={e => setUbi(e.target.value)} className="w-40" />
          <Select value={venId} onValueChange={setVenId}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Vendedor" /></SelectTrigger>
            <SelectContent>{store.vendedores.map(v => <SelectItem key={v.id} value={v.id}>{v.nombre}</SelectItem>)}</SelectContent>
          </Select>
          <Button className="bg-[#0e7c4a]" onClick={crear}>Crear</Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm text-[#12355b]">Terminales ({store.terminales.length})</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="bg-gray-50 text-left text-xs text-gray-500"><th className="p-3">Código</th><th className="p-3">Nombre</th><th className="p-3">Vendedor</th><th className="p-3">% Loterías</th><th className="p-3">% Animalitos</th><th className="p-3">% Zodiacales</th><th className="p-3">Saldo</th><th className="p-3">Estado</th><th className="p-3"></th></tr></thead>
              <tbody>
                {store.terminales.map(t => (
                    <>
                      <tr key={t.id} className="border-t">
                        <td className="p-3">
                          <Input className="w-24 h-7 text-xs font-bold" value={t.codigo} onChange={e => { t.codigo = e.target.value; store.save(); onChange(); }} />
                        </td>
                        <td className="p-3">
                          <Input className="h-7 text-xs font-bold mb-1" value={t.nombre} onChange={e => { t.nombre = e.target.value; store.save(); onChange(); }} />
                          <Input className="h-7 text-xs text-gray-400" value={t.ubicacion} onChange={e => { t.ubicacion = e.target.value; store.save(); onChange(); }} />
                        </td>
                        <td className="p-3">
                          <Select value={t.vendedorId} onValueChange={vid => { t.vendedorId = vid; store.save(); onChange(); }}>
                            <SelectTrigger className="w-36 h-7 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>{store.vendedores.map(v => <SelectItem key={v.id} value={v.id}>{v.nombre}</SelectItem>)}</SelectContent>
                          </Select>
                        </td>
                        <td className="p-3"><Input type="number" className="w-14 h-7 text-xs" value={t.comisionLoterias} onChange={e => { t.comisionLoterias = +e.target.value; store.save(); onChange(); }} /></td>
                        <td className="p-3"><Input type="number" className="w-14 h-7 text-xs" value={t.comisionAnimalitos} onChange={e => { t.comisionAnimalitos = +e.target.value; store.save(); onChange(); }} /></td>
                        <td className="p-3"><Input type="number" className="w-14 h-7 text-xs" value={t.comisionZodiacales} onChange={e => { t.comisionZodiacales = +e.target.value; store.save(); onChange(); }} /></td>
                        <td className={`p-3 font-bold ${t.saldo < 0 ? 'text-red-600' : 'text-green-600'}`}>{cop(t.saldo)}</td>
                        <td className="p-3">
                          <div className="flex flex-col gap-1">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold w-fit ${t.activo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{t.activo ? 'Activa' : 'Inactiva'}</span>
                            {t.bloqueado && <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700 w-fit">BLOQUEADA</span>}
                          </div>
                        </td>
                        <td className="p-3">
                          <Button size="sm" variant="outline" className="mr-1 text-xs" onClick={() => { t.activo = !t.activo; store.save(); onChange(); }}>{t.activo ? 'Off' : 'On'}</Button>
                          <Button size="sm" variant={t.bloqueado ? 'default' : 'destructive'} className="mr-1 text-xs" onClick={() => {
                            if (!t.bloqueado) {
                              const mot = prompt('Motivo de bloqueo:');
                              if (!mot) return;
                              t.bloqueado = true; t.motivoBloqueo = mot;
                              store.log('bloqueo', 'terminal', t.id, `Terminal ${t.codigo} bloqueada: ${mot}`, 'ADMIN');
                            } else {
                              t.bloqueado = false; t.motivoBloqueo = '';
                              store.log('desbloqueo', 'terminal', t.id, `Terminal ${t.codigo} desbloqueada`, 'ADMIN');
                            }
                            store.save(); onChange();
                          }}>{t.bloqueado ? 'Desbloq.' : 'Bloquear'}</Button>
                          <Button size="sm" variant="ghost" className="text-red-600 text-xs mr-1" onClick={() => {
                            if (store.tickets.some(tk => tk.terminalId === t.id)) return alert('No se puede eliminar: tiene tickets registrados');
                            if (!confirm(`¿Eliminar terminal ${t.codigo} permanentemente?`)) return;
                            store.terminales = store.terminales.filter(x => x.id !== t.id);
                            delete store.contadores[t.id];
                            store.save(); onChange();
                          }}>🗑️ Eliminar</Button>
                          <Button size="sm" variant="ghost" className="text-blue-600 text-xs" onClick={() => setExpandido(expandido === t.id ? null : t.id)}>{expandido === t.id ? '▲' : '▼'} Cupos</Button>
                        </td>
                      </tr>
                      {expandido === t.id && (
                        <tr key={t.id + '_exp'}>
                          <td colSpan={9} className="p-3 bg-gray-50">
                            <p className="text-xs font-bold text-gray-500 mb-2">Cupos de venta por lotería (0 = usar tope global {cop(store.config.maxNumero)})</p>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                              {store.loterias.filter(l => l.activa).map(l => (
                                <div key={l.id} className="bg-white border rounded px-2 py-1 flex items-center gap-2">
                                  <span className="text-xs flex-1">{l.nombre}</span>
                                  <Input type="number" className="w-20 h-7 text-xs" value={t.cuposPorLoteria[l.id] || 0} onChange={e => {
                                    const val = +e.target.value;
                                    if (val > 0) t.cuposPorLoteria[l.id] = val;
                                    else delete t.cuposPorLoteria[l.id];
                                    store.save(); onChange();
                                  }} />
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================
// 4. LOTERÍAS — 3 Grupos
// ============================================================
function LoteriasTab({ onChange }: { onChange: () => void }) {
  const [nom, setNom] = useState('');
  const [tipo, setTipo] = useState<'triple' | 'animalito' | 'zodiacal'>('triple');
  const [hora, setHora] = useState('');
  const [horaCierre, setHoraCierre] = useState('');
  const [turno, setTurno] = useState<Turno>('manana');

  const triples = store.loterias.filter(l => l.tipo === 'triple');
  const animalitos = store.loterias.filter(l => l.tipo === 'animalito');
  const zodiacales = store.loterias.filter(l => l.tipo === 'zodiacal');

  const crear = () => {
    if (!nom.trim()) return;
    let pagos: Record<Modalidad, number>;
    if (tipo === 'triple') pagos = { triple: 600, cuadrupla: 4000, terminal: 70, triple_zodiacal: 0, '4_zodiacal': 0, '2_zodiacal': 0 };
    else if (tipo === 'animalito') pagos = { triple: 0, cuadrupla: 0, terminal: 60, triple_zodiacal: 0, '4_zodiacal': 0, '2_zodiacal': 0 };
    else pagos = { triple: 0, cuadrupla: 0, terminal: 0, triple_zodiacal: 500, '4_zodiacal': 3500, '2_zodiacal': 60 };
    store.loterias.push({
      id: uid(), nombre: nom.trim(), tipo, turno, hora: hora || '—', horaCierre: horaCierre || '—', activa: true,
      pagos, minApuesta: store.config.minApuesta, maxNumero: store.config.maxNumero, topesTerminal: {}
    });
    store.save(); onChange(); setNom(''); setHora(''); setHoraCierre('');
  };

  const eliminar = (id: string) => {
    if (store.tickets.some(t => t.loteriaId === id)) return alert('Tiene tickets');
    store.loterias = store.loterias.filter(x => x.id !== id); store.save(); onChange();
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm text-[#12355b]">Configuración general</CardTitle></CardHeader>
        <CardContent className="flex gap-2 flex-wrap items-end">
          <div><label className="text-xs text-gray-500 block">Mín apuesta</label><Input type="number" className="w-28" value={store.config.minApuesta} onChange={e => { store.config.minApuesta = +e.target.value; store.save(); }} /></div>
          <div><label className="text-xs text-gray-500 block">Máx por número</label><Input type="number" className="w-28" value={store.config.maxNumero} onChange={e => { store.config.maxNumero = +e.target.value; store.save(); }} /></div>
          <div><label className="text-xs text-gray-500 block">Comisión default %</label><Input type="number" className="w-28" value={store.config.comisionDefault} onChange={e => { store.config.comisionDefault = +e.target.value; store.save(); }} /></div>
          <div><label className="text-xs text-gray-500 block">Alerta cupo %</label><Input type="number" className="w-28" value={store.config.alertaCupoPct} onChange={e => { store.config.alertaCupoPct = +e.target.value; store.save(); }} /></div>
          <Button variant="outline" onClick={() => { if (confirm('¿Restablecer datos de demo?')) { store.seed(); onChange(); } }}>Restablecer demo</Button>
        </CardContent>
      </Card>

      {/* COPIA DE SEGURIDAD */}
      <Card className="border-amber-200 bg-amber-50">
        <CardHeader className="pb-2"><CardTitle className="text-sm text-amber-800">💾 Copia de seguridad (sincronizar entre dispositivos)</CardTitle></CardHeader>
        <CardContent className="flex gap-2 flex-wrap items-end">
          <div className="flex-1">
            <p className="text-xs text-amber-700 mb-2">
              ⚠️ Los datos se guardan solo en este navegador. Para usar en otro celular/PC, exportá el archivo y cargalo en el otro dispositivo.
            </p>
            <div className="flex gap-2">
              <Button className="bg-[#12355b]" onClick={() => {
                const data = {
                  config: store.config,
                  terminales: store.terminales,
                  vendedores: store.vendedores,
                  loterias: store.loterias,
                  sorteos: store.sorteos,
                  tickets: store.tickets,
                  estadosCuenta: store.estadosCuenta,
                  cupos: store.cupos,
                  logs: store.logs,
                  contadores: store.contadores,
                  seed: true
                };
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `banca_backup_${hoy()}.json`;
                a.click();
                URL.revokeObjectURL(url);
              }}>📥 Exportar datos</Button>
              <label className="cursor-pointer">
                <input type="file" accept=".json" className="hidden" onChange={e => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = ev => {
                    try {
                      const data = JSON.parse(ev.target?.result as string);
                      if (!data.terminales || !data.loterias) throw new Error('Archivo inválido');
                      if (!confirm(`¿Reemplazar todos los datos con los del archivo?\n\nTaquillas: ${data.terminales?.length || 0}\nLoterías: ${data.loterias?.length || 0}\nTickets: ${data.tickets?.length || 0}`)) return;
                      localStorage.setItem('banca_global_config', JSON.stringify(data.config || {}));
                      localStorage.setItem('banca_global_terminales', JSON.stringify(data.terminales || []));
                      localStorage.setItem('banca_global_vendedores', JSON.stringify(data.vendedores || []));
                      localStorage.setItem('banca_global_loterias', JSON.stringify(data.loterias || []));
                      localStorage.setItem('banca_global_sorteos', JSON.stringify(data.sorteos || []));
                      localStorage.setItem('banca_global_tickets', JSON.stringify(data.tickets || []));
                      localStorage.setItem('banca_global_estadosCuenta', JSON.stringify(data.estadosCuenta || []));
                      localStorage.setItem('banca_global_cupos', JSON.stringify(data.cupos || []));
                      localStorage.setItem('banca_global_logs', JSON.stringify(data.logs || []));
                      localStorage.setItem('banca_global_contadores', JSON.stringify(data.contadores || {}));
                      localStorage.setItem('banca_global_seed', '1');
                      alert('Datos importados correctamente. La página se recargará.');
                      window.location.reload();
                    } catch (err) {
                      alert('Error al importar: ' + (err as Error).message);
                    }
                  };
                  reader.readAsText(file);
                }} />
                <Button variant="outline" className="border-amber-400 text-amber-800">📤 Importar datos</Button>
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm text-[#12355b]">Registrar lotería</CardTitle></CardHeader>
        <CardContent className="flex gap-2 flex-wrap items-end">
          <Input placeholder="Nombre" value={nom} onChange={e => setNom(e.target.value)} className="flex-1" />
          <Select value={tipo} onValueChange={(v) => setTipo(v as typeof tipo)}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="triple">🎯 Triples</SelectItem>
              <SelectItem value="animalito">🐎 Animalitos</SelectItem>
              <SelectItem value="zodiacal">♈ Zodiacales</SelectItem>
            </SelectContent>
          </Select>
          <Select value={turno} onValueChange={(v) => setTurno(v as Turno)}>
            <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="manana">Mañana</SelectItem>
              <SelectItem value="tarde">Tarde</SelectItem>
              <SelectItem value="noche">Noche</SelectItem>
            </SelectContent>
          </Select>
          <Input placeholder="Hora sorteo" value={hora} onChange={e => setHora(e.target.value)} className="w-32" />
          <Input placeholder="Hora cierre" value={horaCierre} onChange={e => setHoraCierre(e.target.value)} className="w-32" />
          <Button className="bg-[#0e7c4a]" onClick={crear}>Agregar</Button>
        </CardContent>
      </Card>

      {/* === TRIPLES === */}
      <Card>
        <CardHeader className="pb-2 bg-blue-50"><CardTitle className="text-sm text-[#12355b]">🎯 Loterías Triples ({triples.length}) — 3 cifras + Terminales</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="bg-gray-50 text-left text-xs text-gray-500"><th className="p-3">Lotería</th><th className="p-3">Turno</th><th className="p-3">Triple</th><th className="p-3">Terminal</th><th className="p-3">4 Cifras</th><th className="p-3">Min/Max</th><th className="p-3">Activa</th><th className="p-3"></th></tr></thead>
              <tbody>
                {triples.map(l => (
                  <tr key={l.id} className="border-t">
                    <td className="p-3"><b>{l.nombre}</b><br /><span className="text-xs text-gray-400">{l.hora} · Cierra {l.horaCierre}</span></td>
                    <td className="p-3"><span className="px-2 py-0.5 rounded-full text-xs font-bold bg-gray-100">{NOMT[l.turno]}</span></td>
                    <td className="p-3"><Input type="number" className="w-16 h-7 text-xs" value={l.pagos.triple} onChange={e => { l.pagos.triple = +e.target.value; store.save(); onChange(); }} /></td>
                    <td className="p-3"><Input type="number" className="w-16 h-7 text-xs" value={l.pagos.terminal} onChange={e => { l.pagos.terminal = +e.target.value; store.save(); onChange(); }} /></td>
                    <td className="p-3"><Input type="number" className="w-16 h-7 text-xs" value={l.pagos.cuadrupla} onChange={e => { l.pagos.cuadrupla = +e.target.value; store.save(); onChange(); }} /></td>
                    <td className="p-3">
                      <Input className="w-16 h-7 text-xs mb-1" value={l.minApuesta} onChange={e => { l.minApuesta = +e.target.value; store.save(); }} />
                      <Input className="w-16 h-7 text-xs" value={l.maxNumero} onChange={e => { l.maxNumero = +e.target.value; store.save(); }} />
                    </td>
                    <td className="p-3"><Switch checked={l.activa} onCheckedChange={v => { l.activa = v; store.save(); onChange(); }} /></td>
                    <td className="p-3"><Button size="sm" variant="ghost" className="text-red-600" onClick={() => eliminar(l.id)}>✕</Button></td>
                  </tr>
                ))}
                {triples.length === 0 && <tr><td colSpan={8} className="p-3 text-gray-400 text-center">Sin loterías triples</td></tr>}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* === ANIMALITOS === */}
      <Card>
        <CardHeader className="pb-2 bg-green-50"><CardTitle className="text-sm text-[#12355b]">🐎 Loterías Animalitos ({animalitos.length}) — Solo Terminales</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="bg-gray-50 text-left text-xs text-gray-500"><th className="p-3">Lotería</th><th className="p-3">Turno</th><th className="p-3">Terminal</th><th className="p-3">Min/Max</th><th className="p-3">Activa</th><th className="p-3"></th></tr></thead>
              <tbody>
                {animalitos.map(l => (
                  <tr key={l.id} className="border-t">
                    <td className="p-3"><b>{l.nombre}</b><br /><span className="text-xs text-gray-400">{l.hora} · Cierra {l.horaCierre}</span></td>
                    <td className="p-3"><span className="px-2 py-0.5 rounded-full text-xs font-bold bg-gray-100">{NOMT[l.turno]}</span></td>
                    <td className="p-3"><Input type="number" className="w-16 h-7 text-xs" value={l.pagos.terminal} onChange={e => { l.pagos.terminal = +e.target.value; store.save(); onChange(); }} /></td>
                    <td className="p-3">
                      <Input className="w-16 h-7 text-xs mb-1" value={l.minApuesta} onChange={e => { l.minApuesta = +e.target.value; store.save(); }} />
                      <Input className="w-16 h-7 text-xs" value={l.maxNumero} onChange={e => { l.maxNumero = +e.target.value; store.save(); }} />
                    </td>
                    <td className="p-3"><Switch checked={l.activa} onCheckedChange={v => { l.activa = v; store.save(); onChange(); }} /></td>
                    <td className="p-3"><Button size="sm" variant="ghost" className="text-red-600" onClick={() => eliminar(l.id)}>✕</Button></td>
                  </tr>
                ))}
                {animalitos.length === 0 && <tr><td colSpan={6} className="p-3 text-gray-400 text-center">Sin loterías animalitos</td></tr>}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* === ZODIACALES === */}
      <Card>
        <CardHeader className="pb-2 bg-purple-50"><CardTitle className="text-sm text-[#12355b]">♈ Loterías Zodiacales ({zodiacales.length}) — 4Zod / 3Zod / 2Zod</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="bg-gray-50 text-left text-xs text-gray-500"><th className="p-3">Lotería</th><th className="p-3">Turno</th><th className="p-3">4 Zod.</th><th className="p-3">3 Zod.</th><th className="p-3">2 Zod.</th><th className="p-3">Min/Max</th><th className="p-3">Activa</th><th className="p-3"></th></tr></thead>
              <tbody>
                {zodiacales.map(l => (
                  <tr key={l.id} className="border-t">
                    <td className="p-3"><b>{l.nombre}</b><br /><span className="text-xs text-gray-400">{l.hora} · Cierra {l.horaCierre}</span></td>
                    <td className="p-3"><span className="px-2 py-0.5 rounded-full text-xs font-bold bg-gray-100">{NOMT[l.turno]}</span></td>
                    <td className="p-3"><Input type="number" className="w-16 h-7 text-xs" value={l.pagos['4_zodiacal']} onChange={e => { l.pagos['4_zodiacal'] = +e.target.value; store.save(); onChange(); }} /></td>
                    <td className="p-3"><Input type="number" className="w-16 h-7 text-xs" value={l.pagos.triple_zodiacal} onChange={e => { l.pagos.triple_zodiacal = +e.target.value; store.save(); onChange(); }} /></td>
                    <td className="p-3"><Input type="number" className="w-16 h-7 text-xs" value={l.pagos['2_zodiacal']} onChange={e => { l.pagos['2_zodiacal'] = +e.target.value; store.save(); onChange(); }} /></td>
                    <td className="p-3">
                      <Input className="w-16 h-7 text-xs mb-1" value={l.minApuesta} onChange={e => { l.minApuesta = +e.target.value; store.save(); }} />
                      <Input className="w-16 h-7 text-xs" value={l.maxNumero} onChange={e => { l.maxNumero = +e.target.value; store.save(); }} />
                    </td>
                    <td className="p-3"><Switch checked={l.activa} onCheckedChange={v => { l.activa = v; store.save(); onChange(); }} /></td>
                    <td className="p-3"><Button size="sm" variant="ghost" className="text-red-600" onClick={() => eliminar(l.id)}>✕</Button></td>
                  </tr>
                ))}
                {zodiacales.length === 0 && <tr><td colSpan={8} className="p-3 text-gray-400 text-center">Sin loterías zodiacales</td></tr>}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================
// 5. VENTAS / TICKETS
// ============================================================
function VentasTab({ onTicket }: { onTicket: (v: Ticket) => void }) {
  const [fLot, setFLot] = useState('all');
  const [fTerm, setFTerm] = useState('all');
  const [fFec, setFFec] = useState('');
  const [fEst, setFEst] = useState<'' | 'valido' | 'anulado' | 'pagado'>('');

  const vs = store.tickets
    .filter(t => (fLot === 'all' || t.loteriaId === fLot)
      && (fTerm === 'all' || t.terminalId === fTerm)
      && (!fFec || t.fechaSorteo === fFec)
      && (!fEst || t.estado === fEst))
    .sort((a, b) => b.ts - a.ts);

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-3 flex gap-2 flex-wrap">
          <Select value={fLot} onValueChange={setFLot}><SelectTrigger className="w-44"><SelectValue /></SelectTrigger><SelectContent>{store.loterias.map(l => <SelectItem key={l.id} value={l.id}>{l.nombre}</SelectItem>)}<SelectItem value="all">Todas</SelectItem></SelectContent></Select>
          <Select value={fTerm} onValueChange={setFTerm}><SelectTrigger className="w-44"><SelectValue /></SelectTrigger><SelectContent>{store.terminales.map(t => <SelectItem key={t.id} value={t.id}>{t.codigo}</SelectItem>)}<SelectItem value="all">Todas</SelectItem></SelectContent></Select>
          <Input type="date" value={fFec} onChange={e => setFFec(e.target.value)} className="w-36" />
          <Select value={fEst} onValueChange={(v) => setFEst(v as any)}>
            <SelectTrigger className="w-36"><SelectValue placeholder="Estado" /></SelectTrigger>
            <SelectContent><SelectItem value="all">Todos</SelectItem><SelectItem value="valido">Válido</SelectItem><SelectItem value="anulado">Anulado</SelectItem><SelectItem value="pagado">Pagado</SelectItem></SelectContent>
          </Select>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm text-[#12355b]">Tickets ({vs.length})</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="bg-gray-50 text-left text-xs text-gray-500"><th className="p-3">#Ticket</th><th className="p-3">Fecha</th><th className="p-3">Terminal</th><th className="p-3">Lotería</th><th className="p-3">Jugadas</th><th className="p-3">Total</th><th className="p-3">Premio</th><th className="p-3">Estado</th></tr></thead>
              <tbody>
                {vs.map(t => {
                  const l = store.loteById(t.loteriaId);
                  const p = store.premioTicket(t);
                  return (
                    <tr key={t.id} className="border-t cursor-pointer hover:bg-gray-50" onClick={() => onTicket(t)}>
                      <td className="p-3 font-bold">#{t.numero}</td>
                      <td className="p-3 text-xs">{new Date(t.ts).toLocaleString('es-VE')}</td>
                      <td className="p-3">{store.terminalById(t.terminalId)?.codigo}</td>
                      <td className="p-3">{l?.nombre}<br /><span className="text-xs text-gray-400">{t.fechaSorteo}</span></td>
                      <td className="p-3">{t.jugadas.map(j => <span key={j.numero + j.modalidad} className="inline-block bg-gray-100 px-1.5 py-0.5 rounded text-xs mr-1">{j.numero} {NOMJ[j.modalidad]}</span>)}</td>
                      <td className="p-3 font-bold">{cop(t.total)}</td>
                      <td className={`p-3 ${p > 0 ? 'text-green-600 font-bold' : ''}`}>{p > 0 ? cop(p) + ' 🏆' : '—'}</td>
                      <td className="p-3">
                        {t.estado === 'valido' && <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-700">Válido</span>}
                        {t.estado === 'anulado' && <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700">Anulado</span>}
                        {t.estado === 'pagado' && <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700">Pagado</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================
// 6. PREMIAR
// ============================================================
function PremiarTab({ onChange }: { onChange: () => void }) {
  const [lot, setLot] = useState(store.loterias[0]?.id || '');
  const [fec, setFec] = useState(hoy());
  const [num, setNum] = useState('');

  const guardar = () => {
    const n = num.replace(/\D/g, '').padStart(4, '0');
    if (n.length !== 4) { alert('El número debe tener 4 cifras'); return; }
    const sid = lot + '_' + fec;
    const existente = store.sorteos.find(s => s.id === sid);
    if (existente) {
      existente.resultado = { num: n, tipo: 'cuadrupla', ts: Date.now() };
      existente.estado = 'premiado';
    } else {
      store.sorteos.push({ id: sid, loteriaId: lot, fecha: fec, estado: 'premiado', resultado: { num: n, tipo: 'cuadrupla', ts: Date.now() } });
    }
    store.log('config', 'sorteo', sid, `Resultado cargado: ${n}`, 'ADMIN');
    store.save(); onChange(); setNum('');
    alert('Resultado cargado. Los premios se calcularán automáticamente.');
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm text-[#12355b]">Cargar resultado</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2 flex-wrap items-end">
            <Select value={lot} onValueChange={setLot}><SelectTrigger className="w-56"><SelectValue /></SelectTrigger><SelectContent>{store.loterias.map(l => <SelectItem key={l.id} value={l.id}>{l.nombre}</SelectItem>)}</SelectContent></Select>
            <Input type="date" value={fec} onChange={e => setFec(e.target.value)} className="w-36" />
            <Input inputMode="numeric" maxLength={4} value={num} onChange={e => setNum(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="Ej: 8721" className="w-28" />
            <Button className="bg-[#0e7c4a]" onClick={guardar}>Premiar</Button>
          </div>
          <p className="text-xs text-gray-500">Ingresá las 4 cifras del resultado. El sistema calculará automáticamente cuádruplas, triples y terminales.</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm text-[#12355b]">Resultados cargados</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="bg-gray-50 text-left text-xs text-gray-500"><th className="p-3">Lotería</th><th className="p-3">Fecha</th><th className="p-3">Resultado</th><th className="p-3"></th></tr></thead>
              <tbody>
                {store.sorteos.sort((a, b) => b.id.localeCompare(a.id)).map(s => {
                  const l = store.loteById(s.loteriaId);
                  return (
                    <tr key={s.id} className="border-t">
                      <td className="p-3">{l?.nombre}</td>
                      <td className="p-3">{s.fecha}</td>
                      <td className="p-3 font-bold text-lg tracking-wider">{s.resultado?.num || '—'}</td>
                      <td className="p-3"><Button size="sm" variant="ghost" className="text-red-600" onClick={() => { if (confirm('¿Eliminar?')) { store.sorteos = store.sorteos.filter(x => x.id !== s.id); store.save(); onChange(); } }}>✕</Button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================
// 7. CUADRE AUTOMÁTICO
// ============================================================
function CuadreTab() {
  const [termId, setTermId] = useState(store.terminales[0]?.id || '');
  const [f1, setF1] = useState(hoy());
  const [f2, setF2] = useState(hoy());
  const [calc, setCalc] = useState<ReturnType<typeof store.calcCuadre> | null>(null);
  const [montoEntregado, setMontoEntregado] = useState(0);

  const calcular = () => {
    if (!f1 || !f2 || f1 > f2) { alert('Revisa fechas'); return; }
    const c = store.calcCuadre(termId, f1, f2);
    setCalc(c);
    setMontoEntregado(c.neto > 0 ? Math.round(c.neto) : 0);
  };

  const cerrar = () => {
    if (!calc) return;
    if (!confirm(`¿Cerrar caja de ${store.terminalById(termId)?.codigo}?\nVendido: ${cop(calc.ventas)}\nPremios: ${cop(calc.premios)}\nNeto a entregar: ${cop(calc.neto)}\nEntregado: ${cop(montoEntregado)}`)) return;
    store.cerrarCaja(termId, f1, f2, montoEntregado, 'ADMIN');
    setCalc(null);
    alert('Caja cerrada correctamente');
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm text-[#12355b]">Generar cuadre</CardTitle></CardHeader>
        <CardContent className="flex gap-2 flex-wrap items-end">
          <Select value={termId} onValueChange={setTermId}>
            <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
            <SelectContent>{store.terminales.map(t => {
              const v = store.vendedorById(t.vendedorId);
              return <SelectItem key={t.id} value={t.id}>{t.codigo} — {v?.nombre || t.nombre}</SelectItem>;
            })}</SelectContent>
          </Select>
          <Input type="date" value={f1} onChange={e => setF1(e.target.value)} className="w-36" />
          <Input type="date" value={f2} onChange={e => setF2(e.target.value)} className="w-36" />
          <Button className="bg-[#12355b]" onClick={calcular}>Calcular</Button>
        </CardContent>
      </Card>

      {calc && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <Card className="bg-blue-50 border-blue-200"><CardContent className="p-3"><p className="text-xs text-gray-500">VENTAS</p><p className="text-lg font-bold text-[#12355b]">{cop(calc.ventas)}</p></CardContent></Card>
            <Card className="bg-red-50 border-red-200"><CardContent className="p-3"><p className="text-xs text-gray-500">PREMIOS</p><p className="text-lg font-bold text-red-700">{cop(calc.premios)}</p></CardContent></Card>
            <Card className="bg-gray-50 border-gray-200"><CardContent className="p-3"><p className="text-xs text-gray-500">RESULTADO</p><p className={`text-lg font-bold ${calc.resultado < 0 ? 'text-red-600' : 'text-green-600'}`}>{cop(calc.resultado)}</p></CardContent></Card>
            <Card className="bg-purple-50 border-purple-200"><CardContent className="p-3"><p className="text-xs text-gray-500">COMISIÓN</p><p className="text-lg font-bold text-purple-700">{cop(calc.comision)}</p></CardContent></Card>
            <Card className="bg-gray-50 border-gray-200"><CardContent className="p-3"><p className="text-xs text-gray-500">SALDO ANT.</p><p className={`text-lg font-bold ${calc.saldoAnt < 0 ? 'text-red-600' : ''}`}>{cop(calc.saldoAnt)}</p></CardContent></Card>
            <Card className="bg-green-50 border-green-200"><CardContent className="p-3"><p className="text-xs text-gray-500">NETO A ENTREGAR</p><p className={`text-xl font-bold ${calc.neto < 0 ? 'text-red-600' : 'text-green-600'}`}>{calc.neto < 0 ? 'Pierde ' + cop(Math.abs(calc.neto)) : cop(calc.neto)}</p></CardContent></Card>
          </div>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-[#12355b]">Cerrar caja</CardTitle></CardHeader>
            <CardContent className="flex gap-2 flex-wrap items-end">
              <div>
                <label className="text-xs text-gray-500 block">Monto realmente entregado</label>
                <Input type="number" value={montoEntregado} onChange={e => setMontoEntregado(+e.target.value)} className="w-48" />
              </div>
              <div className="text-sm">
                <p className={`font-bold ${calc.neto - montoEntregado > 0 ? 'text-red-600' : calc.neto - montoEntregado < 0 ? 'text-green-600' : 'text-gray-600'}`}>
                  Diferencia: {cop(calc.neto - montoEntregado)} {calc.neto - montoEntregado > 0 ? '(FALTANTE)' : calc.neto - montoEntregado < 0 ? '(SOBRANTE)' : ''}
                </p>
              </div>
              <Button className="bg-[#12355b]" onClick={cerrar}>🔒 Cerrar caja</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-[#12355b]">Tickets ganadores ({calc.det.length})</CardTitle></CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="bg-gray-50 text-left text-xs text-gray-500"><th className="p-3">#Ticket</th><th className="p-3">Fecha sorteo</th><th className="p-3">Lotería</th><th className="p-3">Jugadas</th><th className="p-3">Apostado</th><th className="p-3">Premio</th></tr></thead>
                  <tbody>
                    {calc.det.map((d, i) => {
                      const l = store.loteById(d.t.loteriaId);
                      return (
                        <tr key={i} className="border-t">
                          <td className="p-3 font-bold">#{d.t.numero}</td>
                          <td className="p-3">{d.t.fechaSorteo}</td>
                          <td className="p-3">{l?.nombre}</td>
                          <td className="p-3">{d.t.jugadas.map(j => <span key={j.numero + j.modalidad} className="inline-block bg-gray-100 px-1.5 py-0.5 rounded text-xs mr-1">{j.numero} ({NOMJ[j.modalidad]})</span>)}</td>
                          <td className="p-3">{cop(d.t.total)}</td>
                          <td className="p-3 text-green-600 font-bold">{cop(d.premio)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {calc.anulados.length > 0 && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-[#12355b]">Tickets anulados ({calc.anulados.length})</CardTitle></CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="bg-gray-50 text-left text-xs text-gray-500"><th className="p-3">#Ticket</th><th className="p-3">Fecha</th><th className="p-3">Total</th><th className="p-3">Motivo</th></tr></thead>
                    <tbody>
                      {calc.anulados.map((t, i) => (
                        <tr key={i} className="border-t">
                          <td className="p-3 font-bold">#{t.numero}</td>
                          <td className="p-3">{new Date(t.anuladoTs || 0).toLocaleString('es-VE')}</td>
                          <td className="p-3">{cop(t.total)}</td>
                          <td className="p-3 text-red-600">{t.motivoAnulacion}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm text-[#12355b]">Histórico de estados de cuenta</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="bg-gray-50 text-left text-xs text-gray-500"><th className="p-3">Fecha cierre</th><th className="p-3">Terminal</th><th className="p-3">Período</th><th className="p-3">Ventas</th><th className="p-3">Premios</th><th className="p-3">Comisión</th><th className="p-3">Neto</th><th className="p-3">Entregado</th><th className="p-3">Diferencia</th></tr></thead>
              <tbody>
                {store.estadosCuenta.slice().reverse().map((ec, i) => {
                  const t = store.terminalById(ec.terminalId);
                  return (
                    <tr key={i} className="border-t">
                      <td className="p-3 text-xs">{ec.tsCierre ? new Date(ec.tsCierre).toLocaleString('es-VE') : '—'}</td>
                      <td className="p-3">{t?.codigo}</td>
                      <td className="p-3">{ec.fechaDesde} → {ec.fechaHasta}</td>
                      <td className="p-3">{cop(ec.totalVendido)}</td>
                      <td className="p-3">{cop(ec.totalPremios)}</td>
                      <td className="p-3">{cop(ec.comision)}</td>
                      <td className="p-3 font-bold">{cop(ec.netoEntregar)}</td>
                      <td className="p-3">{cop(ec.montoEntregado)}</td>
                      <td className={`p-3 font-bold ${ec.diferencia > 0 ? 'text-red-600' : ec.diferencia < 0 ? 'text-green-600' : 'text-gray-600'}`}>{cop(ec.diferencia)}</td>
                    </tr>
                  );
                })}
                {store.estadosCuenta.length === 0 && <tr><td colSpan={9} className="p-3 text-gray-400 text-center">Sin cortes</td></tr>}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================
// 8. AUDITORÍA
// ============================================================
function AuditoriaTab() {
  const [fAcc, setFAcc] = useState('');
  const logs = store.logs
    .filter(l => !fAcc || l.accion === fAcc)
    .slice(0, 200);

  const acciones = ['venta', 'anulacion', 'pago_premio', 'cierre_caja', 'config', 'login', 'logout', 'bloqueo', 'desbloqueo'];

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-3">
          <Select value={fAcc} onValueChange={setFAcc}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Filtrar por acción" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todas</SelectItem>
              {acciones.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm text-[#12355b]">Log de auditoría ({logs.length} registros)</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="bg-gray-50 text-left text-xs text-gray-500"><th className="p-3">Fecha</th><th className="p-3">Usuario</th><th className="p-3">Acción</th><th className="p-3">Entidad</th><th className="p-3">Detalle</th></tr></thead>
              <tbody>
                {logs.map(l => (
                  <tr key={l.id} className="border-t">
                    <td className="p-3 text-xs">{new Date(l.ts).toLocaleString('es-VE')}</td>
                    <td className="p-3 font-bold">{l.usuario}</td>
                    <td className="p-3"><span className="px-2 py-0.5 rounded-full text-xs font-bold bg-gray-100">{l.accion}</span></td>
                    <td className="p-3">{l.entidad}</td>
                    <td className="p-3 text-xs max-w-xs truncate">{l.detalle}</td>
                  </tr>
                ))}
                {logs.length === 0 && <tr><td colSpan={5} className="p-3 text-gray-400 text-center">Sin registros</td></tr>}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================
// 9. NUBE (Firebase)
// ============================================================
function NubeTab() {
  const [configTxt, setConfigTxt] = useState(() => {
    const c = localStorage.getItem('banca_firebase_config');
    return c ? JSON.stringify(JSON.parse(c), null, 2) : '';
  });
  const [status, setStatus] = useState('');

  const guardar = () => {
    try {
      let raw = configTxt;
      raw = raw.replace(/\u00A0/g, ' ').replace(/\u200B/g, '').replace(/\u200C/g, '').replace(/\u200D/g, '').replace(/\uFEFF/g, '').replace(/\r/g, '\n');
      let start = raw.indexOf('firebaseConfig') !== -1 ? raw.indexOf('{', raw.indexOf('firebaseConfig')) : raw.indexOf('{');
      if (start === -1) { setStatus('Error: No se encontró {'); return; }
      let depth = 0, end = -1;
      for (let i = start; i < raw.length; i++) {
        if (raw[i] === '{') depth++;
        if (raw[i] === '}') { depth--; if (depth === 0) { end = i; break; } }
      }
      if (end === -1) { setStatus('Error: No se encontró cierre }'); return; }
      let objStr = raw.substring(start, end + 1);
      objStr = objStr.replace(/\/\*[\s\S]*?\*\//g, '');
      objStr = objStr.replace(/[\u201C\u201D]/g, '"').replace(/[\u2018\u2019]/g, "'");
      objStr = objStr.replace(/([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g, '$1"$2":');
      objStr = objStr.replace(/,\s*([}\]])/g, '$1');
      objStr = objStr.replace(/\n+/g, ' ').replace(/\s+/g, ' ');
      const cfg = JSON.parse(objStr);
      if (!cfg.apiKey || !cfg.databaseURL) { setStatus('Error: Faltan apiKey o databaseURL'); return; }
      localStorage.setItem('banca_firebase_config', JSON.stringify(cfg));
      setStatus('Configuración guardada. Recarga la página.');
    } catch (e: any) { setStatus('Error: ' + (e?.message || 'desconocido')); }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm text-[#12355b]">Configuración Firebase</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <textarea className="w-full h-40 p-3 border rounded-lg text-xs font-mono bg-gray-50" value={configTxt} onChange={e => setConfigTxt(e.target.value)} />
          <div className="flex gap-2">
            <Button className="bg-[#0e7c4a]" onClick={guardar}>Guardar</Button>
            <Button variant="outline" onClick={() => { localStorage.removeItem('banca_firebase_config'); setConfigTxt(''); setStatus('Desconectado'); }}>Desconectar</Button>
          </div>
          {status && <p className="text-sm text-blue-600">{status}</p>}
        </CardContent>
      </Card>
    </div>
  );
}
