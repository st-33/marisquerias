/**
 * 🔥 SERVICIO DE FIERROS (El Objeto Sagrado™)
 *
 * Singleton único que gestiona toda la conexión con hardware de impresión.
 * Implementa IControladorFierros.
 *
 * ARQUITECTURA:
 * - Esta es la ÚNICA instancia de conexión en toda la app
 * - Se expone via ProveedorFierros (Context)
 * - Todos los componentes lo consumen vía useFierros()
 *
 * MIGRADO DE: core/services/HardwareService.ts
 */

import { PermissionsAndroid, Platform } from 'react-native';
import { AdaptadorBluetooth, adaptadorBluetooth } from '../adaptadores/AdaptadorBluetooth';
import { ConstructorEscPos, formatearPrecio, truncarTexto } from '../adaptadores/AdaptadorEscPos';
import type { IControladorFierros, OyenteEstado } from '../contratos/IControladorFierros';
import type {
  ConfiguracionTicket,
  DatosComanda,
  DatosCuenta,
  DatosVenta,
  DispositivoFierro,
  EstadoFierros,
  ItemPesado,
  OpcionesImpresion,
  OpcionesLecturaPeso,
  ResultadoImpresion,
  ResultadoOperacion,
  ResultadoPeso,
} from '../contratos/tipos';

// ═══════════════════════════════════════════════════════════════════════════
// MUTEX PARA OPERACIONES ATÓMICAS
// ═══════════════════════════════════════════════════════════════════════════

class MutexAsincrono {
  private bloqueado = false;
  private cola: (() => void)[] = [];

  async adquirir(): Promise<() => void> {
    return new Promise((resolve) => {
      const intentar = () => {
        if (!this.bloqueado) {
          this.bloqueado = true;
          const liberar = () => {
            this.bloqueado = false;
            if (this.cola.length > 0) {
              this.cola.shift()!();
            }
          };
          resolve(liberar);
        } else {
          this.cola.push(intentar);
        }
      };
      intentar();
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SERVICIO FIERROS - SINGLETON
// ═══════════════════════════════════════════════════════════════════════════

class ServicioFierros implements IControladorFierros {
  private static instancia: ServicioFierros | null = null;

  private readonly mutex = new MutexAsincrono();
  private readonly adaptadorBT: AdaptadorBluetooth;
  private oyentes: Set<OyenteEstado> = new Set();

  private estado: EstadoFierros = {
    estaConectado: false,
    estaConectando: false,
    estaEscaneando: false,
    dispositivoActivo: null,
    basculaActiva: null,
    error: null,
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // SINGLETON
  // ═══════════════════════════════════════════════════════════════════════════

  private constructor() {
    this.adaptadorBT = adaptadorBluetooth;
    console.log('[ServicioFierros] 🟢 Instancia única creada');
  }

  public static obtenerInstancia(): ServicioFierros {
    if (!ServicioFierros.instancia) {
      ServicioFierros.instancia = new ServicioFierros();
    }
    return ServicioFierros.instancia;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PROPIEDADES REACTIVAS (IControladorFierros)
  // ═══════════════════════════════════════════════════════════════════════════

  get estaConectado(): boolean {
    return this.estado.estaConectado;
  }

  get estaConectando(): boolean {
    return this.estado.estaConectando;
  }

  get estaEscaneando(): boolean {
    return this.estado.estaEscaneando;
  }

  get dispositivoActivo(): DispositivoFierro | null {
    return this.estado.dispositivoActivo;
  }

  get basculaActiva(): DispositivoFierro | null {
    return this.estado.basculaActiva;
  }

  get error(): string | null {
    return this.estado.error;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // GESTIÓN DE ESTADO
  // ═══════════════════════════════════════════════════════════════════════════

  private actualizarEstado(parcial: Partial<EstadoFierros>): void {
    this.estado = { ...this.estado, ...parcial };
    console.log('[ServicioFierros] Estado:', parcial);
    this.notificar();
  }

  private notificar(): void {
    this.oyentes.forEach((oyente) => oyente(this.estado));
  }

  public suscribir(oyente: OyenteEstado): () => void {
    this.oyentes.add(oyente);
    oyente(this.estado); // Enviar estado actual inmediatamente
    return () => this.oyentes.delete(oyente);
  }

  public obtenerEstado(): EstadoFierros {
    return { ...this.estado };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PERMISOS ANDROID
  // ═══════════════════════════════════════════════════════════════════════════

  private async solicitarPermisosAndroid(): Promise<boolean> {
    if (Platform.OS !== 'android') return true;

    const apiLevel =
      typeof Platform.Version === 'number' ? Platform.Version : parseInt(Platform.Version, 10);

    try {
      if (apiLevel >= 31) {
        // Android 12+
        const resultado = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        ]);

        return (
          resultado['android.permission.BLUETOOTH_SCAN'] === 'granted' &&
          resultado['android.permission.BLUETOOTH_CONNECT'] === 'granted'
        );
      } else {
        // Android < 12
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      }
    } catch (e) {
      console.error('[ServicioFierros] Error en permisos:', e);
      return false;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CONEXIÓN (IControladorFierros)
  // ═══════════════════════════════════════════════════════════════════════════

  async escanearDispositivos(): Promise<DispositivoFierro[]> {
    console.log('[ServicioFierros] 🔍 Iniciando escaneo...');

    // Verificar permisos
    const permisosOk = await this.solicitarPermisosAndroid();
    if (!permisosOk) {
      throw new Error('Permisos de Bluetooth denegados');
    }

    this.actualizarEstado({ estaEscaneando: true, error: null });

    try {
      const dispositivos = await this.adaptadorBT.escanear(10000);
      console.log(`[ServicioFierros] ✅ Encontrados ${dispositivos.length} dispositivos`);
      return dispositivos;
    } catch (e: any) {
      const mensaje = e?.message || 'Error al escanear';
      this.actualizarEstado({ error: mensaje });
      throw new Error(mensaje);
    } finally {
      this.actualizarEstado({ estaEscaneando: false });
    }
  }

  async conectarImpresora(dispositivo: DispositivoFierro): Promise<void> {
    const liberar = await this.mutex.adquirir();

    console.log(`[ServicioFierros] 🔌 Conectando a ${dispositivo.direccion}...`);
    this.actualizarEstado({ estaConectando: true, error: null });

    try {
      await this.adaptadorBT.conectar(dispositivo.direccion);

      this.actualizarEstado({
        estaConectado: true,
        estaConectando: false,
        dispositivoActivo: dispositivo,
      });

      console.log('[ServicioFierros] ✅ Impresora conectada');
    } catch (e: any) {
      const mensaje = e?.message || 'Error de conexión';
      this.actualizarEstado({
        estaConectado: false,
        estaConectando: false,
        dispositivoActivo: null,
        error: mensaje,
      });
      throw new Error(mensaje);
    } finally {
      liberar();
    }
  }

  async conectarBascula(dispositivo: DispositivoFierro): Promise<void> {
    const liberar = await this.mutex.adquirir();

    console.log(`[ServicioFierros] ⚖️ Conectando báscula ${dispositivo.direccion}...`);
    this.actualizarEstado({ estaConectando: true, error: null });

    try {
      // Para la báscula usamos otro adaptador o el mismo con modo diferente
      // Por ahora reutilizamos el adaptador BT
      await this.adaptadorBT.conectar(dispositivo.direccion);

      this.actualizarEstado({
        estaConectando: false,
        basculaActiva: dispositivo,
      });

      console.log('[ServicioFierros] ✅ Báscula conectada');
    } catch (e: any) {
      const mensaje = e?.message || 'Error al conectar báscula';
      this.actualizarEstado({
        estaConectando: false,
        error: mensaje,
      });
      throw new Error(mensaje);
    } finally {
      liberar();
    }
  }

  async desconectar(): Promise<void> {
    const liberar = await this.mutex.adquirir();

    try {
      await this.adaptadorBT.desconectar();

      this.actualizarEstado({
        estaConectado: false,
        dispositivoActivo: null,
        basculaActiva: null,
      });

      console.log('[ServicioFierros] 🔴 Desconectado');
    } catch (e) {
      console.warn('[ServicioFierros] Error al desconectar:', e);
    } finally {
      liberar();
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // IMPRESIÓN (IControladorFierros)
  // ═══════════════════════════════════════════════════════════════════════════

  async imprimirComanda(
    datos: DatosComanda,
    opciones: OpcionesImpresion
  ): Promise<ResultadoImpresion> {
    if (!this.estaConectado) {
      return { exito: false, metodo: 'bluetooth', mensaje: 'No hay impresora conectada' };
    }

    const liberar = await this.mutex.adquirir();

    try {
      const ticket = new ConstructorEscPos()
        .inicializar()
        .centrar()
        .textoLinea(`COMANDA ${opciones.rol.toUpperCase()}`)
        .linea()
        .izquierda()
        .textoLinea(`Mesa: ${datos.mesaId}`)
        .textoLinea(new Date().toLocaleTimeString())
        .separador();

      // Items
      for (const item of datos.items) {
        ticket.textoLinea(`${item.cantidad}x ${item.nombre}`);
        if (item.variantes) {
          ticket.textoLinea(`  → ${item.variantes}`);
        }
        if (item.notas) {
          ticket.textoLinea(`  📝 ${item.notas}`);
        }
      }

      ticket.separador().lineas(3).cortar();

      await this.adaptadorBT.escribir(ticket.construir());

      return { exito: true, metodo: 'bluetooth' };
    } catch (e: any) {
      return { exito: false, metodo: 'bluetooth', mensaje: e?.message };
    } finally {
      liberar();
    }
  }

  async imprimirCuenta(
    datos: DatosCuenta,
    opciones: OpcionesImpresion
  ): Promise<ResultadoImpresion> {
    if (!this.estaConectado) {
      return { exito: false, metodo: 'bluetooth', mensaje: 'No hay impresora conectada' };
    }

    const liberar = await this.mutex.adquirir();

    try {
      const nombreNegocio = opciones.nombreNegocio || 'RESTAURANTE';

      const ticket = new ConstructorEscPos()
        .inicializar()
        .centrar()
        .negrita(true)
        .textoLinea(nombreNegocio.toUpperCase())
        .negrita(false)
        .linea()
        .textoLinea(new Date().toLocaleString('es-MX'))
        .separadorDoble()
        .izquierda()
        .textoLinea(`Mesa: ${datos.mesaId}  Tipo: ${datos.tipo}`)
        .separador();

      // Items
      for (const item of datos.items) {
        const precio = formatearPrecio(item.precio * item.cantidad);
        const nombre = truncarTexto(item.nombre, 20);
        ticket.columnas(`${item.cantidad}x ${nombre}`, precio);
      }

      ticket
        .separador()
        .columnas('SUBTOTAL:', formatearPrecio(datos.totales.subtotal))
        .negrita(true)
        .columnas('TOTAL:', formatearPrecio(datos.totales.total))
        .negrita(false)
        .separadorDoble()
        .centrar()
        .textoLinea('¡Gracias por su visita!')
        .lineas(3)
        .cortar();

      await this.adaptadorBT.escribir(ticket.construir());

      return { exito: true, metodo: 'bluetooth' };
    } catch (e: any) {
      return { exito: false, metodo: 'bluetooth', mensaje: e?.message };
    } finally {
      liberar();
    }
  }

  async imprimirTicketVenta(
    datos: DatosVenta,
    config: ConfiguracionTicket
  ): Promise<ResultadoImpresion> {
    if (!this.estaConectado) {
      return { exito: false, metodo: 'bluetooth', mensaje: 'No hay impresora conectada' };
    }

    const liberar = await this.mutex.adquirir();

    try {
      const ticket = new ConstructorEscPos()
        .inicializar()
        .centrar()
        .separadorDoble()
        .negrita(true)
        .textoLinea(config.nombreNegocio.toUpperCase())
        .negrita(false)
        .separadorDoble()
        .izquierda()
        .textoLinea(`FECHA: ${new Date(datos.timestamp).toLocaleString()}`)
        .separador();

      // Items
      for (const item of datos.items) {
        const esKg = item.unidad === 'kg';
        const cantTexto = esKg ? `${item.cantidad.toFixed(3)} kg` : `${item.cantidad} pza`;

        ticket.negrita(true).textoLinea(item.nombre.toUpperCase()).negrita(false);

        const detalle = esKg
          ? `${cantTexto} x ${formatearPrecio(item.precio)}/kg`
          : `${item.cantidad} x ${formatearPrecio(item.precio)}`;

        ticket.columnas(detalle, formatearPrecio(item.subtotal));
        ticket.linea();
      }

      ticket
        .separador()
        .derecha()
        .negrita(true)
        .textoLinea(`TOTAL: ${formatearPrecio(datos.total)}`)
        .negrita(false)
        .centrar();

      if (config.mensajeFinal) {
        ticket.linea().textoLinea(config.mensajeFinal);
      }

      ticket.lineas(3).cortar();

      await this.adaptadorBT.escribir(ticket.construir());

      return { exito: true, metodo: 'bluetooth' };
    } catch (e: any) {
      return { exito: false, metodo: 'bluetooth', mensaje: e?.message };
    } finally {
      liberar();
    }
  }

  async imprimirEtiquetaBascula(
    item: ItemPesado,
    config: ConfiguracionTicket
  ): Promise<ResultadoImpresion> {
    if (!this.estaConectado) {
      return { exito: false, metodo: 'bluetooth', mensaje: 'No hay impresora conectada' };
    }

    const liberar = await this.mutex.adquirir();

    try {
      const ticket = new ConstructorEscPos()
        .inicializar()
        .centrar()
        .textoLinea(config.nombreNegocio || 'PESO EXACTO')
        .linea()
        .doble(true)
        .textoLinea(`${item.peso.toFixed(3)} KG`)
        .doble(false)
        .linea()
        .textoLinea(item.nombre)
        .textoLinea(`${formatearPrecio(item.precioKg)} / kg`)
        .separador()
        .negrita(true)
        .textoLinea(`TOTAL: ${formatearPrecio(item.subtotal)}`)
        .negrita(false)
        .linea()
        .textoLinea(new Date().toLocaleTimeString())
        .lineas(3)
        .cortar();

      await this.adaptadorBT.escribir(ticket.construir());

      return { exito: true, metodo: 'bluetooth' };
    } catch (e: any) {
      return { exito: false, metodo: 'bluetooth', mensaje: e?.message };
    } finally {
      liberar();
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // BÁSCULA (IControladorFierros)
  // ═══════════════════════════════════════════════════════════════════════════

  async leerPeso(opciones?: OpcionesLecturaPeso): Promise<ResultadoPeso> {
    if (!this.basculaActiva) {
      return { exito: false, unidad: 'kg', mensaje: 'Báscula no conectada' };
    }

    try {
      // Enviar comando de lectura (W\r es común en básculas NCI/CAS)
      await this.adaptadorBT.escribir(new TextEncoder().encode('W\r'));

      // Esperar respuesta
      await new Promise((r) => setTimeout(r, 200));

      const respuesta = await this.adaptadorBT.leer(opciones?.timeout || 5000);

      // Parsear respuesta (ej: "ST,GS,+  1.234kg")
      const match = respuesta.match(/[-+]?\d*\.?\d+/);
      if (match) {
        return { exito: true, peso: parseFloat(match[0]), unidad: 'kg' };
      }

      return { exito: false, unidad: 'kg', mensaje: 'Formato de peso inválido' };
    } catch (e: any) {
      return { exito: false, unidad: 'kg', mensaje: e?.message };
    }
  }

  async tararBascula(): Promise<ResultadoOperacion> {
    if (!this.basculaActiva) {
      return { exito: false, mensaje: 'Báscula no conectada' };
    }

    try {
      // Comando de tara (T\r o Z\r según modelo)
      await this.adaptadorBT.escribir(new TextEncoder().encode('T\r'));
      return { exito: true };
    } catch (e: any) {
      return { exito: false, mensaje: e?.message };
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTACIÓN SINGLETON
// ═══════════════════════════════════════════════════════════════════════════

/** El Objeto Sagrado™ - Única instancia de conexión hardware */
export const servicioFierros = ServicioFierros.obtenerInstancia();

// Export type for external use
export type { ServicioFierros };
