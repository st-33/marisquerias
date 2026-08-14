import fs from 'fs';
import path from 'path';
import { estaFeatureAdminHabilitada, validarProductoParaEliminar } from '../menuSafety';

describe('seguridad del menú administrativo', () => {
  test('respeta el feature gate de alta de categorías', () => {
    expect(
      estaFeatureAdminHabilitada({ admin_menu_add_category: true }, 'admin_menu_add_category')
    ).toBe(true);
    expect(
      estaFeatureAdminHabilitada({ admin_menu_add_category: false }, 'admin_menu_add_category')
    ).toBe(false);
  });

  test('valida existencia e identificador antes de eliminar un producto', () => {
    expect(validarProductoParaEliminar(' pan-1 ', { 'pan-1': {} })).toBe('pan-1');
    expect(() => validarProductoParaEliminar('', { 'pan-1': {} })).toThrow(
      'Selecciona un producto válido'
    );
    expect(() => validarProductoParaEliminar('pan-2', { 'pan-1': {} })).toThrow(
      'El producto ya no existe'
    );
  });

  test('la pantalla usa la eliminación validada y no la operación cruda', () => {
    const fuente = fs.readFileSync(
      path.resolve(__dirname, '../AdminMenuScreen.tsx'),
      'utf8'
    );

    expect(fuente).toContain('actions.eliminarProductoConValidacion(id)');
    expect(fuente).not.toContain('actions.eliminarProducto(id)');
  });
});
