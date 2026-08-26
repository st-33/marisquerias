# Evidencia web de reauditoría

| Campo | Valor |
|---|---|
| Fecha | 2026-08-26 UTC |
| Export | `dist` generado desde el commit compartido `76a8341` |
| Ruta pública comprobada | `/access` |
| Ruta protegida intentada | `/_role/mesero` |

## Hecho observado

El export web responde en `/access` y muestra una tarjeta centrada con el título `Mi Negocio a un Click`, el texto `Introduce tu código para ingresar al sistema.`, el campo de código con placeholder `PUERTO-24` y el botón `Entrar al Panel`. El fondo oscuro, la tarjeta, el campo y el botón se renderizan de forma legible.

Al abrir `/_role/mesero`, el guardia redirige a `/access` y vuelve a mostrar la pantalla de acceso. Esto confirma que la ruta protegida exige una sesión válida; no constituye un fallo visual de Mesero. No se introdujeron credenciales ni datos personales.

## Límite de evidencia

La exportación declara 17 rutas, incluidas `/_role/roles`, `/_role/mesero`, `/_role/cocina` y las rutas administrativas. La composición interna de esas rutas requiere una sesión autenticada para una prueba visual runtime. La verificación realizada aquí es, por tanto, real para el acceso y para el guardia de rutas, y estática/compilada para las pantallas protegidas.
