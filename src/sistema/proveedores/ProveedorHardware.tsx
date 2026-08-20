import { useHardware as useHardwareLegacy } from '../impresion/fierros/hooks/useFierrosLegacy';
import { ProveedorFierros } from '../impresion/fierros/proveedor/ProveedorFierros';

export const ProveedorHardware = ProveedorFierros;
export const useHardware = useHardwareLegacy;
export type { Device } from '../impresion/fierros/hooks/useFierrosLegacy';
