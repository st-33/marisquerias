import { useHardware as useHardwareLegacy } from '../nucleo/sistema-impresion/hooks/useFierrosLegacy';
import { ProveedorFierros } from '../nucleo/sistema-impresion/proveedor/ProveedorFierros';

export const HardwareProvider = ProveedorFierros;
export const useHardware = useHardwareLegacy;
export type { Device } from '../nucleo/sistema-impresion/hooks/useFierrosLegacy';
