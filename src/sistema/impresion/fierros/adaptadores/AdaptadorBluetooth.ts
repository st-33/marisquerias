/**
 * 📶 ADAPTADOR BLUETOOTH
 *
 * Wrapper limpio de react-native-bluetooth-classic.
 * Maneja permisos, escaneo, conexión y escritura.
 *
 * USO:
 * ```typescript
 * const bt = new AdaptadorBluetooth();
 * const dispositivos = await bt.escanear();
 * await bt.conectar(dispositivos[0].direccion);
 * await bt.escribir(bytesEscPos);
 * await bt.desconectar();
 * ```
 */

import { Platform } from 'react-native';
import type { DispositivoFierro } from '../contratos/tipos';

// Importación condicional para web
let RNBluetoothClassic: any = null;

// Solo importar en nativo
if (Platform.OS !== 'web') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    RNBluetoothClassic = require('react-native-bluetooth-classic').default;
  } catch {
    console.warn('[AdaptadorBluetooth] react-native-bluetooth-classic no disponible');
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS INTERNOS
// ═══════════════════════════════════════════════════════════════════════════

interface DispositivoBT {
  id?: string;
  address: string;
  name?: string;
  bonded?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// ADAPTADOR BLUETOOTH
// ═══════════════════════════════════════════════════════════════════════════

export class AdaptadorBluetooth {
  private dispositivoConectado: DispositivoBT | null = null;
  private conectado: boolean = false;

  /**
   * Verifica si Bluetooth está disponible
   */
  async estaDisponible(): Promise<boolean> {
    if (!RNBluetoothClassic) {
      return false;
    }

    try {
      return await RNBluetoothClassic.isBluetoothAvailable();
    } catch (e) {
      console.error('[AdaptadorBluetooth] Error verificando disponibilidad:', e);
      return false;
    }
  }

  /**
   * Verifica si Bluetooth está habilitado
   */
  async estaHabilitado(): Promise<boolean> {
    if (!RNBluetoothClassic) return false;

    try {
      return await RNBluetoothClassic.isBluetoothEnabled();
    } catch {
      return false;
    }
  }

  /**
   * Solicita habilitar Bluetooth (Android)
   */
  async solicitarHabilitar(): Promise<boolean> {
    if (!RNBluetoothClassic) return false;

    try {
      return await RNBluetoothClassic.requestBluetoothEnabled();
    } catch {
      return false;
    }
  }

  /**
   * Obtiene dispositivos emparejados
   */
  async obtenerEmparejados(): Promise<DispositivoFierro[]> {
    if (!RNBluetoothClassic) return [];

    try {
      const emparejados: DispositivoBT[] = await RNBluetoothClassic.getBondedDevices();

      return emparejados.map((d) => ({
        nombre: d.name || 'Desconocido',
        direccion: d.address || d.id || '',
        tipo: 'bluetooth' as const,
        emparejado: true,
      }));
    } catch (e) {
      console.error('[AdaptadorBluetooth] Error obteniendo emparejados:', e);
      return [];
    }
  }

  /**
   * Escanea dispositivos Bluetooth.
   * Prioridad 1: Obtiene dispositivos emparejados del OS de inmediato (<50ms).
   * Prioridad 2: Intenta descubrir nuevos dispositivos en el aire con un timeout estricto (máx 3s)
   * sin bloquear jamás la respuesta ni colgar el hilo si la radio no responde.
   *
   * @param duracionMs - Duración máxima del escaneo de nuevos dispositivos en ms (default: 3000ms)
   */
  async escanear(duracionMs: number = 3000): Promise<DispositivoFierro[]> {
    if (!RNBluetoothClassic) return [];

    const todosMap = new Map<string, DispositivoFierro>();

    try {
      // 1. Obtener dispositivos emparejados de inmediato (directo del caché del OS)
      const emparejados = await this.obtenerEmparejados().catch(() => []);
      for (const d of emparejados) {
        if (d.direccion) {
          todosMap.set(d.direccion, d);
        }
      }

      // 2. Verificar si Bluetooth está habilitado para búsqueda en el aire
      const habilitado = await this.estaHabilitado().catch(() => false);
      if (!habilitado) {
        // Si no está habilitado pero ya tenemos emparejados, devolverlos de inmediato
        if (todosMap.size > 0) {
          return Array.from(todosMap.values());
        }
        throw new Error('Bluetooth no está habilitado');
      }

      // 3. Iniciar descubrimiento con timeout de seguridad (máximo 3000ms)
      const timeoutLimite = Math.min(Math.max(duracionMs, 1000), 3000);
      try {
        const timeoutPromesa = new Promise<boolean>((resolve) =>
          setTimeout(() => resolve(false), timeoutLimite)
        );
        const discoveryPromesa = RNBluetoothClassic.startDiscovery().catch((err: any) => {
          console.warn('[AdaptadorBluetooth] startDiscovery falló:', err);
          return false;
        });

        // Esperar discovery o timeout
        await Promise.race([discoveryPromesa, timeoutPromesa]);
      } catch (err) {
        console.warn('[AdaptadorBluetooth] Discovery no pudo iniciar:', err);
      }

      // 4. Cancelar discovery de inmediato para liberar la antena Bluetooth
      await RNBluetoothClassic.cancelDiscovery().catch(() => {});

      // 5. Incorporar dispositivos no emparejados descubiertos
      try {
        const descubiertos: DispositivoBT[] = (await RNBluetoothClassic.getUnpairedDevices()) || [];
        for (const d of descubiertos) {
          const direccion = d.address || d.id || '';
          if (direccion && !todosMap.has(direccion)) {
            todosMap.set(direccion, {
              nombre: d.name || 'Desconocido',
              direccion,
              tipo: 'bluetooth',
              emparejado: false,
            });
          }
        }
      } catch {
        // Ignorar fallo al leer no emparejados
      }

      // 6. Refrescar lista de emparejados por si hubo vinculación concurrente
      try {
        const emparejadosFrescos = await this.obtenerEmparejados();
        for (const d of emparejadosFrescos) {
          if (d.direccion) {
            todosMap.set(d.direccion, d);
          }
        }
      } catch {
        // Ignorar
      }

      return Array.from(todosMap.values());
    } catch (e: any) {
      console.error('[AdaptadorBluetooth] Error en escaneo:', e);
      if (todosMap.size > 0) {
        return Array.from(todosMap.values());
      }
      return this.obtenerEmparejados().catch(() => []);
    }
  }

  /**
   * Conecta a un dispositivo
   * @param direccion - MAC address del dispositivo
   */
  async conectar(direccion: string): Promise<void> {
    if (!RNBluetoothClassic) {
      throw new Error('Bluetooth no disponible en esta plataforma');
    }

    if (this.conectado) {
      await this.desconectar();
    }

    try {
      const dispositivo = await RNBluetoothClassic.connectToDevice(direccion, {
        delimiter: '\n',
        charset: 'latin1', // Para ESC/POS
      });

      if (!dispositivo) {
        throw new Error('No se pudo establecer conexión');
      }

      this.dispositivoConectado = {
        address: direccion,
        name: dispositivo.name,
      };
      this.conectado = true;

      console.log(`[AdaptadorBluetooth] ✅ Conectado a ${direccion}`);
    } catch (e: any) {
      this.conectado = false;
      this.dispositivoConectado = null;
      throw new Error(`Error al conectar: ${e?.message || 'Desconocido'}`);
    }
  }

  /**
   * Desconecta el dispositivo actual
   */
  async desconectar(): Promise<void> {
    if (!RNBluetoothClassic || !this.dispositivoConectado) {
      this.conectado = false;
      this.dispositivoConectado = null;
      return;
    }

    try {
      await RNBluetoothClassic.disconnectFromDevice(this.dispositivoConectado.address);
      console.log('[AdaptadorBluetooth] 🔴 Desconectado');
    } catch (e) {
      console.warn('[AdaptadorBluetooth] Error al desconectar:', e);
    } finally {
      this.conectado = false;
      this.dispositivoConectado = null;
    }
  }

  /**
   * Escribe bytes al dispositivo conectado
   * @param datos - Bytes a enviar (Uint8Array o string base64)
   */
  async escribir(datos: Uint8Array | string): Promise<void> {
    if (!RNBluetoothClassic || !this.dispositivoConectado) {
      throw new Error('No hay dispositivo conectado');
    }

    try {
      let dataToSend: string;

      if (datos instanceof Uint8Array) {
        // Convertir Uint8Array a string base64
        let binary = '';
        for (let i = 0; i < datos.length; i++) {
          binary += String.fromCharCode(datos[i]);
        }
        dataToSend =
          typeof btoa !== 'undefined' ? btoa(binary) : Buffer.from(datos).toString('base64');
      } else {
        dataToSend = datos;
      }

      await RNBluetoothClassic.writeToDevice(
        this.dispositivoConectado.address,
        dataToSend,
        'base64'
      );
    } catch (e: any) {
      throw new Error(`Error al escribir: ${e?.message || 'Desconocido'}`);
    }
  }

  /**
   * Lee datos del dispositivo (para básculas)
   * @param timeout - Timeout en ms
   */
  async leer(timeout: number = 5000): Promise<string> {
    if (!RNBluetoothClassic || !this.dispositivoConectado) {
      throw new Error('No hay dispositivo conectado');
    }

    try {
      const resultado = await Promise.race([
        RNBluetoothClassic.readFromDevice(this.dispositivoConectado.address),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Timeout de lectura')), timeout)
        ),
      ]);

      return resultado as string;
    } catch (e: any) {
      throw new Error(`Error al leer: ${e?.message || 'Desconocido'}`);
    }
  }

  /**
   * Verifica si está conectado
   */
  estaConectado(): boolean {
    return this.conectado && this.dispositivoConectado !== null;
  }

  /**
   * Obtiene info del dispositivo conectado
   */
  obtenerDispositivoConectado(): DispositivoFierro | null {
    if (!this.dispositivoConectado) return null;

    return {
      nombre: this.dispositivoConectado.name || 'Desconocido',
      direccion: this.dispositivoConectado.address,
      tipo: 'bluetooth',
      emparejado: true,
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SINGLETON EXPORTADO
// ═══════════════════════════════════════════════════════════════════════════

/** Instancia singleton del adaptador Bluetooth */
export const adaptadorBluetooth = new AdaptadorBluetooth();
