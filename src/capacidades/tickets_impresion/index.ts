/**
 * 🧾 CAPACIDAD CANÓNICA: TICKETS_IMPRESION
 *
 * Módulo de alto nivel para gestión y emisión de tickets y comprobantes impresos.
 * Toda la comunicación con hardware físico y drivers ESC/POS se delega
 * exclusivamente en el subsistema canónico `src/sistema/impresion/fierros/`.
 */

import { servicioFierros } from '../../sistema/impresion/fierros/servicio/ServicioFierros';
import type {
  DatosComanda,
  DatosCuenta,
  DatosVenta,
  ItemPesado,
  ConfiguracionTicket,
  OpcionesImpresion,
  ResultadoImpresion,
} from '../../sistema/impresion/fierros/contratos/tipos';

export interface IServicioTicketsImpresion {
  imprimirComanda(datos: DatosComanda, opciones?: OpcionesImpresion): Promise<ResultadoImpresion>;
  imprimirCuenta(datos: DatosCuenta, opciones?: OpcionesImpresion): Promise<ResultadoImpresion>;
  imprimirVenta(datos: DatosVenta, config?: ConfiguracionTicket): Promise<ResultadoImpresion>;
  imprimirEtiquetaBascula(
    item: ItemPesado,
    config?: ConfiguracionTicket
  ): Promise<ResultadoImpresion>;
  estaListoParaImprimir(): boolean;
}

const OPCIONES_DEFAULT: OpcionesImpresion = { rol: 'caja' };
const CONFIG_DEFAULT: ConfiguracionTicket = {
  nombreNegocio: 'Marisquería',
  encabezado: 'COMPROBANTE',
  mensajeFinal: '¡Gracias por su compra!',
};

export class ServicioTicketsImpresion implements IServicioTicketsImpresion {
  async imprimirComanda(
    datos: DatosComanda,
    opciones?: OpcionesImpresion
  ): Promise<ResultadoImpresion> {
    return servicioFierros.imprimirComanda(datos, opciones || { rol: 'cocina' });
  }

  async imprimirCuenta(
    datos: DatosCuenta,
    opciones?: OpcionesImpresion
  ): Promise<ResultadoImpresion> {
    return servicioFierros.imprimirCuenta(datos, opciones || OPCIONES_DEFAULT);
  }

  async imprimirVenta(
    datos: DatosVenta,
    config?: ConfiguracionTicket
  ): Promise<ResultadoImpresion> {
    return servicioFierros.imprimirTicketVenta(datos, config || CONFIG_DEFAULT);
  }

  async imprimirEtiquetaBascula(
    item: ItemPesado,
    config?: ConfiguracionTicket
  ): Promise<ResultadoImpresion> {
    return servicioFierros.imprimirEtiquetaBascula(item, config || CONFIG_DEFAULT);
  }

  estaListoParaImprimir(): boolean {
    return servicioFierros.estaConectado;
  }
}

export const servicioTicketsImpresion = new ServicioTicketsImpresion();

export function useTicketsImpresion() {
  return {
    imprimirComanda: (datos: DatosComanda, opciones?: OpcionesImpresion) =>
      servicioTicketsImpresion.imprimirComanda(datos, opciones),
    imprimirCuenta: (datos: DatosCuenta, opciones?: OpcionesImpresion) =>
      servicioTicketsImpresion.imprimirCuenta(datos, opciones),
    imprimirVenta: (datos: DatosVenta, config?: ConfiguracionTicket) =>
      servicioTicketsImpresion.imprimirVenta(datos, config),
    imprimirEtiquetaBascula: (item: ItemPesado, config?: ConfiguracionTicket) =>
      servicioTicketsImpresion.imprimirEtiquetaBascula(item, config),
    estaListo: servicioTicketsImpresion.estaListoParaImprimir(),
  };
}
