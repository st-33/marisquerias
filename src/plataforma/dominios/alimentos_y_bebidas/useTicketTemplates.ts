import { useEffect, useMemo, useState, useCallback } from 'react';
import type { Database } from 'firebase/database';
import {
  TicketTemplatesRepository,
  type TicketTemplate,
  type TicketTemplatesPorRol,
  type TicketTemplateElemento,
} from '../../base/_persistencia';
import { DEFAULT_TICKET_TEMPLATES } from '../../core/printing/defaultTicketTemplates';

type UseTicketTemplatesProps = {
  db: Database;
  tenantPath: string;
  usuarioId: string;
};

type VistaTicket = TicketTemplate & {
  dirty: boolean;
};

type TicketEditorState = {
  porRol: Record<string, VistaTicket>;
  seleccionado: string | null;
};

type EditElementoPayload = {
  rol: string;
  elementoId: string;
  cambios: Partial<Omit<TicketTemplateElemento, 'id' | 'tipo'>>;
};

const fusionarTemplate = (rol: string, remoto?: TicketTemplate): VistaTicket => {
  const base = DEFAULT_TICKET_TEMPLATES[rol] ?? DEFAULT_TICKET_TEMPLATES.mesera;
  if (!remoto) {
    return { ...base, elementos: base.elementos.map((e) => ({ ...e })), dirty: false };
  }
  const mergedElementos = base.elementos.map((def) => {
    const remotoElemento = remoto.elementos.find((el) => el.id === def.id);
    return { ...def, ...(remotoElemento ? { ...remotoElemento } : {}) };
  });
  const extras = remoto.elementos
    .filter((e) => !mergedElementos.some((m) => m.id === e.id))
    .map((e) => ({ ...e }));

  return {
    ...base,
    ...remoto,
    elementos: [...mergedElementos, ...extras],
    dirty: false,
  };
};

const defaultState = (): TicketEditorState => {
  const roles = Object.keys(DEFAULT_TICKET_TEMPLATES);
  const porRol = roles.reduce<Record<string, VistaTicket>>((acc, rol) => {
    acc[rol] = fusionarTemplate(rol);
    return acc;
  }, {});
  return {
    porRol,
    seleccionado: roles[0] ?? null,
  };
};

export function useTicketTemplates({ db, tenantPath, usuarioId }: UseTicketTemplatesProps) {
  const [state, setState] = useState<TicketEditorState>(defaultState);
  const [loading, setLoading] = useState(true);

  const repo = useMemo(() => new TicketTemplatesRepository(db, tenantPath), [db, tenantPath]);

  useEffect(() => {
    if (!tenantPath) {
      return;
    }

    const unsub = repo.suscribirTemplates((templatesRemotos: TicketTemplatesPorRol) => {
      setState((prev) => {
        const roles = Object.keys({ ...DEFAULT_TICKET_TEMPLATES, ...templatesRemotos });
        const nuevoPorRol = roles.reduce<Record<string, VistaTicket>>((acc, rol) => {
          acc[rol] = fusionarTemplate(rol, templatesRemotos[rol]);
          return acc;
        }, {});
        const seleccionado =
          prev.seleccionado && roles.includes(prev.seleccionado)
            ? prev.seleccionado
            : roles[0] ?? null;
        return { porRol: nuevoPorRol, seleccionado };
      });
      setLoading(false);
    });

    return unsub;
  }, [repo, tenantPath]);

  const seleccionarRol = useCallback((rol: string) => {
    setState((prev) => ({ ...prev, seleccionado: rol }));
  }, []);

  const editarElemento = useCallback(({ rol, elementoId, cambios }: EditElementoPayload) => {
    setState((prev) => {
      const vista = prev.porRol[rol];
      if (!vista) return prev;
      const elementos = vista.elementos.map((el) => {
        if (el.id !== elementoId) return el;
        if (el.bloqueado) {
          return { ...el, ...cambios, bloqueado: true };
        }
        return { ...el, ...cambios };
      });
      return {
        ...prev,
        porRol: {
          ...prev.porRol,
          [rol]: { ...vista, elementos, dirty: true },
        },
      };
    });
  }, []);

  const editarMetadata = useCallback(
    (rol: string, updates: Partial<Omit<TicketTemplate, 'elementos' | 'acciones'>>) => {
      setState((prev) => {
        const vista = prev.porRol[rol];
        if (!vista) return prev;
        return {
          ...prev,
          porRol: {
            ...prev.porRol,
            [rol]: { ...vista, ...updates, dirty: true },
          },
        };
      });
    },
    []
  );

  const editarAcciones = useCallback((rol: string, acciones: TicketTemplate['acciones']) => {
    setState((prev) => {
      const vista = prev.porRol[rol];
      if (!vista) return prev;
      return {
        ...prev,
        porRol: {
          ...prev.porRol,
          [rol]: { ...vista, acciones, dirty: true },
        },
      };
    });
  }, []);

  const guardarTemplate = useCallback(
    async (rol: string) => {
      const vista = state.porRol[rol];
      if (!vista) throw new Error('Template no encontrado');
      const payload: TicketTemplate = {
        idRol: rol,
        nombrePlantilla: vista.nombrePlantilla,
        elementos: vista.elementos.map((el) => ({ ...el })),
        acciones: vista.acciones,
        metadata: {
          actualizadoPor: usuarioId,
          actualizadoEl: Date.now(),
        },
      };

      await repo.guardarTemplate(rol, payload);
      setState((prev) => ({
        ...prev,
        porRol: {
          ...prev.porRol,
          [rol]: { ...prev.porRol[rol], dirty: false },
        },
      }));
    },
    [repo, state.porRol, usuarioId]
  );

  const restaurarDefault = useCallback((rol: string) => {
    const base = fusionarTemplate(rol);
    setState((prev) => ({
      ...prev,
      porRol: {
        ...prev.porRol,
        [rol]: { ...base, dirty: true },
      },
    }));
  }, []);

  const templates = state.porRol;
  const seleccionado = state.seleccionado;
  const rolesDisponibles = useMemo(() => Object.keys(templates), [templates]);

  return {
    loading: tenantPath ? loading : false,
    templates,
    seleccionado,
    rolesDisponibles,
    seleccionadoTemplate: seleccionado ? templates[seleccionado] : null,
    actions: {
      seleccionarRol,
      editarElemento,
      editarMetadata,
      editarAcciones,
      guardarTemplate,
      restaurarDefault,
    },
  };
}
