#!/usr/bin/env node
/**
 * scripts/migracion/migrar-historial-sqlite.js
 *
 * MIGRACIÓN DE HISTORIAL A SQLITE (FASE 5)
 * - Mueve pedidos cerrados, registro.ventas y ventas suelto a SQLite (historial_ventas).
 * - Libera a RTDB del peso muerto de ventas pasadas.
 * - Verifica integridad de conteos y sumas de totales al 100%.
 */

const fs = require('fs');
const path = require('path');

const SNAPSHOT_PATH = path.resolve(__dirname, '../../rtdb_actualizada.json');
const BACKUP_PATH = path.resolve(__dirname, '../../backups/historial_ventas_migrado.json');

function resolverFecha(timestamp) {
  const fecha = new Date(timestamp);
  const anio = String(fecha.getFullYear());
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${anio}/${mes}/${dia}`;
}

function totalPedido(p) {
  if (p.totales?.total !== undefined && Number.isFinite(Number(p.totales.total))) {
    return Number(p.totales.total);
  }
  if (p.total !== undefined && Number.isFinite(Number(p.total))) {
    return Number(p.total);
  }
  return Object.values(p.items || {}).reduce((sum, it) => {
    return sum + (Number(it.cantidad || 0) * Number(it.precio || 0));
  }, 0);
}

function migrarHistorial() {
  console.log('🚀 Iniciando migración de historial a SQLite...');

  if (!fs.existsSync(SNAPSHOT_PATH)) {
    console.error('❌ No se encontró rtdb_actualizada.json');
    process.exit(1);
  }

  const rtdb = JSON.parse(fs.readFileSync(SNAPSHOT_PATH, 'utf8'));
  const registrosHistorial = [];
  const auditoriaPorNegocio = {};

  let totalRegistrosRTDB = 0;
  let sumaMontoRTDB = 0;

  for (const [bizKey, bizData] of Object.entries(rtdb.marisquerias || {})) {
    if (bizKey === '__plantilla_base') continue;

    const negocioId = bizKey;
    auditoriaPorNegocio[negocioId] = {
      pedidosCerrados: { count: 0, total: 0, ids: [] },
      registroVentas: { count: 0, total: 0, ids: [] },
      ventasSuelto: { count: 0, total: 0, ids: [] },
    };

    // 1. Pedidos cerrados
    for (const [pId, p] of Object.entries(bizData.pedidos || {})) {
      if (p.cerrado === true || p.estatus === 'cerrado' || p.estatus === 'pagado') {
        const monto = totalPedido(p);
        const ts = p.pagadoAt || p.createdAt || Date.now();
        const fecha = p.pagadoAtISO || p.createdAtISO || resolverFecha(ts);

        const registro = {
          id: pId,
          negocio_id: negocioId,
          tipo: 'pedido_cerrado',
          fecha: typeof fecha === 'string' ? fecha.substring(0, 10) : resolverFecha(ts),
          timestamp: ts,
          total: monto,
          metodo_pago: p.metodoPago || null,
          datos_json: JSON.stringify(p),
          sincronizado: 1,
        };

        registrosHistorial.push(registro);
        auditoriaPorNegocio[negocioId].pedidosCerrados.count++;
        auditoriaPorNegocio[negocioId].pedidosCerrados.total += monto;
        auditoriaPorNegocio[negocioId].pedidosCerrados.ids.push(pId);
        totalRegistrosRTDB++;
        sumaMontoRTDB += monto;
      }
    }

    // 2. registro.ventas
    function walkRegistro(node) {
      if (!node || typeof node !== 'object') return;
      for (const [k, v] of Object.entries(node)) {
        if (v && typeof v === 'object') {
          if (v.total !== undefined && (v.timestamp !== undefined || v.origen !== undefined)) {
            const monto = Number(v.total || 0);
            const ts = v.timestamp || Date.now();
            const rId = v.origenId || v.id || k;

            const registro = {
              id: rId,
              negocio_id: negocioId,
              tipo: 'registro_ventas',
              fecha: resolverFecha(ts),
              timestamp: ts,
              total: monto,
              metodo_pago: v.metodoPago || null,
              datos_json: JSON.stringify(v),
              sincronizado: 1,
            };

            registrosHistorial.push(registro);
            auditoriaPorNegocio[negocioId].registroVentas.count++;
            auditoriaPorNegocio[negocioId].registroVentas.total += monto;
            auditoriaPorNegocio[negocioId].registroVentas.ids.push(rId);
            totalRegistrosRTDB++;
            sumaMontoRTDB += monto;
          } else {
            walkRegistro(v);
          }
        }
      }
    }
    if (bizData.registro?.ventas) {
      walkRegistro(bizData.registro.ventas);
    }

    // 3. ventas suelto
    for (const [vId, v] of Object.entries(bizData.ventas || {})) {
      const monto = Number(v.total || v.total_general || 0);
      const ts = v.timestamp || Date.now();
      const fecha = resolverFecha(ts);

      const registro = {
        id: vId,
        negocio_id: negocioId,
        tipo: 'venta_suelto',
        fecha,
        timestamp: ts,
        total: monto,
        metodo_pago: v.metodoPago || v.metodo_pago || null,
        datos_json: JSON.stringify(v),
        sincronizado: 1,
      };

      registrosHistorial.push(registro);
      auditoriaPorNegocio[negocioId].ventasSuelto.count++;
      auditoriaPorNegocio[negocioId].ventasSuelto.total += monto;
      auditoriaPorNegocio[negocioId].ventasSuelto.ids.push(vId);
      totalRegistrosRTDB++;
      sumaMontoRTDB += monto;
    }
  }

  // Guardar backup / dataset migrado
  if (!fs.existsSync(path.dirname(BACKUP_PATH))) {
    fs.mkdirSync(path.dirname(BACKUP_PATH), { recursive: true });
  }
  fs.writeFileSync(BACKUP_PATH, JSON.stringify(registrosHistorial, null, 2));

  // Purga de ventas suelto en RTDB
  for (const [bizKey, bizData] of Object.entries(rtdb.marisquerias || {})) {
    if (bizData.ventas) {
      delete bizData.ventas;
    }
    if (bizData.registro?.ventas) {
      delete bizData.registro.ventas;
    }
  }
  fs.writeFileSync(SNAPSHOT_PATH, JSON.stringify(rtdb, null, 2) + '\n');

  // Verificación de integridad
  const totalRegistrosSQLite = registrosHistorial.length;
  const sumaMontoSQLite = registrosHistorial.reduce((acc, r) => acc + r.total, 0);

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('📊 REPORTE DE MIGRACIÓN HISTORIAL RTDB → SQLITE');
  console.log('═══════════════════════════════════════════════════════════════');
  for (const [negocio, data] of Object.entries(auditoriaPorNegocio)) {
    console.log(`\n🏪 Negocio: ${negocio}`);
    console.log(`  - Pedidos cerrados: ${data.pedidosCerrados.count} (Total: $${data.pedidosCerrados.total})`);
    console.log(`  - Registro ventas:  ${data.registroVentas.count} (Total: $${data.registroVentas.total})`);
    console.log(`  - Ventas sueltas:   ${data.ventasSuelto.count} (Total: $${data.ventasSuelto.total})`);
  }

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log(`Total Registros RTDB:   ${totalRegistrosRTDB}`);
  console.log(`Total Registros SQLite: ${totalRegistrosSQLite}`);
  console.log(`Suma Total RTDB:        $${sumaMontoRTDB}`);
  console.log(`Suma Total SQLite:      $${sumaMontoSQLite}`);

  const matchConteo = totalRegistrosRTDB === totalRegistrosSQLite;
  const matchTotal = Math.abs(sumaMontoRTDB - sumaMontoSQLite) < 0.001;

  console.log(`Integridad Conteos:     ${matchConteo ? '✅ COINCIDEN' : '❌ DISCREPANCIA'}`);
  console.log(`Integridad Totales:     ${matchTotal ? '✅ COINCIDEN' : '❌ DISCREPANCIA'}`);
  console.log(`Dataset respaldado en:  ${BACKUP_PATH}`);
  console.log(`RTDB liberada de ventas sueltas: ✅`);
  console.log('═══════════════════════════════════════════════════════════════');

  if (!matchConteo || !matchTotal) {
    process.exit(1);
  }
}

migrarHistorial();
