import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Animated, Platform, Pressable, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RADIUS, SPACING, TYPOGRAPHY } from '../../compartido/constantes/theme';
import { useThemedColors, useThemedShadows } from '../../compartido/hooks/useThemedColors';
import { formatMoney } from '../../compartido/utils/formatters';
import { useAlternatingSounds } from '../../capacidades/ui/useAlternatingSounds';

type Mode = 'table' | 'takeaway' | null;

type ActionAreaProps = {
  total: number;
  pendingCount: number;
  liveItemsCount: number;
  mode: Mode;
  activeOrderId: string | null;
  hasUndelivered?: boolean;
  allItemsDelivered: boolean;
  hasPrinted: boolean;
  canMarkPaid: boolean;
  isCollapsed?: boolean;
  isPrinting?: boolean;
  isSending?: boolean;
  canSend?: boolean;
  permissionToPrint: boolean;
  onAdd: () => void;
  onSend: () => void;
  onPrintBill: () => void;
  onBill: () => void;
  onPaid: () => void;
};

function ActionAreaComponent(props: ActionAreaProps) {
  const {
    total,
    pendingCount,
    liveItemsCount,
    mode,
    activeOrderId,
    allItemsDelivered,
    hasPrinted,
    canMarkPaid,
    isCollapsed,
    isPrinting,
    isSending,
    canSend = true,
    permissionToPrint,
    onAdd,
    onSend,
    onPrintBill,
    onBill,
    onPaid,
  } = props;
  const insets = useSafeAreaInsets();
  const COLORS = useThemedColors();
  const SHADOWS = useThemedShadows();

  // 🔊 Sonidos alternantes para botón AÑADIR
  const { playSound: playAddSound, loadSounds, cleanup: cleanupSounds } = useAlternatingSounds();

  useEffect(() => {
    loadSounds(); // Precargar sonidos
    return () => cleanupSounds();
  }, [loadSounds, cleanupSounds]);

  // Animación de colapso (memoizado)
  const [heightAnim] = useState(() => new Animated.Value(1));

  useEffect(() => {
    Animated.timing(heightAnim, {
      toValue: isCollapsed ? 0 : 1,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [isCollapsed, heightAnim]);

  // 🔴 LÓGICA MEMOIZADA: ¿Cuándo mostrar botón "Imprimir Cuenta"?
  const showPrintBillButton = useMemo(
    () => allItemsDelivered && liveItemsCount > 0,
    [allItemsDelivered, liveItemsCount]
  );

  // 🔴 LÓGICA MEMOIZADA: ¿Cuándo mostrar botón "Pagado"?
  const showPaidButton = useMemo(() => canMarkPaid, [canMarkPaid]);
  const actionLayoutKey = [
    mode,
    pendingCount > 0 ? 'send' : 'idle',
    showPrintBillButton ? 'print' : '',
    showPaidButton ? 'paid' : '',
    !permissionToPrint ? 'request' : '',
  ].join(':');
  const [actionTransition] = useState(() => new Animated.Value(1));

  useEffect(() => {
    actionTransition.setValue(0.94);
    const animation = Animated.timing(actionTransition, {
      toValue: 1,
      duration: 220,
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [actionLayoutKey, actionTransition]);

  // 🔊 Handler con sonido para AÑADIR
  const handleAddWithSound = () => {
    playAddSound(); // 🔊 Sonido alternante
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onAdd();
  };

  return (
    <View
      style={{
        borderTopWidth: 1,
        borderTopColor: COLORS.bg.elevated,
        paddingHorizontal: SPACING.lg + 2,
        paddingTop: SPACING.xs - 1,
        paddingBottom: Math.max(18, insets.bottom + 4),
      }}
    >
      {/* Tarjeta de total con animación de colapso */}
      <Animated.View
        style={{
          height: heightAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [0, 60],
          }),
          opacity: heightAnim,
          overflow: 'hidden',
          marginBottom: heightAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [0, 6],
          }),
        }}
      >
        <View
          style={{
            backgroundColor: COLORS.bg.tertiary,
            borderRadius: RADIUS.lg,
            paddingVertical: 7,
            paddingHorizontal: SPACING.md,
            borderWidth: 1,
            borderColor: COLORS.bg.elevated,
            ...SHADOWS.sm,
          }}
        >
          <View
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
          >
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  color: COLORS.text.tertiary,
                  fontSize: TYPOGRAPHY.sizes.sm,
                  fontWeight: TYPOGRAPHY.weights.bold,
                  letterSpacing: 1,
                }}
              >
                TOTAL PEDIDO
              </Text>
              <Text
                style={{
                  color: COLORS.text.muted,
                  fontSize: TYPOGRAPHY.sizes.sm,
                  fontWeight: TYPOGRAPHY.weights.semibold,
                  marginTop: 5,
                }}
              >
                {pendingCount + liveItemsCount}{' '}
                {pendingCount + liveItemsCount === 1 ? 'item' : 'items'}
              </Text>
            </View>
            <Text
              style={{
                color: COLORS.primary,
                fontWeight: TYPOGRAPHY.weights.black,
                fontSize: TYPOGRAPHY.sizes.display,
              }}
            >
              {formatMoney(total)}
            </Text>
          </View>
        </View>
      </Animated.View>

      <Animated.View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: SPACING.sm,
          marginTop: SPACING.sm,
          opacity: actionTransition,
          transform: [
            {
              translateY: actionTransition.interpolate({
                inputRange: [0.94, 1],
                outputRange: [6, 0],
              }),
            },
          ],
        }}
      >
        {/* 🔊 Botón AÑADIR con sonido */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Añadir producto al pedido"
          onPress={handleAddWithSound}
          style={({ pressed }) => ({
            backgroundColor: COLORS.alpha.primary10,
            borderWidth: 1.5,
            borderColor: COLORS.primary,
            flex: 1,
            minHeight: 54,
            paddingHorizontal: SPACING.md,
            paddingVertical: 12,
            borderRadius: RADIUS.xl + 1,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: pressed ? 0.95 : 1,
            transform: [{ scale: pressed ? 0.98 : 1 }],
          })}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.md - 3 }}>
            <Ionicons name="add-circle" size={30} color={COLORS.primary} />
            <Text
              style={{
                color: COLORS.primary,
                fontWeight: TYPOGRAPHY.weights.bold,
                fontSize: TYPOGRAPHY.sizes.lg,
              }}
            >
              AÑADIR
            </Text>
          </View>
        </Pressable>

        {/* DECISIÓN: ¿Qué botón mostrar? */}
        {pendingCount > 0 ? (
          // CASO 1: Hay items pendientes → Botón ENVIAR
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Enviar pedido a Cocina"
            onPress={onSend}
            disabled={!mode || !canSend || isSending}
            style={({ pressed }) => ({
              backgroundColor: !mode || !canSend || isSending ? COLORS.bg.elevated : COLORS.primary,
              flex: 1.35,
              minHeight: 54,
              paddingHorizontal: SPACING.md,
              paddingVertical: 14,
              borderRadius: RADIUS.lg,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed || isSending ? 0.95 : 1,
              transform: [{ scale: pressed && !isSending ? 0.98 : 1 }],
              ...(!mode || !canSend || isSending ? {} : SHADOWS.primary),
            })}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm }}>
              {isSending ? (
                <React.Fragment>
                  <ActivityIndicator size="small" color={COLORS.text.primary} />
                  <Text
                    style={{
                      color: COLORS.text.primary,
                      fontWeight: TYPOGRAPHY.weights.bold,
                      fontSize: TYPOGRAPHY.sizes.lg,
                    }}
                  >
                    ENVIANDO...
                  </Text>
                </React.Fragment>
              ) : (
                <React.Fragment>
                  <Ionicons name="paper-plane" size={20} color={COLORS.text.primary} />
                  <Text
                    style={{
                      color: COLORS.text.primary,
                      fontWeight: TYPOGRAPHY.weights.bold,
                      fontSize: TYPOGRAPHY.sizes.lg,
                    }}
                  >
                    ENVIAR
                  </Text>
                  {pendingCount > 1 && (
                    <View
                      style={{
                        backgroundColor: COLORS.alpha.black30,
                        paddingHorizontal: 6,
                        paddingVertical: 2,
                        borderRadius: RADIUS.md,
                        minWidth: 20,
                        alignItems: 'center',
                      }}
                    >
                      <Text
                        style={{
                          color: COLORS.text.primary,
                          fontSize: TYPOGRAPHY.sizes.sm,
                          fontWeight: TYPOGRAPHY.weights.bold,
                        }}
                      >
                        {pendingCount}
                      </Text>
                    </View>
                  )}
                </React.Fragment>
              )}
            </View>
          </Pressable>
        ) : mode === 'table' && !!activeOrderId ? (
          // CASO 2: Mesa activa sin pendientes
          <>
            {/* Botón IMPRIMIR CUENTA - MANUAL (solo si todos entregados) */}
            {showPrintBillButton && (
              <Pressable
                onPress={onPrintBill}
                disabled={isPrinting}
                style={({ pressed }) => ({
                  backgroundColor: isPrinting ? COLORS.bg.elevated : COLORS.primary,
                  flex: showPaidButton ? 1.2 : 1.5,
                  minHeight: 54,
                  paddingHorizontal: SPACING.md,
                  paddingVertical: 14,
                  borderRadius: RADIUS.lg,
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: pressed || isPrinting ? 0.95 : 1,
                  transform: [{ scale: pressed && !isPrinting ? 0.98 : 1 }],
                  ...(isPrinting ? {} : SHADOWS.primary),
                })}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.xs }}>
                  {isPrinting ? (
                    <React.Fragment>
                      <ActivityIndicator size="small" color={COLORS.text.primary} />
                      <Text
                        style={{
                          color: COLORS.text.primary,
                          fontWeight: TYPOGRAPHY.weights.bold,
                          fontSize: TYPOGRAPHY.sizes.md,
                        }}
                      >
                        ENVIANDO...
                      </Text>
                    </React.Fragment>
                  ) : (
                    <React.Fragment>
                      <Ionicons name="print" size={20} color={COLORS.text.primary} />
                      <Text
                        style={{
                          color: COLORS.text.primary,
                          fontWeight: TYPOGRAPHY.weights.bold,
                          fontSize: TYPOGRAPHY.sizes.md,
                        }}
                      >
                        {hasPrinted ? 'REIMPRIMIR' : 'IMPRIMIR'}
                      </Text>
                    </React.Fragment>
                  )}
                </View>
              </Pressable>
            )}

            {/* Botón PAGADO - Solo si ya imprimió */}
            {showPaidButton && (
              <Pressable
                onPress={onPaid}
                style={({ pressed }) => ({
                  backgroundColor: COLORS.success,
                  flex: 1.5,
                  minHeight: 54,
                  paddingHorizontal: SPACING.md,
                  paddingVertical: 14,
                  borderRadius: RADIUS.lg,
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: pressed ? 0.95 : 1,
                  transform: [{ scale: pressed ? 0.98 : 1 }],
                  ...SHADOWS.success,
                })}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm }}>
                  <Ionicons name="checkmark-circle" size={24} color={COLORS.text.primary} />
                  <Text
                    style={{
                      color: COLORS.text.primary,
                      fontWeight: TYPOGRAPHY.weights.black,
                      fontSize: TYPOGRAPHY.sizes.lg,
                    }}
                  >
                    PAGADO
                  </Text>
                </View>
              </Pressable>
            )}

            {/* Botón SOLICITAR CUENTA - Solo si no tiene permiso y no imprimió */}
            {!showPrintBillButton && !showPaidButton && !permissionToPrint && (
              <Pressable
                onPress={onBill}
                style={({ pressed }) => ({
                  backgroundColor: COLORS.warning,
                  flex: 1.3,
                  minHeight: 54,
                  paddingHorizontal: SPACING.md,
                  paddingVertical: 14,
                  borderRadius: RADIUS.lg,
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: pressed ? 0.95 : 1,
                  transform: [{ scale: pressed ? 0.98 : 1 }],
                  ...SHADOWS.warning,
                })}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.xs }}>
                  <Ionicons name="receipt" size={20} color={COLORS.text.primary} />
                  <Text
                    style={{
                      color: COLORS.text.primary,
                      fontWeight: TYPOGRAPHY.weights.bold,
                      fontSize: TYPOGRAPHY.sizes.md,
                    }}
                  >
                    SOLICITAR
                  </Text>
                </View>
              </Pressable>
            )}
          </>
        ) : null}
      </Animated.View>
    </View>
  );
}

export const ActionArea = React.memo(ActionAreaComponent);
