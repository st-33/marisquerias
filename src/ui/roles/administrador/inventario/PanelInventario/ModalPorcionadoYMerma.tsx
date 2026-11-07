/**
 * 🔪 MODAL DE PORCIONADO Y MERMA DE INVENTARIO
 *
 * Responsabilidad (Manos):
 * - Permitir porcionar un insumo a granel (ej. 5 kg de camarón -> 20 bolsas de 250g)
 *   registrando la disminución del granel, el aumento del insumo porcionado y su costo unitario resultante.
 * - Permitir registrar mermas o bajas operativas con motivo explícito.
 */

import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useAppTheme } from '@/compartido/temas';
import type {
  InsumoInventario,
  UnidadFisicaInventario,
  UsoArticuloInventario,
} from '../../../../../sistema/persistencia/contratos-inventario';

interface ModalPorcionadoYMermaProps {
  visible: boolean;
  modo: 'porcionar' | 'merma';
  articuloOrigen: (InsumoInventario & { id: string; stockActual?: number }) | null;
  catalogoCompleto: Array<InsumoInventario & { id: string }>;
  onClose: () => void;
  onConfirmarPorcionado: (params: {
    cantidadOrigen: number;
    itemDestinoId?: string;
    nuevoItemNombre?: string;
    nuevoItemUnidad?: UnidadFisicaInventario;
    nuevoItemUso?: UsoArticuloInventario;
    cantidadPorcionesObtenidas: number;
    mermaCantidad?: number;
  }) => Promise<void>;
  onConfirmarMerma: (params: { cantidad: number; razon: string }) => Promise<void>;
}

export function ModalPorcionadoYMerma({
  visible,
  modo,
  articuloOrigen,
  catalogoCompleto,
  onClose,
  onConfirmarPorcionado,
  onConfirmarMerma,
}: ModalPorcionadoYMermaProps) {
  const { theme } = useAppTheme();
  const c = theme.colors;

  const [cantidadOrigen, setCantidadOrigen] = useState('');
  const [cantidadPorciones, setCantidadPorciones] = useState('');
  const [mermaPorcionado, setMermaPorcionado] = useState('0');
  const [itemDestinoId, setItemDestinoId] = useState<string>('');
  const [nuevoNombreDestino, setNuevoNombreDestino] = useState('');
  const [nuevaUnidadDestino, setNuevaUnidadDestino] = useState<UnidadFisicaInventario>('pza');
  const [razonMerma, setRazonMerma] = useState('');
  const [procesando, setProcesando] = useState(false);

  useEffect(() => {
    if (!visible || !articuloOrigen) return;
    setCantidadOrigen('');
    setCantidadPorciones('');
    setMermaPorcionado('0');
    setItemDestinoId('');
    setNuevoNombreDestino(`${articuloOrigen.nombre} (Porción)`);
    setNuevaUnidadDestino('pza');
    setRazonMerma('');
  }, [visible, articuloOrigen, modo]);

  if (!articuloOrigen) return null;

  const costoOrigen = Number(articuloOrigen.costo || 0);
  const nCantOrigen = parseFloat(cantidadOrigen) || 0;
  const nPorciones = parseFloat(cantidadPorciones) || 0;
  const costoPorPorcionEstimado =
    nCantOrigen > 0 && nPorciones > 0 && costoOrigen > 0
      ? Number(((costoOrigen * nCantOrigen) / nPorciones).toFixed(2))
      : null;

  const posiblesDestinos = catalogoCompleto.filter((it) => it.id !== articuloOrigen.id);

  const handleEjecutar = async () => {
    if (procesando) return;
    setProcesando(true);
    try {
      if (modo === 'merma') {
        if (nCantOrigen <= 0) return;
        await onConfirmarMerma({
          cantidad: nCantOrigen,
          razon: razonMerma.trim() || 'Merma operativa registrada en inventario',
        });
      } else {
        if (nCantOrigen <= 0 || nPorciones <= 0) return;
        await onConfirmarPorcionado({
          cantidadOrigen: nCantOrigen,
          itemDestinoId: itemDestinoId || undefined,
          nuevoItemNombre: !itemDestinoId ? nuevoNombreDestino.trim() : undefined,
          nuevoItemUnidad: !itemDestinoId ? nuevaUnidadDestino : undefined,
          nuevoItemUso: 'ambos',
          cantidadPorcionesObtenidas: nPorciones,
          mermaCantidad: parseFloat(mermaPorcionado) || 0,
        });
      }
      onClose();
    } finally {
      setProcesando(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
          <View style={styles.headerRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons
                name={modo === 'porcionar' ? 'git-branch-outline' : 'trash-outline'}
                size={20}
                color={modo === 'porcionar' ? c.primary : c.error}
              />
              <Text style={[styles.title, { color: c.text }]}>
                {modo === 'porcionar'
                  ? `Porcionar: ${articuloOrigen.nombre}`
                  : `Registrar Merma: ${articuloOrigen.nombre}`}
              </Text>
            </View>
            <Pressable onPress={onClose}>
              <Ionicons name="close" size={22} color={c.textSecondary} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={{ gap: 12 }} nestedScrollEnabled>
            <View
              style={[
                styles.infoBanner,
                { backgroundColor: c.background, borderColor: c.border },
              ]}
            >
              <Text style={{ color: c.textSecondary, fontSize: 12 }}>
                Existencia actual:{' '}
                <Text style={{ color: c.text, fontWeight: '800' }}>
                  {articuloOrigen.stockActual ?? 0} {articuloOrigen.unidad.toUpperCase()}
                </Text>
                {costoOrigen > 0
                  ? `  •  Costo base: $${costoOrigen.toFixed(2)} / ${articuloOrigen.unidad}`
                  : ''}
              </Text>
            </View>

            <View>
              <Text style={[styles.label, { color: c.textSecondary }]}>
                {modo === 'porcionar'
                  ? `CANTIDAD A GRANEL A TOMAR (${articuloOrigen.unidad.toUpperCase()})`
                  : `CANTIDAD DE MERMA (${articuloOrigen.unidad.toUpperCase()})`}
              </Text>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: c.background, borderColor: c.border, color: c.text },
                ]}
                placeholder={`Ej. ${articuloOrigen.unidad === 'kg' ? '5' : '2'}`}
                placeholderTextColor={c.textMuted}
                keyboardType="numeric"
                value={cantidadOrigen}
                onChangeText={setCantidadOrigen}
              />
            </View>

            {modo === 'merma' ? (
              <View>
                <Text style={[styles.label, { color: c.textSecondary }]}>MOTIVO DE LA MERMA</Text>
                <TextInput
                  style={[
                    styles.input,
                    { backgroundColor: c.background, borderColor: c.border, color: c.text },
                  ]}
                  placeholder="Ej. Caducidad, derrame, limpieza de pieza..."
                  placeholderTextColor={c.textMuted}
                  value={razonMerma}
                  onChangeText={setRazonMerma}
                />
              </View>
            ) : (
              <>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.label, { color: c.textSecondary }]}>
                      PORCIONES OBTENIDAS
                    </Text>
                    <TextInput
                      style={[
                        styles.input,
                        { backgroundColor: c.background, borderColor: c.border, color: c.text },
                      ]}
                      placeholder="Ej. 20 (bolsas de 250g)"
                      placeholderTextColor={c.textMuted}
                      keyboardType="numeric"
                      value={cantidadPorciones}
                      onChangeText={setCantidadPorciones}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.label, { color: c.textSecondary }]}>
                      MERMA EN CORTE ({articuloOrigen.unidad.toUpperCase()})
                    </Text>
                    <TextInput
                      style={[
                        styles.input,
                        { backgroundColor: c.background, borderColor: c.border, color: c.text },
                      ]}
                      placeholder="0"
                      placeholderTextColor={c.textMuted}
                      keyboardType="numeric"
                      value={mermaPorcionado}
                      onChangeText={setMermaPorcionado}
                    />
                  </View>
                </View>

                <View>
                  <Text style={[styles.label, { color: c.textSecondary }]}>
                    ARTÍCULO DESTINO DE LAS PORCIONES
                  </Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: 8, paddingVertical: 4 }}
                  >
                    <Pressable
                      onPress={() => setItemDestinoId('')}
                      style={[
                        styles.destChip,
                        {
                          backgroundColor: !itemDestinoId ? `${c.primary}22` : c.background,
                          borderColor: !itemDestinoId ? c.primary : c.border,
                        },
                      ]}
                    >
                      <Text
                        style={{
                          color: !itemDestinoId ? c.primary : c.textSecondary,
                          fontWeight: '800',
                          fontSize: 12,
                        }}
                      >
                        + Crear nuevo artículo porcionado
                      </Text>
                    </Pressable>
                    {posiblesDestinos.map((dest) => {
                      const sel = itemDestinoId === dest.id;
                      return (
                        <Pressable
                          key={dest.id}
                          onPress={() => setItemDestinoId(dest.id)}
                          style={[
                            styles.destChip,
                            {
                              backgroundColor: sel ? `${c.primary}22` : c.background,
                              borderColor: sel ? c.primary : c.border,
                            },
                          ]}
                        >
                          <Text
                            style={{
                              color: sel ? c.text : c.textSecondary,
                              fontWeight: sel ? '800' : '600',
                              fontSize: 12,
                            }}
                          >
                            {dest.nombre} ({dest.unidad})
                          </Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                </View>

                {!itemDestinoId && (
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <View style={{ flex: 2 }}>
                      <Text style={[styles.label, { color: c.textSecondary }]}>
                        NOMBRE DEL ARTÍCULO PORCIONADO
                      </Text>
                      <TextInput
                        style={[
                          styles.input,
                          { backgroundColor: c.background, borderColor: c.border, color: c.text },
                        ]}
                        value={nuevoNombreDestino}
                        onChangeText={setNuevoNombreDestino}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.label, { color: c.textSecondary }]}>UNIDAD</Text>
                      <View style={{ flexDirection: 'row', gap: 6 }}>
                        {(['pza', 'kg', 'g'] as const).map((u) => (
                          <Pressable
                            key={u}
                            onPress={() => setNuevaUnidadDestino(u)}
                            style={[
                              styles.miniUnit,
                              {
                                backgroundColor:
                                  nuevaUnidadDestino === u ? c.primary : c.background,
                                borderColor: nuevaUnidadDestino === u ? c.primary : c.border,
                              },
                            ]}
                          >
                            <Text
                              style={{
                                color: nuevaUnidadDestino === u ? '#FFF' : c.textSecondary,
                                fontWeight: '800',
                                fontSize: 11,
                              }}
                            >
                              {u.toUpperCase()}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                    </View>
                  </View>
                )}

                {costoPorPorcionEstimado !== null && (
                  <View
                    style={[
                      styles.infoBanner,
                      { backgroundColor: `${c.success}18`, borderColor: c.success },
                    ]}
                  >
                    <Text style={{ color: c.success, fontWeight: '800', fontSize: 12 }}>
                      Costo calculado por porción obtenida: ${costoPorPorcionEstimado.toFixed(2)} MXN
                    </Text>
                  </View>
                )}
              </>
            )}
          </ScrollView>

          <View style={styles.actionsRow}>
            <Pressable onPress={onClose} style={[styles.cancelBtn, { borderColor: c.border }]}>
              <Text style={{ color: c.textSecondary, fontWeight: '700' }}>Cancelar</Text>
            </Pressable>
            <Pressable
              onPress={handleEjecutar}
              disabled={procesando || nCantOrigen <= 0 || (modo === 'porcionar' && nPorciones <= 0)}
              style={[
                styles.confirmBtn,
                {
                  backgroundColor:
                    nCantOrigen <= 0 || (modo === 'porcionar' && nPorciones <= 0)
                      ? c.border
                      : modo === 'porcionar'
                        ? c.primary
                        : c.error,
                },
              ]}
            >
              <Text style={{ color: '#FFFFFF', fontWeight: '800' }}>
                {procesando
                  ? 'Procesando...'
                  : modo === 'porcionar'
                    ? 'Confirmar Porcionado'
                    : 'Registrar Merma'}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  card: {
    width: '100%',
    maxWidth: 520,
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 16,
    fontWeight: '900',
  },
  infoBanner: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
  },
  label: {
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  destChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  miniUnit: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 16,
  },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
  },
  confirmBtn: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
  },
});
