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

  const [fechaFiltro, setFechaFiltro] = useState(hoy());
  const [ticketBuscar, setTicketBuscar] = useState('');
  const [ticketEncontrado, setTicketEncontrado] = useState<Ticket | null>(null);
  const [anularMsg, setAnularMsg] = useState('');
  const [anularMotivo, setAnularMotivo] = useState('');

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
    if (!l.activo) return false;
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
    setTimeout(() => numRef.current?.focus(), 0);
  };

  const eliminarDePreview = (id: string) => {
    setPreview(prev => prev.filter(p => p.id !== id));
  };

  const totalPreview = preview.reduce((s, p) => s + p.monto, 0);

  const generarTicket = () => {
    if (preview.length === 0) { setMsg('Agrega al menos una jugada'); return; }
    const ticketId = uid().slice(0, 8).toUpperCase();
    const t: Ticket = {
      id: ticketId,
      taquilla: taq,
      jugadas: preview.map(p => ({ ...p, premio: 0 })),
      total: totalPreview,
      fecha: new Date().toISOString(),
      fechaSorteo: fechaSorteo.toISOString(),
      anulado: false,
    };
    store.addTicket(t);
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
      <p>Ticket: ${t.id}<br>Fecha: ${new Date(t.fecha).toLocaleString()}<br>Sorteo: ${new Date(t.fechaSorteo).toLocaleDateString()}<br>Taquilla: ${t.taquilla}</p>
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

  const ticketsHoy = store.tickets.filter(t => {
    const f = new Date(t.fecha);
    const hoyDate = new Date();
    return f.toDateString() === hoyDate.toDateString();
  }).sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

  const totalHoy = ticketsHoy.reduce((s, t) => s + t.total, 0);

  const agrupados = useMemo(() => {
    const map = new Map<string, { loteria: string; modalidad: Jugada['modalidad']; numero: string; monto: number; ids: string[] }>();
    preview.forEach(p => {
      const key = `${p.loteriaId}-${p.modalidad}-${p.numero}`;
      if (map.has(key)) {
        const g = map.get(key)!;
        g.monto += p.monto;
        g.ids.push(p.id);
      } else {
        const l = store.loteById(p.loteriaId);
        map.set(key, { loteria: l?.nombre || p.loteriaId, modalidad: p.modalidad, numero: p.numero, monto: p.monto, ids: [p.id] });
      }
    });
    return Array.from(map.values());
  }, [preview]);

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
        <button onClick={() => setTab('vender')} className={`flex-1 py-3 text-sm font-medium ${tab === 'vender' ? 'text-[#1B4B7C] border-b-2 border-[#1B4B7C]' : 'text-gray-500'}`}>
          Vender
        </button>
        <button onClick={() => setTab('tickets')} className={`flex-1 py-3 text-sm font-medium ${tab === 'tickets' ? 'text-[#1B4B7C] border-b-2 border-[#1B4B7C]' : 'text-gray-500'}`}>
          Tickets ({ticketsHoy.length})
        </button>
      </nav>

      <main className="mx-auto p-4 pb-20 max-w-md md:max-w-6xl">
        {tab === 'vender' && (
          <div className="flex flex-col md:flex-row gap-4">
            <div className="md:w-1/3 space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Fecha del sorteo</CardTitle>
                </CardHeader>
                <CardContent>
                  <Input type="date" value={fechaSorteo.toISOString().split('T')[0]} onChange={e => setFechaSorteo(new Date(e.target.value))} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex justify-between items-center">
                    <span>Loterías</span>
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

            <div className="md:w-2/3 space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Nueva jugada</CardTitle>
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
                  <Button onClick={procesar} className="w-full bg-[#1B8B5C] hover:bg-[#147a4d]">
                    Procesar
                  </Button>
                </CardContent>
              </Card>

              {preview.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Previsualización</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {agrupados.map((g, i) => (
                        <div key={i} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <div>
                            <p className="font-medium text-sm">{g.loteria}</p>
                            <p className="text-xs text-gray-500">{g.numero} {g.modalidad.toUpperCase()} ${g.monto.toLocaleString()}</p>
                          </div>
                          <Button variant="ghost" size="sm" onClick={() => g.ids.forEach(id => eliminarDePreview(id))}>
                            🗑️
                          </Button>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between mt-4 pt-3 border-t">
                      <p className="font-semibold text-sm">Jugadas: {agrupados.length}</p>
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

            {ticketsHoy.length === 0 && <p className="text-center text-gray-500 py-8">No hay tickets hoy</p>}

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
      </main>
    </div>
  );
}