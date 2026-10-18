import fs from 'fs';
import path from 'path';
import {
  ROLES_DISPOSITIVO_CANONICOS,
  CATALOGO_ROLES_DISPOSITIVO,
  esRolDispositivoCanonico,
  obtenerDefinicionRol,
} from '../catalogoRoles';

describe('catalogoRoles — Catálogo Cerrado de 10 Roles de Dispositivo', () => {
  test('contiene exactamente los 10 roles canónicos definidos en el contrato', () => {
    expect(ROLES_DISPOSITIVO_CANONICOS.length).toBe(10);
    expect(ROLES_DISPOSITIVO_CANONICOS).toEqual([
      'administrador',
      'mesero',
      'cocina',
      'mostrador',
      'cajero',
      'repartidor',
      'barman',
      'barista',
      'parrillero',
      'empacador',
    ]);
  });

  test('cada rol en el catálogo declara id, pantallas, requeridas y opcionales', () => {
    for (const rolId of ROLES_DISPOSITIVO_CANONICOS) {
      const def = CATALOGO_ROLES_DISPOSITIVO[rolId];
      expect(def).toBeDefined();
      expect(def.id).toBe(rolId);
      expect(typeof def.pantalla).toBe('string');
      expect(Array.isArray(def.pantallas_visibles)).toBe(true);
      expect(Array.isArray(def.pantallas_visibles_default)).toBe(true);
      expect(Array.isArray(def.capacidades_requeridas)).toBe(true);
      expect(Array.isArray(def.capacidades_opcionales)).toBe(true);
    }
  });

  test('esRolDispositivoCanonico valida correctamente roles válidos e inválidos', () => {
    expect(esRolDispositivoCanonico('administrador')).toBe(true);
    expect(esRolDispositivoCanonico('cajero')).toBe(true);
    expect(esRolDispositivoCanonico('empacador')).toBe(true);
    expect(esRolDispositivoCanonico('astronauta')).toBe(false);
    expect(esRolDispositivoCanonico('')).toBe(false);
  });

  test('obtenerDefinicionRol retorna la definición o undefined', () => {
    expect(obtenerDefinicionRol('cocina')?.capacidades_requeridas).toContain('comanda_cocina');
    expect(obtenerDefinicionRol('invalido' as any)).toBeUndefined();
  });

  test('los 10 roles tienen pantalla única (ninguno comparte pantalla con otro)', () => {
    const pantallasAsignadas = new Set<string>();
    const rolesCompartidos: string[] = [];

    for (const rolId of ROLES_DISPOSITIVO_CANONICOS) {
      const def = CATALOGO_ROLES_DISPOSITIVO[rolId];
      if (pantallasAsignadas.has(def.pantalla)) {
        rolesCompartidos.push(`${rolId} comparte ${def.pantalla}`);
      }
      pantallasAsignadas.add(def.pantalla);
    }

    expect(rolesCompartidos).toEqual([]);
    expect(pantallasAsignadas.size).toBe(10);
  });

  test('todas las pantallas referenciadas en el catálogo existen físicamente en app/_role/', () => {
    const rootDir = process.cwd();

    for (const rolId of ROLES_DISPOSITIVO_CANONICOS) {
      const def = CATALOGO_ROLES_DISPOSITIVO[rolId];
      const rutaArchivo = path.resolve(rootDir, def.pantalla);
      const existe = fs.existsSync(rutaArchivo);

      expect(existe).toBe(true);
    }
  });
});
