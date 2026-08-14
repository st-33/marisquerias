/**
 * 🎯 MODERADOR DE COMANDAS
 *
 * Sistema tonto que DISTRIBUYE información de comandas.
 * NO toma decisiones de negocio, solo ENRUTA.
 *
 * RESPONSABILIDADES:
 * 1. Verificar si items van a COCINA o se quedan en MESERA
 * 2. Distribuir a los destinos correctos (cocina, inventario, analytics, etc.)
 * 3. Validar que operaciones son por MESA (no por usuario)
 * 4. Limitar usuarios suscritos por mesa (máx 3 activos)
 *
 * PRINCIPIOS:
 * - Todo se basa en mesaId
 * - No mezclar lógica de notificaciones
 * - Operaciones atómicas
 */

import { Database, get, ref, runTransaction } from 'firebase/database';
import { resolver } from '../utils/paths';

type ItemParaEnviar = {
  productId?: string;
  nombre: string;
  cantidad: number;
  precio: number;
  variantes?: Record<string, string[]>;
  categoriaId?: string;
};

type ResultadoDistribucion = {
  success: boolean;
  itemsACocina: string[]; // IDs de items que fueron a cocina
  itemsAMesera: string[]; // IDs de items que se quedaron en mesera
  error?: string;
};

export class ModeradorComandas {
  constructor(private db: Database, private tenantPath: string) {}

  /**
   * 🎯 DISTRIBUIR ITEMS DE UNA COMANDA
   *
   * Decide qué va a cocina y qué se queda en mesera según configuración de categorías.
   *
   * @param mesaId - ID de la mesa (TODO se basa en esto)
   * @param pedidoId - ID del pedido/cuenta
   * @param items - Items a distribuir
   * @returns Resultado con IDs distribuidos
   */
  async distribuirComanda(
    mesaId: string,
    pedidoId: string,
    items: ItemParaEnviar[]
  ): Promise<ResultadoDistribucion> {
    try {
      // 1. Obtener configuración de categorías y productos
      const [categoriasSnap, productosSnap] = await Promise.all([
        get(ref(this.db, `${this.tenantPath}/menu/categorias`)),
        get(ref(this.db, `${this.tenantPath}/menu/productos`)),
      ]);
      const categorias = categoriasSnap.val() || {};
      const productos = productosSnap.val() || {};

      const itemsACocina: string[] = [];
      const itemsAMesera: string[] = [];

      // 2. Clasificar items según su configuración (producto > categoría)
      for (const item of items) {
        const categoriaId = item.categoriaId;
        const productId = item.productId;
        const categoria = categoriaId ? categorias[categoriaId] : null;
        const producto = productId ? productos[productId] : null;

        // 🔥 RESOLUCIÓN DE HERENCIA:
        // Si el producto tiene config personalizada, usar la del producto
        // Si no, heredar de la categoría
        let vaACocina: boolean;
        if (producto?.usarConfigPersonalizada) {
          // Usar configuración del producto
          vaACocina = producto.enviarACocina !== false;
        } else {
          // Heredar de la categoría (o default true si no hay categoría)
          vaACocina = categoria?.enviarACocina !== false;
        }

        if (vaACocina) {
          itemsACocina.push(item.nombre);
        } else {
          itemsAMesera.push(item.nombre);
        }
      }

      console.log('[ModeradorComandas] 📊 Distribución:', {
        mesaId,
        pedidoId,
        aCocina: itemsACocina.length,
        aMesera: itemsAMesera.length,
      });

      // 3. Actualizar estado de items según destino
      const updates: Record<string, any> = {};
      const pedidoRef = ref(this.db, `${this.tenantPath}/${resolver('pedidos')}/${pedidoId}`);
      const pedidoSnap = await get(pedidoRef);
      const pedido = pedidoSnap.val();

      if (!pedido || !pedido.items) {
        throw new Error('Pedido no encontrado o sin items');
      }

      // Validar que pedido pertenece a la mesa
      if (pedido.mesaId !== mesaId) {
        throw new Error(`Pedido ${pedidoId} no pertenece a mesa ${mesaId}`);
      }

      // Marcar items según destino
      Object.entries(pedido.items).forEach(([itemId, itemData]: [string, any]) => {
        const itemNombre = itemData.nombre;

        if (itemsACocina.includes(itemNombre)) {
          // Items que van a cocina: estado 'en_cocina'
          updates[`items/${itemId}/estado`] = 'en_cocina';
          updates[`items/${itemId}/destinoCocina`] = true;
        } else if (itemsAMesera.includes(itemNombre)) {
          // Items que se quedan en mesera: estado 'listo' directo (sin pasar por cocina)
          updates[`items/${itemId}/estado`] = 'listo';
          updates[`items/${itemId}/destinoCocina`] = false;
          updates[`items/${itemId}/listoAt`] = Date.now();
        }
      });

      // 4. Aplicar actualizaciones con runTransaction (atómico)
      await runTransaction(pedidoRef, (currentPedido) => {
        if (!currentPedido) return currentPedido;

        // Validar mesa nuevamente
        if (currentPedido.mesaId !== mesaId) {
          throw new Error('Mesa ID no coincide');
        }

        // Aplicar updates
        Object.entries(updates).forEach(([path, value]) => {
          const keys = path.split('/');
          let target: any = currentPedido;

          for (let i = 0; i < keys.length - 1; i++) {
            target = target[keys[i]];
          }

          target[keys[keys.length - 1]] = value;
        });

        currentPedido.updatedAt = Date.now();
        return currentPedido;
      });

      return {
        success: true,
        itemsACocina,
        itemsAMesera,
      };
    } catch (error) {
      console.error('[ModeradorComandas] ❌ Error distribuyendo comanda:', error);
      return {
        success: false,
        itemsACocina: [],
        itemsAMesera: [],
        error: error instanceof Error ? error.message : 'Error desconocido',
      };
    }
  }

  /**
   * 🔒 VALIDAR LÍMITE DE USUARIOS POR MESA
   *
   * Máximo 3 usuarios pueden estar suscritos activamente a una mesa.
   * Los demás solo pueden ver (read-only).
   *
   * @param mesaId - ID de la mesa
   * @param userId - ID del usuario que quiere suscribirse
   * @returns true si puede editar, false si solo puede ver
   */
  async validarAccesoMesa(mesaId: string, userId: string): Promise<boolean> {
    try {
      const mesaRef = ref(this.db, `${this.tenantPath}/${resolver('mesas_estado')}/${mesaId}`);

      const result = await runTransaction(mesaRef, (mesa) => {
        if (!mesa) {
          // Mesa no existe, crear con usuario
          return {
            ...mesa,
            usuariosActivos: {
              [userId]: {
                timestamp: Date.now(),
                puedeEditar: true,
              },
            },
          };
        }

        const usuariosActivos = mesa.usuariosActivos || {};
        const usuariosEditando = Object.values(usuariosActivos).filter(
          (u: any) => u.puedeEditar
        ).length;

        // Si ya está el usuario, mantener su estado
        if (usuariosActivos[userId]) {
          return mesa;
        }

        // Si hay menos de 3 usuarios editando, agregar con permisos
        if (usuariosEditando < 3) {
          usuariosActivos[userId] = {
            timestamp: Date.now(),
            puedeEditar: true,
          };
        } else {
          // Si ya hay 3, agregar como solo lectura
          usuariosActivos[userId] = {
            timestamp: Date.now(),
            puedeEditar: false,
          };
        }

        return {
          ...mesa,
          usuariosActivos,
        };
      });

      if (!result.committed) {
        return false;
      }

      const mesa = result.snapshot.val();
      return mesa?.usuariosActivos?.[userId]?.puedeEditar || false;
    } catch (error) {
      console.error('[ModeradorComandas] ❌ Error validando acceso:', error);
      return false;
    }
  }

  /**
   * 🚪 DESUSCRIBIR USUARIO DE MESA
   *
   * Liberar slot cuando usuario sale de mesa.
   */
  async desuscribirUsuario(mesaId: string, userId: string): Promise<void> {
    try {
      const mesaRef = ref(this.db, `${this.tenantPath}/${resolver('mesas_estado')}/${mesaId}`);

      await runTransaction(mesaRef, (mesa) => {
        if (!mesa || !mesa.usuariosActivos) return mesa;

        delete mesa.usuariosActivos[userId];

        // Si no quedan usuarios, limpiar objeto
        if (Object.keys(mesa.usuariosActivos).length === 0) {
          delete mesa.usuariosActivos;
        }

        return mesa;
      });
    } catch (error) {
      console.error('[ModeradorComandas] ❌ Error desuscribiendo usuario:', error);
    }
  }
}
