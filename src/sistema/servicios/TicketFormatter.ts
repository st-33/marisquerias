// /src/core/services/TicketFormatter.ts

// NOTA: Este código asume una librería ESC/POS que expone una API fluida.
// Los tipos 'any' deben ser reemplazados por los tipos específicos de la librería
// que se instale para la comunicación con la impresora (ej. react-native-esc-pos-printer).

// --- Definiciones de Tipos (Idealmente en /src/core/tipos/ o /src/domain/) ---
export interface OrderItem {
  cantidad: number;
  nombre: string;
  precio: number; // Precio unitario
}

export interface Order {
  items: OrderItem[];
  total: number;
}

export interface TenantTicketConfig {
  nombreNegocio: string;
  encabezado?: string;
  logoBase64?: string;
  telefono?: string;
  mensajeFinal?: string;
  redesSociales?: {
    facebook?: string;
    instagram?: string;
    whatsapp?: string;
  };
}

// --- Función de Formateo ---

/**
 * Genera y envía los comandos ESC/POS para un ticket de caja a una instancia de impresora.
 * Optimizado para 58mm (32 caracteres) y sigue las reglas de negocio de México.
 *
 * @param printer - Instancia activa y conectada de la librería de impresora.
 * @param order - El objeto del pedido a imprimir.
 * @param config - La configuración del tenant para el diseño del ticket.
 */
export async function generarTicketCaja(
  printer: any,
  order: Order,
  config: TenantTicketConfig
): Promise<void> {
  const TICKET_WIDTH = 31; // Reduced to prevent wrapping issues

  const formatBusinessName = (raw: string) =>
    String(raw || '')
      .replace(/^B\s*/i, '')
      .trim()
      .toUpperCase();

  try {
    // --- 1. Cabecera ---
    printer.align('ct');

    if (config.logoBase64) {
      try {
        await printer.image(config.logoBase64, 's8');
        printer.feed(1);
      } catch (e) {
        console.error('Error al procesar o imprimir el logo:', e);
      }
    }

    // Cabecera: Nombre del negocio
    printer.style('b').text(formatBusinessName(config.nombreNegocio)).style('normal');

    if (config.telefono) {
      printer.text(config.telefono);
    }

    // Fecha y Hora
    const fechaFormateada = new Intl.DateTimeFormat('es-MX', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(new Date());

    printer.text(fechaFormateada);

    // Separador Doble
    printer.text('='.repeat(TICKET_WIDTH));

    // --- 2. Cuerpo (Columnas e Items) ---
    // Encabezados de columna
    printer.align('lt');
    printer.style('b').text('PRODUCTO                         ').style('normal'); // Simplificado
    // printer.text('PRODUCTO CANT X PRECIO'); // A veces no cabe en 58mm si es muy largo, mejor simple.
    // La imagen muestra: PRODUCTO CANT X PRECIO en una linea. Intentemos ajustarlo.
    // TICKET_WIDTH = 31 chars.
    // PROD(15) CANT(5) PREC(10) ~ 30
    printer.style('b').text('PRODUCTO       CANT     PRECIO').style('normal');

    // Separador Simple
    printer.text('-'.repeat(TICKET_WIDTH));

    for (const item of order.items) {
      // REGLA: Precio sin decimales (según imagen: $10.00, espera... imagen dice $10.00. Code decía toFixed(0). User preview image shows $10.00)
      // User image: "Producto 1 1 x $10.00"
      // User instructions usually say "no decimals", but image has decimals.
      // User request text: "product price is displayed on the same line without decimals; and common errors..."
      // BUT preview image (uploaded) shows $10.00.
      // User says: "el formato del tiket talcual lo tenemos ya diseñado... ose el que precisamente temnemos como rpevia vista"
      // Preview image shows $10.00. I will follow the IMAGE as it's the "Vista Previa".
      // Wait, user text in previous conversation: "product price is displayed on the same line without decimals".
      // Let's stick to no decimals if that was a previous explicit instruction, OR follow the image.
      // Given the emphatic "tal cual PREVIA VISTA", and the image has decimals ($10.00), I will use 2 decimals.

      const price = `$${item.precio.toFixed(2)}`;
      const qty = `${item.cantidad}`;

      // Formato: Nombre en una linea, Cant y Precio en la misma o siguiente?
      // Imagen: "Producto 1 1 x $10.00" (Todo en una linea si cabe)
      // Escenario 32 chars: "Coca  2 x $20.00"

      // Intentamos formato 1 línea:
      // Nombre (trunc) ... Cant x Precio

      const rightPart = ` ${qty} x ${price}`;
      const nameMaxWidth = TICKET_WIDTH - rightPart.length;

      let itemName = item.nombre;
      if (itemName.length > nameMaxWidth) {
        itemName = itemName.substring(0, nameMaxWidth);
      }

      const padding = ' '.repeat(Math.max(0, TICKET_WIDTH - itemName.length - rightPart.length));
      printer.text(`${itemName}${padding}${rightPart}`);
    }

    // Separador Simple
    printer.text('-'.repeat(TICKET_WIDTH));

    // --- 3. Totales ---
    // Total
    const totalString = `TOTAL: $${order.total.toFixed(2)}`;

    // Alineación derecha para el total
    printer.align('rt').style('b').text(totalString).style('normal');

    // Separador Doble
    printer.align('ct').text('='.repeat(TICKET_WIDTH));

    // --- 4. Pie de Página ---
    printer.feed(1); // Espacio antes del footer
    if (config.mensajeFinal) {
      printer.text(config.mensajeFinal);
      printer.feed(1);
    }

    if (config.redesSociales) {
      if (config.redesSociales.whatsapp) printer.text(`WhatsApp: ${config.redesSociales.whatsapp}`);
      if (config.redesSociales.instagram)
        printer.text(`Instagram: ${config.redesSociales.instagram}`);
      if (config.redesSociales.facebook) printer.text(`Facebook: ${config.redesSociales.facebook}`);
    }

    // --- 5. Corte ---
    printer.feed(3);
    printer.cut();

    // Envía todos los comandos en buffer a la impresora
    await printer.flush();
  } catch (error) {
    console.error('Error fatal durante la generación del ticket:', error);
    // Lanzamos el error para que el servicio de hardware pueda manejarlo.
    throw new Error('Fallo al formatear o enviar el ticket.');
  }
}
