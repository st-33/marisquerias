/**
 * 📦 ADMIN INVENTORY CONTAINER
 * Container ultra-fino de Expo Router. Delegación a la Fábrica de Screens.
 */

import React from 'react';
import { useScreenResolver } from '../../../src/composicion';

export default function AdminInventoryContainer() {
  const resolved = useScreenResolver('admin_inventory');

  if (resolved.loading || !resolved.Screen) {
    return null;
  }

  const Component = resolved.Screen;
  return <Component {...resolved.props} />;
}
