# Ensamblador de Instalación y Device Binding

Este módulo implementa la arquitectura formal para la instalación y vinculación inicial de dispositivos físicos ("Fierros") en el ecosistema **Mi Negocio a un Click**.

## 1. Visión y Reglas de Oro

1. **El Dispositivo es la Unidad Operativa**: No hay login tradicional de usuario. La aplicación se vincula a nivel de hardware/almacenamiento mediante un identificador de dispositivo único persistente (`deviceIdADI`).
2. **Access Code no es Login**: El código de acceso de instalación se ingresa una única vez para resolver la jerarquía multi-tenant (`tenantPath`) en la base de datos (RTDB).
3. **El Tenant no es un Usuario**: Representa la estructura organizativa (ej: `restaurantero/marisquerias/puerto-libres`) que posee sucursales, inventarios, y dispositivos autorizados.
4. **Persistencia del Dispositivo (`deviceIdADI`)**: No dependemos únicamente del ID de hardware del sistema operativo, el cual puede cambiar en actualizaciones o reinicios de fábrica. Creamos y guardamos un `deviceIdADI` persistente en `AsyncStorage`.
5. **Runtime Centralizado**: RTDB define dinámicamente si el dispositivo está activo, bloqueado, en mantenimiento o reemplazado.
6. **Bypass de Pantalla**: Tras la vinculación exitosa, la aplicación omite la pantalla de código de acceso y entra de forma directa al rol preasignado (o al selector de roles del dispositivo).

---

## 2. Flujo de Instalación

```text
[ Fábrica / Instalación USB ]
            │
            ▼
   Pantalla de Access Code (Si no hay dispositivo vinculado localmente)
            │
            ▼
    Ingresar Código
            │
  [ Ensamblador de Instalación ] ───▶ Resolver deviceIdADI (Local o nuevo)
            │
            ├───▶ Validar Access Code en RTDB (Obtiene tenantPath y tenantId)
            │
            ├───▶ Bootstrapping automático del Tenant (si es nuevo)
            │
            ├───▶ Resolver Características y Configuración del Dispositivo
            │
            ├───▶ Verificar Estado del Dispositivo (Activo / Bloqueado)
            │
            ├───▶ Registrar/Actualizar Auditoría en RTDB (dispositivos_autorizados)
            │
            └───▶ Persistir Localmente (AsyncStorage) y retornar resultado
            │
            ▼
   Ruteo Directo a Pantalla del Rol (Mesero, Cocina, Admin, etc.)
```

---

## 3. Estructura de Archivos

- `src/plataforma/instalacion/index.ts`: Punto de entrada y exportaciones públicas.
- `src/plataforma/instalacion/Zdocumentacion.md`: Este documento de arquitectura.
- `src/plataforma/instalacion/contratos/contrato-instalacion.ts`: Datos de entrada requeridos para la instalación.
- `src/plataforma/instalacion/contratos/resultado-instalacion.ts`: Tipo unión que representa el éxito o falla del ensamblaje.
- `src/plataforma/instalacion/contratos/dispositivo-vinculado.ts`: Contrato de datos del dispositivo persistido y activo.
- `src/plataforma/instalacion/vinculacion/generar-device-id-adi.ts`: Genera y recupera el `deviceIdADI` inmutable.
- `src/plataforma/instalacion/vinculacion/resolver-access-code.ts`: Valida y traduce el código de acceso en un path multi-tenant.
- `src/plataforma/instalacion/runtime/resolver-configuracion-inicial.ts`: Carga los roles permitidos, módulos y flags desde RTDB.
- `src/plataforma/instalacion/ensambladores/EnsambladorInstalacion.ts`: Orquestador principal del proceso de instalación.
- `src/plataforma/instalacion/pruebas/ensamblador-instalacion.test.ts`: Pruebas de integración simulando Firebase y almacenamiento local.

---

## 4. Protocolo de Campo

Este protocolo de campo establece las directrices operativas para administrar dispositivos ("Fierros") en escenarios reales de producción.

### 4.1. Instalación Inicial

1. El dispositivo se conecta mediante USB a la PC local de la fábrica o sucursal.
2. Se instala el APK por defecto "Mi Negocio a un Click".
3. Al arrancar por primera vez, el sistema detecta que no hay una firma local en `AsyncStorage`.
4. Muestra la pantalla inicial para ingresar el `accessCode`.
5. Tras el ingreso exitoso, se genera el `deviceIdADI`, se asocia al tenant (que debe existir previamente en RTDB), se efectúa el bootstrap local y se guarda la vinculación local.
6. A partir de ese momento, cada inicio de la app se salta la pantalla de instalación.

### 4.2. Reemplazo de Dispositivo (Hardware Fallido)

1. Si un dispositivo físico se daña o se pierde, el administrador da de alta un nuevo dispositivo en la RTDB del tenant.
2. Al darlo de alta, define la propiedad `reemplazaADeviceId` con el ID del dispositivo anterior.
3. El dispositivo dañado se marca automáticamente en RTDB como `reemplazado` y se define su propiedad `reemplazadoPorDeviceId` con el ID del nuevo hardware.
4. Cuando el dispositivo anterior intente sincronizar en su próximo inicio u operación, el ensamblador detectará el estado `reemplazado`, limpiará su almacenamiento local (`AsyncStorage`) y forzará el desvío a la pantalla inicial de revinculación/no operativo.

### 4.3. Bloqueo Remoto (Seguridad ante Robo o Impago)

1. En caso de robo del dispositivo o baja del local, el operador central en RTDB cambia el estado del dispositivo de `activo` a `bloqueado`.
2. El ensamblador local de instalación valida el estado contra RTDB periódicamente (o en el arranque).
3. Si el estado es `bloqueado`, el sistema limpia inmediatamente la firma en `AsyncStorage`, borrando el vínculo, y bloquea el acceso en la pantalla inicial, impidiendo cualquier operación fuera de línea.

### 4.4. Segundo Dispositivo al Mando (Redundancia Operativa)

1. Si el dispositivo de administración principal (Caja/Servidor) experimenta fallos críticos de hardware, la operación general no debe detenerse.
2. El sistema permite registrar un segundo dispositivo con `nivelOperativo: 'segundo_al_mando'`.
3. Este dispositivo secundario hereda privilegios de supervisión del negocio, pero no interfiere con el flujo principal del ledger hasta que se activa explícitamente en modo administrativo para autorizar cierres.

### 4.5. Pérdida o Pérdida de Conexión del Dispositivo (Modo Resiliente)

1. Si un dispositivo pierde la conectividad a internet, el sistema permite que continúe operando en modo offline gracias a la sincronización local persistente del estado del dispositivo en `AsyncStorage`.
2. La aplicación utiliza el último estado de `rolesPermitidos` y `nivelOperativo` persistido para autorizar transacciones locales.
3. Cuando vuelve la conexión, el dispositivo emite un pulso de vida (`ultimoHeartbeat`) y actualiza su estado.

### 4.6. Dispositivo Administrador Apagado

1. En locales multi-dispositivo sin internet permanente, si el dispositivo administrador principal se apaga, los terminales de mesero u operador pueden continuar operando de forma aislada.
2. Al no depender de un login de usuario central, las operaciones se registran localmente en el ledger de cada dispositivo y se sincronizan de manera eventual.

### 4.7. Revocación de Access Code

1. Un código de acceso puede ser revocado centralmente cambiando su `estado` a `'revocado'` en RTDB.
2. Cualquier intento de usar ese código en nuevas instalaciones fallará de inmediato.
3. Las instalaciones existentes que ya fueron vinculadas con ese código **no se ven afectadas**, ya que la app entra directamente por su ID de dispositivo autorizado y no vuelve a consultar el access code.

### 4.8. Diferencia entre deviceIdADI Local y Autoridad RTDB

- **`deviceIdADI` Local**: Es la firma física generada y almacenada localmente. Otorga identidad única al hardware frente al servidor.
- **Autoridad RTDB**: La base de datos central en la nube tiene la última palabra sobre los permisos, estado y vigencia de dicha identidad. Si la autoridad en RTDB bloquea, suspende o revoca el dispositivo, el almacenamiento local se invalida forzosamente.
