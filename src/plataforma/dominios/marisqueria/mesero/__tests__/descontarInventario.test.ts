import { classifyInventoryError } from '../inventoryErrors';

describe('classifyInventoryError', () => {
  it('clasifica el stock insuficiente como error operativo explícito', () => {
    const result = classifyInventoryError(
      new Error('Stock insuficiente para itemId=camaron-1. Disponible: 0')
    );

    expect(result).toEqual({
      code: 'INSUFFICIENT_STOCK',
      message: 'Stock insuficiente para itemId=camaron-1. Disponible: 0',
    });
  });

  it('clasifica otros fallos como error de deducción de inventario', () => {
    expect(classifyInventoryError(new Error('No hay área de inventario configurada'))).toEqual({
      code: 'INVENTORY_DEDUCTION_FAILED',
      message: 'No hay área de inventario configurada',
    });
  });
});
