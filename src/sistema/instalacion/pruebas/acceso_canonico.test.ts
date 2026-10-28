import { get, ref } from 'firebase/database';
import { resolverAccessCode } from '../vinculacion/resolver-access-code';

jest.mock('firebase/database', () => ({ get: jest.fn(), ref: jest.fn((_db, path) => path) }));
const ruta = 'comedores_y_servicios/marisquerias/negocio/Puerto Libres';
const negocio = {
  id: '01',
  estado: 'activo',
  url_unidad: 'https://puerto.firebaseio.com',
  version_npb_origen: 1,
  capacidades_autorizadas: { menu: true, inventario: false },
};
const db = {} as any;
let datos: Record<string, unknown>;
beforeEach(() => {
  jest.clearAllMocks();
  datos = { 'codigo_de_acceso/PUERTO-265316': ruta, [ruta]: negocio };
  (get as jest.Mock).mockImplementation(async (path) => ({
    exists: () => datos[path] !== undefined,
    val: () => datos[path],
  }));
});
test('lee URL, versión y permisos exclusivamente del negocio apuntado', async () => {
  const acceso = await resolverAccessCode(db, ' puerto-265316 ');
  expect(acceso.db_url_operativa).toBe(negocio.url_unidad);
  expect(acceso.negocio.capacidades_autorizadas).toEqual(['menu']);
  expect(acceso.negocio.ruta_npb).toBe('comedores_y_servicios/marisquerias/negocio_plantilla_base');
  expect(ref).toHaveBeenNthCalledWith(1, db, 'codigo_de_acceso/PUERTO-265316');
  expect(get).toHaveBeenCalledTimes(2);
});
test('un código inexistente no consulta otro negocio', async () => {
  await expect(resolverAccessCode(db, 'AUSENTE')).rejects.toThrow('no encontrado');
  expect(get).toHaveBeenCalledTimes(1);
});
test('un negocio inactivo impide el acceso aunque exista el código', async () => {
  datos[ruta] = { ...negocio, estado: 'inactivo' };
  await expect(resolverAccessCode(db, 'PUERTO-265316')).rejects.toThrow('no está activo');
});
test('no acepta una ruta incompleta ni una URL ausente', async () => {
  datos['codigo_de_acceso/PUERTO-265316'] = 'marisquerias/local';
  await expect(resolverAccessCode(db, 'PUERTO-265316')).rejects.toThrow('ruta inválida');
  datos['codigo_de_acceso/PUERTO-265316'] = ruta;
  datos[ruta] = { ...negocio, url_unidad: undefined };
  await expect(resolverAccessCode(db, 'PUERTO-265316')).rejects.toThrow('Unidad Operativa válida');
});
