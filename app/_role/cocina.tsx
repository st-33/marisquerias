/**
 * 🍳 COCINA CONTAINER
 * Container de Expo Router para Cocina Central (KDS) y estaciones de preparación.
 */

import React from 'react';
import { PantallaCocina } from '../../src/ui/pantallas/PantallaCocina';

export interface CocinaContainerProps {
  estacion?: string;
}

export default function CocinaContainer({ estacion }: CocinaContainerProps = {}) {
  return <PantallaCocina estacion={estacion} />;
}
