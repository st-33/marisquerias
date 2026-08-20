import { get, ref, set, update } from 'firebase/database';
import type { Database } from 'firebase/database';
import { DEFAULT_PRINT_POLICIES } from '../impresion/legacy/policies';
import { validarRutaTenant, descomponerRutaTenant } from '../rtdb/rutas/RutaTenant';
import { logger } from '../monitoreo';

const CURRENT_SCHEMA_VERSION = 2;

export async function ensureTenantBootstrap(db: Database, tenantPath: string) {
  if (!db || !tenantPath || !validarRutaTenant(tenantPath)) {
    logger.warn('BOOTSTRAP', 'Instancia de DB o ruta tenant inválida para bootstrap', {
      tenantPath,
    });
    return;
  }

  try {
    // 1. Compatibilidad y verificación de esquema
    const metaSnap = await get(ref(db, `${tenantPath}/_meta/schemaVersion`));
    const versionActual = metaSnap.exists() ? metaSnap.val() : 0;

    // Si ya tiene una versión de esquema y es mayor o igual a la actual, no hacemos nada
    if (versionActual >= CURRENT_SCHEMA_VERSION) {
      return;
    }

    // Leer legacy por compatibilidad (si no hay meta)
    const legacyFlagSnap = await get(ref(db, `${tenantPath}/__bootstrapDone`));
    const alreadyLegacy = legacyFlagSnap.exists() && legacyFlagSnap.val() === true;

    // Si ya estaba configurado legacy, pero no tenía versión, actualizamos a versión base (1)
    if (alreadyLegacy && versionActual === 0) {
      // Hacemos un "upgrade" implícito al esquema 1
      await set(ref(db, `${tenantPath}/_meta/schemaVersion`), 1);
      // Podríamos continuar si necesitamos actualizar al esquema 2
    }

    // 2. Politicas de impresión
    const polSnap = await get(ref(db, `${tenantPath}/ajustes/dispositivos/impresion/politicas`));
    if (!polSnap.exists()) {
      await update(ref(db, `${tenantPath}/ajustes/dispositivos/impresion`), {
        politicas: DEFAULT_PRINT_POLICIES,
        defaultPrinter: null,
      });
    }

    // 3. Mesas (solo nueva ruta canónica y alimentos preparados)
    const mesasNewSnap = await get(ref(db, `${tenantPath}/mesas`));
    const identidad = descomponerRutaTenant(tenantPath);
    const categoriaId = identidad ? identidad.categoriaId.toLowerCase() : '';
    const esAlimentosPreparados = [
      'marisquerias',
      'restaurantes',
      'cafeterias',
      'taquerias',
    ].includes(categoriaId);

    if (!mesasNewSnap.exists()) {
      if (esAlimentosPreparados) {
        const mesasLegacySnap = await get(ref(db, `${tenantPath}/mesas/estado`));
        if (mesasLegacySnap.exists()) {
          await set(ref(db, `${tenantPath}/mesas`), mesasLegacySnap.val());
        } else {
          await set(ref(db, `${tenantPath}/mesas`), [
            null, // index 0 no usado (1-indexed base)
            { estado: 'libre', updatedAt: Date.now() },
            { estado: 'libre', updatedAt: Date.now() },
            { estado: 'libre', updatedAt: Date.now() },
          ]);
        }
      } else {
        await set(ref(db, `${tenantPath}/mesas`), {});
      }
    }

    // 4. ADI-REPART: ajustes
    const repartUmb = await get(ref(db, `${tenantPath}/ajustes/reparto/umbrales`));
    if (!repartUmb.exists()) {
      await set(ref(db, `${tenantPath}/ajustes/reparto/umbrales`), {
        stockBajo: 5,
        maxPedidosActivos: 10,
        tiempoMaxEntregaMin: 45,
      });
    }
    const repartHor = await get(ref(db, `${tenantPath}/ajustes/reparto/horarios`));
    if (!repartHor.exists()) {
      await set(ref(db, `${tenantPath}/ajustes/reparto/horarios`), {
        habilitado: false,
        ventanas: [{ inicio: '09:00', fin: '18:00' }],
      });
    }
    const repartCos = await get(ref(db, `${tenantPath}/ajustes/reparto/costos`));
    if (!repartCos.exists()) {
      await set(ref(db, `${tenantPath}/ajustes/reparto/costos`), {
        base: 20,
        porKm: 5,
        minimo: 20,
      });
    }

    // 5. Nodos operativos actuales (excluyendo legacy)
    const pathsToEnsure = ['pedidos', 'spool/jobs', 'spool/devices', 'audits', 'notificaciones'];
    for (const p of pathsToEnsure) {
      const s = await get(ref(db, `${tenantPath}/${p}`));
      if (!s.exists()) await set(ref(db, `${tenantPath}/${p}`), {});
    }

    // 6. Features/caracteristicas mínimas condicionales por categoría
    const carSnap = await get(ref(db, `${tenantPath}/caracteristicas`));
    const featSnap = await get(ref(db, `${tenantPath}/features`));
    if (!carSnap.exists() && !featSnap.exists()) {
      if (esAlimentosPreparados) {
        await set(ref(db, `${tenantPath}/caracteristicas`), {
          roles: {
            mesero: true,
            cocina: true,
            admin: {
              dashboard: true,
              menu: true,
              inventario: true,
              mesas: true,
              dispositivos: true,
              repart: false,
            },
          },
          delivery: false,
          inventory_auto_discount: false,
        });
      } else {
        await set(ref(db, `${tenantPath}/caracteristicas`), {
          roles: {
            mesero: false,
            cocina: false,
            admin: {
              dashboard: true,
              menu: true,
              inventario: true,
              mesas: false,
              dispositivos: true,
              repart: true,
            },
          },
          delivery: true,
          inventory_auto_discount: true,
        });
      }
    } else {
      let needUpdate = false;
      let roles: any = {};
      if (carSnap.exists()) {
        const car = carSnap.val() || {};
        roles = car.roles || {};
        if (esAlimentosPreparados) {
          if (roles.mesero === undefined || roles.mesero === false) {
            roles.mesero = true;
            needUpdate = true;
          }
          if (roles.cocina === undefined || roles.cocina === false) {
            roles.cocina = true;
            needUpdate = true;
          }
          if (roles.admin?.repart !== false) {
            if (!roles.admin) roles.admin = {};
            roles.admin.repart = false;
            needUpdate = true;
          }
          if (roles.admin?.mesas !== true) {
            if (!roles.admin) roles.admin = {};
            roles.admin.mesas = true;
            needUpdate = true;
          }
        } else {
          if (roles.mesero !== false) {
            roles.mesero = false;
            needUpdate = true;
          }
          if (roles.cocina !== false) {
            roles.cocina = false;
            needUpdate = true;
          }
          if (roles.admin?.repart !== true) {
            if (!roles.admin) roles.admin = {};
            roles.admin.repart = true;
            needUpdate = true;
          }
          if (roles.admin?.mesas !== false) {
            if (!roles.admin) roles.admin = {};
            roles.admin.mesas = false;
            needUpdate = true;
          }
        }
        const updates: any = needUpdate ? { roles } : {};
        if (esAlimentosPreparados) {
          if (car.inventory_auto_discount !== false) {
            updates.inventory_auto_discount = false;
          }
        } else {
          if (car.inventory_auto_discount !== true) {
            updates.inventory_auto_discount = true;
          }
        }
        if (Object.keys(updates).length > 0) {
          await update(ref(db, `${tenantPath}/caracteristicas`), updates);
        }
      } else {
        if (esAlimentosPreparados) {
          await set(ref(db, `${tenantPath}/caracteristicas`), {
            roles: {
              mesero: true,
              cocina: true,
              admin: {
                dashboard: true,
                menu: true,
                inventario: true,
                mesas: true,
                dispositivos: true,
                repart: false,
              },
            },
            delivery: false,
            inventory_auto_discount: false,
          });
        } else {
          await set(ref(db, `${tenantPath}/caracteristicas`), {
            roles: {
              mesero: false,
              cocina: false,
              admin: {
                dashboard: true,
                menu: true,
                inventario: true,
                mesas: false,
                dispositivos: true,
                repart: true,
              },
            },
            delivery: true,
            inventory_auto_discount: true,
          });
        }
      }
    }

    // 7. Marcar como completado usando versión de esquema actual
    await set(ref(db, `${tenantPath}/_meta/schemaVersion`), CURRENT_SCHEMA_VERSION);

    // Por retrocompatibilidad de solo lectura
    if (!alreadyLegacy) {
      await set(ref(db, `${tenantPath}/__bootstrapDone`), true);
    }

    logger.info('BOOTSTRAP', 'Bootstrap versionado completado exitosamente', {
      version: CURRENT_SCHEMA_VERSION,
    });
  } catch (error) {
    const errObj =
      error instanceof Error ? error : new Error(String(error || 'Error desconocido en bootstrap'));
    logger.error('BOOTSTRAP', 'Error durante el bootstrap', errObj, { tenantPath });
    // Silencioso: el flujo principal no debe romperse por bootstrap
  }
}
