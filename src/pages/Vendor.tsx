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
  const [tick, setTick] = useState(0); // fuerza re-render cuando cambia el store

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

  const numRef = useRef<HTMLInputElement>(null);
  const montoRef = useRef<HTMLInputElement>(null);

  const detectarTipo = (n: string): Jugada['modalidad'] | null => {
    const limpio = n.replace(/\D/g, '');
    if (limpio.length === 2) return 'terminal';
    if (limpio.length === 3) return 'triple';
    return null;
  };

  const tipoDetectado = detectarTipo(numero);
  const loterias = store.loterias.filter(l => {
    if (!l.activa && !l.activo) return false;
    if (!tipoDetectado) return true;
    if (tipoDetectado === 'terminal' && l.tipo !== 'animalito') return true;
    if (tipoDetectado === 'triple' && l.tipo !== 'animalito') return true;
    if (tipoDetectado === 'terminal' && l.tipo === 'animalito') return true;
    if (tipoDetectado === 'triple' && l.tipo === 'animalito') return false;
    return true;
  });

  const loteriasInvalidas = selLotes.filter(id => {
    const l = store.loteById(id);
    if (!l || !tipoDetectado) return false;
    if (tipoDetectado === 'triple' && l.tipo === 'animalito') return true;
    return false;
  });

  // Limpiar loterías seleccionadas que no aplican al tipo detectado
  useEffect(() => {
    if (loteriasInvalidas.length > 0) {
      setSelLotes(prev => prev.filter(id => !loteriasInvalidas.includes(id)));
    }
  }, [numero]);

  const toggleLoteria = (id: string) => {
    setSelLotes(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const selectAll = () => setSelLotes(loterias.map(l => l.id));
  const deselectAll = () => setSelLotes([]);

  const procesar = () => {
    setMsg('');
    const limpio = numero.replace(/\D/g, '');
    const tipo = detectarTipo(limpio);
    const m = +monto || 0;

    if (selLotes.length === 0) { setMsg('Selecciona al menos una lotería'); return; }
    if (!tipo) { setMsg('El número debe tener 2 cifras (terminal) o 3 cifras (triple)'); return; }
    if (m <= 0) { setMsg('Ingresa un monto válido'); return; }

    const n = limpio.padStart(tipo === 'terminal' ? 2 : 3, '0');

    const nuevos: PreviewItem[] = [];
    const actualizados: { idx: number; nuevoMonto: number }[] = [];
    selLotes.forEach(lid => {
      const idx = preview.findIndex(p => p.loteriaId === lid && p.modalidad === tipo && p.numero === n);
      if (idx >= 0) {
        actualizados.push({ idx, nuevoMonto: preview[idx].monto + m });
      } else {
        nuevos.push({ id: uid(), loteriaId: lid, modalidad: tipo, numero: n, monto: m });
      }
    });

    if (nuevos.length === 0 && actualizados.length === 0) return;

    setPreview(prev => {
      const copia = [...prev];
      actualizados.forEach(a => {
        copia[a.idx] = { ...copia[a.idx], monto: a.nuevoMonto };
      });
      return [...copia, ...nuevos];
    });
    setNumero('');
    // El monto se mantiene para la siguiente jugada
    setTimeout(() => numRef.current?.focus(), 0);
  };

  const eliminarDePreview = (id: string) => {
    setPreview(prev => prev.filter(p => p.id !== id));
  };

  const totalPreview = preview.reduce((s, p) => s + p.monto, 0);

const generarTicket = () => {
    if (preview.length === 0) { setMsg('Agrega al menos una jugada'); return; }
    const ticketId = uid().slice(0, 8).toUpperCase();
    const numTicket = store.siguienteNumero(terminal.id);
    const ahora = new Date();
    const t: Ticket = {
      id: ticketId,
      numero: numTicket,
      terminalId: terminal.id,
      taquilla: taq,
      jugadas: preview.map(p => ({ ...p, premio: 0 })),
      total: totalPreview,
      fecha: ahora.toISOString(),
      fechaSorteo,
      hora: ahora.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' }),
      estado: 'valido',
      montoPremio: 0,
      fechaPago: null,
    };
    store.addTicket(t);
    setTick(t => t + 1);
    setPreview([]);
    setNumero('');
    setMsg(`Ticket ${ticketId} generado`);
    setTimeout(() => setMsg(''), 3000);
  };
  const imprimirTicket = (ticketId: string) => {
    const t = store.tickets.find(x => x.id === ticketId);
    if (!t) return;
    const ventana = window.open('', '_blank');
    if (!ventana) return;
    const html = `
      <html><head><title>Ticket ${t.id}</title>
      <style>body{font-family:monospace;padding:20px;} h1{text-align:center;} table{width:100%;} td{padding:4px;}</style>
      </head><body>
      <h1>${store.config.nombreSistema || 'Banca Lottery'}</h1>
      <p>Ticket: ${t.id}<br>Fecha: ${new Date(t.fecha).toLocaleString()}<br>Sorteo: ${t.fechaSorteo}<br>Taquilla: ${t.taquilla}</p>
      <hr>
      <table>
      ${t.jugadas.map(j => {
        const l = store.loteById(j.loteriaId);
        const tipo = j.modalidad === 'terminal' ? 'Terminal' : 'Triple';
        return `<tr><td>${l?.nombre || j.loteriaId} - ${tipo} ${j.numero}</td><td>$${j.monto.toLocaleString()}</td></tr>`;
      }).join('')}
      </table>
      <hr>
      <p><strong>Total: $${t.total.toLocaleString()}</strong></p>
      <p style="text-align:center;">¡Buena suerte!</p>
      <script>window.onload=()=>window.print();</script>
      </body></html>
    `;
    ventana.document.write(html);
    ventana.document.close();
  };

  const ticketsHoy = store.tickets
    .filter(t => t.terminalId === terminal.id && t.fechaSorteo === fechaFiltro)
    .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

  const totalHoy = ticketsHoy.reduce((s, t) => s + t.total, 0);

  const ticketsParaCuadre = store.tickets
    .filter(t => t.terminalId === terminal.id && t.fechaSorteo === fechaFiltro && t.estado !== 'anulado');

  const totalCuadre = ticketsParaCuadre.reduce((s, t) => s + t.total, 0);
  const totalPremiosCuadre = ticketsParaCuadre.reduce((s, t) => s + (t.montoPremio || 0), 0);

  const buscarTicket = () => {
    setTicketEncontrado(null);
    setAnularMsg('');
    if (!ticketBuscar.trim()) { setAnularMsg('Ingresa un número de ticket'); return; }
    const t = store.tickets.find(x => x.id.toLowerCase() === ticketBuscar.trim().toLowerCase());
    if (!t) { setAnularMsg('Ticket no encontrado'); return; }
    if (t.terminalId !== terminal.id) { setAnularMsg('Este ticket no pertenece a esta taquilla'); return; }
    setTicketEncontrado(t);
  };

  const anularTicket = () => {
    if (!ticketEncontrado) return;
    if (!anularMotivo.trim()) { setAnularMsg('Ingresa un motivo'); return; }
    store.anularTicket(terminal.id, ticketEncontrado.numero, anularMotivo, terminal.codigo);
    setTicketEncontrado({ ...ticketEncontrado, estado: 'anulado', motivoAnulacion: anularMotivo });
    setTick(t => t + 1);
    setAnularMsg('Ticket anulado correctamente');
    setAnularMotivo('');
  };

  const buscarPremio = () => {
    setPremioTicket(null);
    setPremioMsg('');
    if (!premioNum.trim()) { setPremioMsg('Ingresa número de ticket'); return; }
    const t = store.tickets.find(x => x.id.toLowerCase() === premioNum.trim().toLowerCase());
    if (!t) { setPremioMsg('Ticket no encontrado'); return; }
    if (t.terminalId !== terminal.id) { setPremioMsg('Este ticket no pertenece a esta taquilla'); return; }
    if (t.estado === 'anulado') { setPremioMsg('Ticket anulado'); return; }
    setPremioTicket(t);
  };

  const marcarPremio = () => {
    if (!premioTicket) return;
    const monto = +prompt('Monto del premio a pagar:', '') || 0;
    if (monto <= 0) return;
    store.pagarPremio(premioTicket.id, monto);
    setPremioTicket({ ...premioTicket, estado: 'pagado', montoPremio: monto, fechaPago: new Date().toISOString() });
    setPremioMsg(`Premio de $${monto.toLocaleString()} marcado como pagado`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-[#1B4B7C] text-white px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="font-bold text-lg">{store.config.nombreSistema || 'Banca Lottery'}</h1>
          <p className="text-xs opacity-80">Taquilla: {taq}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={onLogout} className="text-white hover:bg-white/20">
          Salir
        </Button>
      </header>

      <nav className="flex border-b bg-white">
        {[
          { key: 'vender' as const, label: '🎰 Vender' },
          { key: 'tickets' as const, label: '🎫 Tickets' },
          { key: 'anular' as const, label: '🚫 Anular' },
          { key: 'cuadre' as const, label: '📊 Cuadre' },
          { key: 'premios' as const, label: '💰 Premios' },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`flex-1 py-3 text-sm font-medium ${tab === t.key ? 'text-[#1B4B7C] border-b-2 border-[#1B4B7C]' : 'text-gray-500'}`}>
            {t.label}
          </button>
        ))}
      </nav>

      <main className="mx-auto p-4 pb-20 max-w-md md:max-w-6xl">
        {tab === 'vender' && (
          <div className="flex flex-col md:flex-row gap-4">
            {/* Columna izquierda - Loterías y fecha */}
            <div className="md:w-1/3 space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">📅 Fecha del sorteo</CardTitle>
                </CardHeader>
                <CardContent>
                  <Input type="date" value={fechaSorteo} onChange={e => setFechaSorteo(e.target.value)} className="mt-1" />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex justify-between items-center">
                    <span>🎯 Loterías</span>
                    <div className="flex gap-1">
                      <Button variant="outline" size="sm" onClick={selectAll}>Todas</Button>
                      <Button variant="outline" size="sm" onClick={deselectAll}>Ninguna</Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 max-h-96 overflow-y-auto">
                  {loterias.length === 0 && <p className="text-sm text-gray-500">No hay loterías activas</p>}
                  {loterias.map(l => (
                    <div key={l.id} className="flex items-center space-x-2">
                      <Checkbox id={`lot-${l.id}`} checked={selLotes.includes(l.id)} onCheckedChange={() => toggleLoteria(l.id)} />
                      <label htmlFor={`lot-${l.id}`} className="text-sm cursor-pointer flex-1">
                        {l.nombre} <span className="text-xs text-gray-400">({l.tipo})</span>
                      </label>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Columna derecha - Jugada y preview */}
            <div className="md:w-2/3 space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">🎲 Nueva jugada</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-3 mb-3">
                    <div className="col-span-2">
                      <Input ref={numRef} value={numero} onChange={e => setNumero(e.target.value.replace(/\D/g, '').slice(0, 3))} placeholder="Número" className="text-center text-lg font-bold" />
                      <p className="text-xs text-gray-400 mt-1 text-center">{numero.length === 2 ? 'TERMINAL' : numero.length === 3 ? 'TRIPLE' : ''}</p>
                    </div>
                    <div>
                      <Input ref={montoRef} type="number" value={monto} onChange={e => setMonto(e.target.value)} placeholder="Monto" className="text-center text-lg font-bold" />
                    </div>
                  </div>
                  <Button onClick={procesar} className="w-full mt-3 bg-[#1B8B5C] hover:bg-[#147a4d]">
                    Procesar
                  </Button>
                </CardContent>
              </Card>

              {preview.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">🎫 Previsualización del ticket</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {preview.map(p => {
                        const l = store.loteById(p.loteriaId);
                        return (
                          <div key={p.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                            <div>
                              <p className="font-medium text-sm">{l?.nombre || p.loteriaId}</p>
                              <p className="text-xs text-gray-500">{p.numero} <span className="uppercase">{p.modalidad}</span> <span className="font-semibold">${p.monto.toLocaleString()}</span></p>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => eliminarDePreview(p.id)}>
                              🗑️
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex items-center justify-between mt-4 pt-3 border-t">
                      <p className="font-semibold text-sm">Jugadas: {preview.length}</p>
                      <p className="font-bold text-lg text-[#1B4B7C]">${totalPreview.toLocaleString()}</p>
                    </div>
                    <Button onClick={generarTicket} className="w-full mt-3 bg-[#1B4B7C] hover:bg-[#153d66]">
                      Generar ticket
                    </Button>
                  </CardContent>
                </Card>
              )}
              {msg && <p className="text-red-600 text-xs bg-red-50 p-3 rounded border border-red-200">{msg}</p>}
            </div>
          </div>
        )}

        {tab === 'tickets' && (
          <div className="space-y-4">
            <Card>
              <CardContent className="pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-gray-50 rounded">
                    <p className="text-2xl font-bold text-[#1B4B7C]">{ticketsHoy.length}</p>
                    <p className="text-xs text-gray-500">Tickets</p>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded">
                    <p className="text-2xl font-bold text-[#1B8B5C]">${totalHoy.toLocaleString()}</p>
                    <p className="text-xs text-gray-500">Total vendido</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {ticketsHoy.length === 0 && <p className="text-center text-gray-500 py-8">No hay tickets</p>}

            {ticketsHoy.map(t => (
              <Card key={t.id}>
                <CardContent className="pt-4">
                  <div className="flex justify-between mb-2">
                    <div>
                      <p className="font-semibold text-sm">Ticket #{t.id}</p>
                      <p className="text-xs text-gray-500">{new Date(t.fecha).toLocaleString()}</p>
                    </div>
                    <p className="font-bold text-[#1B4B7C]">${t.total.toLocaleString()}</p>
                  </div>
                  <div className="space-y-1 mb-3">
                    {t.jugadas.map((j, idx) => {
                      const l = store.loteById(j.loteriaId);
                      return (
                        <div key={idx} className="flex justify-between text-xs">
                          <span>{l?.nombre || j.loteriaId} - {j.modalidad === 'terminal' ? 'Terminal' : 'Triple'} {j.numero}</span>
                          <span className="font-medium">${j.monto.toLocaleString()}</span>
                        </div>
                      );
                    })}
                  </div>
                  <Button variant="outline" size="sm" className="w-full" onClick={() => imprimirTicket(t.id)}>
                    Reimprimir
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {tab === 'anular' && (
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">🚫 Anular ticket</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <Input value={ticketBuscar} onChange={e => setTicketBuscar(e.target.value)} placeholder="Número de ticket" />
                  <Button onClick={buscarTicket}>Buscar</Button>
                </div>
                {anularMsg && <p className={`text-xs p-2 rounded ${anularMsg.includes('correctamente') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>{anularMsg}</p>}
                {ticketEncontrado && (
                  <div className="p-3 bg-gray-50 rounded space-y-2">
                    <p className="text-sm font-semibold">Ticket #{ticketEncontrado.id}</p>
                    <p className="text-xs text-gray-500">Total: ${ticketEncontrado.total.toLocaleString()} · Estado: {ticketEncontrado.estado}</p>
                    {ticketEncontrado.estado !== 'anulado' && (
                      <>
                        <Input value={anularMotivo} onChange={e => setAnularMotivo(e.target.value)} placeholder="Motivo de anulación" />
                        <Button variant="destructive" size="sm" className="w-full" onClick={anularTicket}>Anular ticket</Button>
                      </>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {tab === 'cuadre' && (
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">📊 Cuadre del día</CardTitle></CardHeader>
              <CardContent>
                <Input type="date" value={fechaFiltro} onChange={e => setFechaFiltro(e.target.value)} className="mb-3" />
                <div className="grid grid-cols-3 gap-3 mb-3">
                  <div className="text-center p-3 bg-gray-50 rounded">
                    <p className="text-xl font-bold text-[#1B4B7C]">{ticketsParaCuadre.length}</p>
                    <p className="text-xs text-gray-500">Tickets</p>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded">
                    <p className="text-xl font-bold text-[#1B8B5C]">${totalCuadre.toLocaleString()}</p>
                    <p className="text-xs text-gray-500">Vendido</p>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded">
                    <p className="text-xl font-bold text-red-600">${totalPremiosCuadre.toLocaleString()}</p>
                    <p className="text-xs text-gray-500">Premios</p>
                  </div>
                </div>
                <div className="text-center p-3 bg-[#1B4B7C] text-white rounded">
                  <p className="text-2xl font-bold">${(totalCuadre - totalPremiosCuadre).toLocaleString()}</p>
                  <p className="text-xs">Neto</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {tab === 'premios' && (
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">💰 Pagar premio</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <Input value={premioNum} onChange={e => setPremioNum(e.target.value)} placeholder="Número de ticket" />
                  <Button onClick={buscarPremio}>Buscar</Button>
                </div>
                {premioMsg && <p className={`text-xs p-2 rounded ${premioMsg.includes('pagado') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>{premioMsg}</p>}
                {premioTicket && (
                  <div className="p-3 bg-gray-50 rounded space-y-2">
                    <p className="text-sm font-semibold">Ticket #{premioTicket.id}</p>
                    <p className="text-xs text-gray-500">Total: ${premioTicket.total.toLocaleString()} · Sorteo: {premioTicket.fechaSorteo}</p>
                    {premioTicket.estado !== 'pagado' ? (
                      <Button size="sm" className="w-full" onClick={marcarPremio}>Marcar como pagado</Button>
                    ) : (
                      <p className="text-xs text-green-600 font-medium">✓ Premio pagado: ${premioTicket.montoPremio?.toLocaleString()}</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}