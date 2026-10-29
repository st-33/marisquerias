# PLAN DE IMPLEMENTACIÓN 04: ROL ADMINISTRADOR Y GUARDIA DE RUTAS (MARISQUERÍAS)

**Módulo**: Aplicación de Categoría (Marisquerías)  
**Ámbito**: Gestión de Roles, Guardias de Navegación y Permisos Administrativos  
**Estado**: Listo para Ejecución  

---

## 1. Contexto y Objetivos
Durante las pruebas de usuario en la aplicación comercial de Marisquerías (`http://localhost:8081`), al presionar el botón "Administrador" en la pantalla de selección de roles, la interfaz no realizaba la transición o rebotaba instantáneamente a la misma pantalla sin ingresar al panel administrativo.

El objetivo de este plan es eliminar el acoplamiento indebido que bloquea la entrada al rol de Administrador, ajustar la guardia de navegación en Expo Router y asegurar que el panel principal de administración siempre sea accesible cuando el rol esté autorizado.

---

## 2. Diagnóstico y Causa Raíz

### 2.1 Causa Raíz en la Definición de Features Administrativas
- **Archivo**: `src/roles/logica/admin/useFuncionalidadesAdmin.ts`
  - Líneas 163-174:
    ```typescript
    admin_dashboard: {
      key: 'admin_dashboard',
      label: 'Dashboard Administrativo',
      description: 'Panel de control principal del administrador',
      icon: 'view-dashboard',
      route: '/_role/admin/dashboard',
      isAvailable: true,
      requiresApproval: false,
      isEnabled: hasMetricasYCierres, // <── ¡AQUÍ ESTÁ LA FALLA!
    },
    ```
  - La propiedad `hasMetricasYCierres` evalúa `capacidades.includes('metricas_y_cierres')`.
  - Si el negocio derivado fue dado de alta sin la capacidad específica de `metricas_y_cierres` (o con capacidades esenciales de comandas y mesas únicamente), `hasMetricasYCierres` evalúa a `false`, marcando `admin_dashboard.isEnabled = false`.

### 2.2 Bloqueo Inmediato en la Guardia de Rutas
- **Archivo**: `app/_layout.tsx`
  - Línea 57:
    ```typescript
    const ROUTE_FEATURES: Record<string, { admin?: (keyof FeaturesAdmin)[]; mesero?: (keyof FeaturesMesero)[] }> = {
      '/_role/admin/dashboard': { admin: ['admin_dashboard'] },
    ```
  - Líneas 113-125:
    ```typescript
    if (routeConfig.admin) {
      const hasAccess = routeConfig.admin.some((feature) => adminFeatures[feature]?.isEnabled);
      if (!hasAccess) {
        console.warn(`[RouteGuard] Feature no habilitada para admin: ${routeConfig.admin.join(', ')}`);
        router.replace('/_role/roles');
        return;
      }
    }
    ```
  - Al pulsar "Administrador", el router navega a `/_role/admin/dashboard`. La guardia evalúa `adminFeatures['admin_dashboard']?.isEnabled` (`false`), emite el warning en consola y ejecuta inmediatamente `router.replace('/_role/roles')` en menos de 1 milisegundo. Esto provoca la apariencia visual de que el botón "no hace nada".

---

## 3. Reglas Arquitectónicas Innegociables
1. **Acceso Fundamental al Dashboard Administrativo**: El panel base de administración (`admin_dashboard`) es la cabina de control del establecimiento; no debe estar condicionado a una capacidad operativa secundaria o avanzada como `metricas_y_cierres`.
2. **Degradación Elegante por Capacidades**: Si una capacidad administrativa específica está desactivada (ej. `metricas_y_cierres`, `gestion_usuarios`, `inventario_avanzado`), dicha sección o tarjeta dentro del dashboard debe mostrarse deshabilitada o con un mensaje explicativo, pero jamás bloquear el acceso al dashboard completo.
3. **Guardias Basadas en Rol Activo y Capacidades Reales**: La guardia debe permitir la navegación a la vista raíz del rol si el rol está habilitado para el negocio, validando capacidades únicamente en subrutas especializadas.

---

## 4. Archivos Afectados
1. `src/roles/logica/admin/useFuncionalidadesAdmin.ts`
2. `app/_layout.tsx`
3. `app/_role/admin/dashboard.tsx`

---

## 5. Procedimiento Paso a Paso

### Paso 1: Desacoplar `admin_dashboard` en `useFuncionalidadesAdmin.ts`
En `src/roles/logica/admin/useFuncionalidadesAdmin.ts`:
1. Modificar la definición de `admin_dashboard`:
   ```typescript
   admin_dashboard: {
     key: 'admin_dashboard',
     label: 'Dashboard Administrativo',
     description: 'Panel de control principal del administrador',
     icon: 'view-dashboard',
     route: '/_role/admin/dashboard',
     isAvailable: true,
     requiresApproval: false,
     isEnabled: true, // Siempre habilitado si el rol de administrador está activo
   },
   ```
2. Mantener `hasMetricasYCierres` estrictamente para las funcionalidades que lo requieren genuinamente (ej. `cierre_caja`, `reportes_ventas`, `metricas_rendimiento`).

### Paso 2: Fortalecer la Guardia en `app/_layout.tsx`
En `app/_layout.tsx`:
1. Asegurar que la guardia distinga entre la ruta principal del rol y rutas especializadas:
   ```typescript
   if (pathname === '/_role/admin/dashboard') {
     // Si el rol es admin y la sesión está activa, permitir ingreso
     if (rolActivo === 'admin') return;
   }
   ```
2. Registrar logs claros de navegación en modo depuración cuando una subruta sea denegada.

### Paso 3: Renderizado Condicional en `dashboard.tsx`
En `app/_role/admin/dashboard.tsx`:
1. Comprobar que los widgets o módulos que dependen de `metricas_y_cierres` muestren un estado inactivo o bloqueado cuando la capacidad no esté firmada, permitiendo al administrador operar las demás funciones activas.

---

## 6. Criterios de Verificación y Pruebas
1. **Prueba de Ingreso con Capacidades Mínimas**:
   - Crear un negocio con únicamente capacidades básicas (ej. `control_mesas` y `comanda_cocina`, sin `metricas_y_cierres`).
   - Iniciar sesión en Marisquerías con su código de acceso.
   - En el selector de roles, presionar "Administrador".
   - **Resultado esperado**: La pantalla transiciona correctamente a `/_role/admin/dashboard` sin rebote a la pantalla de roles.
2. **Prueba de Widgets Administrativos**:
   - Confirmar que los módulos autorizados funcionen y que las métricas avanzadas muestren su indicación de capacidad no contratada/no activa.
