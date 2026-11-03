// ============================================================
// SISTEMA DE GESTIÓN INTEGRAL - BANCA DE LOTERÍA (VENEZUELA)
// 100% Online · Sin modo offline
// ============================================================

export type EstadoTicket = 'valido' | 'anulado' | 'pagado';
export type Turno = 'manana' | 'tarde' | 'noche';
export type Modalidad = 'triple' | 'cuadrupla' | 'terminal' | 'triple_zodiacal' | '4_zodiacal' | '2_zodiacal';
export type TipoLoteria = 'triple' | 'animalito' | 'zodiacal';

// ── Vendedor ───────────────────────────────────────────────
export interface Vendedor {
  id: string;
  nombre: string;
  telefono: string;
  cedula: string;
  comisionPct: number;      // % default de comisión sobre ventas
  activo: boolean;
  fechaAlta: string;
  notas: string;
}

// ── Terminal (Taquilla) ────────────────────────────────────
export interface Terminal {
  id: string;
  codigo: string;
  nombre: string;
  ubicacion: string;
  vendedorId: string;
  activo: boolean;
  bloqueado: boolean;
  motivoBloqueo: string;
  fondo: number;
  saldo: number;            // saldo arrastrado de cierres anteriores
  // Comisiones por tipo de lotería (%)
  comisionLoterias: number;   // loterías tipo triple
  comisionAnimalitos: number; // loterías tipo animalito
  comisionZodiacales: number; // loterías tipo zodiacal
  // Cupos por lotería (0 = usar default global)
  cuposPorLoteria: Record<string, number>;
  fechaAlta: string;
}

// ── Lotería ────────────────────────────────────────────────
export interface Loteria {
  id: string;
  nombre: string;
  tipo: TipoLoteria;        // triple | animalito | zodiacal
  turno: Turno;
  hora: string;             // ej: "1:00 PM"
  horaCierre: string;       // hora límite para anular/apostar
  activa: boolean;
  // Pagos por modalidad (multiplicador)
  pagos: Record<Modalidad, number>;
  minApuesta: number;
  maxNumero: number;        // tope general por número
  // Topes específicos por terminal
  topesTerminal: Record<string, number>;
}

// ── Sorteo (instancia de lotería en una fecha) ─────────────
export interface Sorteo {
  id: string;               // loteriaId_fecha
  loteriaId: string;
  fecha: string;
  estado: 'abierto' | 'cerrado' | 'premiado';
  resultado?: ResultadoSorteo;
}

export interface ResultadoSorteo {
  num: string;              // 4 cifras
  tipo: 'cuadrupla' | 'triple';
  ts: number;
}

// ── Jugada dentro de un ticket ─────────────────────────────
export interface Jugada {
  modalidad: Modalidad;
  numero: string;
  monto: number;
  loteriaId: string;
}

// ── Ticket (transacción) ───────────────────────────────────
export interface Ticket {
  id: string;
  terminalId: string;
  sorteoId: string;         // loteriaId_fecha
  loteriaId: string;
  fechaSorteo: string;
  turno: Turno;
  jugadas: Jugada[];
  total: number;
  estado: EstadoTicket;
  numero: number;           // serial consecutivo por terminal
  ts: number;
  // Anulación
  anuladoTs?: number;
  anuladoPor?: string;
  motivoAnulacion?: string;
  // Pago
  pagadoTs?: number;
  pagadoPor?: string;
  montoPremio?: number;
  // Reimpresión
  reimpresion?: boolean;
}

// ── Estado de Cuenta (Cuadre) ──────────────────────────────
export interface EstadoCuenta {
  id: string;
  terminalId: string;
  vendedorId: string;
  fechaDesde: string;
  fechaHasta: string;
  totalVendido: number;
  totalPremios: number;
  comision: number;         // totalVendido * comisionPct / 100
  netoEntregar: number;     // totalVendido - totalPremios - comision
  montoEntregado: number;   // lo que realmente entregó
  diferencia: number;       // netoEntregar - montoEntregado
  saldoArrastre: number;    // se suma al siguiente período
  estado: 'abierto' | 'cerrado';
  tsCierre?: number;
  tickets: number[];        // números de tickets incluidos
}

// ── Cupo / Límite ──────────────────────────────────────────
export interface Cupo {
  id: string;               // sorteoId_modalidad_numero
  sorteoId: string;
  loteriaId: string;
  modalidad: Modalidad;
  numero: string;
  limite: number;
  acumulado: number;
  alerta80: boolean;
  alerta100: boolean;
}

// ── Log de Auditoría (inmutable) ───────────────────────────
export interface LogAuditoria {
  id: string;
  usuario: string;          // terminalId o "ADMIN"
  accion: 'venta' | 'anulacion' | 'pago_premio' | 'cierre_caja' | 'config' | 'login' | 'logout' | 'bloqueo' | 'desbloqueo';
  entidad: string;          // ticket, terminal, loteria, etc.
  entidadId: string;
  ts: number;
  detalle: string;
  ip?: string;
}

// ── Configuración global ───────────────────────────────────
export interface Config {
  minApuesta: number;
  maxNumero: number;
  tiempoLimiteAnulacionMin: number;  // minutos antes del cierre
  comisionDefault: number;           // %
  alertaCupoPct: number;             // 80 = alerta al 80%
}
