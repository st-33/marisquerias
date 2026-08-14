/**
 * 🏢 REPOSITORIO DE TENANT
 * Capa de abstracción para operaciones de tenant (características, features, bootstrap)
 * NUNCA llamar a Firebase directamente desde componentes o hooks de negocio
 */

import type { Database } from 'firebase/database';
import { get, off, onValue, ref, update } from 'firebase/database';
import { ensureTenantBootstrap } from '../../core/bootstrap/ensureTenant';

export type Caracteristicas = {
  roles?: {
    mesero?: boolean;
    cocina?: boolean;
    ventas?: boolean;
    tienda?: boolean;
    admin?:
      | boolean
      | {
          dashboard?: boolean;
          menu?: boolean;
          inventario?: boolean;
          mesas?: boolean;
          dispositivos?: boolean;
          repart?: boolean;
          mostrador?: boolean;
          menu_add_category?: boolean;
          module_venta_crudo?: boolean;
          fastbutton_venta_crudo?: boolean;
          menu_editor_venta_crudo?: boolean;
          inventory_v2?: boolean;
        };
  };
  delivery?: boolean;
  delivery_interno_adi_repart?: boolean;
  delivery_externo?: boolean;
  reabastecimiento_cruzado?: boolean;
  tracking_repartidor?: boolean;
  solicitudes_logisticas?: boolean;
  ia_voice_assistant?: boolean;
  inventory_auto_discount?: boolean;
  menu_digital?: boolean;
  [key: string]: any;
};

export type Features = Record<string, boolean>;

export class TenantRepository {
  constructor(private db: Database, private tenantPath: string) {}

  private getCaracteristicasPath() {
    return `${this.tenantPath}/caracteristicas`;
  }

  private getFeaturesPath() {
    return `${this.tenantPath}/features`;
  }

  /**
   * Asegurar que el tenant tenga la estructura base inicializada
   */
  async asegurarBootstrap(): Promise<void> {
    await ensureTenantBootstrap(this.db, this.tenantPath);
  }

  /**
   * Obtener características del tenant (estructura anidada)
   */
  async obtenerCaracteristicas(): Promise<Caracteristicas | null> {
    const r = ref(this.db, this.getCaracteristicasPath());
    const snap = await get(r);
    return snap.exists() ? (snap.val() as Caracteristicas) : null;
  }

  /**
   * Obtener features del tenant (estructura plana)
   */
  async obtenerFeatures(): Promise<Features | null> {
    const r = ref(this.db, this.getFeaturesPath());
    const snap = await get(r);
    return snap.exists() ? (snap.val() as Features) : null;
  }

  /**
   * Obtener características o features (fallback automático)
   * Retorna el formato raw para normalización posterior
   */
  async obtenerCaracteristicasOFeatures(): Promise<{
    caracteristicas?: Caracteristicas;
    [key: string]: any;
  } | null> {
    const caract = await this.obtenerCaracteristicas();
    if (caract) {
      return { caracteristicas: caract };
    }

    const features = await this.obtenerFeatures();
    return features ? features : null;
  }

  /**
   * Suscribirse a características de admin (para dashboard)
   */
  suscribirCaracteristicasAdmin(
    callback: (
      admin:
        | boolean
        | {
            dashboard?: boolean;
            menu?: boolean;
            inventario?: boolean;
            mesas?: boolean;
            dispositivos?: boolean;
            repart?: boolean;
            mostrador?: boolean;
            menu_add_category?: boolean;
            module_venta_crudo?: boolean;
            fastbutton_venta_crudo?: boolean;
            menu_editor_venta_crudo?: boolean;
            inventory_v2?: boolean;
          }
        | undefined
    ) => void
  ): () => void {
    const r = ref(this.db, `${this.getCaracteristicasPath()}/roles/admin`);
    const cb = onValue(r, (snap) => {
      callback(snap.exists() ? (snap.val() as any) : undefined);
    });
    return () => off(r, 'value', cb as any);
  }

  /**
   * Suscribirse a todas las características (root de caracteristicas)
   */
  suscribirCaracteristicas(callback: (caract: Caracteristicas) => void): () => void {
    const r = ref(this.db, this.getCaracteristicasPath());
    const cb = onValue(r, (snap) => {
      callback(snap.exists() ? (snap.val() as Caracteristicas) : {});
    });
    return () => off(r, 'value', cb as any);
  }

  /**
   * Actualizar características de admin
   */
  async actualizarCaracteristicasAdmin(
    admin: Partial<{
      dashboard?: boolean;
      menu?: boolean;
      inventario?: boolean;
      mesas?: boolean;
      dispositivos?: boolean;
      repart?: boolean;
      mostrador?: boolean;
      menu_add_category?: boolean;
      module_venta_crudo?: boolean;
      fastbutton_venta_crudo?: boolean;
      menu_editor_venta_crudo?: boolean;
      inventory_v2?: boolean;
    }>
  ): Promise<void> {
    const r = ref(this.db, `${this.getCaracteristicasPath()}/roles/admin`);
    await update(r, admin);
  }
}
