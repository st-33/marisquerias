/**
 * 🎭 ROLES SCREEN (Selector de Roles)
 * Componente visual para alimentos y bebidas
 */

import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useStore } from '../../sistema/store';
import { SelectorRolElite } from '../bloques/SelectorRolElite';
import { SelectorRolPastillas } from '../bloques/SelectorRolPastillas';

export function PantallaRoles() {
  const router = useRouter();
  const rutaNegocio = useStore((s) => s.sesion.rutaNegocio) || '';
  const negocioId = useStore((s) => s.sesion.negocioId);

  // Operadores de piso con estación fija van directo a su pantalla (cocina, mesero, etc.)
  useEffect(() => {
    let montado = true;
    async function redirigirPisoDirecto() {
      try {
        const { obtenerSesionOperativaLocal } =
          await import('../../sistema/usuarios/servicio_sesion_dispositivo');
        const sesionLocal = await obtenerSesionOperativaLocal();
        if (
          montado &&
          sesionLocal &&
          sesionLocal.cargo &&
          sesionLocal.cargo !== 'administrador'
        ) {
          const { obtenerRutaPorRol } = await import('../../negocio/roles/redireccionRol');
          const ruta = obtenerRutaPorRol(sesionLocal.cargo as any);
          if (ruta && ruta !== '/_role/roles') {
            router.replace(ruta as any);
          }
        }
      } catch {
        // En caso de error, permanecer en selector
      }
    }
    void redirigirPisoDirecto();
    return () => {
      montado = false;
    };
  }, [router]);

  // Gobernanza de estilos por configuración o NPB 00:
  // 'orbes' | 'pastillas' | 'clasico' | 'conmutable' (por defecto conmutable con vista inicial 'orbes')
  const estiloConfigurado = useStore(
    (s) =>
      (s.negocio?.configuracion?.estilo_selector_roles as string | undefined) ||
      (s.negocio?.features?.['selector_roles']?.config?.estilo as string | undefined)
  );

  const esPastillasOClasico = estiloConfigurado === 'pastillas' || estiloConfigurado === 'clasico';
  const modoFijo = estiloConfigurado === 'orbes' || esPastillasOClasico;
  const estiloInicial = esPastillasOClasico ? 'pastillas' : 'orbes';
  const [estiloManual, setEstiloManual] = useState<'orbes' | 'pastillas' | null>(null);
  const estiloVisual = modoFijo ? estiloInicial : (estiloManual ?? estiloInicial);

  if (!rutaNegocio || !negocioId) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: '#050506',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ color: '#8e7952', fontSize: 12, letterSpacing: 3 }}>CARGANDO SESIÓN...</Text>
      </View>
    );
  }

  const alternarEstilo = modoFijo
    ? undefined
    : () => {
        setEstiloManual((prev) => ((prev ?? estiloInicial) === 'orbes' ? 'pastillas' : 'orbes'));
      };

  if (estiloVisual === 'pastillas') {
    return <SelectorRolPastillas onAlternarEstilo={alternarEstilo} estiloActivo="pastillas" />;
  }

  return <SelectorRolElite onAlternarEstilo={alternarEstilo} estiloActivo="orbes" />;
}

export default PantallaRoles;
export const RolesScreen = PantallaRoles;
