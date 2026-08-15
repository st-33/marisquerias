import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  LayoutAnimation,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  UIManager,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getVariantOptionLabel, type Producto } from '../../../plataforma/base/_persistencia';
import { theme } from '@compartido/theme';
import { formatMoney } from '../../../compartido/utils/formatters';
import {
  computeVariantDeltaAndLabels,
  evaluateRules,
  getOrderedVisibleGroups,
} from '../../../plataforma/dominios/marisqueria/mesero/rules';
import { useAlternatingSounds } from '../../../plataforma/dominios/alimentos_y_bebidas/useAlternatingSounds';
import { useThemedColors, useThemedShadows } from '../../../compartido/hooks/useThemedColors';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// ---------------------------------------------------------------------------
// TIPOS
// ---------------------------------------------------------------------------
type VariantsModalProps = {
  product: Producto;
  variantSelections: Record<string, string[]>;
  toggleOption: (groupKey: string, optionKey: string, type: 'single' | 'multi') => void;
  onConfirm: () => void;
  onClose: () => void;
};

const ConfirmButton = ({
  onPress,
  title,
  disabled,
}: {
  onPress: () => void;
  title: string;
  disabled?: boolean;
}) => {
  const COLORS = useThemedColors();
  const SHADOWS = useThemedShadows();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.confirmButton,
        disabled ? styles.confirmButtonDisabled : styles.confirmButtonActive,
        {
          backgroundColor: disabled ? COLORS.bg.elevated : COLORS.primary,
          ...(disabled ? {} : SHADOWS.primary),
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
      ]}
    >
      <Ionicons
        name="checkmark-circle"
        size={24}
        color={COLORS.text.primary}
        style={{ marginRight: 8 }}
      />
      <Text style={[styles.confirmButtonText, { color: COLORS.text.primary }]}>{title}</Text>
    </Pressable>
  );
};

// ---------------------------------------------------------------------------
// COMPONENTE PRINCIPAL: VariantsModal (Rebuilt)
// ---------------------------------------------------------------------------
function VariantsModalComponent({
  product,
  variantSelections,
  toggleOption,
  onConfirm,
  onClose,
}: VariantsModalProps) {
  // 1. Estados de Navegación
  const [currentStep, setCurrentStep] = useState(0);
  const [fadeAnim] = useState(() => new Animated.Value(0));
  const [slideAnim] = useState(() => new Animated.Value(SCREEN_HEIGHT));
  const [pulseAnim] = useState(() => new Animated.Value(1)); // ✨ Animación de pulso para selección
  const isMounted = useRef(true);
  const COLORS = useThemedColors();
  const SHADOWS = useThemedShadows();
  const insets = useSafeAreaInsets();

  // 🔊 Sonidos alternantes para botón de agregar
  const {
    playSound: playAgregarSound,
    loadSounds,
    cleanup: cleanupSounds,
  } = useAlternatingSounds();

  useEffect(() => {
    isMounted.current = true;
    loadSounds(); // Precargar sonidos
    return () => {
      isMounted.current = false;
      cleanupSounds();
    };
  }, [loadSounds, cleanupSounds]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: SCREEN_HEIGHT, duration: 250, useNativeDriver: true }),
    ]).start(onClose);
  };

  // 2. Preparación de Datos y Reglas
  const prod = product || {};
  const groups = prod.variantes?.grupos || {};
  const reglas = prod.variantes?.reglas || {};

  // 🔥 NUEVO: Obtener sets de visibilidad y deshabilitado
  const { disabledSet } = evaluateRules(reglas, variantSelections, groups);

  // Obtener grupos visibles ordenados
  const visibleGroupIds = getOrderedVisibleGroups(groups, variantSelections, reglas);
  const totalSteps = visibleGroupIds.length;
  const activeStep = Math.min(currentStep, Math.max(totalSteps - 1, 0));
  const currentGroupId = visibleGroupIds[activeStep];
  const currentGroup = groups[currentGroupId];

  useEffect(() => {
    if (currentStep !== activeStep) {
      setCurrentStep(activeStep);
    }
  }, [activeStep, currentStep]);

  // Cálculo de precio acumulado
  const { delta, labels } = computeVariantDeltaAndLabels(groups, variantSelections);
  const totalPrice = Number(prod.precio || 0) + delta;

  // 🔥 VALIDACIÓN: Verificar si el paso actual ya está completo
  const selectionsInStep = variantSelections[currentGroupId] || [];
  const isStepComplete = !currentGroup?.obligatorio || selectionsInStep.length > 0;

  // 3. Manejadores de Flujo
  // 3. Manejadores de Flujo
  const onToggleOption = (gid: string, oid: string, type: 'single' | 'multi') => {
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync();
    }

    // ✨ Efecto de pulso al seleccionar
    Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1.05, duration: 100, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();

    toggleOption(gid, oid, type);

    // Auto-Advance si es selección única y no es el último paso
    if (type === 'single' && activeStep < totalSteps - 1) {
      setTimeout(() => {
        if (isMounted.current) {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.spring); // ✨ Transición tipo spring más 'satisfactoria'
          setCurrentStep((prev) => prev + 1);
        }
      }, 300); // ✨ Un poco más de tiempo para que se vea la selección
    }
  };

  const goBack = () => {
    if (activeStep > 0) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setCurrentStep(activeStep - 1);
    }
  };

  const goNext = () => {
    if (activeStep < totalSteps - 1 && isStepComplete) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setCurrentStep(activeStep + 1);
    }
  };

  // Validación final para botón de agregar
  const missingRequired = visibleGroupIds.filter((gid) => {
    const group = groups[gid];
    return group?.obligatorio && (variantSelections[gid] || []).length === 0;
  });
  const canConfirm = missingRequired.length === 0;

  // -------------------------------------------------------------------------
  // RENDERIZADO ROBUSTO
  // -------------------------------------------------------------------------
  return (
    <Modal transparent visible animationType="none" onRequestClose={handleClose}>
      <View style={[styles.overlay, { backgroundColor: COLORS.alpha.black50 }]}>
        {/* Fondo oscuro animado */}
        <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
        </Animated.View>

        {/* Contenido Modal animado */}
        <Animated.View
          style={[
            styles.modalContainer,
            {
              backgroundColor: COLORS.bg.primary,
              borderColor: COLORS.bg.elevated,
              ...SHADOWS.lg,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* HEADER */}
          <View
            style={[
              styles.header,
              { backgroundColor: COLORS.bg.surface, borderBottomColor: COLORS.bg.elevated },
            ]}
          >
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: COLORS.text.primary }]} numberOfLines={2}>
                {prod.nombre || 'Personaliza tu producto'}
              </Text>
              <Text style={[styles.subtitle, { color: COLORS.text.secondary }]}>
                Selecciona tus opciones
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cerrar opciones"
              onPress={handleClose}
              style={({ pressed }) => [
                styles.closeButton,
                { backgroundColor: COLORS.bg.tertiary, opacity: pressed ? 0.72 : 1 },
              ]}
            >
              <Ionicons name="close" size={24} color={COLORS.text.secondary} />
            </Pressable>
          </View>

          {/* SUMMARY HEADER (BARRA DE PROGRESO) */}
          <View
            style={[
              styles.summaryBar,
              { backgroundColor: COLORS.bg.primary, borderBottomColor: COLORS.bg.elevated },
            ]}
          >
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.summaryScroll}
            >
              {visibleGroupIds.map((gid, idx) => {
                const g = groups[gid];
                const sel = variantSelections[gid] || [];
                const isDone = sel.length > 0;
                const isActive = activeStep === idx;

                return (
                  <Pressable
                    key={gid}
                    onPress={() => {
                      if (isDone) {
                        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                        setCurrentStep(idx);
                      }
                    }}
                    style={[
                      styles.summaryStep,
                      {
                        backgroundColor: isActive ? COLORS.alpha.primary20 : COLORS.bg.tertiary,
                        borderColor: isActive ? COLORS.primary : COLORS.bg.elevated,
                        opacity: isDone || isActive ? 1 : 0.72,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.summaryStepLabel,
                        { color: isActive ? COLORS.primaryLight : COLORS.text.muted },
                      ]}
                    >
                      {isDone
                        ? labels.find((label) =>
                            Object.values(g.opciones).some(
                              (option) => getVariantOptionLabel(option, '') === label
                            )
                          ) || g.titulo
                        : g.titulo}
                    </Text>
                    {isDone && !isActive && (
                      <Ionicons name="checkmark-circle" size={12} color={COLORS.success} />
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {/* BODY (Current Step) */}
          <View style={[styles.bodyContainer, { backgroundColor: COLORS.bg.primary }]}>
            {totalSteps === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="options-outline" size={48} color={COLORS.text.muted} />
                <Text style={[styles.emptyText, { color: COLORS.text.secondary }]}>
                  Sin opciones disponibles.
                </Text>
              </View>
            ) : (
              <View style={styles.stepContainer}>
                {/* Navegación Back */}
                <View style={styles.stepHeader}>
                  {activeStep > 0 && (
                    <Pressable onPress={goBack} style={styles.backButton}>
                      <Ionicons name="arrow-back" size={20} color={COLORS.primaryLight} />
                      <Text style={[styles.backButtonText, { color: COLORS.primaryLight }]}>
                        Anterior
                      </Text>
                    </Pressable>
                  )}
                  <View style={styles.stepIndicators}>
                    <Text style={[styles.stepCounter, { color: COLORS.text.tertiary }]}>
                      Paso {activeStep + 1} de {totalSteps}
                    </Text>
                  </View>
                </View>

                <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
                  <View
                    style={[
                      styles.groupCard,
                      { backgroundColor: COLORS.bg.secondary, borderColor: COLORS.bg.elevated },
                    ]}
                  >
                    <View style={styles.groupHeader}>
                      <Text style={[styles.groupTitle, { color: COLORS.text.primary }]}>
                        {currentGroup.titulo}
                      </Text>
                      {currentGroup.obligatorio && (
                        <View style={[styles.badgeRequired, { backgroundColor: COLORS.error }]}>
                          <Text style={styles.badgeText}>REQUERIDO</Text>
                        </View>
                      )}
                    </View>

                    <View style={styles.optionsGrid}>
                      {Object.entries(currentGroup.opciones || {}).map(
                        ([oid, option]: [string, any]) => {
                          const isSelected = selectionsInStep.includes(oid);
                          const isDisabled = disabledSet.has(`${currentGroupId}:${oid}`); // 🔄 Lógica Mixtos
                          const hasPrice = typeof option.delta === 'number' && option.delta !== 0;

                          return (
                            <Animated.View key={oid} style={{ transform: [{ scale: pulseAnim }] }}>
                              <Pressable
                                onPress={() =>
                                  !isDisabled &&
                                  onToggleOption(currentGroupId, oid, currentGroup.tipo)
                                }
                                style={({ pressed }) => [
                                  styles.optionButton,
                                  isSelected && styles.optionSelected,
                                  isDisabled && styles.optionDisabled, // UI Deshabilitada
                                  {
                                    backgroundColor: isSelected
                                      ? COLORS.primary
                                      : isDisabled
                                      ? COLORS.bg.secondary
                                      : COLORS.bg.tertiary,
                                    borderColor: isSelected
                                      ? COLORS.primaryLight
                                      : COLORS.bg.elevated,
                                    ...(isSelected ? SHADOWS.primary : {}),
                                    transform: [{ scale: pressed && !isDisabled ? 0.96 : 1 }],
                                  },
                                ]}
                                disabled={isDisabled}
                              >
                                <View style={styles.optionContent}>
                                  <Text
                                    style={[
                                      styles.optionText,
                                      isSelected && styles.optionTextSelected,
                                      isDisabled && styles.optionTextDisabled, // Texto Muted
                                      {
                                        color: isDisabled
                                          ? COLORS.text.muted
                                          : isSelected
                                          ? COLORS.text.primary
                                          : COLORS.text.secondary,
                                      },
                                    ]}
                                  >
                                    {getVariantOptionLabel(option, oid)}
                                  </Text>
                                  {isSelected && (
                                    <Ionicons
                                      name="checkmark-circle"
                                      size={18}
                                      color={COLORS.text.primary}
                                    />
                                  )}
                                  {isDisabled && (
                                    <Ionicons
                                      name="lock-closed"
                                      size={12}
                                      color={COLORS.text.muted}
                                    />
                                  )}
                                </View>
                                {hasPrice ? (
                                  <Text
                                    style={[
                                      styles.priceText,
                                      isSelected && styles.priceTextSelected,
                                      { color: isSelected ? COLORS.warning : COLORS.success },
                                    ]}
                                  >
                                    {currentGroup.tipo === 'single'
                                      ? formatMoney((Number(prod.precio) || 0) + option.delta!)
                                      : `+${formatMoney(option.delta!)}`}
                                  </Text>
                                ) : null}
                              </Pressable>
                            </Animated.View>
                          );
                        }
                      )}
                    </View>
                  </View>
                </ScrollView>

                {/* Botón Siguiente: Solo si es Multi-select o si es Single y el usuario regresó y quiere avanzar sin cambiar */}
                {activeStep < totalSteps - 1 &&
                  (currentGroup.tipo === 'multi' || selectionsInStep.length > 0) && (
                    <Pressable
                      onPress={goNext}
                      disabled={!isStepComplete}
                      style={[
                        styles.nextButton,
                        !isStepComplete && styles.nextButtonDisabled,
                        currentGroup.tipo === 'single' && {
                          backgroundColor: 'rgba(255,255,255,0.05)',
                          borderColor: 'rgba(255,255,255,0.1)',
                          borderWidth: 1,
                        }, // ✨ Estética más discreta para avance manual en single
                      ]}
                    >
                      <Text
                        style={[
                          styles.nextButtonText,
                          currentGroup.tipo === 'single' && { color: '#94a3b8' },
                        ]}
                      >
                        {currentGroup.tipo === 'single' ? 'Continuar con selección' : 'Continuar'}
                      </Text>
                      <Ionicons
                        name="arrow-forward"
                        size={18}
                        color={currentGroup.tipo === 'single' ? '#94a3b8' : 'white'}
                      />
                    </Pressable>
                  )}
              </View>
            )}
          </View>

          {/* FOOTER */}
          <View
            style={[
              styles.footer,
              {
                backgroundColor: COLORS.bg.surface,
                borderTopColor: COLORS.bg.elevated,
                paddingBottom: Math.max(20, insets.bottom + 12),
              },
            ]}
          >
            <View>
              <Text style={[styles.totalLabel, { color: COLORS.text.muted }]}>Total</Text>
              <Text style={[styles.totalPrice, { color: COLORS.success }]}>
                {formatMoney(totalPrice)}
              </Text>
            </View>
            <ConfirmButton
              title={canConfirm ? 'Agregar' : `Selecciona ${missingRequired.length} opción(es)`}
              onPress={() => {
                playAgregarSound(); // 🔊 Sonido alternante
                onConfirm();
              }}
              disabled={!canConfirm}
            />
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// ESTILOS
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    zIndex: 999, // Asegura estar encima de todo
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  modalContainer: {
    backgroundColor: theme.colors.surfaceDark,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '92%',
    width: '100%',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
    backgroundColor: theme.colors.surfaceDark,
    minHeight: 88,
  },
  title: {
    color: theme.colors.text,
    fontSize: 20,
    fontWeight: theme.typography.weights.bold,
  },
  subtitle: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    marginTop: 2,
  },
  closeButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bodyContainer: {
    flex: 1,
    width: '100%',
    backgroundColor: theme.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
    flexGrow: 1,
  },
  // Cards
  groupCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.sm,
  },
  groupDisabled: {
    opacity: 0.5,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    flexWrap: 'wrap',
    gap: 8,
  },
  groupTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
    marginRight: 8,
  },
  badgeRequired: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeMulti: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
  badgeTextMulti: { color: 'white', fontSize: 10, fontWeight: 'bold' },
  // Options
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center', // ✨ Centrado para evitar huecos raros
  },
  optionButton: {
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 16,
    minHeight: 72,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.sm,
  },
  optionSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
    ...theme.shadows.md,
  },
  optionDisabled: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    opacity: 0.5,
  },
  optionText: {
    color: '#cbd5e1',
    fontSize: 17, // ✨ Más grande y visible
    fontWeight: theme.typography.weights.bold,
    textAlign: 'center',
  },
  optionTextSelected: {
    color: 'white',
    fontWeight: theme.typography.weights.heavy,
  },
  optionTextDisabled: {
    color: theme.colors.textMuted,
    opacity: 0.8,
  },
  priceText: {
    color: '#10b981',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 4,
  },
  priceTextSelected: {
    color: '#fbbf24',
  },
  // Empty
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    color: '#94a3b8',
    marginTop: 16,
    fontSize: 16,
  },
  debugText: {
    color: '#475569',
    marginTop: 8,
    fontSize: 12,
  },
  // Footer
  footer: {
    padding: 20,
    backgroundColor: theme.colors.surfaceDark,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    ...theme.shadows.lg,
  },
  totalLabel: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: '600',
  },
  totalPrice: {
    color: '#10b981',
    fontSize: 28,
    fontWeight: '900',
  },
  // SUMMARY BAR
  summaryBar: {
    backgroundColor: theme.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    paddingVertical: 12,
  },
  summaryScroll: {
    paddingHorizontal: 20,
    gap: 8,
  },
  summaryStep: {
    minHeight: 42,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  summaryStepActive: {
    backgroundColor: 'rgba(37, 99, 235, 0.15)',
    borderColor: '#2563eb',
  },
  summaryStepLabel: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '600',
  },
  summaryStepLabelActive: {
    color: '#60a5fa',
  },
  // STEP CONTAINER
  stepContainer: {
    flex: 1,
  },
  stepHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  backButton: {
    minHeight: 48,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  backButtonText: {
    color: '#60a5fa',
    fontSize: 14,
    fontWeight: 'bold',
  },
  stepIndicators: {
    flex: 1,
    alignItems: 'flex-end',
  },
  stepCounter: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '800',
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  nextButton: {
    backgroundColor: '#2563eb',
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    marginHorizontal: 20,
    marginBottom: 10,
    borderRadius: 12,
    gap: 8,
  },
  nextButtonDisabled: {
    backgroundColor: '#1e293b',
    opacity: 0.5,
  },
  nextButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  confirmButton: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 20, // ✨ Más circular
    ...theme.shadows.md,
  },
  confirmButtonActive: {
    backgroundColor: theme.colors.secondary,
  },
  confirmButtonDisabled: {
    backgroundColor: theme.colors.border,
    opacity: 0.5,
  },
  confirmButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: theme.typography.weights.bold,
  },
});

// ⚡ OPTIMIZACIÓN: Comparador personalizado para evitar re-renders innecesarios
const arePropsEqual = (prev: VariantsModalProps, next: VariantsModalProps) => {
  return (
    prev.product.id === next.product.id &&
    prev.onClose === next.onClose && // Funciones estables
    JSON.stringify(prev.variantSelections) === JSON.stringify(next.variantSelections) // Comparación profunda barata
  );
};

export const VariantsModal = React.memo(VariantsModalComponent, arePropsEqual);
