/**
 * 🪪 TARJETA DE CONFIRMACIÓN PREVIA AL GUARDADO
 *
 * Especificación exacta:
 * - Nombre visible del negocio arriba.
 * - Avatar grande a la izquierda.
 * - Nombre completo y edad a la derecha.
 * - Tarjeta inferior con el cargo seleccionado.
 * - Botón verde prominente "Comenzar" con flecha o checkmark.
 * - Cero texto plano "hombre/mujer", cero mensaje técnico "verifica tus datos".
 */

import React from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AvatarUsuario } from './AvatarUsuario';
import type { SexoUsuario } from '../../../sistema/usuarios/tipos';
import { useAppTheme } from '../../../compartido/temas';

interface TarjetaConfirmacionUsuarioProps {
  visible: boolean;
  nombreNegocio: string;
  nombre: string;
  edad: number;
  sexo: SexoUsuario;
  cargo: string;
  cargando?: boolean;
  onConfirmar: () => void;
  onEditar: () => void;
}

export function TarjetaConfirmacionUsuario({
  visible,
  nombreNegocio,
  nombre,
  edad,
  sexo,
  cargo,
  cargando = false,
  onConfirmar,
  onEditar,
}: TarjetaConfirmacionUsuarioProps) {
  const { colors, isElite } = useAppTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onEditar}
    >
      <View style={estilos.overlay}>
        <View
          style={[
            estilos.tarjeta,
            {
              backgroundColor: isElite ? '#0D1117' : '#141824',
              borderColor: isElite ? 'rgba(197, 160, 89, 0.3)' : 'rgba(255, 255, 255, 0.08)',
            },
          ]}
        >
          {/* 1. Nombre visible del negocio arriba */}
          <View style={estilos.cabeceraNegocio}>
            <View style={estilos.iconoTienda}>
              <Ionicons name="storefront" size={14} color="#C5A059" />
            </View>
            <Text
              style={[
                estilos.textoNombreNegocio,
                { color: isElite ? '#E5C07B' : colors.text },
              ]}
              numberOfLines={1}
            >
              {nombreNegocio || 'MARISQUERÍAS'}
            </Text>
          </View>

          {/* 2. Cuerpo: Avatar grande izquierda, Nombre y Edad derecha */}
          <View style={estilos.cuerpoIdentidad}>
            <View style={estilos.columnaAvatar}>
              <AvatarUsuario sexo={sexo} size={92} activo />
            </View>

            <View style={estilos.columnaDatos}>
              <Text
                style={[
                  estilos.textoNombreCompleto,
                  { color: colors.text },
                ]}
                numberOfLines={2}
              >
                {nombre}
              </Text>

              <View style={estilos.filaEdad}>
                <View style={estilos.insigniaEdad}>
                  <Text style={estilos.textoEdad}>{edad} años</Text>
                </View>
              </View>
            </View>
          </View>

          {/* 3. Tarjeta inferior con el cargo seleccionado */}
          <View
            style={[
              estilos.tarjetaCargo,
              {
                backgroundColor: isElite ? 'rgba(197, 160, 89, 0.08)' : 'rgba(255, 255, 255, 0.04)',
                borderColor: isElite ? 'rgba(197, 160, 89, 0.2)' : 'rgba(255, 255, 255, 0.08)',
              },
            ]}
          >
            <Ionicons name="briefcase-outline" size={16} color="#38BDF8" />
            <Text style={estilos.etiquetaCargo}>Puesto Operativo:</Text>
            <Text style={estilos.valorCargo}>{cargo.toUpperCase()}</Text>
          </View>

          {/* 4. Acciones: Botón verde prominente "Comenzar" */}
          <View style={estilos.contenedorAcciones}>
            <Pressable
              onPress={onConfirmar}
              disabled={cargando}
              style={({ pressed }) => [
                estilos.botonComenzar,
                pressed && { opacity: 0.85, transform: [{ scale: 0.99 }] },
                cargando && { opacity: 0.6 },
              ]}
              testID="boton-comenzar-registro"
            >
              {cargando ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Text style={estilos.textoBotonComenzar}>Comenzar</Text>
                  <Ionicons name="arrow-forward-circle" size={24} color="#FFFFFF" />
                </>
              )}
            </Pressable>

            <Pressable
              onPress={onEditar}
              disabled={cargando}
              style={({ pressed }) => [
                estilos.botonModificar,
                pressed && { opacity: 0.7 },
              ]}
            >
              <Ionicons name="create-outline" size={15} color="#94A3B8" />
              <Text style={estilos.textoBotonModificar}>Modificar datos</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const estilos = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  tarjeta: {
    width: '100%',
    maxWidth: 440,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 10,
    gap: 18,
  },
  cabeceraNegocio: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  iconoTienda: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(197, 160, 89, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  textoNombreNegocio: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  cuerpoIdentidad: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    paddingVertical: 6,
  },
  columnaAvatar: {
    flexShrink: 0,
  },
  columnaDatos: {
    flex: 1,
    gap: 6,
  },
  textoNombreCompleto: {
    fontSize: 19,
    fontWeight: '800',
    lineHeight: 24,
  },
  filaEdad: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  insigniaEdad: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  textoEdad: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '700',
  },
  tarjetaCargo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  etiquetaCargo: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  valorCargo: {
    color: '#38BDF8',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  contenedorAcciones: {
    gap: 10,
    marginTop: 4,
  },
  botonComenzar: {
    backgroundColor: '#10B981', // Verde prominente
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    borderRadius: 14,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 4,
  },
  textoBotonComenzar: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  botonModificar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  textoBotonModificar: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
});
