import { authRouter } from "./auth-router";
import { createRouter, publicQuery } from "./middleware";
import {
  configRouter,
  loteriasRouter,
  vendedoresRouter,
  terminalesRouter,
  ticketsRouter,
  sorteosRouter,
  cuposRouter,
  estadosCuentaRouter,
  logsRouter,
  syncRouter,
} from "./banca-router";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  auth: authRouter,
  config: configRouter,
  loterias: loteriasRouter,
  vendedores: vendedoresRouter,
  terminales: terminalesRouter,
  tickets: ticketsRouter,
  sorteos: sorteosRouter,
  cupos: cuposRouter,
  estadosCuenta: estadosCuentaRouter,
  logs: logsRouter,
  sync: syncRouter,
});

export type AppRouter = typeof appRouter;
