/**
 * 📲 PANTALLA DE VINCULACIÓN — ARRANQUE O(1)
 *
 * Flujo UX:
 * 1. Entrada de código de acceso sin restricciones visuales innecesarias.
 * 2. Fondo ambiental "MI NEGOCIO A UN CLICK".
 * 3. Tarjeta compacta y legible sin cortes de texto.
 */

import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { router } from "expo-router";
import { useArranqueO1 } from "../../sistema/instalacion/useArranqueSistema";
import { getSecundariaRtdb } from "../../sistema/firebase";
import { ErrorArranque } from "../bloques/ErrorArranque";

export function sanitizarCodigoInput(valor: string): string {
  return valor
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, "")
    .slice(0, 20);
}

export function PantallaVinculacion() {
  const [codigo, setCodigo] = useState("");
  const { loading, errorInfo, arrancar, resetError } = useArranqueO1();
  const esWeb = Platform.OS === "web";

  const esValidoParaEnviar = useMemo(() => {
    return codigo.trim().length >= 4;
  }, [codigo]);

  const handleCambioTexto = (texto: string) => {
    if (errorInfo) resetError();
    setCodigo(sanitizarCodigoInput(texto));
  };

  const handleVincular = async () => {
    if (!esValidoParaEnviar || loading) return;

    try {
      const db = getSecundariaRtdb();
      const resultado = await arrancar(db, codigo);

      if (resultado.ok) {
        if (esWeb || !resultado.requiereSeleccionRol) {
          router.replace(resultado.rutaPorDefecto as any);
        } else {
          router.replace("/_role/roles");
        }
      }
    } catch {
      // Gestionado en useArranqueO1
    }
  };

  const handleReintentar = () => {
    resetError();
  };

  const handleSalir = () => {
    resetError();
    setCodigo("");
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.keyboardContainer}
    >
      <View style={styles.container}>
        {/* Fondo ambiental tipográfico en grande */}
        <View style={styles.fondoTextoWrapper} pointerEvents="none">
          <Text style={styles.fondoTexto}>MI NEGOCIO A UN CLICK</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.marcaHeader}>MARISQUERÍAS</Text>
          <Text style={styles.titulo}>
            {esWeb ? "Acceso al Negocio" : "Vincular Dispositivo"}
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
                <TextInput
                  value={codigo}
                  onChangeText={handleCambioTexto}
                  placeholder="CÓDIGO DE ACCESO"
                  placeholderTextColor="#475569"
                  autoCapitalize="characters"
                  autoCorrect={false}
                  maxLength={20}
                  editable={!loading}
                  style={styles.input}
                  returnKeyType="done"
                  onSubmitEditing={handleVincular}
                  testID="input-codigo-acceso"
                />
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
                    <Text style={styles.textoBoton}>Verificando...</Text>
                  </View>
                ) : (
                  <Text style={styles.textoBoton}>
                    {esWeb ? "Ingresar al Sistema" : "Vincular Negocio"}
                  </Text>
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
    backgroundColor: "#070b14",
  },
  container: {
    flex: 1,
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#070b14",
    position: "relative",
  },
  fondoTextoWrapper: {
    position: "absolute",
    top: "14%",
    width: "100%",
    alignItems: "center",
    zIndex: 0,
    opacity: 0.07,
  },
  fondoTexto: {
    color: "#ffffff",
    fontSize: 56,
    fontWeight: "900",
    letterSpacing: 4,
    textAlign: "center",
    textTransform: "uppercase",
  },
  card: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "rgba(17, 24, 39, 0.92)",
    paddingVertical: 28,
    paddingHorizontal: 24,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    shadowColor: "#000",
    shadowOpacity: 0.6,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 16,
    zIndex: 1,
  },
  marcaHeader: {
    color: "#ffffff",
    fontSize: 28,
    fontWeight: "900",
    textAlign: "center",
    letterSpacing: 3,
    marginBottom: 6,
    textTransform: "uppercase",
  },
  titulo: {
    color: "#94a3b8",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 24,
    letterSpacing: 0.5,
  },
  inputWrapper: {
    marginBottom: 20,
  },
  input: {
    backgroundColor: "#030712",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#334155",
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: 3,
    paddingHorizontal: 16,
    paddingVertical: 14,
    textAlign: "center",
  },
  badgePlantilla: {
    marginTop: 8,
    paddingVertical: 4,
    paddingHorizontal: 10,
    backgroundColor: "rgba(56, 189, 248, 0.15)",
    borderRadius: 6,
    alignSelf: "center",
  },
  textoBadgePlantilla: {
    color: "#38bdf8",
    fontSize: 11,
    fontWeight: "700",
  },
  botonVincular: {
    backgroundColor: "#0284c7",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  botonDeshabilitado: {
    backgroundColor: "#1e293b",
    opacity: 0.6,
  },
  cargandoWrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  textoBoton: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
});
