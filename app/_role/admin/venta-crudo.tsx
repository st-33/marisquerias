/**
 * ⚡ ADMIN MOSTRADOR CONTAINER
 * Container ultra-fino de Expo Router. Delegación a la Fábrica de Screens.
 */

import React from 'react';
import { useScreenResolver } from '../../../src/plataforma/core/fabrica';

export default function AdminMostradorContainer() {
  const resolved = useScreenResolver('admin_mostrador');

  if (resolved.loading || !resolved.Screen) {
    return null;
  }

  const Component = resolved.Screen;
  return <Component {...resolved.props} />;
}
