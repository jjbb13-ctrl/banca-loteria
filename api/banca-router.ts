import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import {
  appConfig,
  loterias,
  vendedores,
  terminales,
  tickets,
  sorteos,
  cupos,
  estadosCuenta,
  logs,
} from "@db/schema";
import { eq, and, desc } from "drizzle-orm";

// Helper - typed wrapper to avoid Zod/Drizzle inference mismatches
const db = () => getDb();
const insert = (table: any, data: any) => getDb().insert(table).values(data as any);

// ============================================
// CONFIG
// ============================================
export const configRouter = createRouter({
  get: publicQuery.query(async () => {
    const rows = await db().select().from(appConfig).limit(1);
    if (rows.length === 0) {
      await insert(appConfig, {});
      return db().select().from(appConfig).limit(1).then(r => r[0]);
    }
    return rows[0];
  }),
  update: publicQuery
    .input(z.object({
      minApuesta: z.number().optional(),
      maxNumero: z.number().optional(),
      tiempoLimiteAnulacionMin: z.number().optional(),
      comisionDefault: z.number().optional(),
      alertaCupoPct: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const existing = await db().select().from(appConfig).limit(1);
      if (existing.length === 0) {
        await insert(appConfig, input);
      } else {
        await db().update(appConfig).set(input as any).where(eq(appConfig.id, existing[0].id));
      }
      return { success: true };
    }),
});

// ============================================
// LOTERÍAS
// ============================================
export const loteriasRouter = createRouter({
  list: publicQuery.query(async () => {
    return db().select().from(loterias);
  }),
  get: publicQuery.input(z.object({ id: z.string() })).query(async ({ input }) => {
    const rows = await db().select().from(loterias).where(eq(loterias.id, input.id)).limit(1);
    return rows[0] || null;
  }),
  create: publicQuery
    .input(z.object({
      id: z.string(),
      nombre: z.string(),
      tipo: z.enum(["triple", "animalito", "zodiacal"]),
      turno: z.enum(["manana", "tarde", "noche"]),
      hora: z.string(),
      horaCierre: z.string(),
      pagos: z.record(z.string(), z.number()),
      minApuesta: z.number().default(500),
      maxNumero: z.number().default(100000),
      activa: z.boolean().default(true),
    }))
    .mutation(async ({ input }) => {
      await insert(loterias, input);
      return input;
    }),
  update: publicQuery
    .input(z.object({
      id: z.string(),
      nombre: z.string().optional(),
      tipo: z.enum(["triple", "animalito", "zodiacal"]).optional(),
      turno: z.enum(["manana", "tarde", "noche"]).optional(),
      hora: z.string().optional(),
      horaCierre: z.string().optional(),
      pagos: z.record(z.string(), z.number()).optional(),
      minApuesta: z.number().optional(),
      maxNumero: z.number().optional(),
      activa: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await db().update(loterias).set(data as any).where(eq(loterias.id, id));
      return { success: true };
    }),
  delete: publicQuery.input(z.object({ id: z.string() })).mutation(async ({ input }) => {
    await db().delete(loterias).where(eq(loterias.id, input.id));
    return { success: true };
  }),
});

// ============================================
// VENDEDORES
// ============================================
export const vendedoresRouter = createRouter({
  list: publicQuery.query(async () => {
    return db().select().from(vendedores);
  }),
  get: publicQuery.input(z.object({ id: z.string() })).query(async ({ input }) => {
    const rows = await db().select().from(vendedores).where(eq(vendedores.id, input.id)).limit(1);
    return rows[0] || null;
  }),
  create: publicQuery
    .input(z.object({
      id: z.string(),
      nombre: z.string(),
      telefono: z.string().optional(),
      cedula: z.string(),
      comisionPct: z.number().default(10),
      activo: z.boolean().default(true),
      fechaAlta: z.string(),
      notas: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      await insert(vendedores, input);
      return input;
    }),
  update: publicQuery
    .input(z.object({
      id: z.string(),
      nombre: z.string().optional(),
      telefono: z.string().optional(),
      cedula: z.string().optional(),
      comisionPct: z.number().optional(),
      activo: z.boolean().optional(),
      notas: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await db().update(vendedores).set(data as any).where(eq(vendedores.id, id));
      return { success: true };
    }),
  delete: publicQuery.input(z.object({ id: z.string() })).mutation(async ({ input }) => {
    await db().delete(vendedores).where(eq(vendedores.id, input.id));
    return { success: true };
  }),
});

// ============================================
// TERMINALES
// ============================================
export const terminalesRouter = createRouter({
  list: publicQuery.query(async () => {
    return db().select().from(terminales);
  }),
  get: publicQuery.input(z.object({ id: z.string() })).query(async ({ input }) => {
    const rows = await db().select().from(terminales).where(eq(terminales.id, input.id)).limit(1);
    return rows[0] || null;
  }),
  create: publicQuery
    .input(z.object({
      id: z.string(),
      codigo: z.string(),
      nombre: z.string(),
      ubicacion: z.string().optional(),
      vendedorId: z.string().optional(),
      activo: z.boolean().default(true),
      bloqueado: z.boolean().default(false),
      motivoBloqueo: z.string().optional(),
      fondo: z.number().default(0),
      saldo: z.number().default(0),
      comisionLoterias: z.number().default(10),
      comisionAnimalitos: z.number().default(10),
      comisionZodiacales: z.number().default(10),
      cuposPorLoteria: z.record(z.string(), z.number()).default({}),
      fechaAlta: z.string(),
    }))
    .mutation(async ({ input }) => {
      await insert(terminales, input);
      return input;
    }),
  update: publicQuery
    .input(z.object({
      id: z.string(),
      codigo: z.string().optional(),
      nombre: z.string().optional(),
      ubicacion: z.string().optional(),
      vendedorId: z.string().optional(),
      activo: z.boolean().optional(),
      bloqueado: z.boolean().optional(),
      motivoBloqueo: z.string().optional(),
      fondo: z.number().optional(),
      saldo: z.number().optional(),
      comisionLoterias: z.number().optional(),
      comisionAnimalitos: z.number().optional(),
      comisionZodiacales: z.number().optional(),
      cuposPorLoteria: z.record(z.string(), z.number()).optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await db().update(terminales).set(data as any).where(eq(terminales.id, id));
      return { success: true };
    }),
  delete: publicQuery.input(z.object({ id: z.string() })).mutation(async ({ input }) => {
    await db().delete(terminales).where(eq(terminales.id, input.id));
    return { success: true };
  }),
});

// ============================================
// TICKETS
// ============================================
export const ticketsRouter = createRouter({
  list: publicQuery.query(async () => {
    return db().select().from(tickets);
  }),
  listByDate: publicQuery.input(z.object({ fecha: z.string() })).query(async ({ input }) => {
    return db().select().from(tickets).where(eq(tickets.fechaSorteo, input.fecha));
  }),
  listByTerminal: publicQuery.input(z.object({ terminalId: z.string() })).query(async ({ input }) => {
    return db().select().from(tickets).where(eq(tickets.terminalId, input.terminalId));
  }),
  get: publicQuery.input(z.object({ id: z.string() })).query(async ({ input }) => {
    const rows = await db().select().from(tickets).where(eq(tickets.id, input.id)).limit(1);
    return rows[0] || null;
  }),
  create: publicQuery
    .input(z.object({
      id: z.string(),
      numeroTicket: z.string(),
      terminalId: z.string(),
      loteriaId: z.string(),
      vendedorId: z.string().optional(),
      fecha: z.string(),
      fechaSorteo: z.string(),
      hora: z.string(),
      jugadas: z.array(z.object({
        modalidad: z.string(),
        numero: z.string(),
        monto: z.number(),
        premioPotencial: z.number(),
      })),
      total: z.number(),
      estado: z.enum(["activo", "pagado", "anulado"]).default("activo"),
      montoPremio: z.number().optional(),
      fechaPago: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      await insert(tickets, input);
      return input;
    }),
  update: publicQuery
    .input(z.object({
      id: z.string(),
      estado: z.enum(["activo", "pagado", "anulado"]).optional(),
      montoPremio: z.number().optional(),
      fechaPago: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await db().update(tickets).set(data as any).where(eq(tickets.id, id));
      return { success: true };
    }),
  delete: publicQuery.input(z.object({ id: z.string() })).mutation(async ({ input }) => {
    await db().delete(tickets).where(eq(tickets.id, input.id));
    return { success: true };
  }),
});

// ============================================
// SORTEOS
// ============================================
export const sorteosRouter = createRouter({
  list: publicQuery.query(async () => {
    return db().select().from(sorteos);
  }),
  get: publicQuery.input(z.object({ id: z.string() })).query(async ({ input }) => {
    const rows = await db().select().from(sorteos).where(eq(sorteos.id, input.id)).limit(1);
    return rows[0] || null;
  }),
  create: publicQuery
    .input(z.object({
      id: z.string(),
      loteriaId: z.string(),
      fecha: z.string(),
      numeroGanador: z.string().optional(),
      zodiacal: z.string().optional(),
      resultadoCargado: z.boolean().default(false),
    }))
    .mutation(async ({ input }) => {
      await insert(sorteos, input);
      return input;
    }),
  update: publicQuery
    .input(z.object({
      id: z.string(),
      numeroGanador: z.string().optional(),
      zodiacal: z.string().optional(),
      resultadoCargado: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await db().update(sorteos).set(data as any).where(eq(sorteos.id, id));
      return { success: true };
    }),
  delete: publicQuery.input(z.object({ id: z.string() })).mutation(async ({ input }) => {
    await db().delete(sorteos).where(eq(sorteos.id, input.id));
    return { success: true };
  }),
});

// ============================================
// CUPOS
// ============================================
export const cuposRouter = createRouter({
  list: publicQuery.query(async () => {
    return db().select().from(cupos);
  }),
  get: publicQuery
    .input(z.object({ sorteoId: z.string(), modalidad: z.string(), numero: z.string() }))
    .query(async ({ input }) => {
      const rows = await db()
        .select()
        .from(cupos)
        .where(and(
          eq(cupos.sorteoId, input.sorteoId),
          eq(cupos.modalidad, input.modalidad),
          eq(cupos.numero, input.numero)
        ))
        .limit(1);
      return rows[0] || null;
    }),
  upsert: publicQuery
    .input(z.object({
      sorteoId: z.string(),
      modalidad: z.string(),
      numero: z.string(),
      limite: z.number(),
      acumulado: z.number(),
    }))
    .mutation(async ({ input }) => {
      const existing = await db()
        .select()
        .from(cupos)
        .where(and(
          eq(cupos.sorteoId, input.sorteoId),
          eq(cupos.modalidad, input.modalidad),
          eq(cupos.numero, input.numero)
        ))
        .limit(1);
      if (existing.length === 0) {
        await insert(cupos, input);
      } else {
        await db()
          .update(cupos)
          .set({ limite: input.limite, acumulado: input.acumulado })
          .where(eq(cupos.id, existing[0].id));
      }
      return { success: true };
    }),
});

// ============================================
// ESTADOS DE CUENTA
// ============================================
export const estadosCuentaRouter = createRouter({
  list: publicQuery.query(async () => {
    return db().select().from(estadosCuenta);
  }),
  getByTerminal: publicQuery
    .input(z.object({ terminalId: z.string(), fecha: z.string() }))
    .query(async ({ input }) => {
      const rows = await db()
        .select()
        .from(estadosCuenta)
        .where(and(
          eq(estadosCuenta.terminalId, input.terminalId),
          eq(estadosCuenta.fecha, input.fecha)
        ))
        .limit(1);
      return rows[0] || null;
    }),
  create: publicQuery
    .input(z.object({
      terminalId: z.string(),
      fecha: z.string(),
      ventas: z.number().default(0),
      premios: z.number().default(0),
      comision: z.number().default(0),
      neto: z.number().default(0),
      saldoAnterior: z.number().default(0),
      saldoActual: z.number().default(0),
      fechaCierre: z.string().optional(),
      observaciones: z.string().optional(),
      creadoPor: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      await insert(estadosCuenta, input);
      return input;
    }),
  update: publicQuery
    .input(z.object({
      id: z.number(),
      ventas: z.number().optional(),
      premios: z.number().optional(),
      comision: z.number().optional(),
      neto: z.number().optional(),
      saldoAnterior: z.number().optional(),
      saldoActual: z.number().optional(),
      fechaCierre: z.string().optional(),
      observaciones: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await db().update(estadosCuenta).set(data as any).where(eq(estadosCuenta.id, id));
      return { success: true };
    }),
});

// ============================================
// LOGS
// ============================================
export const logsRouter = createRouter({
  list: publicQuery.query(async () => {
    return db().select().from(logs).orderBy(desc(logs.createdAt));
  }),
  create: publicQuery
    .input(z.object({
      accion: z.string(),
      entidad: z.string(),
      entidadId: z.string(),
      mensaje: z.string(),
      usuario: z.string(),
      fecha: z.string(),
    }))
    .mutation(async ({ input }) => {
      await insert(logs, input);
      return input;
    }),
});

// ============================================
// SYNC (para inicialización masiva)
// ============================================
export const syncRouter = createRouter({
  all: publicQuery.query(async () => {
    const [
      configData,
      loteriasData,
      vendedoresData,
      terminalesData,
      ticketsData,
      sorteosData,
      cuposData,
      estadosCuentaData,
      logsData,
    ] = await Promise.all([
      db().select().from(appConfig).limit(1),
      db().select().from(loterias),
      db().select().from(vendedores),
      db().select().from(terminales),
      db().select().from(tickets),
      db().select().from(sorteos),
      db().select().from(cupos),
      db().select().from(estadosCuenta),
      db().select().from(logs),
    ]);
    return {
      config: configData[0] || null,
      loterias: loteriasData,
      vendedores: vendedoresData,
      terminales: terminalesData,
      tickets: ticketsData,
      sorteos: sorteosData,
      cupos: cuposData,
      estadosCuenta: estadosCuentaData,
      logs: logsData,
    };
  }),
  seed: publicQuery
    .input(z.object({
      config: z.any(),
      loterias: z.array(z.any()),
      vendedores: z.array(z.any()),
      terminales: z.array(z.any()),
      tickets: z.array(z.any()),
      sorteos: z.array(z.any()),
      cupos: z.array(z.any()),
      estadosCuenta: z.array(z.any()),
      logs: z.array(z.any()),
    }))
    .mutation(async ({ input }) => {
      // Clear existing data
      await db().delete(logs);
      await db().delete(estadosCuenta);
      await db().delete(cupos);
      await db().delete(tickets);
      await db().delete(sorteos);
      await db().delete(terminales);
      await db().delete(vendedores);
      await db().delete(loterias);
      await db().delete(appConfig);

      // Insert new data
      if (input.config) await insert(appConfig, input.config);
      if (input.loterias.length) await insert(loterias, input.loterias);
      if (input.vendedores.length) await insert(vendedores, input.vendedores);
      if (input.terminales.length) await insert(terminales, input.terminales);
      if (input.tickets.length) await insert(tickets, input.tickets);
      if (input.sorteos.length) await insert(sorteos, input.sorteos);
      if (input.cupos.length) await insert(cupos, input.cupos);
      if (input.estadosCuenta.length) await insert(estadosCuenta, input.estadosCuenta);
      if (input.logs.length) await insert(logs, input.logs);

      return { success: true };
    }),
});
