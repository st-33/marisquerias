import React from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/compartido/temas';
import type { FormState } from '../../logica/formularioProducto';

export type SeccionCanalesYCocinaProps = {
  formData: FormState;
  onFormDataChange: (form: FormState) => void;
  esPorPedido: boolean;
  showVentaCrudo?: boolean;
};

export const SeccionCanalesYCocina = React.memo(function SeccionCanalesYCocina({
  formData,
  onFormDataChange,
  esPorPedido,
  showVentaCrudo,
}: SeccionCanalesYCocinaProps) {
  const { colors } = useAppTheme();
  const safeVisible = {
    digital: true,
    mesero: true,
    ...(formData.visible || {}),
    ventaCrudo: esPorPedido ? false : Boolean(formData.visible?.ventaCrudo),
  };

  return (
    <View
      style={[
        styles.sectionContainer,
        { backgroundColor: colors.cardElevated, borderColor: colors.borderLight },
      ]}
    >
      <Text style={[styles.inputLabel, { color: colors.text }]}>
        ¿En qué áreas se puede vender?
      </Text>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Pressable
          onPress={() =>
            onFormDataChange({
              ...formData,
              visible: { ...safeVisible, mesero: !safeVisible.mesero },
            })
          }
          style={[
            styles.visibilityBtn,
            { backgroundColor: colors.surface, borderColor: colors.border },
            safeVisible.mesero && {
              backgroundColor: `${colors.primary}20`,
              borderColor: colors.primary,
            },
          ]}
        >
          <Ionicons
            name="restaurant-outline"
            size={17}
            color={safeVisible.mesero ? colors.primaryLight : colors.textMuted}
          />
          <Text style={[styles.visibilityText, { color: colors.text }]}>
            Mesas (Restaurante)
          </Text>
          {safeVisible.mesero && (
            <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
          )}
        </Pressable>

        {showVentaCrudo && (
          <Pressable
            disabled={esPorPedido}
            onPress={() => {
              if (esPorPedido) return;
              onFormDataChange({
                ...formData,
                visible: { ...safeVisible, ventaCrudo: !safeVisible.ventaCrudo },
              });
            }}
            style={[
              styles.visibilityBtn,
              { backgroundColor: colors.surface, borderColor: colors.border },
              safeVisible.ventaCrudo && {
                backgroundColor: `${colors.accent}20`,
                borderColor: colors.accent,
              },
              esPorPedido && { opacity: 0.45 },
            ]}
          >
            <Ionicons
              name="storefront-outline"
              size={17}
              color={safeVisible.ventaCrudo ? colors.accent : colors.textMuted}
            />
            <Text style={[styles.visibilityText, { color: colors.text }]}>
              Mostrador (Directo)
            </Text>
            {safeVisible.ventaCrudo && !esPorPedido && (
              <Ionicons name="checkmark-circle" size={18} color={colors.accent} />
            )}
          </Pressable>
        )}
      </View>

      {esPorPedido && showVentaCrudo && (
        <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 8 }}>
          · Como este platillo se cocina al momento, se sirve en Mesas y no en venta directa de Mostrador.
        </Text>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  sectionContainer: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 10,
  },
  visibilityBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  visibilityText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
  },
});
