// Herramienta de orquestación: generador del libro de eventos.
//
// Uso:
//   node herramientas/orquestacion/generar_eventos.mjs
//
// Idempotente y determinista: escanea la sesión activa (declarada en el MANIFIESTO)
// y agrega al libro `EVENTOS.json` únicamente eventos nuevos, deduplicados por
// (tipo, agente, sello). Se ejecuta igual en local (orquestador) y en GitHub Actions.
//
// Eventos generados:
//   INSTRUCCION_NUEVA   desde M<n>/instruccion.md con `| ESTADO | NUEVA |`
//                       (sello = SHA-256 del archivo con la línea SELLO vaciada)
//   INFORME_ENTREGADO   desde M<n>/informe.md (sello = SHA-256 del contenido)
//   DECISION            desde CENTRAL/decisiones.md (sello = SHA-256 del contenido)
//
// Los commits de reporte, documentación o código NO generan INSTRUCCION_NUEVA:
// no existen ciclos de trabajo.

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import path from 'node:path';

const RAIZ = process.cwd();
const ZONA = path.join(RAIZ, 'docs', 'comunicacion_multimodelo');
const MANIFIESTO = path.join(ZONA, 'MANIFIESTO.md');

function sha256(texto) {
  return createHash('sha256').update(texto).digest('hex');
}

function leerSesionActiva() {
  const texto = readFileSync(MANIFIESTO, 'utf8');
  const match = texto.match(/\| Sesión activa \| `([^`]+)` \|/);
  if (!match) throw new Error('MANIFIESTO.md no declara la sesión activa');
  return match[1];
}

function commitActual() {
  try {
    return execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
  } catch {
    return 'sin-commit';
  }
}

function leerEventos(archivo) {
  if (!existsSync(archivo)) return [];
  try {
    return JSON.parse(readFileSync(archivo, 'utf8')).eventos ?? [];
  } catch {
    throw new Error(`EVENTOS.json corrupto: ${archivo}`);
  }
}

function escanearInstrucciones(sesionDir, ahora, commit) {
  const eventos = [];
  for (const agente of ['M1', 'M2', 'M3', 'M4', 'M5']) {
    const archivo = path.join(sesionDir, agente, 'instruccion.md');
    if (!existsSync(archivo)) continue;
    const texto = readFileSync(archivo, 'utf8');
    const estado = texto.match(/\| ESTADO \|\s*(NUEVA|CANCELADA|RECIBIDA|TRABAJANDO|BLOQUEADA|REPORTADA|ABSORBIDA|RECHAZADA|CORREGIDA)\s*\|/)?.[1];
    if (estado !== 'NUEVA') continue;
    const tarea = texto.match(/^# Tarea\s+(T-[A-Z0-9-]+)/m)?.[1] ?? `T-${agente}-?`;
    eventos.push({
      tipo: 'INSTRUCCION_NUEVA',
      agente,
      tarea,
      sello: sha256(texto.replace(/^SELLO:.*$/m, 'SELLO:')),
      commit,
      fecha: ahora,
    });
  }
  return eventos;
}

function escanearInformes(sesionDir, ahora, commit) {
  const eventos = [];
  for (const agente of ['M1', 'M2', 'M3', 'M4', 'M5']) {
    const archivo = path.join(sesionDir, agente, 'informe.md');
    if (!existsSync(archivo)) continue;
    const texto = readFileSync(archivo, 'utf8');
    const tarea = texto.match(/^# Informe — M\d \/ Tarea\s+(T-[A-Z0-9-]+)/m)?.[1] ?? 'T-?';
    eventos.push({
      tipo: 'INFORME_ENTREGADO',
      agente,
      tarea,
      sello: sha256(texto),
      commit,
      fecha: ahora,
    });
  }
  return eventos;
}

function escanearDecisiones(sesionDir, ahora, commit) {
  const archivo = path.join(sesionDir, 'CENTRAL', 'decisiones.md');
  if (!existsSync(archivo)) return [];
  const texto = readFileSync(archivo, 'utf8');
  return [
    {
      tipo: 'DECISION',
      agente: 'DEEPSEEK',
      tarea: 'CENTRAL',
      sello: sha256(texto),
      commit,
      fecha: ahora,
    },
  ];
}

function main() {
  const sesion = leerSesionActiva();
  const sesionDir = path.join(ZONA, 'sesiones', sesion);
  const libro = path.join(sesionDir, 'EVENTOS.json');
  const ahora = new Date().toISOString();
  const commit = commitActual();

  const existentes = leerEventos(libro);
  const vistos = new Set(existentes.map((e) => `${e.tipo}|${e.agente}|${e.sello}`));
  const nuevos = [
    ...escanearInstrucciones(sesionDir, ahora, commit),
    ...escanearInformes(sesionDir, ahora, commit),
    ...escanearDecisiones(sesionDir, ahora, commit),
  ].filter((e) => {
    const clave = `${e.tipo}|${e.agente}|${e.sello}`;
    if (vistos.has(clave)) return false;
    vistos.add(clave);
    return true;
  });

  if (nuevos.length === 0) {
    console.log(`[orquestacion] Sin eventos nuevos para la sesión ${sesion}.`);
    return;
  }

  const eventos = [...existentes, ...nuevos].map((e, i) => ({ id: `ev-${String(i + 1).padStart(4, '0')}`, ...e }));
  mkdirSync(sesionDir, { recursive: true });
  writeFileSync(
    libro,
    JSON.stringify(
      { sesion, rama: 'rama-2', actualizado: ahora, eventos },
      null,
      2
    ) + '\n'
  );
  console.log(`[orquestacion] ${nuevos.length} evento(s) nuevo(s) agregados a ${libro}`);
  for (const e of nuevos) console.log(`  + ${e.tipo} ${e.agente} ${e.tarea} ${e.sello.slice(0, 12)}`);
}

main();
