export type NodeType = 'negocio' | 'modulo' | 'flujo' | 'estrategia' | 'proceso';
export type NodeStatus = 'activo' | 'pendiente' | 'riesgo' | 'oportunidad';

export interface EcosystemNode {
  id: string;
  nombre: string;
  tipo: NodeType;
  estado: NodeStatus;
  conexiones: string[]; // IDs de nodos hijos o relacionados directamente
  detalles: {
    proposito: string;
    problema: string;
    valor: string;
    conexionesEstrategicas: string[]; // Relaciones a nivel macro (ej. a estrategias)
    oportunidades: string[];
  };
}

export const ecosystemGraph: Record<string, EcosystemNode> = {
  'negocio-marisqueria': {
    id: 'negocio-marisqueria',
    nombre: 'Marisquería',
    tipo: 'negocio',
    estado: 'activo',
    conexiones: ['modulo-pos', 'modulo-voz', 'modulo-cocina'],
    detalles: {
      proposito: 'Ofrecer platillos de marisco con alta velocidad y excelente experiencia',
      problema: 'Alta concurrencia en picos de demanda genera cuellos de botella',
      valor: 'Satisfacción del cliente mediante servicio rápido y comida fresca',
      conexionesEstrategicas: ['estrategia-velocidad', 'estrategia-errores'],
      oportunidades: ['Expansión a delivery automatizado', 'Programas de lealtad'],
    },
  },
  'modulo-pos': {
    id: 'modulo-pos',
    nombre: 'POS',
    tipo: 'modulo',
    estado: 'activo',
    conexiones: ['modulo-cocina'],
    detalles: {
      proposito: 'Punto de venta principal para toma de órdenes físicas',
      problema: 'El cajero pierde mucho tiempo en registrar órdenes complejas',
      valor: 'Centralización de ingresos y control de caja',
      conexionesEstrategicas: ['estrategia-velocidad'],
      oportunidades: ['Integración con terminales de autopago'],
    },
  },
  'modulo-voz': {
    id: 'modulo-voz',
    nombre: 'Pedidos por Voz',
    tipo: 'modulo',
    estado: 'oportunidad',
    conexiones: ['modulo-pos', 'modulo-cocina'],
    detalles: {
      proposito: 'Tomar la orden del cliente usando IA directamente a la mesa',
      problema: 'Falta de personal para atender mesas en horas pico',
      valor: 'Escalabilidad infinita en atención al cliente',
      conexionesEstrategicas: ['estrategia-velocidad', 'estrategia-errores'],
      oportunidades: ['Análisis de sentimientos en tiempo real de los clientes'],
    },
  },
  'modulo-cocina': {
    id: 'modulo-cocina',
    nombre: 'KDS Cocina',
    tipo: 'modulo',
    estado: 'activo',
    conexiones: [],
    detalles: {
      proposito: 'Recibir órdenes estructuradas y guiar la preparación',
      problema: 'Tickets de papel perdidos o confusos',
      valor: 'Sincronización exacta entre meseros y cocineros',
      conexionesEstrategicas: ['estrategia-errores'],
      oportunidades: ['Predicción de tiempos de preparación basados en volumen'],
    },
  },
  'estrategia-velocidad': {
    id: 'estrategia-velocidad',
    nombre: 'Aumento de Velocidad',
    tipo: 'estrategia',
    estado: 'pendiente',
    conexiones: ['modulo-voz', 'modulo-pos'],
    detalles: {
      proposito: 'Reducir el TTM (Time To Mouth) del cliente',
      problema: 'Clientes esperan más de 15 minutos en recibir su comida',
      valor: 'Mayor rotación de mesas y mejor review score',
      conexionesEstrategicas: [],
      oportunidades: ['Identificar platillos cuello de botella'],
    },
  },
  'estrategia-errores': {
    id: 'estrategia-errores',
    nombre: 'Reducción de Errores',
    tipo: 'estrategia',
    estado: 'riesgo',
    conexiones: ['modulo-cocina', 'modulo-voz'],
    detalles: {
      proposito: 'Cero devoluciones por órdenes incorrectas',
      problema: 'Alergias o exclusiones ignoradas por mala comunicación',
      valor: 'Reducción de merma y protección de la marca',
      conexionesEstrategicas: [],
      oportunidades: ['Sistema de validación doble paso para tickets especiales'],
    },
  },
};
