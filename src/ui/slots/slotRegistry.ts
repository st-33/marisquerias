import type { ComponentType } from 'react';

type ContratoSlots<Contrato> = {
  [NombreSlot in keyof Contrato]: object;
};

export type SlotRegistry<Contrato extends ContratoSlots<Contrato>> = {
  readonly [NombreSlot in keyof Contrato]: Readonly<
    Record<string, ComponentType<Contrato[NombreSlot]>>
  >;
};

export function defineSlotRegistry<Contrato extends ContratoSlots<Contrato>>() {
  return <const Registro extends SlotRegistry<Contrato>>(
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

export function resolveSlotOverride<
  Contrato extends ContratoSlots<Contrato>,
  NombreSlot extends Extract<keyof Contrato, string>
>(
  registro: SlotRegistry<Contrato>,
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
