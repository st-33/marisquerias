import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Animated, FlatList, Pressable, ScrollView, Text, View } from 'react-native';
import { formatMoney } from '../../../compartido/utils/formatters';

type Category = { id: string; nombre?: string };
type Product = { id: string; nombre?: string; precio?: number };

type Props = {
  categories: Category[];
  selectedCategory: string | null;
  onSelectCategory: (id: string) => void;
  productsInCategory: Product[];
  onOpenVariant: (id: string) => void;
  onClose: () => void;
};

function ProductPickerOverlayComponent({
  categories,
  selectedCategory,
  onSelectCategory,
  productsInCategory,
  onOpenVariant,
  onClose,
}: Props) {
  const [fadeAnim] = React.useState(() => new Animated.Value(0));
  const [slideAnim] = React.useState(() => new Animated.Value(50));

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 50,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => onClose());
  };

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.75)',
        justifyContent: 'center',
        alignItems: 'center',
        // 🔥 CORRECCIÓN DEFINITIVA: Usar padding en el overlay para controlar el tamaño del modal
        paddingHorizontal: 20,
        paddingVertical: 40,
        opacity: fadeAnim,
      }}
    >
      <Animated.View
        style={{
          backgroundColor: '#0f172a',
          borderRadius: 24,
          width: '100%',
          maxWidth: 500,
          // Se elimina maxHeight para que flexbox controle la altura
          flex: 1, // El modal ocupa el espacio vertical disponible (definido por el padding del padre)
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 20 },
          shadowOpacity: 0.5,
          shadowRadius: 25,
          elevation: 20,
          transform: [{ translateY: slideAnim }],
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden', // Prevenir que el contenido se desborde del border radius
        }}
      >
        {/* Header mejorado */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingHorizontal: 24,
            paddingTop: 24,
            paddingBottom: 16,
            borderBottomWidth: 1,
            borderBottomColor: '#1e293b',
          }}
        >
          <View>
            <Text
              style={{
                color: 'white',
                fontSize: 24,
                fontWeight: '900',
                letterSpacing: -0.5,
              }}
            >
              Selecciona productos
            </Text>
            <Text
              style={{
                color: '#64748b',
                fontSize: 14,
                marginTop: 2,
              }}
            >
              Elige los productos para tu orden
            </Text>
          </View>
          <Pressable
            onPress={handleClose}
            style={({ pressed }) => ({
              backgroundColor: pressed ? '#1e293b' : '#0f172a',
              width: 44,
              height: 44,
              borderRadius: 22,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: '#334155',
            })}
          >
            <Ionicons name="close" size={24} color="#94a3b8" />
          </Pressable>
        </View>

        {/* Categorías mejoradas */}
        <View style={{ paddingHorizontal: 24, paddingVertical: 16 }}>
          <Text
            style={{
              color: '#e2e8f0',
              fontSize: 16,
              fontWeight: '700',
              marginBottom: 12,
            }}
          >
            Categorías
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              {categories.map((c) => {
                const isSelected = selectedCategory === c.id;
                return (
                  <Pressable
                    key={c.id}
                    onPress={() => onSelectCategory(c.id)}
                    style={({ pressed }) => ({
                      backgroundColor: isSelected ? '#3b82f6' : '#1e293b',
                      paddingVertical: 12,
                      paddingHorizontal: 20,
                      borderRadius: 16,
                      borderWidth: isSelected ? 2 : 1,
                      borderColor: isSelected ? '#60a5fa' : '#334155',
                      opacity: pressed ? 0.8 : 1,
                      transform: [{ scale: pressed ? 0.95 : 1 }],
                      shadowColor: isSelected ? '#3b82f6' : '#000',
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: isSelected ? 0.3 : 0.1,
                      shadowRadius: 8,
                      elevation: isSelected ? 6 : 2,
                    })}
                  >
                    <Text
                      style={{
                        color: isSelected ? 'white' : '#cbd5e1',
                        fontWeight: isSelected ? '800' : '600',
                        fontSize: 15,
                      }}
                    >
                      {c.nombre || 'Categoría'}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
        </View>

        {/* 🔥 CORRECCIÓN DEFINITIVA: Contenedor de la lista con flex: 1 */}
        <View style={{ flex: 1, paddingHorizontal: 24, paddingBottom: 24 }}>
          <Text
            style={{
              color: '#e2e8f0',
              fontSize: 16,
              fontWeight: '700',
              marginBottom: 16,
            }}
          >
            Productos ({productsInCategory.length})
          </Text>

          <FlatList
            data={productsInCategory}
            keyExtractor={(item) => item.id}
            numColumns={2}
            columnWrapperStyle={{
              justifyContent: 'space-between',
              marginBottom: 16,
            }}
            contentContainerStyle={{ paddingBottom: 20 }}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={{ alignItems: 'center', paddingTop: 40 }}>
                <Ionicons name="sad-outline" size={48} color="#475569" />
                <Text
                  style={{ color: '#64748b', fontSize: 16, textAlign: 'center', marginTop: 16 }}
                >
                  No hay productos
                </Text>
              </View>
            }
            renderItem={({ item: p }) => (
              <Pressable
                onPress={() => onOpenVariant(p.id)}
                style={({ pressed }) => ({
                  width: '48%', // Simplificado para ambas plataformas
                  minHeight: 120,
                  backgroundColor: pressed ? '#1e293b' : '#111827',
                  borderRadius: 16,
                  padding: 16,
                  borderWidth: 1,
                  borderColor: '#334155',
                  opacity: pressed ? 0.9 : 1,
                  transform: [{ scale: pressed ? 0.95 : 1 }],
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.1,
                  shadowRadius: 8,
                  elevation: 3,
                })}
              >
                <View style={{ flex: 1, justifyContent: 'space-between' }}>
                  <View>
                    <Text
                      style={{
                        color: 'white',
                        fontSize: 16,
                        fontWeight: '800',
                        lineHeight: 20,
                        marginBottom: 8,
                      }}
                      numberOfLines={2}
                    >
                      {String(p?.nombre || 'Producto')}
                    </Text>
                  </View>
                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginTop: 'auto',
                    }}
                  >
                    <Text
                      style={{
                        color: '#10b981',
                        fontSize: 20,
                        fontWeight: '900',
                      }}
                    >
                      {formatMoney(p?.precio)}
                    </Text>
                    <View
                      style={{
                        backgroundColor: '#3b82f6',
                        borderRadius: 12,
                        width: 32,
                        height: 32,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Ionicons name="add" size={20} color="white" />
                    </View>
                  </View>
                </View>
              </Pressable>
            )}
          />
        </View>
      </Animated.View>
    </Animated.View>
  );
}

export const ProductPickerOverlay = React.memo(ProductPickerOverlayComponent);
