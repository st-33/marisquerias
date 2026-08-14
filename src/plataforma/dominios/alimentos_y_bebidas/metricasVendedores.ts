export interface ResumenVendedor {
  nombre: string;
  monto: number;
  subpedidos: number;
}

const NOMBRES_VENDEDOR_BLOQUEADOS = new Set(['__proto__', 'prototype', 'constructor']);

export function acumularVendedorSeguro(
  vendedores: Map<string, ResumenVendedor>,
  nombreRemoto: unknown,
  monto: number
): void {
  const nombre =
    typeof nombreRemoto === 'string' && nombreRemoto.trim() ? nombreRemoto.trim() : 'Caja Central';

  if (NOMBRES_VENDEDOR_BLOQUEADOS.has(nombre)) {
    return;
  }

  const resumen = vendedores.get(nombre) ?? {
    nombre,
    monto: 0,
    subpedidos: 0,
  };
  resumen.monto += monto;
  resumen.subpedidos += 1;
  vendedores.set(nombre, resumen);
}
