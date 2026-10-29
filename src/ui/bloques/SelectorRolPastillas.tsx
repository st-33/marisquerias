/**
 * 🃏 SELECTOR DE ROLES - VARIANTE PASTILLAS (DECK VERTICAL TÁCTIL)
 * Diseñado para ergonomía POS, terminales handheld (Sunmi, Clover) y tablets verticales.
 * Cumple Dogma ADI: 100% Manos (UI pura), Cerebro delegado a useLogicaSelectorRoles.
 */

import { Ionicons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { ThemeToggle, useAppTheme } from '../../compartido/temas';
import { useLogicaSelectorRoles } from '../../roles/logica/selector/useLogicaSelectorRoles';
import { FondoLiquido } from './FondoLiquido';
import { SelloMarca } from './SelloMarca';

const DESCRIPCIONES_ROL: Record<string, string> = {
  administrador: 'Métricas, menú, mesas y control de piso',
  mesero: 'Atención a comensales y comanda móvil',
  cocina: 'Monitor KDS y despacho de platillos',
  mostrador: 'Venta rápida y despacho en barra',
  cajero: 'Cobro, facturación y cierre de caja',
  repartidor: 'Rutas de entrega y pedidos externos',
  barman: 'Coctelería y bebidas preparadas',
  barista: 'Cafetería y bebidas calientes',
  parrillero: 'Estación de asador y cortes calientes',
  empacador: 'Empaque de pedidos para llevar',
};

export interface SelectorRolPastillasProps {
  onAlternarEstilo?: () => void;
  estiloActivo?: string;
}

export function SelectorRolPastillas({
  onAlternarEstilo,
  estiloActivo = 'pastillas',
}: SelectorRolPastillasProps) {
  const { colors, theme, isElite } = useAppTheme();
  const { width: screenWidth } = useWindowDimensions();

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

  const dynamicStyles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: colors.background,
        },
        scrollContainer: {
          flexGrow: 1,
          paddingTop: 24,
          paddingBottom: 48,
          alignItems: 'center',
        },
        headerContainer: {
          width: '100%',
          maxWidth: 680,
          paddingHorizontal: 20,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
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
        botonDesvincular: {
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
        botonDesvincularTexto: {
          color: colors.textMuted,
          fontSize: 11,
          fontWeight: '600',
          letterSpacing: 1,
          textTransform: 'uppercase',
        },
        deckWrapper: {
          width: '100%',
          maxWidth: 680,
          paddingHorizontal: 20,
          gap: 14,
        },
        cardPastilla: {
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: 16,
          paddingHorizontal: 20,
          borderRadius: 16,
          backgroundColor: isElite ? 'rgba(17, 17, 21, 0.90)' : colors.card,
          borderWidth: 1,
          borderColor: isElite ? '#2a2520' : colors.border,
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 10,
          elevation: 4,
        },
        cardPastillaPressed: {
          opacity: 0.85,
          transform: [{ scale: 0.985 }],
          borderColor: colors.primary,
        },
        iconoInsignia: {
          width: 52,
          height: 52,
          borderRadius: 26,
          backgroundColor: isElite ? 'rgba(197, 160, 89, 0.12)' : 'rgba(37, 99, 235, 0.12)',
          borderWidth: 1,
          borderColor: isElite ? 'rgba(197, 160, 89, 0.40)' : 'rgba(37, 99, 235, 0.40)',
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: 16,
        },
        infoColumna: {
          flex: 1,
        },
        rolTitulo: {
          fontSize: 16,
          fontWeight: '800',
          color: colors.text,
          letterSpacing: 2,
          textTransform: 'uppercase',
          marginBottom: 3,
        },
        rolDescripcion: {
          fontSize: 12,
          color: colors.textSecondary,
          lineHeight: 16,
        },
        chevron: {
          marginLeft: 12,
        },
        footerAcciones: {
          width: '100%',
          maxWidth: 680,
          marginTop: 28,
          paddingHorizontal: 20,
          alignItems: 'center',
        },
        botonMenuCliente: {
          paddingVertical: 12,
          paddingHorizontal: 30,
          borderRadius: 30,
          backgroundColor: isElite ? 'rgba(255, 255, 255, 0.04)' : 'rgba(37, 99, 235, 0.08)',
          borderWidth: 1,
          borderColor: isElite ? 'rgba(197, 160, 89, 0.25)' : 'rgba(37, 99, 235, 0.25)',
        },
        botonMenuClienteTexto: {
          color: colors.textMuted,
          fontSize: 11,
          fontWeight: '700',
          letterSpacing: 3,
          textTransform: 'uppercase',
        },
      }),
    [colors, isElite, theme.scale, screenWidth]
  );

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ActivityIndicator size="large" color={colors.primary} />
        <Text
          style={{
            color: colors.secondary,
            fontSize: 13,
            letterSpacing: 4,
            marginTop: 18,
            textTransform: 'uppercase',
          }}
        >
          CARGANDO ROLES...
        </Text>
      </View>
    );
  }

  return (
    <View style={dynamicStyles.container}>
      {isElite && <FondoLiquido />}

      <ScrollView
        contentContainerStyle={dynamicStyles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Cabecera ergonómica con botón de cambio de vista y botón de salida seguro */}
        <View style={dynamicStyles.headerContainer}>
          {onAlternarEstilo ? (
            <Pressable onPress={onAlternarEstilo} style={dynamicStyles.switchPill}>
              <Ionicons
                name="shapes-outline"
                size={14}
                color={colors.primary}
              />
              <Text style={dynamicStyles.switchText}>
                {estiloActivo === 'pastillas' ? 'Ver Orbes' : 'Ver Pastillas'}
              </Text>
            </Pressable>
          ) : (
            <View />
          )}

          <Pressable onPress={confirmarSalida} style={dynamicStyles.botonDesvincular}>
            <Ionicons name="log-out-outline" size={14} color={colors.textMuted} />
            <Text style={dynamicStyles.botonDesvincularTexto}>Desvincular</Text>
          </Pressable>
        </View>

        {/* Marca del negocio y logo */}
        <SelloMarca nombreNegocio={nombreNegocio} logoUrl={logoUrl} />

        {/* Deck vertical de roles (Pastillas ergonómicas) */}
        <View style={dynamicStyles.deckWrapper}>
          {roles.map((rol) => {
            const claveRol = rol.id.toLowerCase();
            const descripcion =
              DESCRIPCIONES_ROL[claveRol] || 'Módulo operativo de piso';

            return (
              <Pressable
                key={rol.id}
                onPress={() => handleRolPress(rol.ruta)}
                style={({ pressed }) => [
                  dynamicStyles.cardPastilla,
                  pressed && dynamicStyles.cardPastillaPressed,
                ]}
              >
                <View style={dynamicStyles.iconoInsignia}>
                  <Ionicons
                    name={(rol.icono as any) || 'cube-outline'}
                    size={24}
                    color={colors.primary}
                  />
                </View>

                <View style={dynamicStyles.infoColumna}>
                  <Text style={dynamicStyles.rolTitulo}>{rol.nombre}</Text>
                  <Text style={dynamicStyles.rolDescripcion}>{descripcion}</Text>
                </View>

                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={colors.primary}
                  style={dynamicStyles.chevron}
                />
              </Pressable>
            );
          })}
        </View>

        {/* Footer con Menú Cliente */}
        <View style={dynamicStyles.footerAcciones}>
          <Pressable
            onPress={handleMenuCliente}
            style={({ pressed }) => [
              dynamicStyles.botonMenuCliente,
              pressed && { opacity: 0.7 },
            ]}
          >
            <Text style={dynamicStyles.botonMenuClienteTexto}>Menú Cliente</Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* Toggle de tema */}
      <ThemeToggle position="bottom-right" />
    </View>
  );
}

export default SelectorRolPastillas;
