import { ref, onValue, off, set, update, get } from 'firebase/database';
import type { Database } from 'firebase/database';
import { assertValidTenantPath, sanitizeRtdbPayload } from '../../core/rtdb/guards';

export type TicketElementTipo = 'texto' | 'listaProductos' | 'total' | 'fechaHora';

export type TicketTemplateElemento = {
  id: string;
  tipo: TicketElementTipo;
  label?: string;
  contenido?: string;
  posicion: { x: number; y: number };
  tamano: { width: number; height: number };
  estilo?: {
    alineacion?: 'left' | 'center' | 'right';
    fontSize?: number;
    bold?: boolean;
  };
  bloqueado?: boolean;
};

export type TicketTemplateAcciones = {
  imprimirEn?: string[];
  disparadores?: string[];
};

export type TicketTemplate = {
  idRol: string;
  nombrePlantilla: string;
  elementos: TicketTemplateElemento[];
  acciones: TicketTemplateAcciones;
  metadata: {
    actualizadoPor: string;
    actualizadoEl: number;
  };
};

export type TicketTemplatesPorRol = Record<string, TicketTemplate>;

export class TicketTemplatesRepository {
  constructor(
    private db: Database,
    private tenantPath: string
  ) {
    assertValidTenantPath(tenantPath);
  }

  private basePath() {
    return `${this.tenantPath}/ajustes/dispositivos/tickets`;
  }

  suscribirTemplates(callback: (templates: TicketTemplatesPorRol) => void) {
    const r = ref(this.db, this.basePath());
    const cb = onValue(r, (snap) => {
      const data = (snap.val() as TicketTemplatesPorRol) || {};
      callback(data);
    });
    return () => off(r, 'value', cb as any);
  }

  async obtenerTemplate(rol: string): Promise<TicketTemplate | null> {
    const snap = await get(ref(this.db, `${this.basePath()}/${rol}`));
    return snap.exists() ? (snap.val() as TicketTemplate) : null;
  }

  async obtenerTodos(): Promise<TicketTemplatesPorRol> {
    const snap = await get(ref(this.db, this.basePath()));
    return (snap.val() as TicketTemplatesPorRol) || {};
  }

  async guardarTemplate(rol: string, template: TicketTemplate) {
    await set(ref(this.db, `${this.basePath()}/${rol}`), sanitizeRtdbPayload(template));
  }

  async actualizarAcciones(rol: string, acciones: TicketTemplateAcciones) {
    await update(
      ref(this.db, `${this.basePath()}/${rol}/acciones`),
      sanitizeRtdbPayload(acciones) as any
    );
  }
}
