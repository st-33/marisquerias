# Puente de Resolución ADI — Documentación

El Puente es la capa **stateless** que convierte un `access_code` en una sesión operativa completa.
No almacena datos de negocio. Resuelve en tiempo real durante el login.

## Responsabilidad

```
access_code → tenantPath → plantilla (Negocio Base) → roles → flags → device → rutas → bootstrap → suscripciones
```

## Implementación actual (dispersa — intencional por ahora)

El Puente no existe como módulo único. Sus responsabilidades están distribuidas:

| Paso                       | Responsabilidad                                        | Archivo actual                                                   |
| -------------------------- | ------------------------------------------------------ | ---------------------------------------------------------------- |
| 1. Descubrimiento          | Leer `access_codes/{código}` → `tenantPath`            | `src/nichos/gastronomia/restaurante/roles/auth/hooks/useAuth.ts` |
| 2. Validación              | Verificar que el tenant existe y está activo           | `useAuth.ts`                                                     |
| 3. Resolución de plantilla | Cargar Negocio Base desde código según tipo de negocio | `src/plataforma/negocios/useRolePacker.ts`                       |
| 4. Aplicación de config    | Leer `{tenantPath}/caracteristicas` (feature flags)    | `useAuth.ts` + `useRolePacker.ts`                                |
| 5. Normalización           | Convertir flags anidados a mapa plano                  | `src/plataforma/core/utils/features.ts`                          |
| 6. Resolución de roles     | Determinar qué roles/rutas están disponibles           | `useRolePacker.ts`                                               |
| 7. Contexto de dispositivo | Registrar dispositivo en RTDB                          | `src/plataforma/core/security/deviceBinding.ts`                  |
| 8. Bootstrap               | Crear estructura mínima del tenant si no existe        | `src/plataforma/core/bootstrap/ensureTenant.ts`                  |

## Principios

- **Stateless**: no guarda estado propio. El estado resultante vive en Zustand (`ContratoSesion`, `ContratoNegocio`).
- **Single entry point lógico**: `useAuth.ts` es el orquestador. Los demás son servicios.
- **Sin dependencia de tenant en código**: el Puente lee de RTDB, no de carpetas de tenant.

## Cuándo formalizar como módulo explícito

Formalizar `plataforma/puente/` solo si:

- La lógica de resolución crece significativamente.
- Se agregan múltiples tipos de negocio con resolución diferente.
- Se requiere testear el flujo de resolución de forma aislada.

**Hoy no aplica.** El flujo funciona y está documentado aquí.

## Feature flags conocidos

```
caracteristicas.roles.mesero     → habilita rol mesero
caracteristicas.roles.cocina     → habilita rol cocina
caracteristicas.roles.admin      → habilita rol admin (con sub-flags)
caracteristicas.module_venta_crudo → habilita POS/mostrador
caracteristicas.delivery         → habilita flujo delivery
caracteristicas.inventory_auto_discount
caracteristicas.menu_editor_venta_crudo
caracteristicas.fastbutton_venta_crudo
```
