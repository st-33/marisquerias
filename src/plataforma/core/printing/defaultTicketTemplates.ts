import type { TicketTemplate, TicketTemplateElemento } from '../../base/_persistencia';

const createBaseElements = () => {
  // Título del negocio - Primera letra en mayúscula
  const header: TicketTemplateElemento = {
    id: 'header-title',
    tipo: 'texto',
    label: 'Nombre del Negocio',
    contenido: '{{tenantName}}',
    posicion: { x: 0.05, y: 0.02 },
    tamano: { width: 0.9, height: 0.08 },
    estilo: { alineacion: 'center', fontSize: 20, bold: true },
    bloqueado: false,
  };

  // Número de mesa en la siguiente línea
  const mesa: TicketTemplateElemento = {
    id: 'mesa-numero',
    tipo: 'texto',
    label: 'Número de Mesa',
    contenido: '{{mesa}}',
    posicion: { x: 0.05, y: 0.12 },
    tamano: { width: 0.9, height: 0.06 },
    estilo: { alineacion: 'center', fontSize: 16, bold: true },
    bloqueado: false,
  };

  // Fecha en formato específico: viernes 14 de Noviembre 2025 02:44 pm
  const dateTime: TicketTemplateElemento = {
    id: 'fecha-hora',
    tipo: 'fechaHora',
    label: 'Fecha y Hora',
    posicion: { x: 0.05, y: 0.2 },
    tamano: { width: 0.9, height: 0.06 },
    estilo: { alineacion: 'center', fontSize: 12 },
    bloqueado: true,
  };

  // Lista de productos - lado a lado con precios
  const items: TicketTemplateElemento = {
    id: 'lista-productos',
    tipo: 'listaProductos',
    label: 'Productos',
    posicion: { x: 0.05, y: 0.32 },
    tamano: { width: 0.9, height: 0.45 },
    estilo: { alineacion: 'left', fontSize: 12 },
    bloqueado: true,
  };

  // Total sin elementos extra
  const total: TicketTemplateElemento = {
    id: 'total',
    tipo: 'total',
    label: 'Total',
    posicion: { x: 0.05, y: 0.82 },
    tamano: { width: 0.9, height: 0.08 },
    estilo: { alineacion: 'right', fontSize: 16, bold: true },
    bloqueado: true,
  };

  return { header, mesa, dateTime, items, total };
};

const buildTemplate = (
  rol: string,
  nombre: string,
  overrides?: Partial<Record<string, TicketTemplateElemento>>
): TicketTemplate => {
  const base = createBaseElements();
  const elementos = [
    overrides?.header ?? { ...base.header },
    overrides?.mesa ?? { ...base.mesa },
    overrides?.dateTime ?? { ...base.dateTime },
    overrides?.items ?? { ...base.items },
    overrides?.total ?? { ...base.total },
  ];

  return {
    idRol: rol,
    nombrePlantilla: nombre,
    elementos,
    acciones: {
      imprimirEn: [],
      disparadores: [],
    },
    metadata: {
      actualizadoPor: 'system',
      actualizadoEl: Date.now(),
    },
  };
};

export const DEFAULT_TICKET_TEMPLATES: Record<string, TicketTemplate> = {
  mesera: buildTemplate('mesera', 'Ticket Mesera'),
  cocina: buildTemplate('cocina', 'Ticket Cocina', {
    items: {
      id: 'lista-productos',
      tipo: 'listaProductos',
      label: 'Productos',
      posicion: { x: 0.05, y: 0.32 },
      tamano: { width: 0.9, height: 0.5 },
      estilo: { alineacion: 'left', fontSize: 12 },
      bloqueado: true,
    },
  }),
  admin: buildTemplate('admin', 'Ticket Administrador'),
};

export const DEFAULT_TICKET_ORDER = ['mesera', 'cocina', 'admin'];
