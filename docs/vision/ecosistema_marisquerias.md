# Visión del ecosistema Marisquerías

**Estado:** visión registrada, no alcance inmediato.

**Repositorio de referencia:** `st-33/marisquerias`, rama `rama-2`.

**Propósito:** conservar las ideas de evolución del producto sin mezclarlas con la reparación del núcleo actual.

## 1. Principio de separación

La aplicación actual debe convertirse primero en una operación estable de restaurante y punto de venta. Las ideas de automatización física, aplicaciones hermanas, agentes de IA, predicciones y conexiones externas son válidas como visión, pero no deben introducirse en el núcleo mientras no exista un contrato estable para tenant, roles, ventas, impresión, inventario, sincronización y permisos.

> Una idea puede ser estratégica sin ser una tarea inmediata.

Cada iniciativa se clasifica como **actual**, **siguiente**, **futura** o **no demostrada**. La clasificación puede cambiar cuando aparezca evidencia técnica, operativa o comercial.

## 2. Visión registrada desde el usuario

### 2.1. Módulo de dispositivos

La pantalla visible puede conservar el nombre **Dispositivos**. El nombre técnico `fierros` no debe aparecer como identidad pública del producto. El módulo debe evolucionar desde impresoras, básculas y escáneres hacia una capa de dispositivos físicos y electrónicos, con adaptadores por protocolo y fabricante.

La evolución deseada incluye impresoras térmicas, básculas, lectores, módems, bocinas, iluminación, sensores, parrillas motorizadas y otros dispositivos automatizables. La pantalla visual debe permanecer simple; la complejidad de adaptadores, contratos, descubrimiento, permisos, conexión, estados y recuperación debe vivir en `sistema`.

**Clasificación:** la dirección es futura válida; el primer paso actual es cerrar impresión y báscula sin romper lo que ya funciona.

### 2.2. Aplicaciones hermanas y servicio a domicilio

El núcleo de la aplicación debe poder exponer motores y contratos reutilizables para otra aplicación del mismo ecosistema React Native. El objetivo es que una aplicación externa pueda conectarse a capacidades de servicio a domicilio, pedidos, clientes, repartidores y operación sin copiar toda la lógica interna.

**Clasificación:** futura condicionada. Antes se necesita separar contratos públicos de implementación interna, definir autenticación entre aplicaciones, permisos, versionado, sincronización e idempotencia. No se debe crear todavía un conector externo informal.

### 2.3. Históricos, predicciones y análisis

El sistema debe compilar datos históricos de ventas, inventario, productos, horarios, mesas, demanda y operación para generar indicadores y predicciones útiles.

**Clasificación:** siguiente después de estabilizar datos. Requiere un modelo de eventos o hechos operativos, retención, calidad de datos, agregaciones, privacidad y criterios para no presentar predicciones como certezas.

### 2.4. Agentes de IA y canales de comunicación

Se contempla integrar agentes de IA para llamadas, chat, redes sociales, números del negocio, atención al cliente y automatización de tareas operativas. Estos agentes no deben acceder directamente a todo el sistema. Deben usar capacidades y contratos con permisos explícitos, trazabilidad, límites y aprobación humana cuando exista riesgo.

**Clasificación:** futura. Primero deben existir identidad de negocio, permisos por rol, registro de acciones, protección de datos y un catálogo de capacidades invocable.

### 2.5. Automatización física del establecimiento

La visión incluye automatizar luces, parrillas, sensores, música, bocinas y otros elementos físicos de un establecimiento. La música podría adaptarse al contexto del negocio, horario, fecha, afluencia y configuración del establecimiento.

**Clasificación:** futura experimental. Requiere un sistema de dispositivos separado del POS, seguridad física, permisos, protocolos, estados seguros, apagado de emergencia y pruebas con hardware real. No debe mezclarse con el flujo de venta hasta contar con una frontera segura.

## 3. Orden recomendado de evolución

| Horizonte | Enfoque | Criterio para avanzar |
|---|---|---|
| Actual | Ventas, mesas, cocina, inventario, impresión, báscula, sincronización y aislamiento multi-tenant | Flujos críticos reproducibles y errores recuperables |
| Siguiente | Contratos de dispositivos, datos históricos, servicio a domicilio y API interna de capacidades | Contratos versionados, permisos y pruebas de integración |
| Futuro | Aplicaciones hermanas, predicciones y agentes de IA | Datos confiables, identidad de negocio y observabilidad |
| Experimental | Automatización física, sensores, energía y música contextual | Hardware disponible, simulador, límites de seguridad y plan de recuperación |

## 4. Reglas para no convertir la visión en deuda

No se deben agregar carpetas vacías para capacidades futuras. No se deben crear interfaces falsas solo para afirmar que un dispositivo ya está soportado. No se deben guardar datos de clientes o redes sociales en el núcleo sin definir consentimiento, aislamiento y retención. No se debe permitir que un agente de IA ejecute acciones de negocio sin pasar por una capacidad autorizada y auditable.

Cuando una idea futura tenga suficiente evidencia para iniciar, debe entrar como proyecto separado o como módulo con contrato independiente. El núcleo actual debe continuar funcionando aunque ese módulo esté apagado.

## 5. Primeras piezas reutilizables que sí conviene preparar

La preparación inmediata no consiste en implementar IA ni automatización física. Consiste en mantener contratos neutrales para tenant, usuario, rol, dispositivo, impresión, venta, pedido, sincronización y evento operativo. Esos contratos pueden consumirse después desde la aplicación principal, una aplicación de reparto o un agente autorizado sin compartir componentes visuales ni acceder directamente al store interno.

## Referencias

[1]: https://github.com/st-33/marisquerias/tree/rama-2 "Rama de trabajo del repositorio"
