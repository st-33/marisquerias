/**
 * 🔄 useFierrosLegacy - Hook Adaptador de Compatibilidad
 *
 * Este hook IMITA la API del viejo useHardware() para que
 * devices.tsx y otros archivos legacy no necesiten reescribirse.
 *
 * @deprecated Usar useFierros() en código nuevo
 *
 * USO EN MIGRACIÓN:
 * ```diff
 * - import { useHardware } from 'src/sistema/providers/HardwareProvider';
 * + import { useHardware } from 'src/sistema/impresion/fierros/hooks/useFierrosLegacy';
 * ```
 */

import type { DispositivoFierro } from '../contratos/tipos';
import { useFierros } from '../proveedor/ProveedorFierros';

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS LEGACY (compatibilidad con código viejo)
// ═══════════════════════════════════════════════════════════════════════════

/** Tipo Device del viejo HardwareService */
interface DeviceLegacy {
  name: string;
  address: string;
  originalDevice?: unknown;
}

/** Tipo Order del viejo TicketFormatter */
interface OrderLegacy {
  items: {
    cantidad: number;
    nombre: string;
    precio: number;
  }[];
  total: number;
}

/** Tipo TenantTicketConfig del viejo TicketFormatter */
interface TenantTicketConfigLegacy {
  nombreNegocio: string;
  encabezado?: string;
  logoBase64?: string;
  telefono?: string;
  mensajeFinal?: string;
  redesSociales?: {
    facebook?: string;
    instagram?: string;
    whatsapp?: string;
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// CONVERSORES
// ═══════════════════════════════════════════════════════════════════════════

function dispositivoALegacy(d: DispositivoFierro | null): DeviceLegacy | null {
  if (!d) return null;
  return {
    name: d.nombre,
    address: d.direccion,
  };
}

function legacyADispositivo(d: DeviceLegacy): DispositivoFierro {
  return {
    nombre: d.name,
    direccion: d.address,
    tipo: 'bluetooth',
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// HOOK LEGACY
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Hook de compatibilidad con la API vieja
 * Mapea la nueva API (español) a la vieja API (inglés)
 *
 * @deprecated Usar useFierros() en código nuevo
 */
export const useHardware = () => {
  const fierros = useFierros();

  return {
    // Estado (nombres en inglés para compatibilidad)
    isConnected: fierros.estaConectado,
    isConnecting: fierros.estaConectando,
    connectedDevice: dispositivoALegacy(fierros.dispositivoActivo),
    connectedScale: dispositivoALegacy(fierros.basculaActiva),
    error: fierros.error,

    // Acciones (nombres en inglés)
    scan: async (): Promise<DeviceLegacy[]> => {
      const dispositivos = await fierros.escanear();
      return dispositivos.map((d) => ({
        name: d.nombre,
        address: d.direccion,
      }));
    },

    connect: async (device: DeviceLegacy): Promise<void> => {
      await fierros.conectarImpresora(legacyADispositivo(device));
    },

    connectScale: async (device: DeviceLegacy): Promise<void> => {
      await fierros.conectarBascula(legacyADispositivo(device));
    },

    disconnect: async (): Promise<void> => {
      await fierros.desconectar();
    },

    print: async (order: OrderLegacy, config: TenantTicketConfigLegacy): Promise<void> => {
      const resultado = await fierros.imprimirCuenta(
        {
          mesaId: '0',
          tipo: 'local',
          items: order.items.map((it) => ({
            nombre: it.nombre,
            cantidad: it.cantidad,
            precio: it.precio,
          })),
          totales: {
            subtotal: order.total,
            total: order.total,
          },
          timestamp: Date.now(),
        },
        {
          rol: 'caja',
          nombreNegocio: config.nombreNegocio,
        }
      );

      if (!resultado.exito) {
        throw new Error(resultado.mensaje || 'Error de impresión');
      }
    },

    leerPeso: async () => {
      const resultado = await fierros.leerPeso();
      return {
        success: resultado.exito,
        peso: resultado.peso,
        message: resultado.mensaje,
      };
    },

    tararBascula: async () => {
      const resultado = await fierros.tararBascula();
      return {
        success: resultado.exito,
        message: resultado.mensaje,
      };
    },
  };
};

// También exportamos los tipos legacy por si alguien los necesita
export type {
  DeviceLegacy as Device,
  OrderLegacy as Order,
  TenantTicketConfigLegacy as TenantTicketConfig,
};
