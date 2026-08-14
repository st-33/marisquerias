### creado: 3 ene 2026 a las 22∶10∶21

# 📦 INVENTARIO DE COMPONENTES MODULARES

## Ecosistema ADI - Componentes Reutilizables

Este directorio contiene todos los componentes modulares y reutilizables del ecosistema. Cada componente está diseñado para ser independiente y poder usarse en diferentes tipos de negocios (restaurantes, tiendas, servicios, etc.).

---

## 🎨 UI Components (`/ui`)

### ✅ TableBadge

**Archivo:** `src/components/ui/TableBadge.tsx`

**Propósito:** Badge visual para mesas con indicadores de estado

**Props:**

- `count?: number` - Número de items en la mesa
- `hasReady?: boolean` - Hay items listos para entregar
- `hasPending?: boolean` - Hay items pendientes de enviar
- `variant?: 'compact' | 'full'` - Tamaño del badge

**Uso:**

```tsx
<TableBadge count={3} hasReady={true} hasPending={false} />
```

**Reutilizable en:**

- Mesera (parrilla de mesas)
- Admin (gestión de mesas)
- Dashboard (vista general)
- Reportes (análisis de ocupación)

---

### ✅ ModernAlert

**Archivo:** `src/components/ui/ModernAlert.tsx`

**Propósito:** Sistema de alertas modernas con animaciones y diseño elegante. Reemplaza `Alert.alert()` nativo.

**Tipos:** `success`, `warning`, `error`, `info`, `confirm`

**Props:**

- `visible: boolean` - Controla visibilidad
- `type?: AlertType` - Tipo de alerta
- `title: string` - Título principal
- `message?: string` - Mensaje descriptivo
- `confirmText?: string` - Texto botón confirmar
- `cancelText?: string` - Texto botón cancelar
- `onConfirm?: () => void` - Callback al confirmar
- `onCancel?: () => void` - Callback al cancelar

**Uso con Hook:**

```tsx
const { showAlert, AlertComponent } = useModernAlert();

// Mostrar alerta
showAlert({
  type: 'confirm',
  title: 'Confirmar pago',
  message: 'Total: $450.00',
  confirmText: 'Pagar',
  onConfirm: () => handlePay(),
});

// Renderizar
return (
  <View>
    {/* Tu UI */}
    {AlertComponent}
  </View>
);
```

**Reutilizable en:**

- Todas las pantallas del ecosistema
- Confirmaciones de acciones críticas
- Notificaciones de éxito/error
- Validaciones de formularios

---

### ✅ VariantDisplay

**Archivo:** `src/components/ui/VariantDisplay.tsx`

**Propósito:** Mostrar variantes de productos de forma clara y legible

**Props:**

- `variants?: VariantGroup` - Objeto con grupos de variantes
- `compact?: boolean` - Formato compacto (una línea) o expandido
- `showPrices?: boolean` - Mostrar deltas de precio (futuro)

**Formato Compacto:**

```
M | Camarón | +Cebolla +Cilantro
```

**Formato Expandido:**

```
🔹 Tamaño: Mediano
🔸 Tipo: Camarón
🔹 Extras: Cebolla, Cilantro
```

**Uso:**

```tsx
<VariantDisplay
  variants={{
    tamaño: ['mediano'],
    tipo: ['camarón'],
    extras: ['cebolla', 'cilantro'],
  }}
  compact={true}
/>
```

**Reutilizable en:**

- Mesera (comanda)
- Cocina (preparación)
- Admin (historial de ventas)
- Reportes (análisis de productos)
- Tickets impresos

---

### ✅ Toast

**Archivo:** `src/components/ui/Toast.tsx`

**Propósito:** Notificaciones no intrusivas con auto-dismiss para feedback rápido

**Props:**

- `visible: boolean` - Controla visibilidad
- `message: string` - Mensaje a mostrar
- `type?: ToastType` - Tipo: success, info, warning, error
- `duration?: number` - Duración en ms (default: 2000)
- `onDismiss?: () => void` - Callback al cerrar

**Uso con Hook:**

```tsx
const { showToast, ToastComponent } = useToast();

// Mostrar toast
showToast('✓ Producto agregado', 'success');

// Renderizar
return (
  <View>
    {ToastComponent}
    {/* Tu UI */}
  </View>
);
```

**Características:**

- ✅ Animación slide-in desde arriba
- ✅ Auto-dismiss configurable
- ✅ 4 tipos con colores e iconos
- ✅ No bloquea interacción
- ✅ Múltiples toasts en cola (futuro)

**Reutilizable en:**

- Feedback al agregar items
- Confirmación de acciones
- Notificaciones de sincronización
- Alertas no críticas

---

## 📊 History Components (`/history`) - PENDIENTE

### 🚧 MesaHistoryCard

**Archivo:** `src/components/history/MesaHistoryCard.tsx` (pendiente)

**Propósito:** Tarjeta individual de venta en historial

**Props:**

- `orderId: string`
- `total: number`
- `duration: number` - Duración en ms
- `status: string`
- `onTap: () => void`

---

### 🚧 MesaHistoryList

**Archivo:** `src/components/history/MesaHistoryList.tsx` (pendiente)

**Propósito:** Lista de ventas agrupadas por fecha

---

### 🚧 MesaHistoryCalendar

**Archivo:** `src/components/history/MesaHistoryCalendar.tsx` (pendiente)

**Propósito:** Selector de fechas para filtrar historial

---

### 🚧 Timer

**Archivo:** `src/components/history/Timer.tsx` (pendiente)

**Propósito:** Cronómetro reutilizable para mostrar tiempos

**Props:**

- `startTime: number` - Timestamp inicio
- `endTime?: number` - Timestamp fin (opcional, si está en curso)
- `format?: string` - Formato (mm:ss, hh:mm:ss)
- `color?: string` - Color del texto

**Uso:**

```tsx
<Timer startTime={order.createdAt} endTime={order.paidAt} format="mm:ss" color="#3b82f6" />
```

---

## 🎯 PRÓXIMOS COMPONENTES

### Toast Notifications

- Notificaciones no intrusivas
- Auto-dismiss configurable
- Posición personalizable

### BottomSheet

- Sheet modal desde abajo
- Drag to dismiss
- Múltiples tamaños

### SearchBar

- Búsqueda con debounce
- Filtros integrados
- Iconos contextuales

### LoadingSpinner

- Indicador de carga elegante
- Múltiples variantes
- Overlay opcional

---

## 📝 GUÍA DE USO

### Principios de Diseño:

1. **Modularidad extrema** - Cada componente es independiente
2. **Reutilización** - Diseñados para múltiples contextos
3. **TypeScript estricto** - Props bien tipadas
4. **Sin lógica de negocio** - Solo presentación
5. **Accesibilidad** - Diseño inclusivo

### Cómo agregar un nuevo componente:

1. Crear archivo en `/ui` o categoría apropiada
2. Documentar props con TypeScript
3. Agregar comentario de propósito al inicio
4. Incluir ejemplo de uso
5. Actualizar este README
6. Probar en al menos 2 contextos diferentes

---

## 🔄 ESTADO DE COMPONENTES

| Componente      | Estado       | Usado en       | Prioridad |
| --------------- | ------------ | -------------- | --------- |
| TableBadge      | ✅ Listo     | Mesera         | Alta      |
| ModernAlert     | ✅ Listo     | Todas          | Alta      |
| VariantDisplay  | ✅ Listo     | Mesera, Cocina | Alta      |
| Toast           | ✅ Listo     | Mesera         | Alta      |
| Timer           | 🚧 Pendiente | Admin          | Media     |
| MesaHistoryCard | 🚧 Pendiente | Admin          | Media     |
| BottomSheet     | 📋 Planeado  | Todas          | Baja      |

---

**Última actualización:** 2025-01-28
**Mantenido por:** Equipo ADI
