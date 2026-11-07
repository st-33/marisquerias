import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  Animated,
  LayoutAnimation,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  UIManager,
  useWindowDimensions,
  View,
} from 'react-native';
import { type Producto } from '../../../sistema/persistencia';
import {
  computeVariantDeltaAndLabels,
  evaluateRules,
  getOrderedVisibleGroups,
} from '../../../roles/logica/mesero/reglas';
import { useSonidosAlternados } from '../../../capacidades/ui/useSonidosAlternados';
import { useThemedColors, useThemedShadows } from '../../../compartido/hooks/useColoresTema';
import { BotonOpcionVariante } from './BotonOpcionVariante';
import { BarraResumenPasos } from './BarraResumenPasos';
import { PieModalVariantes } from './PieModalVariantes';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export type VariantsModalProps = {
  product: Producto;
  variantSelections: Record<string, string[]>;
  toggleOption: (groupKey: string, optionKey: string, type: 'single' | 'multi') => void;
  onConfirm: () => void;
  onClose: () => void;
};

export const ModalVariantes = React.memo(function ModalVariantes({
  product,
  variantSelections,
  toggleOption,
  onConfirm,
  onClose,
}: VariantsModalProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const { height: screenHeight, width: screenWidth } = useWindowDimensions();
  const [fadeAnim] = useState(() => new Animated.Value(0));
  const [slideAnim] = useState(() => new Animated.Value(screenHeight));
  const isMounted = useRef(true);

  const COLORS = useThemedColors();
  const SHADOWS = useThemedShadows();

  const {
    playSound: playAgregarSound,
    loadSounds,
    cleanup: cleanupSounds,
  } = useSonidosAlternados();

  useEffect(() => {
    isMounted.current = true;
    loadSounds();
    return () => {
      isMounted.current = false;
      cleanupSounds();
    };
  }, [loadSounds, cleanupSounds]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const handleClose = useCallback(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: screenHeight, duration: 220, useNativeDriver: true }),
    ]).start(onClose);
  }, [fadeAnim, slideAnim, screenHeight, onClose]);

  // Datos del producto y reglas
  const prod = product || {};
  const groups = useMemo(() => prod.variantes?.grupos || {}, [prod]);
  const reglas = useMemo(() => prod.variantes?.reglas || {}, [prod]);

  const { hideSet, disabledSet } = useMemo(
    () => evaluateRules(reglas, variantSelections, groups),
    [reglas, variantSelections, groups]
  );

  const visibleGroupIds = useMemo(
    () => getOrderedVisibleGroups(groups, variantSelections, reglas),
    [groups, variantSelections, reglas]
  );

  const totalSteps = visibleGroupIds.length;
  const activeStep = Math.min(Math.max(0, currentStep), Math.max(0, totalSteps - 1));
  const currentGroupId = visibleGroupIds[activeStep];
  const currentGroup = groups[currentGroupId];

  const selectionsInStep = useMemo(
    () => variantSelections[currentGroupId] || [],
    [variantSelections, currentGroupId]
  );

  const { delta, labels } = useMemo(
    () => computeVariantDeltaAndLabels(groups, variantSelections),
    [groups, variantSelections]
  );

  const totalPrice = Math.max(0, (Number(prod.precio) || 0) + delta);

  // Manejo de opción con avance natural
  const handleToggleOption = useCallback(
    (gid: string, oid: string, type: 'single' | 'multi') => {
      if (Platform.OS !== 'web') {
        Haptics.selectionAsync();
      }

      toggleOption(gid, oid, type);

      if (type === 'single' && activeStep < totalSteps - 1) {
        setTimeout(() => {
          if (isMounted.current) {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setCurrentStep((prev) => prev + 1);
          }
        }, 250);
      }
    },
    [toggleOption, activeStep, totalSteps]
  );

  const goBack = useCallback(() => {
    if (activeStep > 0) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setCurrentStep(activeStep - 1);
    }
  }, [activeStep]);

  const goNext = useCallback(() => {
    if (activeStep < totalSteps - 1) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setCurrentStep(activeStep + 1);
    }
  }, [activeStep, totalSteps]);

  const missingRequired = useMemo(
    () =>
      visibleGroupIds.filter((gid) => {
        const group = groups[gid];
        return group?.obligatorio && (variantSelections[gid] || []).length === 0;
      }),
    [visibleGroupIds, groups, variantSelections]
  );

  const canConfirm = missingRequired.length === 0;

  // Cálculo paramétrico de ancho de tarjeta de opción:
  // En tablets/paisaje (> 600): 48% para 2 columnas limpias.
  // En móviles (< 600): 100% para evitar texto apretado.
  const optionWidth = screenWidth < 600 ? '100%' : '48%';

  return (
    <Modal transparent visible animationType="none" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
        </Animated.View>

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
          {/* Header */}
          <View
            style={[
              styles.header,
              { backgroundColor: COLORS.bg.surface, borderBottomColor: COLORS.bg.elevated },
            ]}
          >
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: COLORS.text.primary }]} numberOfLines={1}>
                {prod.nombre || 'Personalizar'}
              </Text>
              <Text style={[styles.subtitle, { color: COLORS.text.secondary }]}>
                {totalSteps > 1
                  ? `Paso ${activeStep + 1} de ${totalSteps}: ${currentGroup?.titulo || ''}`
                  : currentGroup?.titulo || 'Opciones disponibles'}
              </Text>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cerrar modal de variantes"
              onPress={handleClose}
              style={[styles.closeButton, { backgroundColor: COLORS.bg.tertiary }]}
            >
              <Ionicons name="close" size={20} color={COLORS.text.secondary} />
            </Pressable>
          </View>

          {/* Barra de progreso de pasos */}
          <BarraResumenPasos
            visibleGroupIds={visibleGroupIds}
            groups={groups}
            activeStep={activeStep}
            selections={variantSelections}
            labels={labels}
            onSelectStep={setCurrentStep}
          />

          {/* Cuerpo: Grupo de opciones activo */}
          <View style={[styles.bodyContainer, { backgroundColor: COLORS.bg.primary }]}>
            {totalSteps === 0 || !currentGroup ? (
              <View style={styles.emptyState}>
                <Ionicons name="options-outline" size={48} color={COLORS.text.muted} />
                <Text style={[styles.emptyText, { color: COLORS.text.secondary }]}>
                  Sin opciones disponibles para este producto.
                </Text>
              </View>
            ) : (
              <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
              >
                {/* Cabecera del paso */}
                <View style={styles.stepHeader}>
                  <View style={{ flex: 1 }}>
                    <View style={styles.groupHeaderRow}>
                      <Text style={[styles.groupTitle, { color: COLORS.text.primary }]}>
                        {currentGroup.titulo}
                      </Text>
                      {currentGroup.obligatorio && (
                        <View style={[styles.badge, { backgroundColor: COLORS.error }]}>
                          <Text style={styles.badgeText}>OBLIGATORIO</Text>
                        </View>
                      )}
                      {currentGroup.tipo === 'multi' && (
                        <View style={[styles.badge, { backgroundColor: COLORS.primary }]}>
                          <Text style={styles.badgeText}>MÚLTIPLE</Text>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.groupSubtitle, { color: COLORS.text.secondary }]}>
                      {currentGroup.tipo === 'single'
                        ? 'Selecciona una sola opción'
                        : 'Puedes elegir una o varias opciones'}
                    </Text>
                  </View>

                  {activeStep > 0 && (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Volver al paso anterior"
                      onPress={goBack}
                      style={[styles.backButton, { backgroundColor: COLORS.bg.tertiary }]}
                    >
                      <Ionicons name="chevron-back" size={16} color={COLORS.primaryLight} />
                      <Text style={[styles.backButtonText, { color: COLORS.primaryLight }]}>
                        Atrás
                      </Text>
                    </Pressable>
                  )}
                </View>

                {/* Parrilla responsiva de opciones */}
                <View style={styles.optionsGrid}>
                  {Object.entries(currentGroup.opciones || {}).map(
                    ([oid, option]: [string, any]) => {
                      const isSelected = selectionsInStep.includes(oid);
                      const isDisabled = disabledSet.has(`${currentGroupId}:${oid}`);

                      return (
                        <BotonOpcionVariante
                          key={oid}
                          oid={oid}
                          option={option}
                          isSelected={isSelected}
                          isDisabled={isDisabled}
                          groupType={currentGroup.tipo}
                          basePrice={Number(prod.precio) || 0}
                          width={optionWidth}
                          onPress={() =>
                            !isDisabled &&
                            handleToggleOption(currentGroupId, oid, currentGroup.tipo)
                          }
                        />
                      );
                    }
                  )}
                </View>

                {/* Botón Siguiente si es multi-select o si ya hay selección y faltan pasos */}
                {activeStep < totalSteps - 1 &&
                  (currentGroup.tipo === 'multi' || selectionsInStep.length > 0) && (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Avanzar al siguiente paso"
                      onPress={goNext}
                      style={[styles.nextButton, { backgroundColor: COLORS.primary }]}
                    >
                      <Text style={[styles.nextButtonText, { color: COLORS.text.primary }]}>
                        Siguiente paso
                      </Text>
                      <Ionicons name="arrow-forward" size={18} color={COLORS.text.primary} />
                    </Pressable>
                  )}
              </ScrollView>
            )}
          </View>

          {/* Footer de confirmación */}
          <PieModalVariantes
            totalPrice={totalPrice}
            canConfirm={canConfirm}
            missingCount={missingRequired.length}
            onConfirm={() => {
              playAgregarSound();
              onConfirm();
            }}
          />
        </Animated.View>
      </View>
    </Modal>
  );
});

export const VariantsModal = ModalVariantes;
export default ModalVariantes;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    zIndex: 999,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  modalContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '88%',
    height: '84%',
    width: '100%',
    overflow: 'hidden',
    borderTopWidth: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bodyContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 24,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 12,
  },
  groupHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  groupTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  groupSubtitle: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 3,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  backButtonText: {
    fontSize: 12,
    fontWeight: '700',
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  nextButton: {
    marginTop: 20,
    minHeight: 48,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  nextButtonText: {
    fontSize: 15,
    fontWeight: '800',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 12,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
});
