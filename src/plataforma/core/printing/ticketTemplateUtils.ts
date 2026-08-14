import { ConstructorEscPos as EscPosBuilder } from '../../nucleo/sistema-impresion/adaptadores/AdaptadorEscPos';
import type { TicketTemplate, TicketTemplateElemento } from '../../base/_persistencia';
import { DEFAULT_TICKET_TEMPLATES } from './defaultTicketTemplates';

type TicketPrintItem = {
  nombre: string;
  cantidad: number;
  precio: number;
  variantes?: string;
};

type TicketPrintContext = {
  tenantName?: string;
  mesa?: string;
  tipo: 'mesa' | 'llevar' | 'reparto';
  fecha: Date;
  items: TicketPrintItem[];
  totales: {
    subtotal?: number;
    total: number;
  };
};

const ALIGN_MAP: Record<string, 'left' | 'center' | 'right'> = {
  left: 'left',
  center: 'center',
  right: 'right',
};

// Producto: sin decimales ($30, $120)
const formatCurrencyProduct = (value: number) => `$${Math.round(value)}`;
// TOTAL: siempre con .00 ($210.00)
const formatCurrencyTotal = (value: number) => `$${value.toFixed(2)}`;

// Normalizar string: eliminar acentos problemáticos y caracteres raros
const normalizeString = (str: string): string => {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Eliminar diacríticos
    .replace(/[^\x20-\x7E]/g, '') // Solo caracteres ASCII imprimibles
    .trim();
};

const formatBusinessName = (raw: string): string => {
  const cleaned = String(raw || '')
    .replace(/^B\s*/i, '')
    .trim();
  return normalizeString(cleaned.toUpperCase());
};

const cloneElemento = (elemento: TicketTemplateElemento): TicketTemplateElemento => ({
  ...elemento,
  posicion: { ...elemento.posicion },
  tamano: { ...elemento.tamano },
  estilo: elemento.estilo ? { ...elemento.estilo } : undefined,
});

export const mergeTemplateWithDefault = (rol: string, remoto?: TicketTemplate): TicketTemplate => {
  const base = DEFAULT_TICKET_TEMPLATES[rol] ?? DEFAULT_TICKET_TEMPLATES.mesera;
  if (!remoto) {
    return {
      ...base,
      elementos: base.elementos.map(cloneElemento),
      acciones: { ...base.acciones },
      metadata: { ...base.metadata },
    };
  }

  const mergedElementos = base.elementos.map((def) => {
    const remoteMatch = remoto.elementos.find((el) => el.id === def.id);
    return cloneElemento(remoteMatch ? { ...def, ...remoteMatch } : def);
  });

  const extras = remoto.elementos
    .filter((el) => !mergedElementos.some((m) => m.id === el.id))
    .map(cloneElemento);

  return {
    ...base,
    ...remoto,
    elementos: [...mergedElementos, ...extras],
    acciones: { ...base.acciones, ...(remoto.acciones ?? {}) },
    metadata: remoto.metadata ?? base.metadata,
  };
};

const resolvePlaceholders = (text: string | undefined, ctx: TicketPrintContext): string => {
  if (!text) return '';
  return text
    .replace(/{{tenantName}}/g, ctx.tenantName || '')
    .replace(/{{mesa}}/g, ctx.mesa || '')
    .replace(/{{fecha}}/g, ctx.fecha.toLocaleDateString('es-MX'))
    .replace(
      /{{hora}}/g,
      ctx.fecha.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
    )
    .replace(/{{total}}/g, formatCurrencyTotal(ctx.totales.total));
};

export const buildEscPosFromTemplate = (
  template: TicketTemplate,
  ctx: TicketPrintContext
): string => {
  const builder = new EscPosBuilder();

  builder.inicializar().fuenteNormal(); // 🔠 Set default font 12x24

  template.elementos.forEach((elemento) => {
    const alineacion =
      elemento.estilo?.alineacion && ALIGN_MAP[elemento.estilo.alineacion]
        ? ALIGN_MAP[elemento.estilo.alineacion]
        : 'left';
    const fontSize = elemento.estilo?.fontSize ?? 12;
    const bold = elemento.estilo?.bold ?? false;

    if (alineacion === 'center') builder.centrar();
    else if (alineacion === 'right') builder.derecha();
    else builder.izquierda();

    builder.negrita(bold);

    switch (elemento.tipo) {
      case 'texto': {
        const contenido = resolvePlaceholders(elemento.contenido, ctx);
        if (elemento.contenido?.includes('{{tenantName}}')) {
          // 🏪 NOMBRE DEL NEGOCIO - Sin capitalizar, tal cual
          const nombre = ctx.tenantName || 'NEGOCIO';
          const nombreFormateado = formatBusinessName(nombre);
          builder.fuenteNormal().centrar().negrita(true);
          builder.texto(nombreFormateado).linea();
          builder.negrita(false);
        } else if (elemento.contenido?.includes('{{mesa}}')) {
          // 🏠 MESA - Simple, sin asteriscos
          builder.fuenteNormal().centrar().negrita(true);
          builder.texto(`Mesa ${ctx.mesa || 'N/A'}`).linea();
          builder.negrita(false);

          // 📅 FECHA INMEDIATAMENTE DESPUÉS DE MESA
          const opcionesFecha: Intl.DateTimeFormatOptions = {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          };
          const fechaStr = ctx.fecha.toLocaleDateString('es-MX', opcionesFecha);
          const horaStr = ctx.fecha
            .toLocaleTimeString('es-MX', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: true,
            })
            .toLowerCase()
            .replace(/\s/g, '');

          const fechaCompleta = `${fechaStr} ${horaStr}`;
          builder.centrar().texto(fechaCompleta).lineas(2);
        } else {
          builder.texto(contenido).lineas(fontSize >= 16 ? 2 : 1);
        }
        break;
      }
      case 'fechaHora': {
        // La fecha se imprime al final (ver línea 164)
        break;
      }
      case 'listaProductos': {
        builder.fuenteNormal().izquierda().negrita(false);
        builder.linea().texto('================================').linea();

        const esComanda = ctx.totales.total === 0;
        const MAX_WIDTH = 32;

        ctx.items.forEach((item) => {
          // ✅ Solo mostrar "Nx" si cantidad > 1
          const cantidadStr = item.cantidad > 1 ? `${item.cantidad}x ` : '';
          const nombreLimpio = normalizeString(item.nombre);

          if (esComanda) {
            // 🍳 COMANDA: Solo cantidad + nombre
            const maxNameLen = MAX_WIDTH - cantidadStr.length;
            const displayName =
              nombreLimpio.length > maxNameLen
                ? nombreLimpio.slice(0, maxNameLen - 3) + '...'
                : nombreLimpio;

            builder.texto(`${cantidadStr}${displayName}`).linea();
          } else {
            // 💵 CUENTA: Cantidad + Nombre + Precio (sin decimales)
            const precioTotal = formatCurrencyProduct(item.cantidad * item.precio);
            const spaceForPrice = precioTotal.length + 1;
            const maxNameLen = MAX_WIDTH - cantidadStr.length - spaceForPrice;

            const displayName =
              nombreLimpio.length > maxNameLen
                ? nombreLimpio.slice(0, maxNameLen - 3) + '...'
                : nombreLimpio;

            const usedWidth = cantidadStr.length + displayName.length + precioTotal.length;
            const spaces = ' '.repeat(Math.max(1, MAX_WIDTH - usedWidth));

            builder.texto(`${cantidadStr}${displayName}${spaces}${precioTotal}`).linea();
          }

          // ✅ Variantes (si existen)
          if (item.variantes && item.variantes.trim() !== '') {
            const variantesStr = `  ${item.variantes}`;
            if (variantesStr.length <= MAX_WIDTH) {
              builder.texto(variantesStr).linea();
            } else {
              const chunks = variantesStr.match(new RegExp(`.{1,${MAX_WIDTH}}`, 'g')) || [];
              chunks.forEach((chunk) => builder.texto(chunk).linea());
            }
          }
        });

        builder.linea();
        builder.texto('================================').linea();
        break;
      }
      case 'total': {
        // 💰 TOTAL (solo si no es comanda) - CENTRADO y SIEMPRE con .00
        if (ctx.totales.total > 0) {
          const total = formatCurrencyTotal(ctx.totales.total);

          builder.lineas(2).centrar().negrita(true);
          builder.texto(`TOTAL ${total}`).lineas(2);
          builder.negrita(false);
        }
        break;
      }
      default:
        break;
    }

    builder.negrita(false);
    builder.izquierda();
  });

  // 💚 MENSAJE DE DESPEDIDA (La fecha ya se imprimió arriba)
  builder.linea().centrar().negrita(false);
  builder.texto('¡Gracias por tu visita! Ya tu Sabes BOTY❤').lineas(3);

  builder.cortar(true);
  return builder.construirBase64();
};

export type { TicketPrintContext, TicketPrintItem };
