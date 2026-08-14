/**
 * COMPONENTE REUTILIZABLE: Display de variantes
 * Formato híbrido: visual + compacto, fácil de leer para cualquier mesera
 * Uso: Mesera (comanda), Cocina (preparación), Admin (historial)
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

type VariantGroup = {
  [groupId: string]: string[]; // { "tamaño": ["mediano"], "tipo": ["camarón"] }
};

type VariantDisplayProps = {
  variants?: VariantGroup;
  compact?: boolean; // true = una línea, false = múltiples líneas
  showPrices?: boolean; // Mostrar deltas de precio (futuro)
};

export function VariantDisplay({
  variants,
  compact = false,
  showPrices = false,
}: VariantDisplayProps) {
  if (!variants || Object.keys(variants).length === 0) return null;

  // Convertir variantes a formato legible
  const formatted = Object.entries(variants).map(([groupId, options]) => {
    const optionsStr = Array.isArray(options) ? options.join(', ') : String(options);
    return { group: groupId, options: optionsStr };
  });

  if (compact) {
    // Formato compacto: "M | Camarón | +Cebolla +Cilantro"
    const compactStr = formatted
      .map(({ options }) => {
        // Si es un extra (múltiples opciones), agregar "+"
        const opts = options.split(', ');
        return opts.length > 1 ? opts.map((o) => `+${o}`).join(' ') : options;
      })
      .join(' | ');

    return (
      <Text style={styles.compactText} numberOfLines={1}>
        {compactStr}
      </Text>
    );
  }

  // Formato expandido con iconos y colores
  return (
    <View style={styles.expandedContainer}>
      {formatted.map(({ group, options }, idx) => (
        <View key={idx} style={styles.variantRow}>
          <View style={[styles.dot, { backgroundColor: getDotColor(idx) }]} />
          <Text style={styles.groupLabel}>{capitalize(group)}:</Text>
          <Text style={styles.optionsText}>{options}</Text>
        </View>
      ))}
    </View>
  );
}

// Colores sutiles para diferenciar grupos
function getDotColor(index: number): string {
  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
  return colors[index % colors.length];
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

const styles = StyleSheet.create({
  compactText: {
    color: '#9ca3af',
    fontSize: 12,
    marginTop: 2,
  },
  expandedContainer: {
    marginTop: 4,
    gap: 2,
  },
  variantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  groupLabel: {
    color: '#d1d5db',
    fontSize: 11,
    fontWeight: '600',
  },
  optionsText: {
    color: '#9ca3af',
    fontSize: 11,
    flex: 1,
  },
});
