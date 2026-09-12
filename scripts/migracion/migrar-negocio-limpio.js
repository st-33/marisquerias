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
  console.error('[ERROR] Especifica el negocio con --negocio=<id>');
  process.exit(1);
}

const snapshotPath = path.resolve(__dirname, '../../rtdb_actualizada.json');
const sourceData = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));

if (!sourceData.marisquerias || !sourceData.marisquerias[negocioId]) {
  console.error('[ERROR] Negocio no encontrado en snapshot:', negocioId);
  process.exit(1);
}

const negocioData = sourceData.marisquerias[negocioId];
const payloadString = JSON.stringify(negocioData);

console.log(`🚀 SINCRONIZACIÓN LIMPIA (PUT) - NEGOCIO: ${negocioId}`);
console.log(
  `Claves a escribir (${Object.keys(negocioData).length}): ${Object.keys(negocioData).join(', ')}`
);

if (isDryRun) {
  console.log('[DRY-RUN] Finalizado.');
  process.exit(0);
}

const targetPath = `/marisquerias/${negocioId}.json${authToken ? `?auth=${authToken}` : ''}`;
const url = new URL(`${DB_URL}${targetPath}`);

const req = https.request(
  {
    hostname: url.hostname,
    port: 443,
    path: url.pathname + url.search,
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payloadString),
    },
  },
  (res) => {
    let resData = '';
    res.on('data', (chunk) => (resData += chunk));
    res.on('end', () => {
      if (res.statusCode === 200) {
        console.log(`✅ [EXITO] Negocio ${negocioId} sincronizado y limpiado al 100% en RTDB.`);
      } else {
        console.error(`❌ [ERROR HTTP ${res.statusCode}]`, resData);
        process.exit(1);
      }
    });
  }
);
req.on('error', (e) => {
  console.error('Error de red:', e.message);
  process.exit(1);
});
req.write(payloadString);
req.end();
