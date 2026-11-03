import {
  mysqlTable,
  mysqlEnum,
  serial,
  varchar,
  text,
  timestamp,
  int,
  json,
  boolean,
} from "drizzle-orm/mysql-core";

// ============================================
// 1. USUARIOS (auth)
// ============================================
export const users = mysqlTable("users", {
  id: serial("id").primaryKey(),
  unionId: varchar("unionId", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }),
  email: varchar("email", { length: 320 }),
  avatar: text("avatar"),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
  lastSignInAt: timestamp("lastSignInAt").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ============================================
// 2. CONFIGURACIÓN GLOBAL
// ============================================
export const appConfig = mysqlTable("appConfig", {
  id: serial("id").primaryKey(),
  minApuesta: int("minApuesta").notNull().default(500),
  maxNumero: int("maxNumero").notNull().default(100000),
  tiempoLimiteAnulacionMin: int("tiempoLimiteAnulacionMin").notNull().default(30),
  comisionDefault: int("comisionDefault").notNull().default(10),
  alertaCupoPct: int("alertaCupoPct").notNull().default(80),
  updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdate(() => new Date()),
});

export type Config = typeof appConfig.$inferSelect;

// ============================================
// 3. LOTERÍAS
// ============================================
export const loterias = mysqlTable("loterias", {
  id: varchar("id", { length: 50 }).primaryKey(),
  nombre: varchar("nombre", { length: 255 }).notNull(),
  tipo: mysqlEnum("tipo", ["triple", "animalito", "zodiacal"]).notNull().default("triple"),
  turno: mysqlEnum("turno", ["manana", "tarde", "noche"]).notNull().default("manana"),
  hora: varchar("hora", { length: 20 }).notNull(),
  horaCierre: varchar("horaCierre", { length: 20 }).notNull(),
  pagos: json("pagos").notNull().$type<Record<string, number>>(),
  minApuesta: int("minApuesta").notNull().default(500),
  maxNumero: int("maxNumero").notNull().default(100000),
  activa: boolean("activa").notNull().default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Loteria = typeof loterias.$inferSelect;
export type InsertLoteria = typeof loterias.$inferInsert;

// ============================================
// 4. VENDEDORES
// ============================================
export const vendedores = mysqlTable("vendedores", {
  id: varchar("id", { length: 50 }).primaryKey(),
  nombre: varchar("nombre", { length: 255 }).notNull(),
  telefono: varchar("telefono", { length: 50 }),
  cedula: varchar("cedula", { length: 50 }).notNull(),
  comisionPct: int("comisionPct").notNull().default(10),
  activo: boolean("activo").notNull().default(true),
  fechaAlta: varchar("fechaAlta", { length: 20 }).notNull(),
  notas: text("notas"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Vendedor = typeof vendedores.$inferSelect;
export type InsertVendedor = typeof vendedores.$inferInsert;

// ============================================
// 5. TERMINALES
// ============================================
export const terminales = mysqlTable("terminales", {
  id: varchar("id", { length: 50 }).primaryKey(),
  codigo: varchar("codigo", { length: 50 }).notNull(),
  nombre: varchar("nombre", { length: 255 }).notNull(),
  ubicacion: varchar("ubicacion", { length: 255 }),
  vendedorId: varchar("vendedorId", { length: 50 }),
  activo: boolean("activo").notNull().default(true),
  bloqueado: boolean("bloqueado").notNull().default(false),
  motivoBloqueo: text("motivoBloqueo"),
  fondo: int("fondo").notNull().default(0),
  saldo: int("saldo").notNull().default(0),
  comisionLoterias: int("comisionLoterias").notNull().default(10),
  comisionAnimalitos: int("comisionAnimalitos").notNull().default(10),
  comisionZodiacales: int("comisionZodiacales").notNull().default(10),
  cuposPorLoteria: json("cuposPorLoteria").notNull().$type<Record<string, number>>(),
  fechaAlta: varchar("fechaAlta", { length: 20 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Terminal = typeof terminales.$inferSelect;
export type InsertTerminal = typeof terminales.$inferInsert;

// ============================================
// 6. TICKETS
// ============================================
export const tickets = mysqlTable("tickets", {
  id: varchar("id", { length: 50 }).primaryKey(),
  numeroTicket: varchar("numeroTicket", { length: 50 }).notNull(),
  terminalId: varchar("terminalId", { length: 50 }).notNull(),
  loteriaId: varchar("loteriaId", { length: 50 }).notNull(),
  vendedorId: varchar("vendedorId", { length: 50 }),
  fecha: varchar("fecha", { length: 20 }).notNull(),
  fechaSorteo: varchar("fechaSorteo", { length: 20 }).notNull(),
  hora: varchar("hora", { length: 20 }).notNull(),
  jugadas: json("jugadas").notNull().$type<Array<{
    modalidad: string;
    numero: string;
    monto: number;
    premioPotencial: number;
  }>>(),
  total: int("total").notNull().default(0),
  estado: mysqlEnum("estado", ["activo", "pagado", "anulado"]).notNull().default("activo"),
  montoPremio: int("montoPremio").default(0),
  fechaPago: varchar("fechaPago", { length: 20 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Ticket = typeof tickets.$inferSelect;
export type InsertTicket = typeof tickets.$inferInsert;

// ============================================
// 7. SORTEOS (RESULTADOS)
// ============================================
export const sorteos = mysqlTable("sorteos", {
  id: varchar("id", { length: 50 }).primaryKey(),
  loteriaId: varchar("loteriaId", { length: 50 }).notNull(),
  fecha: varchar("fecha", { length: 20 }).notNull(),
  numeroGanador: varchar("numeroGanador", { length: 50 }),
  zodiacal: varchar("zodiacal", { length: 50 }),
  resultadoCargado: boolean("resultadoCargado").notNull().default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Sorteo = typeof sorteos.$inferSelect;
export type InsertSorteo = typeof sorteos.$inferInsert;

// ============================================
// 8. CUPOS (acumulados por sorteo/modalidad/numero)
// ============================================
export const cupos = mysqlTable("cupos", {
  id: serial("id").primaryKey(),
  sorteoId: varchar("sorteoId", { length: 100 }).notNull(),
  modalidad: varchar("modalidad", { length: 50 }).notNull(),
  numero: varchar("numero", { length: 50 }).notNull(),
  limite: int("limite").notNull().default(100000),
  acumulado: int("acumulado").notNull().default(0),
  updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdate(() => new Date()),
});

export type Cupo = typeof cupos.$inferSelect;
export type InsertCupo = typeof cupos.$inferInsert;

// ============================================
// 9. ESTADOS DE CUENTA (cuadre)
// ============================================
export const estadosCuenta = mysqlTable("estadosCuenta", {
  id: serial("id").primaryKey(),
  terminalId: varchar("terminalId", { length: 50 }).notNull(),
  fecha: varchar("fecha", { length: 20 }).notNull(),
  ventas: int("ventas").notNull().default(0),
  premios: int("premios").notNull().default(0),
  comision: int("comision").notNull().default(0),
  neto: int("neto").notNull().default(0),
  saldoAnterior: int("saldoAnterior").notNull().default(0),
  saldoActual: int("saldoActual").notNull().default(0),
  fechaCierre: varchar("fechaCierre", { length: 20 }),
  observaciones: text("observaciones"),
  creadoPor: varchar("creadoPor", { length: 100 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type EstadoCuenta = typeof estadosCuenta.$inferSelect;
export type InsertEstadoCuenta = typeof estadosCuenta.$inferInsert;

// ============================================
// 10. LOGS DE AUDITORÍA
// ============================================
export const logs = mysqlTable("logs", {
  id: serial("id").primaryKey(),
  accion: varchar("accion", { length: 50 }).notNull(),
  entidad: varchar("entidad", { length: 50 }).notNull(),
  entidadId: varchar("entidadId", { length: 50 }).notNull(),
  mensaje: text("mensaje").notNull(),
  usuario: varchar("usuario", { length: 100 }).notNull(),
  fecha: varchar("fecha", { length: 20 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Log = typeof logs.$inferSelect;
export type InsertLog = typeof logs.$inferInsert;
