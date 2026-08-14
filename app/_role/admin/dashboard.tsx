/**
 * 📊 ADMIN DASHBOARD CONTAINER
 * Container ultra-fino de Expo Router. Delegación a la Fábrica de Screens.
 */

import React from 'react';
import { useScreenResolver } from '../../../src/plataforma/core/fabrica';

export default function AdminDashboardContainer() {
  const resolved = useScreenResolver('admin_dashboard');

  if (resolved.loading || !resolved.Screen) {
    return null;
  }

  const Component = resolved.Screen;
  return <Component {...resolved.props} />;
}
