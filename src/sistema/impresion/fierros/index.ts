/**
 * 🖨️ SISTEMA DE IMPRESIÓN - EXPORTACIONES PÚBLICAS
 *
 * Este es el punto de entrada del módulo.
 * Solo se exportan las APIs públicas que otros módulos deben usar.
 *
 * USO:
 * ```typescript
 * import {
 *   ProveedorFierros,
 *   useFierros,
 *   GestorHubGlobal,
 *   useEstadoHub,
 * } from '@/nucleo/sistema-impresion';
 * ```
 */

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS (para consumo externo)
// ═══════════════════════════════════════════════════════════════════════════

export type {
  // Contratos
  IControladorFierros,
  OyenteEstado,
} from './contratos/IControladorFierros';

export type {
  CanalImpresion,
  ConfiguracionHub,
  // Configuración
  ConfiguracionTicket,
  // Datos de impresión
  DatosComanda,
  DatosCuenta,
  DatosVenta,
  // Hub
  DestinoHub,
  // Dispositivos
  DispositivoFierro,
  EstadoFierros,
  EstadoTrabajo,
  ItemComanda,
  ItemCuenta,
  ItemPesado,
  ItemVenta,
  OpcionesImpresion,
  OpcionesLecturaPeso,
  PropositoTrabajo,
  // Resultados
  ResultadoImpresion,
  ResultadoOperacion,
  ResultadoPeso,
  // Cola
  TrabajoImpresion,
} from './contratos/tipos';

// ═══════════════════════════════════════════════════════════════════════════
// PROVIDER Y HOOKS (API principal)
// ═══════════════════════════════════════════════════════════════════════════

export { ProveedorFierros } from './proveedor/ProveedorFierros';

export {
  useBasculaActiva,
  useDispositivoActivo,
  useErrorFierros,
  useEstaConectado,
  useFierros,
} from './hooks/useFierros';

// ═══════════════════════════════════════════════════════════════════════════
// ESTADO HUB (Zustand)
// ═══════════════════════════════════════════════════════════════════════════

export {
  destinoACanal,
  useCanalImpresion,
  useConfiguracionHub,
  useEstadoHub,
  useHubDebeEstarActivo,
} from './estado/EstadoHub';

// ═══════════════════════════════════════════════════════════════════════════
// HUB (Componente invisible)
// ═══════════════════════════════════════════════════════════════════════════

export { GestorHub, GestorHubGlobal } from './hub/GestorHub';

// ═══════════════════════════════════════════════════════════════════════════
// SERVICIO SINGLETON (uso avanzado)
// ═══════════════════════════════════════════════════════════════════════════

export { servicioFierros } from './servicio/ServicioFierros';

// ═══════════════════════════════════════════════════════════════════════════
// ADAPTADORES (uso interno, pero exportados por si se necesitan)
// ═══════════════════════════════════════════════════════════════════════════

export {
  COMANDOS_ESCPOS,
  ConstructorEscPos,
  formatearPrecio,
  generarTicketPrueba,
  textoABytes,
  truncarTexto,
} from './adaptadores/AdaptadorEscPos';

export { AdaptadorBluetooth, adaptadorBluetooth } from './adaptadores/AdaptadorBluetooth';

// ═══════════════════════════════════════════════════════════════════════════
// COLA DE IMPRESIÓN
// ═══════════════════════════════════════════════════════════════════════════

export { DespachadorCola, type ConfiguracionDespachador } from './cola/DespachadorCola';
