import AsyncStorage from '@react-native-async-storage/async-storage';
import { ref, set, get, update, serverTimestamp } from 'firebase/database';
import type { Database } from 'firebase/database';
import { ensureTenantBootstrap } from '../../core/bootstrap/ensureTenant';
import { resolverDeviceIdADI } from '../vinculacion/generar-device-id-adi';
import { resolverAccessCode } from '../vinculacion/resolver-access-code';
import { resolverConfiguracionInicial } from '../runtime/resolver-configuracion-inicial';
import { DispositivoVinculado } from '../contratos/dispositivo-vinculado';
import { ResultadoInstalacion } from '../contratos/resultado-instalacion';
import { logger } from '../../core/monitoring';
import { normalizeFeatures } from '../../core/utils/features';
import type { Feature } from '../../core/types/contratos';

function adaptFeatures(flat: Record<string, boolean>): Record<string, Feature> {
  const adapted: Record<string, Feature> = {};
  for (const [key, value] of Object.entries(flat)) {
    adapted[key] = { enabled: value };
  }
  return adapted;
}

const STORAGE_KEY_VINCULADO = 'adi_dispositivo_vinculado';

export class EnsambladorInstalacion {
  constructor(private db: Database) {}

  /**
   * Intenta recuperar la vinculación de dispositivo guardada localmente.
   * Realiza sincronización y validación con la autoridad RTDB.
   */
  async obtenerVinculacionLocal(): Promise<DispositivoVinculado | null> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY_VINCULADO);
      if (!raw) return null;

      const dispositivo = JSON.parse(raw) as DispositivoVinculado;

      // Consultamos el estado actual del dispositivo en la base de datos (autoridad de verdad)
      try {
        const deviceRef = ref(
          this.db,
          `${dispositivo.tenantPath}/dispositivos_autorizados/${dispositivo.deviceIdADI}`
        );
        const snap = await get(deviceRef);

        if (!snap.exists()) {
          // Si el dispositivo ya no figura autorizado en RTDB, invalidamos el vínculo local
          await this.desvincularLocalmente();
          return null;
        }

        const dbData = snap.val();
        const estado: 'activo' | 'bloqueado' | 'mantenimiento' | 'reemplazado' =
          dbData.estado || 'activo';

        // Regla: Si el dispositivo está bloqueado o fue reemplazado, limpiamos vínculo local
        if (estado === 'bloqueado' || estado === 'reemplazado') {
          await this.desvincularLocalmente();
          return null;
        }

        // Regla: Si está en mantenimiento, se actualiza el estado local y se continúa (bloqueando UI en vista superior)
        dispositivo.estado = estado;
        dispositivo.rolActivo = dbData.rolActivo || dbData.rolAsignado || null;
        dispositivo.nivelOperativo = dbData.nivelOperativo || 'operador';
        dispositivo.puedeCambiarRol =
          dbData.puedeCambiarRol !== undefined ? dbData.puedeCambiarRol : true;
        dispositivo.reemplazaADeviceId = dbData.reemplazaADeviceId;
        dispositivo.reemplazadoPorDeviceId = dbData.reemplazadoPorDeviceId;

        if (dbData.rolesPermitidos) {
          dispositivo.rolesPermitidos = Array.isArray(dbData.rolesPermitidos)
            ? dbData.rolesPermitidos
            : Object.keys(dbData.rolesPermitidos).filter((r) => dbData.rolesPermitidos[r] === true);
        }
        if (dbData.modulosPermitidos) {
          dispositivo.modulosPermitidos = dbData.modulosPermitidos;
        }

        dispositivo.actualizadoEn = Date.now();

        // Guardar el estado sincronizado localmente
        await AsyncStorage.setItem(STORAGE_KEY_VINCULADO, JSON.stringify(dispositivo));
      } catch (netError) {
        // ⚠️ Si falla la red/conexión, NO invalidamos la sesión.
        // Respetamos la resiliencia offline (Regla 5 de AGENTS.md).
        logger.warn(
          'INSTALACION',
          'Fallo de red al validar dispositivo. Usando caché local.',
          netError as Error
        );
      }

      return dispositivo;
    } catch {
      return null;
    }
  }

  /**
   * Ejecuta el proceso completo de vinculación mediante un accessCode existente.
   */
  async instalar(accessCode: string, aliasDispositivo?: string): Promise<ResultadoInstalacion> {
    try {
      const deviceIdADI = await resolverDeviceIdADI();

      // 1. Validar y resolver access code (lanza error si expiró, revocó, etc.)
      const resolvedCode = await resolverAccessCode(this.db, accessCode);

      // Regla: El tenant DEBE existir previamente en RTDB. No creamos tenants desde el cliente.
      const tenantRef = ref(this.db, resolvedCode.tenantPath);
      const tenantSnap = await get(tenantRef);
      if (!tenantSnap.exists()) {
        return {
          ok: false,
          error: `Error de instalación: El tenant en la ruta '${resolvedCode.tenantPath}' no está registrado en el sistema central.`,
        };
      }

      // 2. Garantizar bootstrap del tenant (inicializar nodos de impresora, reparto, etc.)
      await ensureTenantBootstrap(this.db, resolvedCode.tenantPath);

      // 3. Resolver configuración asignada al dispositivo
      const { dispositivoConfig } = await resolverConfiguracionInicial(
        this.db,
        resolvedCode.tenantPath,
        deviceIdADI
      );

      // Regla: Si el dispositivo está bloqueado o reemplazado en la configuración remota previa
      if (dispositivoConfig.estado === 'bloqueado' || dispositivoConfig.estado === 'reemplazado') {
        return {
          ok: false,
          error: `El dispositivo con ID ${deviceIdADI} está bloqueado o fue reemplazado en el tenant.`,
        };
      }

      // 4. Actualizar usos del access code si es un objeto con metadatos
      const codeRef = ref(this.db, `access_codes/${resolvedCode.accessCode}`);
      const codeSnap = await get(codeRef);
      if (codeSnap.exists() && typeof codeSnap.val() === 'object') {
        const val = codeSnap.val();
        const nuevoUsos = (val.usosActuales || 0) + 1;
        const deviceIds = val.usadoPorDeviceIds || [];
        if (!deviceIds.includes(deviceIdADI)) {
          deviceIds.push(deviceIdADI);
        }
        await update(codeRef, {
          usosActuales: nuevoUsos,
          usadoPorDeviceIds: deviceIds,
        });
      }

      // 5. Registrar el dispositivo autorizado en RTDB
      const deviceRef = ref(
        this.db,
        `${resolvedCode.tenantPath}/dispositivos_autorizados/${deviceIdADI}`
      );
      const timestampActual = Date.now();

      const registrationPayload = {
        deviceId: deviceIdADI,
        alias:
          aliasDispositivo ||
          dispositivoConfig.alias ||
          `Fierro ADI ${deviceIdADI.substring(4, 10)}`,
        estado: dispositivoConfig.estado,
        rolActivo: dispositivoConfig.rolActivo,
        rolesPermitidos: dispositivoConfig.rolesPermitidos.reduce<Record<string, boolean>>(
          (acc, r) => {
            acc[r] = true;
            return acc;
          },
          {}
        ),
        modulosPermitidos: dispositivoConfig.modulosPermitidos,
        nivelOperativo: dispositivoConfig.nivelOperativo || 'operador',
        puedeCambiarRol: dispositivoConfig.puedeCambiarRol,
        vinculadoEn: timestampActual,
        actualizadoEn: timestampActual,
        reemplazaADeviceId: dispositivoConfig.reemplazaADeviceId || null,
        reemplazadoPorDeviceId: dispositivoConfig.reemplazadoPorDeviceId || null,
        ultimoHeartbeat: serverTimestamp(),
      };

      await set(deviceRef, registrationPayload);

      // 6. Guardar la vinculación local
      const dispositivoVinculado: DispositivoVinculado = {
        deviceIdADI,
        tenantPath: resolvedCode.tenantPath,
        tenantId: resolvedCode.tenantId,
        niche: resolvedCode.nichoId,
        category: resolvedCode.categoriaId,
        aliasDispositivo: registrationPayload.alias,
        rolActivo: dispositivoConfig.rolActivo,
        rolesPermitidos: dispositivoConfig.rolesPermitidos,
        modulosPermitidos: dispositivoConfig.modulosPermitidos,
        estado: dispositivoConfig.estado,
        nivelOperativo: registrationPayload.nivelOperativo,
        puedeCambiarRol: registrationPayload.puedeCambiarRol,
        ultimoHeartbeat: timestampActual,
        vinculadoEn: timestampActual,
        actualizadoEn: timestampActual,
        reemplazaADeviceId: registrationPayload.reemplazaADeviceId || undefined,
        reemplazadoPorDeviceId: registrationPayload.reemplazadoPorDeviceId || undefined,
      };

      // 7. Cargar y normalizar las features del tenant (Aislamiento de Firebase en UI)
      const caractSnap = await get(ref(this.db, `${resolvedCode.tenantPath}/caracteristicas`));
      let rawFeat: any = {};
      if (caractSnap.exists()) {
        rawFeat = { caracteristicas: caractSnap.val() };
      } else {
        const featuresSnap = await get(ref(this.db, `${resolvedCode.tenantPath}/features`));
        rawFeat = featuresSnap.exists() ? featuresSnap.val() : {};
      }
      const flat = normalizeFeatures(rawFeat);
      const features = adaptFeatures(flat);

      await AsyncStorage.setItem(STORAGE_KEY_VINCULADO, JSON.stringify(dispositivoVinculado));

      return {
        ok: true,
        dispositivo: dispositivoVinculado,
        features,
      };
    } catch (error: any) {
      return {
        ok: false,
        error: error.message || 'Error desconocido durante la instalación',
      };
    }
  }

  /**
   * Elimina la sesión de vinculación del dispositivo de forma local.
   */
  async desvincularLocalmente(): Promise<void> {
    await AsyncStorage.removeItem(STORAGE_KEY_VINCULADO);
    await AsyncStorage.removeItem('device_registered');
    await AsyncStorage.removeItem('device_id');
    await AsyncStorage.removeItem('adi_device_id_persistent');
  }

  /**
   * Envía un pulso de vida (heartbeat) a la base de datos para monitoreo.
   */
  async enviarHeartbeat(dispositivo: DispositivoVinculado): Promise<void> {
    try {
      const heartbeatRef = ref(
        this.db,
        `${dispositivo.tenantPath}/dispositivos_autorizados/${dispositivo.deviceIdADI}/ultimoHeartbeat`
      );
      await set(heartbeatRef, serverTimestamp());
    } catch {
      // Silencioso
    }
  }
}
