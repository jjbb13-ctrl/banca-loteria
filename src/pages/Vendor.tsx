import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useStore } from '@/lib/store';
import { Trash2, Plus, CheckSquare, Ticket, LogOut, Printer, X, Calendar as CalendarIcon } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';

type Modalidad = 'triple' | 'cuadrupla' | 'terminal' | 'triple_zodiacal' | '4_zodiacal' | '2_zodiacal';
type TipoLoteria = 'triple' | 'animalito' | 'zodiacal';
type ItemLoteria = { id: string; nombre: string; tipo: TipoLoteria; activo: boolean };

function uid() { return Math.random().toString(36).slice(2) + Date.now().toString(36); }

type PreviewItem = { id: string; loteriaId: string; modalidad: Modalidad; numero: string; monto: number };

function detectarTipo(n: string): Modalidad | null {
  if (/^\d{2}$/.test(n)) return 'terminal';
  if (/^\d{3}$/.test(n)) return 'triple';
  return null;
}

function useFechaSorteo() {
  const [d, setD] = useState<Date>(() => {
    const saved = localStorage.getItem('banca_fecha_sorteo');
    return saved ? new Date(saved) : new Date();
  });
  useEffect(() => { localStorage.setItem('banca_fecha_sorteo', d.toISOString()); }, [d]);
  return { fechaSorteo: d, setFechaSorteo: setD };
}

export default function Vendor({ taq, onLogout }: { taq: string; onLogout: () => void }) {
  const store = useStore();
  const loterias = store.loterias;
  const config = store.config;

  const [tab, setTab] = useState<'vender' | 'tickets'>('vender');
  const [preview, setPreview] = useState<PreviewItem[]>([]);
  const [numero, setNumero] = useState('');
  const [monto, setMonto] = useState('');
  const [selLotes, setSelLotes] = useState<string[]>([]);
  const [msg, setMsg] = useState('');
  const [calOpen, setCalOpen] = useState(false);

  const { fechaSorteo, setFechaSorteo } = useFechaSorteo();

  const numRef = useRef<HTMLInputElement>(null);

  const [animales] = useState<{ numero: string; nombre: string }[]>(() => [
    { numero: '00', nombre: 'Delfín' }, { numero: '01', nombre: 'Carnero' },
    { numero: '02', nombre: 'Toro' }, { numero: '03', nombre: 'Ciempiés' },
    { numero: '04', nombre: 'Alacrán' }, { numero: '05', nombre: 'León' },
    { numero: '06', nombre: 'Rana' }, { numero: '07', nombre: 'Perico' },
    { numero: '08', nombre: 'Ratón' }, { numero: '09', nombre: 'Águila' },
    { numero: '10', nombre: 'Tigre' }, { numero: '11', nombre: 'Gato' },
    { numero: '12', nombre: 'Caballo' }, { numero: '13', nombre: 'Mono' },
    { numero: '14', nombre: 'Paloma' }, { numero: '15', nombre: 'Zorro' },
    { numero: '16', nombre: 'Oso' }, { numero: '17', nombre: 'Pavo' },
    { numero: '18', nombre: 'Burro' }, { numero: '19', nombre: 'Chivo' },
    { numero: '20', nombre: 'Cochino' }, { numero: '21', nombre: 'Gallo' },
    { numero: '22', nombre: 'Camello' }, { numero: '23', nombre: 'Cebra' },
    { numero: '24', nombre: 'Iguana' }, { numero: '25', nombre: 'Gallina' },
    { numero: '26', nombre: 'Vaca' }, { numero: '27', nombre: 'Perro' },
    { numero: '28', nombre: 'Zamuro' }, { numero: '29', nombre: 'Elefante' },
    { numero: '30', nombre: 'Caimán' }, { numero: '31', nombre: 'Lapa' },
    { numero: '32', nombre: 'Ardilla' }, { numero: '33', nombre: 'Pescado' },
    { numero: '34', nombre: 'Venado' }, { numero: '35', nombre: 'Jirafa' },
    { numero: '36', nombre: 'Culebra' }, { numero: '37', nombre: 'Tortuga' },
    { numero: '38', nombre: 'Ballena' }, { numero: '39', nombre: 'Lechuza' },
    { numero: '40', nombre: 'Araña' }, { numero: '41', nombre: 'Cangrejo' },
    { numero: '42', nombre: 'Mariposa' }, { numero: '43', nombre: 'Conejo' },
    { numero: '44', nombre: 'Tiburón' }, { numero: '45', nombre: 'Leopardo' },
    { numero: '46', nombre: 'Muerciélago' }, { numero: '47', nombre: 'Hormiga' },
    { numero: '48', nombre: 'Cocodrilo' }, { numero: '49', nombre: 'Pulpo' },
    { numero: '50', nombre: 'Escorpión' }, { numero: '51', nombre: 'Jaguar' },
    { numero: '52', nombre: 'Ardilla' }, { numero: '53', nombre: 'Rinoceronte' },
    { numero: '54', nombre: 'Sapo' }, { numero: '55', nombre: 'Cabra' },
    { numero: '56', nombre: 'Yegua' }, { numero: '57', nombre: 'Camarón' },
    { numero: '58', nombre: 'Búfalo' }, { numero: '59', nombre: 'Abeja' },
    { numero: '60', nombre: 'Pantera' }, { numero: '61', nombre: 'Oso hormiguero' },
    { numero: '62', nombre: 'Mapache' }, { numero: '63', nombre: 'Hiena' },
    { numero: '64', nombre: 'Chigüire' }, { numero: '65', nombre: 'Oveja' },
    { numero: '66', nombre: 'Mosquito' }, { numero: '67', nombre: 'Serpiente' },
    { numero: '68', nombre: 'Ciervo' }, { numero: '69', nombre: 'Cóndor' },
    { numero: '70', nombre: 'Lobo' }, { numero: '71', nombre: 'Búho' },
    { numero: '72', nombre: 'Zorrillo' }, { numero: '73', nombre: 'Gorrión' },
    { numero: '74', nombre: 'Borrego' }, { numero: '75', nombre: 'Garza' },
    { numero: '76', nombre: 'Guacamaya' }, { numero: '77', nombre: 'Pelícano' },
    { numero: '78', nombre: 'Manatí' }, { numero: '79', nombre: 'Avispa' },
    { numero: '80', nombre: 'Piraña' }, { numero: '81', nombre: 'Cachicamo' },
    { numero: '82', nombre: 'Puma' }, { numero: '83', nombre: 'Zamuro' },
    { numero: '84', nombre: 'Babosa' }, { numero: '85', nombre: 'Pavo real' },
    { numero: '86', nombre: 'Pato' }, { numero: '87', nombre: 'Guaráo' },
    { numero: '88', nombre: 'Pecarí' }, { numero: '89', nombre: 'Cachama' },
    { numero: '90', nombre: 'Gavilán' }, { numero: '91', nombre: 'Tucán' },
    { numero: '92', nombre: 'Hipopótamo' }, { numero: '93', nombre: 'Canario' },
    { numero: '94', nombre: 'Cardenal' }, { numero: '95', nombre: 'Arpa' },
    { numero: '96', nombre: 'Arenque' }, { numero: '97', nombre: 'Mariquita' },
    { numero: '98', nombre: 'Chigüiro' }, { numero: '99', nombre: 'Ancoa' },
  ]);

  const animalesMap = useMemo(() => {
    const m = new Map<string, string>();
    animales.forEach(a => m.set(a.numero, a.nombre));
    return m;
  }, [animales]);

  const loteActivo = useMemo(() => loterias.filter(l => l.activo), [loterias]);

  const toggleLoteria = (id: string) => {
    setSelLotes(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const selectAll = () => {
    setSelLotes(loteActivo.map(l => l.id));
  };

  const deselectAll = () => setSelLotes([]);

  const procesar = () => {
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
    const ahora = new Date();
    const t = {
      id: ticketId,
      taquilla: taq,
      jugadas: preview.map(p => ({ ...p })),
      total: totalPreview,
      fecha: ahora.toISOString(),
      fechaSorteo: fechaSorteo.toISOString(),
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
    const doc = new jsPDF({ unit: 'mm', format: [80, 160] });
    let y = 10;
    doc.setFontSize(12);
    doc.text(config.nombreSistema || 'Banca Lottery', 40, y, { align: 'center' });
    y += 6;
    doc.setFontSize(10);
    doc.text(`Ticket: ${t.id}`, 40, y, { align: 'center' });
    y += 5;
    doc.text(`Fecha: ${format(new Date(t.fecha), 'dd/MM/yyyy HH:mm')}`, 40, y, { align: 'center' });
    y += 5;
    doc.text(`Sorteo: ${format(new Date(t.fechaSorteo), 'dd/MM/yyyy')}`, 40, y, { align: 'center' });
    y += 5;
    doc.text(`Taquilla: ${t.taquilla}`, 40, y, { align: 'center' });
    y += 6;
    doc.setFontSize(9);
    t.jugadas.forEach(j => {
      const l = store.loteById(j.loteriaId);
      const tipo = j.modalidad === 'terminal' ? 'Terminal' : j.modalidad === 'triple' ? 'Triple' : j.modalidad;
      doc.text(`${l?.nombre || j.loteriaId} - ${tipo} ${j.numero}`, 5, y);
      y += 4;
      doc.text(`Monto: $${j.monto.toLocaleString()}`, 5, y);
      y += 5;
    });
    y += 3;
    doc.setFontSize(11);
    doc.text(`Total: $${t.total.toLocaleString()}`, 40, y, { align: 'center' });
    y += 8;
    doc.setFontSize(9);
    doc.text('¡Buena suerte!', 40, y, { align: 'center' });
    doc.autoPrint();
    window.open(doc.output('bloburl'), '_blank');
  };

  const ticketsHoy = store.tickets.filter(t => {
    const f = new Date(t.fecha);
    const hoy = new Date();
    return f.getDate() === hoy.getDate() && f.getMonth() === hoy.getMonth() && f.getFullYear() === hoy.getFullYear();
  }).sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

  const totalHoy = ticketsHoy.reduce((s, t) => s + t.total, 0);

  const agrupados = useMemo(() => {
    const map = new Map<string, { loteria: string; modalidad: Modalidad; numero: string; monto: number; ids: string[] }>();
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
  }, [preview, store]);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-[#1B4B7C] text-white px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="font-bold text-lg">{config.nombreSistema || 'Banca Lottery'}</h1>
          <p className="text-xs opacity-80">Taquilla: {taq}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={onLogout} className="text-white hover:bg-white/20">
            <LogOut className="w-4 h-4 mr-1" /> Salir
          </Button>
        </div>
      </header>

      <nav className="flex border-b bg-white">
        <button onClick={() => setTab('vender')} className={`flex-1 py-3 text-sm font-medium ${tab === 'vender' ? 'text-[#1B4B7C] border-b-2 border-[#1B4B7C]' : 'text-gray-500'}`}>
          🎰 Vender
        </button>
        <button onClick={() => setTab('tickets')} className={`flex-1 py-3 text-sm font-medium ${tab === 'tickets' ? 'text-[#1B4B7C] border-b-2 border-[#1B4B7C]' : 'text-gray-500'}`}>
          🎫 Tickets ({ticketsHoy.length})
        </button>
      </nav>

      <main className="mx-auto p-4 pb-20 max-w-md md:max-w-6xl">
        {tab === 'vender' && (
          <div className="flex flex-col md:flex-row gap-4">
            {/* Columna izquierda - Loterías y fecha */}
            <div className="md:w-1/3 space-y-4">
              <div className="bg-white rounded-xl shadow-sm border p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-[#1B4B7C]">📅 Fecha del sorteo</h3>
                  <Dialog open={calOpen} onOpenChange={setCalOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <CalendarIcon className="w-4 h-4 mr-1" />
                        {format(fechaSorteo, 'dd/MM/yyyy')}
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Seleccionar fecha</DialogTitle>
                      </DialogHeader>
                      <Calendar mode="single" selected={fechaSorteo} onSelect={(d) => { if (d) { setFechaSorteo(d); setCalOpen(false); } }} locale={es} />
                    </DialogContent>
                  </Dialog>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-[#1B4B7C]">🎯 Loterías</h3>
                  <div className="flex gap-1">
                    <Button variant="outline" size="sm" onClick={selectAll}>
                      <CheckSquare className="w-3 h-3 mr-1" /> Todas
                    </Button>
                    <Button variant="outline" size="sm" onClick={deselectAll}>
                      <X className="w-3 h-3 mr-1" /> Ninguna
                    </Button>
                  </div>
                </div>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {loteActivo.length === 0 && <p className="text-sm text-gray-500">No hay loterías activas</p>}
                  {loteActivo.map(l => (
                    <div key={l.id} className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-50">
                      <Checkbox id={`lot-${l.id}`} checked={selLotes.includes(l.id)} onCheckedChange={() => toggleLoteria(l.id)} />
                      <Label htmlFor={`lot-${l.id}`} className="text-sm cursor-pointer flex-1">
                        {l.nombre}
                        <span className="ml-2 text-xs text-gray-400 capitalize">({l.tipo})</span>
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Columna derecha - Jugada y preview */}
            <div className="md:w-2/3 space-y-4">
              <div className="bg-white rounded-xl shadow-sm border p-4">
                <h3 className="font-semibold text-[#1B4B7C] mb-3">🎲 Nueva jugada</h3>
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <Label className="text-xs mb-1 block">Número (2=terminal, 3=triple)</Label>
                    <Input ref={numRef} value={numero} onChange={e => setNumero(e.target.value.replace(/\D/g, '').slice(0, 3))} placeholder="510" className="text-center text-lg font-bold" />
                    <p className="text-xs text-gray-400 mt-1 text-center">{numero.length === 2 ? 'TERMINAL' : numero.length === 3 ? 'TRIPLE' : ''}</p>
                  </div>
                  <div>
                    <Label className="text-xs mb-1 block">Monto (COP)</Label>
                    <Input type="number" value={monto} onChange={e => setMonto(e.target.value)} placeholder="5000" className="text-center text-lg font-bold" />
                  </div>
                </div>
                <Button onClick={procesar} className="w-full mt-3 bg-[#1B8B5C] hover:bg-[#147a4d]">
                  <Plus className="w-4 h-4 mr-1" /> Procesar
                </Button>
              </div>

              {preview.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border p-4">
                  <h3 className="font-semibold text-[#1B4B7C] mb-3">🎫 Previsualización del ticket</h3>
                  <div className="space-y-2">
                    {agrupados.map((g, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium text-sm">{g.loteria}</p>
                          <p className="text-xs text-gray-500">{g.numero} <span className="uppercase">{g.modalidad}</span> <span className="font-semibold">${g.monto.toLocaleString()}</span></p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-400">{g.ids.length > 1 ? `${g.ids.length}x` : ''}</span>
                          <Button variant="ghost" size="sm" onClick={() => g.ids.forEach(id => eliminarDePreview(id))}>
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between mt-4 pt-3 border-t">
                    <p className="font-semibold text-sm">Jugadas: {agrupados.length}</p>
                    <p className="font-bold text-lg text-[#1B4B7C]">${totalPreview.toLocaleString()}</p>
                  </div>
                  <Button onClick={generarTicket} className="w-full mt-3 bg-[#1B4B7C] hover:bg-[#153d66]">
                    <Ticket className="w-4 h-4 mr-1" /> Generar ticket
                  </Button>
                </div>
              )}
              {msg && <p className="text-red-600 text-xs bg-red-50 p-3 rounded-lg border border-red-200">{msg}</p>}
            </div>
          </div>
        )}

        {tab === 'tickets' && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl shadow-sm border p-4">
              <h3 className="font-semibold text-[#1B4B7C] mb-2">📊 Resumen de hoy</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <p className="text-2xl font-bold text-[#1B4B7C]">{ticketsHoy.length}</p>
                  <p className="text-xs text-gray-500">Tickets</p>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <p className="text-2xl font-bold text-[#1B8B5C]">${totalHoy.toLocaleString()}</p>
                  <p className="text-xs text-gray-500">Total vendido</p>
                </div>
              </div>
            </div>

            {ticketsHoy.length === 0 && <p className="text-center text-gray-500 py-8">No hay tickets hoy</p>}

            {ticketsHoy.map(t => (
              <div key={t.id} className="bg-white rounded-xl shadow-sm border p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="font-semibold text-sm">Ticket #{t.id}</p>
                    <p className="text-xs text-gray-500">{format(new Date(t.fecha), 'dd/MM/yyyy HH:mm')}</p>
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
                  <Printer className="w-4 h-4 mr-1" /> Reimprimir
                </Button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}