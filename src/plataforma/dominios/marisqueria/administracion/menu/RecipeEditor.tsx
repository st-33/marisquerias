/**
 * 🍳 EDITOR DE RECETAS CON VALIDACIÓN PREVENTIVA
 * Componente para editar recetas con preview de capacidad en tiempo real
 * SEPARACIÓN SAGRADA: Componente tonto, recibe props y callbacks
 */

import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { Producto } from '../../../../base/_persistencia';

export type ItemInventario = {
  id: string;
  nombre: string;
  cantidad: number;
  unidad: string;
};

type RecipeEditorProps = {
  receta: Producto['receta'];
  onRecetaChange: (receta: Producto['receta']) => void;
  itemsInventario: ItemInventario[]; // Items disponibles para seleccionar
  validacion: {
    valida: boolean;
    errores: string[];
    advertencias: string[];
    capacidad?: number;
    ingredienteLimitante?: string;
  } | null;
  validando: boolean;
  productoNombre?: string; // Para mostrar en preview
};

export default function RecipeEditor({
  receta = {},
  onRecetaChange,
  itemsInventario,
  validacion,
  validando,
  productoNombre = 'Este producto',
}: RecipeEditorProps) {
  const [itemForm, setItemForm] = useState<{ itemId: string; cantidad: string }>({
    itemId: '',
    cantidad: '',
  });

  const capacidad = validacion?.capacidad ?? null;
  const limitante = validacion?.ingredienteLimitante ?? '';

  const agregarItem = () => {
    if (!itemForm.itemId || !itemForm.cantidad) return;

    const cantidad = parseFloat(itemForm.cantidad);
    if (cantidad <= 0) return;

    onRecetaChange({
      ...receta,
      ingredientes: {
        ...(receta?.ingredientes || {}),
        [itemForm.itemId]: cantidad,
      },
    });

    setItemForm({ itemId: '', cantidad: '' });
  };

  const eliminarItem = (itemId: string) => {
    const nuevaReceta = { ...receta };
    if (nuevaReceta?.ingredientes) {
      const nuevosIngredientes = { ...nuevaReceta.ingredientes };
      delete nuevosIngredientes[itemId];
      onRecetaChange({
        ...nuevaReceta,
        ingredientes: Object.keys(nuevosIngredientes).length > 0 ? nuevosIngredientes : undefined,
      });
    }
  };

  const getItemNombre = (itemId: string) => {
    const item = itemsInventario.find((i) => i.id === itemId);
    return item?.nombre || itemId;
  };

  const getItemStock = (itemId: string) => {
    const item = itemsInventario.find((i) => i.id === itemId);
    return item ? `${item.cantidad} ${item.unidad}` : 'N/A';
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Receta</Text>

      {/* Preview de Capacidad */}
      {receta?.ingredientes && Object.keys(receta.ingredientes).length > 0 && (
        <View
          style={[
            styles.previewCard,
            capacidad !== null && capacidad === 0 && styles.previewCardError,
            capacidad !== null && capacidad > 0 && capacidad < 5 && styles.previewCardWarning,
          ]}
        >
          <View style={styles.previewHeader}>
            <Ionicons
              name={
                capacidad === null
                  ? 'analytics-outline'
                  : capacidad === 0
                  ? 'alert-circle'
                  : capacidad < 5
                  ? 'warning'
                  : 'checkmark-circle'
              }
              size={20}
              color={
                capacidad === null
                  ? '#8b5cf6'
                  : capacidad === 0
                  ? '#dc2626'
                  : capacidad < 5
                  ? '#f59e0b'
                  : '#10b981'
              }
            />
            <Text style={styles.previewTitle}>Capacidad de Producción</Text>
            {validando && (
              <ActivityIndicator size="small" color="#8b5cf6" style={{ marginLeft: 8 }} />
            )}
          </View>

          {capacidad !== null ? (
            <>
              <Text
                style={[styles.previewCantidad, capacidad === 0 && styles.previewCantidadError]}
              >
                {capacidad} {capacidad === 1 ? 'unidad' : 'unidades'}
              </Text>
              {limitante && <Text style={styles.previewLimitante}>Limitado por: {limitante}</Text>}
              {validacion?.errores && validacion.errores.length > 0 && (
                <View style={styles.erroresContainer}>
                  {validacion.errores.map((error, idx) => (
                    <Text key={idx} style={styles.errorText}>
                      ⚠️ {error}
                    </Text>
                  ))}
                </View>
              )}
              {validacion?.advertencias && validacion.advertencias.length > 0 && (
                <View style={styles.advertenciasContainer}>
                  {validacion.advertencias.map((adv, idx) => (
                    <Text key={idx} style={styles.advertenciaText}>
                      ℹ️ {adv}
                    </Text>
                  ))}
                </View>
              )}
            </>
          ) : (
            <Text style={styles.previewEmpty}>Agrega items a la receta para ver la capacidad</Text>
          )}
        </View>
      )}

      {/* Lista de Items en Receta */}
      {receta?.ingredientes && Object.keys(receta.ingredientes).length > 0 && (
        <View style={styles.itemsList}>
          {Object.entries(receta.ingredientes).map(([itemId, cantidad]) => (
            <View key={itemId} style={styles.itemRow}>
              <View style={styles.itemInfo}>
                <Text style={styles.itemNombre}>{getItemNombre(itemId)}</Text>
                <Text style={styles.itemCantidad}>
                  {String(cantidad)} {itemsInventario.find((i) => i.id === itemId)?.unidad || 'un'}
                </Text>
                <Text style={styles.itemStock}>Stock: {getItemStock(itemId)}</Text>
              </View>
              <Pressable onPress={() => eliminarItem(itemId)} style={styles.deleteBtn}>
                <Ionicons name="trash-outline" size={18} color="#ef4444" />
              </Pressable>
            </View>
          ))}
        </View>
      )}

      {/* Formulario para Agregar Item */}
      <View style={styles.formContainer}>
        <Text style={styles.formTitle}>Agregar Ingrediente</Text>

        {/* Selector de Item */}
        <View style={styles.selectorContainer}>
          <ScrollView style={styles.selectorScroll} nestedScrollEnabled>
            {itemsInventario.map((item) => (
              <Pressable
                key={item.id}
                onPress={() => setItemForm({ ...itemForm, itemId: item.id })}
                style={[
                  styles.selectorItem,
                  itemForm.itemId === item.id && styles.selectorItemActive,
                ]}
              >
                <View style={styles.selectorItemContent}>
                  <Text style={styles.selectorItemName}>{item.nombre}</Text>
                  <Text style={styles.selectorItemStock}>
                    {item.cantidad} {item.unidad} disponible
                  </Text>
                </View>
                {itemForm.itemId === item.id && (
                  <Ionicons name="checkmark-circle" size={20} color="#10b981" />
                )}
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Cantidad */}
        <TextInput
          style={styles.input}
          placeholder="Cantidad necesaria"
          placeholderTextColor="#6b7280"
          value={itemForm.cantidad}
          onChangeText={(text) => setItemForm({ ...itemForm, cantidad: text })}
          keyboardType="decimal-pad"
        />

        {/* Botón Agregar */}
        <Pressable
          onPress={agregarItem}
          style={[
            styles.addButton,
            (!itemForm.itemId || !itemForm.cantidad) && styles.addButtonDisabled,
          ]}
          disabled={!itemForm.itemId || !itemForm.cantidad}
        >
          <Ionicons name="add-circle" size={20} color="#fff" />
          <Text style={styles.addButtonText}>Agregar a Receta</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  title: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  previewCard: {
    backgroundColor: '#1f2937',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#8b5cf6',
  },
  previewCardError: {
    backgroundColor: '#7f1d1d',
    borderLeftColor: '#dc2626',
  },
  previewCardWarning: {
    backgroundColor: '#78350f',
    borderLeftColor: '#f59e0b',
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  previewTitle: {
    color: '#e5e7eb',
    fontSize: 14,
    fontWeight: '600',
  },
  previewCantidad: {
    color: '#10b981',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 4,
  },
  previewCantidadError: {
    color: '#dc2626',
  },
  previewLimitante: {
    color: '#9ca3af',
    fontSize: 12,
    fontStyle: 'italic',
  },
  previewEmpty: {
    color: '#6b7280',
    fontSize: 12,
    fontStyle: 'italic',
  },
  erroresContainer: {
    marginTop: 8,
    gap: 4,
  },
  errorText: {
    color: '#fca5a5',
    fontSize: 12,
  },
  advertenciasContainer: {
    marginTop: 8,
    gap: 4,
  },
  advertenciaText: {
    color: '#fbbf24',
    fontSize: 12,
  },
  itemsList: {
    gap: 8,
    marginBottom: 12,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1f2937',
    borderRadius: 8,
    padding: 12,
  },
  itemInfo: {
    flex: 1,
  },
  itemNombre: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  itemCantidad: {
    color: '#8b5cf6',
    fontSize: 13,
    marginBottom: 2,
  },
  itemStock: {
    color: '#9ca3af',
    fontSize: 11,
  },
  deleteBtn: {
    padding: 4,
  },
  formContainer: {
    backgroundColor: '#1f2937',
    borderRadius: 8,
    padding: 12,
  },
  formTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  selectorContainer: {
    maxHeight: 200,
    marginBottom: 12,
  },
  selectorScroll: {
    backgroundColor: '#111827',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#374151',
  },
  selectorItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
  },
  selectorItemActive: {
    backgroundColor: '#1e3a8a',
  },
  selectorItemContent: {
    flex: 1,
  },
  selectorItemName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  selectorItemStock: {
    color: '#9ca3af',
    fontSize: 12,
  },
  input: {
    backgroundColor: '#374151',
    borderRadius: 6,
    padding: 12,
    color: '#fff',
    fontSize: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#4b5563',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#16a34a',
    padding: 12,
    borderRadius: 8,
  },
  addButtonDisabled: {
    backgroundColor: '#374151',
    opacity: 0.5,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
});
