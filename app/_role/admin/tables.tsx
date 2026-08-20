/**
 * 🪑 ADMIN TABLES CONTAINER
 * Container ultra-fino de Expo Router. Delegación a la Fábrica de Screens.
 */

import React from 'react';
import { useScreenResolver } from '../../../src/composicion';

export default function AdminTablesContainer() {
  const resolved = useScreenResolver('admin_tables');

  if (resolved.loading || !resolved.Screen) {
    return null;
  }

  const Component = resolved.Screen;
  return <Component {...resolved.props} />;
}
