/**
 * ⚙️ PANTALLA DE AJUSTES ADMINISTRATIVOS
 * Manos (Capa Visual): Renderiza la interfaz de personalización de marca, logotipo,
 * estilo del selector de roles y telemetría de enlace operativo.
 * Dogma ADI: Cero llamadas directas a Firebase. Toda mutación pasa por useLogicaAjustesAdmin.
 */

import React, { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
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

import { AvatarUsuario } from '../../../pantallas/registro_usuario/AvatarUsuario';

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
    usuarios,
    cargandoUsuarios,
    capacidadesActivas,
    setNombre,
    setLogoUrl,
    setEstiloSelector,
    guardarCambios,
    probarEstiloEnRoles,
    eliminarUsuario,
    actualizarPerfilOperador,
    altaOperadorDirecta,
  } = useLogicaAjustesAdmin();

  // Estados locales para gestión de Personal
  const [operadorEditando, setOperadorEditando] = useState<any | null>(null);
  const [cargoEdit, setCargoEdit] = useState('');
  const [sueldoEdit, setSueldoEdit] = useState('');
  const [horarioEntradaEdit, setHorarioEntradaEdit] = useState('');
  const [horarioSalidaEdit, setHorarioSalidaEdit] = useState('');
  const [guardandoOperador, setGuardandoOperador] = useState(false);

  const [modalAltaOperador, setModalAltaOperador] = useState(false);
  const [altaNombre, setAltaNombre] = useState('');
  const [altaEdad, setAltaEdad] = useState('24');
  const [altaSexo, setAltaSexo] = useState<'H' | 'M'>('H');
  const [altaCargo, setAltaCargo] = useState('mesero');
  const [altaSueldo, setAltaSueldo] = useState('');
  const [altaHorarioEntrada, setAltaHorarioEntrada] = useState('');
  const [altaHorarioSalida, setAltaHorarioSalida] = useState('');
  const [guardandoAltaOperador, setGuardandoAltaOperador] = useState(false);
  const [errorOperador, setErrorOperador] = useState<string | null>(null);

  const abrirEdicionOperador = (u: any) => {
    setOperadorEditando(u);
    setCargoEdit(u.perfil?.cargo || '');
    setSueldoEdit(u.perfil?.sueldo !== undefined ? String(u.perfil.sueldo) : '');
    setHorarioEntradaEdit(u.perfil?.horario_entrada || '');
    setHorarioSalidaEdit(u.perfil?.horario_salida || '');
    setErrorOperador(null);
  };

  const ejecutarGuardarEdicionOperador = async () => {
    if (!operadorEditando) return;
    setGuardandoOperador(true);
    setErrorOperador(null);

    const sueldoNum = sueldoEdit.trim() ? parseFloat(sueldoEdit.trim()) : undefined;
    const ok = await actualizarPerfilOperador(operadorEditando.id, {
      cargo: cargoEdit.trim() || undefined,
      sueldo: isNaN(sueldoNum as number) ? undefined : sueldoNum,
      horario_entrada: horarioEntradaEdit.trim() || undefined,
      horario_salida: horarioSalidaEdit.trim() || undefined,
    });

    setGuardandoOperador(false);
    if (ok) {
      setOperadorEditando(null);
    }
  };

  const ejecutarAltaDirectaOperador = async () => {
    if (!altaNombre.trim()) {
      setErrorOperador('El nombre completo es obligatorio');
      return;
    }
    const edadNum = parseInt(altaEdad.trim(), 10);
    if (isNaN(edadNum) || edadNum < 14 || edadNum > 99) {
      setErrorOperador('La edad debe ser un número entre 14 y 99 años');
      return;
    }
    setGuardandoAltaOperador(true);
    setErrorOperador(null);

    const sueldoNum = altaSueldo.trim() ? parseFloat(altaSueldo.trim()) : undefined;
    const ok = await altaOperadorDirecta({
      nombre: altaNombre.trim(),
      edad: edadNum,
      sexo: altaSexo,
      cargo: altaCargo.trim() || 'mesero',
      sueldo: isNaN(sueldoNum as number) ? undefined : sueldoNum,
      horario_entrada: altaHorarioEntrada.trim() || undefined,
      horario_salida: altaHorarioSalida.trim() || undefined,
    });

    setGuardandoAltaOperador(false);
    if (ok) {
      setModalAltaOperador(false);
      setAltaNombre('');
      setAltaSueldo('');
      setAltaHorarioEntrada('');
      setAltaHorarioSalida('');
    }
  };

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

        {/* ─── SECCIÓN 4: PERSONAL Y OPERADORES REGISTRADOS ───────────── */}
        <View style={[estilos.tarjeta, { backgroundColor: isElite ? '#0F1218' : colors.card }]}>
          <View style={estilos.tarjetaCabeceraConAccion}>
            <View style={estilos.tarjetaCabecera}>
              <Ionicons name="people-outline" size={20} color="#38BDF8" />
              <Text style={[estilos.tarjetaTitulo, { color: colors.text }]}>Personal y Operadores</Text>
            </View>
            {usuarios.length > 0 && (
              <Pressable
                onPress={() => {
                  setErrorOperador(null);
                  setModalAltaOperador(true);
                }}
                style={estilos.botonAltaStaffHeader}
                accessibilityLabel="Dar de alta nuevo operador"
              >
                <Ionicons name="person-add-outline" size={14} color="#38BDF8" />
                <Text style={estilos.textoBotonAltaStaff}>+ Alta Operador</Text>
              </Pressable>
            )}
          </View>
          <Text style={[estilos.tarjetaDesc, { color: colors.textMuted }]}>
            Gobernanza de operadores autorizados para comandas y terminales de piso. El Administrador asigna condiciones laborales (sueldos y horarios).
          </Text>

          {cargandoUsuarios ? (
            <ActivityIndicator size="small" color="#38BDF8" style={{ marginVertical: 12 }} />
          ) : usuarios.length === 0 ? (
            <View style={estilos.cajaVaciaStaff}>
              <Ionicons name="people-outline" size={36} color="#64748B" />
              <Text style={estilos.textoVacioStaff}>No hay operadores registrados aún en esta Unidad.</Text>
              <Text style={estilos.subtextoVacioStaff}>
                Puedes precargar el primer operador desde aquí o permitir el auto-registro en piso.
              </Text>
              <Pressable
                onPress={() => {
                  setErrorOperador(null);
                  setModalAltaOperador(true);
                }}
                style={estilos.botonAltaStaffVacio}
              >
                <Ionicons name="person-add-outline" size={16} color="#0F172A" />
                <Text style={estilos.textoBotonAltaStaffVacio}>Registrar Primer Operador</Text>
              </Pressable>
            </View>
          ) : (
            <View style={estilos.listaStaff}>
              {usuarios.map((u) => {
                const tieneLaboral =
                  u.perfil?.sueldo !== undefined ||
                  u.perfil?.horario_entrada ||
                  u.perfil?.horario_salida;

                return (
                  <View key={u.id} style={estilos.filaStaff}>
                    <AvatarUsuario sexo={u.sexo} size={42} />
                    <View style={estilos.datosStaff}>
                      <Text style={[estilos.nombreStaff, { color: colors.text }]}>{u.nombre}</Text>
                      <View style={estilos.subDatosStaff}>
                        <Text style={estilos.claveStaff}>Clave: {u.clave}</Text>
                        <Text style={estilos.puntoStaff}>•</Text>
                        <Text style={estilos.cargoStaff}>{u.perfil.cargo.toUpperCase()}</Text>
                        <Text style={estilos.puntoStaff}>•</Text>
                        <Text style={estilos.edadStaff}>{u.edad} años</Text>
                      </View>
                      {tieneLaboral ? (
                        <View style={estilos.filaDatosLaborales}>
                          {u.perfil?.sueldo !== undefined ? (
                            <Text style={estilos.badgeLaboral}>
                              💵 ${u.perfil.sueldo}
                            </Text>
                          ) : null}
                          {u.perfil?.horario_entrada || u.perfil?.horario_salida ? (
                            <Text style={estilos.badgeLaboral}>
                              ⏰ {u.perfil?.horario_entrada || '--'} a {u.perfil?.horario_salida || '--'}
                            </Text>
                          ) : null}
                        </View>
                      ) : (
                        <Text style={estilos.textoLaboralPendiente}>
                          Condiciones laborales sin asignar
                        </Text>
                      )}
                    </View>

                    <View style={estilos.accionesStaff}>
                      <Pressable
                        onPress={() => abrirEdicionOperador(u)}
                        style={estilos.botonEditarStaff}
                        accessibilityLabel={`Editar perfil laboral de ${u.nombre}`}
                      >
                        <Ionicons name="create-outline" size={16} color="#38BDF8" />
                      </Pressable>
                      <Pressable
                        onPress={() => eliminarUsuario(u.id)}
                        style={estilos.botonEliminarStaff}
                        accessibilityLabel={`Eliminar operador ${u.nombre}`}
                      >
                        <Ionicons name="trash-outline" size={16} color="#EF4444" />
                      </Pressable>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* ─── SECCIÓN 5: CAPACIDADES AUTORIZADAS ACTIVAS ──────────────── */}
        <View style={[estilos.tarjeta, { backgroundColor: isElite ? '#0F1218' : colors.card }]}>
          <View style={estilos.tarjetaCabecera}>
            <Ionicons name="flash-outline" size={20} color="#F59E0B" />
            <Text style={[estilos.tarjetaTitulo, { color: colors.text }]}>Capacidades Autorizadas Activas</Text>
          </View>
          <Text style={[estilos.tarjetaDesc, { color: colors.textMuted }]}>
            Gobernadas por la Plantilla Base (NPB 00) y autorizadas por el Ecosistema.
          </Text>

          <View style={estilos.grillaCapacidades}>
            {capacidadesActivas.map((capId: string) => (
              <View key={capId} style={estilos.badgeCapacidad}>
                <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                <Text style={estilos.textoBadgeCapacidad}>{capId.replace(/_/g, ' ').toUpperCase()}</Text>
              </View>
            ))}
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

      {/* ─── MODAL 1: EDICIÓN DE PERFIL LABORAL ─────────────────────── */}
      <Modal
        visible={Boolean(operadorEditando)}
        transparent
        animationType="fade"
        onRequestClose={() => setOperadorEditando(null)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={estilos.modalOverlay}
        >
          <View style={[estilos.modalContainer, { backgroundColor: isElite ? '#0F1218' : '#1E293B' }]}>
            <View style={estilos.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={estilos.modalTitulo}>Editar Perfil Laboral</Text>
                <Text style={estilos.modalSubtitulo}>
                  Operador: {operadorEditando?.nombre} (ID: {operadorEditando?.id})
                </Text>
              </View>
              <Pressable
                onPress={() => setOperadorEditando(null)}
                style={estilos.modalCerrar}
                accessibilityLabel="Cerrar modal"
              >
                <Ionicons name="close" size={20} color="#94A3B8" />
              </Pressable>
            </View>

            {errorOperador ? (
              <View style={estilos.errorModalCaja}>
                <Ionicons name="alert-circle" size={16} color="#EF4444" />
                <Text style={estilos.errorModalTexto}>{errorOperador}</Text>
              </View>
            ) : null}

            <ScrollView style={estilos.modalCuerpo} keyboardShouldPersistTaps="handled">
              <View style={estilos.campo}>
                <Text style={[estilos.label, { color: colors.text }]}>Cargo / Responsabilidad</Text>
                <TextInput
                  style={[estilos.input, { color: colors.text }]}
                  value={cargoEdit}
                  onChangeText={setCargoEdit}
                  placeholder="Ej: mesero, cocina, cajero, admin"
                  placeholderTextColor="#64748B"
                />
              </View>

              <View style={estilos.campo}>
                <Text style={[estilos.label, { color: colors.text }]}>Sueldo Mensual / Base ($)</Text>
                <TextInput
                  style={[estilos.input, { color: colors.text }]}
                  value={sueldoEdit}
                  onChangeText={setSueldoEdit}
                  placeholder="Ej: 12000"
                  placeholderTextColor="#64748B"
                  keyboardType="numeric"
                />
              </View>

              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={[estilos.campo, { flex: 1 }]}>
                  <Text style={[estilos.label, { color: colors.text }]}>Horario Entrada</Text>
                  <TextInput
                    style={[estilos.input, { color: colors.text }]}
                    value={horarioEntradaEdit}
                    onChangeText={setHorarioEntradaEdit}
                    placeholder="Ej: 09:00"
                    placeholderTextColor="#64748B"
                  />
                </View>
                <View style={[estilos.campo, { flex: 1 }]}>
                  <Text style={[estilos.label, { color: colors.text }]}>Horario Salida</Text>
                  <TextInput
                    style={[estilos.input, { color: colors.text }]}
                    value={horarioSalidaEdit}
                    onChangeText={setHorarioSalidaEdit}
                    placeholder="Ej: 18:00"
                    placeholderTextColor="#64748B"
                  />
                </View>
              </View>
            </ScrollView>

            <View style={estilos.modalFooter}>
              <Pressable
                onPress={() => setOperadorEditando(null)}
                style={estilos.botonModalCancelar}
              >
                <Text style={estilos.textoModalCancelar}>Cancelar</Text>
              </Pressable>
              <Pressable
                onPress={ejecutarGuardarEdicionOperador}
                disabled={guardandoOperador}
                style={[estilos.botonModalGuardar, guardandoOperador && { opacity: 0.6 }]}
              >
                {guardandoOperador ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={estilos.textoModalGuardar}>Guardar Condiciones</Text>
                )}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ─── MODAL 2: ALTA ANTICIPADA DE OPERADOR ────────────────────── */}
      <Modal
        visible={modalAltaOperador}
        transparent
        animationType="fade"
        onRequestClose={() => setModalAltaOperador(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={estilos.modalOverlay}
        >
          <View style={[estilos.modalContainer, { backgroundColor: isElite ? '#0F1218' : '#1E293B' }]}>
            <View style={estilos.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={estilos.modalTitulo}>Alta Anticipada de Operador</Text>
                <Text style={estilos.modalSubtitulo}>
                  Precarga identidad y condiciones laborales antes del primer acceso en piso.
                </Text>
              </View>
              <Pressable
                onPress={() => setModalAltaOperador(false)}
                style={estilos.modalCerrar}
                accessibilityLabel="Cerrar modal"
              >
                <Ionicons name="close" size={20} color="#94A3B8" />
              </Pressable>
            </View>

            {errorOperador ? (
              <View style={estilos.errorModalCaja}>
                <Ionicons name="alert-circle" size={16} color="#EF4444" />
                <Text style={estilos.errorModalTexto}>{errorOperador}</Text>
              </View>
            ) : null}

            <ScrollView style={estilos.modalCuerpo} keyboardShouldPersistTaps="handled">
              <View style={estilos.campo}>
                <Text style={[estilos.label, { color: colors.text }]}>Nombre Completo *</Text>
                <TextInput
                  style={[estilos.input, { color: colors.text }]}
                  value={altaNombre}
                  onChangeText={setAltaNombre}
                  placeholder="Ej: Laura Martínez Reyes"
                  placeholderTextColor="#64748B"
                />
              </View>

              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={[estilos.campo, { flex: 1 }]}>
                  <Text style={[estilos.label, { color: colors.text }]}>Edad (14-99) *</Text>
                  <TextInput
                    style={[estilos.input, { color: colors.text }]}
                    value={altaEdad}
                    onChangeText={setAltaEdad}
                    placeholder="25"
                    placeholderTextColor="#64748B"
                    keyboardType="numeric"
                  />
                </View>
                <View style={[estilos.campo, { flex: 1 }]}>
                  <Text style={[estilos.label, { color: colors.text }]}>Sexo *</Text>
                  <View style={estilos.selectorSexo}>
                    <Pressable
                      onPress={() => setAltaSexo('H')}
                      style={[estilos.botonSexo, altaSexo === 'H' && estilos.botonSexoActivo]}
                    >
                      <Text style={[estilos.textoSexo, altaSexo === 'H' && estilos.textoSexoActivo]}>Hombre</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => setAltaSexo('M')}
                      style={[estilos.botonSexo, altaSexo === 'M' && estilos.botonSexoActivo]}
                    >
                      <Text style={[estilos.textoSexo, altaSexo === 'M' && estilos.textoSexoActivo]}>Mujer</Text>
                    </Pressable>
                  </View>
                </View>
              </View>

              <View style={estilos.campo}>
                <Text style={[estilos.label, { color: colors.text }]}>Cargo / Responsabilidad *</Text>
                <TextInput
                  style={[estilos.input, { color: colors.text }]}
                  value={altaCargo}
                  onChangeText={setAltaCargo}
                  placeholder="Ej: mesero, cocina, cajero, admin"
                  placeholderTextColor="#64748B"
                />
              </View>

              <View style={estilos.campo}>
                <Text style={[estilos.label, { color: colors.text }]}>Sueldo Mensual / Base ($)</Text>
                <TextInput
                  style={[estilos.input, { color: colors.text }]}
                  value={altaSueldo}
                  onChangeText={setAltaSueldo}
                  placeholder="Ej: 14000 (opcional)"
                  placeholderTextColor="#64748B"
                  keyboardType="numeric"
                />
              </View>

              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={[estilos.campo, { flex: 1 }]}>
                  <Text style={[estilos.label, { color: colors.text }]}>Horario Entrada</Text>
                  <TextInput
                    style={[estilos.input, { color: colors.text }]}
                    value={altaHorarioEntrada}
                    onChangeText={setAltaHorarioEntrada}
                    placeholder="Ej: 09:00"
                    placeholderTextColor="#64748B"
                  />
                </View>
                <View style={[estilos.campo, { flex: 1 }]}>
                  <Text style={[estilos.label, { color: colors.text }]}>Horario Salida</Text>
                  <TextInput
                    style={[estilos.input, { color: colors.text }]}
                    value={altaHorarioSalida}
                    onChangeText={setAltaHorarioSalida}
                    placeholder="Ej: 18:00"
                    placeholderTextColor="#64748B"
                  />
                </View>
              </View>
            </ScrollView>

            <View style={estilos.modalFooter}>
              <Pressable
                onPress={() => setModalAltaOperador(false)}
                style={estilos.botonModalCancelar}
              >
                <Text style={estilos.textoModalCancelar}>Cancelar</Text>
              </Pressable>
              <Pressable
                onPress={ejecutarAltaDirectaOperador}
                disabled={guardandoAltaOperador}
                style={[estilos.botonModalGuardar, guardandoAltaOperador && { opacity: 0.6 }]}
              >
                {guardandoAltaOperador ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={estilos.textoModalGuardar}>Registrar Operador</Text>
                )}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  cajaVaciaStaff: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  textoVacioStaff: {
    color: '#64748B',
    fontSize: 13,
  },
  listaStaff: {
    gap: 10,
  },
  filaStaff: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  datosStaff: {
    flex: 1,
    gap: 3,
  },
  nombreStaff: {
    fontSize: 14,
    fontWeight: '700',
  },
  subDatosStaff: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  claveStaff: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: '600',
  },
  puntoStaff: {
    color: '#64748B',
    fontSize: 10,
  },
  cargoStaff: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '700',
  },
  edadStaff: {
    color: '#64748B',
    fontSize: 11,
  },
  botonEliminarStaff: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  grillaCapacidades: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  badgeCapacidad: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  textoBadgeCapacidad: {
    color: '#E2E8F0',
    fontSize: 11,
    fontWeight: '700',
  },
  tarjetaCabeceraConAccion: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  botonAltaStaffHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  textoBotonAltaStaff: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '700',
  },
  subtextoVacioStaff: {
    color: '#94A3B8',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 12,
    maxWidth: 320,
  },
  botonAltaStaffVacio: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#38BDF8',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
  },
  textoBotonAltaStaffVacio: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '800',
  },
  filaDatosLaborales: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  badgeLaboral: {
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.2)',
    color: '#7DD3FC',
    fontSize: 11,
    fontWeight: '600',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  textoLaboralPendiente: {
    color: '#64748B',
    fontSize: 10,
    fontStyle: 'italic',
    marginTop: 2,
  },
  accionesStaff: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  botonEditarStaff: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 480,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  modalTitulo: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
  },
  modalSubtitulo: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 2,
  },
  modalCerrar: {
    padding: 4,
  },
  errorModalCaja: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    marginHorizontal: 18,
    marginTop: 12,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  errorModalTexto: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
  },
  modalCuerpo: {
    padding: 18,
    maxHeight: 380,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    padding: 18,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  botonModalCancelar: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  textoModalCancelar: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '700',
  },
  botonModalGuardar: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
    backgroundColor: '#0284C7',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 140,
  },
  textoModalGuardar: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  selectorSexo: {
    flexDirection: 'row',
    gap: 8,
  },
  botonSexo: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
  },
  botonSexoActivo: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderColor: '#38BDF8',
  },
  textoSexo: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '700',
  },
  textoSexoActivo: {
    color: '#38BDF8',
  },
});

export default PantallaAjustesAdmin;
