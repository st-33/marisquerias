/**
 * 🚀 DESPACHADOR DE COLA (DespachadorCola)
 *
 * Motor de procesamiento de trabajos de impresión con:
 * - Cola en Firebase RTDB
 * - Reintentos automáticos
 * - Transacciones atómicas (lock por instancia)
 * - Garbage collector automático
 *
 * Motor canónico de cola RTDB para impresión local y remota.
 * Contrato y nombres del sistema en español.
 */

import type { Database } from 'firebase/database';
import { get, onChildAdded, onValue, ref, runTransaction, set, update } from 'firebase/database';
import type {
  CanalImpresion,
  ConfiguracionTicket,
  DatosComanda,
  DatosCuenta,
  DatosVenta,
  PropositoTrabajo,
} from '../contratos/tipos';
import { servicioFierros } from '../servicio/ServicioFierros';

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════

export interface ConfiguracionDespachador {
  /** Máximo de reintentos por trabajo (default: 1) */
  maxReintentos: number;
  /** Delay entre reintentos en ms (default: 2000) */
  retardoReintento: number;
  /** Si debe procesar automáticamente la cola */
  procesamientoAuto: boolean;
  /** Canal específico para modo Hub */
  canal: CanalImpresion;
}

type ModoOperacion = 'dispositivo' | 'hub';

/** Trabajo en la cola de Firebase */
export interface TrabajoRTDB {
  jobId: string;
  purpose: PropositoTrabajo;
  state: 'pendiente_impresion' | 'impresion_enviada' | 'exito' | 'fallo';
  channel: CanalImpresion;
  orderId?: string;
  deviceId?: string;
  payload?: Record<string, any>;
  templateVersion?: string;
  attempts: number;
  lastError?: string;
  createdAt: number;
  updatedAt: number;
  _lockedBy?: string;
}

export interface SolicitudTrabajoRemoto {
  idTrabajo?: string;
  proposito: PropositoTrabajo;
  idPedido?: string;
  canal?: CanalImpresion;
  payload?: Record<string, any>;
  templateVersion?: string;
}

/** Resultado de operación de impresión */
interface ResultadoProcesamiento {
  exito: boolean;
  mensaje: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURACIÓN POR DEFECTO
// ═══════════════════════════════════════════════════════════════════════════

export const SPOOL_JOB_TTL_MS = 48 * 60 * 60 * 1000;

export function esTrabajoExpirado(createdAt: unknown, ahora = Date.now()): boolean {
  if (typeof createdAt !== 'number' || !Number.isFinite(createdAt)) return true;
  return ahora - createdAt > SPOOL_JOB_TTL_MS;
}

const CONFIGURACION_DEFECTO: ConfiguracionDespachador = {
  maxReintentos: 1, // Sin reintentos extra para evitar impresión triple
  retardoReintento: 2000,
  procesamientoAuto: true,
  canal: 'standard',
};

// ═══════════════════════════════════════════════════════════════════════════
// UTILIDADES
// ═══════════════════════════════════════════════════════════════════════════

/** Limpia valores undefined de objetos para Firebase */
function limpiarUndefined<T>(entrada: T): T {
  if (entrada === undefined) return null as any;
  if (entrada === null) return entrada;
  if (Array.isArray(entrada)) {
    return entrada.map((v) => limpiarUndefined(v)) as any;
  }
  if (typeof entrada === 'object') {
    const proto = Object.getPrototypeOf(entrada as any);
    const esObjetoPlano = proto === Object.prototype || proto === null;
    if (!esObjetoPlano) return entrada;
    const salida: any = {};
    for (const [k, v] of Object.entries(entrada as any)) {
      if (v === undefined) continue;
      salida[k] = limpiarUndefined(v);
    }
    return salida;
  }
  return entrada;
}

// ═══════════════════════════════════════════════════════════════════════════
// DESPACHADOR DE COLA - SINGLETON
// ═══════════════════════════════════════════════════════════════════════════

export class DespachadorCola {
  // 🔒 SINGLETON: Map de instancias únicas por tenant+modo
  private static instancias = new Map<string, DespachadorCola>();

  private db: Database;
  private tenantPath: string;
  private idDispositivo: string;
  private config: ConfiguracionDespachador;
  private procesando: boolean = false;
  private listenerCola: (() => void) | null = null;
  private listenersConfigTicket: (() => void)[] = [];
  private configTicketAjustes: any = null;
  private configTicketLegacy: any = null;
  private modo: ModoOperacion;
  private idInstancia: string;
  private procesamientoInicialTimer: ReturnType<typeof setTimeout> | null = null;
  private garbageCollectorTimer: ReturnType<typeof setTimeout> | null = null;
  private procesandoColaInicial = false;
  private trabajosRecibidosDuranteInicio = new Set<string>();
  private trabajosIniciales = new Set<string>();

  // ═══════════════════════════════════════════════════════════════════════════
  // CONSTRUCTOR Y SINGLETON
  // ═══════════════════════════════════════════════════════════════════════════

  private constructor(
    db: Database,
    tenantPath: string,
    idDispositivo: string,
    config: Partial<ConfiguracionDespachador> = {},
    modo: ModoOperacion = 'dispositivo'
  ) {
    this.db = db;
    this.tenantPath = tenantPath;
    this.idDispositivo = idDispositivo;
    this.config = { ...CONFIGURACION_DEFECTO, ...config };
    this.modo = modo;
    this.idInstancia = `${idDispositivo}_${Math.random().toString(36).slice(2, 7)}`;
    console.log(`[DespachadorCola] 🟢 INSTANCIA CREADA: ${this.idInstancia} (${modo})`);
  }

  /**
   * Obtiene o crea la instancia única para tenant+modo
   */
  public static obtenerInstancia(
    db: Database,
    tenantPath: string,
    idDispositivo: string,
    config: Partial<ConfiguracionDespachador> = {},
    modo: ModoOperacion = 'dispositivo'
  ): DespachadorCola {
    const clave = `${tenantPath}_${modo}`;

    let instancia = DespachadorCola.instancias.get(clave);

    if (instancia) {
      // Reconfiguración en caliente
      const nuevaConfig = { ...instancia.config, ...config };
      const canalCambio = modo === 'hub' && nuevaConfig.canal !== instancia.config.canal;
      const dispositivoCambio = idDispositivo !== instancia.idDispositivo;
      const estabaActivo = !!instancia.listenerCola;

      if (canalCambio || dispositivoCambio) {
        if (estabaActivo) instancia.detener();
        instancia.idDispositivo = idDispositivo;
        instancia.config = nuevaConfig;
        if (estabaActivo) instancia.iniciar();
      } else {
        instancia.config = nuevaConfig;
      }

      console.log(`[DespachadorCola] ♻️ RE-USANDO instancia: ${instancia.idInstancia}`);
      return instancia;
    }

    console.log(`[DespachadorCola] 🆕 Creando NUEVA instancia para: ${clave}`);
    instancia = new DespachadorCola(db, tenantPath, idDispositivo, config, modo);
    DespachadorCola.instancias.set(clave, instancia);

    return instancia;
  }

  /**
   * Obtiene un trabajo por ID sin crear ni reconfigurar una instancia de cola.
   */
  public static async obtenerTrabajo(
    db: Database,
    tenantPath: string,
    idTrabajo: string
  ): Promise<TrabajoRTDB | null> {
    const snapshot = await get(ref(db, `${tenantPath}/spool/jobs/${idTrabajo}`));
    return snapshot.exists() ? (snapshot.val() as TrabajoRTDB) : null;
  }

  /**
   * Encola directamente en la cola Hub del canal indicado.
   * No altera el despachador local del dispositivo que solicita la impresión.
   */
  public static async encolarRemoto(
    db: Database,
    tenantPath: string,
    solicitud: SolicitudTrabajoRemoto
  ): Promise<TrabajoRTDB> {
    const idTrabajo = solicitud.idTrabajo || DespachadorCola.generarIdTrabajo(solicitud.proposito);
    const ahora = Date.now();
    const canal =
      solicitud.canal || (solicitud.proposito === 'venta_crudo' ? 'venta_crudo' : 'standard');
    const trabajo = limpiarUndefined({
      jobId: idTrabajo,
      purpose: solicitud.proposito,
      state: 'pendiente_impresion' as const,
      channel: canal,
      orderId: solicitud.idPedido,
      payload: solicitud.payload,
      templateVersion: solicitud.templateVersion,
      attempts: 0,
      createdAt: ahora,
      updatedAt: ahora,
    }) as TrabajoRTDB;

    await Promise.all([
      set(ref(db, `${tenantPath}/spool/jobs/${idTrabajo}`), trabajo),
      set(
        ref(
          db,
          canal === 'standard'
            ? `${tenantPath}/spool/hub/queue/${idTrabajo}`
            : `${tenantPath}/spool/hub/${canal}/queue/${idTrabajo}`
        ),
        true
      ),
    ]);

    return trabajo;
  }

  /**
   * Encola en Hub sin duplicar trabajos exitosos o ya pendientes.
   */
  public static async encolarRemotoIdempotente(
    db: Database,
    tenantPath: string,
    solicitud: SolicitudTrabajoRemoto
  ): Promise<TrabajoRTDB> {
    if (solicitud.idTrabajo) {
      const existente = await DespachadorCola.obtenerTrabajo(db, tenantPath, solicitud.idTrabajo);
      if (
        existente &&
        (existente.state === 'exito' ||
          existente.state === 'pendiente_impresion' ||
          existente.state === 'impresion_enviada')
      ) {
        return existente;
      }
    }

    return DespachadorCola.encolarRemoto(db, tenantPath, solicitud);
  }

  /**
   * Destruye la instancia singleton
   */
  public static destruirInstancia(tenantPath: string, modo: ModoOperacion): void {
    const clave = `${tenantPath}_${modo}`;
    const instancia = DespachadorCola.instancias.get(clave);

    if (instancia) {
      console.log(`[DespachadorCola] 🗑️ DESTRUYENDO instancia: ${instancia.idInstancia}`);
      instancia.detener();
      DespachadorCola.instancias.delete(clave);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CICLO DE VIDA
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Inicia el despachador (escucha la cola y procesa automáticamente)
   */
  iniciar(): void {
    if (this.listenerCola) {
      console.warn(`[DespachadorCola] ⚠️ Ya está iniciado (${this.idInstancia})`);
      return;
    }

    console.log(`[DespachadorCola] 🚀 INICIANDO despachador ${this.idInstancia}`);
    console.log(`[DespachadorCola] Modo: ${this.modo}, Canal: ${this.config.canal}`);

    // Escuchar configuración de ticket
    if (this.listenersConfigTicket.length === 0) {
      const refAjustes = ref(this.db, `${this.tenantPath}/ajustes/ticket`);
      const refLegacy = ref(this.db, `${this.tenantPath}/config/ticket`);

      const unsub1 = onValue(refAjustes, (snap) => {
        this.configTicketAjustes = snap.exists() ? snap.val() : null;
      });
      const unsub2 = onValue(refLegacy, (snap) => {
        this.configTicketLegacy = snap.exists() ? snap.val() : null;
      });

      this.listenersConfigTicket.push(unsub1, unsub2);
    }

    // Calcular ruta de la cola
    const canal = this.config.canal;
    const rutaCola =
      this.modo === 'hub'
        ? canal === 'standard'
          ? `${this.tenantPath}/spool/hub/queue`
          : `${this.tenantPath}/spool/hub/${canal}/queue`
        : `${this.tenantPath}/spool/devices/${this.idDispositivo}/queue`;

    console.log(`[DespachadorCola] 📍 Escuchando cola en: ${rutaCola}`);

    const refCola = ref(this.db, rutaCola);

    // onChildAdded solo escucha NUEVOS hijos DESPUÉS de la suscripción.
    // La cola histórica se procesa después de la interacción inicial para no bloquear el arranque.
    if (this.config.procesamientoAuto) {
      this.procesandoColaInicial = true;
      this.programarProcesamientoInicial();
    }

    // Escuchar nuevos trabajos
    this.listenerCola = onChildAdded(refCola, (snapshot) => {
      const idTrabajo = snapshot.key;
      if (!idTrabajo || !this.config.procesamientoAuto) return;

      if (this.procesandoColaInicial) {
        this.trabajosRecibidosDuranteInicio.add(idTrabajo);
        return;
      }

      if (this.trabajosIniciales.delete(idTrabajo)) return;

      console.log(`[DespachadorCola] 🆕 NUEVO trabajo detectado: ${idTrabajo}`);
      this.procesarTrabajo(idTrabajo).catch((err) =>
        console.error('[DespachadorCola] Error procesando trabajo:', idTrabajo, err)
      );
    }) as any;

    console.log('[DespachadorCola] ✅ Listener activo');

    // Auto-limpieza diferida al iniciar; nunca bloquea el renderizado inicial.
    this.programarGarbageCollector();
  }

  private programarProcesamientoInicial(): void {
    if (this.procesamientoInicialTimer) return;

    this.procesamientoInicialTimer = setTimeout(() => {
      this.procesamientoInicialTimer = null;
      void this.procesarCola().catch((err) =>
        console.error('[DespachadorCola] Error procesando cola inicial:', err)
      );
    }, 0);
  }

  private programarGarbageCollector(): void {
    if (this.garbageCollectorTimer) return;

    this.garbageCollectorTimer = setTimeout(() => {
      this.garbageCollectorTimer = null;
      void this.ejecutarGarbageCollector();
    }, 0);
  }

  private finalizarProcesamientoInicial(): void {
    this.procesandoColaInicial = false;
    const pendientes = Array.from(this.trabajosRecibidosDuranteInicio);
    this.trabajosRecibidosDuranteInicio.clear();

    for (const idTrabajo of pendientes) {
      if (this.trabajosIniciales.delete(idTrabajo)) continue;
      void this.procesarTrabajo(idTrabajo).catch((err) =>
        console.error('[DespachadorCola] Error procesando trabajo post-arranque:', idTrabajo, err)
      );
    }

    this.trabajosIniciales.clear();
  }

  private cancelarTareasIniciales(): void {
    if (this.procesamientoInicialTimer) {
      clearTimeout(this.procesamientoInicialTimer);
      this.procesamientoInicialTimer = null;
    }
    if (this.garbageCollectorTimer) {
      clearTimeout(this.garbageCollectorTimer);
      this.garbageCollectorTimer = null;
    }
    this.procesandoColaInicial = false;
    this.trabajosRecibidosDuranteInicio.clear();
    this.trabajosIniciales.clear();
  }

  /**
   * Detiene el despachador
   */
  detener(): void {
    this.cancelarTareasIniciales();
    if (this.listenerCola) {
      this.listenerCola();
      this.listenerCola = null;
      console.log(`[DespachadorCola] 🛑 Despachador detenido (${this.idInstancia})`);
    }

    if (this.listenersConfigTicket.length > 0) {
      this.listenersConfigTicket.forEach((u) => u());
      this.listenersConfigTicket = [];
      this.configTicketAjustes = null;
      this.configTicketLegacy = null;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ENCOLAR TRABAJOS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Agrega un trabajo a la cola
   */
  async encolar(trabajo: {
    idTrabajo?: string;
    proposito: PropositoTrabajo;
    idPedido?: string;
    idDispositivo?: string;
    canal?: CanalImpresion;
    payload?: Record<string, any>;
    templateVersion?: string;
  }): Promise<string> {
    const idTrabajo = trabajo.idTrabajo || DespachadorCola.generarIdTrabajo(trabajo.proposito);
    const ahora = Date.now();

    const canal =
      trabajo.canal || (trabajo.proposito === 'venta_crudo' ? 'venta_crudo' : 'standard');

    const trabajoRTDB: TrabajoRTDB = {
      jobId: idTrabajo,
      purpose: trabajo.proposito,
      state: 'pendiente_impresion',
      channel: canal,
      orderId: trabajo.idPedido,
      deviceId: trabajo.idDispositivo,
      payload: trabajo.payload ? limpiarUndefined(trabajo.payload) : undefined,
      templateVersion: trabajo.templateVersion,
      attempts: 0,
      createdAt: ahora,
      updatedAt: ahora,
    };

    // Guardar trabajo
    await set(ref(this.db, `${this.tenantPath}/spool/jobs/${idTrabajo}`), trabajoRTDB);

    // Agregar a la cola correspondiente
    if (trabajo.idDispositivo) {
      await set(
        ref(
          this.db,
          `${this.tenantPath}/spool/devices/${trabajo.idDispositivo}/queue/${idTrabajo}`
        ),
        true
      );
    } else {
      const rutaHub =
        canal === 'standard'
          ? `${this.tenantPath}/spool/hub/queue/${idTrabajo}`
          : `${this.tenantPath}/spool/hub/${canal}/queue/${idTrabajo}`;
      await set(ref(this.db, rutaHub), true);
    }

    console.log('[DespachadorCola] ✉️ Trabajo encolado:', idTrabajo);

    if (this.config.procesamientoAuto && !this.procesando) {
      this.procesarCola();
    }

    return idTrabajo;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PROCESAMIENTO
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Procesa la cola completa
   */
  private async procesarCola(): Promise<void> {
    if (this.procesando) return;
    this.procesando = true;

    try {
      const canal = this.config.canal;
      const rutaCola =
        this.modo === 'hub'
          ? canal === 'standard'
            ? `${this.tenantPath}/spool/hub/queue`
            : `${this.tenantPath}/spool/hub/${canal}/queue`
          : `${this.tenantPath}/spool/devices/${this.idDispositivo}/queue`;

      const refCola = ref(this.db, rutaCola);
      const snapshot = await get(refCola);

      if (!snapshot.exists()) return;

      const datos = snapshot.val() || {};
      const idTrabajos = Object.keys(datos);
      idTrabajos.forEach((idTrabajo) => this.trabajosIniciales.add(idTrabajo));

      for (const idTrabajo of idTrabajos) {
        await this.procesarTrabajo(idTrabajo);
      }
    } catch (error) {
      console.error('[DespachadorCola] Error procesando cola:', error);
    } finally {
      this.procesando = false;
      this.finalizarProcesamientoInicial();
    }
  }

  /**
   * Procesa un trabajo individual con lock atómico
   */
  private async procesarTrabajo(idTrabajo: string): Promise<void> {
    try {
      const refTrabajo = ref(this.db, `${this.tenantPath}/spool/jobs/${idTrabajo}`);
      const snapshot = await get(refTrabajo);

      if (!snapshot.exists()) {
        await set(ref(this.db, this.rutaColaActual(idTrabajo)), null);
        return;
      }

      const trabajo = snapshot.val() as TrabajoRTDB;

      if (esTrabajoExpirado(trabajo.createdAt)) {
        await this.eliminarTrabajoExpirado(idTrabajo, trabajo);
        return;
      }

      console.log(`[DespachadorCola] 🔍 Procesando ${idTrabajo}:`, {
        estado: trabajo.state,
        canal: trabajo.channel,
        dispositivo: this.idDispositivo,
        modo: this.modo,
      });

      // Si ya terminó, remover de la cola
      if (trabajo.state === 'exito' || trabajo.state === 'fallo') {
        await this.removerDeCola(idTrabajo);
        return;
      }

      // Si excedió reintentos, marcar como fallo
      if (trabajo.attempts >= this.config.maxReintentos) {
        await update(refTrabajo, {
          state: 'fallo',
          lastError: 'Excedió número máximo de reintentos',
          updatedAt: Date.now(),
        });
        await this.removerDeCola(idTrabajo);
        return;
      }

      // 🔐 LOCK ATÓMICO: Solo tomar trabajos pendientes
      const resultadoClaim = await runTransaction(refTrabajo, (trabajoActual) => {
        if (!trabajoActual) return;

        if (trabajoActual.state !== 'pendiente_impresion') {
          return; // Abortar transacción
        }

        return {
          ...trabajoActual,
          state: 'impresion_enviada',
          attempts: (trabajoActual.attempts || 0) + 1,
          updatedAt: Date.now(),
          _lockedBy: this.idInstancia,
        };
      });

      if (!resultadoClaim.committed) return;

      const trabajoFresco = resultadoClaim.snapshot.val() as TrabajoRTDB;

      // Verificar que somos dueños del lock
      if (trabajoFresco._lockedBy && trabajoFresco._lockedBy !== this.idInstancia) {
        return;
      }

      console.log(`[DespachadorCola] 🖨️ [${this.idInstancia}] Ejecutando impresión: ${idTrabajo}`);

      // Ejecutar impresión según propósito
      let resultado: ResultadoProcesamiento;
      switch (trabajo.purpose) {
        case 'comanda':
          resultado = await this.imprimirComanda(trabajoFresco);
          break;
        case 'cuenta':
          resultado = await this.imprimirCuenta(trabajoFresco);
          break;
        case 'venta_crudo':
          resultado = await this.imprimirVentaCrudo(trabajoFresco);
          break;
        default:
          resultado = { exito: false, mensaje: 'Propósito no soportado' };
      }

      // Actualizar estado según resultado
      if (resultado.exito) {
        await update(refTrabajo, {
          state: 'exito',
          updatedAt: Date.now(),
        });
        await this.removerDeCola(idTrabajo);
      } else {
        await update(refTrabajo, {
          state: 'pendiente_impresion',
          lastError: resultado.mensaje,
          updatedAt: Date.now(),
        });
        await new Promise((resolve) => setTimeout(resolve, this.config.retardoReintento));
      }
    } catch (error: any) {
      console.error('[DespachadorCola] Error fatal en trabajo:', idTrabajo, error);
      const refTrabajo = ref(this.db, `${this.tenantPath}/spool/jobs/${idTrabajo}`);
      await update(refTrabajo, {
        state: 'pendiente_impresion',
        lastError: error?.message || 'Error desconocido',
        updatedAt: Date.now(),
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // IMPRESIÓN ESPECÍFICA
  // ═══════════════════════════════════════════════════════════════════════════

  private async imprimirComanda(trabajo: TrabajoRTDB): Promise<ResultadoProcesamiento> {
    try {
      const refPedido = ref(this.db, `${this.tenantPath}/pedidos/${trabajo.orderId}`);
      const snapshot = await get(refPedido);
      if (!snapshot.exists()) return { exito: false, mensaje: 'Pedido no encontrado' };

      const pedido = snapshot.val();
      const itemsObj = pedido.items || {};
      const itemsNuevos = Object.entries(itemsObj)
        .filter(([, item]: [string, any]) => item.estado === 'nuevo')
        .map(([, item]: [string, any]) => ({
          nombre: item.nombre,
          cantidad: item.cantidad,
          variantes: item.variantes ? Object.values(item.variantes).join(', ') : undefined,
        }));

      if (itemsNuevos.length === 0) {
        return { exito: true, mensaje: 'Nada nuevo que imprimir' };
      }

      const datosComanda: DatosComanda = {
        mesaId: pedido.mesaId,
        tipo: pedido.tipo,
        items: itemsNuevos,
        timestamp: Date.now(),
      };

      const resultado = await servicioFierros.imprimirComanda(datosComanda, { rol: 'cocina' });

      return { exito: resultado.exito, mensaje: resultado.mensaje || 'OK' };
    } catch (error: any) {
      return { exito: false, mensaje: error?.message };
    }
  }

  private async imprimirCuenta(trabajo: TrabajoRTDB): Promise<ResultadoProcesamiento> {
    console.log('[DespachadorCola] 💰 imprimirCuenta iniciado para:', trabajo.jobId);
    try {
      let data: Record<string, any> | undefined = trabajo.payload;
      if (!data) {
        console.log(
          '[DespachadorCola] 📋 Sin payload, obteniendo pedido desde RTDB:',
          trabajo.orderId
        );
        const snap = await get(ref(this.db, `${this.tenantPath}/pedidos/${trabajo.orderId}`));
        if (!snap.exists()) {
          console.error('[DespachadorCola] ❌ Pedido no encontrado:', trabajo.orderId);
          return { exito: false, mensaje: 'Pedido no encontrado' };
        }
        data = snap.val();
      }

      // Validar que data existe
      if (!data) {
        console.error('[DespachadorCola] ❌ Datos del pedido vacíos');
        return { exito: false, mensaje: 'Datos del pedido vacíos' };
      }

      console.log('[DespachadorCola] 📝 Datos de pedido:', {
        items: Object.keys(data.items || {}).length,
        mesaId: data.mesaId,
      });

      const itemsObj = data.items || {};
      const items = Array.isArray(itemsObj)
        ? itemsObj
        : Object.values(itemsObj).map((it: any) => ({
            nombre: it.nombre,
            cantidad: it.cantidad,
            precio: it.precio,
            variantes: it.variantes ? Object.values(it.variantes).join(', ') : undefined,
          }));

      const subtotal = Number(data.totales?.subtotal || data.subtotal || 0);
      const total = Number(data.totales?.total || data.total || 0);

      const datosCuenta: DatosCuenta = {
        mesaId: data.mesaId || '0',
        tipo: data.tipo || 'local',
        items,
        totales: { subtotal, total },
        timestamp: Date.now(),
      };

      const nombreNegocio =
        this.configTicketAjustes?.businessName ||
        this.configTicketLegacy?.header ||
        this.tenantPath.split('/').pop() ||
        'Restaurante';

      console.log('[DespachadorCola] 🖨️ Llamando a servicioFierros.imprimirCuenta...');
      const resultado = await servicioFierros.imprimirCuenta(datosCuenta, {
        rol: 'caja',
        nombreNegocio,
      });

      console.log('[DespachadorCola] ✅ Resultado impresión:', resultado);
      return { exito: resultado.exito, mensaje: resultado.mensaje || 'OK' };
    } catch (error: any) {
      console.error('[DespachadorCola] ❌ Error en imprimirCuenta:', error);
      return { exito: false, mensaje: error?.message };
    }
  }

  private async imprimirVentaCrudo(trabajo: TrabajoRTDB): Promise<ResultadoProcesamiento> {
    try {
      const payload = trabajo.payload || {};

      // Obtener config de ticket si no la tenemos
      let ajustes = this.configTicketAjustes;
      let legacy = this.configTicketLegacy;

      if (!ajustes && !legacy) {
        const [ajustesSnap, legacySnap] = await Promise.all([
          get(ref(this.db, `${this.tenantPath}/ajustes/ticket`)).catch(() => null as any),
          get(ref(this.db, `${this.tenantPath}/config/ticket`)).catch(() => null as any),
        ]);
        ajustes = ajustesSnap?.exists?.() ? ajustesSnap.val() : null;
        legacy = legacySnap?.exists?.() ? legacySnap.val() : null;
      }

      const nombreNegocio = ajustes?.businessName || legacy?.header || 'NEGOCIO';
      const piePagina = ajustes?.footerMessage || legacy?.footer || '¡Gracias por su compra!';

      const datosVenta: DatosVenta = {
        items: payload.items || [],
        total: payload.total || 0,
        timestamp: payload.timestamp || Date.now(),
      };

      const config: ConfiguracionTicket = {
        nombreNegocio,
        encabezado: nombreNegocio,
        mensajeFinal: piePagina,
      };

      const resultado = await servicioFierros.imprimirTicketVenta(datosVenta, config);

      return { exito: resultado.exito, mensaje: resultado.mensaje || 'OK' };
    } catch (error: any) {
      return { exito: false, mensaje: error?.message };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // UTILIDADES
  // ═══════════════════════════════════════════════════════════════════════════

  private rutaColaActual(idTrabajo: string): string {
    const canal = this.config.canal;
    return this.modo === 'hub'
      ? canal === 'standard'
        ? `${this.tenantPath}/spool/hub/queue/${idTrabajo}`
        : `${this.tenantPath}/spool/hub/${canal}/queue/${idTrabajo}`
      : `${this.tenantPath}/spool/devices/${this.idDispositivo}/queue/${idTrabajo}`;
  }

  private rutaColaParaGarbageCollector(idTrabajo: string, trabajo: Partial<TrabajoRTDB>): string {
    const canal = trabajo.channel || trabajo.purpose || this.config.canal || 'standard';
    const canalNormalizado = canal === 'cuenta' || canal === 'comanda' ? 'standard' : canal;
    return this.modo === 'hub'
      ? canalNormalizado === 'standard'
        ? `${this.tenantPath}/spool/hub/queue/${idTrabajo}`
        : `${this.tenantPath}/spool/hub/${canalNormalizado}/queue/${idTrabajo}`
      : `${this.tenantPath}/spool/devices/${
          trabajo.deviceId || this.idDispositivo
        }/queue/${idTrabajo}`;
  }

  private async eliminarTrabajoExpirado(
    idTrabajo: string,
    trabajo: Partial<TrabajoRTDB>
  ): Promise<void> {
    await Promise.all([
      set(ref(this.db, this.rutaColaParaGarbageCollector(idTrabajo, trabajo)), null),
      set(ref(this.db, `${this.tenantPath}/spool/jobs/${idTrabajo}`), null),
    ]);
    console.log(`[DespachadorCola] 🧹 Trabajo expirado eliminado: ${idTrabajo}`, {
      createdAt: trabajo.createdAt,
      ttlMs: SPOOL_JOB_TTL_MS,
    });
  }

  private async removerDeCola(idTrabajo: string): Promise<void> {
    const refTrabajo = ref(this.db, `${this.tenantPath}/spool/jobs/${idTrabajo}`);
    const snap = await get(refTrabajo);
    const datos = snap.val() || {};

    let canal = datos.channel || datos.purpose || this.config.canal || 'standard';
    if (!datos.channel && (canal === 'cuenta' || canal === 'comanda')) {
      canal = 'standard';
    }

    const rutaCola = this.rutaColaActual(idTrabajo);

    // Si éxito, eliminar trabajo completamente; si fallo, dejarlo para auditoría
    if (snap.exists() && snap.val().state === 'exito') {
      await Promise.all([set(ref(this.db, rutaCola), null), set(refTrabajo, null)]);
      console.log(`[DespachadorCola] ✅ Trabajo ${idTrabajo} PURGADO`);
    } else {
      await set(ref(this.db, rutaCola), null);
      console.log(
        `[DespachadorCola] ⚠️ Trabajo ${idTrabajo} removido de cola (guardado para auditoría)`
      );
    }
  }

  private static generarIdTrabajo(proposito: PropositoTrabajo): string {
    return `${proposito}_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
  }

  /**
   * 🧹 GARBAGE COLLECTOR
   * Elimina trabajos antiguos (>48h) y sus referencias en las colas para evitar saturar RTDB.
   */
  private async ejecutarGarbageCollector(): Promise<void> {
    try {
      console.log(`[DespachadorCola] 🧹 Iniciando GC...`);
      const refTrabajos = ref(this.db, `${this.tenantPath}/spool/jobs`);
      const snap = await get(refTrabajos);

      if (!snap.exists()) return;

      const ahora = Date.now();
      const actualizaciones: Record<string, any> = {};
      const referenciasCola: string[] = [];
      let contador = 0;

      snap.forEach((child) => {
        const trabajo = (child.val() || {}) as Partial<TrabajoRTDB>;
        if (esTrabajoExpirado(trabajo.createdAt, ahora)) {
          actualizaciones[child.key!] = null;
          referenciasCola.push(this.rutaColaParaGarbageCollector(child.key!, trabajo));
          contador++;
        }
      });

      if (contador > 0) {
        await Promise.all([
          update(refTrabajos, actualizaciones),
          ...referenciasCola.map((ruta) => set(ref(this.db, ruta), null)),
        ]);
        console.log(`[DespachadorCola] ♻️ GC completado: ${contador} trabajos purgados`);
      }
    } catch (e) {
      console.warn('[DespachadorCola] ⚠️ Error en Garbage Collector:', e);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ACCIONES MANUALES
  // ═══════════════════════════════════════════════════════════════════════════

  async cancelarTrabajo(idTrabajo: string): Promise<void> {
    const refTrabajo = ref(this.db, `${this.tenantPath}/spool/jobs/${idTrabajo}`);
    await update(refTrabajo, {
      state: 'fallo',
      lastError: 'Cancelado por usuario',
      updatedAt: Date.now(),
    });
    await this.removerDeCola(idTrabajo);
  }

  async reintentarTrabajo(idTrabajo: string): Promise<void> {
    const refTrabajo = ref(this.db, `${this.tenantPath}/spool/jobs/${idTrabajo}`);
    const snap = await get(refTrabajo);
    if (!snap.exists()) return;

    const trabajo = snap.val() as TrabajoRTDB;
    await update(refTrabajo, {
      state: 'pendiente_impresion',
      attempts: 0,
      updatedAt: Date.now(),
    });

    if (trabajo.deviceId) {
      await set(
        ref(this.db, `${this.tenantPath}/spool/devices/${trabajo.deviceId}/queue/${idTrabajo}`),
        true
      );
    }

    if (this.config.procesamientoAuto && !this.procesando) {
      this.procesarCola();
    }
  }
}
