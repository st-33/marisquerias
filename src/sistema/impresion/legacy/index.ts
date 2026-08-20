/**
 * 🖨️ MÓDULO DE IMPRESIÓN
 *
 * Exporta utilidades para generación de tickets ESC/POS.
 */

export {
  generarTestDeCaracteres,
  mapearTextoACP437,
  mapearTextoACP850,
  mapearTextoAuto,
} from './charsetMapper';
export { DEFAULT_TICKET_TEMPLATES } from './defaultTicketTemplates';
export { RtdbSpooler } from './rtdbSpooler';
export { buildEscPosFromTemplate, mergeTemplateWithDefault } from './ticketTemplateUtils';
export type { TicketPrintContext, TicketPrintItem } from './ticketTemplateUtils';
