/*
 * Activa tareas Manus desde el libro de eventos de la sesión activa.
 *
 * Este script es invocado por GitHub Actions después de generar EVENTOS.json.
 * No procesa historial de git, no toca procesado.json y no modifica instrucciones.
 * La deduplicación de activaciones usa ACTIVACIONES.json, separado del registro
 * que cada subagente actualiza al terminar su trabajo.
 *
 * Uso local de validación:
 *   node herramientas/orquestacion/activar_subagentes.mjs --dry-run
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const RAIZ = process.cwd();
const ZONA = path.join(RAIZ, 'docs', 'comunicacion_multimodelo');
const MANIFIESTO = path.join(ZONA, 'MANIFIESTO.md');
const AGENTES = ['M1', 'M2', 'M3', 'M4', 'M5'];
const ES_SIMULACION = process.argv.includes('--dry-run');

function leerTexto(archivo) {
  return readFileSync(archivo, 'utf8');
}

function leerJson(archivo, valorPorDefecto) {
  if (!existsSync(archivo)) return valorPorDefecto;
  return JSON.parse(leerTexto(archivo));
}

function escribirJson(archivo, valor) {
  mkdirSync(path.dirname(archivo), { recursive: true });
  writeFileSync(archivo, `${JSON.stringify(valor, null, 2)}\n`, 'utf8');
}

function sesionActiva() {
  const texto = leerTexto(MANIFIESTO);
  const coincidencia = texto.match(/\| Sesión activa \| `([^`]+)` \|/);
  if (!coincidencia) throw new Error('MANIFIESTO.md no declara la sesión activa');
  return coincidencia[1];
}

function textoDeTarea({ agente, tarea, sello, commit, sesion, ruta }) {
  return [
    `Identidad operativa: ${agente} / Modelo ${agente.slice(1)}.`,
    'Actúas como subagente independiente coordinado por DeepSeek/Ditzig.',
    `Repositorio: st-33/marisquerias. Rama: rama-2. Sesión: ${sesion}.`,
    `Tarea: ${tarea}. Sello: ${sello}. Commit de origen: ${commit || 'no declarado'}.`,
    `Ruta de la instrucción: ${ruta}.`,
    '',
    'Al iniciar, lee AGENTS.md, docs/comunicacion_multimodelo/MANIFIESTO.md,',
    'el EVENTOS.json de la sesión activa, CENTRAL/estado.md y tu carpeta propia.',
    'Procesa únicamente esta instrucción y respeta el protocolo 02 de subagente.',
    'No trates un commit como instrucción, no inventes trabajo y no modifiques',
    'EVENTOS.json, MANIFIESTO.md, AGENTS.md, CENTRAL, protocolos ni carpetas ajenas.',
    'Al terminar, documenta el resultado, actualiza tu estado y procesado.json,',
    'publica el commit autorizado y vuelve a DISPONIBLE.',
  ].join('\n');
}

function eventosDe(archivo) {
  const libro = leerJson(archivo, { eventos: [] });
  if (!Array.isArray(libro.eventos)) {
    throw new Error(`El libro no contiene el array eventos: ${archivo}`);
  }
  return libro.eventos;
}

function claveActivacion(evento) {
  return `${evento.agente}|${evento.tarea}|${evento.sello}`;
}

function activacionEnviada(activaciones, clave) {
  return activaciones.some((registro) => (
    registro.clave === clave && registro.estado === 'ENVIADA' && registro.task_id
  ));
}

function registroErrorSeguro(error) {
  return error instanceof Error ? error.message.slice(0, 300) : 'error desconocido';
}

async function crearTareaManus(evento, sesion, apiKey) {
  const agente = evento.agente;
  const tarea = evento.tarea || `T-${agente}-?`;
  const sello = evento.sello;
  const ruta = evento.ruta || `docs/comunicacion_multimodelo/sesiones/${sesion}/${agente}/instruccion.md`;
  const payload = {
    title: `${agente} | ${tarea} | ${sello.slice(0, 12)}`,
    message: {
      content: [
        {
          type: 'text',
          text: textoDeTarea({
            agente,
            tarea,
            sello,
            commit: evento.commit,
            sesion,
            ruta,
          }),
        },
      ],
    },
    locale: 'es',
    interactive_mode: false,
    share_visibility: 'private',
  };

  const respuesta = await fetch('https://api.manus.ai/v2/task.create', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-manus-api-key': apiKey,
    },
    body: JSON.stringify(payload),
  });

  const cuerpo = await respuesta.text();
  let datos = {};
  try {
    datos = cuerpo ? JSON.parse(cuerpo) : {};
  } catch {
    datos = {};
  }

  if (!respuesta.ok || datos.ok === false) {
    const requestId = datos.request_id || 'sin-request-id';
    throw new Error(`Manus respondió HTTP ${respuesta.status}; request_id=${requestId}`);
  }

  if (!datos.task_id) {
    throw new Error('Manus respondió sin task_id');
  }

  return {
    task_id: datos.task_id,
    task_url: datos.task_url || null,
    request_id: datos.request_id || null,
  };
}

async function main() {
  const sesion = sesionActiva();
  const sesionDir = path.join(ZONA, 'sesiones', sesion);
  const eventosPath = path.join(sesionDir, 'EVENTOS.json');
  const activacionesPath = path.join(sesionDir, 'ACTIVACIONES.json');
  const activacionesLibro = leerJson(activacionesPath, {
    version: 1,
    sesion,
    activaciones: [],
  });
  if (!Array.isArray(activacionesLibro.activaciones)) {
    throw new Error(`ACTIVACIONES.json no contiene el array activaciones: ${activacionesPath}`);
  }

  const eventos = eventosDe(eventosPath);
  const activaciones = activacionesLibro.activaciones;
  const pendientes = eventos.filter((evento) => (
    evento.tipo === 'INSTRUCCION_NUEVA'
    && AGENTES.includes(evento.agente)
    && typeof evento.sello === 'string'
    && evento.sello.length > 0
    && !activacionEnviada(activaciones, claveActivacion(evento))
  ));

  if (pendientes.length === 0) {
    console.log(`[activacion] Sin instrucciones nuevas pendientes para ${sesion}.`);
    return;
  }

  console.log(`[activacion] ${pendientes.length} evento(s) candidato(s) en ${sesion}.`);
  let cambios = false;

  for (const evento of pendientes) {
    const agente = evento.agente;
    const clave = claveActivacion(evento);
    if (ES_SIMULACION) {
      console.log(`[activacion] DRY-RUN: ${agente} ${evento.tarea} sello=${evento.sello}`);
      continue;
    }

    const nombreSecreto = `MANUS_${agente}_API_KEY`;
    const apiKey = process.env[nombreSecreto];
    if (!apiKey) {
      throw new Error(`Falta el secreto ${nombreSecreto} para ${agente}`);
    }

    console.log(`[activacion] Creando tarea para ${agente} ${evento.tarea} sello=${evento.sello}`);
    let resultado;
    try {
      resultado = await crearTareaManus(evento, sesion, apiKey);
    } catch (error) {
      console.error(`[activacion] Falló ${agente} ${evento.tarea}: ${registroErrorSeguro(error)}`);
      throw error;
    }

    activaciones.push({
      clave,
      agente,
      tarea: evento.tarea,
      sello: evento.sello,
      evento_id: evento.id || null,
      commit_origen: evento.commit || null,
      task_id: resultado.task_id,
      task_url: resultado.task_url,
      request_id: resultado.request_id,
      estado: 'ENVIADA',
      enviado_at: new Date().toISOString(),
    });
    cambios = true;
    console.log(`[activacion] Tarea creada para ${agente}; task_id=${resultado.task_id}`);
  }

  if (cambios) {
    activacionesLibro.actualizado = new Date().toISOString();
    escribirJson(activacionesPath, activacionesLibro);
    console.log(`[activacion] Registro actualizado: ${activacionesPath}`);
  }
}

main().catch((error) => {
  console.error(`[activacion] Error: ${registroErrorSeguro(error)}`);
  process.exitCode = 1;
});
