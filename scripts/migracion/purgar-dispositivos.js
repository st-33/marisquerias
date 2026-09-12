#!/usr/bin/env node
/**
 * scripts/migracion/purgar-dispositivos.js
 *
 * FASE 8: Purga Definitiva y Controlada de Dispositivos Fantasma
 *
 * Ejecuta la eliminación segura de los 3 dispositivos "unknown" previamente auditados
 * y confirmados inactivos en:
 * - el-arrecife
 * - marisqueria-la-perla-del-pueblo
 * - marisqueria-puerto-libres
 *
 * PROTOCOLO DE SEGURIDAD:
 * 1. Respaldo local preventivo en scripts/migracion/backups/
 * 2. Validación de bandera `_marcado_purga_fase_8: true`
 * 3. Validación de 0 jobs pendientes en colas de spool
 * 4. Petición DELETE atómica vía REST API
 * 5. Re-escaneo post-purga para certificar integridad
 */

const https = require('https');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

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

function fetchJson(nodePath) {
  return new Promise((resolve, reject) => {
    const urlStr = `${DB_URL}/${nodePath}.json${authToken ? `?auth=${authToken}` : ''}`;
    https
      .get(urlStr, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          if (res.statusCode >= 400) {
            return reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
          }
          try {
            resolve(JSON.parse(data));
          } catch {
            resolve(null);
          }
        });
      })
      .on('error', reject);
  });
}

function deleteNode(nodePath) {
  return new Promise((resolve, reject) => {
    const urlStr = `${DB_URL}/${nodePath}.json${authToken ? `?auth=${authToken}` : ''}`;
    const parsed = new URL(urlStr);
    const req = https.request(
      parsed,
      {
        method: 'DELETE',
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          if (res.statusCode >= 400) {
            return reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage} - ${data}`));
          }
          resolve(true);
        });
      }
    );
    req.on('error', reject);
    req.end();
  });
}

async function purgar() {
  console.log('========================================================================');
  console.log('🧹 FASE 8 - PURGA DEFINITIVA DE DISPOSITIVOS FANTASMA');
  console.log(`🌐 Base de Datos: ${DB_URL}`);
  console.log(`🎯 Negocios Auditados: ${NEGOCIOS.join(', ')}`);
  console.log('========================================================================\n');

  const targets = [];

  // Paso 1: Identificación y validación de seguridad
  for (const negocio of NEGOCIOS) {
    const devPath = `marisquerias/${negocio}/dispositivos/unknown`;
    const spoolPath = `marisquerias/${negocio}/spool/devices/unknown`;

    const devData = await fetchJson(devPath);
    if (!devData) {
      console.log(`ℹ️ [${negocio}] El dispositivo "unknown" ya no existe en RTDB.`);
      continue;
    }

    if (devData._marcado_purga_fase_8 !== true) {
      throw new Error(
        `[SEGURIDAD] Dispositivo en [${negocio}] no cuenta con la bandera _marcado_purga_fase_8. Abortando.`
      );
    }

    const spoolData = await fetchJson(spoolPath);
    const spoolJobs = spoolData && spoolData.queue ? Object.keys(spoolData.queue).length : 0;
    if (spoolJobs > 0) {
      throw new Error(
        `[SEGURIDAD] Dispositivo en [${negocio}] tiene ${spoolJobs} trabajos en cola de spool. Abortando.`
      );
    }

    targets.push({
      negocio,
      devPath,
      spoolPath,
      data: devData,
      spoolData,
    });
  }

  if (targets.length === 0) {
    console.log('✅ No hay dispositivos pendientes de purga.');
    return;
  }

  console.log(`📋 Dispositivos confirmados para eliminación: ${targets.length}`);
  targets.forEach((t) => {
    console.log(`   • Negocio: ${t.negocio} | Último acceso: ${t.data.ultimoAcceso || t.data.fechaRegistro}`);
  });

  // Paso 2: Creación de Backup Local Preventivo
  const backupDir = path.join(__dirname, 'backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = path.join(backupDir, `backup_pre_purga_${timestamp}.json`);
  fs.writeFileSync(backupFile, JSON.stringify(targets, null, 2), 'utf-8');
  console.log(`\n💾 Backup preventivo guardado en: ${backupFile}`);

  // Paso 3: Ejecución de la Purga (DELETE)
  console.log('\n🚀 Ejecutando purga en Firebase RTDB...');
  for (const target of targets) {
    console.log(`   🗑️ Eliminando dispositivo: ${target.devPath}`);
    await deleteNode(target.devPath);

    if (target.spoolData) {
      console.log(`   🗑️ Eliminando cola spool: ${target.spoolPath}`);
      await deleteNode(target.spoolPath);
    }
    console.log(`   ✅ [${target.negocio}] Purga completada.`);
  }

  // Paso 4: Re-verificación
  console.log('\n🔍 Verificando estado final...');
  let remanentes = 0;
  for (const target of targets) {
    const check = await fetchJson(target.devPath);
    if (check !== null) {
      console.error(`   ❌ Alerta: El nodo ${target.devPath} aún responde datos.`);
      remanentes++;
    } else {
      console.log(`   ✅ ${target.devPath} eliminado exitosamente (NULL).`);
    }
  }

  console.log('\n========================================================================');
  if (remanentes === 0) {
    console.log('🎉 PURGA FINALIZADA CON ÉXITO: 0 REGISTROS FANTASMA RESTANTES');
  } else {
    console.error(`⚠️ PURGA CON ADVERTENCIAS: ${remanentes} registros siguen respondiendo`);
  }
  console.log('========================================================================\n');
}

purgar().catch((err) => {
  console.error('❌ Error durante la purga:', err);
  process.exit(1);
});
