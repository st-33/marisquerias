#!/usr/bin/env node
/**
 * scripts/migracion/escanear-dispositivos-purga.js
 *
 * FASE 8: Purga de Dispositivos Marcados (Paso 1: Identificación y Escaneo Seguro)
 * Operación: SOLO LECTURA (Read-Only)
 *
 * Escanea los nodos de dispositivos en los 3 negocios migrados de producción:
 * - el-arrecife
 * - marisqueria-la-perla-del-pueblo
 * - marisqueria-puerto-libres
 *
 * Identifica los dispositivos marcados con `_marcado_purga_fase_8: true`
 * y valida su inactividad cruzando timestamps de último acceso y colas de spool.
 */

const https = require('https');

const DB_URL =
  process.env.FIREBASE_DATABASE_URL ||
  'https://minegocioaunclick-1539b-default-rtdb.firebaseio.com';

const NEGOCIOS = [
  'el-arrecife',
  'marisqueria-la-perla-del-pueblo',
  'marisqueria-puerto-libres',
];

const authArg = process.argv.find((arg) => arg.startsWith('--auth='));
const authToken = authArg ? authArg.split('=')[1] : process.env.FIREBASE_AUTH_TOKEN;

function fetchJson(path) {
  return new Promise((resolve, reject) => {
    const url = `${DB_URL}/${path}.json${authToken ? `?auth=${authToken}` : ''}`;
    https
      .get(url, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          if (res.statusCode >= 400) {
            return reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
          }
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            resolve(null);
          }
        });
      })
      .on('error', reject);
  });
}

async function escanear() {
  console.log('========================================================================');
  console.log('🔍 FASE 8 - ESCANEO SEGURO DE DISPOSITIVOS MARCADOS PARA PURGA (READ-ONLY)');
  console.log(`🌐 Base de Datos: ${DB_URL}`);
  console.log(`🎯 Negocios Auditados: ${NEGOCIOS.join(', ')}`);
  console.log('========================================================================\n');

  const resumen = {
    totalMarcados: 0,
    porNegocio: {},
    detallesMarcados: [],
  };

  const ahora = Date.now();

  for (const negocio of NEGOCIOS) {
    console.log(`\n🏢 Auditando negocio: [${negocio}]`);
    resumen.porNegocio[negocio] = { total: 0, marcados: 0, activos: 0 };

    const dispositivos = await fetchJson(`marisquerias/${negocio}/dispositivos`);
    if (!dispositivos || typeof dispositivos !== 'object') {
      console.log(`   ⚠️ Nodo 'dispositivos' vacío o no encontrado.`);
      continue;
    }

    const totalDispositivos = Object.keys(dispositivos).length;
    resumen.porNegocio[negocio].total = totalDispositivos;
    console.log(`   📦 Total dispositivos registrados: ${totalDispositivos}`);

    for (const [deviceId, devData] of Object.entries(dispositivos)) {
      const isMarcado = devData._marcado_purga_fase_8 === true;

      if (isMarcado) {
        resumen.porNegocio[negocio].marcados++;
        resumen.totalMarcados++;

        // Verificar actividad en spool queue
        const spool = await fetchJson(`marisquerias/${negocio}/spool/devices/${deviceId}`);
        const spoolQueueCount = spool && spool.queue ? Object.keys(spool.queue).length : 0;

        // Calcular tiempo de inactividad
        const ultimoAccesoTs = devData.ultimoAcceso || devData.fechaRegistro || 0;
        const diasInactivo = ultimoAccesoTs
          ? Math.floor((ahora - ultimoAccesoTs) / (1000 * 60 * 60 * 24))
          : null;

        // Criterio de confirmación de inactividad:
        // Sin trabajos en cola y sin actividad en los últimos 30 días
        const estaInactivo = spoolQueueCount === 0 && (diasInactivo === null || diasInactivo > 30);

        const detalle = {
          negocio,
          deviceId,
          brand: devData.brand || 'N/A',
          model: devData.model || 'N/A',
          systemName: devData.systemName || 'N/A',
          systemVersion: devData.systemVersion || 'N/A',
          rolAsignado: devData.rol_asignado || devData.rolActivo || 'N/A',
          razonPurga: devData.razon_purga || 'Sin razón especificada',
          ultimoAcceso: ultimoAccesoTs ? new Date(ultimoAccesoTs).toISOString() : 'N/A',
          diasInactivo,
          spoolQueueJobs: spoolQueueCount,
          estadoInactividad: estaInactivo ? 'CONFIRMADO_INACTIVO' : 'ALERTA_ACTIVIDAD_RECIENTE',
        };

        resumen.detallesMarcados.push(detalle);

        console.log(`   🚨 [PURGA DETECTADA] Device ID: "${deviceId}"`);
        console.log(`      • Razón: ${detalle.razonPurga}`);
        console.log(`      • Modelo/Brand: ${detalle.brand} / ${detalle.model}`);
        console.log(`      • Último Acceso: ${detalle.ultimoAcceso} (${diasInactivo} días atrás)`);
        console.log(`      • Spool Jobs pendientes: ${spoolQueueCount}`);
        console.log(`      • Estado de Inactividad: ${detalle.estadoInactividad}`);
      }
    }
  }

  console.log('\n========================================================================');
  console.log('📊 RESUMEN GLOBAL DEL ESCANEO');
  console.log('========================================================================');
  for (const [negocio, datos] of Object.entries(resumen.porNegocio)) {
    console.log(`Negocio: ${negocio.padEnd(35)} | Total: ${datos.total} | Marcados: ${datos.marcados}`);
  }
  console.log(`\nTotal Dispositivos Marcados para Purga: ${resumen.totalMarcados}`);
  const todosInactivos = resumen.detallesMarcados.every(
    (d) => d.estadoInactividad === 'CONFIRMADO_INACTIVO'
  );
  console.log(
    `Confirmación de Inactividad General: ${
      todosInactivos ? '✅ TODOS LOS DISPOSITIVOS CONFIRMADOS 100% INACTIVOS' : '⚠️ ATENCIÓN REQUERIDA'
    }`
  );
  console.log('========================================================================\n');
}

escanear().catch((err) => {
  console.error('❌ Error fatal durante el escaneo:', err);
  process.exit(1);
});
