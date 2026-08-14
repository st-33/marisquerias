/**
 * 🍳 COCINA CONTAINER
 * Container ultra-fino de Expo Router. Delegación a la Fábrica de Screens.
 */

import React from 'react';
import { useScreenResolver } from '../../src/plataforma/core/fabrica';

export default function CocinaContainer() {
  const resolved = useScreenResolver('cocina');

  if (resolved.loading || !resolved.Screen) {
    return null;
  }

  const Component = resolved.Screen;
  return <Component {...resolved.props} />;
}
