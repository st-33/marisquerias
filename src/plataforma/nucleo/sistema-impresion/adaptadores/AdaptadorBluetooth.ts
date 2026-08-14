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
    RNBluetoothClassic = require('react-native-bluetooth-classic').default;
  } catch (e) {
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
    } catch (e) {
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
    } catch (e) {
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
   * Escanea dispositivos cercanos
   * @param duracionMs - Duración del escaneo en ms (default: 10s)
   */
  async escanear(duracionMs: number = 10000): Promise<DispositivoFierro[]> {
    if (!RNBluetoothClassic) return [];

    try {
      // Primero verificar que esté habilitado
      const habilitado = await this.estaHabilitado();
      if (!habilitado) {
        throw new Error('Bluetooth no está habilitado');
      }

      // Iniciar discovery
      const iniciado = await RNBluetoothClassic.startDiscovery();
      if (!iniciado) {
        // Si no inició discovery, al menos devolver emparejados
        return this.obtenerEmparejados();
      }

      // Esperar la duración del escaneo
      await new Promise((resolve) => setTimeout(resolve, duracionMs));

      // Cancelar discovery y obtener resultados
      await RNBluetoothClassic.cancelDiscovery().catch(() => {});

      // Combinar nuevos descubiertos con emparejados
      const descubiertos: DispositivoBT[] = (await RNBluetoothClassic.getUnpairedDevices()) || [];
      const emparejados: DispositivoBT[] = (await RNBluetoothClassic.getBondedDevices()) || [];

      const todosMap = new Map<string, DispositivoFierro>();

      // Primero emparejados (tienen prioridad)
      for (const d of emparejados) {
        const direccion = d.address || d.id || '';
        if (direccion) {
          todosMap.set(direccion, {
            nombre: d.name || 'Desconocido',
            direccion,
            tipo: 'bluetooth',
            emparejado: true,
          });
        }
      }

      // Luego descubiertos (solo si no están ya)
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

      return Array.from(todosMap.values());
    } catch (e: any) {
      console.error('[AdaptadorBluetooth] Error en escaneo:', e);
      // Fallback: devolver emparejados
      return this.obtenerEmparejados();
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
