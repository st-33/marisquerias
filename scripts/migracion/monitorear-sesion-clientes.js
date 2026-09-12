#!/usr/bin/env node
/**
 * scripts/migracion/monitorear-sesion-clientes.js
 *
 * Monitor en tiempo real para verificar que los clientes activos de `el-arrecife`
 * mantengan su estado de conexión (.info/connected) y reciban los eventos de actualización
 * sin desconexiones, reseteos de sesión o errores de permisos.
 *
 * Uso:
 *   node scripts/migracion/monitorear-sesion-clientes.js --negocio=el-arrecife
 */

const { initializeApp } = require('firebase/app');
const { getDatabase, ref, onValue } = require('firebase/database');

const negocioId = 'el-arrecife';

const firebaseConfig = {
  apiKey: 'AIzaSyAIYR6jc2xSveQM_pbitQQMwLl64xeQleI',
  authDomain: 'minegocioaunclick-1539b.firebaseapp.com',
  databaseURL: 'https://minegocioaunclick-1539b-default-rtdb.firebaseio.com',
  projectId: 'minegocioaunclick-1539b',
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

console.log('====================================================');
console.log(`📡 MONITOR DE TELEMETRÍA Y SESIÓN RTDB - NEGOCIO: ${negocioId}`);
console.log('Escuchando eventos de conectividad y nodos migrados...');
console.log('====================================================\n');

// 1. Monitor de conexión socket RTDB
const connectedRef = ref(db, '.info/connected');
onValue(connectedRef, (snap) => {
  const isConnected = snap.val();
  const time = new Date().toLocaleTimeString();
  if (isConnected) {
    console.log(`[${time}] 🟢 CONEXIÓN SOCKET RTDB: Conectado y sincronizando.`);
  } else {
    console.warn(`[${time}] 🔴 CONEXIÓN SOCKET RTDB: Desconectado / Reconectando...`);
  }
});

// 2. Monitoreo reactivo de nodos clave migrados
const NODOS = ['mesas', 'inventario', 'impresion', 'dispositivos'];

NODOS.forEach((nodo) => {
  const nodeRef = ref(db, `marisquerias/${negocioId}/${nodo}`);
  let firstRun = true;

  onValue(
    nodeRef,
    (snap) => {
      const time = new Date().toLocaleTimeString();
      const val = snap.val();
      const count = val ? (typeof val === 'object' ? Object.keys(val).length : 1) : 0;

      if (firstRun) {
        console.log(`[${time}] 👁️  Nodo [${nodo}] inicializado: ${count} elementos existentes.`);
        firstRun = false;
      } else {
        console.log(
          `[${time}] ⚡ EVENTO EN TIEMPO REAL: Nodo [${nodo}] actualizado remotamente (${count} elementos).`
        );
      }
    },
    (error) => {
      console.error(`[ERROR LISTENER] Fallo en nodo [${nodo}]:`, error.message);
    }
  );
});
