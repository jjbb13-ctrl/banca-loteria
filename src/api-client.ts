import { trpcClient } from "@/providers/trpc";

// Helper to call tRPC procedures
async function call<T>(promise: Promise<T>): Promise<T> {
  return promise;
}

// ============================================
// CONFIG
// ============================================
export async function getConfig(): Promise<any> {
  const data = await call(trpcClient.config.get.query());
  return {
    minApuesta: data.minApuesta,
    maxNumero: data.maxNumero,
    tiempoLimiteAnulacionMin: data.tiempoLimiteAnulacionMin,
    comisionDefault: data.comisionDefault,
    alertaCupoPct: data.alertaCupoPct,
  };
}

export async function updateConfig(config: any) {
  return call(trpcClient.config.update.mutate(config));
}

// ============================================
// LOTERÍAS
// ============================================
export async function listLoterias(): Promise<any[]> {
  return call(trpcClient.loterias.list.query());
}

export async function createLoteria(loteria: any) {
  return call(trpcClient.loterias.create.mutate(loteria));
}

export async function updateLoteria(id: string, data: any) {
  return call(trpcClient.loterias.update.mutate({ id, ...data }));
}

export async function deleteLoteria(id: string) {
  return call(trpcClient.loterias.delete.mutate({ id }));
}

// ============================================
// VENDEDORES
// ============================================
export async function listVendedores(): Promise<any[]> {
  return call(trpcClient.vendedores.list.query());
}

export async function createVendedor(vendedor: any) {
  return call(trpcClient.vendedores.create.mutate(vendedor));
}

export async function updateVendedor(id: string, data: any) {
  return call(trpcClient.vendedores.update.mutate({ id, ...data }));
}

export async function deleteVendedor(id: string) {
  return call(trpcClient.vendedores.delete.mutate({ id }));
}

// ============================================
// TERMINALES
// ============================================
export async function listTerminales(): Promise<any[]> {
  return call(trpcClient.terminales.list.query());
}

export async function createTerminal(terminal: any) {
  return call(trpcClient.terminales.create.mutate(terminal));
}

export async function updateTerminal(id: string, data: any) {
  return call(trpcClient.terminales.update.mutate({ id, ...data }));
}

export async function deleteTerminal(id: string) {
  return call(trpcClient.terminales.delete.mutate({ id }));
}

// ============================================
// TICKETS
// ============================================
export async function listTickets(): Promise<any[]> {
  return call(trpcClient.tickets.list.query());
}

export async function createTicket(ticket: any) {
  return call(trpcClient.tickets.create.mutate(ticket));
}

export async function updateTicket(id: string, data: any) {
  return call(trpcClient.tickets.update.mutate({ id, ...data }));
}

export async function deleteTicket(id: string) {
  return call(trpcClient.tickets.delete.mutate({ id }));
}

// ============================================
// SORTEOS
// ============================================
export async function listSorteos(): Promise<any[]> {
  return call(trpcClient.sorteos.list.query());
}

export async function createSorteo(sorteo: any) {
  return call(trpcClient.sorteos.create.mutate(sorteo));
}

export async function updateSorteo(id: string, data: any) {
  return call(trpcClient.sorteos.update.mutate({ id, ...data }));
}

export async function deleteSorteo(id: string) {
  return call(trpcClient.sorteos.delete.mutate({ id }));
}

// ============================================
// CUPOS
// ============================================
export async function listCupos(): Promise<any[]> {
  return call(trpcClient.cupos.list.query());
}

export async function upsertCupo(cupo: any) {
  return call(trpcClient.cupos.upsert.mutate(cupo));
}

// ============================================
// ESTADOS DE CUENTA
// ============================================
export async function listEstadosCuenta(): Promise<any[]> {
  return call(trpcClient.estadosCuenta.list.query());
}

export async function createEstadoCuenta(estado: any) {
  return call(trpcClient.estadosCuenta.create.mutate(estado));
}

export async function updateEstadoCuenta(id: number, data: any) {
  return call(trpcClient.estadosCuenta.update.mutate({ id, ...data }));
}

// ============================================
// LOGS
// ============================================
export async function listLogs(): Promise<any[]> {
  return call(trpcClient.logs.list.query());
}

export async function createLog(log: any) {
  return call(trpcClient.logs.create.mutate(log));
}

// ============================================
// SYNC
// ============================================
export async function syncAll(): Promise<any> {
  return call(trpcClient.sync.all.query());
}

export async function syncSeed(data: any) {
  return call(trpcClient.sync.seed.mutate(data));
}
