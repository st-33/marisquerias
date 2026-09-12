#!/usr/bin/env node
/**
 * scripts/migracion/backup-rtdb.js
 *
 * Procedimiento de respaldo completo de la RTDB antes de cualquier mutación.
 * Permite usar REST API de Firebase o credenciales de admin/auth token si las reglas exigen autenticación.
 *
 * Uso:
 *   node scripts/migracion/backup-rtdb.js [--auth=<FIREBASE_AUTH_TOKEN>]
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const DB_URL =
  process.env.FIREBASE_DATABASE_URL ||
  'https://minegocioaunclick-1539b-default-rtdb.firebaseio.com';

const authArg = process.argv.find((arg) => arg.startsWith('--auth='));
const authToken = authArg ? authArg.split('=')[1] : process.env.FIREBASE_AUTH_TOKEN;

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupDir = path.resolve(__dirname, '../../backups');
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}
const backupFilePath = path.join(backupDir, `rtdb_backup_produccion_${timestamp}.json`);

console.log(`[RTDB-BACKUP] Iniciando respaldo completo desde: ${DB_URL}`);
console.log(`[RTDB-BACKUP] Destino: ${backupFilePath}`);

const urlString = `${DB_URL}/.json${authToken ? `?auth=${authToken}` : ''}`;
const url = new URL(urlString);

const fileStream = fs.createWriteStream(backupFilePath);

const request = https.get(url, (res) => {
  if (res.statusCode === 401 || res.statusCode === 403) {
    fs.unlinkSync(backupFilePath);
    console.error(`\n[ERROR DE SEGURIDAD] Código ${res.statusCode}: Permiso denegado.`);
    console.error(
      'Si las reglas de seguridad de RTDB están activas, pasa el token de autenticación:'
    );
    console.error('  node scripts/migracion/backup-rtdb.js --auth="<ID_TOKEN_O_SECRET>"');
    console.error('O exporta: export FIREBASE_AUTH_TOKEN="<TOKEN>"\n');
    process.exit(1);
  }

  if (res.statusCode !== 200) {
    fs.unlinkSync(backupFilePath);
    console.error(`\n[ERROR] Respuesta HTTP ${res.statusCode}: ${res.statusMessage}`);
    process.exit(1);
  }

  let totalBytes = 0;
  res.on('data', (chunk) => {
    totalBytes += chunk.length;
    process.stdout.write(
      `\r[RTDB-BACKUP] Descargando datos: ${(totalBytes / 1024 / 1024).toFixed(2)} MB`
    );
  });

  res.pipe(fileStream);

  fileStream.on('finish', () => {
    fileStream.close();
    console.log(`\n[RTDB-BACKUP] ✅ Respaldo completado con éxito. Archivo: ${backupFilePath}`);
  });
});

request.on('error', (err) => {
  if (fs.existsSync(backupFilePath)) {
    fs.unlinkSync(backupFilePath);
  }
  console.error('\n[RTDB-BACKUP] Error de conexión:', err.message);
  process.exit(1);
});
