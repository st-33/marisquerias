/**
 * 🎭 SELECTOR DE ROLES - THEME-AWARE
 * Usa colores dinámicos según el tema activo (Elite/Default)
 */

import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { ThemeToggle, useAppTheme } from '../../../compartido/temas';
import { useRoleSelectorLogic } from '../../../plataforma/dominios/alimentos_y_bebidas/useRoleSelectorLogic';
import { BrandSeal } from './BrandSeal';
import { LiquidBackground } from './LiquidBackground';
import { OrbButton } from './OrbButton';
import { StickerLayer } from './StickerLayer';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export function RoleSelectorElite() {
  const { colors, theme, isElite } = useAppTheme();

  const { loading, roles, nombreNegocio, handleRolPress, handleMenuCliente, handleLogout } =
    useRoleSelectorLogic();

  // Estilos dinámicos basados en tema
  const dynamicStyles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: colors.background,
        },
        scrollContainer: {
          flexGrow: 1,
          paddingTop: SCREEN_HEIGHT * 0.02,
          paddingBottom: SCREEN_HEIGHT * 0.08,
        },
        contentWrapper: {
          alignItems: 'center',
          paddingHorizontal: Math.round(20 * theme.scale),
          width: '100%',
          maxWidth: 1000,
          alignSelf: 'center',
        },
        orbGrid: {
          flexDirection: 'row',
          flexWrap: 'wrap',
          justifyContent: 'center',
          alignItems: 'center',
          gap: roles.length > 4 ? Math.round(18 * theme.scale) : Math.round(25 * theme.scale),
          width: '100%',
          paddingHorizontal: 15,
        },
        clientAccessButton: {
          marginTop: SCREEN_HEIGHT * 0.06,
          paddingVertical: Math.round(14 * theme.scale),
          paddingHorizontal: Math.round(35 * theme.scale),
          borderRadius: 50,
          backgroundColor: isElite ? 'rgba(255,255,255,0.03)' : 'rgba(37,99,235,0.08)',
          shadowColor: colors.primary,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.2,
          shadowRadius: 25,
          elevation: 5,
        },
        clientAccessText: {
          textTransform: 'uppercase',
          letterSpacing: Math.round(5 * theme.scale),
          fontSize: Math.round(11 * theme.scale),
          fontWeight: '700',
          color: colors.textMuted,
        },
        logoutButton: {
          marginTop: Math.round(30 * theme.scale),
          marginBottom: Math.round(25 * theme.scale),
          flexDirection: 'row',
          alignItems: 'center',
          gap: Math.round(10 * theme.scale),
          paddingVertical: Math.round(14 * theme.scale),
          paddingHorizontal: Math.round(28 * theme.scale),
          borderRadius: 35,
          backgroundColor: isElite ? 'rgba(142,121,82,0.08)' : 'rgba(100,116,139,0.08)',
        },
        logoutText: {
          fontSize: Math.round(11 * theme.scale),
          letterSpacing: 3,
          color: colors.secondary,
          fontWeight: '600',
          textTransform: 'uppercase',
        },
        loadingContainer: {
          flex: 1,
          backgroundColor: colors.background,
          alignItems: 'center',
          justifyContent: 'center',
        },
        loadingText: {
          color: colors.secondary,
          fontSize: 14,
          letterSpacing: 4,
          marginTop: 20,
          textTransform: 'uppercase',
        },
      }),
    [colors, theme, isElite, roles.length]
  );

  if (loading) {
    return (
      <View style={dynamicStyles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={dynamicStyles.loadingText}>CARGANDO...</Text>
      </View>
    );
  }

  return (
    <View style={dynamicStyles.container}>
      {/* Fondo animado (solo en tema elite) */}
      {isElite && <LiquidBackground />}

      {/* Stickers (solo en tema elite) */}
      {isElite && <StickerLayer />}

      {/* Contenido scrollable */}
      <ScrollView
        contentContainerStyle={dynamicStyles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={dynamicStyles.contentWrapper}>
          {/* Nombre del negocio */}
          <BrandSeal nombreNegocio={nombreNegocio} />

          {/* Grid de roles */}
          <View style={dynamicStyles.orbGrid}>
            {roles.map((rol, index) => {
              const esPrincipal = roles.length <= 2 && index === 0;
              const esSecundario = roles.length === 3 && index === 0;

              return (
                <OrbButton
                  key={rol.id}
                  icono={rol.icono}
                  etiqueta={rol.nombre}
                  onPress={() => handleRolPress(rol.ruta)}
                  esPrincipal={esPrincipal}
                  esSecundario={esSecundario}
                />
              );
            })}
          </View>

          {/* Botón Menú Cliente */}
          <Pressable onPress={handleMenuCliente}>
            {({ pressed }) => (
              <View style={[dynamicStyles.clientAccessButton, pressed && { opacity: 0.7 }]}>
                <Text style={dynamicStyles.clientAccessText}>Menú Cliente</Text>
              </View>
            )}
          </Pressable>

          {/* Botón Cambiar de Negocio */}
          <Pressable onPress={handleLogout} style={dynamicStyles.logoutButton}>
            {({ pressed }) => (
              <>
                <Ionicons
                  name="arrow-back-circle-outline"
                  size={Math.round(22 * theme.scale)}
                  color={pressed ? colors.primary : colors.secondary}
                />
                <Text style={[dynamicStyles.logoutText, pressed && { color: colors.primaryLight }]}>
                  Cambiar de Negocio
                </Text>
              </>
            )}
          </Pressable>
        </View>
      </ScrollView>

      {/* Toggle de tema */}
      <ThemeToggle position="bottom-right" />
    </View>
  );
}
