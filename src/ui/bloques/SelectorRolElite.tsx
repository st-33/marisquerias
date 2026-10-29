/**
 * 🎭 SELECTOR DE ROLES - THEME-AWARE
 * Usa colores dinámicos según el tema activo (Elite/Default)
 */

import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  useWindowDimensions,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { ThemeToggle, useAppTheme } from '../../compartido/temas';
import { useLogicaSelectorRoles } from '../../roles/logica/selector/useLogicaSelectorRoles';
import { SelloMarca } from './SelloMarca';
import { FondoLiquido } from './FondoLiquido';
import { BotonOrbe } from './BotonOrbe';
import { CapaEstampa } from './CapaEstampa';

export interface SelectorRolEliteProps {
  onAlternarEstilo?: () => void;
  estiloActivo?: string;
}

export function SelectorRolElite({
  onAlternarEstilo,
  estiloActivo = 'orbes',
}: SelectorRolEliteProps = {}) {
  const { colors, theme, isElite } = useAppTheme();
  const { height: screenHeight } = useWindowDimensions();

  const { loading, roles, nombreNegocio, logoUrl, handleRolPress, handleMenuCliente, handleLogout } =
    useLogicaSelectorRoles();

  const confirmarSalida = () => {
    if (Platform.OS === 'web') {
      const seguro = window.confirm('¿Deseas desvincular esta terminal y cambiar de negocio?');
      if (seguro) handleLogout();
    } else {
      Alert.alert(
        'Cambiar de Negocio',
        '¿Deseas desvincular esta terminal y regresar a la pantalla de código?',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Desvincular', style: 'destructive', onPress: handleLogout },
        ]
      );
    }
  };

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
          paddingTop: screenHeight * 0.02,
          paddingBottom: screenHeight * 0.08,
        },
        contentWrapper: {
          alignItems: 'center',
          paddingHorizontal: Math.round(20 * theme.scale),
          width: '100%',
          maxWidth: 1000,
          alignSelf: 'center',
        },
        headerContainer: {
          width: '100%',
          maxWidth: 680,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
          paddingHorizontal: 8,
        },
        switchPill: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          paddingVertical: 6,
          paddingHorizontal: 12,
          borderRadius: 20,
          backgroundColor: isElite ? 'rgba(197, 160, 89, 0.12)' : 'rgba(37, 99, 235, 0.12)',
          borderWidth: 1,
          borderColor: isElite ? 'rgba(197, 160, 89, 0.35)' : 'rgba(37, 99, 235, 0.35)',
        },
        switchText: {
          color: colors.primary,
          fontSize: 11,
          fontWeight: '700',
          letterSpacing: 1,
          textTransform: 'uppercase',
        },
        botonDesvincularTop: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          paddingVertical: 6,
          paddingHorizontal: 12,
          borderRadius: 20,
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          borderWidth: 1,
          borderColor: 'rgba(255, 255, 255, 0.12)',
        },
        botonDesvincularTopTexto: {
          color: colors.textMuted,
          fontSize: 11,
          fontWeight: '600',
          letterSpacing: 1,
          textTransform: 'uppercase',
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
          marginTop: screenHeight * 0.06,
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
    [colors, theme, isElite, roles.length, screenHeight]
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
      {isElite && <FondoLiquido />}

      {/* Stickers (solo en tema elite) */}
      {isElite && <CapaEstampa />}

      {/* Contenido scrollable */}
      <ScrollView
        contentContainerStyle={dynamicStyles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={dynamicStyles.contentWrapper}>
          {/* Cabecera ergonómica con botón de cambio de vista y botón de salida seguro */}
          <View style={dynamicStyles.headerContainer}>
            {onAlternarEstilo ? (
              <Pressable onPress={onAlternarEstilo} style={dynamicStyles.switchPill}>
                <Ionicons name="shapes-outline" size={14} color={colors.primary} />
                <Text style={dynamicStyles.switchText}>
                  {estiloActivo === 'orbes' ? 'Ver Pastillas' : 'Ver Orbes'}
                </Text>
              </Pressable>
            ) : (
              <View />
            )}

            <Pressable onPress={confirmarSalida} style={dynamicStyles.botonDesvincularTop}>
              <Ionicons name="log-out-outline" size={14} color={colors.textMuted} />
              <Text style={dynamicStyles.botonDesvincularTopTexto}>Desvincular</Text>
            </Pressable>
          </View>

          {/* Nombre del negocio y logo */}
          <SelloMarca nombreNegocio={nombreNegocio} logoUrl={logoUrl} />

          {/* Grid de roles */}
          <View style={dynamicStyles.orbGrid}>
            {roles.map((rol, index) => {
              const esPrincipal = roles.length <= 2 && index === 0;
              const esSecundario = roles.length === 3 && index === 0;

              return (
                <BotonOrbe
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
        </View>
      </ScrollView>

      {/* Toggle de tema */}
      <ThemeToggle position="bottom-right" />
    </View>
  );
}

export const RoleSelectorElite = SelectorRolElite;
export default SelectorRolElite;
