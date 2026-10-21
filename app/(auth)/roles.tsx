/**
 * 🎭 REDIRECCIÓN A SELECTOR DE ROLES CANÓNICO
 * Evita la duplicación de pantallas de roles redirigiendo a /_role/roles.
 */

import React from 'react';
import { Redirect } from 'expo-router';

export default function RolesAuthRoute() {
  return <Redirect href="/_role/roles" />;
}
