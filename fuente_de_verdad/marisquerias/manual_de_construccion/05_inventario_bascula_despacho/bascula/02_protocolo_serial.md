# PROTOCOLO SERIAL DE BASCULA

- Alcance: Categoria: Marisquerias
- Fecha: 2026-10-09
- Subsistema: 05_inventario_bascula_despacho/bascula

## 1. CONTRATO DE LECTURA (FIRMAS REALES)

```typescript
type OpcionesLecturaPeso = {
  aplicarTara?: boolean;
  esperarEstabilidad?: boolean;
  timeout?: number;        // ms; default 5000
};

type ResultadoPeso = {
  exito: boolean;
  peso?: number;
  unidad: string;          // 'kg' por defecto
  mensaje?: string;
};

type ResultadoOperacion = {
  exito: boolean;
  mensaje: string;
};
```

## 2. PROTOCOLO DE TRAMAS ASCII

- **Comando de lectura**: `W\r` (comun en basculas NCI/CAS).
- **Comando de tara**: `T\r` o `Z\r` segun modelo.
- **Respuesta esperada**: trama ASCII `ST,GS,+  1.234kg`.
- **Decodificacion**: expresion regular `[-+]?\d*\.?\d+` sobre la trama; el primer match es el peso en kg.

## 3. FLUJO DE LECTURA EXACTO

1. Verificar `basculaActiva`; si es falso, retornar `{ exito: false, unidad: 'kg', mensaje: 'Bascula no conectada' }`.
2. `adaptadorBT.escribir(TextEncoder.encode('W\r'))`.
3. Espera 200 ms (estabilizacion mecanica).
4. `adaptadorBT.leer(timeout || 5000)`.
5. Parsear trama; si no hay match numerico, retornar `{ exito: false, unidad: 'kg', mensaje: 'Formato de peso invalido' }`.
6. Si hay match, retornar `{ exito: true, peso: parseFloat(match), unidad: 'kg' }`.

## 4. INVARIANTES

- Lectura sin bascula conectada nunca lanza excepcion; retorna `exito: false` con mensaje.
- La bandera de estabilidad (`esperarEstabilidad`) requiere lectura repetida hasta confirmacion antes de retornar peso.
- La tara (`aplicarTara`) debe aplicarse a la lectura antes de registrar el peso final.

## 5. MANEJO DE ERRORES

- Cualquier excepcion del adaptador Bluetooth se captura y se retorna `{ exito: false, unidad: 'kg', mensaje: e.message }`.
- Nunca propagar la excepcion al modulo de mostrador: el peso ausente bloquea el cobro con retroalimentacion explicita.
