import type {
  Config, Terminal, Vendedor, Loteria, Sorteo, ResultadoSorteo,
  Ticket, Jugada, EstadoCuenta, Cupo, LogAuditoria,
  Turno, Modalidad
} from './types';
import { isFirebaseConfigured, firebaseSet, firebaseOnValue, initFirebase } from './firebase';
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

// Datos por TAB (solo sesión temporal — actualmente no se usa, todo es global)
// const G = <T>(k: string, d: T): T => { ... };
// const S = (k: string, v: unknown) => ...;

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
  contadores: Record<string, number>; // serial por terminal

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

    if (!hasData) {
      this.seed();
    } else {
      // MIGRACIÓN: agregar campos nuevos sin perder datos existentes
      this.migrar();
    }

    // Cargar datos del backend al iniciar (para sincronización entre dispositivos)
    this.loadFromBackend();
  }

  // Cargar datos del backend (nube) — fuente de verdad
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
        // Notificar a la UI que hay nuevos datos
        window.dispatchEvent(new CustomEvent('banca-sync'));
      }
    } catch (e) {
      console.warn('No se pudo cargar del backend, usando localStorage:', e);
    } finally {
      this.isLoading = false;
    }
  }

  // Guardar solo en localStorage (sin enviar al backend)
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

  // MIGRACIÓN DE DATOS: agrega campos nuevos con valores por defecto
  // NUNCA elimina ni modifica datos existentes del usuario
  private migrar() {
    let cambio = false;

    // Migrar terminales: agregar comisiones y cupos si faltan
    this.terminales.forEach(t => {
      if (t.comisionLoterias === undefined) { t.comisionLoterias = this.config.comisionDefault; cambio = true; }
      if (t.comisionAnimalitos === undefined) { t.comisionAnimalitos = this.config.comisionDefault; cambio = true; }
      if (t.comisionZodiacales === undefined) { t.comisionZodiacales = this.config.comisionDefault; cambio = true; }
      if (!t.cuposPorLoteria) { t.cuposPorLoteria = {}; cambio = true; }
    });

    // Migrar loterías: agregar tipo si falta
    this.loterias.forEach(l => {
      if (!l.tipo) {
        // Detectar tipo según pagos activos
        if (l.pagos.triple > 0 || l.pagos.cuadrupla > 0) l.tipo = 'triple';
        else if (l.pagos.terminal > 0 && l.pagos.triple === 0) l.tipo = 'animalito';
        else if (l.pagos.triple_zodiacal > 0 || l.pagos['4_zodiacal'] > 0) l.tipo = 'zodiacal';
        else l.tipo = 'triple'; // default seguro
        cambio = true;
      }
    });

    if (cambio) this.save();
  }

  save() {
    // 1. Guardar inmediatamente en localStorage (UI instantánea)
    this.saveLocalOnly();
    SG('contadores', this.contadores);
    this.syncToFirebase();

    // 2. Programar sync al backend con debounce (2 seg)
    this.syncPending = true;
    if (this.syncTimer) clearTimeout(this.syncTimer);
    this.syncTimer = setTimeout(() => this.syncToBackend(), 2000);
  }

  // Enviar datos al backend (nube) — sincronización entre dispositivos
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
      this.syncPending = true; // Reintentar en próximo save
    }
  }

  // ── Firebase ──────────────────────────────────────────────
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
      if (remote && remote.ts > (this.lastLocalTs || 0)) {
        this.config = remote.config ?? this.config;
        this.terminales = remote.terminales ?? this.terminales;
        this.vendedores = remote.vendedores ?? this.vendedores;
        this.loterias = remote.loterias ?? this.loterias;
        this.sorteos = remote.sorteos ?? this.sorteos;
        this.tickets = remote.tickets ?? this.tickets;
        this.estadosCuenta = remote.estadosCuenta ?? this.estadosCuenta;
        this.cupos = remote.cupos ?? this.cupos;
        this.logs = remote.logs ?? this.logs;
        this.contadores = remote.contadores ?? this.contadores;
        this.saveLocalOnly();
        cb();
      }
    });
  }

  private lastLocalTs = 0;

  // ── Auditoría ─────────────────────────────────────────────
  log(accion: LogAuditoria['accion'], entidad: string, entidadId: string, detalle: string, usuario = 'SISTEMA') {
    const log: LogAuditoria = {
      id: uid(), usuario, accion, entidad, entidadId,
      ts: Date.now(), detalle,
    };
    this.logs.unshift(log);
    if (this.logs.length > 5000) this.logs = this.logs.slice(0, 5000);
    this.save();
  }

  // ── Terminal helpers ──────────────────────────────────────
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

  // ── Serial de tickets ─────────────────────────────────────
  siguienteNumero(terminalId: string): number {
    const actual = this.contadores[terminalId] || 0;
    this.contadores[terminalId] = actual + 1;
    return this.contadores[terminalId];
  }

  // ── Cupos ─────────────────────────────────────────────────
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
    // Si el terminal tiene cupo específico para esta lotería, usar el menor
    if (terminalId) {
      const t = this.terminalById(terminalId);
      const loteriaId = sorteoId.split('_')[0];
      if (t && t.cuposPorLoteria[loteriaId] > 0) {
        limite = Math.min(limite, t.cuposPorLoteria[loteriaId]);
      }
    }
    return Math.max(0, limite - c.acumulado);
  }

  // ── Tickets ───────────────────────────────────────────────
  ticketsPorTerminal(terminalId: string, fechaDesde?: string, fechaHasta?: string): Ticket[] {
    let list = this.tickets.filter(t => t.terminalId === terminalId && t.estado !== 'anulado');
    if (fechaDesde) list = list.filter(t => t.fechaSorteo >= fechaDesde);
    if (fechaHasta) list = list.filter(t => t.fechaSorteo <= fechaHasta);
    return list.sort((a, b) => a.numero - b.numero);
  }

  ticketPorNumero(terminalId: string, numero: number): Ticket | undefined {
    return this.tickets.find(t => t.terminalId === terminalId && t.numero === numero);
  }

  // ── Anulación ─────────────────────────────────────────────
  anularTicket(terminalId: string, numero: number, motivo: string, usuario: string): string {
    const t = this.tickets.find(x => x.terminalId === terminalId && x.numero === numero);
    if (!t) return 'Ticket no encontrado';
    if (t.estado === 'anulado') return 'Ticket ya anulado';
    if (t.estado === 'pagado') return 'No se puede anular un ticket pagado';

    // Quitar acumulado de cupos
    t.jugadas.forEach(j => {
      const sid = j.loteriaId + '_' + t.fechaSorteo;
      this.quitarCupo(sid, j.modalidad, j.numero, j.monto);
    });

    t.estado = 'anulado';
    t.anuladoTs = Date.now();
    t.anuladoPor = usuario;
    t.motivoAnulacion = motivo;
    this.log('anulacion', 'ticket', t.id, `Ticket #${t.numero} anulado. Motivo: ${motivo}`, usuario);
    this.save();
    return '';
  }

  // ── Premios ───────────────────────────────────────────────
  calcularPremio(j: Jugada, res: ResultadoSorteo, lote: Loteria): number {
    if (!res) return 0;
    const num = j.numero;
    let gano = false;

    if (j.modalidad === 'triple' || j.modalidad === 'triple_zodiacal') {
      gano = res.num.slice(-3) === num.padStart(3, '0');
    } else if (j.modalidad === 'terminal' || j.modalidad === '2_zodiacal') {
      gano = res.num.slice(-2) === num.padStart(2, '0');
    } else if (j.modalidad === 'cuadrupla' || j.modalidad === '4_zodiacal') {
      gano = res.num === num.padStart(4, '0');
    }

    if (!gano) return 0;
    return j.monto * (lote.pagos[j.modalidad] || 1);
  }

  premioTicket(t: Ticket): number {
    const sid = t.loteriaId + '_' + t.fechaSorteo;
    const s = this.sorteoById(sid);
    const lote = this.loteById(t.loteriaId);
    if (!s?.resultado || !lote || t.estado !== 'valido') return 0;
    const res = s.resultado;
    let p = 0;
    t.jugadas.forEach(j => {
      if (j.loteriaId === t.loteriaId || !j.loteriaId) {
        p += this.calcularPremio(j, res, lote);
      }
    });
    return p;
  }

  pagarPremio(ticketId: string, pagadoPor: string): { ok: boolean; msg: string; monto?: number } {
    const t = this.tickets.find(x => x.id === ticketId);
    if (!t) return { ok: false, msg: 'Ticket no encontrado' };
    if (t.estado === 'anulado') return { ok: false, msg: 'Ticket anulado' };
    if (t.estado === 'pagado') return { ok: false, msg: 'Ticket ya pagado' };

    const premio = this.premioTicket(t);
    if (premio <= 0) return { ok: false, msg: 'Ticket no tiene premio' };

    t.estado = 'pagado';
    t.pagadoTs = Date.now();
    t.pagadoPor = pagadoPor;
    t.montoPremio = premio;
    this.log('pago_premio', 'ticket', t.id, `Premio pagado: ${cop(premio)}`, pagadoPor);
    this.save();
    return { ok: true, msg: 'Premio pagado', monto: premio };
  }

  // ── Cuadre / Estado de Cuenta ─────────────────────────────
  calcCuadre(terminalId: string, f1: string, f2: string) {
    const terminal = this.terminalById(terminalId);

    const tickets = this.tickets.filter(t =>
      t.terminalId === terminalId &&
      !t.anuladoTs &&
      t.fechaSorteo >= f1 &&
      t.fechaSorteo <= f2
    );

    let ventas = 0;
    let premios = 0;
    let comision = 0;
    const det: { t: Ticket; premio: number }[] = [];

    tickets.forEach(t => {
      ventas += t.total;
      const p = this.premioTicket(t);
      if (p > 0) {
        premios += p;
        det.push({ t, premio: p });
      }
      // Comisión según tipo de lotería configurada en la terminal
      t.jugadas.forEach(j => {
        const lot = this.loteById(j.loteriaId || t.loteriaId);
        let pct = this.config.comisionDefault;
        if (terminal) {
          if (lot?.tipo === 'animalito') pct = terminal.comisionAnimalitos;
          else if (lot?.tipo === 'zodiacal') pct = terminal.comisionZodiacales;
          else pct = terminal.comisionLoterias;
        }
        comision += j.monto * pct / 100;
      });
    });

    // Tickets anulados en el período
    const anulados = this.tickets.filter(t =>
      t.terminalId === terminalId &&
      t.estado === 'anulado' &&
      t.anuladoTs &&
      t.fechaSorteo >= f1 &&
      t.fechaSorteo <= f2
    );

    const resultado = ventas - premios;
    const saldoAnt = terminal?.saldo ?? 0;
    const neto = resultado - comision + saldoAnt;

    return {
      ventas, premios, comision, resultado, saldoAnt, neto,
      det, anulados, ticketsCount: tickets.length,
    };
  }

  cerrarCaja(terminalId: string, f1: string, f2: string, montoEntregado: number, usuario: string): EstadoCuenta | null {
    const terminal = this.terminalById(terminalId);
    if (!terminal) return null;

    const c = this.calcCuadre(terminalId, f1, f2);
    const ec: EstadoCuenta = {
      id: uid(),
      terminalId,
      vendedorId: terminal.vendedorId,
      fechaDesde: f1,
      fechaHasta: f2,
      totalVendido: c.ventas,
      totalPremios: c.premios,
      comision: c.comision,
      netoEntregar: c.neto,
      montoEntregado,
      diferencia: c.neto - montoEntregado,
      saldoArrastre: c.neto - montoEntregado,
      estado: 'cerrado',
      tsCierre: Date.now(),
      tickets: c.det.map(d => d.t.numero),
    };

    // Actualizar saldo arrastrado del terminal
    terminal.saldo = ec.saldoArrastre;

    this.estadosCuenta.push(ec);
    this.log('cierre_caja', 'estado_cuenta', ec.id,
      `Cierre ${f1} a ${f2}. Vendido:${cop(c.ventas)} Premios:${cop(c.premios)} Neto:${cop(c.neto)} Entregado:${cop(montoEntregado)} Dif:${cop(ec.diferencia)}`,
      usuario);
    this.save();
    return ec;
  }

  // ── Monitoreo: números más jugados ────────────────────────
  numerosMasJugados(loteriaId: string, fecha: string, modalidad?: Modalidad, top = 20) {
    const map: Record<string, { numero: string; monto: number; jugadas: number; modalidad: Modalidad }> = {};

    this.tickets.forEach(t => {
      if (t.estado === 'anulado') return;
      if (t.loteriaId !== loteriaId && !t.jugadas.some(j => j.loteriaId === loteriaId)) return;
      if (t.fechaSorteo !== fecha) return;

      t.jugadas.forEach(j => {
        const lid = j.loteriaId || t.loteriaId;
        if (lid !== loteriaId) return;
        if (modalidad && j.modalidad !== modalidad) return;

        const key = j.modalidad + '|' + j.numero;
        if (!map[key]) map[key] = { numero: j.numero, monto: 0, jugadas: 0, modalidad: j.modalidad };
        map[key].monto += j.monto;
        map[key].jugadas += 1;
      });
    });

    return Object.values(map)
      .sort((a, b) => b.monto - a.monto)
      .slice(0, top);
  }

  // ── Monitoreo: totales por modalidad ──────────────────────
  totalPorModalidad(loteriaId: string, fecha: string): Record<Modalidad, { ventas: number; jugadas: number }> {
    const res: Record<string, { ventas: number; jugadas: number }> = {};
    const mods: Modalidad[] = ['triple', 'cuadrupla', 'terminal', 'triple_zodiacal', '4_zodiacal', '2_zodiacal'];
    mods.forEach(m => res[m] = { ventas: 0, jugadas: 0 });

    this.tickets.forEach(t => {
      if (t.estado === 'anulado') return;
      if (t.fechaSorteo !== fecha) return;
      t.jugadas.forEach(j => {
        const lid = j.loteriaId || t.loteriaId;
        if (lid === loteriaId && res[j.modalidad]) {
          res[j.modalidad].ventas += j.monto;
          res[j.modalidad].jugadas += 1;
        }
      });
    });

    return res as Record<Modalidad, { ventas: number; jugadas: number }>;
  }

  // ── Monitoreo: alertas de cupo ────────────────────────────
  alertasCupo(loteriaId: string, fecha: string): Cupo[] {
    const sid = loteriaId + '_' + fecha;
    return this.cupos
      .filter(c => c.sorteoId === sid && (c.alerta80 || c.alerta100))
      .sort((a, b) => b.acumulado - a.acumulado)
      .slice(0, 30);
  }

  // ── Texto del ticket ──────────────────────────────────────
  txtTicket(t: Ticket): string {
    const term = this.terminalById(t.terminalId);
    const vend = term ? this.vendedorById(term.vendedorId) : undefined;
    const lote = this.loteById(t.loteriaId);
    const nom = NOMJ;

    let body = '';
    const porMod: Record<string, Jugada[]> = {};
    t.jugadas.forEach(j => {
      (porMod[j.modalidad] ||= []).push(j);
    });
    Object.entries(porMod).forEach(([mod, jugadas]) => {
      body += '\n📌 ' + nom[mod] + '\n';
      body += jugadas.map(j => j.numero + ' — ' + cop(j.monto)).join('\n') + '\n';
    });

    const estado = t.estado === 'anulado' ? '\n⚠️ ANULADO' : t.estado === 'pagado' ? '\n🏆 PREMIO PAGADO: ' + cop(t.montoPremio || 0) : '';

    return '🎫 *BANCA LOTTERY*\n' +
      'Ticket #' + t.numero + '\n' +
      'Terminal: ' + t.terminalId + '\n' +
      'Vendedor: ' + (vend?.nombre || '-') + '\n' +
      'Lotería: ' + (lote?.nombre || '?') + '\n' +
      'Sorteo: ' + t.fechaSorteo + ' · ' + NOMT[t.turno] + '\n' +
      ahora() + '\n' +
      '──────────────────' + body +
      '──────────────────\n' +
      '*TOTAL: ' + cop(t.total) + '*\n' +
      'ID: ' + t.id.toUpperCase() + estado + '\n¡Buena suerte! 🍀';
  }

  // ── SEED (datos de prueba) ────────────────────────────────
  seed() {
    const h = hoy();

    // Vendedores
    this.vendedores = [
      { id: 'V1', nombre: 'Carlos Pérez', telefono: '0412-1234567', cedula: 'V-12345678', comisionPct: 10, activo: true, fechaAlta: h, notas: '' },
      { id: 'V2', nombre: 'María González', telefono: '0414-9876543', cedula: 'V-87654321', comisionPct: 12, activo: true, fechaAlta: h, notas: '' },
    ];

    // Terminales
    this.terminales = [
      { id: 'T1', codigo: 'TQ-001', nombre: 'Taquilla Principal', ubicacion: 'Local A', vendedorId: 'V1', activo: true, bloqueado: false, motivoBloqueo: '', fondo: 0, saldo: 0, comisionLoterias: 10, comisionAnimalitos: 15, comisionZodiacales: 12, cuposPorLoteria: {}, fechaAlta: h },
      { id: 'T2', codigo: 'TQ-002', nombre: 'Taquilla Secundaria', ubicacion: 'Local B', vendedorId: 'V2', activo: true, bloqueado: false, motivoBloqueo: '', fondo: 0, saldo: 0, comisionLoterias: 10, comisionAnimalitos: 15, comisionZodiacales: 12, cuposPorLoteria: {}, fechaAlta: h },
    ];

    // Loterías — divididas en 3 grupos
    this.loterias = [
      // === TRIPLES (3 cifras + terminales) ===
      { id: 'tach_a_1pm', nombre: 'Táchira A 1PM', tipo: 'triple', turno: 'manana', hora: '1:00 PM', horaCierre: '12:30 PM', activa: true, pagos: { triple: 600, cuadrupla: 4000, terminal: 70, triple_zodiacal: 0, '4_zodiacal': 0, '2_zodiacal': 0 }, minApuesta: 500, maxNumero: 100000, topesTerminal: {} },
      { id: 'tach_b_445pm', nombre: 'Táchira B 4:45PM', tipo: 'triple', turno: 'tarde', hora: '4:45 PM', horaCierre: '4:15 PM', activa: true, pagos: { triple: 600, cuadrupla: 4000, terminal: 70, triple_zodiacal: 0, '4_zodiacal': 0, '2_zodiacal': 0 }, minApuesta: 500, maxNumero: 100000, topesTerminal: {} },
      { id: 'tach_c_10pm', nombre: 'Táchira C 10PM', tipo: 'triple', turno: 'noche', hora: '10:00 PM', horaCierre: '9:30 PM', activa: true, pagos: { triple: 600, cuadrupla: 4000, terminal: 70, triple_zodiacal: 0, '4_zodiacal': 0, '2_zodiacal': 0 }, minApuesta: 500, maxNumero: 100000, topesTerminal: {} },
      // === ANIMALITOS (solo terminales) ===
      { id: 'fl_cash_130pm', nombre: 'Florida Cash 1:30PM', tipo: 'animalito', turno: 'manana', hora: '1:30 PM', horaCierre: '1:00 PM', activa: true, pagos: { triple: 0, cuadrupla: 0, terminal: 60, triple_zodiacal: 0, '4_zodiacal': 0, '2_zodiacal': 0 }, minApuesta: 500, maxNumero: 100000, topesTerminal: {} },
      { id: 'fl_cash_950pm', nombre: 'Florida Cash 9:50PM', tipo: 'animalito', turno: 'noche', hora: '9:50 PM', horaCierre: '9:20 PM', activa: true, pagos: { triple: 0, cuadrupla: 0, terminal: 60, triple_zodiacal: 0, '4_zodiacal': 0, '2_zodiacal': 0 }, minApuesta: 500, maxNumero: 100000, topesTerminal: {} },
      // === ZODIACALES ===
      { id: 'zod_a_1pm', nombre: 'Zodiacal A 1PM', tipo: 'zodiacal', turno: 'manana', hora: '1:00 PM', horaCierre: '12:30 PM', activa: true, pagos: { triple: 0, cuadrupla: 0, terminal: 0, triple_zodiacal: 500, '4_zodiacal': 3500, '2_zodiacal': 60 }, minApuesta: 500, maxNumero: 100000, topesTerminal: {} },
      { id: 'zod_b_10pm', nombre: 'Zodiacal B 10PM', tipo: 'zodiacal', turno: 'noche', hora: '10:00 PM', horaCierre: '9:30 PM', activa: true, pagos: { triple: 0, cuadrupla: 0, terminal: 0, triple_zodiacal: 500, '4_zodiacal': 3500, '2_zodiacal': 60 }, minApuesta: 500, maxNumero: 100000, topesTerminal: {} },
    ];

    // Tickets de ejemplo
    this.tickets = [
      { id: uid(), terminalId: 'T1', sorteoId: 'tach_a_1pm_' + h, loteriaId: 'tach_a_1pm', fechaSorteo: h, turno: 'manana', jugadas: [{ modalidad: 'triple', numero: '721', monto: 2000, loteriaId: 'tach_a_1pm' }, { modalidad: 'terminal', numero: '21', monto: 3000, loteriaId: 'tach_a_1pm' }], total: 5000, estado: 'valido', numero: 1, ts: Date.now() - 7200000 },
      { id: uid(), terminalId: 'T1', sorteoId: 'tach_a_1pm_' + h, loteriaId: 'tach_a_1pm', fechaSorteo: h, turno: 'manana', jugadas: [{ modalidad: 'terminal', numero: '21', monto: 5000, loteriaId: 'tach_a_1pm' }], total: 5000, estado: 'valido', numero: 2, ts: Date.now() - 3600000 },
      { id: uid(), terminalId: 'T2', sorteoId: 'tach_a_1pm_' + h, loteriaId: 'tach_a_1pm', fechaSorteo: h, turno: 'manana', jugadas: [{ modalidad: 'terminal', numero: '90', monto: 500, loteriaId: 'tach_a_1pm' }, { modalidad: 'triple', numero: '105', monto: 1000, loteriaId: 'tach_a_1pm' }], total: 1500, estado: 'valido', numero: 1, ts: Date.now() - 3000000 },
    ];
    this.contadores = { T1: 2, T2: 1 };

    // Resultado de ejemplo
    this.sorteos = [
      { id: 'tach_a_1pm_' + h, loteriaId: 'tach_a_1pm', fecha: h, estado: 'premiado', resultado: { num: '8721', tipo: 'cuadrupla', ts: Date.now() - 1800000 } },
    ];

    // Cupos de ejemplo
    this.cupos = [
      { id: 'tach_a_1pm_' + h + '_triple_721', sorteoId: 'tach_a_1pm_' + h, loteriaId: 'tach_a_1pm', modalidad: 'triple', numero: '721', limite: 100000, acumulado: 2000, alerta80: false, alerta100: false },
      { id: 'tach_a_1pm_' + h + '_terminal_21', sorteoId: 'tach_a_1pm_' + h, loteriaId: 'tach_a_1pm', modalidad: 'terminal', numero: '21', limite: 100000, acumulado: 8000, alerta80: false, alerta100: false },
    ];

    this.save();
    localStorage.setItem('banca_global_seed', '1');
  }
}

export const store = new Store();
