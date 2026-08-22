/**
 * Dirección visual: selector circular de referencia con roles como destinos
 * profundos, halo contenido y accesos secundarios sin botones planos.
 */

import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { ThemeToggle, useAppTheme } from '../../compartido/temas';
import { useRoleSelectorLogic } from '../../roles/logica/selector/useRoleSelectorLogic';
import { BrandSeal } from './BrandSeal';
import { LiquidBackground } from './LiquidBackground';
import { OrbButton } from './OrbButton';
import { MotionReveal } from '../primitivos/AtmosphereLayer';

export function RoleSelectorElite() {
  const { colors, isElite } = useAppTheme();
  const { width, height } = useWindowDimensions();
  const { loading, roles, nombreNegocio, handleRolPress, handleMenuCliente, handleLogout } = useRoleSelectorLogic();
  const compact = width < 520;

  const styles = useMemo(
    () => StyleSheet.create({
      container: { flex: 1, backgroundColor: colors.background },
      scroll: { flexGrow: 1, minHeight: height, paddingBottom: compact ? 62 : 88 },
      content: { alignItems: 'center', alignSelf: 'center', maxWidth: 980, paddingHorizontal: compact ? 12 : 28, width: '100%' },
      roleStage: { alignItems: 'center', width: '100%' },
      roleRow: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: compact ? 14 : 26, justifyContent: 'center', paddingHorizontal: 10, width: '100%' },
      roleCaption: { color: colors.textMuted, fontSize: 10, fontWeight: '700', letterSpacing: 2.8, marginBottom: 16, textTransform: 'uppercase' },
      clientStage: { alignItems: 'center', marginTop: compact ? 26 : 36, width: '100%' },
      clientCaption: { color: isElite ? 'rgba(212,175,55,0.68)' : colors.secondary, fontSize: 9, fontWeight: '800', letterSpacing: 2.4, marginBottom: 12, textTransform: 'uppercase' },
      logout: { alignItems: 'center', flexDirection: 'row', gap: 8, marginBottom: 18, marginTop: compact ? 26 : 34, paddingHorizontal: 18, paddingVertical: 10 },
      logoutText: { color: colors.textMuted, fontSize: 10, fontWeight: '700', letterSpacing: 2.1, textTransform: 'uppercase' },
      loading: { alignItems: 'center', backgroundColor: colors.background, flex: 1, justifyContent: 'center' },
      loadingText: { color: colors.secondary, fontSize: 12, fontWeight: '700', letterSpacing: 3.5, marginTop: 18, textTransform: 'uppercase' },
    }),
    [colors, compact, height, isElite]
  );

  if (loading) {
    return <View style={styles.loading}><ActivityIndicator size="large" color={colors.primary} /><Text style={styles.loadingText}>Cargando roles…</Text></View>;
  }

  return (
    <View style={styles.container}>
      {isElite && <LiquidBackground />}
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <MotionReveal delay={20} axis="down"><BrandSeal nombreNegocio={nombreNegocio} /></MotionReveal>
          <MotionReveal delay={110} style={styles.roleStage}>
            <Text style={styles.roleCaption}>Elige tu estación</Text>
            <View style={styles.roleRow}>
              {roles.map((rol, index) => (
                <OrbButton
                  key={rol.id}
                  icono={rol.icono}
                  etiqueta={rol.nombre}
                  onPress={() => handleRolPress(rol.ruta)}
                  esPrincipal={roles.length === 1 || (roles.length === 3 && index === 1)}
                  esSecundario={roles.length === 2}
                />
              ))}
            </View>
          </MotionReveal>
          <MotionReveal delay={220} style={styles.clientStage}>
            <Text style={styles.clientCaption}>Explora sin operación</Text>
            <OrbButton icono="restaurant-outline" etiqueta="Menú Cliente" onPress={handleMenuCliente} variant="client" />
          </MotionReveal>
          <MotionReveal delay={290}>
          <Pressable accessibilityRole="button" onPress={handleLogout} style={({ pressed }) => [styles.logout, pressed && { opacity: 0.72, transform: [{ scale: 0.98 }] }]}>
            <Ionicons name="arrow-back-circle-outline" size={18} color={colors.textMuted} />
            <Text style={styles.logoutText}>Cambiar de negocio</Text>
          </Pressable>
          </MotionReveal>
        </View>
      </ScrollView>
      <ThemeToggle position="bottom-right" />
    </View>
  );
}
