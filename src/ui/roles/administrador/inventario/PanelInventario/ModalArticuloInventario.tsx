/**
 * 📦 MODAL DE CREACIÓN / EDICIÓN DE ARTÍCULO DE INVENTARIO
 *
 * Responsabilidad (Manos):
 * - Definir artículos físicos en bloques claros: Identidad, Uso Operativo, Unidad y Costo, Stock y Equivalencias.
 * - Clarificar las unidades físicas (Pieza, Kilo, Gramos, Litro, Mililitros, Paquete / Tara) sin confundir con "Caja" de cobro.
 * - Adaptado reactivamente a los temas `Elite` y `Clásico` (`useAppTheme()`).
 */

import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { listarImagenesPorOrigen, obtenerImagenProducto } from '@/compartido/catalogoImagenes';
import { theme as legacyTheme, useAppTheme } from '@/compartido/temas';
import type {
  InsumoInventario,
  UnidadFisicaInventario,
  UsoArticuloInventario,
} from '../../../../../sistema/persistencia/contratos-inventario';

interface ModalArticuloInventarioProps {
  visible: boolean;
  articuloEditar?: (InsumoInventario & { id: string }) | null;
  onClose: () => void;
  onGuardar: (
    datos: Omit<InsumoInventario, 'id' | 'updatedAt'>,
    cantidadInicial: number
  ) => Promise<void>;
}

const UNIDADES_OPCIONES: ReadonlyArray<{
  id: UnidadFisicaInventario;
  etiqueta: string;
  detalle: string;
  icono: keyof typeof Ionicons.glyphMap;
}> = [
  { id: 'kg', etiqueta: 'Kilo (kg)', detalle: 'Por peso en kilos', icono: 'scale-outline' },
  { id: 'pza', etiqueta: 'Pieza (pza)', detalle: 'Unidad individual', icono: 'cube-outline' },
  { id: 'g', etiqueta: 'Gramos (g)', detalle: 'Porciones en gramos', icono: 'analytics-outline' },
  { id: 'l', etiqueta: 'Litro (l)', detalle: 'Líquidos por litro', icono: 'water-outline' },
  { id: 'ml', etiqueta: 'Mililitros (ml)', detalle: 'Porciones líquidas', icono: 'flask-outline' },
  {
    id: 'caja',
    etiqueta: 'Paquete / Tara',
    detalle: 'Empaque cerrado o reja',
    icono: 'archive-outline',
  },
];

const USOS: Array<{
  id: UsoArticuloInventario;
  titulo: string;
  subtitulo: string;
  icono: keyof typeof Ionicons.glyphMap;
}> = [
  {
    id: 'ambos',
    titulo: 'Cocina y Mostrador',
    subtitulo: 'Se cocina en platillos y también se vende en crudo o pieza',
    icono: 'swap-horizontal-outline',
  },
  {
    id: 'venta_directa',
    titulo: 'Listo para Servir / Bebida',
    subtitulo: 'Se entrega directo al cliente (refrescos, cervezas, botellas)',
    icono: 'beer-outline',
  },
  {
    id: 'insumo',
    titulo: 'Insumo de Cocina',
    subtitulo: 'Exclusivo para preparar recetas (verduras, especias, aceite)',
    icono: 'restaurant-outline',
  },
  {
    id: 'producto_terminado',
    titulo: 'Lote Hecho en Casa',
    subtitulo: 'Postre o preparación anticipada por lote (ej. flan napolitano)',
    icono: 'layers-outline',
  },
];

export function formatearEtiquetaUnidadInventario(unidad?: string): string {
  switch (unidad) {
    case 'kg':
      return 'kg';
    case 'g':
      return 'g';
    case 'l':
      return 'L';
    case 'ml':
      return 'ml';
    case 'caja':
      return 'paq/tara';
    case 'pza':
    default:
      return 'pza';
  }
}

export function ModalArticuloInventario({
  visible,
  articuloEditar,
  onClose,
  onGuardar,
}: ModalArticuloInventarioProps) {
  const { theme } = useAppTheme();
  const c = theme.colors;

  const [nombre, setNombre] = useState('');
  const [unidad, setUnidad] = useState<UnidadFisicaInventario>('kg');
  const [uso, setUso] = useState<UsoArticuloInventario>('ambos');
  const [imagenId, setImagenId] = useState<string | undefined>(undefined);
  const [controlarExistencias, setControlarExistencias] = useState(true);
  const [cantidadInicial, setCantidadInicial] = useState('0');
  const [minStock, setMinStock] = useState('0');
  const [costo, setCosto] = useState('');
  const [proveedor, setProveedor] = useState('');

  // Equivalencias opcionales
  const [mostrarEquivalencias, setMostrarEquivalencias] = useState(false);
  const [piezasPorCaja, setPiezasPorCaja] = useState('');
  const [pesoPromedioPiezaKg, setPesoPromedioPiezaKg] = useState('');
  const [piezasPorKg, setPiezasPorKg] = useState('');
  const [esAproximado, setEsAproximado] = useState(true);

  const [guardando, setGuardando] = useState(false);

  const imagenesDisponibles = listarImagenesPorOrigen('inventario');
  const etiquetaUnidadCorta = formatearEtiquetaUnidadInventario(unidad);

  useEffect(() => {
    if (!visible) return;
    if (articuloEditar) {
      setNombre(articuloEditar.nombre || '');
      setUnidad(articuloEditar.unidad || 'kg');
      setUso(articuloEditar.uso || 'ambos');
      setImagenId(articuloEditar.imagenId);
      setControlarExistencias(articuloEditar.controlarExistencias !== false);
      setCantidadInicial('0');
      setMinStock(String(articuloEditar.minStock ?? 0));
      setCosto(
        typeof articuloEditar.costo === 'number' && articuloEditar.costo > 0
          ? String(articuloEditar.costo)
          : ''
      );
      setProveedor(articuloEditar.proveedor || '');

      const eq = articuloEditar.equivalencias;
      if (eq && (eq.piezasPorCaja || eq.pesoPromedioPiezaKg || eq.piezasPorKg)) {
        setMostrarEquivalencias(true);
        setPiezasPorCaja(eq.piezasPorCaja ? String(eq.piezasPorCaja) : '');
        setPesoPromedioPiezaKg(eq.pesoPromedioPiezaKg ? String(eq.pesoPromedioPiezaKg) : '');
        setPiezasPorKg(eq.piezasPorKg ? String(eq.piezasPorKg) : '');
        setEsAproximado(eq.esAproximado ?? true);
      } else {
        setMostrarEquivalencias(false);
        setPiezasPorCaja('');
        setPesoPromedioPiezaKg('');
        setPiezasPorKg('');
        setEsAproximado(true);
      }
    } else {
      setNombre('');
      setUnidad('kg');
      setUso('ambos');
      setImagenId(undefined);
      setControlarExistencias(true);
      setCantidadInicial('0');
      setMinStock('0');
      setCosto('');
      setProveedor('');
      setMostrarEquivalencias(false);
      setPiezasPorCaja('');
      setPesoPromedioPiezaKg('');
      setPiezasPorKg('');
      setEsAproximado(true);
    }
  }, [visible, articuloEditar]);

  const handleConfirmar = async () => {
    const nombreLimpio = nombre.trim();
    if (!nombreLimpio || guardando) return;

    setGuardando(true);
    try {
      const nPzasCaja = parseFloat(piezasPorCaja);
      const nPesoPieza = parseFloat(pesoPromedioPiezaKg);
      const nPzasKg = parseFloat(piezasPorKg);

      const tieneEq =
        mostrarEquivalencias &&
        ((!Number.isNaN(nPzasCaja) && nPzasCaja > 0) ||
          (!Number.isNaN(nPesoPieza) && nPesoPieza > 0) ||
          (!Number.isNaN(nPzasKg) && nPzasKg > 0));

      const nCosto = parseFloat(costo);

      await onGuardar(
        {
          nombre: nombreLimpio,
          unidad,
          uso,
          imagenId,
          controlarExistencias,
          minStock: parseFloat(minStock) || 0,
          costo: !Number.isNaN(nCosto) && nCosto >= 0 ? nCosto : undefined,
          proveedor: proveedor.trim() || undefined,
          equivalencias: tieneEq
            ? {
                piezasPorCaja: !Number.isNaN(nPzasCaja) && nPzasCaja > 0 ? nPzasCaja : undefined,
                pesoPromedioPiezaKg:
                  !Number.isNaN(nPesoPieza) && nPesoPieza > 0 ? nPesoPieza : undefined,
                piezasPorKg: !Number.isNaN(nPzasKg) && nPzasKg > 0 ? nPzasKg : undefined,
                esAproximado,
              }
            : undefined,
        },
        parseFloat(cantidadInicial) || 0
      );
      onClose();
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View
          style={[
            styles.card,
            { backgroundColor: c.surface, borderColor: c.borderHighlight || c.border },
          ]}
        >
          {/* ENCABEZADO */}
          <View style={[styles.headerRow, { borderBottomColor: c.border }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View
                style={[
                  styles.headerIconBox,
                  { backgroundColor: `${c.primary}20`, borderColor: `${c.primary}50` },
                ]}
              >
                <Ionicons name="cube-outline" size={20} color={c.primary} />
              </View>
              <View>
                <Text
                  style={[
                    styles.title,
                    { color: c.text, fontFamily: legacyTheme.typography.displayFamily },
                  ]}
                >
                  {articuloEditar ? 'Editar Artículo de Inventario' : 'Nuevo Artículo de Inventario'}
                </Text>
                <Text style={{ color: c.textSecondary, fontSize: 12 }}>
                  Define cómo se compra, en qué unidad se mide y cómo se usa en el negocio
                </Text>
              </View>
            </View>
            <Pressable
              onPress={onClose}
              style={[styles.closeBtn, { backgroundColor: c.background, borderColor: c.border }]}
            >
              <Ionicons name="close" size={20} color={c.textSecondary} />
            </Pressable>
          </View>

          <ScrollView
            style={styles.scrollBody}
            contentContainerStyle={{ gap: 14, paddingBottom: 14 }}
            nestedScrollEnabled
          >
            {/* BLOQUE 1: IDENTIDAD E IMAGEN */}
            <View
              style={[
                styles.sectionCard,
                { backgroundColor: c.cardElevated || c.background, borderColor: c.border },
              ]}
            >
              <Text style={[styles.sectionBadge, { color: c.primary }]}>
                1. IDENTIDAD Y PRESENTACIÓN VISUAL
              </Text>

              <Text style={[styles.label, { color: c.textSecondary }]}>NOMBRE DEL ARTÍCULO</Text>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: c.surface, borderColor: c.border, color: c.text },
                ]}
                placeholder="Ej. Camarón Cristal, Filete de Pescado, Coca-Cola 600ml..."
                placeholderTextColor={c.textMuted}
                value={nombre}
                onChangeText={setNombre}
              />

              <Text style={[styles.label, { color: c.textSecondary, marginTop: 12 }]}>
                IMAGEN TRANSPARENTE (OPCIONAL)
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 10, paddingVertical: 4 }}
              >
                <Pressable
                  onPress={() => setImagenId(undefined)}
                  style={[
                    styles.imgChip,
                    {
                      backgroundColor: !imagenId ? `${c.primary}20` : c.surface,
                      borderColor: !imagenId ? c.primary : c.border,
                    },
                  ]}
                >
                  <Ionicons name="cube-outline" size={26} color={c.textSecondary} />
                  <Text style={{ color: c.textSecondary, fontSize: 11, marginTop: 4 }}>
                    Genérico
                  </Text>
                </Pressable>

                {imagenesDisponibles.map((img) => {
                  const seleccionada = imagenId === img.id;
                  const src = obtenerImagenProducto(img.id, undefined, 'inventario');
                  return (
                    <Pressable
                      key={img.id}
                      onPress={() => setImagenId(img.id)}
                      style={[
                        styles.imgChip,
                        {
                          backgroundColor: seleccionada ? `${c.primary}22` : c.surface,
                          borderColor: seleccionada ? c.primary : c.border,
                        },
                      ]}
                    >
                      {src && (
                        <Image
                          source={src}
                          style={{ width: 42, height: 42, resizeMode: 'contain' }}
                        />
                      )}
                      <Text
                        numberOfLines={1}
                        style={{
                          color: seleccionada ? c.text : c.textSecondary,
                          fontSize: 11,
                          fontWeight: seleccionada ? '800' : '600',
                          marginTop: 4,
                        }}
                      >
                        {img.etiqueta}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            {/* BLOQUE 2: DESTINO OPERATIVO */}
            <View
              style={[
                styles.sectionCard,
                { backgroundColor: c.cardElevated || c.background, borderColor: c.border },
              ]}
            >
              <Text style={[styles.sectionBadge, { color: c.primary }]}>
                2. ¿CÓMO SE UTILIZA EN EL NEGOCIO?
              </Text>
              <View style={styles.usosGrid}>
                {USOS.map((op) => {
                  const activo = uso === op.id;
                  return (
                    <Pressable
                      key={op.id}
                      onPress={() => setUso(op.id)}
                      style={[
                        styles.usoChip,
                        {
                          backgroundColor: activo ? `${c.primary}20` : c.surface,
                          borderColor: activo ? c.primary : c.border,
                        },
                      ]}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Ionicons
                          name={op.icono}
                          size={18}
                          color={activo ? c.primary : c.textSecondary}
                        />
                        <Text
                          style={{
                            color: activo ? c.text : c.textSecondary,
                            fontWeight: '800',
                            fontSize: 13,
                            flex: 1,
                          }}
                        >
                          {op.titulo}
                        </Text>
                      </View>
                      <Text
                        style={{
                          color: c.textSecondary,
                          fontSize: 11,
                          marginTop: 4,
                          lineHeight: 15,
                        }}
                      >
                        {op.subtitulo}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* BLOQUE 3: UNIDAD DE MEDIDA Y COSTO DE COMPRA */}
            <View
              style={[
                styles.sectionCard,
                { backgroundColor: c.cardElevated || c.background, borderColor: c.border },
              ]}
            >
              <Text style={[styles.sectionBadge, { color: c.primary }]}>
                3. UNIDAD DE MEDIDA Y COSTO DE COMPRA
              </Text>

              <Text style={[styles.label, { color: c.textSecondary }]}>
                ¿CÓMO LO MIDES Y REGISTRAS EN ALMACÉN?
              </Text>
              <View style={styles.unitsGrid}>
                {UNIDADES_OPCIONES.map((u) => {
                  const activo = unidad === u.id;
                  return (
                    <Pressable
                      key={u.id}
                      onPress={() => setUnidad(u.id)}
                      style={[
                        styles.unitBtn,
                        {
                          backgroundColor: activo ? c.primary : c.surface,
                          borderColor: activo ? c.primary : c.border,
                        },
                      ]}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Ionicons
                          name={u.icono}
                          size={15}
                          color={activo ? '#FFFFFF' : c.primary}
                        />
                        <Text
                          style={{
                            color: activo ? '#FFFFFF' : c.text,
                            fontWeight: '800',
                            fontSize: 12,
                          }}
                        >
                          {u.etiqueta}
                        </Text>
                      </View>
                      <Text
                        style={{
                          color: activo ? 'rgba(255,255,255,0.85)' : c.textMuted,
                          fontSize: 10,
                          marginTop: 2,
                        }}
                      >
                        {u.detalle}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <View style={[styles.twoCol, { marginTop: 12 }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.label, { color: c.textSecondary }]}>
                    COSTO DE COMPRA POR {etiquetaUnidadCorta.toUpperCase()} ($)
                  </Text>
                  <TextInput
                    style={[
                      styles.input,
                      { backgroundColor: c.surface, borderColor: c.border, color: c.text },
                    ]}
                    placeholder="Ej. 165.00"
                    placeholderTextColor={c.textMuted}
                    keyboardType="numeric"
                    value={costo}
                    onChangeText={setCosto}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={[styles.label, { color: c.textSecondary }]}>
                    AVISAR CUANDO QUEDEN MENOS DE ({etiquetaUnidadCorta.toUpperCase()})
                  </Text>
                  <TextInput
                    style={[
                      styles.input,
                      { backgroundColor: c.surface, borderColor: c.border, color: c.text },
                    ]}
                    placeholder="Ej. 5"
                    placeholderTextColor={c.textMuted}
                    keyboardType="numeric"
                    value={minStock}
                    onChangeText={setMinStock}
                  />
                </View>
              </View>
            </View>

            {/* BLOQUE 4: CONTROL DE STOCK Y EQUIVALENCIAS */}
            <View
              style={[
                styles.sectionCard,
                { backgroundColor: c.cardElevated || c.background, borderColor: c.border },
              ]}
            >
              <Text style={[styles.sectionBadge, { color: c.primary }]}>
                4. EXISTENCIAS Y EQUIVALENCIAS APROXIMADAS
              </Text>

              <View
                style={[
                  styles.switchBox,
                  {
                    backgroundColor: c.surface,
                    borderColor: controlarExistencias ? c.success : c.border,
                  },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={{ color: c.text, fontWeight: '800', fontSize: 13 }}>
                      Descontar stock automáticamente al vender
                    </Text>
                    <View
                      style={{
                        backgroundColor: controlarExistencias ? `${c.success}22` : `${c.warning}22`,
                        paddingHorizontal: 8,
                        paddingVertical: 2,
                        borderRadius: 999,
                      }}
                    >
                      <Text
                        style={{
                          color: controlarExistencias ? c.success : c.warning,
                          fontSize: 10,
                          fontWeight: '900',
                        }}
                      >
                        {controlarExistencias ? 'ACTIVADO' : 'LIBRE'}
                      </Text>
                    </View>
                  </View>
                  <Text style={{ color: c.textSecondary, fontSize: 11, marginTop: 3 }}>
                    {controlarExistencias
                      ? 'Se lleva conteo exacto en almacén y avisa cuando se agota.'
                      : 'Modo libre: no bloquea ventas aunque no hayas capturado entradas.'}
                  </Text>
                </View>
                <Switch
                  value={controlarExistencias}
                  onValueChange={setControlarExistencias}
                  trackColor={{ false: '#334155', true: c.success }}
                />
              </View>

              {!articuloEditar && controlarExistencias && (
                <View style={{ marginTop: 12 }}>
                  <Text style={[styles.label, { color: c.textSecondary }]}>
                    CANTIDAD ACTUAL EN EXISTENCIA ({etiquetaUnidadCorta.toUpperCase()})
                  </Text>
                  <TextInput
                    style={[
                      styles.input,
                      { backgroundColor: c.surface, borderColor: c.border, color: c.text },
                    ]}
                    placeholder="Ej. 20"
                    placeholderTextColor={c.textMuted}
                    keyboardType="numeric"
                    value={cantidadInicial}
                    onChangeText={setCantidadInicial}
                  />
                </View>
              )}

              {/* Equivalencias desplegables */}
              <View
                style={[
                  styles.eqSection,
                  { backgroundColor: c.surface, borderColor: c.border, marginTop: 12 },
                ]}
              >
                <Pressable
                  onPress={() => setMostrarEquivalencias((v) => !v)}
                  style={styles.eqHeader}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                    <Ionicons name="calculator-outline" size={18} color={c.primary} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: c.text, fontWeight: '800', fontSize: 13 }}>
                        Conversión aproximada (Kilo ↔ Piezas / Paquete)
                      </Text>
                      <Text style={{ color: c.textSecondary, fontSize: 11 }}>
                        Útil si compras por kilo o paquete pero en cocina recetan por pieza
                      </Text>
                    </View>
                  </View>
                  <Ionicons
                    name={mostrarEquivalencias ? 'chevron-up' : 'chevron-down'}
                    size={18}
                    color={c.textSecondary}
                  />
                </Pressable>

                {mostrarEquivalencias && (
                  <View style={{ marginTop: 12, gap: 10 }}>
                    <View style={styles.twoCol}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.label, { color: c.textSecondary }]}>
                          PIEZAS POR KILO (APROX.)
                        </Text>
                        <TextInput
                          style={[
                            styles.input,
                            { backgroundColor: c.background, borderColor: c.border, color: c.text },
                          ]}
                          placeholder="Ej. 3 mojarras por kg"
                          placeholderTextColor={c.textMuted}
                          keyboardType="numeric"
                          value={piezasPorKg}
                          onChangeText={setPiezasPorKg}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.label, { color: c.textSecondary }]}>
                          PESO PROMEDIO DE 1 PIEZA (KG)
                        </Text>
                        <TextInput
                          style={[
                            styles.input,
                            { backgroundColor: c.background, borderColor: c.border, color: c.text },
                          ]}
                          placeholder="Ej. 0.35"
                          placeholderTextColor={c.textMuted}
                          keyboardType="numeric"
                          value={pesoPromedioPiezaKg}
                          onChangeText={setPesoPromedioPiezaKg}
                        />
                      </View>
                    </View>
                    <View style={styles.twoCol}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.label, { color: c.textSecondary }]}>
                          PIEZAS POR PAQUETE / TARA
                        </Text>
                        <TextInput
                          style={[
                            styles.input,
                            { backgroundColor: c.background, borderColor: c.border, color: c.text },
                          ]}
                          placeholder="Ej. 24"
                          placeholderTextColor={c.textMuted}
                          keyboardType="numeric"
                          value={piezasPorCaja}
                          onChangeText={setPiezasPorCaja}
                        />
                      </View>
                      <View
                        style={{
                          flex: 1,
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          paddingTop: 14,
                        }}
                      >
                        <Text style={{ color: c.textSecondary, fontSize: 12, fontWeight: '700' }}>
                          Medida estimada
                        </Text>
                        <Switch
                          value={esAproximado}
                          onValueChange={setEsAproximado}
                          trackColor={{ false: '#334155', true: c.warning }}
                        />
                      </View>
                    </View>
                  </View>
                )}
              </View>
            </View>
          </ScrollView>

          <View style={[styles.actionsRow, { borderTopColor: c.border }]}>
            <Pressable
              onPress={onClose}
              style={[styles.cancelBtn, { borderColor: c.border, backgroundColor: c.background }]}
            >
              <Text style={{ color: c.textSecondary, fontWeight: '800' }}>Cancelar</Text>
            </Pressable>
            <Pressable
              onPress={handleConfirmar}
              disabled={!nombre.trim() || guardando}
              style={[
                styles.confirmBtn,
                {
                  backgroundColor: !nombre.trim() ? c.border : c.primary,
                },
              ]}
            >
              <Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" />
              <Text style={{ color: '#FFFFFF', fontWeight: '900', fontSize: 14 }}>
                {guardando ? 'Guardando...' : articuloEditar ? 'Guardar Cambios' : 'Guardar Artículo'}
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
    backgroundColor: 'rgba(2, 6, 23, 0.82)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  card: {
    width: '100%',
    maxWidth: 660,
    maxHeight: '92%',
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 14,
    marginBottom: 14,
    borderBottomWidth: 1,
  },
  headerIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 19,
    fontWeight: '900',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollBody: {
    maxHeight: 540,
  },
  sectionCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
  },
  sectionBadge: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  label: {
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: '600',
  },
  usosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  usoChip: {
    width: '48%',
    minWidth: 220,
    flexGrow: 1,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  unitsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  unitBtn: {
    width: '31%',
    minWidth: 145,
    flexGrow: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  twoCol: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  switchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 12,
  },
  eqSection: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  eqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  imgChip: {
    width: 92,
    height: 78,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    paddingTop: 14,
    marginTop: 10,
    borderTopWidth: 1,
  },
  cancelBtn: {
    paddingVertical: 11,
    paddingHorizontal: 18,
    borderRadius: 10,
    borderWidth: 1,
  },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 11,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
});
