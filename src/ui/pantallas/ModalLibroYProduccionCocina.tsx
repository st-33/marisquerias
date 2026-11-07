/**
 * 📖 MODAL DEL LIBRO DE PLATILLOS Y PRODUCCIÓN DE COCINA
 *
 * Responsabilidad (Manos):
 * - Interfaz visual, rápida y pensada para humanos en tableta/móvil.
 * - Consultar, crear y editar platillos (`por_pedido` vs `produccion_anticipada`) sin recortes horizontales ni estaciones inventadas.
 * - Seleccionar ingredientes existentes en Inventario, estimar el consumo de gas por nivel de flama (`sin_fuego`, `baja`, `media`, `alta`) y calcular el costo real por porción o lote.
 * - Ejecutar la Producción por lotes (ej. 1 molde = 8 flanes) con respuesta instantánea Offline-First.
 */

import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  BORRADOR_PLATILLO_INICIAL,
  guardarBorradorPlatilloEnSesion,
  obtenerBorradorPlatilloGuardado,
  useLibroPlatillosYProduccion,
  type BorradorPlatilloCocina,
} from '../../capacidades/cocina/useLibroPlatillosYProduccion';
import { listarImagenesPorOrigen, obtenerImagenProducto } from '../../compartido/catalogoImagenes';
import { theme, useAppTheme } from '../../compartido/temas';
import {
  esArticuloInsumoCocina,
  type UnidadFisicaInventario,
} from '../../sistema/persistencia/inventario.repositorio';
import type {
  LoteProduccionCocina,
  NivelFlamaCoccion,
  PlatilloCocina,
  UnidadRendimientoPlatillo,
} from '../../sistema/persistencia/platillos.repositorio';

interface ModalLibroYProduccionCocinaProps {
  visible: boolean;
  pestanaInicial?: 'libro' | 'produccion';
  onClose: () => void;
}

const UNIDADES_RECETA: readonly UnidadFisicaInventario[] = ['kg', 'g', 'pza', 'l', 'ml', 'caja'];
const UNIDADES_RENDIMIENTO: Array<{ id: UnidadRendimientoPlatillo; label: string }> = [
  { id: 'porcion', label: 'Platillo / Porción' },
  { id: 'pza', label: 'Piezas (Pza)' },
  { id: 'kg', label: 'Kilos (Kg)' },
  { id: 'l', label: 'Litros (L)' },
];

const NIVELES_FLAMA: Array<{
  id: NivelFlamaCoccion;
  label: string;
  sub: string;
  icon: string;
}> = [
  { id: 'sin_fuego', label: 'En frío (Sin gas)', sub: 'Ceviches, cocteles, ensaladas', icon: '❄️' },
  { id: 'baja', label: 'Flama Baja', sub: 'Hervor suave / baño maría', icon: '🕯️' },
  { id: 'media', label: 'Flama Media', sub: 'Sartén, plancha o caldo', icon: '🔥' },
  { id: 'alta', label: 'Flama Alta', sub: 'Fritura profunda / cazo', icon: '🌋' },
];

export function ModalLibroYProduccionCocina({
  visible,
  pestanaInicial = 'libro',
  onClose,
}: ModalLibroYProduccionCocinaProps) {
  const { colors: c } = useAppTheme();
  const router = useRouter();

  const {
    platillos,
    lotes,
    lotesActivos,
    estacionesDisponibles,
    tarifasGas,
    catalogoInventario,
    stockConsolidadoPorItem,
    calcularCosteoBorrador,
    actions,
  } = useLibroPlatillosYProduccion();

  const [pestana, setPestana] = useState<'libro' | 'produccion'>(pestanaInicial);
  const [editando, setEditando] = useState(false);
  const [borrador, setBorrador] = useState<BorradorPlatilloCocina>(BORRADOR_PLATILLO_INICIAL);
  const [guardando, setGuardando] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [busquedaInsumo, setBusquedaInsumo] = useState('');
  const [mostrarAjusteGas, setMostrarAjusteGas] = useState(false);

  // Selector rápido de ingrediente
  const [insumoSeleccionadoId, setInsumoSeleccionadoId] = useState<string>('');
  const [cantidadInsumo, setCantidadInsumo] = useState<string>('');
  const [unidadInsumo, setUnidadInsumo] = useState<UnidadFisicaInventario>('g');

  // Sub-modales de lote de producción
  const [platilloParaLote, setPlatilloParaLote] = useState<PlatilloCocina | null>(null);
  const [multiplicadorLote, setMultiplicadorLote] = useState<string>('1');
  const [loteParaCompletar, setLoteParaCompletar] = useState<LoteProduccionCocina | null>(null);
  const [rendimientoRealInput, setRendimientoRealInput] = useState<string>('');
  const [motivoDiferenciaInput, setMotivoDiferenciaInput] = useState<string>('');

  useEffect(() => {
    if (!visible) return;
    setPestana(pestanaInicial);
    const guardado = obtenerBorradorPlatilloGuardado();
    if (guardado) {
      setBorrador(guardado);
      setEditando(true);
    }
  }, [visible, pestanaInicial]);

  const insumosElegibles = useMemo(() => {
    return Object.values(catalogoInventario || {})
      .filter(
        (it) =>
          esArticuloInsumoCocina(it) &&
          it.nombre.toLowerCase().includes(busquedaInsumo.toLowerCase())
      )
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [catalogoInventario, busquedaInsumo]);

  const costeoBorrador = useMemo(
    () => calcularCosteoBorrador(borrador),
    [borrador, calcularCosteoBorrador]
  );

  // Solo mostrar imágenes de platillos si existen en el catálogo dedicado
  const imagenesPlatillos = useMemo(() => {
    return listarImagenesPorOrigen('platillos');
  }, []);

  const abrirNuevoPlatillo = () => {
    setErrorMsg(null);
    setBorrador({
      ...BORRADOR_PLATILLO_INICIAL,
      estacionPreparacion: estacionesDisponibles[0] || 'Cocina Principal',
    });
    guardarBorradorPlatilloEnSesion(null);
    setEditando(true);
  };

  const abrirEdicionPlatillo = (platillo: PlatilloCocina) => {
    setErrorMsg(null);
    const nextBorrador: BorradorPlatilloCocina = {
      id: platillo.id,
      nombre: platillo.nombre,
      descripcion: platillo.descripcion || '',
      imagenId: platillo.imagenId,
      modoPreparacion: platillo.modoPreparacion || 'por_pedido',
      rendimientoCantidad: String(platillo.rendimiento?.cantidad || 1),
      rendimientoUnidad: platillo.rendimiento?.unidad || 'porcion',
      rendimientoDescripcion: platillo.rendimiento?.descripcion || '',
      ingredientes: { ...(platillo.ingredientes || {}) },
      procedimientoTexto: (platillo.procedimiento || []).join('\n'),
      prepMin: String(platillo.prepMin ?? 15),
      nivelFlama: platillo.nivelFlama || 'media',
      minutosCoccion: String(platillo.minutosCoccion ?? platillo.prepMin ?? 10),
      estacionPreparacion:
        platillo.estacionPreparacion || estacionesDisponibles[0] || 'Cocina Principal',
      areaPreparacionId: platillo.areaPreparacionId,
      activo: platillo.activo !== false,
    };
    setBorrador(nextBorrador);
    setEditando(true);
  };

  const handleAgregarIngrediente = () => {
    if (!insumoSeleccionadoId) return;
    const cant = parseFloat(cantidadInsumo);
    if (Number.isNaN(cant) || cant <= 0) return;

    setBorrador((prev) => ({
      ...prev,
      ingredientes: {
        ...prev.ingredientes,
        [insumoSeleccionadoId]: {
          itemId: insumoSeleccionadoId,
          cantidad: cant,
          unidad: unidadInsumo,
        },
      },
    }));
    setCantidadInsumo('');
  };

  const handleQuitarIngrediente = (itemId: string) => {
    setBorrador((prev) => {
      const copia = { ...prev.ingredientes };
      delete copia[itemId];
      return { ...prev, ingredientes: copia };
    });
  };

  const handleIrAInventario = () => {
    guardarBorradorPlatilloEnSesion(borrador);
    onClose();
    router.push('/_role/admin/inventario' as any);
  };

  const handleGuardarPlatillo = async () => {
    setErrorMsg(null);
    if (!borrador.nombre.trim()) {
      setErrorMsg('Escribe el nombre del platillo.');
      return;
    }
    setGuardando(true);
    try {
      await actions.guardarPlatilloDesdeBorrador(borrador);
      setEditando(false);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error al guardar el platillo.');
    } finally {
      setGuardando(false);
    }
  };

  const handleIniciarLote = async () => {
    if (!platilloParaLote) return;
    setErrorMsg(null);
    const mult = parseFloat(multiplicadorLote) || 1;
    setGuardando(true);
    try {
      await actions.iniciarLote({
        platillo: platilloParaLote,
        multiplicadorLote: mult,
        allowNegative: false,
      });
      setPlatilloParaLote(null);
      setPestana('produccion');
    } catch (err: any) {
      setErrorMsg(err?.message || 'No se pudo iniciar el lote de producción.');
    } finally {
      setGuardando(false);
    }
  };

  const handleCompletarLote = async () => {
    if (!loteParaCompletar) return;
    setErrorMsg(null);
    const real = parseFloat(rendimientoRealInput);
    if (Number.isNaN(real) || real < 0) {
      setErrorMsg('Ingresa la cantidad real obtenida.');
      return;
    }
    setGuardando(true);
    try {
      await actions.completarLote({
        loteId: loteParaCompletar.id,
        rendimientoObtenido: real,
        motivoDiferencia: motivoDiferenciaInput.trim() || undefined,
      });
      setLoteParaCompletar(null);
      setRendimientoRealInput('');
      setMotivoDiferenciaInput('');
    } catch (err: any) {
      setErrorMsg(err?.message || 'No se pudo completar el lote.');
    } finally {
      setGuardando(false);
    }
  };

  const sugerenciasPorcionesRapidas = useMemo(() => {
    if (!insumoSeleccionadoId) return [];
    if (unidadInsumo === 'g') return ['100', '150', '200', '250'];
    if (unidadInsumo === 'kg') return ['0.15', '0.25', '0.5', '1'];
    if (unidadInsumo === 'pza') return ['1', '2', '3', '5'];
    if (unidadInsumo === 'ml') return ['30', '60', '120', '250'];
    return ['1', '2'];
  }, [insumoSeleccionadoId, unidadInsumo]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View
          style={[
            styles.container,
            { backgroundColor: c.backgroundSecondary, borderColor: c.borderLight },
          ]}
        >
          {/* BARRA SUPERIOR */}
          <View style={[styles.header, { backgroundColor: c.surface, borderColor: c.border }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
              <View style={[styles.headerIconBox, { backgroundColor: `${c.primary}20` }]}>
                <Ionicons name="book-outline" size={22} color={c.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.headerTitle, { color: c.text }]}>
                  Recetario de Cocina y Lotes
                </Text>
                <Text style={{ color: c.textSecondary, fontSize: 13 }}>
                  Platillos al momento, postres por molde, porciones e insumos con estimado de gas
                </Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View
                style={[styles.tabsPill, { backgroundColor: c.surfaceDark, borderColor: c.border }]}
              >
                <Pressable
                  onPress={() => {
                    setPestana('libro');
                    setEditando(false);
                  }}
                  style={[
                    styles.tabOption,
                    pestana === 'libro' && { backgroundColor: c.primary },
                  ]}
                >
                  <Ionicons
                    name="restaurant-outline"
                    size={15}
                    color={pestana === 'libro' ? c.background : c.textSecondary}
                  />
                  <Text
                    style={{
                      color: pestana === 'libro' ? c.background : c.textSecondary,
                      fontWeight: '800',
                      fontSize: 13,
                    }}
                  >
                    Platillos ({platillos.length})
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => {
                    setPestana('produccion');
                    setEditando(false);
                  }}
                  style={[
                    styles.tabOption,
                    pestana === 'produccion' && { backgroundColor: c.primary },
                  ]}
                >
                  <Ionicons
                    name="layers-outline"
                    size={15}
                    color={pestana === 'produccion' ? c.background : c.textSecondary}
                  />
                  <Text
                    style={{
                      color: pestana === 'produccion' ? c.background : c.textSecondary,
                      fontWeight: '800',
                      fontSize: 13,
                    }}
                  >
                    Lotes ({lotesActivos.length})
                  </Text>
                </Pressable>
              </View>

              <Pressable onPress={onClose} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color={c.textSecondary} />
              </Pressable>
            </View>
          </View>

          {errorMsg && (
            <View
              style={[
                styles.errorBanner,
                { backgroundColor: `${c.error}20`, borderColor: c.error },
              ]}
            >
              <Ionicons name="alert-circle" size={18} color={c.error} />
              <Text style={{ color: c.error, fontWeight: '700', fontSize: 13, flex: 1 }}>
                {errorMsg}
              </Text>
              <Pressable onPress={() => setErrorMsg(null)}>
                <Ionicons name="close" size={18} color={c.error} />
              </Pressable>
            </View>
          )}

          {/* LISTADO VISUAL DE PLATILLOS */}
          {pestana === 'libro' && !editando && (
            <View style={{ flex: 1, padding: 16 }}>
              <View style={styles.toolbarRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Pressable
                    onPress={() => setMostrarAjusteGas((v) => !v)}
                    style={[
                      styles.secondaryBtn,
                      {
                        backgroundColor: mostrarAjusteGas ? `${c.accent}20` : c.surface,
                        borderColor: mostrarAjusteGas ? c.accent : c.borderLight,
                      },
                    ]}
                  >
                    <Ionicons name="flame-outline" size={16} color={c.accent} />
                    <Text style={{ color: c.text, fontWeight: '700', fontSize: 13 }}>
                      Costo aprox. de Gas
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={handleIrAInventario}
                    style={[
                      styles.secondaryBtn,
                      { backgroundColor: c.surface, borderColor: c.borderLight },
                    ]}
                  >
                    <Ionicons name="cube-outline" size={16} color={c.primary} />
                    <Text style={{ color: c.text, fontWeight: '700', fontSize: 13 }}>
                      Ver Inventario
                    </Text>
                  </Pressable>
                </View>

                {platillos.length > 0 && (
                  <Pressable
                    onPress={abrirNuevoPlatillo}
                    style={[styles.primaryBtn, { backgroundColor: c.primary }]}
                  >
                    <Ionicons name="add-circle-outline" size={18} color={c.background} />
                    <Text style={{ color: c.background, fontWeight: '800', fontSize: 13 }}>
                      Nuevo Platillo / Receta
                    </Text>
                  </Pressable>
                )}
              </View>

              {/* Configurador desplegable de tarifas aproximadas de gas */}
              {mostrarAjusteGas && (
                <View
                  style={[
                    styles.gasConfigPanel,
                    { backgroundColor: c.cardElevated, borderColor: c.borderLight },
                  ]}
                >
                  <View style={{ flex: 1, minWidth: 220 }}>
                    <Text style={{ color: c.text, fontWeight: '800', fontSize: 14 }}>
                      🔥 Costo estimado de Gas LP por minuto de cocción
                    </Text>
                    <Text style={{ color: c.textSecondary, fontSize: 12, marginTop: 2 }}>
                      Ajusta estos valores aproximados según tu gasto real de gas en cocina:
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
                    {[
                      { key: 'bajaPorMin' as const, label: 'Flama Baja ($/min)' },
                      { key: 'mediaPorMin' as const, label: 'Flama Media ($/min)' },
                      { key: 'altaPorMin' as const, label: 'Flama Alta ($/min)' },
                    ].map((item) => (
                      <View key={item.key} style={{ width: 135 }}>
                        <Text style={{ color: c.textMuted, fontSize: 11, fontWeight: '700', marginBottom: 4 }}>
                          {item.label}
                        </Text>
                        <TextInput
                          style={[
                            styles.inputCompact,
                            { backgroundColor: c.surface, borderColor: c.border, color: c.text },
                          ]}
                          keyboardType="decimal-pad"
                          defaultValue={String(tarifasGas[item.key])}
                          onEndEditing={(e) => {
                            const val = parseFloat(e.nativeEvent.text);
                            if (!Number.isNaN(val) && val >= 0) {
                              actions.actualizarTarifasGas({ [item.key]: val });
                            }
                          }}
                        />
                      </View>
                    ))}
                  </View>
                </View>
              )}

              <ScrollView
                style={{ flex: 1, marginTop: 12 }}
                contentContainerStyle={{ gap: 12, paddingBottom: 24 }}
                nestedScrollEnabled
                showsVerticalScrollIndicator={false}
              >
                {platillos.length === 0 ? (
                  <View
                    style={[
                      styles.emptyCard,
                      { backgroundColor: c.cardElevated, borderColor: c.borderLight },
                    ]}
                  >
                    <Ionicons name="restaurant-outline" size={44} color={c.primary} />
                    <Text style={{ color: c.text, fontWeight: '900', fontSize: 18, marginTop: 8 }}>
                      Aún no hay platillos registrados
                    </Text>
                    <Text
                      style={{
                        color: c.textSecondary,
                        fontSize: 14,
                        textAlign: 'center',
                        maxWidth: 460,
                        marginTop: 4,
                      }}
                    >
                      Agrega las recetas de tu cocina (porciones de camarón, filete, pulpo o flanes por molde) para conocer su costo real y publicarlas en el Menú.
                    </Text>
                    <Pressable
                      onPress={abrirNuevoPlatillo}
                      style={[
                        styles.primaryBtn,
                        { backgroundColor: c.primary, marginTop: 16, paddingHorizontal: 22 },
                      ]}
                    >
                      <Ionicons name="add-circle" size={18} color={c.background} />
                      <Text style={{ color: c.background, fontWeight: '800', fontSize: 14 }}>
                        Agregar Primer Platillo
                      </Text>
                    </Pressable>
                  </View>
                ) : (
                  <View style={styles.dishesGrid}>
                    {platillos.map((pl) => {
                      const esAnticipada = pl.modoPreparacion === 'produccion_anticipada';
                      const numIngredientes = Object.keys(pl.ingredientes || {}).length;
                      return (
                        <View
                          key={pl.id}
                          style={[
                            styles.dishCard,
                            { backgroundColor: c.cardElevated, borderColor: c.borderLight },
                          ]}
                        >
                          <View style={{ flex: 1, gap: 6 }}>
                            <View style={styles.dishCardHeader}>
                              <Text
                                style={{ color: c.text, fontWeight: '800', fontSize: 16, flex: 1 }}
                                numberOfLines={1}
                              >
                                {pl.nombre}
                              </Text>
                              <View
                                style={[
                                  styles.costPill,
                                  {
                                    backgroundColor: `${c.primary}20`,
                                    borderColor: `${c.primary}55`,
                                  },
                                ]}
                              >
                                <Text style={{ color: c.primaryLight, fontWeight: '800', fontSize: 13 }}>
                                  Sale en ~${pl.costeo.costoPorUnidadRendimiento.toFixed(0)}
                                </Text>
                              </View>
                            </View>

                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                              <View
                                style={{
                                  backgroundColor: esAnticipada ? `${c.accent}20` : `${c.primary}18`,
                                  paddingHorizontal: 8,
                                  paddingVertical: 3,
                                  borderRadius: 6,
                                }}
                              >
                                <Text
                                  style={{
                                    color: esAnticipada ? c.accent : c.primaryLight,
                                    fontSize: 11,
                                    fontWeight: '800',
                                  }}
                                >
                                  {esAnticipada
                                    ? `🍮 Lote (${pl.rendimiento.cantidad} ${pl.rendimiento.unidad})`
                                    : '🍳 Al momento'}
                                </Text>
                              </View>

                              <Text style={{ color: c.textSecondary, fontSize: 12, fontWeight: '600' }}>
                                ⏱ ~{pl.prepMin} min · {numIngredientes}{' '}
                                {numIngredientes === 1 ? 'insumo' : 'insumos'}
                                {pl.costeo.costoGasEstimado > 0
                                  ? ` · 🔥 Gas ~$${pl.costeo.costoGasEstimado.toFixed(1)}`
                                  : ''}
                              </Text>
                            </View>

                            <View style={styles.dishCardFooter}>
                              <Text style={{ color: c.textMuted, fontSize: 12 }}>
                                Alcanza para:{' '}
                                <Text style={{ color: c.text, fontWeight: '800' }}>
                                  {pl.costeo.capacidadProduccionUnidades} {pl.rendimiento.unidad}
                                </Text>
                              </Text>

                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                {esAnticipada && (
                                  <Pressable
                                    onPress={() => {
                                      setPlatilloParaLote(pl);
                                      setMultiplicadorLote('1');
                                    }}
                                    style={[
                                      styles.smallActionBtn,
                                      { backgroundColor: c.accent },
                                    ]}
                                  >
                                    <Ionicons name="flame" size={14} color="#000" />
                                    <Text style={{ color: '#000', fontWeight: '800', fontSize: 12 }}>
                                      Cocinar Lote
                                    </Text>
                                  </Pressable>
                                )}

                                <Pressable
                                  onPress={() => abrirEdicionPlatillo(pl)}
                                  style={[
                                    styles.iconActionBtn,
                                    { backgroundColor: c.surface, borderColor: c.border },
                                  ]}
                                >
                                  <Ionicons name="create-outline" size={17} color={c.primaryLight} />
                                </Pressable>

                                <Pressable
                                  onPress={() => actions.eliminarPlatillo(pl.id)}
                                  style={[
                                    styles.iconActionBtn,
                                    { backgroundColor: c.surface, borderColor: c.border },
                                  ]}
                                >
                                  <Ionicons name="trash-outline" size={17} color={c.error} />
                                </Pressable>
                              </View>
                            </View>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                )}
              </ScrollView>
            </View>
          )}

          {/* EDITOR HUMANO Y COMPACTO DE PLATILLO */}
          {pestana === 'libro' && editando && (
            <View style={{ flex: 1 }}>
              <ScrollView
                style={{ flex: 1, paddingHorizontal: 18, paddingTop: 14 }}
                contentContainerStyle={{ gap: 14, paddingBottom: 24 }}
                nestedScrollEnabled
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.editorTopBar}>
                  <Text style={{ color: c.text, fontWeight: '900', fontSize: 18 }}>
                    {borrador.id ? `Editar: ${borrador.nombre}` : 'Nueva Receta de Cocina'}
                  </Text>
                  <Pressable
                    onPress={() => setEditando(false)}
                    style={[styles.secondaryBtn, { backgroundColor: c.surface, borderColor: c.border }]}
                  >
                    <Ionicons name="arrow-back" size={16} color={c.textSecondary} />
                    <Text style={{ color: c.textSecondary, fontWeight: '700', fontSize: 13 }}>
                      Volver
                    </Text>
                  </Pressable>
                </View>

                {/* PASO 1: Nombre, Tipo de Preparación y Tiempo */}
                <View
                  style={[
                    styles.sectionBox,
                    { backgroundColor: c.cardElevated, borderColor: c.borderLight },
                  ]}
                >
                  <View style={styles.responsiveRow}>
                    <View style={{ flex: 2, minWidth: 240 }}>
                      <Text style={[styles.label, { color: c.text }]}>Nombre del Platillo *</Text>
                      <TextInput
                        style={[
                          styles.input,
                          { backgroundColor: c.surface, borderColor: c.borderLight, color: c.text },
                        ]}
                        placeholder="Ej. Camarones al Mojo de Ajo, Cóctel Grande, Flan..."
                        placeholderTextColor={c.textMuted}
                        value={borrador.nombre}
                        onChangeText={(t) => setBorrador((p) => ({ ...p, nombre: t }))}
                      />
                    </View>

                    <View style={{ flex: 1, minWidth: 150 }}>
                      <Text style={[styles.label, { color: c.text }]}>Tiempo de entrega (min)</Text>
                      <TextInput
                        style={[
                          styles.input,
                          { backgroundColor: c.surface, borderColor: c.borderLight, color: c.text },
                        ]}
                        placeholder="15"
                        placeholderTextColor={c.textMuted}
                        keyboardType="numeric"
                        value={borrador.prepMin}
                        onChangeText={(t) => setBorrador((p) => ({ ...p, prepMin: t }))}
                      />
                    </View>
                  </View>

                  <Text style={[styles.label, { color: c.text, marginTop: 12 }]}>
                    ¿Cómo se prepara en el negocio?
                  </Text>
                  <View style={styles.responsiveRow}>
                    <Pressable
                      onPress={() =>
                        setBorrador((p) => ({
                          ...p,
                          modoPreparacion: 'por_pedido',
                          rendimientoCantidad: '1',
                          rendimientoUnidad: 'porcion',
                        }))
                      }
                      style={[
                        styles.modeCard,
                        {
                          backgroundColor:
                            borrador.modoPreparacion === 'por_pedido'
                              ? `${c.primary}20`
                              : c.surface,
                          borderColor:
                            borrador.modoPreparacion === 'por_pedido' ? c.primary : c.border,
                        },
                      ]}
                    >
                      <Text style={{ color: c.text, fontWeight: '800', fontSize: 14 }}>
                        🍳 Al momento (Platillo de carta)
                      </Text>
                      <Text style={{ color: c.textSecondary, fontSize: 12, marginTop: 3 }}>
                        Se prepara cuando la mesera mete la comanda (ej. mojarra, camarones, caldo).
                      </Text>
                    </Pressable>

                    <Pressable
                      onPress={() =>
                        setBorrador((p) => ({
                          ...p,
                          modoPreparacion: 'produccion_anticipada',
                          rendimientoCantidad:
                            p.rendimientoCantidad === '1' ? '8' : p.rendimientoCantidad,
                          rendimientoUnidad: 'pza',
                        }))
                      }
                      style={[
                        styles.modeCard,
                        {
                          backgroundColor:
                            borrador.modoPreparacion === 'produccion_anticipada'
                              ? `${c.accent}20`
                              : c.surface,
                          borderColor:
                            borrador.modoPreparacion === 'produccion_anticipada'
                              ? c.accent
                              : c.border,
                        },
                      ]}
                    >
                      <Text style={{ color: c.text, fontWeight: '800', fontSize: 14 }}>
                        🍮 Por lote anticipado (Postres / Bases)
                      </Text>
                      <Text style={{ color: c.textSecondary, fontSize: 12, marginTop: 3 }}>
                        Se prepara antes y rinde varias piezas listas para vender (ej. 1 molde = 8 flanes).
                      </Text>
                    </Pressable>
                  </View>

                  {/* Si es por lote anticipado, preguntar cuántas piezas rinde */}
                  {borrador.modoPreparacion === 'produccion_anticipada' && (
                    <View style={[styles.responsiveRow, { marginTop: 12 }]}>
                      <View style={{ flex: 1, minWidth: 160 }}>
                        <Text style={[styles.label, { color: c.text }]}>
                          ¿Cuántas piezas o porciones rinde 1 lote?
                        </Text>
                        <TextInput
                          style={[
                            styles.input,
                            { backgroundColor: c.surface, borderColor: c.borderLight, color: c.text },
                          ]}
                          placeholder="Ej. 8"
                          placeholderTextColor={c.textMuted}
                          keyboardType="numeric"
                          value={borrador.rendimientoCantidad}
                          onChangeText={(t) =>
                            setBorrador((p) => ({ ...p, rendimientoCantidad: t }))
                          }
                        />
                      </View>
                      <View style={{ flex: 1.5, minWidth: 220 }}>
                        <Text style={[styles.label, { color: c.text }]}>Unidad del lote</Text>
                        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                          {UNIDADES_RENDIMIENTO.map((ur) => {
                            const act = borrador.rendimientoUnidad === ur.id;
                            return (
                              <Pressable
                                key={ur.id}
                                onPress={() =>
                                  setBorrador((p) => ({ ...p, rendimientoUnidad: ur.id }))
                                }
                                style={[
                                  styles.chipBtn,
                                  {
                                    backgroundColor: act ? c.primary : c.surface,
                                    borderColor: act ? c.primary : c.border,
                                  },
                                ]}
                              >
                                <Text
                                  style={{
                                    color: act ? c.background : c.textSecondary,
                                    fontWeight: '800',
                                    fontSize: 12,
                                  }}
                                >
                                  {ur.label}
                                </Text>
                              </Pressable>
                            );
                          })}
                        </View>
                      </View>
                    </View>
                  )}

                  {/* Área / Estación de Cocina gobernada por el Administrador */}
                  <View style={{ marginTop: 12 }}>
                    <Text style={[styles.label, { color: c.text }]}>
                      Área de preparación (Configurada en tu negocio)
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                      {estacionesDisponibles.map((estNombre) => {
                        const act = borrador.estacionPreparacion === estNombre;
                        return (
                          <Pressable
                            key={estNombre}
                            onPress={() =>
                              setBorrador((p) => ({ ...p, estacionPreparacion: estNombre }))
                            }
                            style={[
                              styles.chipBtn,
                              {
                                backgroundColor: act ? `${c.primary}25` : c.surface,
                                borderColor: act ? c.primary : c.border,
                              },
                            ]}
                          >
                            <Text
                              style={{
                                color: act ? c.primaryLight : c.textSecondary,
                                fontWeight: '800',
                                fontSize: 13,
                              }}
                            >
                              {estNombre}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                </View>

                {/* PASO 2: COCCIÓN Y ESTIMADO DE GAS (Flama baja, media, alta o sin fuego) */}
                <View
                  style={[
                    styles.sectionBox,
                    { backgroundColor: c.cardElevated, borderColor: c.borderLight },
                  ]}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                    <View>
                      <Text style={{ color: c.text, fontWeight: '800', fontSize: 15 }}>
                        🔥 Consumo Estimado de Gas (Aproximado)
                      </Text>
                      <Text style={{ color: c.textSecondary, fontSize: 12 }}>
                        Elige la intensidad de flama y los minutos en estufa/freidora para sumar el gas al costo
                      </Text>
                    </View>
                    {costeoBorrador.costoGasEstimado > 0 && (
                      <View
                        style={[
                          styles.costPill,
                          { backgroundColor: `${c.accent}20`, borderColor: c.accent },
                        ]}
                      >
                        <Text style={{ color: c.accent, fontWeight: '800', fontSize: 12 }}>
                          Gas aprox: +${costeoBorrador.costoGasEstimado.toFixed(2)}
                        </Text>
                      </View>
                    )}
                  </View>

                  <View style={[styles.responsiveRow, { marginTop: 10 }]}>
                    {NIVELES_FLAMA.map((nf) => {
                      const sel = borrador.nivelFlama === nf.id;
                      return (
                        <Pressable
                          key={nf.id}
                          onPress={() => setBorrador((p) => ({ ...p, nivelFlama: nf.id }))}
                          style={[
                            styles.flameCard,
                            {
                              backgroundColor: sel ? `${c.accent}1E` : c.surface,
                              borderColor: sel ? c.accent : c.border,
                            },
                          ]}
                        >
                          <Text style={{ fontSize: 16 }}>
                            {nf.icon}{' '}
                            <Text style={{ color: c.text, fontWeight: '800', fontSize: 13 }}>
                              {nf.label}
                            </Text>
                          </Text>
                          <Text style={{ color: c.textMuted, fontSize: 11, marginTop: 2 }}>
                            {nf.sub}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>

                  {borrador.nivelFlama !== 'sin_fuego' && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 }}>
                      <Text style={{ color: c.textSecondary, fontSize: 13, fontWeight: '700' }}>
                        Minutos al fuego:
                      </Text>
                      <TextInput
                        style={[
                          styles.inputCompact,
                          {
                            width: 90,
                            backgroundColor: c.surface,
                            borderColor: c.borderLight,
                            color: c.text,
                          },
                        ]}
                        keyboardType="numeric"
                        value={borrador.minutosCoccion}
                        onChangeText={(t) => setBorrador((p) => ({ ...p, minutosCoccion: t }))}
                        placeholder="10"
                        placeholderTextColor={c.textMuted}
                      />
                      <Text style={{ color: c.textMuted, fontSize: 12 }}>
                        min (puedes usar botones rápidos:{' '}
                      </Text>
                      {['5', '8', '12', '20', '45'].map((m) => (
                        <Pressable
                          key={m}
                          onPress={() => setBorrador((p) => ({ ...p, minutosCoccion: m }))}
                          style={[
                            styles.miniQuickBtn,
                            {
                              backgroundColor:
                                borrador.minutosCoccion === m ? c.accent : c.surface,
                              borderColor: c.border,
                            },
                          ]}
                        >
                          <Text
                            style={{
                              color: borrador.minutosCoccion === m ? '#000' : c.textSecondary,
                              fontWeight: '800',
                              fontSize: 12,
                            }}
                          >
                            {m}m
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  )}
                </View>

                {/* PASO 3: INGREDIENTES DESDE INVENTARIO */}
                <View
                  style={[
                    styles.sectionBox,
                    { backgroundColor: c.cardElevated, borderColor: c.borderLight },
                  ]}
                >
                  <View style={styles.ingHeaderRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: c.text, fontWeight: '800', fontSize: 15 }}>
                        🥗 Ingredientes de la Receta (Desde Inventario)
                      </Text>
                      <Text style={{ color: c.textSecondary, fontSize: 12 }}>
                        Toca un insumo y elige la porción que lleva este platillo
                      </Text>
                    </View>
                    <Pressable
                      onPress={handleIrAInventario}
                      style={[
                        styles.secondaryBtn,
                        { backgroundColor: c.surface, borderColor: c.primary },
                      ]}
                    >
                      <Ionicons name="add-circle-outline" size={16} color={c.primaryLight} />
                      <Text style={{ color: c.primaryLight, fontWeight: '800', fontSize: 12 }}>
                        Dar de alta insumo en Inventario
                      </Text>
                    </Pressable>
                  </View>

                  <TextInput
                    style={[
                      styles.inputCompact,
                      {
                        backgroundColor: c.surface,
                        borderColor: c.border,
                        color: c.text,
                        marginTop: 8,
                      },
                    ]}
                    value={busquedaInsumo}
                    onChangeText={setBusquedaInsumo}
                    placeholder="Buscar camarón, filete, pulpo, verdura, aceite..."
                    placeholderTextColor={c.textMuted}
                  />

                  {insumosElegibles.length === 0 ? (
                    <View style={{ paddingVertical: 14, alignItems: 'center' }}>
                      <Text style={{ color: c.textSecondary, fontSize: 13 }}>
                        No se encontraron insumos con ese nombre en Inventario.
                      </Text>
                    </View>
                  ) : (
                    <View style={{ marginTop: 10, gap: 10 }}>
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={{ gap: 8 }}
                      >
                        {insumosElegibles.map((ins) => {
                          const sel = insumoSeleccionadoId === ins.id;
                          const disp = stockConsolidadoPorItem[ins.id] || 0;
                          return (
                            <Pressable
                              key={ins.id}
                              onPress={() => {
                                setInsumoSeleccionadoId(ins.id);
                                setUnidadInsumo(ins.unidad === 'kg' ? 'g' : ins.unidad);
                              }}
                              style={[
                                styles.chipBtn,
                                {
                                  backgroundColor: sel ? `${c.primary}25` : c.surface,
                                  borderColor: sel ? c.primary : c.border,
                                },
                              ]}
                            >
                              <Text
                                style={{
                                  color: sel ? c.primaryLight : c.text,
                                  fontWeight: '800',
                                  fontSize: 13,
                                }}
                              >
                                {ins.nombre}
                              </Text>
                              <Text style={{ color: c.textMuted, fontSize: 11 }}>
                                Stock: {disp} {ins.unidad} · ${Number(ins.costo || 0).toFixed(0)}/{ins.unidad}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </ScrollView>

                      {insumoSeleccionadoId !== '' && (
                        <View
                          style={[
                            styles.quickAddIngBox,
                            { backgroundColor: c.surface, borderColor: c.borderLight },
                          ]}
                        >
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <TextInput
                              style={[
                                styles.inputCompact,
                                {
                                  width: 110,
                                  backgroundColor: c.backgroundSecondary,
                                  borderColor: c.primary,
                                  color: c.text,
                                },
                              ]}
                              placeholder="Cantidad"
                              placeholderTextColor={c.textMuted}
                              keyboardType="decimal-pad"
                              value={cantidadInsumo}
                              onChangeText={setCantidadInsumo}
                            />

                            {/* Botones de porción rápida */}
                            {sugerenciasPorcionesRapidas.map((sug) => (
                              <Pressable
                                key={sug}
                                onPress={() => setCantidadInsumo(sug)}
                                style={[
                                  styles.miniQuickBtn,
                                  {
                                    backgroundColor:
                                      cantidadInsumo === sug ? `${c.primary}30` : c.card,
                                    borderColor:
                                      cantidadInsumo === sug ? c.primary : c.border,
                                  },
                                ]}
                              >
                                <Text style={{ color: c.text, fontSize: 12, fontWeight: '700' }}>
                                  {sug} {unidadInsumo}
                                </Text>
                              </Pressable>
                            ))}

                            <View style={{ flexDirection: 'row', gap: 4, flexWrap: 'wrap' }}>
                              {UNIDADES_RECETA.map((u) => (
                                <Pressable
                                  key={u}
                                  onPress={() => setUnidadInsumo(u)}
                                  style={[
                                    styles.miniQuickBtn,
                                    {
                                      backgroundColor:
                                        unidadInsumo === u ? c.primary : c.backgroundSecondary,
                                      borderColor: unidadInsumo === u ? c.primary : c.border,
                                    },
                                  ]}
                                >
                                  <Text
                                    style={{
                                      color: unidadInsumo === u ? c.background : c.textSecondary,
                                      fontWeight: '800',
                                      fontSize: 11,
                                    }}
                                  >
                                    {u === 'caja' ? 'PAQ' : u.toUpperCase()}
                                  </Text>
                                </Pressable>
                              ))}
                            </View>

                            <Pressable
                              onPress={handleAgregarIngrediente}
                              style={[styles.primaryBtn, { backgroundColor: c.primary }]}
                            >
                              <Ionicons name="add" size={18} color={c.background} />
                              <Text style={{ color: c.background, fontWeight: '800', fontSize: 13 }}>
                                Sumar Ingrediente
                              </Text>
                            </Pressable>
                          </View>
                        </View>
                      )}
                    </View>
                  )}

                  {/* Lista de ingredientes agregados y costo total */}
                  {costeoBorrador.desglose.length > 0 && (
                    <View style={{ marginTop: 12, gap: 6 }}>
                      {costeoBorrador.desglose.map((d) => (
                        <View
                          key={d.itemId}
                          style={[
                            styles.ingRow,
                            { backgroundColor: c.surface, borderColor: c.border },
                          ]}
                        >
                          <View style={{ flex: 1 }}>
                            <Text style={{ color: c.text, fontWeight: '700', fontSize: 14 }}>
                              {d.nombre}:{' '}
                              <Text style={{ color: c.primaryLight }}>
                                {d.cantidadReceta} {d.unidadReceta}
                              </Text>
                              {d.unidadReceta !== d.unidadBaseInventario
                                ? ` (${d.cantidadEnUnidadBase} ${d.unidadBaseInventario})`
                                : ''}
                            </Text>
                          </View>
                          <Text
                            style={{
                              color: d.costoUnitarioBase !== null ? c.textSecondary : c.warning,
                              fontWeight: '800',
                              fontSize: 13,
                              marginRight: 12,
                            }}
                          >
                            {d.costoUnitarioBase !== null
                              ? `$${d.subtotalCosto.toFixed(2)}`
                              : 'Sin costo'}
                          </Text>
                          <Pressable onPress={() => handleQuitarIngrediente(d.itemId)}>
                            <Ionicons name="trash-outline" size={17} color={c.error} />
                          </Pressable>
                        </View>
                      ))}

                      <View
                        style={[
                          styles.costSummaryBar,
                          { backgroundColor: `${c.primary}18`, borderColor: c.primary },
                        ]}
                      >
                        <View>
                          <Text style={{ color: c.textSecondary, fontWeight: '700', fontSize: 12 }}>
                            Insumos: ${costeoBorrador.costoIngredientesReceta.toFixed(2)} + Gas aprox: $
                            {costeoBorrador.costoGasEstimado.toFixed(2)}
                          </Text>
                          <Text style={{ color: c.text, fontWeight: '800', fontSize: 13 }}>
                            Costo total de la receta: ${costeoBorrador.costoTotalReceta.toFixed(2)}
                          </Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={{ color: c.textMuted, fontSize: 11, fontWeight: '700' }}>
                            COSTO POR {borrador.rendimientoUnidad.toUpperCase()}
                          </Text>
                          <Text style={{ color: c.primaryLight, fontWeight: '900', fontSize: 18 }}>
                            ~${costeoBorrador.costoPorUnidadRendimiento.toFixed(2)}
                          </Text>
                        </View>
                      </View>
                    </View>
                  )}
                </View>

                {/* PASO 4: NOTAS BREVES DE PREPARACIÓN (Opcional) */}
                <View
                  style={[
                    styles.sectionBox,
                    { backgroundColor: c.cardElevated, borderColor: c.borderLight },
                  ]}
                >
                  <Text style={[styles.label, { color: c.text }]}>
                    Notas o pasos de preparación (Opcional)
                  </Text>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        height: 72,
                        textAlignVertical: 'top',
                        backgroundColor: c.surface,
                        borderColor: c.border,
                        color: c.text,
                      },
                    ]}
                    multiline
                    placeholder="Ej. Sazonar con ajo dorado, acompañar con arroz, ensalada fresca y rodajas de aguacate."
                    placeholderTextColor={c.textMuted}
                    value={borrador.procedimientoTexto}
                    onChangeText={(t) => setBorrador((p) => ({ ...p, procedimientoTexto: t }))}
                  />

                  {imagenesPlatillos.length > 0 && (
                    <View style={{ marginTop: 10 }}>
                      <Text style={[styles.label, { color: c.text }]}>Imagen del platillo</Text>
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={{ gap: 8 }}
                      >
                        {imagenesPlatillos.map((img) => {
                          const sel = borrador.imagenId === img.id;
                          const src = obtenerImagenProducto(img.id, undefined, 'platillos');
                          return (
                            <Pressable
                              key={img.id}
                              onPress={() => setBorrador((p) => ({ ...p, imagenId: img.id }))}
                              style={[
                                styles.chipBtn,
                                {
                                  flexDirection: 'row',
                                  alignItems: 'center',
                                  gap: 6,
                                  backgroundColor: sel ? `${c.primary}22` : c.surface,
                                  borderColor: sel ? c.primary : c.border,
                                },
                              ]}
                            >
                              {src && (
                                <Image
                                  source={src}
                                  style={{ width: 28, height: 28 }}
                                  contentFit="contain"
                                />
                              )}
                              <Text style={{ color: c.text, fontSize: 12, fontWeight: '700' }}>
                                {img.etiqueta}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </ScrollView>
                    </View>
                  )}
                </View>
              </ScrollView>

              {/* PIE FIJO DEL EDITOR */}
              <View
                style={[
                  styles.editorFooter,
                  { backgroundColor: c.surface, borderTopColor: c.border },
                ]}
              >
                <Pressable
                  onPress={() => setEditando(false)}
                  style={[styles.secondaryBtn, { borderColor: c.borderLight }]}
                >
                  <Text style={{ color: c.textSecondary, fontWeight: '700', fontSize: 14 }}>
                    Cancelar
                  </Text>
                </Pressable>
                <Pressable
                  onPress={handleGuardarPlatillo}
                  disabled={guardando}
                  style={[styles.primaryBtn, { backgroundColor: c.primary, paddingHorizontal: 22 }]}
                >
                  <Ionicons name="checkmark-circle-outline" size={18} color={c.background} />
                  <Text style={{ color: c.background, fontWeight: '900', fontSize: 14 }}>
                    {guardando ? 'Guardando...' : 'Guardar Platillo'}
                  </Text>
                </Pressable>
              </View>
            </View>
          )}

          {/* PESTAÑA DE PRODUCCIÓN POR LOTES */}
          {pestana === 'produccion' && (
            <ScrollView
              style={{ flex: 1, padding: 16 }}
              contentContainerStyle={{ gap: 14, paddingBottom: 24 }}
              nestedScrollEnabled
            >
              <Text style={{ color: c.textSecondary, fontSize: 13 }}>
                Controla las preparaciones por lote (ej. moldes de flan). Al iniciar se descuentan
                los ingredientes; al terminar ingresan las piezas listas a Inventario.
              </Text>

              {lotes.length === 0 ? (
                <View
                  style={[
                    styles.emptyCard,
                    { backgroundColor: c.cardElevated, borderColor: c.borderLight },
                  ]}
                >
                  <Ionicons name="layers-outline" size={40} color={c.accent} />
                  <Text style={{ color: c.text, fontWeight: '800', fontSize: 16, marginTop: 8 }}>
                    Sin lotes en curso
                  </Text>
                  <Text style={{ color: c.textSecondary, fontSize: 13, marginTop: 4 }}>
                    En la pestaña Platillos pulsa &quot;Cocinar Lote&quot; sobre cualquier receta por lote.
                  </Text>
                </View>
              ) : (
                lotes.map((lote) => {
                  const activo =
                    lote.estado === 'en_preparacion' || lote.estado === 'pausado';
                  return (
                    <View
                      key={lote.id}
                      style={[
                        styles.dishCard,
                        { backgroundColor: c.cardElevated, borderColor: c.borderLight },
                      ]}
                    >
                      <View style={{ flex: 1, gap: 4 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <Text style={{ color: c.text, fontWeight: '900', fontSize: 16 }}>
                            {lote.platilloNombre} (x{lote.multiplicadorLote} lote)
                          </Text>
                          <View
                            style={{
                              backgroundColor:
                                lote.estado === 'completado'
                                  ? `${c.success}22`
                                  : lote.estado === 'pausado'
                                    ? `${c.warning}22`
                                    : `${c.primary}22`,
                              paddingHorizontal: 8,
                              paddingVertical: 3,
                              borderRadius: 6,
                            }}
                          >
                            <Text
                              style={{
                                color:
                                  lote.estado === 'completado'
                                    ? c.success
                                    : lote.estado === 'pausado'
                                      ? c.warning
                                      : c.primaryLight,
                                fontSize: 11,
                                fontWeight: '800',
                              }}
                            >
                              {lote.estado === 'en_preparacion'
                                ? 'EN PREPARACIÓN'
                                : lote.estado.toUpperCase()}
                            </Text>
                          </View>
                        </View>

                        <Text style={{ color: c.textSecondary, fontSize: 13 }}>
                          Esperado: {lote.rendimientoEsperado} {lote.unidadRendimiento} · Costo del lote: $
                          {lote.costoTotalInsumos.toFixed(2)}
                        </Text>

                        {lote.estado === 'completado' && (
                          <Text style={{ color: c.success, fontWeight: '700', fontSize: 13 }}>
                            Salieron: {lote.rendimientoObtenido} {lote.unidadRendimiento} · Costo por pieza: $
                            {(lote.costoUnitarioResultante || 0).toFixed(2)}
                          </Text>
                        )}
                      </View>

                      {activo && (
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                          <Pressable
                            onPress={() => {
                              setLoteParaCompletar(lote);
                              setRendimientoRealInput(String(lote.rendimientoEsperado));
                              setMotivoDiferenciaInput('');
                            }}
                            style={[styles.primaryBtn, { backgroundColor: c.primary }]}
                          >
                            <Ionicons name="checkmark-circle" size={16} color={c.background} />
                            <Text style={{ color: c.background, fontWeight: '800', fontSize: 13 }}>
                              Terminar Lote
                            </Text>
                          </Pressable>
                        </View>
                      )}
                    </View>
                  );
                })
              )}
            </ScrollView>
          )}

          {/* SUB-MODAL: INICIAR LOTE */}
          {platilloParaLote && (
            <View style={styles.subModalOverlay}>
              <View
                style={[
                  styles.subModalCard,
                  { backgroundColor: c.cardElevated, borderColor: c.borderLight },
                ]}
              >
                <Text style={{ color: c.text, fontWeight: '900', fontSize: 17 }}>
                  Cocinar Lote: {platilloParaLote.nombre}
                </Text>
                <Text style={{ color: c.textSecondary, fontSize: 13, marginTop: 4 }}>
                  Cada lote rinde {platilloParaLote.rendimiento.cantidad}{' '}
                  {platilloParaLote.rendimiento.unidad}.
                </Text>
                <View style={{ marginTop: 12 }}>
                  <Text style={[styles.label, { color: c.text }]}>¿Cuántos lotes vas a preparar?</Text>
                  <TextInput
                    style={[
                      styles.input,
                      { backgroundColor: c.surface, borderColor: c.borderLight, color: c.text },
                    ]}
                    keyboardType="numeric"
                    value={multiplicadorLote}
                    onChangeText={setMultiplicadorLote}
                  />
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
                  <Pressable
                    onPress={() => setPlatilloParaLote(null)}
                    style={[styles.secondaryBtn, { borderColor: c.border }]}
                  >
                    <Text style={{ color: c.textSecondary, fontWeight: '700' }}>Cancelar</Text>
                  </Pressable>
                  <Pressable
                    onPress={handleIniciarLote}
                    disabled={guardando}
                    style={[styles.primaryBtn, { backgroundColor: c.primary }]}
                  >
                    <Text style={{ color: c.background, fontWeight: '800' }}>
                      {guardando ? 'Iniciando...' : 'Iniciar Lote'}
                    </Text>
                  </Pressable>
                </View>
              </View>
            </View>
          )}

          {/* SUB-MODAL: COMPLETAR LOTE */}
          {loteParaCompletar && (
            <View style={styles.subModalOverlay}>
              <View
                style={[
                  styles.subModalCard,
                  { backgroundColor: c.cardElevated, borderColor: c.borderLight },
                ]}
              >
                <Text style={{ color: c.text, fontWeight: '900', fontSize: 17 }}>
                  Terminar Lote: {loteParaCompletar.platilloNombre}
                </Text>
                <Text style={{ color: c.textSecondary, fontSize: 13, marginTop: 4 }}>
                  Esperado: {loteParaCompletar.rendimientoEsperado}{' '}
                  {loteParaCompletar.unidadRendimiento}. Confirma cuántas piezas salieron realmente:
                </Text>

                <View style={{ marginTop: 12 }}>
                  <Text style={[styles.label, { color: c.text }]}>
                    Piezas obtenidas ({loteParaCompletar.unidadRendimiento})
                  </Text>
                  <TextInput
                    style={[
                      styles.input,
                      { backgroundColor: c.surface, borderColor: c.borderLight, color: c.text },
                    ]}
                    keyboardType="numeric"
                    value={rendimientoRealInput}
                    onChangeText={setRendimientoRealInput}
                  />
                </View>

                {parseFloat(rendimientoRealInput) < loteParaCompletar.rendimientoEsperado && (
                  <View style={{ marginTop: 10 }}>
                    <Text style={[styles.label, { color: c.warning }]}>
                      Motivo de la merma / diferencia
                    </Text>
                    <TextInput
                      style={[
                        styles.input,
                        { backgroundColor: c.surface, borderColor: c.warning, color: c.text },
                      ]}
                      placeholder="Ej. 1 porción se dañó al desmoldar"
                      placeholderTextColor={c.textMuted}
                      value={motivoDiferenciaInput}
                      onChangeText={setMotivoDiferenciaInput}
                    />
                  </View>
                )}

                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
                  <Pressable
                    onPress={() => setLoteParaCompletar(null)}
                    style={[styles.secondaryBtn, { borderColor: c.border }]}
                  >
                    <Text style={{ color: c.textSecondary, fontWeight: '700' }}>Cancelar</Text>
                  </Pressable>
                  <Pressable
                    onPress={handleCompletarLote}
                    disabled={guardando}
                    style={[styles.primaryBtn, { backgroundColor: c.primary }]}
                  >
                    <Text style={{ color: c.background, fontWeight: '800' }}>
                      {guardando ? 'Guardando...' : 'Guardar en Inventario'}
                    </Text>
                  </Pressable>
                </View>
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.82)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 14,
  },
  container: {
    width: '100%',
    maxWidth: 960,
    height: '92%',
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    flexWrap: 'wrap',
    gap: 10,
  },
  headerIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 19,
    fontWeight: '900',
    fontFamily: (theme.typography as any).displayFamily || theme.typography.fontFamily,
  },
  tabsPill: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    padding: 3,
    gap: 4,
  },
  tabOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 9,
  },
  closeBtn: {
    padding: 6,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 10,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  toolbarRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
  },
  gasConfigPanel: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 10,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
  },
  smallActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  emptyCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  dishesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  dishCard: {
    flexGrow: 1,
    flexBasis: 360,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
  },
  dishCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  dishCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  costPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  iconActionBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editorTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  responsiveRow: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  label: {
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    fontWeight: '600',
  },
  inputCompact: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    fontWeight: '600',
  },
  modeCard: {
    flex: 1,
    minWidth: 240,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  flameCard: {
    flex: 1,
    minWidth: 165,
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
  },
  chipBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  miniQuickBtn: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
  },
  sectionBox: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
  },
  ingHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickAddIngBox: {
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  ingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  costSummaryBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginTop: 6,
  },
  editorFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  subModalOverlay: {
    ...(StyleSheet.absoluteFill as any),
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  subModalCard: {
    width: '100%',
    maxWidth: 440,
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
  },
});
