import {
  getVariantOptionLabel,
  type VariantGroup,
  type VariantRule,
} from '../../../base/_persistencia/menu.repo';

export function computeVariantDeltaAndLabels(
  groups: Record<string, VariantGroup>,
  selections: Record<string, string[]>
) {
  let delta = 0;
  const labels: string[] = [];

  Object.entries(selections).forEach(([groupId, optionIds]) => {
    const group = groups[groupId];
    if (!group) return;

    optionIds.forEach((oid) => {
      const option = group.opciones?.[oid];
      if (option) {
        const optionDelta = Number(option.delta || 0);
        delta += Number.isNaN(optionDelta) ? 0 : optionDelta;
        labels.push(getVariantOptionLabel(option, oid));
      }
    });
  });

  return { delta, labels };
}

/**
 * 🧠 MOTOR DE REGLAS ADI
 * Evalúa visibilidad y estado de grupos basado en selecciones actuales y reglas definidas.
 */
export function evaluateRules(
  rules: { visible?: Record<string, VariantRule>; disable?: Record<string, VariantRule> } | any,
  selections: Record<string, string[]>,
  groups: Record<string, VariantGroup> = {}
) {
  const hideSet = new Set<string>();
  const disabledSet = new Set<string>();

  // 1. Evaluar Reglas Explícitas (Compatibilidad con V2)
  if (rules) {
    // Reglas de Visibilidad
    if (rules.visible) {
      (Object.values(rules.visible) as VariantRule[]).forEach((rule) => {
        const selectedOpts = selections[rule.whenGroup] || [];
        const match = selectedOpts.includes(rule.whenOpt);

        if (match) {
          if (rule.showGroups)
            Object.entries(rule.showGroups).forEach(([gid, val]) => !val && hideSet.add(gid));
          if (rule.hideGroups)
            Object.entries(rule.hideGroups).forEach(([gid, val]) => val && hideSet.add(gid));
        }
      });
    }

    // Reglas de Deshabilitado
    if (rules.disable) {
      (Object.values(rules.disable) as VariantRule[]).forEach((rule) => {
        const selectedOpts = selections[rule.whenGroup] || [];
        const match = selectedOpts.includes(rule.whenOpt);

        if (match) {
          if (rule.disableGroups)
            Object.entries(rule.disableGroups).forEach(([gid, val]) => val && disabledSet.add(gid));
        }
      });
    }
  }

  // 2. Evaluar Triggers por Opción (Smart Flow: Whitelist & Blacklist)
  // Definimos qué grupos son "Condicionales" (tienen algún trigger que los muestra)
  const conditionalGroups = new Set<string>();
  const explicitShowSet = new Set<string>();

  // Escanear todos los grupos para encontrar cuáles son condicionales
  Object.values(groups).forEach((g) => {
    Object.values(g.opciones).forEach((opt) => {
      opt.triggers?.showGroups?.forEach((gid) => conditionalGroups.add(gid));
    });
  });

  // Evaluar selecciones actuales para ver qué se activa
  Object.entries(selections).forEach(([groupId, optionIds]) => {
    const group = groups[groupId];
    if (!group) return;

    optionIds.forEach((oid) => {
      const option = group.opciones?.[oid];
      if (option?.triggers) {
        option.triggers.hideGroups?.forEach((gid) => hideSet.add(gid));
        option.triggers.showGroups?.forEach((gid) => explicitShowSet.add(gid));
      }
    });
  });

  // Regla Whitelist: Si un grupo es condicional y NO está en el explicitShowSet, se oculta
  conditionalGroups.forEach((gid) => {
    if (!explicitShowSet.has(gid)) {
      hideSet.add(gid);
    }
  });

  // 3. Evaluar Exclusiones Mutuas (Mixtos)
  Object.entries(groups).forEach(([gid, group]) => {
    if (!group.excludeFromSibling) return;

    const siblingId = group.excludeFromSibling;
    const siblingSelections = selections[siblingId] || [];

    // Si el hermano tiene seleccionada una opción, la deshabilitamos en este grupo
    siblingSelections.forEach((optId) => {
      // Usamos un formato identificable para deshabilitar opciones específicas
      // El motor de la UI recibirá estos IDs de opción prohibidos
      disabledSet.add(`${gid}:${optId}`);
    });
  });

  return { hideSet, disabledSet };
}

/**
 * 🚀 NAVEGADOR DE PASOS
 * Determina el orden lógico de los grupos ignorando los ocultos.
 */
export function getOrderedVisibleGroups(
  groups: Record<string, VariantGroup>,
  selections: Record<string, string[]>,
  rules: any
) {
  const { hideSet } = evaluateRules(rules, selections, groups);
  const groupIds = Object.keys(groups);

  // Intentamos seguir nextGroupId o simplemente el orden de inserción si no hay flujo definido
  // Por ahora, usamos el orden de las llaves pero filtramos los ocultos.
  return groupIds.filter((id) => !hideSet.has(id));
}
