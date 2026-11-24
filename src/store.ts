import type {
  Config, Terminal, Vendedor, Loteria, Sorteo, ResultadoSorteo,
  Ticket, Jugada, EstadoCuenta, Cupo, LogAuditoria,
  Turno, Modalidad
} from './types';
import { isFirebaseConfigured, firebaseSet, firebaseOnValue, firebaseGetOnce, initFirebase } from './firebase';
import * as api from './api-client';

// ── Utilidades ──────────────────────────────────────────────
export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
export const hoy = () => new Date().toISOString().slice(0, 10);
export const ahora = () => new Date().toLocaleString('es-VE', { timeZone: 'America/Caracas' });

export const cop = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n || 0);

export const NOMJ: Record<string, string> = {
  terminal: 'TERMINAL',
  triple: 'TRIPLE',
  cuadrupla: '4 CIFRAS',
  triple_zodiacal: 'TRIPLE ZOD.',
  '4_zodiacal': '4 ZODIACAL',
  '2_zodiacal': '2 ZODIACAL',
};

export const NOMT: Record<Turno, string> = {
  manana: 'MAÑANA',
  tarde: 'TARDE',
  noche: 'NOCHE',
};

// ── Tab ID para pestañas independientes (solo sesión) ──────
const TAB_ID = sessionStorage.getItem('banca_tab_id') ||
  Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
sessionStorage.setItem('banca_tab_id', TAB_ID);

// Datos GLOBALES (compartidos entre todas las pestañas)
const GG = <T>(k: string, d: T): T => {
  try {
    const v = localStorage.getItem('banca_global_' + k);
    return v ? JSON.parse(v) : d;
  } catch { return d; }
};
const SG = (k: string, v: unknown) => localStorage.setItem('banca_global_' + k, JSON.stringify(v));

// ── STORE ───────────────────────────────────────────────────
class Store {
  config: Config;
  terminales: Terminal[];
  vendedores: Vendedor[];
  loterias: Loteria[];
  sorteos: Sorteo[];
  tickets: Ticket[];
  estadosCuenta: EstadoCuenta[];
  cupos: Cupo[];
  logs: LogAuditoria[];
  contadores: Record<string, number>;

  private syncTimer: ReturnType<typeof setTimeout> | null = null;
  private syncPending = false;
  private isLoading = false;

  constructor() {
    const hasData = !!localStorage.getItem('banca_global_seed');

    this.config = GG('config', { minApuesta: 500, maxNumero: 100000, tiempoLimiteAnulacionMin: 30, comisionDefault: 10, alertaCupoPct: 80 });
    this.terminales = GG('terminales', []);
    this.vendedores = GG('vendedores', []);
    this.loterias = GG('loterias', []);
    this.sorteos = GG('sorteos', []);
    this.tickets = GG('tickets', []);
    this.estadosCuenta = GG('estadosCuenta', []);
    this.cupos = GG('cupos', []);
    this.logs = GG('logs', []);
    this.contadores = GG('contadores', {});

       if (!hasData && !isFirebaseConfigured()) {
      // Solo crear datos de demo si NO hay Firebase (modo offline local)
      this.seed();
    } else if (hasData) {
      // MIGRACIÓN: agregar campos nuevos sin perder datos existentes
      this.migrar();
    }

    if (isFirebaseConfigured()) {
      this.loadFromFirebase();
    } else {
      this.loadFromBackend();
    }
  }

  async loadFromFirebase() {
    try {
      const remote = await firebaseGetOnce('data_global') as any;
      if (remote) {
        this.config = remote.config ?? this.config;
        this.terminales = remote.terminales ?? this.terminales;
        this.vendedores = remote.vendedores ?? this.vendedores;
        this.loterias = remote.loterias ?? this.loterias;
        this.sorteos = remote.sorteos ?? this.sorteos;
               this.tickets = (remote.tickets ?? this.tickets).map((t: Ticket) => {
          const loteriaId = t.loteriaId || t.jugadas?.[0]?.loteriaId || '';
          const lot = this.loteById(loteriaId);
          return {
            ...t,
            loteriaId,
            sorteoId: t.sorteoId || loteriaId + '_' + (t.fechaSorteo || hoy()),
            turno: t.turno || lot?.turno || 'manana',
            ts: t.ts || Date.now(),
          };
        });
        this.estadosCuenta = remote.estadosCuenta ?? this.estadosCuenta;
        this.cupos = remote.cupos ?? this.cupos;
        this.logs = remote.logs ?? this.logs;
        this.contadores = remote.contadores ?? this.contadores;
        this.lastLocalTs = remote.ts || Date.now();
        this.saveLocalOnly();
        window.dispatchEvent(new CustomEvent('banca-sync'));
        console.log('Datos cargados desde Firebase');
      }
    } catch (e) {
      console.warn('No se pudo cargar desde Firebase:', e);
    }
  }

  async loadFromBackend() {
    if (this.isLoading) return;
    this.isLoading = true;
    try {
      const data = await api.syncAll();
      if (data.loterias.length > 0) {
        this.config = data.config || this.config;
        this.loterias = data.loterias;
        this.vendedores = data.vendedores;
        this.terminales = data.terminales;
        this.tickets = data.tickets;
        this.sorteos = data.sorteos;
        this.cupos = data.cupos;
        this.estadosCuenta = data.estadosCuenta;
        this.logs = data.logs;
        this.saveLocalOnly();
        window.dispatchEvent(new CustomEvent('banca-sync'));
      }
    } catch (e) {
      console.warn('No se pudo cargar del backend, usando localStorage:', e);
    } finally {
      this.isLoading = false;
    }
  }

  save() {
    this.saveLocalOnly();
    SG('contadores', this.contadores);
    this.lastLocalTs = Date.now();
    this.syncToFirebase();

    this.syncPending = true;
    if (this.syncTimer) clearTimeout(this.syncTimer);
    this.syncTimer = setTimeout(() => this.syncToBackend(), 2000);
  }

  private async syncToBackend() {
    if (!this.syncPending) return;
    this.syncPending = false;
    try {
      await api.syncSeed({
        config: this.config,
        loterias: this.loterias,
        vendedores: this.vendedores,
        terminales: this.terminales,
        tickets: this.tickets,
        sorteos: this.sorteos,
        cupos: this.cupos,
        estadosCuenta: this.estadosCuenta,
        logs: this.logs,
      });
      console.log('Sync OK');
    } catch (e) {
      console.warn('Sync failed, will retry on next save:', e);
      this.syncPending = true;
    }
  }

  private syncToFirebase() {
    if (!isFirebaseConfigured()) return;
    initFirebase();
    firebaseSet('data_global', {
      config: this.config,
      terminales: this.terminales,
      vendedores: this.vendedores,
      loterias: this.loterias,
      sorteos: this.sorteos,
      tickets: this.tickets,
      estadosCuenta: this.estadosCuenta,
      cupos: this.cupos,
      logs: this.logs,
      contadores: this.contadores,
      ts: Date.now(),
    });
  }

  startFirebaseSync(cb: () => void) {
    if (!isFirebaseConfigured()) return () => {};
    initFirebase();
    return firebaseOnValue('data_global', (remote: any) => {
      if (!remote) return;
      this.config = remote.config ?? this.config;
      this.terminales = remote.terminales ?? this.terminales;
      this.vendedores = remote.vendedores ?? this.vendedores;
      this.loterias = remote.loterias ?? this.loterias;
      this.sorteos = remote.sorteos ?? this.sorteos;
             this.tickets = (remote.tickets ?? this.tickets).map((t: Ticket) => {
          const loteriaId = t.loteriaId || t.jugadas?.[0]?.loteriaId || '';
          const lot = this.loteById(loteriaId);
          return {
            ...t,
            loteriaId,
            sorteoId: t.sorteoId || loteriaId + '_' + (t.fechaSorteo || hoy()),
            turno: t.turno || lot?.turno || 'manana',
            ts: t.ts || Date.now(),
          };
        });
      this.estadosCuenta = remote.estadosCuenta ?? this.estadosCuenta;
      this.cupos = remote.cupos ?? this.cupos;
      this.logs = remote.logs ?? this.logs;
      this.contadores = remote.contadores ?? this.contadores;
      this.lastLocalTs = remote.ts || Date.now();
      this.saveLocalOnly();
      window.dispatchEvent(new CustomEvent('banca-sync'));
      cb();
    });
  }

  private lastLocalTs = 0;

  log(accion: LogAuditoria['accion'], entidad: string, entidadId: string, detalle: string, usuario = 'SISTEMA') {
    const log: LogAuditoria = {
      id: uid(), usuario, accion, entidad, entidadId,
      ts: Date.now(), detalle,
    };
    this.logs.unshift(log);
    if (this.logs.length > 5000) this.logs = this.logs.slice(0, 5000);
    this.save();
  }

  terminalByCod(cod: string): Terminal | undefined {
    return this.terminales.find(t => t.codigo === cod);
  }
  terminalById(id: string): Terminal | undefined {
    return this.terminales.find(t => t.id === id);
  }
  vendedorById(id: string): Vendedor | undefined {
    return this.vendedores.find(v => v.id === id);
  }
  loteById(id: string): Loteria | undefined {
    return this.loterias.find(l => l.id === id);
  }
  sorteoById(id: string): Sorteo | undefined {
    return this.sorteos.find(s => s.id === id);
  }

  siguienteNumero(terminalId: string): number {
    const actual = this.contadores[terminalId] || 0;
    this.contadores[terminalId] = actual + 1;
    return this.contadores[terminalId];
  }

  addTicket(t: Ticket) {
    this.tickets.push(t);
    t.jugadas.forEach(j => {
      const sid = j.loteriaId + '_' + t.fechaSorteo;
      this.acumularCupo(sid, j.modalidad, j.numero, j.monto);
    });
    this.log('venta', 'ticket', t.id, `Ticket #${t.numero} por ${cop(t.total)}`, t.terminalId);
    this.save();
  }

  getCupo(sorteoId: string, modalidad: Modalidad, numero: string): Cupo {
    const id = sorteoId + '_' + modalidad + '_' + numero;
    let c = this.cupos.find(x => x.id === id);
    if (!c) {
      c = { id, sorteoId, loteriaId: sorteoId.split('_')[0], modalidad, numero, limite: this.config.maxNumero, acumulado: 0, alerta80: false, alerta100: false };
      this.cupos.push(c);
    }
    return c;
  }

  acumularCupo(sorteoId: string, modalidad: Modalidad, numero: string, monto: number) {
    const c = this.getCupo(sorteoId, modalidad, numero);
    c.acumulado += monto;
    c.alerta80 = c.acumulado >= c.limite * this.config.alertaCupoPct / 100;
    c.alerta100 = c.acumulado >= c.limite;
    this.save();
  }

  quitarCupo(sorteoId: string, modalidad: Modalidad, numero: string, monto: number) {
    const c = this.getCupo(sorteoId, modalidad, numero);
    c.acumulado = Math.max(0, c.acumulado - monto);
    c.alerta80 = c.acumulado >= c.limite * this.config.alertaCupoPct / 100;
    c.alerta100 = c.acumulado >= c.limite;
    this.save();
  }

  cupoDisponible(sorteoId: string, modalidad: Modalidad, numero: string, terminalId?: string): number {
    const c = this.getCupo(sorteoId, modalidad, numero);
    let limite = c.limite;
    if (terminalId) {
      const term = this.terminalById(terminalId);
      if (term?.cuposPorLoteria) {
        const cl = term.cuposPorLoteria[sorteoId.split('_')[0]];
        if (cl && cl < limite) limite = cl;
      }
    }
    return Math.max(0, limite - c.acumulado);
  }

  anularTicket(terminalId: string, numeroTicket: number, motivo: string, anuladoPor: string) {
    const t = this.tickets.find(x => x.terminalId === terminalId && x.numero === numeroTicket);
    if (!t) return { ok: false, msg: 'Ticket no encontrado' };
    if (t.estado === 'anulado') return { ok: false, msg: 'Ya está anulado' };
    const limiteMs = (this.config.tiempoLimiteAnulacionMin || 30) * 60 * 1000;
    if (Date.now() - (t.ts || 0) > limiteMs) return { ok: false, msg: 'Fuera de tiempo límite para anular' };
    t.estado = 'anulado';
    t.anuladoTs = Date.now();
    t.anuladoPor = anuladoPor;
    t.motivoAnulacion = motivo;
    t.jugadas.forEach(j => {
      const sid = j.loteriaId + '_' + t.fechaSorteo;
      this.quitarCupo(sid, j.modalidad, j.numero, j.monto);
    });
    this.log('anulacion', 'ticket', t.id, `Ticket #${t.numero} anulado: ${motivo}`, anuladoPor);
    this.save();
    return { ok: true, msg: 'Ticket anulado' };
  }

  pagarPremio(terminalId: string, numeroTicket: number, monto: number, pagadoPor: string) {
    const t = this.tickets.find(x => x.terminalId === terminalId && x.numero === numeroTicket);
    if (!t) return { ok: false, msg: 'Ticket no encontrado' };
    if (t.estado !== 'valido') return { ok: false, msg: 'Ticket no válido' };
    t.estado = 'pagado';
    t.montoPremio = monto;
    t.pagadoTs = Date.now();
    t.pagadoPor = pagadoPor;
    this.log('pago_premio', 'ticket', t.id, `Premio $${monto} pagado`, pagadoPor);
    this.save();
    return { ok: true, msg: 'Premio registrado' };
  }

  premioTicket(t: Ticket): number {
    if (t.estado === 'anulado') return 0;
    const s = this.sorteoById(t.sorteoId);
    const lote = this.loteById(t.loteriaId);
    if (!s?.resultado || !lote || t.estado !== 'valido') return 0;
    const num = s.resultado.num;
    let premio = 0;
    for (const j of t.jugadas) {
      const gano = j.modalidad === 'triple' && num.slice(-3) === j.numero
        || j.modalidad === 'terminal' && num.slice(-2) === j.numero
        || j.modalidad === 'cuadrupla' && num === j.numero
        || j.modalidad === 'triple_zodiacal' && num.slice(-3) === j.numero
        || j.modalidad === '4_zodiacal' && num === j.numero
        || j.modalidad === '2_zodiacal' && num.slice(-2) === j.numero;
      if (gano) premio += j.monto * (lote.pagos[j.modalidad] || 1);
    }
    return premio;
  }

  alertasCupo(loteriaId: string, fecha: string) {
    const sid = loteriaId + '_' + fecha;
    return this.cupos
      .filter(c => c.sorteoId === sid && (c.alerta80 || c.alerta100))
      .map(c => ({ ...c, nombre: this.loteById(c.loteriaId)?.nombre || '?' }));
  }

  detalleTerminal(terminalId: string, fechaDesde: string, fechaHasta: string) {
    const ts = this.tickets.filter(t => t.terminalId === terminalId && t.fechaSorteo >= fechaDesde && t.fechaSorteo <= fechaHasta && t.estado !== 'anulado');
    const ventas = ts.reduce((s, t) => s + t.total, 0);
    const premios = ts.reduce((s, t) => s + (t.montoPremio || 0), 0);
    return { tickets: ts.length, ventas, premios, neto: ventas - premios };
  }

  ventasPorLoteria(loteriaId: string, fecha: string) {
    const porMod: Record<string, { monto: number; apuestas: number; det: { t: Ticket; j: Jugada }[] }> = {};
    this.tickets.forEach(t => {
      if (t.loteriaId !== loteriaId || t.fechaSorteo !== fecha || t.estado === 'anulado') return;
      t.jugadas.forEach(j => {
        (porMod[j.modalidad] ||= { monto: 0, apuestas: 0, det: [] }).monto += j.monto;
        porMod[j.modalidad].apuestas += 1;
        porMod[j.modalidad].det.push({ t, j });
      });
    });
    return Object.entries(porMod).map(([modalidad, d]) => ({
      modalidad,
      monto: d.monto,
      apuestas: d.apuestas,
      porNumero: Object.entries(d.det.reduce((a, { j, t }) => {
        (a[j.numero] ||= []).push({ monto: j.monto, ticket: t.numero });
        return a;
      }, {} as Record<string, { monto: number; ticket: number }[]>))
        .map(([numero, items]) => ({ numero, monto: items.reduce((s, x) => s + x.monto, 0), apuestas: items.length, tickets: items.map(x => x.ticket) }))
        .sort((a, b) => b.monto - a.monto),
    }));
  }

  txtTicket(t: Ticket) {
    const lot = this.loteById(t.loteriaId);
    const vend = this.vendedorById(this.terminalById(t.terminalId)?.vendedorId || '');
    const premio = this.premioTicket(t);
    const estado = t.estado === 'anulado' ? '\n⚠️ ANULADO' : t.estado === 'pagado' ? '\n🏆 PREMIO PAGADO: ' + cop(t.montoPremio || 0) : '';
    return `${this.config.nombreSistema || 'Banca'}\n` +
      `Ticket #${t.numero}${estado}\n` +
      `Fecha: ${t.fechaSorteo} · ${NOMT[t.turno]}\n` +
      `Terminal: ${this.terminalById(t.terminalId)?.codigo}\n` +
      `Vendedor: ${vend?.nombre || '-'}\n` +
      `Lotería: ${lot?.nombre || '?'}\n` +
      t.jugadas.map(j => `  ${j.numero} ${NOMJ[j.modalidad]} $${j.monto.toLocaleString()}`).join('\n') +
      `\nTotal: ${cop(t.total)}` +
      (premio > 0 ? `\n🏆 Premio potencial: ${cop(premio)}` : '');
  }

  // ── Datos iniciales de demo ───────────────────────────────
  seed() {
    const h = hoy();
    this.config = { nombreSistema: 'Banca Lottery', minApuesta: 500, maxNumero: 100000, tiempoLimiteAnulacionMin: 30, comisionDefault: 10, alertaCupoPct: 80 };
    this.vendedores = [{ id: uid(), nombre: 'Juan Pérez', telefono: '04141234567', cedula: 'V12345678', comisionPct: 10, activo: true, fechaAlta: h, notas: '' }];
    this.terminales = [
      { id: 'T1', codigo: 'TQ-001', nombre: 'Taquilla Principal', ubicacion: 'Local A', vendedorId: this.vendedores[0].id, activo: true, bloqueado: false, motivoBloqueo: '', saldo: 0, fondo: 0, fechaAlta: h, comisionLoterias: 10, comisionAnimalitos: 15, comisionZodiacales: 12, cuposPorLoteria: {} },
      { id: 'T2', codigo: 'TQ-002', nombre: 'Taquilla Secundaria', ubicacion: 'Local B', vendedorId: this.vendedores[0].id, activo: true, bloqueado: false, motivoBloqueo: '', saldo: 0, fondo: 0, fechaAlta: h, comisionLoterias: 10, comisionAnimalitos: 15, comisionZodiacales: 12, cuposPorLoteria: {} },
    ];
    this.loterias = [
      { id: 'tach_a_1pm', nombre: 'Táchira A 1PM', tipo: 'triple', turno: 'manana', hora: '1:00 PM', horaCierre: '12:30 PM', minApuesta: 500, maxNumero: 100000, activa: true, pagos: { triple: 500, terminal: 50, cuadrupla: 0, triple_zodiacal: 0, '4_zodiacal': 0, '2_zodiacal': 0 } },
      { id: 'tach_b_4pm', nombre: 'Táchira B 4PM', tipo: 'triple', turno: 'tarde', hora: '4:00 PM', horaCierre: '3:30 PM', minApuesta: 500, maxNumero: 100000, activa: true, pagos: { triple: 500, terminal: 50, cuadrupla: 0, triple_zodiacal: 0, '4_zodiacal': 0, '2_zodiacal': 0 } },
    ];
    this.tickets = [
      { id: uid(), terminalId: 'T1', sorteoId: 'tach_a_1pm_' + h, loteriaId: 'tach_a_1pm', fechaSorteo: h, turno: 'manana', jugadas: [{ modalidad: 'triple', numero: '721', monto: 2000, loteriaId: 'tach_a_1pm' }, { modalidad: 'terminal', numero: '21', monto: 3000, loteriaId: 'tach_a_1pm' }], total: 5000, estado: 'valido', numero: 1, ts: Date.now() - 7200000 },
      { id: uid(), terminalId: 'T1', sorteoId: 'tach_a_1pm_' + h, loteriaId: 'tach_a_1pm', fechaSorteo: h, turno: 'manana', jugadas: [{ modalidad: 'terminal', numero: '21', monto: 5000, loteriaId: 'tach_a_1pm' }], total: 5000, estado: 'valido', numero: 2, ts: Date.now() - 3600000 },
      { id: uid(), terminalId: 'T2', sorteoId: 'tach_a_1pm_' + h, loteriaId: 'tach_a_1pm', fechaSorteo: h, turno: 'manana', jugadas: [{ modalidad: 'terminal', numero: '90', monto: 500, loteriaId: 'tach_a_1pm' }, { modalidad: 'triple', numero: '105', monto: 1000, loteriaId: 'tach_a_1pm' }], total: 1500, estado: 'valido', numero: 1, ts: Date.now() - 3000000 },
    ];
    this.sorteos = [
      { id: 'tach_a_1pm_' + h, loteriaId: 'tach_a_1pm', fecha: h, estado: 'premiado', resultado: { num: '8721', tipo: 'cuadrupla', ts: Date.now() - 1800000 } },
    ];
    this.estadosCuenta = [];
    this.cupos = [];
    this.logs = [];
    this.contadores = { T1: 3, T2: 1 };
    this.save();
  }

  private migrar() {
    let cambio = false;
    this.terminales.forEach(t => {
      if (t.comisionLoterias === undefined) { t.comisionLoterias = this.config.comisionDefault; cambio = true; }
      if (t.comisionAnimalitos === undefined) { t.comisionAnimalitos = this.config.comisionDefault; cambio = true; }
      if (t.comisionZodiacales === undefined) { t.comisionZodiacales = this.config.comisionDefault; cambio = true; }
      if (!t.cuposPorLoteria) { t.cuposPorLoteria = {}; cambio = true; }
    });
    this.loterias.forEach(l => {
      if (!l.tipo) {
        if (l.pagos.triple > 0 || l.pagos.cuadrupla > 0) l.tipo = 'triple';
        else if (l.pagos.terminal > 0 && l.pagos.triple === 0) l.tipo = 'animalito';
        else if (l.pagos.triple_zodiacal > 0 || l.pagos['4_zodiacal'] > 0) l.tipo = 'zodiacal';
        else l.tipo = 'triple';
        cambio = true;
      }
    });
    if (cambio) this.save();
  }

  private saveLocalOnly() {
    SG('config', this.config);
    SG('terminales', this.terminales);
    SG('vendedores', this.vendedores);
    SG('loterias', this.loterias);
    SG('sorteos', this.sorteos);
    SG('tickets', this.tickets);
    SG('estadosCuenta', this.estadosCuenta);
    SG('cupos', this.cupos);
    SG('logs', this.logs);
    SG('contadores', this.contadores);
  }
}

export const store = new Store();