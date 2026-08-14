import { Dimensions } from 'react-native';

export const defaultChartConfig = {
  backgroundColor: '#0f172a',
  backgroundGradientFrom: '#0f172a',
  backgroundGradientTo: '#0f172a',
  decimalPlaces: 0,
  color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(148, 163, 184, ${opacity})`,
  propsForDots: {
    r: '4',
    strokeWidth: '2',
    stroke: '#3b82f6',
  },
  propsForLabels: {
    fontWeight: '600',
  },
};

export const defaultChartWidth = Dimensions.get('window').width - 64;
