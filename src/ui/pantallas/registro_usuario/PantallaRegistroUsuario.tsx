/**
 * 📝 PANTALLA DE REGISTRO E IDENTIFICACIÓN DE USUARIOS
 *
 * Flujo y orden riguroso de campos:
 * 1) Espacio para avatar (con avatar interactivo según H/M)
 * 2) Selector rápido H ♂ / M ♀
 * 3) Nombre completo (`nombre`)
 * 4) Edad de 2 dígitos (`edad`)
 * 5) Selector de cargo/responsabilidad autorizada
 *
 * Botón "Listo" -> Despliega la Tarjeta de Confirmación previa al guardado.
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AvatarUsuario } from './AvatarUsuario';
import { TarjetaConfirmacionUsuario } from './TarjetaConfirmacionUsuario';
import type { SexoUsuario, UsuarioNegocio } from '../../../sistema/usuarios/tipos';
import { crearUsuario, listarUsuarios } from '../../../sistema/usuarios/servicio_usuarios';
import { admitirSesionDispositivo } from '../../../sistema/usuarios/servicio_sesion_dispositivo';
import { getOperacionRtdb } from '../../../sistema/firebase';
import { useStore } from '../../../sistema/store';
import { useAppTheme } from '../../../compartido/temas';
import { CATALOGO_ROLES_DISPOSITIVO, type RolDispositivoCanonico } from '../../../negocio/roles/catalogoRoles';

interface PantallaRegistroUsuarioProps {
  onRegistroCompletado: (usuario: UsuarioNegocio, slotId?: string) => void;
  onCancelar?: () => void;
}

export function PantallaRegistroUsuario({
  onRegistroCompletado,
  onCancelar,
}: PantallaRegistroUsuarioProps) {
  const { colors, isElite } = useAppTheme();
  const session = useStore((s) => s.sesion);
  const estadoEncendido = useStore((s) => s.estadoEncendido);

  // Estados del formulario en orden estricto
  const [sexo, setSexo] = useState<SexoUsuario>('H');
  const [nombre, setNombre] = useState('');
  const [edad, setEdad] = useState('');
  const [cargoSeleccionado, setCargoSeleccionado] = useState<string>('mesero');

  // Estados de vista y control
  const [modo, setModo] = useState<'nuevo' | 'existente'>('nuevo');
  const [usuariosExistentes, setUsuariosExistentes] = useState<UsuarioNegocio[]>([]);
  const [cargandoLista, setCargandoLista] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [errorValidacion, setErrorValidacion] = useState<string | null>(null);
  const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false);

  const nombreNegocio =
    (session as any).nombre_comercial ||
    (session as any).nombreComercial ||
    session.niche ||
    'Marisquerías';

  // Roles disponibles según capacidades encendidas
  const rolesDisponibles = useMemo(() => {
    const activos = estadoEncendido?.roles_activos;
    if (activos && activos.length > 0) {
      return activos;
    }
    return ['mesero', 'cocina', 'mostrador', 'cajero', 'administrador'] as RolDispositivoCanonico[];
  }, [estadoEncendido]);

  // Cargar lista de usuarios existentes al montar
  useEffect(() => {
    let montado = true;
    async function cargar() {
      try {
        const db = getOperacionRtdb();
        const lista = await listarUsuarios(db);
        if (montado) {
          setUsuariosExistentes(lista);
          if (lista.length > 0 && modo === 'nuevo') {
            // Si ya hay usuarios, dejamos la opción abierta para seleccionar
          }
        }
      } catch (err) {
        console.warn('[RegistroUsuario] No se pudo cargar lista inicial de usuarios', err);
      } finally {
        if (montado) setCargandoLista(false);
      }
    }
    cargar();
    return () => {
      montado = false;
    };
  }, []);

  // Asegurar que el cargo seleccionado sea uno de los disponibles
  useEffect(() => {
    if (rolesDisponibles.length > 0 && !rolesDisponibles.includes(cargoSeleccionado as any)) {
      setCargoSeleccionado(rolesDisponibles[0]);
    }
  }, [rolesDisponibles, cargoSeleccionado]);

  const edadNumero = useMemo(() => {
    const val = parseInt(edad.trim(), 10);
    return isNaN(val) ? 0 : val;
  }, [edad]);

  const esFormularioValido = useMemo(() => {
    const nombreValido = nombre.trim().length >= 2;
    const edadValida = edadNumero >= 14 && edadNumero <= 99;
    const cargoValido = !!cargoSeleccionado;
    return nombreValido && edadValida && cargoValido;
  }, [nombre, edadNumero, cargoSeleccionado]);

  const handlePresionarListo = () => {
    setErrorValidacion(null);
    if (nombre.trim().length < 2) {
      setErrorValidacion('Ingresa tu nombre completo.');
      return;
    }
    if (edadNumero < 14 || edadNumero > 99) {
      setErrorValidacion('Ingresa una edad válida de 2 dígitos (14 a 99 años).');
      return;
    }
    if (!cargoSeleccionado) {
      setErrorValidacion('Selecciona tu cargo o responsabilidad.');
      return;
    }
    setMostrarConfirmacion(true);
  };

  const handleConfirmarRegistro = async () => {
    if (guardando) return;
    setGuardando(true);
    setErrorValidacion(null);

    try {
      const db = getOperacionRtdb();
      const nuevoUsuario = await crearUsuario(db, {
        nombre: nombre.trim(),
        edad: edadNumero,
        sexo,
        cargo: cargoSeleccionado,
      });

      // Si es nativo, admitir slot en monitoreo/dispositivos
      const { resolverDeviceIdADI } = await import(
        '../../../sistema/instalacion/vinculacion/generar-device-id-adi'
      );
      const deviceId = await resolverDeviceIdADI();

      const resultadoAdmision = await admitirSesionDispositivo(db, {
        deviceId,
        usuarioId: nuevoUsuario.id,
        usuarioNombre: nuevoUsuario.clave,
        usuarioClave: nuevoUsuario.clave,
        cargo: nuevoUsuario.perfil.cargo,
        limiteDispositivos: 3,
      });

      if (!resultadoAdmision.admitido && !resultadoAdmision.esWeb) {
        throw new Error(resultadoAdmision.error || 'No se pudo admitir el dispositivo en el cupo operativo.');
      }

      setMostrarConfirmacion(false);
      onRegistroCompletado(nuevoUsuario, resultadoAdmision.slotId);
    } catch (err: any) {
      setErrorValidacion(err?.message || 'Error al completar el registro.');
      setMostrarConfirmacion(false);
    } finally {
      setGuardando(false);
    }
  };

  const handleSeleccionarUsuarioExistente = async (usuario: UsuarioNegocio) => {
    if (guardando) return;
    setGuardando(true);
    setErrorValidacion(null);

    try {
      const db = getOperacionRtdb();
      const { resolverDeviceIdADI } = await import(
        '../../../sistema/instalacion/vinculacion/generar-device-id-adi'
      );
      const deviceId = await resolverDeviceIdADI();

      const resultadoAdmision = await admitirSesionDispositivo(db, {
        deviceId,
        usuarioId: usuario.id,
        usuarioNombre: usuario.clave,
        usuarioClave: usuario.clave,
        cargo: usuario.perfil.cargo,
        limiteDispositivos: 3,
      });

      if (!resultadoAdmision.admitido && !resultadoAdmision.esWeb) {
        throw new Error(resultadoAdmision.error || 'Límite de terminales simultáneas alcanzado.');
      }

      onRegistroCompletado(usuario, resultadoAdmision.slotId);
    } catch (err: any) {
      setErrorValidacion(err?.message || 'Error al iniciar sesión con el operador.');
    } finally {
      setGuardando(false);
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
          <Text style={estilos.marcaHeader}>{nombreNegocio.toUpperCase()}</Text>
          <Text style={[estilos.titulo, { color: colors.text }]}>
            {modo === 'nuevo' ? 'Registro de Operador' : 'Seleccionar Operador'}
          </Text>
          <Text style={[estilos.subtitulo, { color: colors.textMuted }]}>
            {modo === 'nuevo'
              ? 'Identificación para la terminal de trabajo y registro de comandas'
              : 'Elige tu usuario registrado para iniciar operaciones en esta terminal'}
          </Text>
        </View>

        {/* Pestañas de modo si ya existen usuarios */}
        {usuariosExistentes.length > 0 && (
          <View style={estilos.selectorModo}>
            <Pressable
              onPress={() => {
                setModo('nuevo');
                setErrorValidacion(null);
              }}
              style={[
                estilos.tabModo,
                modo === 'nuevo' && estilos.tabModoActivo,
              ]}
            >
              <Ionicons
                name="person-add-outline"
                size={16}
                color={modo === 'nuevo' ? '#38BDF8' : '#64748B'}
              />
              <Text
                style={[
                  estilos.textoTabModo,
                  modo === 'nuevo' && estilos.textoTabModoActivo,
                ]}
              >
                Nuevo Operador
              </Text>
            </Pressable>

            <Pressable
              onPress={() => {
                setModo('existente');
                setErrorValidacion(null);
              }}
              style={[
                estilos.tabModo,
                modo === 'existente' && estilos.tabModoActivo,
              ]}
            >
              <Ionicons
                name="people-outline"
                size={16}
                color={modo === 'existente' ? '#38BDF8' : '#64748B'}
              />
              <Text
                style={[
                  estilos.textoTabModo,
                  modo === 'existente' && estilos.textoTabModoActivo,
                ]}
              >
                Personal Registrado ({usuariosExistentes.length})
              </Text>
            </Pressable>
          </View>
        )}

        {/* Mensaje de error si existe */}
        {errorValidacion && (
          <View style={estilos.cajaError}>
            <Ionicons name="alert-circle" size={18} color="#EF4444" />
            <Text style={estilos.textoError}>{errorValidacion}</Text>
          </View>
        )}

        {modo === 'nuevo' ? (
          <View
            style={[
              estilos.cardFormulario,
              {
                backgroundColor: isElite ? '#0F1218' : colors.card,
                borderColor: isElite ? 'rgba(197, 160, 89, 0.25)' : colors.border,
              },
            ]}
          >
            {/* 1) Espacio para avatar */}
            <View style={estilos.seccionAvatar}>
              <AvatarUsuario sexo={sexo} size={84} activo />
            </View>

            {/* 2) Selector rápido H ♂ / M ♀ */}
            <View style={estilos.campo}>
              <Text style={[estilos.etiquetaCampo, { color: colors.textMuted }]}>
                Perfil
              </Text>
              <View style={estilos.selectorSexo}>
                <Pressable
                  onPress={() => setSexo('H')}
                  style={[
                    estilos.botonSexo,
                    sexo === 'H' && estilos.botonSexoHombreActivo,
                  ]}
                  testID="selector-sexo-hombre"
                >
                  <Text style={[estilos.textoBotonSexo, sexo === 'H' && estilos.textoSexoActivo]}>
                    Hombre ♂
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => setSexo('M')}
                  style={[
                    estilos.botonSexo,
                    sexo === 'M' && estilos.botonSexoMujerActivo,
                  ]}
                  testID="selector-sexo-mujer"
                >
                  <Text style={[estilos.textoBotonSexo, sexo === 'M' && estilos.textoSexoActivo]}>
                    Mujer ♀
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* 3) Nombre completo */}
            <View style={estilos.campo}>
              <Text style={[estilos.etiquetaCampo, { color: colors.textMuted }]}>
                Nombre Completo
              </Text>
              <TextInput
                value={nombre}
                onChangeText={(t) => {
                  setNombre(t);
                  if (errorValidacion) setErrorValidacion(null);
                }}
                placeholder="Ej: Ana Isabel López"
                placeholderTextColor="#64748B"
                style={[
                  estilos.inputTexto,
                  { color: colors.text, borderColor: colors.border },
                ]}
                autoCapitalize="words"
                autoCorrect={false}
                testID="input-nombre-usuario"
              />
            </View>

            {/* 4) Edad de 2 dígitos */}
            <View style={estilos.campo}>
              <Text style={[estilos.etiquetaCampo, { color: colors.textMuted }]}>
                Edad
              </Text>
              <TextInput
                value={edad}
                onChangeText={(t) => {
                  const num = t.replace(/[^0-9]/g, '').slice(0, 2);
                  setEdad(num);
                  if (errorValidacion) setErrorValidacion(null);
                }}
                placeholder="28"
                placeholderTextColor="#64748B"
                style={[
                  estilos.inputTexto,
                  { color: colors.text, borderColor: colors.border, width: 100 },
                ]}
                keyboardType="numeric"
                maxLength={2}
                testID="input-edad-usuario"
              />
            </View>

            {/* 5) Selector de cargo/responsabilidad autorizada */}
            <View style={estilos.campo}>
              <Text style={[estilos.etiquetaCampo, { color: colors.textMuted }]}>
                Cargo o Responsabilidad
              </Text>
              <View style={estilos.grillaCargos}>
                {rolesDisponibles.map((rolId) => {
                  const def = CATALOGO_ROLES_DISPOSITIVO[rolId];
                  const esActivo = cargoSeleccionado === rolId;
                  const nombreCargo = def ? def.nombre : rolId;

                  return (
                    <Pressable
                      key={rolId}
                      onPress={() => setCargoSeleccionado(rolId)}
                      style={[
                        estilos.itemCargo,
                        esActivo && estilos.itemCargoActivo,
                      ]}
                      testID={`cargo-${rolId}`}
                    >
                      <View style={estilos.radioIndicador}>
                        <Ionicons
                          name={esActivo ? 'radio-button-on' : 'radio-button-off'}
                          size={16}
                          color={esActivo ? '#38BDF8' : '#64748B'}
                        />
                      </View>
                      <View style={estilos.columnaTextoCargo}>
                        <Text
                          style={[
                            estilos.textoCargo,
                            esActivo && estilos.textoCargoActivo,
                          ]}
                        >
                          {nombreCargo}
                        </Text>
                        {def?.descripcion ? (
                          <Text
                            style={[
                              estilos.descCargo,
                              esActivo && estilos.descCargoActivo,
                            ]}
                            numberOfLines={2}
                          >
                            {def.descripcion}
                          </Text>
                        ) : null}
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Botón "Listo" */}
            <Pressable
              onPress={handlePresionarListo}
              disabled={!esFormularioValido}
              style={({ pressed }) => [
                estilos.botonListo,
                !esFormularioValido && estilos.botonListoDeshabilitado,
                pressed && { opacity: 0.8 },
              ]}
              testID="boton-listo-registro"
            >
              <Text style={estilos.textoBotonListo}>Listo</Text>
              <Ionicons name="checkmark-circle-outline" size={20} color="#FFFFFF" />
            </Pressable>
          </View>
        ) : (
          /* Modo: Seleccionar de usuarios existentes */
          <View style={estilos.listaExistentes}>
            {cargandoLista ? (
              <ActivityIndicator size="large" color="#38BDF8" style={{ marginVertical: 30 }} />
            ) : usuariosExistentes.length === 0 ? (
              <View style={estilos.cajaVacia}>
                <Text style={estilos.textoVacio}>No hay personal registrado aún.</Text>
                <Pressable
                  onPress={() => setModo('nuevo')}
                  style={estilos.botonCrearPrimero}
                >
                  <Text style={estilos.textoBotonCrearPrimero}>Registrar Primer Operador</Text>
                </Pressable>
              </View>
            ) : (
              usuariosExistentes.map((u) => (
                <Pressable
                  key={u.id}
                  onPress={() => handleSeleccionarUsuarioExistente(u)}
                  disabled={guardando}
                  style={({ pressed }) => [
                    estilos.tarjetaUsuarioExistente,
                    {
                      backgroundColor: isElite ? '#0F1218' : colors.card,
                      borderColor: isElite ? 'rgba(197, 160, 89, 0.2)' : colors.border,
                    },
                    pressed && { opacity: 0.75, transform: [{ scale: 0.99 }] },
                  ]}
                >
                  <AvatarUsuario sexo={u.sexo} size={50} />
                  <View style={estilos.datosUsuarioExistente}>
                    <Text style={[estilos.nombreUsuarioExistente, { color: colors.text }]}>
                      {u.nombre}
                    </Text>
                    <View style={estilos.subDatosFila}>
                      <Text style={estilos.claveUsuarioExistente}>Clave: {u.clave}</Text>
                      <Text style={estilos.separadorPunto}>•</Text>
                      <Text style={estilos.cargoUsuarioExistente}>
                        {u.perfil.cargo.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#64748B" />
                </Pressable>
              ))
            )}
          </View>
        )}

        {/* Modal de confirmación previa al guardado */}
        <TarjetaConfirmacionUsuario
          visible={mostrarConfirmacion}
          nombreNegocio={nombreNegocio}
          nombre={nombre.trim()}
          edad={edadNumero}
          sexo={sexo}
          cargo={cargoSeleccionado}
          cargando={guardando}
          onConfirmar={handleConfirmarRegistro}
          onEditar={() => setMostrarConfirmacion(false)}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const estilos = StyleSheet.create({
  contenedor: { flex: 1 },
  scroll: {
    padding: 20,
    maxWidth: 520,
    alignSelf: 'center',
    width: '100%',
    paddingBottom: 40,
  },
  cabecera: {
    alignItems: 'center',
    marginBottom: 20,
    gap: 6,
  },
  marcaHeader: {
    color: '#C5A059',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  titulo: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
  },
  subtitulo: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 380,
  },
  selectorModo: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
    gap: 4,
  },
  tabModo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
  },
  tabModoActivo: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
  },
  textoTabModo: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '700',
  },
  textoTabModoActivo: {
    color: '#38BDF8',
  },
  cajaError: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  textoError: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  cardFormulario: {
    borderRadius: 18,
    padding: 22,
    borderWidth: 1,
    gap: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  seccionAvatar: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  campo: {
    gap: 8,
  },
  etiquetaCampo: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  selectorSexo: {
    flexDirection: 'row',
    gap: 12,
  },
  botonSexo: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  botonSexoHombreActivo: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderColor: '#38BDF8',
  },
  botonSexoMujerActivo: {
    backgroundColor: 'rgba(244, 114, 182, 0.15)',
    borderColor: '#F472B6',
  },
  textoBotonSexo: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '700',
  },
  textoSexoActivo: {
    color: '#FFFFFF',
  },
  inputTexto: {
    height: 48,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 15,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  grillaCargos: {
    gap: 8,
  },
  itemCargo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
  itemCargoActivo: {
    borderColor: '#38BDF8',
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
  },
  radioIndicador: {
    width: 20,
    alignItems: 'center',
  },
  columnaTextoCargo: {
    flex: 1,
    gap: 2,
  },
  textoCargo: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '600',
  },
  textoCargoActivo: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  descCargo: {
    color: '#64748B',
    fontSize: 11,
    lineHeight: 14,
  },
  descCargoActivo: {
    color: '#94A3B8',
  },
  botonListo: {
    backgroundColor: '#38BDF8',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 6,
  },
  botonListoDeshabilitado: {
    opacity: 0.4,
  },
  textoBotonListo: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  listaExistentes: {
    gap: 10,
  },
  tarjetaUsuarioExistente: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  datosUsuarioExistente: {
    flex: 1,
    gap: 4,
  },
  nombreUsuarioExistente: {
    fontSize: 15,
    fontWeight: '700',
  },
  subDatosFila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  claveUsuarioExistente: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: '600',
  },
  separadorPunto: {
    color: '#64748B',
    fontSize: 12,
  },
  cargoUsuarioExistente: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '700',
  },
  cajaVacia: {
    alignItems: 'center',
    paddingVertical: 30,
    gap: 12,
  },
  textoVacio: {
    color: '#64748B',
    fontSize: 13,
  },
  botonCrearPrimero: {
    backgroundColor: '#38BDF8',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  textoBotonCrearPrimero: {
    color: '#0F172A',
    fontWeight: '700',
    fontSize: 13,
  },
});
