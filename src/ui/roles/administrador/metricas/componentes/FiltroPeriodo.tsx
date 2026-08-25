import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import type { DateFilter } from '../../../../../capacidades/metricas';

const OPCIONES_PERIODO: { clave: DateFilter; etiqueta: string }[] = [
  { clave: 'hoy', etiqueta: 'Hoy' },
  { clave: 'ayer', etiqueta: 'Ayer' },
  { clave: 'hace3dias', etiqueta: '3 días' },
  { clave: 'semana', etiqueta: 'Semana' },
  { clave: 'mes', etiqueta: 'Mes' },
];

type FiltroPeriodoProps = {
  filtroActual: DateFilter;
  onSeleccionar: (filtro: DateFilter) => void;
};

/**
 * Barra de filtros de período del panel.
 * Antes estaba duplicada (variante móvil y variante escritorio) dentro de la pantalla.
 */
export function FiltroPeriodo({ filtroActual, onSeleccionar }: FiltroPeriodoProps) {
  const { width } = useWindowDimensions();
  const esMovil = width < 480;

  const botones = OPCIONES_PERIODO.map((opcion) => (
    <Pressable
      key={opcion.clave}
      onPress={() => onSeleccionar(opcion.clave)}
      style={[styles.boton, filtroActual === opcion.clave && styles.botonActivo]}
    >
      <Text style={[styles.textoBoton, filtroActual === opcion.clave && styles.textoBotonActivo]}>
        {opcion.etiqueta}
      </Text>
    </Pressable>
  ));

  if (esMovil) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.fila}
        style={styles.scrollFila}
      >
        {botones}
      </ScrollView>
    );
  }

  return <View style={styles.fila}>{botones}</View>;
}

const styles = StyleSheet.create({
  fila: {
    flexDirection: 'row',
    backgroundColor: '#0f172a',
    borderRadius: 10,
    padding: 4,
    gap: 4,
  },
  scrollFila: {
    maxWidth: '80%',
  },
  boton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  botonActivo: {
    backgroundColor: '#3b82f6',
  },
  textoBoton: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '600',
  },
  textoBotonActivo: {
    color: '#ffffff',
    fontWeight: '700',
  },
});
