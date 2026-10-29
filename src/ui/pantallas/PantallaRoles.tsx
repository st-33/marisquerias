/**
 * 🎭 ROLES SCREEN (Selector de Roles)
 * Componente visual para alimentos y bebidas
 */

import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { useStore } from '../../sistema/store';
import { SelectorRolElite } from '../bloques/SelectorRolElite';
import { SelectorRolPastillas } from '../bloques/SelectorRolPastillas';

export function PantallaRoles() {
  const rutaNegocio = useStore((s) => s.sesion.rutaNegocio) || '';
  const negocioId = useStore((s) => s.sesion.negocioId);

  // Gobernanza de estilos por configuración o NPB 00:
  // 'orbes' | 'pastillas' | 'conmutable' (por defecto conmutable con vista inicial 'orbes')
  const estiloConfigurado = useStore(
    (s) =>
      (s.negocio?.configuracion?.estilo_selector_roles as string | undefined) ||
      (s.negocio?.features?.['selector_roles']?.config?.estilo as string | undefined)
  );

  const modoFijo = estiloConfigurado === 'orbes' || estiloConfigurado === 'pastillas';
  const estiloInicial = estiloConfigurado === 'pastillas' ? 'pastillas' : 'orbes';
  const [estiloVisual, setEstiloVisual] = useState<'orbes' | 'pastillas'>(estiloInicial);

  useEffect(() => {
    if (estiloConfigurado === 'pastillas' || estiloConfigurado === 'orbes') {
      setEstiloVisual(estiloConfigurado);
    }
  }, [estiloConfigurado]);

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
        setEstiloVisual((prev) => (prev === 'orbes' ? 'pastillas' : 'orbes'));
      };

  if (estiloVisual === 'pastillas') {
    return (
      <SelectorRolPastillas
        onAlternarEstilo={alternarEstilo}
        estiloActivo="pastillas"
      />
    );
  }

  return (
    <SelectorRolElite
      onAlternarEstilo={alternarEstilo}
      estiloActivo="orbes"
    />
  );
}

export default PantallaRoles;
export const RolesScreen = PantallaRoles;
