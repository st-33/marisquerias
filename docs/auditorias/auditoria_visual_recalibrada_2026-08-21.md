# Auditoría visual y UX recalibrada

**Fuente:** auditoría externa recibida en `pasted_content_19.txt` y `pasted_content_21.txt`.

**Contraste:** lectura del estado actual `rama-2`, commit `e6b6632`.

**Modalidad:** revisión estática; no sustituye pruebas de dispositivo.

## 1. Veredicto

La auditoría externa es útil como mapa de riesgos, pero no debe convertirse literalmente en una orden de reemplazar toda la capa visual ni de añadir bibliotecas de inmediato. Sus observaciones se separan en tres grupos: hallazgos confirmados, afirmaciones que el checkpoint ya contradice y propuestas que requieren un prototipo antes de decidir.

La lógica de negocio, los contratos de roles y la semántica de POS deben conservarse. La capa visual sí necesita una normalización gradual, especialmente en tema, feedback, no-op, overlays, formularios y primitives.

## 2. Hallazgos confirmados

| Hallazgo | Evidencia actual | Prioridad |
|---|---|---:|
| El objeto exportado `theme` está fijado a `defaultColors` | `ThemeContext.tsx` exporta `theme.colors = defaultColors`; `app/_layout.tsx` y varios componentes lo consumen | P0 |
| La preferencia de tema usa una clave global | `STORAGE_KEY = '@adi_theme_preference'` | P1 |
| `ThemeProvider` devuelve `null` mientras carga AsyncStorage | `ThemeContext.tsx` deja el árbol sin shell durante `loaded === false` | P1 |
| Existen acciones con `onPress: () => {}` | `useUniversalFab`, `PanelInventario` y `AdminDashboardScreen` conservan no-op activos | P0 |
| `PuestoMando` transforma `onSend` en no-op si `canSend` es falso | `PuestoMando.tsx` usa `const handleSend = canSend && !isSending ? onSend : () => {}` | P1 |
| `FabRadial` usa z-index fijo, geometría manual y no tiene dismiss externo explícito | `FabRadial.tsx` mantiene `zIndex: 9999`, radio trigonométrico y coordinación limitada | P1 |
| Hay pantallas grandes con responsabilidades mezcladas | `AdminMenuScreen` supera 1.000 líneas; `AdminDashboardScreen` y `PanelInventario` también son extensos | P2 |
| Hay mezcla de tokens y colores hardcodeados | Se observa en menú, variantes, paneles y componentes de administración | P1 |

## 3. Observaciones corregidas o no confirmadas

| Afirmación recibida | Recalibración |
|---|---|
| `app/_layout.tsx` carece de `useEffect` y `useState` | No confirmado en `e6b6632`; ambos imports existen en la primera línea |
| `app/(auth)/access.tsx` carece de hooks React | No confirmado; los imports existen y `check-types` pasa |
| `PuestoMando.tsx`, `ProductCard.tsx` o `CategorySidebar.tsx` tienen imports visibles rotos | Los imports críticos existen; TypeScript y exportación web pasan |
| Es necesario reemplazar aproximadamente 70 % de la capa visual | No es una medición; es una propuesta estética. Debe traducirse a incrementos medibles por componente |
| React Native Paper y `@gorhom/bottom-sheet` deben incorporarse ya | Son candidatos razonables, no decisiones. Primero debe probarse compatibilidad en una pantalla aislada |
| Tamagui, gluestack o NativeWind son la solución inmediata | No hay evidencia suficiente; introducirían otro sistema de estilos y un frente mayor |
| Moti debe añadirse para las animaciones | No es necesario todavía; Reanimated ya existe y debe centralizarse primero |

## 4. Decisiones que no deben mezclarse

El cambio del nombre técnico `fierros` a una identidad pública como **Dispositivos** es una decisión de nomenclatura y producto. No implica mover inmediatamente todos los archivos técnicos ni renombrar cada contrato interno. Primero se debe elegir el nombre técnico canónico, migrar consumidores, validar y retirar el nombre anterior por perímetro.

La visión de conectar luces, parrillas, música, sensores, agentes de IA, redes sociales, servicio a domicilio y aplicaciones hermanas es una línea de producto futura. Debe permanecer registrada en `docs/vision/ecosistema_marisquerias.md`, pero no debe entrar en la reparación actual del POS.

La falta de báscula física no invalida el trabajo, pero limita el tipo de evidencia posible. Se pueden ejecutar pruebas contractuales, simuladores, mocks deterministas y pruebas de desconexión; no se puede afirmar que el protocolo físico está validado hasta probarlo con hardware o un simulador fiel.

## 5. Orden visual recomendado

La primera intervención visual no debe ser rehacer RoleSelectorElite ni introducir un kit completo. El orden de menor riesgo es:

1. Unificar la lectura de tema en los consumidores de mayor impacto y eliminar el uso estático del objeto `theme` donde afecte el árbol raíz.
2. Corregir no-op visibles: ocultar acciones no disponibles o mostrar la precondición y el motivo.
3. Mejorar feedback de estados disabled, loading, error, vacío y reintento.
4. Crear una primitive compartida para botones, entradas, tabs y superficies sin cambiar todavía la semántica de POS.
5. Probar un overlay de una sola pantalla con `@gorhom/bottom-sheet` o una solución propia más controlada.
6. Solo después decidir si una biblioteca visual debe ampliarse a más pantallas.

## 6. Criterios para adoptar una biblioteca

Una biblioteca se adopta solo si resuelve un problema comprobado y pasa una prueba en Android, iOS y web según el alcance del componente. Debe conservarse el control sobre tokens, accesibilidad, estados, composición y estilos. La licencia, el tamaño del bundle, el mantenimiento y la compatibilidad con Expo 56 deben verificarse antes de incorporar dependencias.

## Referencias

[1]: https://github.com/st-33/marisquerias/commit/e6b6632 "Estado actual contrastado"

[2]: https://reactnativepaper.com/ "React Native Paper"

[3]: https://gorhom.dev/react-native-bottom-sheet/ "React Native Bottom Sheet"

[4]: https://docs.expo.dev/ "Documentación de Expo"
