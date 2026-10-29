# Propuesta de Aprendizaje: Directrices Arquitectónicas de Aplicación de Categoría

**Origen**: Ejecución de Planes 04, 05 y 06 + Auditorías en Pipeline (Marisquerías / Ecosistema).  
**Tipo**: Regla de Proyecto (`rule`) o Skill Especializado (`skill`).  
**Ámbito**: Aplicaciones Operativas de Categoría (`/Escritorio/marisquerias`, `/Escritorio/taquerias`, etc.).

---

## 1. Identificación del Aprendizaje y Causa Raíz

Durante la orquestación e implementación de los frentes de **Aislamiento Web**, **Resiliencia Offline** y **Guardias de Rol**, se aislaron cuatro principios clave:

1. **Aislamiento Multi-Inquilino Web (`sessionStorage` en Metro)**:
   - *Problema*: `@react-native-async-storage/async-storage` en Web delega en `window.localStorage`. Al abrir múltiples pestañas con distintos negocios en el mismo origen (`localhost:8081`), las sesiones se sobreescriben y los `deviceIdADI` colisionan.
   - *Solución*: Redirección transparente en `metro.config.js` (`resolveRequest` para platform `'web'`) hacia un adaptador respaldado en `window.sessionStorage`, aislando estrictamente cada pestaña sin tocar el backend SQLite de Android/iOS.
2. **Soporte Canónico de Raíz Operativa Dedicada (`rutaNegocio = ''` o `'/'`)**:
   - *Problema*: Los negocios con base de datos RTDB exclusiva operan directamente en la raíz. Validadores como `validar_ruta_negocio` y comprobaciones `if (!rutaNegocio)` trataban la cadena vacía como inválida, provocando errores en cascada (`[ERROR] [OFFLINE_SYNC...]`).
   - *Solución*: Soporte explícito de `{ permitirRaiz: true }` en validadores y comprobación estricta `rutaNegocio !== null` para preservar rutas vacías legítimas.
3. **Desacoplamiento Fundamental de Cabina de Mando (Dashboard)**:
   - *Problema*: `admin_dashboard` estaba condicionado a la capacidad secundaria `metricas_y_cierres`. Si un negocio no contrataba métricas analíticas, el botón Administrador rebotaba sin entrar al panel.
   - *Solución*: El acceso al dashboard base depende exclusivamente de tener el rol habilitado (`adminRoleEnabled`). Las capacidades analíticas degradan elegantemente dentro de la pantalla sin bloquear el panel.
4. **Resiliencia ante Estado Inicial Vacío**:
   - *Problema*: Al montar cuadrículas operativas (como mesas), el spinner `loading` esperaba `tables.length > 0`, congelando la interfaz indefinidamente ante 0 mesas.
   - *Solución*: Desbloqueo mediante el timestamp de actualización del store (`ultimaActualizacion > 0`) y temporizador fallback de seguridad (2.5s) para habilitar pedidos para llevar (*takeaway*).

---

## 2. Clasificación: Rule vs. Skill

- **Clasificación seleccionada**: **Rule de Workspace** (`.gemini/rules/categoria_app.md` o anexo en `AGENTS.md`).
- **Justificación**: Son restricciones e invariantes universales de arquitectura, no herramientas o cadenas de comandos CLI.

---

## 3. Texto Propuesto para la Regla

```markdown
# Reglas Arquitectónicas para Aplicaciones de Categoría

1. **Aislamiento Multi-Inquilino en Web**:
   - En compilaciones Web (`Platform.OS === 'web'`), el almacenamiento local debe aislarse estrictamente por pestaña/ventana utilizando `sessionStorage`.
   - `metro.config.js` debe resolver `@react-native-async-storage/async-storage` a `src/sistema/almacenamiento/asyncStorageWeb.ts` cuando `platform === 'web'`.
   - `obtenerDeviceIdResiliente()` debe priorizar `sessionStorage` para evitar colisiones de presencia entre pestañas.

2. **Raíz Operativa Dedicada**:
   - En negocios con RTDB propia exclusiva, `rutaNegocio` es legítimamente `''` o `'/'`.
   - Todo servicio, repositorio o sincronizador debe invocar `validar_ruta_negocio(rutaNegocio, { permitirRaiz: true })`.
   - Nunca evaluar la validez de `rutaNegocio` con truthiness booleana (`!rutaNegocio`); verificar siempre `rutaNegocio === null || rutaNegocio === undefined`.

3. **Desacoplamiento de Paneles de Control**:
   - El acceso al dashboard administrativo (`admin_dashboard`) es gobernado exclusivamente por el rol de Administrador.
   - Jamás bloquear el ingreso al panel administrativo por la ausencia de capacidades secundarias (ej. `metricas_y_cierres`). Dichas capacidades deben mostrar tarjetas informativas o estados desactivados dentro del dashboard.

4. **Tolerancia a Estado Cero (Zero-Record Resilience)**:
   - Toda interfaz o hook de datos operativos (mesas, comandas, productos) debe admitir bases de datos recién creadas (0 registros) sin quedar atrapada en spinners perpetuos.
   - Desconectar `loading` ante la confirmación del primer snapshot de RTDB (`ultimaActualizacion > 0`) y añadir fallback timer de 2.5s.
```
