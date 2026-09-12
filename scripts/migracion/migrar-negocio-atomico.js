#!/usr/bin/env node
/**
 * scripts/migracion/migrar-negocio-atomico.js
 *
 * Migración atómica segmentada por negocio (aislada).
 * Nodos permitidos en esta fase: mesas, inventario, impresion, dispositivos.
 *
 * Uso:
 *   node scripts/migracion/migrar-negocio-atomico.js --negocio=el-arrecife [--auth=<TOKEN>] [--dry-run]
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
const isDryRun = args.includes('--dry-run');

const negocioId = negocioArg ? negocioArg.split('=')[1] : null;
const authToken = authArg ? authArg.split('=')[1] : process.env.FIREBASE_AUTH_TOKEN;

if (!negocioId) {
  console.error('[ERROR] Debe especificar el negocio a migrar con --negocio=<id_negocio>');
  console.error('Ejemplo: node scripts/migracion/migrar-negocio-atomico.js --negocio=el-arrecife');
  process.exit(1);
}

// 1. Cargar archivo local fuente
const snapshotPath = path.resolve(__dirname, '../../rtdb_actualizada.json');
if (!fs.existsSync(snapshotPath)) {
  console.error(`[ERROR] Archivo fuente no encontrado: ${snapshotPath}`);
  process.exit(1);
}

const sourceData = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));

if (!sourceData.marisquerias || !sourceData.marisquerias[negocioId]) {
  console.error(`[ERROR] El negocio "${negocioId}" no existe en rtdb_actualizada.json`);
  process.exit(1);
}

const negocioData = sourceData.marisquerias[negocioId];

// 2. Extraer ÚNICAMENTE los nodos autorizados
const NODOS_AUTORIZADOS = ['mesas', 'inventario', 'impresion', 'dispositivos'];
const payloadParcial = {};

for (const nodo of NODOS_AUTORIZADOS) {
  if (negocioData[nodo] !== undefined) {
    payloadParcial[nodo] = negocioData[nodo];
  } else {
    console.warn(
      `[WARN] Nodo "${nodo}" no encontrado en el snapshot local para "${negocioId}". Se omitirá.`
    );
  }
}

console.log('====================================================');
console.log(`🚀 MIGRACIÓN ATÓMICA RTDB - NEGOCIO: ${negocioId}`);
console.log(`🎯 Nodos a actualizar: ${Object.keys(payloadParcial).join(', ')}`);
console.log(`🌐 Base de datos destino: ${DB_URL}`);
console.log(
  `🔒 Modo Dry-Run: ${isDryRun ? 'ACTIVADO (Sin escritura)' : 'DESACTIVADO (Escritura real)'}`
);
console.log('====================================================');

if (isDryRun) {
  console.log('\n[DRY-RUN] Resumen del payload preparado para PATCH:');
  for (const [k, v] of Object.entries(payloadParcial)) {
    console.log(
      ` - ${k}: ${typeof v === 'object' ? `${Object.keys(v || {}).length} entradas` : typeof v}`
    );
  }
  console.log('\n[DRY-RUN] Verificación completada sin modificar la RTDB remota.');
  process.exit(0);
}

// 3. Ejecutar HTTP PATCH sobre /marisquerias/<negocioId>.json
// El método PATCH en RTDB preserva todos los demás nodos (menu, pedidos, config, ventas, etc.)
// y actualiza atómicamente solo los nodos pasados en payloadParcial.
const payloadString = JSON.stringify(payloadParcial);
const targetPath = `/marisquerias/${negocioId}.json${authToken ? `?auth=${authToken}` : ''}`;
const url = new URL(`${DB_URL}${targetPath}`);

const reqOptions = {
  hostname: url.hostname,
  port: 443,
  path: url.pathname + url.search,
  method: 'PATCH',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payloadString),
  },
};

const req = https.request(reqOptions, (res) => {
  let responseData = '';
  res.on('data', (chunk) => {
    responseData += chunk;
  });

  res.on('end', () => {
    if (res.statusCode === 200) {
      console.log('\n✅ [MIGRACIÓN EXITOSA]');
      console.log(
        `Nodos [${Object.keys(payloadParcial).join(', ')}] actualizados atómicamente en /marisquerias/${negocioId}`
      );
      console.log(
        'Respuesta RTDB:',
        responseData.slice(0, 300) + (responseData.length > 300 ? '...' : '')
      );
    } else {
      console.error(`\n❌ [ERROR HTTP ${res.statusCode}] Falló la migración:`);
      console.error(responseData);
      process.exit(1);
    }
  });
});

req.on('error', (e) => {
  console.error('\n❌ [ERROR DE RED]', e.message);
  process.exit(1);
});

req.write(payloadString);
req.end();
