/**
 * Mock del WebSocket de Firebase RTDB para Playwright.
 *
 * Implementa el subconjunto del protocolo wire de @firebase/database v12 necesario
 * para que la pantalla de Inventario (M4) se suscriba y reciba el fixture:
 *   - Handshake servidor:  { t: 'h', d: { ts, h, s } }
 *   - Listener (onValue):  cliente { r, a:'q', b:{p,h} } -> servidor { r, b:{p,d} }
 *   - get (REST/query):    cliente { r, a:'g', b:{p,q} } -> servidor { r, b:{p,d} }
 *
 * NO toca código de producción; solo provee datos en runtime de test.
 */
import type { Page } from '@playwright/test';
import {
  AREAS,
  CARACTERISTICAS_ADMIN,
  CATALOGO,
  DEVICE_ID_ADI,
  RUTA_NEGOCIO,
  SECCIONES,
  SESION_PERSISTIDA,
  VINCULO_DISPOSITIVO,
} from '../fixtures/inventario.fixture';

type AnyObj = Record<string, any>;

/** Arma el árbol RTDB completo bajo la ruta de negocio. */
function buildRtdbTree(): AnyObj {
  return {
    [RUTA_NEGOCIO]: {
      caracteristicas: CARACTERISTICAS_ADMIN,
      dispositivos: {
        [DEVICE_ID_ADI]: {
          deviceId: DEVICE_ID_ADI,
          brand: 'Web',
          model: 'Playwright',
          systemVersion: 'Web',
          systemName: 'Web',
          estado: 'activo',
          nivelOperativo: 'operador',
          puedeCambiarRol: true,
        },
      },
      inventario: {
        catalog: CATALOGO,
        sections: SECCIONES,
        areas: AREAS,
        movements: {},
        missing_area_assignments: {},
      },
    },
  };
}

/** Navega el árbol `[ruta]/inventario/...` extrayendo el nodo solicitado por path. */
function resolvePath(tree: AnyObj, path: string): { found: boolean; data: any } {
  // El SDK envía paths con '/' inicial.
  const parts = path.split('/').filter(Boolean);
  let node: any = tree;
  for (const part of parts) {
    if (node == null || typeof node !== 'object') return { found: false, data: null };
    if (!(part in node)) return { found: false, data: null };
    node = node[part];
  }
  return { found: true, data: node };
}

/**
 * Instala el mock de RTDB vía WebSocket y siembra sesión + dispositivo + features
 * en sessionStorage. Debe llamarse en cada test ANTES de cargar la página.
 */
export async function sembrarSesionYMockRtdb(page: Page, tree: AnyObj = buildRtdbTree()) {
  // 1) Plantar sesión, vínculo de dispositivo y features en sessionStorage / localStorage.
  //    La app usa sessionStorage en web (sesion slice) y AsyncStorage web -> localStorage.
  await page.addInitScript(
    ({ sesion, vinculo }) => {
      try {
        (window as any).sessionStorage.setItem('@system:session:active', JSON.stringify(sesion));
        (window as any).localStorage.setItem('@system:session:active', JSON.stringify(sesion));
        (window as any).sessionStorage.setItem(
          'adi_dispositivo_vinculado',
          JSON.stringify(vinculo)
        );
        (window as any).localStorage.setItem('adi_dispositivo_vinculado', JSON.stringify(vinculo));
        (window as any).localStorage.setItem('device_registered', 'true');
      } catch (e) {
        console.error('[e2e] seed error', e);
      }
    },
    { sesion: SESION_PERSISTIDA, vinculo: VINCULO_DISPOSITIVO }
  );

  // 2) Mock WebSocket RTDB
  await page.routeWebSocket(/\.ws/, (ws) => {
    // Devolver handshake al abrir
    ws.onMessage((message) => {
      let msg: AnyObj;
      try {
        msg = JSON.parse(message as string);
      } catch {
        return; // frame no-JSON (p.ej. texto plano), ignorar
      }

      // Handshake entrante no existe; el servidor envía 'h' primero.
      // Responder a los requests del cliente.
      const reqNum = msg['r'];
      const action = msg['a'];
      const body = msg['b'] || {};

      if (action === 'q' || action === 'l') {
        // Listen/query: devolver el dato del path solicitado.
        const path = body['p'] || '';
        const { data } = resolvePath(tree, path);
        const reply = {
          r: reqNum,
          b: { p: path, d: data ?? null },
        };
        ws.send(JSON.stringify(reply));
      } else if (action === 'g') {
        const path = body['p'] || '';
        const { data } = resolvePath(tree, path);
        ws.send(JSON.stringify({ r: reqNum, b: { p: path, d: data ?? null } }));
      } else if (action === 'put' || action === 'merge' || action === 'o' || action === 'om') {
        // Escrituras: ACK genérico (no mutamos el árbol para no interferir con el fixture).
        ws.send(JSON.stringify({ r: reqNum, b: { s: 'ok', d: 'ok' } }));
      } else if (action === 'auth' || action === 'gauth' || action === 'unauth') {
        // Auth del SDK (token): ACK.
        ws.send(JSON.stringify({ r: reqNum, b: { s: 'ok', d: null } }));
      } else {
        // Por defecto ACK vacío.
        ws.send(JSON.stringify({ r: reqNum, b: { p: body['p'] || '', d: null } }));
      }
    });

    // Handshake inicial: el SDK espera 'h' con session/ts antes de enviar requests.
    ws.send(JSON.stringify({ t: 'h', d: { ts: Date.now(), h: 'e2e-mock-marisquerias', s: 'e2e-session' } }));
  });
}
