import type { ComponentType } from 'react';

type ContratoEspacios<Contrato> = {
  [NombreSlot in keyof Contrato]: object;
};

export type RegistroEspacios<Contrato extends ContratoEspacios<Contrato>> = {
  readonly [NombreSlot in keyof Contrato]: Readonly<
    Record<string, ComponentType<Contrato[NombreSlot]>>
  >;
};

export function definirRegistroEspacios<Contrato extends ContratoEspacios<Contrato>>() {
  return <const Registro extends RegistroEspacios<Contrato>>(
    registro: Registro
  ): Readonly<Registro> => {
    const copia = Object.fromEntries(
      Object.entries(registro).map(([nombreSlot, allowlist]) => [
        nombreSlot,
        Object.freeze(Object.assign({}, allowlist)),
      ])
    ) as Registro;

    return Object.freeze(copia);
  };
}

export function resolverSobrescrituraEspacio<
  Contrato extends ContratoEspacios<Contrato>,
  NombreSlot extends Extract<keyof Contrato, string>
>(
  registro: RegistroEspacios<Contrato>,
  nombreSlot: NombreSlot,
  rawId: unknown
): ComponentType<Contrato[NombreSlot]> | undefined {
  if (typeof rawId !== 'string') {
    return undefined;
  }

  const allowlist = registro[nombreSlot];
  if (!Object.prototype.hasOwnProperty.call(allowlist, rawId)) {
    return undefined;
  }

  return allowlist[rawId];
}
