#!/usr/bin/env node
/**
 * scripts/migracion/auditar-negocio.js
 *
 * Auditoría profunda y rápida:
 * Consulta la RTDB remota (producción) para `el-arrecife` y compara estrictamente
 * los nodos `mesas`, `inventario`, `impresion` y `dispositivos` contra `rtdb_actualizada.json`.
 *
 * Uso:
 *   node scripts/migracion/auditar-negocio.js --negocio=el-arrecife [--auth=<TOKEN>]
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const DB_URL =
  process.env.FIREBASE_DATABASE_URL ||
  'https://minegocioaunclick-1539b-default-rtdb.firebaseio.com';

const args = process.argv.slice(2);
const negocioArg = args.find((a) => a.startsWith('--negocio='));
const authArg = args.find((a) => a.startsWith('--auth='));

const negocioId = negocioArg ? negocioArg.split('=')[1] : 'el-arrecife';
const authToken = authArg ? authArg.split('=')[1] : process.env.FIREBASE_AUTH_TOKEN;

// 1. Cargar snapshot local
const snapshotPath = path.resolve(__dirname, '../../rtdb_actualizada.json');
const localData = JSON.parse(fs.readFileSync(snapshotPath, 'utf8')).marisquerias[negocioId];

const NODOS = ['mesas', 'inventario', 'impresion', 'dispositivos'];

// Firebase RTDB serializa mapas con claves enteras secuenciales "1", "2"... como arrays [null, {...}, {...}]
// También omite objetos vacíos ({} -> null) y undefined al serializar.
// Normalizamos para comparar con fidelidad semántica: vacío == null, arrays con slots nulos como mapas.
function normalizarParaComparacion(val) {
  if (val === null || val === undefined) return null;
  if (typeof val !== 'object') return val;
  if (Array.isArray(val)) {
    const obj = {};
    val.forEach((item, index) => {
      const norm = normalizarParaComparacion(item);
      if (norm !== null) {
        obj[String(index)] = norm;
      }
    });
    return Object.keys(obj).length === 0 ? null : obj;
  }
  const res = {};
  for (const k of Object.keys(val)) {
    const norm = normalizarParaComparacion(val[k]);
    if (norm !== null) {
      res[k] = norm;
    }
  }
  return Object.keys(res).length === 0 ? null : res;
}

function deepEqual(a, b) {
  const normA = normalizarParaComparacion(a);
  const normB = normalizarParaComparacion(b);

  if (normA === normB) return true;
  if (typeof normA !== typeof normB) return false;
  if (typeof normA !== 'object' || normA === null || normB === null) return false;

  const keysA = Object.keys(normA);
  const keysB = Object.keys(normB);

  if (keysA.length !== keysB.length) return false;

  for (const key of keysA) {
    if (!keysB.includes(key)) return false;
    if (!deepEqual(normA[key], normB[key])) return false;
  }
  return true;
}

function findDiscrepancies(rawA, rawB, prefix = '') {
  const local = normalizarParaComparacion(rawA);
  const remote = normalizarParaComparacion(rawB);
  let diffs = [];
  const allKeys = new Set([...Object.keys(local || {}), ...Object.keys(remote || {})]);

  for (const key of allKeys) {
    const currentPath = prefix ? `${prefix}.${key}` : key;
    const valLocal = local ? local[key] : undefined;
    const valRemote = remote ? remote[key] : undefined;

    if (valLocal === undefined) {
      diffs.push(`[SOBRA EN REMOTO] ${currentPath}: ${JSON.stringify(valRemote)}`);
    } else if (valRemote === undefined) {
      diffs.push(`[FALTA EN REMOTO] ${currentPath}: ${JSON.stringify(valLocal)}`);
    } else if (
      typeof valLocal === 'object' &&
      valLocal !== null &&
      typeof valRemote === 'object' &&
      valRemote !== null
    ) {
      diffs = diffs.concat(findDiscrepancies(valLocal, valRemote, currentPath));
    } else if (valLocal !== valRemote) {
      diffs.push(`[DIFERENCIA] ${currentPath}: Local='${valLocal}' vs Remoto='${valRemote}'`);
    }
  }
  return diffs;
}

async function auditar() {
  console.log('====================================================');
  console.log(`🔍 AUDITORÍA RÁPIDA RTDB REMOTA - NEGOCIO: ${negocioId}`);
  console.log(`🌐 Base de datos: ${DB_URL}`);
  console.log(`🎯 Nodos a auditar: ${NODOS.join(', ')}`);
  console.log('====================================================\n');

  let allOk = true;

  for (const nodo of NODOS) {
    const targetUrl = `${DB_URL}/marisquerias/${negocioId}/${nodo}.json${authToken ? `?auth=${authToken}` : ''}`;

    const remoteNodeData = await new Promise((resolve, reject) => {
      https
        .get(new URL(targetUrl), (res) => {
          let body = '';
          res.on('data', (chunk) => (body += chunk));
          res.on('end', () => {
            if (res.statusCode === 200) {
              try {
                resolve(JSON.parse(body));
              } catch (err) {
                reject(err);
              }
            } else {
              reject(new Error(`HTTP ${res.statusCode}: ${body}`));
            }
          });
        })
        .on('error', reject);
    });

    const localNodeData = localData[nodo];
    const match = deepEqual(localNodeData, remoteNodeData);

    if (match) {
      console.log(`✅ [NODO: ${nodo}] -> 100% IDÉNTICO. Sincronización exacta.`);
    } else {
      allOk = false;
      console.error(`❌ [NODO: ${nodo}] -> DISCREPANCIA DETECTADA.`);
      const diffs = findDiscrepancies(localNodeData, remoteNodeData, nodo);
      console.error(`   Detalle de discrepancias (primeras 5):`);
      diffs.slice(0, 5).forEach((d) => console.error(`    - ${d}`));
    }
  }

  console.log('\n----------------------------------------------------');
  if (allOk) {
    console.log('🏆 RESULTADO AUDITORÍA: 100% COINCIDENCIA EXACTA EN TODOS LOS NODOS.');
    process.exit(0);
  } else {
    console.error('🚨 RESULTADO AUDITORÍA: DISCREPANCIAS ENCONTRADAS. DETENER OPERACIÓN.');
    process.exit(1);
  }
}

auditar().catch((err) => {
  console.error('\n❌ ERROR EN LA AUDITORÍA:', err.message);
  process.exit(1);
});
