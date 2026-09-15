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
    backgroundColor: '#0D111A',
    borderRadius: 12,
    padding: 4,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(244, 201, 93, 0.16)',
  },
  scrollFila: {
    maxWidth: '80%',
  },
  boton: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 9,
  },
  botonActivo: {
    backgroundColor: '#F4C95D',
    shadowColor: '#F4C95D',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  textoBoton: {
    color: '#8291A5',
    fontSize: 13,
    fontWeight: '700',
  },
  textoBotonActivo: {
    color: '#080A0F',
    fontWeight: '900',
  },
});
