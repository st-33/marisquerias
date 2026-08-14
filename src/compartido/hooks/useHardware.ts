import { useHardware as useHardwareLegacy } from '../../plataforma/nucleo/sistema-impresion/hooks/useFierrosLegacy';

export const useHardware = () => {
  return useHardwareLegacy();
};
