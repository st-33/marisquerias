import { get, ref, set, update } from 'firebase/database';
import type { Database } from 'firebase/database';
import { DEFAULT_PRINT_POLICIES } from '../impresion/legacy/policies';
import { validar_ruta_negocio, descomponer_ruta_negocio } from '../rtdb/rutas/ruta_negocio';
import { logger } from '../monitoreo';

export async function ensureNegocioBootstrap(db: Database, rutaNegocio: string) {
  if (!db || !rutaNegocio || !validar_ruta_negocio(rutaNegocio)) {
    logger.warn('BOOTSTRAP', 'Instancia de DB o ruta negocio inválida para bootstrap', {
      rutaNegocio,
    });
    return;
  }

  try {
    // 1. Politicas de impresión
    const polSnap = await get(ref(db, `${rutaNegocio}/impresion/politicas`));
    if (!polSnap.exists()) {
      await update(ref(db, `${rutaNegocio}/impresion`), {
        politicas: DEFAULT_PRINT_POLICIES,
        rutas: { defaultPrinter: null },
      });
    }

    // 2. Mesas (formato canónico: objeto con claves estables string "1", "2", "3"...)
    const mesasNewSnap = await get(ref(db, `${rutaNegocio}/mesas`));
    const identidad = descomponer_ruta_negocio(rutaNegocio);
    const categoriaId = identidad
      ? (identidad.categoria_id || identidad.categoriaId).toLowerCase()
      : '';
    const esAlimentosPreparados = [
      'marisquerias',
      'restaurantes',
      'cafeterias',
      'taquerias',
    ].includes(categoriaId);

    if (mesasNewSnap.exists()) {
      const val = mesasNewSnap.val();
      if (Array.isArray(val)) {
        const mesasObj: Record<string, { estado: string; updatedAt: number }> = {};
        val.forEach((m, idx) => {
          if (m && typeof m === 'object') {
            mesasObj[String(idx)] = m;
          }
        });
        await set(ref(db, `${rutaNegocio}/mesas`), mesasObj);

        // Migrar mesas_pendientes si existe como array
        try {
          const snapPend = await get(ref(db, `${rutaNegocio}/mesas_pendientes`));
          if (snapPend.exists() && Array.isArray(snapPend.val())) {
            const pendObj: Record<string, any> = {};
            snapPend.val().forEach((m: any, idx: number) => {
              if (m && typeof m === 'object') pendObj[String(idx)] = m;
            });
            await set(ref(db, `${rutaNegocio}/mesas_pendientes`), pendObj);
          }
        } catch {}
      }
    } else {
      if (esAlimentosPreparados) {
        const mesasLegacySnap = await get(ref(db, `${rutaNegocio}/mesas/estado`));
        if (mesasLegacySnap.exists()) {
          const val = mesasLegacySnap.val();
          if (Array.isArray(val)) {
            const mesasObj: Record<string, { estado: string; updatedAt: number }> = {};
            val.forEach((m, idx) => {
              if (m && typeof m === 'object') {
                mesasObj[String(idx)] = m;
              }
            });
            await set(ref(db, `${rutaNegocio}/mesas`), mesasObj);
          } else {
            await set(ref(db, `${rutaNegocio}/mesas`), val);
          }
        } else {
          await set(ref(db, `${rutaNegocio}/mesas`), {
            '1': { estado: 'libre', updatedAt: Date.now() },
            '2': { estado: 'libre', updatedAt: Date.now() },
            '3': { estado: 'libre', updatedAt: Date.now() },
          });
        }
      } else {
        await set(ref(db, `${rutaNegocio}/mesas`), {});
      }
    }

    // 3. ADI-REPART: ajustes operativos locales (autoridad de tarifas es externa)
    const repartUmb = await get(ref(db, `${rutaNegocio}/ajustes/reparto/umbrales`));
    if (!repartUmb.exists()) {
      await set(ref(db, `${rutaNegocio}/ajustes/reparto/umbrales`), {
        stockBajo: 5,
        maxPedidosActivos: 10,
        tiempoMaxEntregaMin: 45,
      });
    }
    const repartHor = await get(ref(db, `${rutaNegocio}/ajustes/reparto/horarios`));
    if (!repartHor.exists()) {
      await set(ref(db, `${rutaNegocio}/ajustes/reparto/horarios`), {
        habilitado: false,
        ventanas: [{ inicio: '09:00', fin: '18:00' }],
      });
    }

    // 5. Nodos operativos actuales (excluyendo legacy)
    const pathsToEnsure = ['pedidos', 'spool/jobs', 'spool/devices', 'audits', 'notificaciones'];
    for (const p of pathsToEnsure) {
      const s = await get(ref(db, `${rutaNegocio}/${p}`));
      if (!s.exists()) await set(ref(db, `${rutaNegocio}/${p}`), {});
    }

    // 6. Features/caracteristicas mínimas condicionales por categoría
    const carSnap = await get(ref(db, `${rutaNegocio}/caracteristicas`));
    const featSnap = await get(ref(db, `${rutaNegocio}/features`));
    if (!carSnap.exists() && !featSnap.exists()) {
      if (esAlimentosPreparados) {
        await set(ref(db, `${rutaNegocio}/caracteristicas`), {
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
        await set(ref(db, `${rutaNegocio}/caracteristicas`), {
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
          await update(ref(db, `${rutaNegocio}/caracteristicas`), updates);
        }
      } else {
        if (esAlimentosPreparados) {
          await set(ref(db, `${rutaNegocio}/caracteristicas`), {
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
          await set(ref(db, `${rutaNegocio}/caracteristicas`), {
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

    logger.info('BOOTSTRAP', 'Bootstrap base de negocio completado exitosamente', {
      rutaNegocio,
    });
  } catch (error) {
    const errObj =
      error instanceof Error ? error : new Error(String(error || 'Error desconocido en bootstrap'));
    logger.error('BOOTSTRAP', 'Error durante el bootstrap', errObj, { rutaNegocio });
  }
}
