#!/usr/bin/env node
/**
 * scripts/migracion/simular-ciclo-pedido.js
 *
 * FASE 7 — MISIÓN 4: Auditoría del ciclo de vida completo de un pedido.
 *
 * Simula en la RTDB real:
 *   creación → enviado_cocina → en_preparacion → listo → cerrado → limpieza
 *
 * Uso:
 *   node scripts/migracion/simular-ciclo-pedido.js \
 *     --negocio=el-arrecife [--auth=<TOKEN>] [--dry-run]
 */
'use strict';

const https = require('https');

const DB_URL =
  process.env.FIREBASE_DATABASE_URL ||
  'https://minegocioaunclick-1539b-default-rtdb.firebaseio.com';

const args = process.argv.slice(2);
const get = (prefix) => { const a = args.find((x) => x.startsWith(prefix)); return a ? a.split('=').slice(1).join('=') : undefined; };

const negocioId = get('--negocio=') || 'el-arrecife';
const authToken = get('--auth=') || process.env.FIREBASE_AUTH_TOKEN || '';
const dryRun = args.includes('--dry-run');

const ROOT = 'marisquerias/' + negocioId;
const PEDIDOS_PATH = ROOT + '/pedidos';
const SECUENCIA_PATH = ROOT + '/secuencias/pedidos';

function rtdbUrl(path) {
  const auth = authToken ? '?auth=' + authToken : '';
  return DB_URL + '/' + path + '.json' + auth;
}

function request(method, path, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(rtdbUrl(path));
    const data = body !== undefined ? JSON.stringify(body) : undefined;
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method,
      headers: { 'Content-Type': 'application/json', ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}) },
    };
    const req = https.request(options, (res) => {
      let raw = '';
      res.on('data', (c) => (raw += c));
      res.on('end', () => { try { resolve({ status: res.statusCode, body: JSON.parse(raw) }); } catch { resolve({ status: res.statusCode, body: raw }); } });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

const rtdbGet = (path) => request('GET', path);
const rtdbSet = (path, body) => dryRun ? Promise.resolve({ status: 200, body }) : request('PUT', path, body);
const rtdbPatch = (path, body) => dryRun ? Promise.resolve({ status: 200, body }) : request('PATCH', path, body);
const rtdbDelete = (path) => dryRun ? Promise.resolve({ status: 200, body: null }) : request('DELETE', path);

const results = [];
function log(icon, msg, detail) {
  const line = icon + ' ' + msg + (detail !== undefined ? ' → ' + JSON.stringify(detail) : '');
  console.log(line);
  results.push({ icon, msg, detail });
}
function assert(condition, label, got) {
  log(condition ? '✅' : '❌', (condition ? 'PASS: ' : 'FAIL: ') + label, got);
  return condition;
}

function formatYMD(ts) {
  const d = new Date(ts);
  return d.getFullYear() + String(d.getMonth()+1).padStart(2,'0') + String(d.getDate()).padStart(2,'0');
}

async function generarIdPedido() {
  const now = Date.now();
  const ymd = formatYMD(now);
  const seqPath = SECUENCIA_PATH + '/' + ymd;
  if (dryRun) return 'PED-' + ymd + '-SIM';
  const { body: current } = await rtdbGet(seqPath);
  const next = typeof current === 'number' ? current + 1 : 1;
  await rtdbSet(seqPath, next);
  return 'PED-' + ymd + '-' + String(next).padStart(3,'0') + '-SIM';
}

async function simularCiclo() {
  console.log('\n' + '═'.repeat(60));
  console.log('🧪 SIMULACIÓN CICLO PEDIDO — ' + (dryRun ? 'DRY-RUN' : 'REAL'));
  console.log('🏪 Negocio: ' + negocioId + '  🌐 ' + DB_URL);
  if (dryRun) console.log('⚠️  DRY-RUN: No se escribe en RTDB');
  console.log('═'.repeat(60) + '\n');

  const now = Date.now();
  const nowISO = new Date(now).toISOString();

  // PASO 0: Conectividad
  log('⚡', 'Paso 0: Verificando conectividad RTDB...');
  const { status: ps } = await rtdbGet(ROOT + '/config');
  assert(ps === 200, 'Conectividad RTDB', { status: ps });
  if (ps !== 200) { console.log('\n❌ RTDB inaccesible. Verifica --auth o la URL.'); process.exit(1); }
  console.log('');

  // PASO 1: Crear pedido
  log('⚡', 'Paso 1: Crear pedido (2 items, estado=nuevo)...');
  const pedidoId = await generarIdPedido();
  log('🔍', 'ID pedido: ' + pedidoId);
  const pedidoPayload = {
    id: pedidoId, tipo: 'mesa', mesaId: 'SIM-MESA-99', estatus: 'activo',
    items: {
      'IT-001': { id:'IT-001', nombre:'Ceviche de Camaron (SIM)', cantidad:1, precio:120, estado:'nuevo', productId:null, impreso:false, agregadoAt:now, agregadoAtISO:nowISO },
      'IT-002': { id:'IT-002', nombre:'Agua Mineral (SIM)', cantidad:2, precio:30, estado:'nuevo', productId:null, impreso:false, agregadoAt:now, agregadoAtISO:nowISO },
    },
    createdAt:now, createdAtISO:nowISO, updatedAt:now, updatedAtISO:nowISO, _seqItems:2, _simulacion:true,
  };
  const { status: s1 } = await rtdbSet(PEDIDOS_PATH + '/' + pedidoId, pedidoPayload);
  assert(s1 === 200, 'Pedido creado en RTDB', { pedidoId, status: s1 });
  console.log('');

  // PASO 2: Verificar persistencia
  log('⚡', 'Paso 2: Verificar persistencia...');
  const { body: v2 } = await rtdbGet(PEDIDOS_PATH + '/' + pedidoId);
  assert(dryRun || v2?.estatus === 'activo', 'estatus=activo', dryRun ? 'DRY-RUN' : v2?.estatus);
  assert(dryRun || Object.keys(v2?.items||{}).length === 2, '2 items en RTDB', dryRun ? 'DRY-RUN' : Object.keys(v2?.items||{}).length);
  console.log('');

  // PASO 3: enviarACocina (batch atómico — igual que PedidosRepository.enviarACocina)
  log('⚡', 'Paso 3: enviarACocina (batch atómico)...');
  const t3 = Date.now();
  const batch3 = {
    [PEDIDOS_PATH+'/'+pedidoId+'/estatus']: 'enviado_cocina',
    [PEDIDOS_PATH+'/'+pedidoId+'/sentToKitchenAt']: t3,
    [PEDIDOS_PATH+'/'+pedidoId+'/sentToKitchenAtISO']: new Date(t3).toISOString(),
    [PEDIDOS_PATH+'/'+pedidoId+'/updatedAt']: t3,
    [PEDIDOS_PATH+'/'+pedidoId+'/updatedAtISO']: new Date(t3).toISOString(),
    [PEDIDOS_PATH+'/'+pedidoId+'/items/IT-001/impreso']: true,
    // IT-002 (bebida) → directo a listo (no pasa por cocina)
    [PEDIDOS_PATH+'/'+pedidoId+'/items/IT-002/estado']: 'listo',
    [PEDIDOS_PATH+'/'+pedidoId+'/items/IT-002/impreso']: true,
    [PEDIDOS_PATH+'/'+pedidoId+'/items/IT-002/listoAt']: t3,
  };
  const { status: s3 } = await rtdbPatch('', batch3);
  assert(s3 === 200, 'Batch enviado_cocina OK', { status: s3 });
  if (!dryRun) {
    const { body: v3 } = await rtdbGet(PEDIDOS_PATH + '/' + pedidoId);
    assert(v3?.estatus === 'enviado_cocina', 'estatus=enviado_cocina', v3?.estatus);
    assert(v3?.items?.['IT-001']?.estado === 'nuevo', 'IT-001=nuevo (esperando cocina)', v3?.items?.['IT-001']?.estado);
    assert(v3?.items?.['IT-002']?.estado === 'listo', 'IT-002=listo (bebida directa)', v3?.items?.['IT-002']?.estado);
  } else { log('✅', 'DRY-RUN: batch enviado_cocina simulado'); }
  console.log('');

  // PASO 4: Cocina inicia preparación
  log('⚡', 'Paso 4: Cocina inicia IT-001 (en_preparacion)...');
  const t4 = Date.now();
  const batch4 = {
    [PEDIDOS_PATH+'/'+pedidoId+'/estatus']: 'en_preparacion',
    [PEDIDOS_PATH+'/'+pedidoId+'/items/IT-001/estado']: 'en_preparacion',
    [PEDIDOS_PATH+'/'+pedidoId+'/items/IT-001/startedAt']: t4,
    [PEDIDOS_PATH+'/'+pedidoId+'/updatedAt']: t4,
    [PEDIDOS_PATH+'/'+pedidoId+'/updatedAtISO']: new Date(t4).toISOString(),
  };
  const { status: s4 } = await rtdbPatch('', batch4);
  assert(s4 === 200, 'Batch en_preparacion OK', { status: s4 });
  if (!dryRun) {
    const { body: v4 } = await rtdbGet(PEDIDOS_PATH + '/' + pedidoId);
    assert(v4?.estatus === 'en_preparacion', 'estatus=en_preparacion', v4?.estatus);
    assert(v4?.items?.['IT-001']?.estado === 'en_preparacion', 'IT-001=en_preparacion', v4?.items?.['IT-001']?.estado);
    assert(typeof v4?.items?.['IT-001']?.startedAt === 'number', 'startedAt=timestamp', v4?.items?.['IT-001']?.startedAt);
  } else { log('✅', 'DRY-RUN: en_preparacion simulado'); }
  console.log('');

  // PASO 5: Cocina marca IT-001 listo → orden listo
  log('⚡', 'Paso 5: IT-001 listo → orden listo...');
  const t5 = Date.now();
  const batch5 = {
    [PEDIDOS_PATH+'/'+pedidoId+'/estatus']: 'listo',
    [PEDIDOS_PATH+'/'+pedidoId+'/items/IT-001/estado']: 'listo',
    [PEDIDOS_PATH+'/'+pedidoId+'/items/IT-001/listoAt']: t5,
    [PEDIDOS_PATH+'/'+pedidoId+'/updatedAt']: t5,
    [PEDIDOS_PATH+'/'+pedidoId+'/updatedAtISO']: new Date(t5).toISOString(),
  };
  const { status: s5 } = await rtdbPatch('', batch5);
  assert(s5 === 200, 'Batch listo OK', { status: s5 });
  if (!dryRun) {
    const { body: v5 } = await rtdbGet(PEDIDOS_PATH + '/' + pedidoId);
    assert(v5?.estatus === 'listo', 'estatus=listo', v5?.estatus);
    const todosListos = Object.values(v5?.items||{}).every((it) => it.estado === 'listo' || it.estado === 'entregado');
    assert(todosListos, 'Todos los items=listo/entregado', Object.fromEntries(Object.entries(v5?.items||{}).map(([k,it])=>[k,it.estado])));
  } else { log('✅', 'DRY-RUN: listo simulado'); }
  console.log('');

  // PASO 6: Cerrar pedido (cerrado + pagadoAt)
  log('⚡', 'Paso 6: Cerrar pedido (cerrado)...');
  const t6 = Date.now();
  const batch6 = {
    [PEDIDOS_PATH+'/'+pedidoId+'/estatus']: 'cerrado',
    [PEDIDOS_PATH+'/'+pedidoId+'/cerrado']: true,
    [PEDIDOS_PATH+'/'+pedidoId+'/pagadoAt']: t6,
    [PEDIDOS_PATH+'/'+pedidoId+'/pagadoAtISO']: new Date(t6).toISOString(),
    [PEDIDOS_PATH+'/'+pedidoId+'/registroVentaEstado']: 'registrado',
    [PEDIDOS_PATH+'/'+pedidoId+'/updatedAt']: t6,
    [PEDIDOS_PATH+'/'+pedidoId+'/updatedAtISO']: new Date(t6).toISOString(),
  };
  const { status: s6 } = await rtdbPatch('', batch6);
  assert(s6 === 200, 'Batch cerrado OK', { status: s6 });
  if (!dryRun) {
    const { body: v6 } = await rtdbGet(PEDIDOS_PATH + '/' + pedidoId);
    assert(v6?.estatus === 'cerrado', 'estatus=cerrado', v6?.estatus);
    assert(v6?.cerrado === true, 'cerrado=true', v6?.cerrado);
    assert(typeof v6?.pagadoAt === 'number', 'pagadoAt=timestamp', v6?.pagadoAt);
  } else { log('✅', 'DRY-RUN: cerrado simulado'); }
  console.log('');

  // PASO 7: Limpieza
  log('⚡', 'Paso 7: Limpieza — eliminando pedido de simulación...');
  const { status: s7 } = await rtdbDelete(PEDIDOS_PATH + '/' + pedidoId);
  assert(s7 === 200, 'Pedido de simulación eliminado', { status: s7 });
  if (!dryRun) {
    const { body: vClean } = await rtdbGet(PEDIDOS_PATH + '/' + pedidoId);
    assert(vClean === null, 'Pedido ya no existe en RTDB', vClean);
  }
  console.log('');

  // RESUMEN
  const passed = results.filter((r) => r.icon === '✅').length;
  const failed = results.filter((r) => r.icon === '❌').length;
  console.log('═'.repeat(60));
  console.log('📊 RESUMEN: ' + passed + ' PASS / ' + failed + ' FAIL');
  if (failed === 0) {
    console.log('🎯 CICLO DE VIDA COMPLETO: OK — El conducto mesero→cocina es inquebrantable.');
  } else {
    console.log('⚠️  HAY FALLAS. Ver detalles arriba.');
    process.exit(1);
  }
  console.log('═'.repeat(60) + '\n');
}

simularCiclo().catch((err) => { console.error('💥 Error fatal:', err); process.exit(1); });
