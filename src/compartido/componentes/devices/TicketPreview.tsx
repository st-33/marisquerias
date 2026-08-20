import React, { useEffect, useMemo, useState } from 'react';
import { PanResponder, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { TicketTemplate, TicketTemplateElemento } from '../../../sistema/persistencia';

const TICKET_WIDTH = 280;
const TICKET_HEIGHT = 500;

const SAMPLE_ORDER = {
  tenantName: 'Mi Restaurante',
  fecha: new Date(),
  mesa: 'Mesa 12',
  items: [
    { cantidad: 2, nombre: 'Taco al Pastor', precio: 35.5 },
    { cantidad: 1, nombre: 'Agua de Jamaica', precio: 18.0 },
    { cantidad: 3, nombre: 'Quesadilla', precio: 25.0 },
  ],
};

// Producto: sin decimales
const formatCurrencyProduct = (value: number) => `$${Math.round(value)}`;
// TOTAL: con .00
const formatCurrencyTotal = (value: number) => `$${value.toFixed(2)}`;

const formatDate = (date: Date) => {
  const days = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  const months = [
    'enero',
    'febrero',
    'marzo',
    'abril',
    'mayo',
    'junio',
    'julio',
    'agosto',
    'septiembre',
    'octubre',
    'noviembre',
    'diciembre',
  ];

  const dayName = days[date.getDay()];
  const day = date.getDate();
  const monthName = months[date.getMonth()];
  const year = date.getFullYear();
  const hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'pm' : 'am';
  const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;

  return `${dayName} ${day} de ${monthName} ${year} ${displayHours
    .toString()
    .padStart(2, '0')}:${minutes} ${ampm}`;
};

const capitalizeFirst = (text: string) => {
  if (!text) return text;
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
};

type Props = {
  template: TicketTemplate | null;
  tenantName?: string;
  selectedId?: string | null;
  onSelect?: (elementId: string | null) => void;
  onChange?: (elementId: string, cambios: Partial<TicketTemplateElemento>) => void;
  onEditContenido?: (elementId: string, contenido: string) => void;
  disabled?: boolean;
};

type SampleItem = {
  cantidad: number;
  nombre: string;
  precio: number;
};

type SampleData = {
  tenantName: string;
  fecha: Date;
  mesa: string;
  items: SampleItem[];
  total: number;
};

const clamp = (value: number, min: number, max: number) => {
  if (Number.isNaN(value)) return min;
  return Math.min(Math.max(value, min), max);
};

export function TicketPreview({
  template,
  tenantName,
  selectedId,
  onSelect,
  onChange,
  onEditContenido,
  disabled = false,
}: Props) {
  const interactive = Boolean(onSelect || onChange || onEditContenido);

  const sample = useMemo<SampleData | null>(() => {
    if (!template) return null;
    const total = SAMPLE_ORDER.items.reduce((acc, item) => acc + item.precio * item.cantidad, 0);
    return {
      ...SAMPLE_ORDER,
      tenantName: tenantName || SAMPLE_ORDER.tenantName,
      total,
    };
  }, [template, tenantName]);

  if (!template || !sample) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Selecciona una plantilla para previsualizar.</Text>
      </View>
    );
  }

  const renderElementoEstatico = (elemento: TicketTemplateElemento) => {
    const x = elemento.posicion.x * TICKET_WIDTH;
    const y = elemento.posicion.y * TICKET_HEIGHT;
    const width = elemento.tamano.width * TICKET_WIDTH;
    const height = elemento.tamano.height * TICKET_HEIGHT;

    const baseStyle = {
      position: 'absolute' as const,
      left: x,
      top: y,
      width,
      minHeight: height,
      justifyContent: 'center' as const,
    };

    const textStyle = {
      textAlign: elemento.estilo?.alineacion ?? 'left',
      fontSize: elemento.estilo?.fontSize ?? 12,
      fontWeight: elemento.estilo?.bold ? '700' : '400',
      color: '#111827',
    } as const;

    switch (elemento.tipo) {
      case 'texto': {
        let contenido = elemento.contenido || '';
        if (contenido.includes('{{tenantName}}')) {
          contenido = contenido.replace('{{tenantName}}', capitalizeFirst(sample.tenantName));
        }
        if (contenido.includes('{{mesa}}')) {
          contenido = contenido.replace('{{mesa}}', sample.mesa);
        }
        return (
          <View key={elemento.id} style={baseStyle}>
            <Text style={textStyle}>{contenido}</Text>
          </View>
        );
      }
      case 'fechaHora': {
        const formatted = formatDate(sample.fecha);
        return (
          <View key={elemento.id} style={baseStyle}>
            <Text style={textStyle}>{formatted}</Text>
          </View>
        );
      }
      case 'listaProductos': {
        return (
          <View key={elemento.id} style={[baseStyle, { alignItems: 'stretch' }]}>
            {sample.items.map((item, index) => (
              <View key={`${elemento.id}-${index}`} style={styles.itemRow}>
                <Text style={[textStyle, styles.itemName]} numberOfLines={1}>
                  {item.cantidad > 1 ? `${item.cantidad}x ` : ''}
                  {item.nombre}
                </Text>
                <Text style={[textStyle, styles.itemPrice]}>
                  {formatCurrencyProduct(item.precio * item.cantidad)}
                </Text>
              </View>
            ))}
          </View>
        );
      }
      case 'total': {
        return (
          <View key={elemento.id} style={[baseStyle, styles.totalRow]}>
            <Text style={[textStyle, { flex: 1 }]}>TOTAL</Text>
            <Text style={[textStyle, styles.totalValue]}>{formatCurrencyTotal(sample.total)}</Text>
          </View>
        );
      }
      default:
        return null;
    }
  };

  if (!interactive) {
    return (
      <View style={styles.wrapper}>
        <View style={styles.ticket}>{template.elementos.map(renderElementoEstatico)}</View>
      </View>
    );
  }

  const handleBackgroundPress = () => {
    if (disabled) return;
    onSelect?.(null);
  };

  return (
    <View style={styles.wrapper}>
      <Pressable onPress={handleBackgroundPress} style={styles.ticket}>
        {template.elementos.map((elemento) => (
          <EditableTicketElement
            key={elemento.id}
            elemento={elemento}
            sample={sample}
            ticketWidth={TICKET_WIDTH}
            ticketHeight={TICKET_HEIGHT}
            selected={selectedId === elemento.id}
            onSelect={onSelect}
            onChange={onChange}
            onEditContenido={onEditContenido}
            disabled={disabled}
          />
        ))}
      </Pressable>
    </View>
  );
}

type EditableTicketElementProps = {
  elemento: TicketTemplateElemento;
  sample: SampleData;
  ticketWidth: number;
  ticketHeight: number;
  selected: boolean;
  onSelect?: (elementId: string | null) => void;
  onChange?: (elementId: string, cambios: Partial<TicketTemplateElemento>) => void;
  onEditContenido?: (elementId: string, contenido: string) => void;
  disabled: boolean;
};

const MIN_WIDTH = 0.1;
const MIN_HEIGHT = 0.05;

const EditableTicketElement: React.FC<EditableTicketElementProps> = ({
  elemento,
  sample,
  ticketWidth,
  ticketHeight,
  selected,
  onSelect,
  onChange,
  onEditContenido,
  disabled,
}) => {
  const baseLeft = elemento.posicion.x * ticketWidth;
  const baseTop = elemento.posicion.y * ticketHeight;
  const baseWidth = elemento.tamano.width * ticketWidth;
  const baseHeight = elemento.tamano.height * ticketHeight;

  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [sizeOffset, setSizeOffset] = useState({ x: 0, y: 0 });
  const [isEditingText, setIsEditingText] = useState(false);
  const [contenido, setContenido] = useState(elemento.contenido || '');

  const [prevContenido, setPrevContenido] = useState(elemento.contenido);
  const [prevId, setPrevId] = useState(elemento.id);

  if (elemento.contenido !== prevContenido || elemento.id !== prevId) {
    setPrevContenido(elemento.contenido);
    setPrevId(elemento.id);
    setContenido(elemento.contenido || '');
  }

  const currentLeft = baseLeft + dragOffset.x;
  const currentTop = baseTop + dragOffset.y;
  const currentWidth = Math.max(30, baseWidth + sizeOffset.x);
  const currentHeight = Math.max(18, baseHeight + sizeOffset.y);

  const baseStyle = {
    position: 'absolute' as const,
    left: currentLeft,
    top: currentTop,
    width: currentWidth,
    minHeight: currentHeight,
    justifyContent: 'center' as const,
    borderWidth: selected ? 1 : 0,
    borderColor: selected ? '#3b82f6' : 'transparent',
    borderStyle: 'dashed' as const,
    borderRadius: 6,
    padding: 4,
  };

  const textStyle = {
    textAlign: elemento.estilo?.alineacion ?? 'left',
    fontSize: elemento.estilo?.fontSize ?? 12,
    fontWeight: elemento.estilo?.bold ? '700' : '400',
    color: '#111827',
  } as const;

  const moveResponder = useMemo(() => {
    if (disabled) return null;
    return PanResponder.create({
      onStartShouldSetPanResponder: () => !elemento.bloqueado,
      onPanResponderGrant: () => {
        onSelect?.(elemento.id);
        if (elemento.bloqueado) return;
        setDragOffset({ x: 0, y: 0 });
      },
      onPanResponderMove: (_, gesture) => {
        if (elemento.bloqueado) return;
        setDragOffset({ x: gesture.dx, y: gesture.dy });
      },
      onPanResponderRelease: (_, gesture) => {
        if (elemento.bloqueado) return;
        setDragOffset({ x: 0, y: 0 });
        const finalX = clamp((baseLeft + gesture.dx) / ticketWidth, 0, 1);
        const finalY = clamp((baseTop + gesture.dy) / ticketHeight, 0, 1);
        onChange?.(elemento.id, {
          posicion: {
            x: finalX,
            y: finalY,
          },
        });
      },
      onPanResponderTerminate: () => {
        setDragOffset({ x: 0, y: 0 });
      },
    });
  }, [
    disabled,
    elemento.bloqueado,
    elemento.id,
    baseLeft,
    baseTop,
    ticketWidth,
    ticketHeight,
    onChange,
    onSelect,
  ]);

  const resizeResponder = useMemo(() => {
    if (disabled || elemento.bloqueado) return null;
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        onSelect?.(elemento.id);
        setSizeOffset({ x: 0, y: 0 });
      },
      onPanResponderMove: (_, gesture) => {
        setSizeOffset({ x: gesture.dx, y: gesture.dy });
      },
      onPanResponderRelease: (_, gesture) => {
        setSizeOffset({ x: 0, y: 0 });
        const finalWidth = clamp((baseWidth + gesture.dx) / ticketWidth, MIN_WIDTH, 1.5);
        const finalHeight = clamp((baseHeight + gesture.dy) / ticketHeight, MIN_HEIGHT, 1.5);
        onChange?.(elemento.id, {
          tamano: {
            width: finalWidth,
            height: finalHeight,
          },
        });
      },
      onPanResponderTerminate: () => {
        setSizeOffset({ x: 0, y: 0 });
      },
    });
  }, [
    disabled,
    elemento.bloqueado,
    elemento.id,
    baseWidth,
    baseHeight,
    ticketWidth,
    ticketHeight,
    onChange,
    onSelect,
  ]);

  let resolvedTexto = contenido || '';
  if (resolvedTexto.includes('{{tenantName}}')) {
    resolvedTexto = resolvedTexto.replace('{{tenantName}}', capitalizeFirst(sample.tenantName));
  }
  if (resolvedTexto.includes('{{mesa}}')) {
    resolvedTexto = resolvedTexto.replace('{{mesa}}', sample.mesa);
  }

  let body: React.ReactNode = null;

  switch (elemento.tipo) {
    case 'texto':
      body = isEditingText ? (
        <TextInput
          style={[textStyle, styles.inlineInput]}
          value={contenido}
          onChangeText={(value) => {
            setContenido(value);
            onEditContenido?.(elemento.id, value);
          }}
          onBlur={() => setIsEditingText(false)}
          autoFocus
          multiline
        />
      ) : (
        <Text style={textStyle}>{resolvedTexto}</Text>
      );
      break;
    case 'fechaHora': {
      const formatted = formatDate(sample.fecha);
      body = <Text style={textStyle}>{formatted}</Text>;
      break;
    }
    case 'listaProductos':
      body = (
        <View style={styles.listWrapper}>
          {sample.items.map((item, index) => (
            <View key={`${elemento.id}-${index}`} style={styles.itemRow}>
              <Text style={[textStyle, styles.itemName]} numberOfLines={1}>
                {item.cantidad > 1 ? `${item.cantidad}x ` : ''}
                {item.nombre}
              </Text>
              <Text style={[textStyle, styles.itemPrice]}>
                {formatCurrencyProduct(item.precio * item.cantidad)}
              </Text>
            </View>
          ))}
        </View>
      );
      break;
    case 'total':
      body = (
        <View style={styles.totalRow}>
          <Text style={[textStyle, { flex: 1 }]}>TOTAL</Text>
          <Text style={[textStyle, styles.totalValue]}>{formatCurrencyTotal(sample.total)}</Text>
        </View>
      );
      break;
    default:
      body = null;
  }

  if (!body) return null;

  return (
    <View style={baseStyle} {...(moveResponder ? moveResponder.panHandlers : {})}>
      <Pressable
        onPress={() => {
          if (disabled) return;
          onSelect?.(elemento.id);
        }}
        onLongPress={() => {
          if (disabled || elemento.tipo !== 'texto' || elemento.bloqueado) return;
          onSelect?.(elemento.id);
          setIsEditingText(true);
        }}
        delayLongPress={180}
        style={StyleSheet.absoluteFill}
        android_ripple={undefined}
      />
      {body}
      {selected && !elemento.bloqueado && !disabled && (
        <View
          style={[
            styles.resizeHandle,
            {
              left: currentWidth - 10,
              top: currentHeight - 10,
            },
          ]}
          {...(resizeResponder ? resizeResponder.panHandlers : {})}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    padding: 16,
    alignItems: 'center',
  },
  ticket: {
    width: TICKET_WIDTH,
    height: TICKET_HEIGHT,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#cbd5f5',
    overflow: 'hidden',
  },
  inlineInput: {
    padding: 4,
    minHeight: 32,
    textAlignVertical: 'top',
    color: '#111827',
  },
  resizeHandle: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#3b82f6',
    borderWidth: 1,
    borderColor: '#ffffff',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  listWrapper: {
    width: '100%',
  },
  itemName: {
    flex: 1,
  },
  itemPrice: {
    width: 80,
    textAlign: 'right',
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  totalValue: {
    textAlign: 'right',
  },
  emptyContainer: {
    padding: 24,
    backgroundColor: '#111827',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  emptyText: {
    color: '#9ca3af',
  },
});
