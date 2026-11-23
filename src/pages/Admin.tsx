import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { store, hoy, uid, cop, NOMJ, NOMT } from '@/store';
import type { Ticket, Jugada, Loteria, Modalidad } from '@/types';

const TIPOS_LOTERIA = [
  { key: 'triple' as const, label: 'Triples (3 cifras)' },
  { key: 'cuadrupla', label: '4 Cifras' },
  { key: 'terminal', label: 'Terminales' },
  { key: 'triple_zodiacal', label: 'Triple Zodiacal' },
  { key: '4_zodiacal', label: '4 Zodiacal' },
  { key: '2_zodiacal', label: '2 Zodiacal' },
];

const ModalidadesAdmin = [
  { key: 'triple' as Modalidad, label: 'Triples (3 cifras)' },
  { key: 'cuadrupla' as Modalidad, label: '4 Cifras' },
  { key: 'terminal' as Modalidad, label: 'Terminales' },
  { key: 'triple_zodiacal' as Modalidad, label: 'Triple Zodiacal' },
  { key: '4_zodiacal' as Modalidad, label: '4 Zodiacal' },
  { key: '2_zodiacal' as Modalidad, label: '2 Zodiacal' },
];

export default function Admin({ onLogout }: { onLogout: () => void }) {
  const [tab, setTab] = useState<'monitoreo' | 'vendedores' | 'terminales' | 'loterias' | 'ventas' | 'premiar' | 'cuadre' | 'auditoria' | 'nube'>('monitoreo');
  const [tick, setTick] = useState(0);
  const force = () => setTick(t => t + 1);

  useEffect(() => {
    const iv = setInterval(() => {
      const event = new StorageEvent('storage', { key: 'banca_global_seed' });
      window.dispatchEvent(event);
    }, 5000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    const handler = () => force();
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  useEffect(() => {
    const handler = () => force();
    window.addEventListener('banca-sync', handler);
    return () => window.removeEventListener('banca-sync', handler);
  }, []);

  useEffect(() => {
    if (tab !== 'monitoreo') return;
    const iv = setInterval(force, 5000);
    return () => clearInterval(iv);
  }, [tab]);

  const [ticketModal, setTicketModal] = useState<Ticket | null>(null);

  const h = hoy();

  const resumen = store.loterias.map(l => {
    const fecha = store.sorteos.find(s => s.loteriaId === l.id && s.fecha === h)?.fecha || h;
    const ventas = store.tickets.filter(t => t.loteriaId === l.id && t.fechaSorteo === fecha && t.estado !== 'anulado').reduce((s, t) => s + t.total, 0);
    const premios = store.tickets.filter(t => t.loteriaId === l.id && t.fechaSorteo === fecha && t.estado === 'pagado').reduce((s, t) => s + (t.montoPremio || 0), 0);
    const alertas = store.alertasCupo(l.id, fecha);
    return { loteria: l, ventas, premios, alertas };
  });

  const totalesGlobales = { ventas: 0, jugadas: 0, premios: 0, terminalesActivos: 0, terminalesBloqueados: 0 };
  store.terminales.forEach(t => {
    if (t.activo) totalesGlobales.terminalesActivos++;
    if (t.bloqueado) totalesGlobales.terminalesBloqueados++;
  });

  return (
    <div className="min-h-screen bg-[#f4f6f9]">
      <header className="bg-[#12355b] text-white px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="font-bold text-lg">BANCA MANAGER</h1>
          <p className="text-xs opacity-80">Panel Administrativo · {new Date().toLocaleString('es-VE', { timeZone: 'America/Caracas' })}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={onLogout} className="text-white hover:bg-white/20">Salir</Button>
      </header>

      <nav className="flex border-b bg-white overflow-x-auto">
        {[
          { key: 'monitoreo' as const, l: '📊 Monitoreo' },
          { key: 'vendedores' as const, l: '👤 Vendedores' },
          { key: 'terminales' as const, l: '🖥️ Terminales' },
          { key: 'loterias' as const, l: '🏆 Loterías' },
          { key: 'ventas' as const, l: '🎫 Ventas' },
          { key: 'premiar' as const, l: '🎯 Premiar' },
          { key: 'cuadre' as const, l: '📈 Cuadre' },
          { key: 'auditoria' as const, l: '📝 Auditoría' },
          { key: 'nube' as const, l: '☁️ Nube' },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`px-4 py-3 text-sm font-medium whitespace-nowrap ${tab === t.key ? 'text-[#12355b] border-b-2 border-[#12355b]' : 'text-gray-500'}`}>{t.l}</button>
        ))}
      </nav>

      <main className="mx-auto p-4 pb-20 max-w-7xl">
        {tab === 'monitoreo' && <MonitoreoTab key={tick} />}
        {tab === 'vendedores' && <VendedoresTab onChange={force} />}
        {tab === 'terminales' && <TerminalesTab onChange={force} />}
        {tab === 'loterias' && <LoteriasTab onChange={force} />}
        {tab === 'ventas' && <VentasTab key={tick} onTicket={setTicketModal} />}
        {tab === 'premiar' && <PremiarTab key={tick} onChange={force} />}
        {tab === 'cuadre' && <CuadreTab key={tick} />}
        {tab === 'auditoria' && <AuditoriaTab key={tick} />}
        {tab === 'nube' && <NubeTab key={tick} />}
      </main>

      {ticketModal && (
        <Dialog open={!!ticketModal} onOpenChange={() => setTicketModal(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Ticket #{ticketModal.numero}</DialogTitle></DialogHeader>
            <pre className="text-xs whitespace-pre-wrap bg-gray-50 p-3 rounded">{store.txtTicket(ticketModal)}</pre>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function MonitoreoTab() {
  const [fecha, setFecha] = useState(hoy());
  const [buscarNum, setBuscarNum] = useState('');
  const [filtroLote, setFiltroLote] = useState('');
  const [filtroTerm, setFiltroTerm] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');

  const ticketsFiltrados = store.tickets
    .filter(t => t.fechaSorteo === fecha)
    .filter(t => !filtroLote || t.loteriaId === filtroLote)
    .filter(t => !filtroTerm || t.terminalId === filtroTerm)
    .filter(t => !filtroEstado || t.estado === filtroEstado)
    .filter(t => !buscarNum || t.jugadas.some(j => j.numero.includes(buscarNum)))
    .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

  const totalVentas = ticketsFiltrados.filter(t => t.estado !== 'anulado').reduce((s, t) => s + t.total, 0);
  const totalJugadas = ticketsFiltrados.filter(t => t.estado !== 'anulado').reduce((s, t) => s + t.jugadas.length, 0);
  const totalPremios = ticketsFiltrados.filter(t => t.estado === 'pagado').reduce((s, t) => s + (t.montoPremio || 0), 0);

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div><label className="text-xs text-gray-500">Lotería</label><select className="w-full border rounded p-2 text-sm" value={filtroLote} onChange={e => setFiltroLote(e.target.value)}><option value="">Todas</option>{store.loterias.map(l => <option key={l.id} value={l.id}>{l.nombre}</option>)}</select></div>
            <div><label className="text-xs text-gray-500">Turno</label><select className="w-full border rounded p-2 text-sm" value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}><option value="">Todos</option><option value="valido">Válido</option><option value="anulado">Anulado</option><option value="pagado">Pagado</option></select></div>
            <div><label className="text-xs text-gray-500">Fecha</label><Input type="date" value={fecha} onChange={e => setFecha(e.target.value)} /></div>
            <div><label className="text-xs text-gray-500">Buscar número</label><Input value={buscarNum} onChange={e => setBuscarNum(e.target.value)} placeholder="Ej: 517, 17..." /></div>
            <div><label className="text-xs text-gray-500">Terminal</label><select className="w-full border rounded p-2 text-sm" value={filtroTerm} onChange={e => setFiltroTerm(e.target.value)}><option value="">Todas</option>{store.terminales.map(t => <option key={t.id} value={t.id}>{t.codigo}</option>)}</select></div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="bg-blue-50 border-blue-200"><CardContent className="p-3"><p className="text-xs text-gray-500">VENTAS</p><p className="text-lg font-bold text-blue-700">${totalVentas.toLocaleString()}</p></CardContent></Card>
        <Card className="bg-emerald-50 border-emerald-200"><CardContent className="p-3"><p className="text-xs text-gray-500">JUGADAS</p><p className="text-lg font-bold text-emerald-700">{totalJugadas}</p></CardContent></Card>
        <Card className="bg-red-50 border-red-200"><CardContent className="p-3"><p className="text-xs text-gray-500">PREMIOS</p><p className="text-lg font-bold text-red-700">${totalPremios.toLocaleString()}</p></CardContent></Card>
        <Card className="bg-emerald-50 border-emerald-200"><CardContent className="p-3"><p className="text-xs text-gray-500">TERMINALES OK</p><p className="text-lg font-bold text-emerald-700">{store.terminales.filter(t => t.activo && !t.bloqueado).length}</p></CardContent></Card>
        <Card className={`border ${store.terminales.filter(t => t.bloqueado).length > 0 ? 'bg-red-50 border-red-300' : 'bg-gray-50 border-gray-200'}`}><CardContent className="p-3"><p className="text-xs text-gray-500">BLOQUEADOS</p><p className={`text-lg font-bold ${store.terminales.filter(t => t.bloqueado).length > 0 ? 'text-red-700' : 'text-gray-600'}`}>{store.terminales.filter(t => t.bloqueado).length}</p></CardContent></Card>
      </div>

      {ticketsFiltrados.length === 0 && <p className="text-center text-gray-500 py-8">No hay tickets para esta fecha</p>}

      <div className="space-y-2">
        {ticketsFiltrados.map(t => {
          const lot = store.loteById(t.loteriaId);
          const term = store.terminalById(t.terminalId);
          const premio = store.premioTicket(t);
          return (
            <Card key={t.id} className={t.estado === 'anulado' ? 'opacity-50' : ''}>
              <CardContent className="pt-4">
                <div className="flex flex-wrap justify-between gap-2 mb-2">
                  <div>
                    <p className="font-semibold text-sm">#{t.numero} · {lot?.nombre || t.loteriaId}</p>
                    <p className="text-xs text-gray-500">{new Date(t.ts || 0).toLocaleString('es-VE', { timeZone: 'America/Caracas' })} · {term?.codigo}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-[#12355b]">${t.total.toLocaleString()}</p>
                    {t.estado === 'anulado' && <span className="text-xs text-red-600 font-bold">ANULADO</span>}
                    {t.estado === 'pagado' && <span className="text-xs text-blue-600 font-bold">PAGADO</span>}
                    {premio > 0 && t.estado === 'valido' && <p className="text-xs text-amber-600">🏆 {cop(premio)}</p>}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {t.jugadas.map((j, i) => (
                    <span key={i} className="inline-flex items-center px-2 py-1 bg-gray-100 rounded text-xs">
                      {NOMJ[j.modalidad]} <strong className="ml-1">{j.numero}</strong> · ${j.monto.toLocaleString()}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function VendedoresTab({ onChange }: { onChange: () => void }) {
  const [nom, setNom] = useState('');
  const [tel, setTel] = useState('');
  const [ced, setCed] = useState('');
  const [com, setCom] = useState('10');

  const crear = () => {
    if (!nom.trim()) return;
    store.vendedores.push({ id: uid(), nombre: nom.trim(), telefono: tel.trim(), cedula: ced.trim(), comisionPct: +com || 10, activo: true, fechaAlta: hoy(), notas: '' });
    store.save();
    onChange();
    setNom(''); setTel(''); setCed(''); setCom('10');
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm text-[#12355b]">Nuevo vendedor</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Input placeholder="Nombre" value={nom} onChange={e => setNom(e.target.value)} />
            <Input placeholder="Teléfono" value={tel} onChange={e => setTel(e.target.value)} />
            <Input placeholder="Cédula" value={ced} onChange={e => setCed(e.target.value)} />
            <Input placeholder="Comisión %" type="number" value={com} onChange={e => setCom(e.target.value)} />
          </div>
          <Button onClick={crear} className="bg-[#12355b] hover:bg-[#0d2640]">Agregar vendedor</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm text-[#12355b]">Vendedores ({store.vendedores.length})</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {store.vendedores.map(v => (
            <div key={v.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
              <div>
                <p className="font-medium text-sm">{v.nombre} {v.activo ? '' : <span className="text-red-500 text-xs">(Inactivo)</span>}</p>
                <p className="text-xs text-gray-500">{v.telefono} · {v.cedula} · {v.comisionPct}% comisión</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => { v.activo = !v.activo; store.save(); onChange(); }}>{v.activo ? 'Desactivar' : 'Activar'}</Button>
                <Button variant="ghost" size="sm" className="text-red-500" onClick={() => {
                  if (store.terminales.some(t => t.vendedorId === v.id)) { alert('No se puede eliminar: tiene terminales asignadas'); return; }
                  if (!confirm('¿Eliminar vendedor?')) return;
                  store.vendedores = store.vendedores.filter(x => x.id !== v.id); store.save(); onChange();
                }}>Eliminar</Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function TerminalesTab({ onChange }: { onChange: () => void }) {
  const [cod, setCod] = useState('');
  const [nom, setNom] = useState('');
  const [ubi, setUbi] = useState('');
  const [vendId, setVendId] = useState('');
  const [fondo, setFondo] = useState('');

  const crear = () => {
    if (!nom.trim()) return;
    const id = 'T' + (store.terminales.length + 1);
    const c = cod.trim() || 'TQ-' + String(store.terminales.length + 1).padStart(3, '0');
    store.terminales.push({
      id, codigo: c, nombre: nom.trim(), ubicacion: ubi.trim(), vendedorId: vendId || undefined,
      activo: true, bloqueado: false, motivoBloqueo: '', saldo: 0, fondo: +fondo || 0, fechaAlta: hoy(),
      comisionLoterias: store.config.comisionDefault, comisionAnimalitos: store.config.comisionDefault,
      comisionZodiacales: store.config.comisionDefault, cuposPorLoteria: {},
    });
    store.save();
    onChange();
    setCod(''); setNom(''); setUbi(''); setVendId(''); setFondo('');
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm text-[#12355b]">Nueva terminal</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Input placeholder="Código (opcional)" value={cod} onChange={e => setCod(e.target.value)} />
            <Input placeholder="Nombre" value={nom} onChange={e => setNom(e.target.value)} />
            <Input placeholder="Ubicación" value={ubi} onChange={e => setUbi(e.target.value)} />
            <select className="border rounded p-2 text-sm" value={vendId} onChange={e => setVendId(e.target.value)}><option value="">Sin vendedor</option>{store.vendedores.map(v => <option key={v.id} value={v.id}>{v.nombre}</option>)}</select>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Input placeholder="Fondo inicial" type="number" value={fondo} onChange={e => setFondo(e.target.value)} />
          </div>
          <Button onClick={crear} className="bg-[#12355b] hover:bg-[#0d2640]">Agregar terminal</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm text-[#12355b]">Terminales ({store.terminales.length})</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {store.terminales.map(t => {
            const vend = store.vendedorById(t.vendedorId || '');
            return (
              <div key={t.id} className={`flex items-center justify-between p-3 rounded ${t.bloqueado ? 'bg-red-50' : 'bg-gray-50'}`}>
                <div>
                  <p className="font-medium text-sm">{t.codigo} · {t.nombre} {t.bloqueado && <span className="text-red-500 text-xs font-bold">BLOQUEADA</span>}</p>
                  <p className="text-xs text-gray-500">{t.ubicacion} · Vendedor: {vend?.nombre || '—'} · Fondo: {cop(t.fondo || 0)}</p>
                </div>
                <div className="flex gap-2">
                  {!t.bloqueado && <Button variant="outline" size="sm" onClick={() => { const mot = prompt('Motivo del bloqueo:'); if (!mot) return; t.bloqueado = true; t.motivoBloqueo = mot; store.save(); onChange(); store.log('bloqueo', 'terminal', t.id, `Terminal ${t.codigo} bloqueada: ${mot}`, 'ADMIN'); }}>Bloquear</Button>}
                  {t.bloqueado && <Button variant="outline" size="sm" onClick={() => { t.bloqueado = false; t.motivoBloqueo = ''; store.save(); onChange(); store.log('desbloqueo', 'terminal', t.id, `Terminal ${t.codigo} desbloqueada`, 'ADMIN'); }}>Desbloquear</Button>}
                  <Button variant="ghost" size="sm" className="text-red-500" onClick={() => {
                    if (store.tickets.some(tk => tk.terminalId === t.id)) return alert('No se puede eliminar: tiene tickets registrados');
                    if (!confirm(`¿Eliminar terminal ${t.codigo} permanentemente?`)) return;
                    store.terminales = store.terminales.filter(x => x.id !== t.id); store.save(); onChange();
                  }}>Eliminar</Button>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}

function LoteriasTab({ onChange }: { onChange: () => void }) {
  const [nom, setNom] = useState('');
  const [tipo, setTipo] = useState<'triple' | 'animalito' | 'zodiacal'>('triple');
  const [turno, setTurno] = useState<'manana' | 'tarde' | 'noche'>('manana');
  const [hora, setHora] = useState('');
  const [horaCierre, setHoraCierre] = useState('');

  const crear = () => {
    if (!nom.trim()) return;
    let pagos: Record<Modalidad, number>;
    if (tipo === 'triple') pagos = { triple: 500, cuadrupla: 0, terminal: 50, triple_zodiacal: 0, '4_zodiacal': 0, '2_zodiacal': 0 };
    else if (tipo === 'animalito') pagos = { triple: 0, cuadrupla: 0, terminal: 50, triple_zodiacal: 0, '4_zodiacal': 0, '2_zodiacal': 0 };
    else pagos = { triple: 0, cuadrupla: 0, terminal: 0, triple_zodiacal: 500, '4_zodiacal': 0, '2_zodiacal': 50 };
    store.loterias.push({
      id: uid(), nombre: nom.trim(), tipo, turno, hora: hora || '—', horaCierre: horaCierre || '—', activa: true,
      pagos, minApuesta: store.config.minApuesta, maxNumero: store.config.maxNumero, topesTerminal: {}
    });
    store.save();
    onChange();
    setNom(''); setHora(''); setHoraCierre('');
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm text-[#12355b]">Nueva lotería</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Input placeholder="Nombre" value={nom} onChange={e => setNom(e.target.value)} />
            <select className="border rounded p-2 text-sm" value={tipo} onChange={e => setTipo(e.target.value as any)}><option value="triple">Triple</option><option value="animalito">Animalito</option><option value="zodiacal">Zodiacal</option></select>
            <select className="border rounded p-2 text-sm" value={turno} onChange={e => setTurno(e.target.value as any)}><option value="manana">Mañana</option><option value="tarde">Tarde</option><option value="noche">Noche</option></select>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Input placeholder="Hora sorteo (ej: 1:00 PM)" value={hora} onChange={e => setHora(e.target.value)} />
            <Input placeholder="Hora cierre (ej: 12:30 PM)" value={horaCierre} onChange={e => setHoraCierre(e.target.value)} />
          </div>
          <Button onClick={crear} className="bg-[#12355b] hover:bg-[#0d2640]">Agregar lotería</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm text-[#12355b]">Loterías ({store.loterias.length})</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {store.loterias.map(l => (
            <div key={l.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
              <div>
                <p className="font-medium text-sm">{l.nombre} <span className="text-xs text-gray-400">({l.tipo})</span> {l.activa ? '' : <span className="text-red-500 text-xs">(Inactiva)</span>}</p>
                <p className="text-xs text-gray-500">{l.turno} · {l.hora} (cierra {l.horaCierre})</p>
                <p className="text-xs text-gray-400">Pagos: {Object.entries(l.pagos).filter(([,v]) => v > 0).map(([k,v]) => `${NOMJ[k]} x${v}`).join(', ') || '—'}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => { l.activa = !l.activa; store.save(); onChange(); }}>{l.activa ? 'Desactivar' : 'Activar'}</Button>
                <Button variant="ghost" size="sm" className="text-red-500" onClick={() => { if (!confirm('¿Eliminar lotería?')) return; store.loterias = store.loterias.filter(x => x.id !== l.id); store.save(); onChange(); }}>Eliminar</Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function VentasTab({ onTicket }: { onTicket: (t: Ticket) => void }) {
  const [fLote, setFLote] = useState('');
  const [fTerm, setFTerm] = useState('');
  const [fFecha, setFFecha] = useState('');
  const [fEstado, setFEstado] = useState('');
  const [fNum, setFNum] = useState('');

  const filtrados = store.tickets
    .filter(t => !fLote || t.loteriaId === fLote)
    .filter(t => !fTerm || t.terminalId === fTerm)
    .filter(t => !fFecha || t.fechaSorteo === fFecha)
    .filter(t => !fEstado || t.estado === fEstado)
    .filter(t => !fNum || String(t.numero) === fNum)
    .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <select className="border rounded p-2 text-sm" value={fLote} onChange={e => setFLote(e.target.value)}><option value="">Todas las loterías</option>{store.loterias.map(l => <option key={l.id} value={l.id}>{l.nombre}</option>)}</select>
            <select className="border rounded p-2 text-sm" value={fTerm} onChange={e => setFTerm(e.target.value)}><option value="">Todas las terminales</option>{store.terminales.map(t => <option key={t.id} value={t.id}>{t.codigo}</option>)}</select>
            <Input type="date" value={fFecha} onChange={e => setFFecha(e.target.value)} />
            <select className="border rounded p-2 text-sm" value={fEstado} onChange={e => setFEstado(e.target.value)}><option value="">Todos los estados</option><option value="valido">Válido</option><option value="anulado">Anulado</option><option value="pagado">Pagado</option></select>
            <Input placeholder="# Ticket" value={fNum} onChange={e => setFNum(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-blue-50 border-blue-200"><CardContent className="p-3"><p className="text-xs text-gray-500">TICKETS</p><p className="text-lg font-bold text-blue-700">{filtrados.length}</p></CardContent></Card>
        <Card className="bg-emerald-50 border-emerald-200"><CardContent className="p-3"><p className="text-xs text-gray-500">VENTAS</p><p className="text-lg font-bold text-emerald-700">${filtrados.filter(t => t.estado !== 'anulado').reduce((s, t) => s + t.total, 0).toLocaleString()}</p></CardContent></Card>
        <Card className="bg-amber-50 border-amber-200"><CardContent className="p-3"><p className="text-xs text-gray-500">PREMIOS PAGADOS</p><p className="text-lg font-bold text-amber-700">${filtrados.filter(t => t.estado === 'pagado').reduce((s, t) => s + (t.montoPremio || 0), 0).toLocaleString()}</p></CardContent></Card>
        <Card className="bg-red-50 border-red-200"><CardContent className="p-3"><p className="text-xs text-gray-500">ANULADOS</p><p className="text-lg font-bold text-red-700">{filtrados.filter(t => t.estado === 'anulado').length}</p></CardContent></Card>
      </div>

      {filtrados.length === 0 && <p className="text-center text-gray-500 py-8">No hay tickets</p>}

      <div className="space-y-2">
        {filtrados.map(t => {
          const lot = store.loteById(t.loteriaId);
          const term = store.terminalById(t.terminalId);
          return (
            <Card key={t.id} className={t.estado === 'anulado' ? 'opacity-50' : ''}>
              <CardContent className="pt-4">
                <div className="flex justify-between mb-2">
                  <div>
                    <p className="font-semibold text-sm">#{t.numero} · {lot?.nombre || t.loteriaId}</p>
                    <p className="text-xs text-gray-500">{new Date(t.ts || 0).toLocaleString('es-VE', { timeZone: 'America/Caracas' })} · {term?.codigo}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-[#12355b]">${t.total.toLocaleString()}</p>
                    {t.estado === 'anulado' && <span className="text-xs text-red-600 font-bold">ANULADO</span>}
                    {t.estado === 'pagado' && <span className="text-xs text-blue-600 font-bold">PAGADO</span>}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mb-2">
                  {t.jugadas.map((j, i) => (
                    <span key={i} className="inline-flex items-center px-2 py-1 bg-gray-100 rounded text-xs">
                      {NOMJ[j.modalidad]} <strong className="ml-1">{j.numero}</strong> · ${j.monto.toLocaleString()}
                    </span>
                  ))}
                </div>
                <Button variant="outline" size="sm" onClick={() => onTicket(t)}>Ver ticket</Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function PremiarTab({ onChange }: { onChange: () => void }) {
  const [sid, setSid] = useState('');
  const [num, setNum] = useState('');
  const [tipoRes, setTipoRes] = useState<'triple' | 'cuadrupla' | 'terminal' | 'triple_zodiacal' | '4_zodiacal' | '2_zodiacal'>('triple');

  const guardar = () => {
    if (!sid || !num.trim()) return;
    const s = store.sorteos.find(x => x.id === sid);
    if (s) {
      s.resultado = { num: num.trim(), tipo: tipoRes, ts: Date.now() };
    } else {
      const lotId = sid.split('_')[0];
      store.sorteos.push({ id: sid, loteriaId: lotId, fecha: sid.split('_').slice(1).join('_'), estado: 'premiado', resultado: { num: num.trim(), tipo: tipoRes, ts: Date.now() } });
    }
    store.save();
    onChange();
    setNum('');
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm text-[#12355b]">Registrar resultado de sorteo</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <select className="border rounded p-2 text-sm" value={sid} onChange={e => setSid(e.target.value)}><option value="">Seleccionar sorteo</option>{store.sorteos.map(s => <option key={s.id} value={s.id}>{store.loteById(s.loteriaId)?.nombre} · {s.fecha}</option>)}</select>
            <select className="border rounded p-2 text-sm" value={tipoRes} onChange={e => setTipoRes(e.target.value as any)}>{TIPOS_LOTERIA.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}</select>
            <Input placeholder="Número ganador" value={num} onChange={e => setNum(e.target.value)} />
          </div>
          <Button onClick={guardar} className="bg-[#12355b] hover:bg-[#0d2640]">Guardar resultado</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm text-[#12355b]">Sorteos registrados</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {store.sorteos.map(s => (
            <div key={s.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
              <div>
                <p className="font-medium text-sm">{store.loteById(s.loteriaId)?.nombre} · {s.fecha}</p>
                <p className="text-xs text-gray-500">Resultado: <strong>{s.resultado?.num || '—'}</strong> ({s.resultado?.tipo || 'pendiente'})</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function CuadreTab() {
  const [fDesde, setFDesde] = useState(hoy());
  const [fHasta, setFHasta] = useState(hoy());

  const terminales = store.terminales.map(t => {
    const d = store.detalleTerminal(t.id, fDesde, fHasta);
    return { ...t, ...d };
  });

  const totalGlobal = terminales.reduce((s, t) => s + t.ventas, 0);
  const premiosGlobal = terminales.reduce((s, t) => s + t.premios, 0);

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-4">
          <div className="grid grid-cols-2 gap-3">
            <Input type="date" value={fDesde} onChange={e => setFDesde(e.target.value)} />
            <Input type="date" value={fHasta} onChange={e => setFHasta(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-blue-50 border-blue-200"><CardContent className="p-3"><p className="text-xs text-gray-500">TOTAL VENTAS</p><p className="text-lg font-bold text-blue-700">${totalGlobal.toLocaleString()}</p></CardContent></Card>
        <Card className="bg-red-50 border-red-200"><CardContent className="p-3"><p className="text-xs text-gray-500">PREMIOS</p><p className="text-lg font-bold text-red-700">${premiosGlobal.toLocaleString()}</p></CardContent></Card>
        <Card className="bg-emerald-50 border-emerald-200"><CardContent className="p-3"><p className="text-xs text-gray-500">NETO</p><p className="text-lg font-bold text-emerald-700">${(totalGlobal - premiosGlobal).toLocaleString()}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm text-[#12355b]">Por terminal</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {terminales.map(t => (
            <div key={t.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
              <div>
                <p className="font-medium text-sm">{t.codigo} · {t.nombre}</p>
                <p className="text-xs text-gray-500">{t.tickets} tickets · Ventas: {cop(t.ventas)} · Premios: {cop(t.premios)}</p>
              </div>
              <p className="font-bold text-[#12355b]">{cop(t.neto)}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function AuditoriaTab() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm text-[#12355b]">Últimas acciones</CardTitle></CardHeader>
        <CardContent className="space-y-2 max-h-[70vh] overflow-y-auto">
          {store.logs.slice(0, 200).map(l => (
            <div key={l.id} className="flex items-start gap-3 p-2 bg-gray-50 rounded text-xs">
              <span className="text-gray-400 whitespace-nowrap">{new Date(l.ts).toLocaleString('es-VE', { timeZone: 'America/Caracas' })}</span>
              <span className="font-semibold text-[#12355b]">{l.usuario}</span>
              <span className="text-gray-500">{l.accion}</span>
              <span className="text-gray-700">{l.detalle}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function NubeTab() {
  const [cfg, setCfg] = useState(() => {
    try { return JSON.stringify(JSON.parse(localStorage.getItem('banca_firebase_config') || '{}'), null, 2); }
    catch { return ''; }
  });

  const guardar = () => {
    try {
      const parsed = JSON.parse(cfg);
      localStorage.setItem('banca_firebase_config', JSON.stringify(parsed));
      alert('Configuración guardada. Recarga la página.');
    } catch {
      alert('JSON inválido');
    }
  };

  const desconectar = () => {
    localStorage.removeItem('banca_firebase_config');
    alert('Desconectado. Recarga la página.');
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm text-[#12355b]">Configuración Firebase</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <textarea className="w-full h-40 border rounded p-2 text-xs font-mono" value={cfg} onChange={e => setCfg(e.target.value)} placeholder="Pega aquí firebaseConfig..." />
          <div className="flex gap-2">
            <Button onClick={guardar} className="bg-[#12355b] hover:bg-[#0d2640]">Guardar</Button>
            <Button variant="outline" onClick={desconectar}>Desconectar</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}