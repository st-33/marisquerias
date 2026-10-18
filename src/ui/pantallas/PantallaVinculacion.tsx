/**
 * 📲 PANTALLA DE VINCULACIÓN — ARRANQUE O(1)
 *
 * Flujo UX:
 * 1. Input sanitizado en tiempo real (6-8 chars, mayúsculas, alfanumérico + guion, sin espacios).
 * 2. Botón "Vincular negocio" condicionado a >= 6 caracteres.
 * 3. Feedback de carga mientras resuelve en Unidad Secundaria.
 * 4. Despliegue de errores con ErrorArranque (7 variantes canónicas).
 * 5. Redirección automática post-arranque (rol preferente o selector si > 1 rol).
 */

import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { router } from 'expo-router';
import { useArranqueO1 } from '../../sistema/instalacion/useArranqueSistema';
import { getRtdb } from '../../sistema/firebase';
import { ErrorArranque } from '../bloques/ErrorArranque';
import { SelloMarca } from '../bloques/SelloMarca';

/**
 * Sanitiza la entrada del usuario impidiendo espacios o caracteres inválidos.
 */
export function sanitizarCodigoInput(valor: string): string {
  return valor
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, '')
    .slice(0, 8);
}

export function PantallaVinculacion() {
  const [codigo, setCodigo] = useState('');
  const { loading, errorInfo, arrancar, resetError } = useArranqueO1();

  const esValidoParaEnviar = useMemo(() => {
    return codigo.length >= 6 && codigo.length <= 8;
  }, [codigo]);

  const handleCambioTexto = (texto: string) => {
    if (errorInfo) resetError();
    setCodigo(sanitizarCodigoInput(texto));
  };

  const handleVincular = async () => {
    if (!esValidoParaEnviar || loading) return;

    try {
      const db = getRtdb();
      const resultado = await arrancar(db, codigo);

      if (resultado.ok) {
        if (resultado.requiereSeleccionRol) {
          router.replace('/_role/roles');
        } else {
          router.replace(resultado.rutaPorDefecto as any);
        }
      }
    } catch {
      // El hook useArranqueO1 ya gestiona y clasifica el error internamente
    }
  };

  const handleReintentar = () => {
    resetError();
  };

  const handleSalir = () => {
    resetError();
    setCodigo('');
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.keyboardContainer}
    >
      <View style={styles.container}>
        <View style={styles.card}>
          <View style={styles.selloWrapper}>
            <SelloMarca nombreNegocio="Marisquerías" />
          </View>

          <Text style={styles.titulo}>Vincular Dispositivo</Text>
          <Text style={styles.subtitulo}>
            Ingresa el código de acceso proporcionado por Torre de Control para inicializar tu
            terminal operativa.
          </Text>

          {errorInfo ? (
            <ErrorArranque
              errorInfo={errorInfo}
              onReintentar={handleReintentar}
              onSalir={handleSalir}
            />
          ) : (
            <>
              <View style={styles.inputWrapper}>
                <Text style={styles.label}>CÓDIGO DE ACCESO (6-8 CARACTERES)</Text>
                <TextInput
                  value={codigo}
                  onChangeText={handleCambioTexto}
                  placeholder="TEST-123"
                  placeholderTextColor="#475569"
                  autoCapitalize="characters"
                  autoCorrect={false}
                  maxLength={8}
                  editable={!loading}
                  style={styles.input}
                  returnKeyType="done"
                  onSubmitEditing={handleVincular}
                  testID="input-codigo-acceso"
                />
                <Text style={styles.contador}>{codigo.length}/8</Text>
              </View>

              <Pressable
                onPress={handleVincular}
                disabled={!esValidoParaEnviar || loading}
                testID="boton-vincular"
                style={({ pressed }) => [
                  styles.botonVincular,
                  (!esValidoParaEnviar || loading) && styles.botonDeshabilitado,
                  pressed && esValidoParaEnviar && !loading && { opacity: 0.9 },
                ]}
              >
                {loading ? (
                  <View style={styles.cargandoWrapper}>
                    <ActivityIndicator color="#ffffff" size="small" />
                    <Text style={styles.textoBoton}>Verificando en Torre de Control...</Text>
                  </View>
                ) : (
                  <Text style={styles.textoBoton}>Vincular Negocio</Text>
                )}
              </Pressable>
            </>
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

export default PantallaVinculacion;

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
    backgroundColor: '#0a0f1d',
  },
  container: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0a0f1d',
  },
  card: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: '#111827',
    padding: 32,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    shadowColor: '#000',
    shadowOpacity: 0.6,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 16,
  },
  selloWrapper: {
    alignItems: 'center',
    marginBottom: 16,
  },
  titulo: {
    color: '#ffffff',
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subtitulo: {
    color: '#94a3b8',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
    lineHeight: 20,
  },
  inputWrapper: {
    marginBottom: 20,
  },
  label: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#030712',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 3,
    paddingHorizontal: 16,
    paddingVertical: 14,
    textAlign: 'center',
  },
  contador: {
    color: '#475569',
    fontSize: 11,
    textAlign: 'right',
    marginTop: 6,
  },
  botonVincular: {
    backgroundColor: '#0284c7',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  botonDeshabilitado: {
    backgroundColor: '#1e293b',
    opacity: 0.6,
  },
  cargandoWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  textoBoton: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
