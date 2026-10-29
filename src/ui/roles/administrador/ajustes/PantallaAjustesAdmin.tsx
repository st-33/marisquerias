/**
 * ⚙️ PANTALLA DE AJUSTES ADMINISTRATIVOS
 * Manos (Capa Visual): Renderiza la interfaz de personalización de marca, logotipo,
 * estilo del selector de roles y telemetría de enlace operativo.
 * Dogma ADI: Cero llamadas directas a Firebase. Toda mutación pasa por useLogicaAjustesAdmin.
 */

import React from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLogicaAjustesAdmin, type EstiloSelector } from '../../../../roles/logica/administrador';
import { useAppTheme } from '../../../../compartido/temas';

export function PantallaAjustesAdmin() {
  const { colors, isElite } = useAppTheme();
  const {
    nombre,
    logoUrl,
    estiloSelector,
    rutaNegocio,
    negocioId,
    urlUnidad,
    cargando,
    guardadoExitoso,
    error,
    setNombre,
    setLogoUrl,
    setEstiloSelector,
    guardarCambios,
    probarEstiloEnRoles,
  } = useLogicaAjustesAdmin();

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[estilos.contenedor, { backgroundColor: colors.background }]}
    >
      <ScrollView
        contentContainerStyle={estilos.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Cabecera */}
        <View style={estilos.cabecera}>
          <View style={estilos.cabeceraTexto}>
            <View style={estilos.insigniaRol}>
              <Ionicons name="shield-checkmark" size={13} color="#C5A059" />
              <Text style={estilos.insigniaRolTexto}>ADMINISTRADOR</Text>
            </View>
            <Text style={[estilos.titulo, { color: colors.text }]}>Ajustes y Personalización</Text>
            <Text style={[estilos.subtitulo, { color: colors.textMuted }]}>
              Control de identidad de marca, presentación visual y enlace de base de datos
            </Text>
          </View>
        </View>

        {/* Feedback de estado */}
        {guardadoExitoso && (
          <View style={estilos.bannerExito}>
            <Ionicons name="checkmark-circle" size={18} color="#10B981" />
            <Text style={estilos.bannerExitoTexto}>
              ¡Configuración guardada y sincronizada exitosamente!
            </Text>
          </View>
        )}

        {error && (
          <View style={estilos.bannerError}>
            <Ionicons name="alert-circle" size={18} color="#EF4444" />
            <Text style={estilos.bannerErrorTexto}>{error}</Text>
          </View>
        )}

        {/* ─── SECCIÓN 1: IDENTIDAD DE MARCA ─────────────────────────── */}
        <View style={[estilos.tarjeta, { backgroundColor: isElite ? '#0F1218' : colors.card }]}>
          <View style={estilos.tarjetaCabecera}>
            <Ionicons name="storefront-outline" size={20} color="#C5A059" />
            <Text style={[estilos.tarjetaTitulo, { color: colors.text }]}>Identidad y Logotipo</Text>
          </View>
          <Text style={[estilos.tarjetaDesc, { color: colors.textMuted }]}>
            El nombre y logotipo aparecen en la portada de selección de roles y en los tickets impresos.
          </Text>

          <View style={estilos.campo}>
            <Text style={[estilos.label, { color: colors.text }]}>Nombre Comercial</Text>
            <TextInput
              style={[
                estilos.input,
                { color: colors.text, borderColor: isElite ? 'rgba(197, 160, 89, 0.25)' : colors.border },
              ]}
              value={nombre}
              onChangeText={setNombre}
              placeholder="Ej: Marisquería Puerto Libres"
              placeholderTextColor="#64748B"
            />
          </View>

          <View style={estilos.campo}>
            <Text style={[estilos.label, { color: colors.text }]}>URL del Logotipo (PNG transparente)</Text>
            <TextInput
              style={[
                estilos.input,
                { color: colors.text, borderColor: isElite ? 'rgba(197, 160, 89, 0.25)' : colors.border },
              ]}
              value={logoUrl}
              onChangeText={setLogoUrl}
              placeholder="https://.../logo.png"
              placeholderTextColor="#64748B"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* Vista previa del Sello de Marca */}
          <View style={estilos.vistaPreviaCaja}>
            <Text style={estilos.vistaPreviaEtiqueta}>VISTA PREVIA EN PORTADA</Text>
            <View style={estilos.vistaPreviaContenido}>
              {logoUrl ? (
                <Image
                  source={{ uri: logoUrl }}
                  style={estilos.logoPreview}
                  resizeMode="contain"
                />
              ) : (
                <View style={estilos.logoPlaceholder}>
                  <Ionicons name="image-outline" size={32} color="#64748B" />
                  <Text style={estilos.logoPlaceholderTexto}>Sin logo</Text>
                </View>
              )}
              <Text style={estilos.nombrePreview}>{nombre || 'NOMBRE DEL NEGOCIO'}</Text>
              <Text style={estilos.sloganPreview}>¡HASTA EN EL CAOS HAY ORDEN!</Text>
            </View>
          </View>
        </View>

        {/* ─── SECCIÓN 2: GOBERNANZA DEL SELECTOR DE ROLES ─────────────── */}
        <View style={[estilos.tarjeta, { backgroundColor: isElite ? '#0F1218' : colors.card }]}>
          <View style={estilos.tarjetaCabecera}>
            <Ionicons name="shapes-outline" size={20} color="#38BDF8" />
            <Text style={[estilos.tarjetaTitulo, { color: colors.text }]}>Estilo del Selector de Roles</Text>
          </View>
          <Text style={[estilos.tarjetaDesc, { color: colors.textMuted }]}>
            Gobernado por la Plantilla Base (NPB 00). Puedes fijar la experiencia táctil óptima para tus terminales.
          </Text>

          <View style={estilos.opcionesEstilo}>
            {/* Opción 1: Orbes */}
            <Pressable
              onPress={() => setEstiloSelector('orbes')}
              style={[
                estilos.opcionCard,
                estiloSelector === 'orbes' && estilos.opcionCardActiva,
              ]}
            >
              <View style={estilos.opcionRadio}>
                <Ionicons
                  name={estiloSelector === 'orbes' ? 'radio-button-on' : 'radio-button-off'}
                  size={18}
                  color={estiloSelector === 'orbes' ? '#C5A059' : '#64748B'}
                />
                <Text style={estilos.opcionTitulo}>🪐 Orbes Flotantes</Text>
              </View>
              <Text style={estilos.opcionDesc}>
                Diseño esférico interactivo con halo luminoso y ambientación líquida. Recomendado para pantallas grandes y tablets fijas en barra.
              </Text>
            </Pressable>

            {/* Opción 2: Pastillas */}
            <Pressable
              onPress={() => setEstiloSelector('pastillas')}
              style={[
                estilos.opcionCard,
                estiloSelector === 'pastillas' && estilos.opcionCardActiva,
              ]}
            >
              <View style={estilos.opcionRadio}>
                <Ionicons
                  name={estiloSelector === 'pastillas' ? 'radio-button-on' : 'radio-button-off'}
                  size={18}
                  color={estiloSelector === 'pastillas' ? '#10B981' : '#64748B'}
                />
                <Text style={estilos.opcionTitulo}>📱 Pastillas Táctiles</Text>
              </View>
              <Text style={estilos.opcionDesc}>
                Baraja vertical ergonómica con tarjetas táctiles de un solo pulgar. Ideal para comandas de mesero y terminales POS móviles de 5.5"-6.5".
              </Text>
            </Pressable>

            {/* Opción 3: Conmutable */}
            <Pressable
              onPress={() => setEstiloSelector('conmutable')}
              style={[
                estilos.opcionCard,
                estiloSelector === 'conmutable' && estilos.opcionCardActiva,
              ]}
            >
              <View style={estilos.opcionRadio}>
                <Ionicons
                  name={estiloSelector === 'conmutable' ? 'radio-button-on' : 'radio-button-off'}
                  size={18}
                  color={estiloSelector === 'conmutable' ? '#38BDF8' : '#64748B'}
                />
                <Text style={estilos.opcionTitulo}>🔀 Conmutable / Dinámico</Text>
              </View>
              <Text style={estilos.opcionDesc}>
                Permite al operador alternar libremente entre Orbes y Pastillas con el botón de cabecera. Modo flexible para capacitación y pruebas.
              </Text>
            </Pressable>
          </View>

          {/* Botón para previsualizar el selector en vivo */}
          <Pressable onPress={probarEstiloEnRoles} style={estilos.botonProbar}>
            <Ionicons name="eye-outline" size={16} color="#38BDF8" />
            <Text style={estilos.botonProbarTexto}>Probar Selector en Vivo →</Text>
          </Pressable>
        </View>

        {/* ─── SECCIÓN 3: INFRAESTRUCTURA DE ENLACE ───────────────────── */}
        <View style={[estilos.tarjeta, { backgroundColor: isElite ? '#0F1218' : colors.card }]}>
          <View style={estilos.tarjetaCabecera}>
            <Ionicons name="server-outline" size={20} color="#10B981" />
            <Text style={[estilos.tarjetaTitulo, { color: colors.text }]}>Enlace y Soberanía Operativa</Text>
          </View>
          <Text style={[estilos.tarjetaDesc, { color: colors.textMuted }]}>
            Parámetros de resolución gobernados por la Unidad Central y Secundaria.
          </Text>

          <View style={estilos.infoFila}>
            <Text style={estilos.infoClave}>Identificador Canónico:</Text>
            <Text style={estilos.infoValor}>{negocioId || '01'}</Text>
          </View>

          <View style={estilos.infoFila}>
            <Text style={estilos.infoClave}>Ruta Secundaria:</Text>
            <Text style={estilos.infoValor}>{rutaNegocio || 'alimentos-y-bebidas/marisquerias/negocio/...'}</Text>
          </View>

          <View style={estilos.infoFila}>
            <Text style={estilos.infoClave}>Unidad Operativa (RTDB):</Text>
            <Text style={estilos.infoValor} numberOfLines={1}>
              {urlUnidad || 'Conectada (RTDB Soberana)'}
            </Text>
          </View>

          <View style={estilos.badgeEnlace}>
            <View style={estilos.dotVerde} />
            <Text style={estilos.badgeEnlaceTexto}>Conexión Activa y Validada O(1)</Text>
          </View>
        </View>

        {/* ─── BOTÓN PRINCIPAL DE GUARDADO ───────────────────────────── */}
        <Pressable
          onPress={guardarCambios}
          disabled={cargando}
          style={({ pressed }) => [
            estilos.botonGuardar,
            pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] },
            cargando && { opacity: 0.6 },
          ]}
        >
          {cargando ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="cloud-upload-outline" size={18} color="#FFFFFF" />
              <Text style={estilos.botonGuardarTexto}>Guardar Cambios de Configuración</Text>
            </>
          )}
        </Pressable>

        <View style={{ height: 80 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const estilos = StyleSheet.create({
  contenedor: { flex: 1 },
  scroll: { padding: 20, maxWidth: 760, alignSelf: 'center', width: '100%' },
  cabecera: { marginBottom: 20 },
  cabeceraTexto: { gap: 6 },
  insigniaRol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(197, 160, 89, 0.12)',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 20,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(197, 160, 89, 0.3)',
  },
  insigniaRolTexto: {
    color: '#C5A059',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  titulo: { fontSize: 24, fontWeight: '800', letterSpacing: -0.5 },
  subtitulo: { fontSize: 13, lineHeight: 18 },
  bannerExito: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: '#10B981',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  bannerExitoTexto: { color: '#10B981', fontSize: 13, fontWeight: '700', flex: 1 },
  bannerError: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: '#EF4444',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  bannerErrorTexto: { color: '#EF4444', fontSize: 13, fontWeight: '700', flex: 1 },
  tarjeta: {
    borderRadius: 16,
    padding: 18,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  tarjetaCabecera: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  tarjetaTitulo: { fontSize: 16, fontWeight: '700' },
  tarjetaDesc: { fontSize: 12, lineHeight: 17, marginBottom: 16 },
  campo: { marginBottom: 14, gap: 6 },
  label: { fontSize: 12, fontWeight: '700' },
  input: {
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
  },
  vistaPreviaCaja: {
    marginTop: 10,
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    borderWidth: 1,
    borderColor: 'rgba(197, 160, 89, 0.2)',
    alignItems: 'center',
  },
  vistaPreviaEtiqueta: {
    color: '#8E7952',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  vistaPreviaContenido: { alignItems: 'center', gap: 6 },
  logoPreview: { width: 72, height: 72, marginBottom: 8 },
  logoPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  logoPlaceholderTexto: { color: '#64748B', fontSize: 10, fontWeight: '600' },
  nombrePreview: {
    color: '#F8FAFC',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 2,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  sloganPreview: {
    color: '#C5A059',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.5,
    fontStyle: 'italic',
  },
  opcionesEstilo: { gap: 10, marginBottom: 14 },
  opcionCard: {
    padding: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    gap: 6,
  },
  opcionCardActiva: {
    borderColor: 'rgba(20, 184, 166, 0.6)',
    backgroundColor: 'rgba(20, 184, 166, 0.08)',
  },
  opcionRadio: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  opcionTitulo: { color: '#F8FAFC', fontSize: 14, fontWeight: '700' },
  opcionDesc: { color: '#94A3B8', fontSize: 12, lineHeight: 17, paddingLeft: 26 },
  botonProbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)',
  },
  botonProbarTexto: { color: '#38BDF8', fontSize: 12, fontWeight: '700' },
  infoFila: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  infoClave: { color: '#94A3B8', fontSize: 12, fontWeight: '600' },
  infoValor: { color: '#F8FAFC', fontSize: 12, fontWeight: '700', fontFamily: 'monospace' },
  badgeEnlace: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  dotVerde: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#10B981' },
  badgeEnlaceTexto: { color: '#10B981', fontSize: 11, fontWeight: '700' },
  botonGuardar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#0284C7',
    paddingVertical: 15,
    borderRadius: 14,
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  botonGuardarTexto: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});

export default PantallaAjustesAdmin;
