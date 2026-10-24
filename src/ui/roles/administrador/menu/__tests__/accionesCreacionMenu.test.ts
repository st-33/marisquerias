import fs from 'fs';
import path from 'path';

describe('acciones de creación del menú administrativo', () => {
  test('el estado vacío expone una acción visible para crear la primera categoría', () => {
    const fuente = fs.readFileSync(
      path.resolve(__dirname, '../componentes/ListaProductos.tsx'),
      'utf8'
    );

    expect(fuente).toContain('testID="crear-primera-categoria"');
    expect(fuente).toContain('onPress={onAgregarCategoria}');
    expect(fuente).toContain('Crear primera categoría');
  });

  test('la pantalla conecta las acciones visibles con el modal existente', () => {
    const fuentePantalla = fs.readFileSync(
      path.resolve(__dirname, '../PantallaMenuAdmin.tsx'),
      'utf8'
    );
    const fuenteBarra = fs.readFileSync(
      path.resolve(__dirname, '../bloques/BarraCategorias.tsx'),
      'utf8'
    );

    expect(fuentePantalla).toContain("setShowModal('addCat')");
    expect(fuentePantalla).toContain('onAgregarCategoria=');
    expect(fuentePantalla).toContain('onAgregar=');
    expect(fuenteBarra).toContain('testID="agregar-categoria"');
  });
});
