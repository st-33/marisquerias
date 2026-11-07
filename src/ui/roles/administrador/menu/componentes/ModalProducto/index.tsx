/**
 * 🗂️ Modal de Oferta Comercial en Menú (Nuevo / Editar).
 *
 * Responsabilidad:
 *  - Seleccionar un artículo existente de Inventario (`origenTipo: 'inventario'`)
 *    o un platillo del Libro de Platillos (`origenTipo: 'platillo'`).
 *  - Si el producto ya existe o un sistema está desactivado, el origen viene
 *    predeterminado y adaptativo sin bloques repetitivos.
 *  - Mostrar un costo aproximado amigable y permitir fijar el Precio de Venta.
 *  - Habilitar canales de venta (Restaurante / Mostrador / Menú Digital) bloqueando
 *    Mostrador cuando el platillo se prepara al momento (`por_pedido`).
 */

import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { obtenerImagenProducto } from '@/compartido/catalogoImagenes';
import { theme, useAppTheme } from '@/compartido/temas';
import type { ArticuloOrigenMenu, PlatilloOrigenMenu } from '../../../../../../capacidades/menu/useGestionMenu';
import { useStore } from '../../../../../../sistema/store';
import EditorVariantes from '../../editores/EditorVariantes';
import {
  calcularPrecioSugeridoDesdeCosto,
  calcularResumenPrecioComercial,
  esFormularioPlatilloPorPedido,
  type FormState,
} from '../../logica/formularioProducto';
import type { EtiquetasMenu } from '../../logica/etiquetas';
import { BarraPestanasModalProducto } from './BarraPestanasModalProducto';
import { SeccionCanalesYCocina } from './SeccionCanalesYCocina';
import { PestanaInventario } from './PestanaInventario';

export type PestanaProducto = 'basico' | 'variantes' | 'inventario';

type ModalProductoProps = {
  modo: 'addProd' | 'editProd';
  formData: FormState;
  onFormDataChange: (form: FormState) => void;
  pestana: PestanaProducto;
  onPestanaChange: (pestana: PestanaProducto) => void;
  articulosInventario: ArticuloOrigenMenu[];
  platillosCocina: PlatilloOrigenMenu[];
  areas?: any[];
  etiquetas: EtiquetasMenu;
  isSaving: boolean;
  onIrAInventario: () => void;
  onIrALibroPlatillos: () => void;
  onGuardar: () => void;
  onCancelar: () => void;
};

export function ModalProducto({
  modo,
  formData,
  onFormDataChange,
  pestana,
  onPestanaChange,
  articulosInventario = [],
  platillosCocina = [],
  areas = [],
  etiquetas: l,
  isSaving,
  onIrAInventario,
  onIrALibroPlatillos,
  onGuardar,
  onCancelar,
}: ModalProductoProps) {
  const { colors } = useAppTheme();
  const estadoEncendido = useStore((s) => s.estadoEncendido);
  const [busquedaOrigen, setBusquedaOrigen] = useState('');
  const [cambiarOrigenManual, setCambiarOrigenManual] = useState(false);

  // Detectar de forma adaptativa qué sistemas origen están activos
  const { tieneInventarioActivo, tieneCocinaActiva } = useMemo(() => {
    const esPlantilla = !estadoEncendido || estadoEncendido.tipo_acceso === 'plantilla';
    if (esPlantilla) {
      return { tieneInventarioActivo: true, tieneCocinaActiva: true };
    }
    const caps = (estadoEncendido.capacidades_activas ||
      (estadoEncendido as any)?.activos?.capacidades ||
      []) as string[];
    const roles = (estadoEncendido.roles_activos ||
      (estadoEncendido as any)?.activos?.roles ||
      []) as string[];
    const cocina =
      caps.includes('comanda_cocina') ||
      caps.includes('cocina') ||
      roles.includes('cocina') ||
      platillosCocina.length > 0;
    const inv =
      caps.includes('administrador') ||
      caps.includes('inventario') ||
      articulosInventario.length > 0;
    return {
      tieneInventarioActivo: inv || !cocina,
      tieneCocinaActiva: cocina,
    };
  }, [estadoEncendido, articulosInventario.length, platillosCocina.length]);

  const esPorPedido = esFormularioPlatilloPorPedido(formData);
  const safeVisible = {
    digital: true,
    mesero: true,
    ...(formData.visible || {}),
    ventaCrudo: esPorPedido ? false : Boolean(formData.visible?.ventaCrudo),
  };

  const resumenPrecio = calcularResumenPrecioComercial(
    formData.costoReferencia,
    formData.precio,
    formData.costoIncompleto
  );

  const imagenOrigen = obtenerImagenProducto(
    formData.imagenId,
    formData.nombre,
    formData.origenTipo === 'platillo' ? 'platillos' : 'inventario'
  );

  const handleSeleccionarArticuloInventario = (art: ArticuloOrigenMenu) => {
    onFormDataChange({
      ...formData,
      origenTipo: 'inventario',
      origenId: art.id,
      modoPreparacion: undefined,
      itemTerminadoId: art.uso === 'producto_terminado' ? art.id : undefined,
      costoReferencia: art.costoUnitario,
      costoIncompleto: art.costoUnitario <= 0,
      costoAproximado: false,
      imagenId: art.imagenId,
      nombre: art.nombre,
      unidad: art.unidad,
      enviarACocina: false,
      saltarPreparando: true,
      visible: {
        ...safeVisible,
        mesero: true,
        ventaCrudo: true,
      },
    });
    setCambiarOrigenManual(false);
  };

  const handleSeleccionarPlatilloCocina = (plat: PlatilloOrigenMenu) => {
    const porPedido = plat.modoPreparacion !== 'produccion_anticipada';
    const ingredientesNumericos: Record<string, number> = {};
    Object.entries(plat.ingredientes || {}).forEach(([k, ing]) => {
      ingredientesNumericos[ing.itemId || k] = Number(ing.cantidad || 0);
    });
    onFormDataChange({
      ...formData,
      origenTipo: 'platillo',
      origenId: plat.id,
      modoPreparacion: plat.modoPreparacion,
      itemTerminadoId: plat.itemTerminadoId,
      costoReferencia: plat.costoCalculado,
      costoIncompleto: plat.costoIncompleto,
      costoAproximado: plat.costoAproximado,
      imagenId: plat.imagenId,
      estacion_preparacion: plat.estacionPreparacion as any,
      nombre: plat.nombre,
      prepMin: plat.prepMin || 15,
      variantes:
        plat.variantes && Object.keys(plat.variantes.grupos || {}).length > 0
          ? plat.variantes
          : formData.variantes,
      receta: {
        ingredientes: ingredientesNumericos,
      },
      enviarACocina: porPedido,
      saltarPreparando: !porPedido,
      visible: {
        ...safeVisible,
        mesero: true,
        ventaCrudo: porPedido ? false : safeVisible.ventaCrudo,
      },
    });
    setCambiarOrigenManual(false);
  };

  const handleSugerirPrecio = (multiplicadorRecargoPct: number) => {
    if (formData.costoReferencia <= 0) return;
    const sugerido = calcularPrecioSugeridoDesdeCosto(
      formData.costoReferencia,
      multiplicadorRecargoPct,
      'recargo'
    );
    onFormDataChange({
      ...formData,
      precio: String(Math.round(sugerido / 5) * 5 || sugerido),
    });
  };

  const articulosFiltrados = articulosInventario.filter((a) =>
    a.nombre.toLowerCase().includes(busquedaOrigen.toLowerCase())
  );

  const platillosFiltrados = platillosCocina.filter((p) =>
    p.nombre.toLowerCase().includes(busquedaOrigen.toLowerCase())
  );

  const tieneOrigenSeleccionado = Boolean(formData.origenId || formData.nombre);
  const mostrarBuscadorOrigen =
    modo === 'addProd' ? !tieneOrigenSeleccionado || cambiarOrigenManual : cambiarOrigenManual;

  return (
    <View
      style={[
        styles.modalCard,
        styles.modalCardLarge,
        { backgroundColor: colors.surface, borderColor: colors.borderLight },
      ]}
    >
      {/* ENCABEZADO COMPACTO */}
      <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.modalTitle, { color: colors.text }]}>
            {modo === 'addProd' ? 'Publicar en el Menú' : `Editar: ${formData.nombre || 'Opción'}`}
          </Text>
          <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 2 }}>
            Define el precio al cliente, variantes y el área de descuento
          </Text>
        </View>
        <Pressable onPress={onCancelar} style={styles.closeBtn}>
          <Ionicons name="close" size={24} color={colors.textSecondary} />
        </Pressable>
      </View>

      <View style={styles.modalBody}>
        <BarraPestanasModalProducto pestana={pestana} onPestanaChange={onPestanaChange} />

        <ScrollView
          style={styles.modalFormScroll}
          contentContainerStyle={styles.modalFormContent}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled
          showsVerticalScrollIndicator={false}
        >
          {pestana === 'basico' && (
            <View style={styles.formSection}>
              {/* 1. ORIGEN ADAPTATIVO (Compacto cuando ya está vinculado, selector ágil cuando es nuevo) */}
              {!mostrarBuscadorOrigen ? (
                <View
                  style={[
                    styles.linkedOriginCard,
                    { backgroundColor: colors.cardElevated, borderColor: colors.borderLight },
                  ]}
                >
                  {imagenOrigen ? (
                    <Image
                      source={imagenOrigen}
                      style={{ width: 56, height: 62 }}
                      contentFit="contain"
                    />
                  ) : (
                    <View
                      style={[
                        styles.originAvatar,
                        {
                          backgroundColor:
                            formData.origenTipo === 'platillo'
                              ? `${colors.accent}20`
                              : `${colors.primary}20`,
                        },
                      ]}
                    >
                      <Ionicons
                        name={
                          formData.origenTipo === 'platillo' ? 'restaurant-outline' : 'cube-outline'
                        }
                        size={24}
                        color={formData.origenTipo === 'platillo' ? colors.accent : colors.primary}
                      />
                    </View>
                  )}

                  <View style={{ flex: 1, gap: 4 }}>
                    <View style={styles.originBadgeRow}>
                      <View
                        style={[
                          styles.originTypePill,
                          {
                            backgroundColor:
                              formData.origenTipo === 'platillo'
                                ? `${colors.accent}22`
                                : `${colors.primary}22`,
                          },
                        ]}
                      >
                        <Text
                          style={{
                            fontSize: 11,
                            fontWeight: '800',
                            color:
                              formData.origenTipo === 'platillo'
                                ? colors.accent
                                : colors.primaryLight,
                          }}
                        >
                          {formData.origenTipo === 'platillo'
                            ? formData.modoPreparacion === 'produccion_anticipada'
                              ? '🍮 LOTE DE COCINA'
                              : `🍳 PLATILLO DE COCINA (~${formData.prepMin || 15} MIN)`
                            : `📦 ARTÍCULO DE INVENTARIO (${formData.unidad.toUpperCase()})`}
                        </Text>
                      </View>
                      {modo === 'addProd' && (
                        <Pressable
                          onPress={() => setCambiarOrigenManual(true)}
                          style={styles.changeOriginLink}
                        >
                          <Text style={{ color: colors.primaryLight, fontSize: 12, fontWeight: '700' }}>
                            Cambiar
                          </Text>
                        </Pressable>
                      )}
                    </View>

                    <TextInput
                      style={[
                        styles.inlineNameInput,
                        {
                          color: colors.text,
                          borderColor: colors.border,
                          backgroundColor: colors.surface,
                        },
                      ]}
                      value={formData.nombre}
                      onChangeText={(v) => onFormDataChange({ ...formData, nombre: v })}
                      placeholder="Nombre en la carta..."
                      placeholderTextColor={colors.textMuted}
                    />
                  </View>

                  <Pressable
                    onPress={
                      formData.origenTipo === 'platillo' ? onIrALibroPlatillos : onIrAInventario
                    }
                    style={[
                      styles.jumpBtn,
                      {
                        borderColor: `${colors.primary}55`,
                        backgroundColor: `${colors.primary}15`,
                      },
                    ]}
                  >
                    <Ionicons
                      name={formData.origenTipo === 'platillo' ? 'book-outline' : 'cube-outline'}
                      size={14}
                      color={colors.primaryLight}
                    />
                    <Text style={[styles.jumpBtnText, { color: colors.primaryLight }]}>
                      {formData.origenTipo === 'platillo' ? 'Ver Receta' : 'Ver Stock'}
                    </Text>
                  </Pressable>
                </View>
              ) : (
                <View
                  style={[
                    styles.sectionContainer,
                    { backgroundColor: colors.cardElevated, borderColor: colors.borderLight },
                  ]}
                >
                  <View style={styles.originHeaderRow}>
                    <Text style={[styles.inputLabel, { color: colors.text, marginBottom: 0 }]}>
                      Elige qué vas a publicar en la carta
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      {tieneInventarioActivo && (
                        <Pressable
                          onPress={onIrAInventario}
                          style={[
                            styles.jumpBtn,
                            {
                              borderColor: `${colors.primary}55`,
                              backgroundColor: `${colors.primary}16`,
                            },
                          ]}
                        >
                          <Ionicons name="cube-outline" size={14} color={colors.primaryLight} />
                          <Text style={[styles.jumpBtnText, { color: colors.primaryLight }]}>
                            Ir a Inventario
                          </Text>
                        </Pressable>
                      )}
                      {tieneCocinaActiva && (
                        <Pressable
                          onPress={onIrALibroPlatillos}
                          style={[
                            styles.jumpBtn,
                            {
                              borderColor: `${colors.accent}66`,
                              backgroundColor: `${colors.accent}18`,
                            },
                          ]}
                        >
                          <Ionicons name="book-outline" size={14} color={colors.accent} />
                          <Text style={[styles.jumpBtnText, { color: colors.accent }]}>
                            Libro de Platillos
                          </Text>
                        </Pressable>
                      )}
                    </View>
                  </View>

                  {tieneInventarioActivo && tieneCocinaActiva && (
                    <View style={styles.originTypeSelector}>
                      <Pressable
                        onPress={() => onFormDataChange({ ...formData, origenTipo: 'platillo' })}
                        style={[
                          styles.originTypeBtn,
                          { backgroundColor: colors.surface, borderColor: colors.border },
                          formData.origenTipo === 'platillo' && {
                            borderColor: colors.accent,
                            backgroundColor: `${colors.accent}1A`,
                          },
                        ]}
                      >
                        <Ionicons
                          name="restaurant-outline"
                          size={18}
                          color={
                            formData.origenTipo === 'platillo' ? colors.accent : colors.textMuted
                          }
                        />
                        <Text
                          style={[
                            styles.originTypeTitle,
                            {
                              color:
                                formData.origenTipo === 'platillo' ? colors.accent : colors.text,
                            },
                          ]}
                        >
                          Platillo de Cocina ({platillosCocina.length})
                        </Text>
                      </Pressable>

                      <Pressable
                        onPress={() => onFormDataChange({ ...formData, origenTipo: 'inventario' })}
                        style={[
                          styles.originTypeBtn,
                          { backgroundColor: colors.surface, borderColor: colors.border },
                          formData.origenTipo === 'inventario' && {
                            borderColor: colors.primary,
                            backgroundColor: `${colors.primary}1A`,
                          },
                        ]}
                      >
                        <Ionicons
                          name="beer-outline"
                          size={18}
                          color={
                            formData.origenTipo === 'inventario'
                              ? colors.primaryLight
                              : colors.textMuted
                          }
                        />
                        <Text
                          style={[
                            styles.originTypeTitle,
                            {
                              color:
                                formData.origenTipo === 'inventario'
                                  ? colors.primaryLight
                                  : colors.text,
                            },
                          ]}
                        >
                          Bebida / Producto ({articulosInventario.length})
                        </Text>
                      </Pressable>
                    </View>
                  )}

                  <TextInput
                    style={[
                      styles.textInput,
                      {
                        backgroundColor: colors.surface,
                        borderColor: colors.border,
                        color: colors.text,
                        marginBottom: 8,
                      },
                    ]}
                    value={busquedaOrigen}
                    onChangeText={setBusquedaOrigen}
                    placeholder={
                      formData.origenTipo === 'inventario'
                        ? 'Buscar bebida, postre o producto...'
                        : 'Buscar platillo o receta de cocina...'
                    }
                    placeholderTextColor={colors.textMuted}
                  />

                  {formData.origenTipo === 'inventario' ? (
                    articulosFiltrados.length === 0 ? (
                      <View style={styles.emptyOriginBox}>
                        <Text style={{ color: colors.textSecondary, fontSize: 13, textAlign: 'center' }}>
                          No hay artículos vendibles con ese nombre. Regístralo primero en Inventario.
                        </Text>
                      </View>
                    ) : (
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.originChipsScroll}
                      >
                        {articulosFiltrados.map((art) => {
                          const seleccionado =
                            formData.origenTipo === 'inventario' && formData.origenId === art.id;
                          return (
                            <Pressable
                              key={art.id}
                              onPress={() => handleSeleccionarArticuloInventario(art)}
                              style={[
                                styles.originChip,
                                {
                                  backgroundColor: colors.surface,
                                  borderColor: seleccionado ? colors.primary : colors.border,
                                },
                                seleccionado && { backgroundColor: `${colors.primary}20` },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.originChipTitle,
                                  { color: seleccionado ? colors.primaryLight : colors.text },
                                ]}
                                numberOfLines={1}
                              >
                                {art.nombre}
                              </Text>
                              <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                                Costo ~${art.costoUnitario.toFixed(0)} · Stock: {art.stockDisponible}{' '}
                                {art.unidadOriginal}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </ScrollView>
                    )
                  ) : platillosFiltrados.length === 0 ? (
                    <View style={styles.emptyOriginBox}>
                      <Text style={{ color: colors.textSecondary, fontSize: 13, textAlign: 'center' }}>
                        No hay platillos registrados con ese nombre. Créalo en el Libro de Platillos.
                      </Text>
                    </View>
                  ) : (
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.originChipsScroll}
                    >
                      {platillosFiltrados.map((plat) => {
                        const seleccionado =
                          formData.origenTipo === 'platillo' && formData.origenId === plat.id;
                        return (
                          <Pressable
                            key={plat.id}
                            onPress={() => handleSeleccionarPlatilloCocina(plat)}
                            style={[
                              styles.originChip,
                              {
                                backgroundColor: colors.surface,
                                borderColor: seleccionado ? colors.accent : colors.border,
                              },
                              seleccionado && { backgroundColor: `${colors.accent}20` },
                            ]}
                          >
                            <Text
                              style={[
                                styles.originChipTitle,
                                { color: seleccionado ? colors.accent : colors.text },
                              ]}
                              numberOfLines={1}
                            >
                              {plat.nombre}
                            </Text>
                            <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                              {plat.modoPreparacion === 'produccion_anticipada'
                                ? 'Lote anticipado'
                                : `Cocina (~${plat.prepMin || 15}m)`}{' '}
                              · Costo ~${plat.costoCalculado.toFixed(0)}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </ScrollView>
                  )}
                </View>
              )}

              {/* 2. PRECIO DE VENTA Y COSTO APROXIMADO (Limpio y humano) */}
              <View
                style={[
                  styles.sectionContainer,
                  { backgroundColor: colors.cardElevated, borderColor: colors.borderLight },
                ]}
              >
                <View style={styles.priceRowMain}>
                  <View style={{ flex: 1.1 }}>
                    <Text style={[styles.inputLabel, { color: colors.text }]}>
                      Precio de Venta al Cliente ($) *
                    </Text>
                    <TextInput
                      style={[
                        styles.priceBigInput,
                        {
                          backgroundColor: colors.surface,
                          borderColor: resumenPrecio.precioMenorACosto
                            ? colors.danger
                            : colors.primary,
                          color: colors.text,
                        },
                      ]}
                      value={formData.precio}
                      onChangeText={(v) => onFormDataChange({ ...formData, precio: v })}
                      placeholder="Ej. 160"
                      placeholderTextColor={colors.textMuted}
                      keyboardType="decimal-pad"
                    />
                  </View>

                  <View
                    style={[
                      styles.costSummaryCard,
                      { backgroundColor: colors.surface, borderColor: colors.border },
                    ]}
                  >
                    <View style={styles.costSummaryCol}>
                      <Text style={[styles.metricLabel, { color: colors.textMuted }]}>
                        Te cuesta aprox.
                      </Text>
                      <Text style={[styles.metricValue, { color: colors.textSecondary }]}>
                        {resumenPrecio.costoNoDisponible
                          ? 'Por definir'
                          : `~$${resumenPrecio.costoReferencia.toFixed(2)}`}
                      </Text>
                    </View>

                    <View style={[styles.verticalDivider, { backgroundColor: colors.border }]} />

                    <View style={styles.costSummaryCol}>
                      <Text style={[styles.metricLabel, { color: colors.textMuted }]}>
                        Ganancia libre
                      </Text>
                      <Text
                        style={[
                          styles.metricValue,
                          {
                            color: resumenPrecio.costoNoDisponible
                              ? colors.textMuted
                              : resumenPrecio.diferenciaUnitaria < 0
                                ? colors.danger
                                : colors.primaryLight,
                          },
                        ]}
                      >
                        {resumenPrecio.costoNoDisponible
                          ? '—'
                          : `${resumenPrecio.diferenciaUnitaria >= 0 ? '+' : ''}$${resumenPrecio.diferenciaUnitaria.toFixed(0)}`}
                      </Text>
                    </View>
                  </View>
                </View>

                {formData.costoReferencia > 0 && (
                  <View style={styles.quickPriceSuggestions}>
                    <Text style={{ color: colors.textMuted, fontSize: 12, fontWeight: '600' }}>
                      Sugerencias rápidas sobre tu costo:
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                      {[
                        { label: '+50%', pct: 50 },
                        { label: 'Doble (x2)', pct: 100 },
                        { label: '+150%', pct: 150 },
                        { label: 'Triple (x3)', pct: 200 },
                      ].map((sug) => (
                        <Pressable
                          key={sug.label}
                          onPress={() => handleSugerirPrecio(sug.pct)}
                          style={[
                            styles.quickPctBtn,
                            { backgroundColor: colors.surface, borderColor: colors.borderLight },
                          ]}
                        >
                          <Text style={{ color: colors.primaryLight, fontSize: 12, fontWeight: '700' }}>
                            {sug.label} ($
                            {Math.round(
                              calcularPrecioSugeridoDesdeCosto(
                                formData.costoReferencia,
                                sug.pct,
                                'recargo'
                              ) / 5
                            ) * 5}
                            )
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                )}

                {resumenPrecio.precioMenorACosto && (
                  <View
                    style={[
                      styles.warningBanner,
                      { borderColor: colors.danger, backgroundColor: `${colors.danger}18` },
                    ]}
                  >
                    <Ionicons name="alert-circle" size={16} color={colors.danger} />
                    <Text style={[styles.warningBannerText, { color: colors.danger }]}>
                      El precio (${resumenPrecio.precioVenta.toFixed(0)}) es menor a lo que te cuesta producirlo (~${resumenPrecio.costoReferencia.toFixed(0)}).
                    </Text>
                  </View>
                )}
              </View>

              {/* 3. DÓNDE SE VENDE Y FLUJO DE PREPARACIÓN */}
              <SeccionCanalesYCocina
                formData={formData}
                onFormDataChange={onFormDataChange}
                esPorPedido={esPorPedido}
                showVentaCrudo={l.showVentaCrudo}
              />
            </View>
          )}

          {pestana === 'variantes' && (
            <EditorVariantes
              variantes={formData.variantes}
              onChange={(newVariantes) =>
                onFormDataChange({ ...formData, variantes: newVariantes })
              }
              unidad={formData.unidad}
              esPlatillo={formData.origenTipo === 'platillo'}
              prepMin={formData.prepMin}
              onPrepMinChange={(prepMin) => onFormDataChange({ ...formData, prepMin })}
              showVentaCrudo={false}
              showMenuDigital={false}
            />
          )}

          {pestana === 'inventario' && (
            <PestanaInventario
              formData={formData}
              onFormDataChange={onFormDataChange}
              areas={areas}
            />
          )}
        </ScrollView>

        <View style={[styles.modalFooter, { borderTopColor: colors.border }]}>
          <Pressable
            style={[
              styles.btnSecondary,
              { backgroundColor: colors.card, borderColor: colors.borderLight },
            ]}
            onPress={onCancelar}
            disabled={isSaving}
          >
            <Text style={[styles.btnSecondaryText, { color: colors.textSecondary }]}>Cancelar</Text>
          </Pressable>
          <Pressable
            style={[
              styles.btnPrimary,
              { backgroundColor: colors.primary },
              isSaving && { opacity: 0.5 },
            ]}
            onPress={onGuardar}
            disabled={isSaving}
          >
            <Ionicons name="checkmark-circle-outline" size={18} color={colors.background} />
            <Text style={[styles.btnPrimaryText, { color: colors.background }]}>
              {isSaving ? 'Guardando...' : 'Guardar en Menú'}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  modalCard: {
    borderRadius: theme.borderRadius.xl,
    width: '100%',
    maxWidth: 480,
    maxHeight: '94%',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.45,
    shadowRadius: 20,
    elevation: 12,
  },
  modalCardLarge: {
    maxWidth: 680,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.heavy,
    fontFamily: (theme.typography as any).displayFamily || theme.typography.fontFamily,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 10,
  },
  modalBody: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
  },
  tabsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
    borderBottomWidth: 1,
    paddingBottom: 10,
    flexWrap: 'wrap',
  },
  tabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  tabText: {
    fontSize: theme.typography.sizes.xs,
    fontWeight: theme.typography.weights.semibold,
  },
  tabTextActive: {
    fontWeight: theme.typography.weights.bold,
  },
  modalFormScroll: {
    maxHeight: 460,
  },
  modalFormContent: {
    paddingBottom: 8,
  },
  formSection: {
    gap: 12,
  },
  linkedOriginCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
  },
  originAvatar: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  originBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  originTypePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  changeOriginLink: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  inlineNameInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 15,
    fontWeight: '700',
  },
  originHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  jumpBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  jumpBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  originTypeSelector: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  originTypeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  originTypeTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  originChipsScroll: {
    gap: 8,
    paddingVertical: 4,
  },
  originChip: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    minWidth: 175,
    maxWidth: 240,
  },
  originChipTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  emptyOriginBox: {
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  priceRowMain: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
    flexWrap: 'wrap',
  },
  priceBigInput: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 22,
    fontWeight: '900',
  },
  costSummaryCard: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    minWidth: 210,
  },
  costSummaryCol: {
    alignItems: 'center',
    gap: 2,
  },
  verticalDivider: {
    width: 1,
    height: 30,
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  metricValue: {
    fontSize: 15,
    fontWeight: '800',
  },
  quickPriceSuggestions: {
    marginTop: 10,
    gap: 6,
  },
  quickPctBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 10,
  },
  warningBannerText: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  inputLabel: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.bold,
    marginBottom: 6,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: theme.typography.sizes.sm,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  switchLabel: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.bold,
  },
  switchSublabel: {
    fontSize: theme.typography.sizes.xs,
  },
  sectionContainer: {
    borderRadius: theme.borderRadius.lg,
    padding: 14,
    borderWidth: 1,
  },
  switchRowNested: {
    marginLeft: 10,
    borderLeftWidth: 3,
    paddingLeft: 10,
    marginTop: 6,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  btnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: theme.borderRadius.md,
  },
  btnPrimaryText: {
    fontWeight: theme.typography.weights.bold,
    fontSize: theme.typography.sizes.sm,
  },
  btnSecondary: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
  },
  btnSecondaryText: {
    fontWeight: theme.typography.weights.bold,
    fontSize: theme.typography.sizes.sm,
  },
  visibilityBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  visibilityText: { fontSize: 13, fontWeight: '700' },
  areaOption: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 6,
  },
  areaOptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
