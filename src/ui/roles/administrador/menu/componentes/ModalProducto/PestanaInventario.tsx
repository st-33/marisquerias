import React from 'react';
import { StyleSheet, Text, View, Pressable, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/compartido/temas';
import type { FormState } from '../../logica/formularioProducto';

export type PestanaInventarioProps = {
  formData: FormState;
  onFormDataChange: (form: FormState) => void;
  areas?: any[];
};

export const PestanaInventario = React.memo(function PestanaInventario({
  formData,
  onFormDataChange,
  areas = [],
}: PestanaInventarioProps) {
  const { colors } = useAppTheme();

  return (
    <View style={styles.formSection}>
      <View
        style={[
          styles.sectionContainer,
          { backgroundColor: colors.cardElevated, borderColor: colors.borderLight },
        ]}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <Ionicons name="cube-outline" size={20} color={colors.primary} />
          <Text style={[styles.switchLabel, { fontSize: 16, fontWeight: '800', color: colors.text }]}>
            Área Preferente de Descuento
          </Text>
        </View>
        <Text style={[styles.switchSublabel, { marginBottom: 14, color: colors.textSecondary }]}>
          Elige de qué área o refrigerador del negocio se descuentan las existencias cuando se vende.
        </Text>

        <Pressable
          style={[
            styles.areaOption,
            { backgroundColor: colors.surface, borderColor: colors.border },
            (!formData.inventoryAreaId || formData.inventoryAreaId === '') && {
              backgroundColor: `${colors.primary}1C`,
              borderColor: colors.primary,
            },
          ]}
          onPress={() => onFormDataChange({ ...formData, inventoryAreaId: '' })}
        >
          <View style={styles.areaOptionHeader}>
            <Text style={{ fontSize: 22 }}>📦</Text>
            <View style={{ flex: 1 }}>
              <Text
                style={[
                  styles.areaOptionTitle,
                  {
                    color:
                      !formData.inventoryAreaId || formData.inventoryAreaId === ''
                        ? colors.primaryLight
                        : colors.text,
                  },
                ]}
              >
                Almacén General / Cocina (Automático)
              </Text>
              <Text style={[styles.areaOptionSub, { color: colors.textSecondary }]}>
                Descuenta automáticamente del área con existencias disponibles
              </Text>
            </View>
            {(!formData.inventoryAreaId || formData.inventoryAreaId === '') && (
              <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
            )}
          </View>
        </Pressable>

        {areas.map((a: any) => {
          const isSelected = formData.inventoryAreaId === a.id;
          return (
            <Pressable
              key={a.id}
              style={[
                styles.areaOption,
                { backgroundColor: colors.surface, borderColor: colors.border },
                isSelected && {
                  backgroundColor: `${colors.primary}1C`,
                  borderColor: colors.primary,
                },
              ]}
              onPress={() => onFormDataChange({ ...formData, inventoryAreaId: a.id })}
            >
              <View style={styles.areaOptionHeader}>
                <Ionicons
                  name="cube-outline"
                  size={20}
                  color={isSelected ? colors.primaryLight : colors.textMuted}
                />
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      styles.areaOptionTitle,
                      { color: isSelected ? colors.primaryLight : colors.text },
                    ]}
                  >
                    {a.nombre}
                  </Text>
                  {a.descripcion && (
                    <Text style={[styles.areaOptionSub, { color: colors.textSecondary }]}>
                      {a.descripcion}
                    </Text>
                  )}
                </View>
                {isSelected && (
                  <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
                )}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  formSection: {
    padding: 20,
  },
  sectionContainer: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  switchLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  switchSublabel: {
    fontSize: 12,
    marginTop: 2,
  },
  areaOption: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
  areaOptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  areaOptionTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  areaOptionSub: {
    fontSize: 12,
    marginTop: 2,
  },
});
