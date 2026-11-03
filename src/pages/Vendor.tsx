import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { store, hoy, cop, NOMJ, uid } from '@/store';
import type { Jugada, Ticket } from '@/types';

interface PreviewItem {
  id: string;
  loteriaId: string;
  modalidad: Jugada['modalidad'];
  numero: string;
  monto: number;
}

export default function Vendor({ taq, onLogout }: { taq: string; onLogout: () => void }) {
  const terminal = store.terminalByCod(taq);
  if (!terminal) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#f4f6f9] p-4">
        <p className="text-red-600 text-sm mb-4">Terminal no encontrada: {taq}</p>
        <Button onClick={onLogout}>Volver al login</Button>
      </div>
    );
  }

  // Bloqueo
  if (terminal.bloqueado) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#f4f6f9] p-4">
        <p className="text-red-600 text-lg font-bold mb-2">⛔ Terminal bloqueada</p>
        <p className="text-gray-600 text-sm mb-4">{terminal.motivoBloqueo}</p>
        <Button onClick={onLogout}>Volver al login</Button>
      </div>
    );
  }

  const [tab, setTab] = useState<'vender' | 'tickets' | 'anular' | 'cuadre' | 'premios'>('vender');
  const [fechaSorteo, setFechaSorteo] = useState(hoy());
  const [selLotes, setSelLotes] = useState<string[]>([]);
  const [numero, setNumero] = useState('');
  const [monto, setMonto] = useState('');
  const [preview, setPreview] = useState<PreviewItem[]>([]);
  const [msg, setMsg] = useState('');
  const [ticketModal, setTicketModal] = useState<Ticket | null>(null);

  // Tickets
  const [fechaFiltro, setFechaFiltro] = useState(hoy());
  const [ticketBuscar, setTicketBuscar] = useState('');
  const [ticketEncontrado, setTicketEncontrado] = useState<Ticket | null>(null);
  const [anularMsg, setAnularMsg] = useState('');
  const [anularMotivo, setAnularMotivo] = useState('');

  // Premios
  const [premioNum, setPremioNum] = useState('');
  const [premioTicket, setPremioTicket] = useState<Ticket | null>(null);
  const [premioMsg, setPremioMsg] = useState('');

  // Limpiar loterías seleccionadas que no aplican al tipo detectado
  useEffect(() => {
    if (loteriasInvalidas.length > 0) {
      setSelLotes(prev => prev.filter(id => !loteriasInvalidas.includes(id)));
    }
  }, [numero]);

  const numRef = useRef<HTMLInputElement>(null);
  const montoRef = useRef<HTMLInputElement>(null);

  const detectarTipo = (n: string): Jugada['modalidad'] | null => {
    const limpio = n.replace(/\D/g, '');
    if (limpio.length === 2) return 'terminal';
    if (limpio.length === 3) return 'triple';
    return null;
  };

  // Filtrar loterías según modalidad detectada
  const tipoDetectado = detectarTipo(numero);
  const loterias = store.loterias.filter(l => {
    if (!l.activa) return false;
    if (!tipoDetectado) return true; // mostrar todas si aún no hay número
    if (l.tipo === 'triple' && (tipoDetectado === 'triple' || tipoDetectado === 'terminal')) return true;
    if (l.tipo === 'animalito' && tipoDetectado === 'terminal') return true;
    if (l.tipo === 'zodiacal' && (tipoDetectado === 'triple' || tipoDetectado === 'terminal')) return true;
    return false;
  });

  // Limpiar loterías seleccionadas que no aplican al cambiar el número
  const loteriasValidas = loterias.map(l => l.id);
  const loteriasInvalidas = selLotes.filter(id => !loteriasValidas.includes(id));

  const toggleLoteria = (id: string) => {
    setSelLotes(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const procesar = () => {
    setMsg('');
    const limpio = numero.replace(/\D/g, '');
    const tipo = detectarTipo(limpio);
    const m = +monto || 0;

    if (selLotes.length === 0) { setMsg('Selecciona al menos una lotería'); return; }
    if (!tipo) { setMsg('El número debe tener 2 cifras (terminal) o 3 cifras (triple)'); return; }
    if (m <= 0) { setMsg('Ingresa un monto válido'); return; }

    const n = limpio.padStart(tipo === 'terminal' ? 2 : 3, '0');

    const duplicados: string[] = [];
    const nuevos: PreviewItem[] = [];
    selLotes.forEach(lid => {
         selLotes.forEach(lid => {
      const idx = preview.findIndex(p => p.loteriaId === lid && p.modalidad === tipo && p.numero === n);
      if (idx >= 0) {
        // Sumar monto al existente
        setPreview(prev => prev.map((p, i) => i === idx ? { ...p, monto: p.monto + m } : p));
      } else {
        nuevos.push({ id: uid(), loteriaId: lid, modalidad: tipo, numero: n, monto: m });
      }
    });

    if (duplicados.length > 0) {
      setMsg(`Ya existe en previsualización: ${duplicados.join(', ')}`);
      if (nuevos.length === 0) return;
    }

        setPreview(prev => [...prev, ...nuevos]);
    setNumero('');
    // El monto se mantiene para la siguiente jugada
    setTimeout(() => numRef.current?.focus(), 0);
  };

  const eliminarDePreview = (id: string) => {
    setPreview(prev => prev.filter(p => p.id !== id));
  };

  const totalPreview = preview.reduce((s, p) => s + p.monto, 0);

  const previewPorLoteria: Record<string, { lotNombre: string; items: PreviewItem[]; total: number }> = {};
  preview.forEach(p => {
    const l = store.loteById(p.loteriaId);
    if (!previewPorLoteria[p.loteriaId]) previewPorLoteria[p.loteriaId] = { lotNombre: l?.nombre || '?', items: [], total: 0 };
    previewPorLoteria[p.loteriaId].items.push(p);
    previewPorLoteria[p.loteriaId].total += p.monto;
  });
  Object.values(previewPorLoteria).forEach(g => {
    g.items.sort((a, b) => a.numero.localeCompare(b.numero));
  });

  const generarTicket = () => {
    setMsg('');
    if (preview.length === 0) { setMsg('No hay jugadas en la previsualización'); return; }

    const er: string[] = [];
    const porLote: Record<string, PreviewItem[]> = {};
    preview.forEach(p => { (porLote[p.loteriaId] ||= []).push(p); });

    Object.entries(porLote).forEach(([lid, items]) => {
      const lot = store.loteById(lid);
      if (!lot) return;
      items.forEach(it => {
        if (it.monto < lot.minApuesta) er.push(`${lot.nombre}: ${it.numero} monto mínimo ${cop(lot.minApuesta)}`);
      });
      const agr: Record<string, number> = {};
      items.forEach(it => { agr[it.modalidad + '|' + it.numero] = (agr[it.modalidad + '|' + it.numero] || 0) + it.monto; });
      Object.entries(agr).forEach(([k, montoTotal]) => {
        const [modalidad, num] = k.split('|');
        const sid = lid + '_' + fechaSorteo;
        const disp = store.cupoDisponible(sid, modalidad as Jugada['modalidad'], num, terminal.id);
        if (montoTotal > disp) {
          er.push(`${lot.nombre}: ${num} (${NOMJ[modalidad]}) tope alcanzado. Disponible: ${cop(disp)}.`);
        }
      });
    });

    if (er.length) { setMsg(er.join(' / ')); return; }

    const jugadas: Jugada[] = preview.map(it => ({
      modalidad: it.modalidad,
      numero: it.numero,
      monto: it.monto,
      loteriaId: it.loteriaId,
    }));

    jugadas.sort((a, b) => {
      const la = store.loteById(a.loteriaId || '')?.nombre || '';
      const lb = store.loteById(b.loteriaId || '')?.nombre || '';
      if (la !== lb) return la.localeCompare(lb);
      return a.numero.localeCompare(b.numero);
    });

    const numTicket = store.siguienteNumero(terminal.id);
    const lot = store.loteById(preview[0].loteriaId);

    const t: Ticket = {
      id: uid(),
      terminalId: terminal.id,
      sorteoId: preview[0].loteriaId + '_' + fechaSorteo,
      loteriaId: preview[0].loteriaId,
      fechaSorteo,
      turno: lot?.turno || 'manana',
      jugadas,
      total: jugadas.reduce((s, j) => s + j.monto, 0),
      estado: 'valido',
      numero: numTicket,
      ts: Date.now(),
    };

    // Acumular cupos
    jugadas.forEach(j => {
      const sid = j.loteriaId + '_' + fechaSorteo;
      store.acumularCupo(sid, j.modalidad, j.numero, j.monto);
    });

    store.tickets.push(t);
    store.log('venta', 'ticket', t.id, `Ticket #${t.numero} por ${cop(t.total)}`, terminal.codigo);
    store.save();
    setPreview([]);
    setTicketModal(t);
  };

  const shareWhatsApp = (v: Ticket) => {
    window.open('https://wa.me/?text=' + encodeURIComponent(store.txtTicket(v)), '_blank');
  };

  const shareTelegram = (v: Ticket) => {
    window.open('https://t.me/share/url?url=' + encodeURIComponent('Ticket #' + v.numero) + '&text=' + encodeURIComponent(store.txtTicket(v)), '_blank');
  };

  const copyTicket = async (v: Ticket) => {
    try {
      await navigator.clipboard.writeText(store.txtTicket(v));
      setMsg('Ticket copiado al portapapeles ✅');
      setTimeout(() => setMsg(''), 2000);
    } catch {
      setMsg('No se pudo copiar. Copia manualmente el texto de arriba.');
    }
  };

  const infoNumero = (lid: string, modalidad: string, numero: string) => {
    const sid = lid + '_' + fechaSorteo;
    const disp = store.cupoDisponible(sid, modalidad as Jugada['modalidad'], numero, terminal.id);
    const c = store.getCupo(sid, modalidad as Jugada['modalidad'], numero);
    // El tope real considera el cupo del terminal si existe
    let topeReal = c.limite;
    if (terminal.cuposPorLoteria[lid] > 0) {
      topeReal = Math.min(topeReal, terminal.cuposPorLoteria[lid]);
    }
    const vend = c.acumulado;
    const pc = topeReal ? vend / topeReal * 100 : 0;
    return { vend, tope: topeReal, pc, disp };
  };

  const handleNumeroKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const tipo = detectarTipo(numero);
      if (!tipo) { setMsg('El número debe tener 2 o 3 cifras'); return; }
      montoRef.current?.focus();
    }
  };

  const handleMontoKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      procesar();
    }
  };

  const handleNumeroChange = (val: string) => {
    const limpio = val.replace(/\D/g, '').slice(0, 3);
    setNumero(limpio);
    setMsg('');
  };

  // Tickets de la terminal filtrados por fecha
  const ticketsDeFecha = store.tickets
    .filter(t => t.terminalId === terminal.id && t.fechaSorteo === fechaFiltro)
    .sort((a, b) => a.numero - b.numero);

  const totalTicketsFecha = ticketsDeFecha.filter(t => t.estado !== 'anulado').reduce((s, t) => s + t.total, 0);

  const buscarTicket = () => {
    setAnularMsg('');
    const n = +ticketBuscar;
    if (!n || n <= 0) { setAnularMsg('Ingresa un número de ticket válido'); return; }
    const t = store.ticketPorNumero(terminal.id, n);
    if (!t) { setAnularMsg('Ticket no encontrado'); setTicketEncontrado(null); return; }
    setTicketEncontrado(t);
  };

  const anularTicket = () => {
    if (!ticketEncontrado) return;
    if (!anularMotivo.trim()) { setAnularMsg('Debes indicar un motivo de anulación'); return; }
    const err = store.anularTicket(terminal.id, ticketEncontrado.numero, anularMotivo, terminal.codigo);
    if (err) { setAnularMsg(err); return; }
    setAnularMsg('Ticket #' + ticketEncontrado.numero + ' anulado correctamente');
    setTicketEncontrado({ ...ticketEncontrado, estado: 'anulado', anuladoTs: Date.now(), anuladoPor: terminal.codigo, motivoAnulacion: anularMotivo });
    setAnularMotivo('');
  };

  // Premios
  const buscarPremio = () => {
    setPremioMsg('');
    setPremioTicket(null);
    const n = +premioNum;
    if (!n || n <= 0) { setPremioMsg('Ingresa un número de ticket'); return; }
    const t = store.ticketPorNumero(terminal.id, n);
    if (!t) { setPremioMsg('Ticket no encontrado'); return; }
    if (t.estado === 'anulado') { setPremioMsg('Ticket anulado'); return; }
    if (t.estado === 'pagado') { setPremioMsg('Ticket ya pagado'); return; }
    const premio = store.premioTicket(t);
    if (premio <= 0) { setPremioMsg('Este ticket no tiene premio'); return; }
    setPremioTicket(t);
  };

  const pagarPremio = () => {
    if (!premioTicket) return;
    const res = store.pagarPremio(premioTicket.id, terminal.codigo);
    setPremioMsg(res.msg);
    if (res.ok && premioTicket) {
      setPremioTicket({ ...premioTicket, estado: 'pagado', pagadoTs: Date.now(), pagadoPor: terminal.codigo, montoPremio: res.monto });
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f6f9]">
      <header className="bg-[#12355b] text-white px-4 py-3 flex justify-between items-center sticky top-0 z-10">
        <div>
          <h1 className="text-base font-bold">🎫 Banca Lottery</h1>
          <p className="text-[11px] opacity-75">{terminal.codigo} — {terminal.nombre}</p>
        </div>
        <Button variant="ghost" size="sm" className="text-white" onClick={onLogout}>Salir</Button>
      </header>

      <nav className="flex gap-2 bg-white px-3 py-2 border-b overflow-x-auto sticky top-[52px] z-10">
        <button className={`px-4 py-1.5 rounded-full text-sm border whitespace-nowrap ${tab === 'vender' ? 'bg-[#12355b] text-white border-[#12355b]' : 'bg-gray-50 text-gray-700 border-gray-200'}`} onClick={() => setTab('vender')}>Vender</button>
        <button className={`px-4 py-1.5 rounded-full text-sm border whitespace-nowrap ${tab === 'tickets' ? 'bg-[#12355b] text-white border-[#12355b]' : 'bg-gray-50 text-gray-700 border-gray-200'}`} onClick={() => setTab('tickets')}>Tickets</button>
        <button className={`px-4 py-1.5 rounded-full text-sm border whitespace-nowrap ${tab === 'anular' ? 'bg-[#12355b] text-white border-[#12355b]' : 'bg-gray-50 text-gray-700 border-gray-200'}`} onClick={() => setTab('anular')}>Anular</button>
        <button className={`px-4 py-1.5 rounded-full text-sm border whitespace-nowrap ${tab === 'premios' ? 'bg-[#12355b] text-white border-[#12355b]' : 'bg-gray-50 text-gray-700 border-gray-200'}`} onClick={() => setTab('premios')}>Premios</button>
        <button className={`px-4 py-1.5 rounded-full text-sm border whitespace-nowrap ${tab === 'cuadre' ? 'bg-[#12355b] text-white border-[#12355b]' : 'bg-gray-50 text-gray-700 border-gray-200'}`} onClick={() => setTab('cuadre')}>Cuadre</button>
      </nav>

     <main className="mx-auto p-4 pb-20 max-w-md md:max-w-6xl">
                        {tab === 'vender' && (
          <div className="flex flex-col md:flex-row gap-4">
            <div className="md:w-1/3 space-y-4">
              <Card>
                <CardContent className="p-3">
                  <label className="text-xs font-semibold text-gray-600">Fecha del sorteo</label>
                  <Input type="date" value={fechaSorteo} onChange={e => setFechaSorteo(e.target.value)} className="mt-1" />
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm text-[#12355b]">Seleccionar loterías ({selLotes.length} seleccionadas)</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {loterias.map(l => (
                    <div key={l.id} className="flex items-center gap-2">
                      <Checkbox id={l.id} checked={selLotes.includes(l.id)} onCheckedChange={() => toggleLoteria(l.id)} />
                      <label htmlFor={l.id} className="text-sm cursor-pointer flex-1">{l.nombre}</label>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
            <div className="md:w-2/3 space-y-4">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm text-[#12355b]">Nueva jugada</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="text-xs font-semibold text-gray-600">Número (2=terminal, 3=triple)</label>
                      <Input ref={numRef} inputMode="numeric" maxLength={3} value={numero} onChange={e => handleNumeroChange(e.target.value)} onKeyDown={handleNumeroKeyDown} placeholder="Ej: 21 o 721" className="text-center font-bold text-lg tracking-widest" />
                      {numero && <p className="text-[10px] text-gray-500 mt-0.5">{detectarTipo(numero) ? NOMJ[detectarTipo(numero)!] : 'Ingresa 2 o 3 cifras'}</p>}
                    </div>
                    <div className="w-36">
                      <label className="text-xs font-semibold text-gray-600">Monto (COP)</label>
                      <Input ref={montoRef} type="number" min={0} step={100} value={monto} onChange={e => setMonto(e.target.value)} onKeyDown={handleMontoKeyDown} placeholder="Ej: 1000" />
                    </div>
                  </div>
                  <Button className="w-full bg-[#0e7c4a] hover:bg-[#0b6b3e] text-base py-3" onClick={procesar} disabled={!detectarTipo(numero) || !monto || selLotes.length === 0}>➕ Procesar</Button>
                </CardContent>
              </Card>
              {preview.length > 0 && (
                <Card className="border-amber-300 bg-amber-50/30">
                  <CardHeader className="pb-2"><CardTitle className="text-sm text-[#12355b]">🎫 Previsualización del ticket</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    {Object.entries(previewPorLoteria).map(([lid, grupo]) => (
                      <div key={lid} className="bg-white rounded-lg p-3 border">
                        <p className="text-sm font-bold text-[#12355b] mb-2">{grupo.lotNombre}</p>
                        <div className="space-y-1.5">
                          {grupo.items.map(item => {
                            const info = infoNumero(item.loteriaId, item.modalidad, item.numero);
                            return (
                              <div key={item.id} className="flex justify-between items-center text-sm">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono font-bold text-base tracking-wider">{item.numero}</span>
                                  <span className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">{NOMJ[item.modalidad]}</span>
                                  <span className="font-bold">{cop(item.monto)}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  {info && <span className={`text-[10px] ${info.pc >= 100 ? 'text-red-600 font-bold' : info.pc >= 80 ? 'text-amber-600' : 'text-green-600'}`}>{cop(info.vend)}/{cop(info.tope)}</span>}
                                  <Button variant="ghost" size="sm" className="text-red-500 h-6 px-1 text-xs" onClick={() => eliminarDePreview(item.id)}>✕</Button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <p className="text-right text-xs text-gray-500 mt-1">Subtotal: {cop(grupo.total)}</p>
                      </div>
                    ))}
                    <div className="flex justify-between items-center pt-2 border-t border-amber-200">
                      <span className="text-sm font-bold">Jugadas: {preview.length}</span>
                      <span className="text-lg font-bold text-[#12355b]">{cop(totalPreview)}</span>
                    </div>
                    <Button className="w-full bg-[#12355b] hover:bg-[#0e2847] text-base py-3" onClick={generarTicket}>✅ Generar ticket</Button>
                  </CardContent>
                </Card>
              )}
              {msg && <p className="text-red-600 text-xs bg-red-50 p-3 rounded-lg border border-red-200">{msg}</p>}
            </div>
          </div>
        )}

        {tab === 'tickets' && (
          <div className="space-y-4">
            <Card>
              <CardContent className="p-3">
                <label className="text-xs font-semibold text-gray-600">Fecha del sorteo</label>
                <Input type="date" value={fechaFiltro} onChange={e => setFechaFiltro(e.target.value)} className="mt-1" />
              </CardContent>
            </Card>

            <div className="flex justify-between items-center">
              <p className="text-sm text-gray-600">
                Tickets: <span className="font-bold">{ticketsDeFecha.filter(t => t.estado !== 'anulado').length}</span> activos
                {ticketsDeFecha.some(t => t.estado === 'anulado') && (
                  <span className="text-red-500"> · {ticketsDeFecha.filter(t => t.estado === 'anulado').length} anulados</span>
                )}
              </p>
              <p className="text-sm font-bold text-[#12355b]">{cop(totalTicketsFecha)}</p>
            </div>

            <div className="space-y-2">
              {ticketsDeFecha.map(t => (
                <Card
                  key={t.id}
                  className={`cursor-pointer ${t.estado === 'anulado' ? 'opacity-50 border-red-300' : ''}`}
                  onClick={() => setTicketModal(t)}
                >
                  <CardContent className="p-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-[#12355b]">#{t.numero}</span>
                          {t.estado === 'anulado' && <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-bold">ANULADO</span>}
                          {t.estado === 'pagado' && <span className="text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded font-bold">PAGADO</span>}
                        </div>
                        <p className="text-[11px] text-gray-500">
                          {new Date(t.ts).toLocaleTimeString('es-VE')} · {t.jugadas.length} jugada(s)
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={`font-bold ${t.estado === 'anulado' ? 'line-through text-gray-400' : ''}`}>{cop(t.total)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {ticketsDeFecha.length === 0 && (
                <p className="text-center text-gray-400 text-sm py-8">No hay tickets para esta fecha</p>
              )}
            </div>
          </div>
        )}

        {tab === 'anular' && (
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-[#12355b]">Anular ticket</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    inputMode="numeric"
                    placeholder="Número de ticket"
                    value={ticketBuscar}
                    onChange={e => setTicketBuscar(e.target.value.replace(/\D/g, ''))}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); buscarTicket(); } }}
                    className="flex-1"
                  />
                  <Button onClick={buscarTicket} className="bg-[#12355b]">Buscar</Button>
                </div>

                {ticketEncontrado && (
                  <div className="bg-white rounded-lg p-3 border space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-bold text-[#12355b]">Ticket #{ticketEncontrado.numero}</p>
                        <p className="text-[11px] text-gray-500">
                          {new Date(ticketEncontrado.ts).toLocaleString('es-VE')} · Sorteo: {ticketEncontrado.fechaSorteo}
                        </p>
                      </div>
                      <p className={`font-bold ${ticketEncontrado.estado === 'anulado' ? 'line-through text-gray-400' : ''}`}>{cop(ticketEncontrado.total)}</p>
                    </div>

                    <div className="space-y-1">
                      {ticketEncontrado.jugadas.map((j, i) => {
                        const lid = j.loteriaId || ticketEncontrado.loteriaId;
                        const l = store.loteById(lid);
                        return (
                          <div key={i} className="flex justify-between text-sm">
                            <span>{j.numero} ({NOMJ[j.modalidad]}) — {l?.nombre}</span>
                            <span className="font-bold">{cop(j.monto)}</span>
                          </div>
                        );
                      })}
                    </div>

                    {ticketEncontrado.estado !== 'anulado' && (
                      <>
                        <Input placeholder="Motivo de anulación (obligatorio)" value={anularMotivo} onChange={e => setAnularMotivo(e.target.value)} />
                        <Button className="w-full bg-red-600 hover:bg-red-700" onClick={anularTicket} disabled={!anularMotivo.trim()}>
                          ⚠️ Anular ticket #{ticketEncontrado.numero}
                        </Button>
                      </>
                    )}
                    {ticketEncontrado.estado === 'anulado' && (
                      <p className="text-center text-red-600 font-bold text-sm">Este ticket ya fue anulado</p>
                    )}
                  </div>
                )}

                {anularMsg && (
                  <p className={`text-xs p-3 rounded-lg border ${anularMsg.includes('anulado') ? 'text-green-700 bg-green-50 border-green-200' : 'text-red-600 bg-red-50 border-red-200'}`}>
                    {anularMsg}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {tab === 'premios' && (
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-[#12355b]">Validar y pagar premio</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    inputMode="numeric"
                    placeholder="Número de ticket"
                    value={premioNum}
                    onChange={e => setPremioNum(e.target.value.replace(/\D/g, ''))}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); buscarPremio(); } }}
                    className="flex-1"
                  />
                  <Button onClick={buscarPremio} className="bg-[#0e7c4a]">Validar</Button>
                </div>

                {premioTicket && (
                  <div className="bg-green-50 rounded-lg p-3 border border-green-200 space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-bold text-green-800">Ticket #{premioTicket.numero}</p>
                        <p className="text-[11px] text-gray-500">
                          Sorteo: {premioTicket.fechaSorteo} · {store.loteById(premioTicket.loteriaId)?.nombre}
                        </p>
                      </div>
                      <p className="text-lg font-bold text-green-700">{cop(store.premioTicket(premioTicket))}</p>
                    </div>
                    <Button className="w-full bg-green-600 hover:bg-green-700" onClick={pagarPremio}>💰 Pagar premio</Button>
                  </div>
                )}

                {premioMsg && (
                  <p className={`text-xs p-3 rounded-lg border ${premioMsg.includes('pagado') ? 'text-green-700 bg-green-50 border-green-200' : 'text-red-600 bg-red-50 border-red-200'}`}>
                    {premioMsg}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {tab === 'cuadre' && <CuadreTab terminalId={terminal.id} />}
      </main>

      {/* Modal de ticket */}
      <Dialog open={!!ticketModal} onOpenChange={() => setTicketModal(null)}>
        <DialogContent className="max-w-sm max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[#12355b]">
              Ticket #{ticketModal?.numero}
              {ticketModal?.estado === 'anulado' && <span className="text-red-600 text-sm ml-2">(ANULADO)</span>}
              {ticketModal?.estado === 'pagado' && <span className="text-blue-600 text-sm ml-2">(PAGADO)</span>}
            </DialogTitle>
          </DialogHeader>
          {ticketModal && (
            <div className="space-y-4">
              <div className="bg-[#fffdf5] border border-dashed border-[#c9a227] rounded-lg p-3 font-mono text-xs whitespace-pre-wrap">
                {store.txtTicket(ticketModal).replace(/\*/g, '')}
              </div>
              <div className="space-y-2">
                {ticketModal.estado === 'valido' && (
                  <div className="grid grid-cols-3 gap-2">
                    <Button className="bg-[#0e7c4a] hover:bg-[#0b6b3e] text-sm" onClick={() => shareWhatsApp(ticketModal)}>📲 WhatsApp</Button>
                    <Button className="bg-[#0088cc] hover:bg-[#0077b3] text-sm" onClick={() => shareTelegram(ticketModal)}>✈️ Telegram</Button>
                    <Button variant="outline" className="text-sm" onClick={() => copyTicket(ticketModal)}>📋 Copiar</Button>
                  </div>
                )}
                <Button variant="outline" className="w-full" onClick={() => setTicketModal(null)}>Cerrar</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CuadreTab({ terminalId }: { terminalId: string }) {
  const [f1, setF1] = useState(hoy());
  const [f2, setF2] = useState(hoy());
  const [calc, setCalc] = useState<ReturnType<typeof store.calcCuadre> | null>(null);

  const calcular = () => {
    if (!f1 || !f2 || f1 > f2) { alert('Revisa las fechas'); return; }
    setCalc(store.calcCuadre(terminalId, f1, f2));
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm text-[#12355b]">Cuadre de caja</CardTitle></CardHeader>
        <CardContent className="flex gap-2 flex-wrap items-end">
          <div>
            <label className="text-[10px] text-gray-500 block mb-0.5">Desde</label>
            <Input type="date" value={f1} onChange={e => setF1(e.target.value)} className="w-36" />
          </div>
          <div>
            <label className="text-[10px] text-gray-500 block mb-0.5">Hasta</label>
            <Input type="date" value={f2} onChange={e => setF2(e.target.value)} className="w-36" />
          </div>
          <Button className="bg-[#12355b]" onClick={calcular}>Calcular</Button>
        </CardContent>
      </Card>

      {calc && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Card className="bg-blue-50 border-blue-200"><CardContent className="p-3"><p className="text-xs text-gray-500">VENTAS</p><p className="text-lg font-bold text-[#12355b]">{cop(calc.ventas)}</p></CardContent></Card>
            <Card className="bg-red-50 border-red-200"><CardContent className="p-3"><p className="text-xs text-gray-500">PREMIOS</p><p className="text-lg font-bold text-red-700">{cop(calc.premios)}</p></CardContent></Card>
            <Card className="bg-purple-50 border-purple-200"><CardContent className="p-3"><p className="text-xs text-gray-500">COMISIÓN</p><p className="text-lg font-bold text-purple-700">{cop(calc.comision)}</p></CardContent></Card>
            <Card className="bg-gray-50 border-gray-200"><CardContent className="p-3"><p className="text-xs text-gray-500">SALDO ANT.</p><p className={`text-lg font-bold ${calc.saldoAnt < 0 ? 'text-red-600' : ''}`}>{cop(calc.saldoAnt)}</p></CardContent></Card>
            <Card className="bg-green-50 border-green-200 col-span-2"><CardContent className="p-3"><p className="text-xs text-gray-500">NETO A ENTREGAR</p><p className={`text-xl font-bold ${calc.neto < 0 ? 'text-red-600' : 'text-green-600'}`}>{calc.neto < 0 ? 'Pierde ' + cop(Math.abs(calc.neto)) : cop(calc.neto)}</p></CardContent></Card>
          </div>

          {calc.det.length > 0 && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-[#12355b]">Tickets ganadores ({calc.det.length})</CardTitle></CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="bg-gray-50 text-left text-xs text-gray-500"><th className="p-3">Ticket</th><th className="p-3">Fecha sorteo</th><th className="p-3">Lotería</th><th className="p-3">Jugadas</th><th className="p-3">Apostado</th><th className="p-3">Premio</th></tr></thead>
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
          )}
        </>
      )}
    </div>
  );
}
