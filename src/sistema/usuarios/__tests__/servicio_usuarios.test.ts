import type { Database } from 'firebase/database';
import {
  calcularSiguienteIdUsuario,
  crearUsuario,
  listarUsuarios,
  actualizarUsuario,
  eliminarUsuario,
} from '../servicio_usuarios';

// Mock de RTDB en memoria
let mockRtdb: Record<string, any> = {};

jest.mock('firebase/database', () => ({
  ref: jest.fn((_db: any, path: string) => ({ path })),
  get: jest.fn(async (refObj: { path: string }) => {
    const clean = (refObj.path || '').replace(/^\/+|\/+$/g, '');
    const val = mockRtdb[clean];
    return {
      exists: () => val !== undefined && val !== null,
      val: () => (val !== undefined ? val : null),
    };
  }),
  set: jest.fn(async (refObj: { path: string }, data: any) => {
    const clean = (refObj.path || '').replace(/^\/+|\/+$/g, '');
    mockRtdb[clean] = JSON.parse(JSON.stringify(data));
    // Sincronizar también el mapa agrupado de usuario
    const partes = clean.split('/');
    if (partes[0] === 'usuario' && partes.length === 2) {
      if (!mockRtdb['usuario']) mockRtdb['usuario'] = {};
      mockRtdb['usuario'][partes[1]] = JSON.parse(JSON.stringify(data));
    }
  }),
  update: jest.fn(async (refObj: { path: string }, data: any) => {
    const clean = (refObj.path || '').replace(/^\/+|\/+$/g, '');
    mockRtdb[clean] = { ...(mockRtdb[clean] || {}), ...JSON.parse(JSON.stringify(data)) };
    const partes = clean.split('/');
    if (partes[0] === 'usuario' && partes.length === 2) {
      if (!mockRtdb['usuario']) mockRtdb['usuario'] = {};
      mockRtdb['usuario'][partes[1]] = {
        ...(mockRtdb['usuario'][partes[1]] || {}),
        ...JSON.parse(JSON.stringify(data)),
      };
    }
  }),
  remove: jest.fn(async (refObj: { path: string }) => {
    const clean = (refObj.path || '').replace(/^\/+|\/+$/g, '');
    delete mockRtdb[clean];
    const partes = clean.split('/');
    if (partes[0] === 'usuario' && partes.length === 2 && mockRtdb['usuario']) {
      delete mockRtdb['usuario'][partes[1]];
    }
  }),
}));

const dbMock = {} as Database;

describe('Servicio de Usuarios (servicio_usuarios)', () => {
  beforeEach(() => {
    mockRtdb = {};
  });

  describe('calcularSiguienteIdUsuario', () => {
    it('1. Devuelve "01" si no hay usuarios', () => {
      expect(calcularSiguienteIdUsuario(null)).toBe('01');
      expect(calcularSiguienteIdUsuario({})).toBe('01');
      expect(calcularSiguienteIdUsuario([])).toBe('01');
    });

    it('2. Calcula consecutivo de 2 dígitos a partir de existentes', () => {
      expect(calcularSiguienteIdUsuario({ '01': {} })).toBe('02');
      expect(calcularSiguienteIdUsuario({ '01': {}, '02': {} })).toBe('03');
      expect(calcularSiguienteIdUsuario({ '09': {} })).toBe('10');
      expect(calcularSiguienteIdUsuario({ '15': {} })).toBe('16');
    });
  });

  describe('crearUsuario y validaciones', () => {
    it('3. Crea exitosamente un usuario en /usuario/{id} con clave y consecutivo', async () => {
      const nuevo = await crearUsuario(dbMock, {
        nombre: 'Ana Isabel López',
        edad: 28,
        sexo: 'M',
        cargo: 'mesero',
        sueldo: 450,
        horario_entrada: '08:00',
        horario_salida: '16:00',
      });

      expect(nuevo.id).toBe('01');
      expect(nuevo.nombre).toBe('Ana Isabel López');
      expect(nuevo.clave).toBe('Ana');
      expect(nuevo.edad).toBe(28);
      expect(nuevo.sexo).toBe('M');
      expect(nuevo.perfil.cargo).toBe('mesero');
      expect(nuevo.perfil.sueldo).toBe(450);

      expect(mockRtdb['usuario/01']).toBeDefined();
      expect(mockRtdb['usuario/01'].clave).toBe('Ana');
    });

    it('4. Resuelve segundo nombre cuando el primer nombre colisiona', async () => {
      // Primer usuario
      await crearUsuario(dbMock, {
        nombre: 'Ana Gómez',
        edad: 30,
        sexo: 'M',
        cargo: 'mesero',
      });

      // Segundo usuario con el mismo primer nombre
      const segundo = await crearUsuario(dbMock, {
        nombre: 'Ana Isabel López',
        edad: 26,
        sexo: 'M',
        cargo: 'mesero',
      });

      expect(segundo.id).toBe('02');
      expect(segundo.clave).toBe('Isabel'); // Asigna el segundo nombre
    });

    it('5. Lanza error cuando hay colisión en ambos nombres', async () => {
      await crearUsuario(dbMock, {
        nombre: 'Carlos Gómez',
        edad: 30,
        sexo: 'H',
        cargo: 'cocina',
      });
      await crearUsuario(dbMock, {
        nombre: 'Eduardo Torres',
        edad: 25,
        sexo: 'H',
        cargo: 'parrillero',
      });

      // Tercer usuario cuyos dos primeros nombres ya existen
      await expect(
        crearUsuario(dbMock, {
          nombre: 'Carlos Eduardo Ramírez',
          edad: 29,
          sexo: 'H',
          cargo: 'mesero',
        })
      ).rejects.toThrow('Colisión nominal');
    });

    it('6. Valida edad de 2 dígitos entre 14 y 99 años', async () => {
      await expect(
        crearUsuario(dbMock, {
          nombre: 'Juan Pérez',
          edad: 12,
          sexo: 'H',
          cargo: 'mesero',
        })
      ).rejects.toThrow('La edad debe ser un número entero válido de 2 dígitos');

      await expect(
        crearUsuario(dbMock, {
          nombre: 'Juan Pérez',
          edad: 105,
          sexo: 'H',
          cargo: 'mesero',
        })
      ).rejects.toThrow('La edad debe ser un número entero válido de 2 dígitos');
    });

    it('7. Valida nombre mínimo y cargo requerido', async () => {
      await expect(
        crearUsuario(dbMock, {
          nombre: 'A',
          edad: 25,
          sexo: 'H',
          cargo: 'mesero',
        })
      ).rejects.toThrow('El nombre del usuario debe contener al menos 2 caracteres');

      await expect(
        crearUsuario(dbMock, {
          nombre: 'Juan Pérez',
          edad: 25,
          sexo: 'H',
          cargo: '',
        })
      ).rejects.toThrow('El cargo o responsabilidad del usuario es requerido');
    });
  });

  describe('listarUsuarios, actualizarUsuario y eliminarUsuario', () => {
    it('8. Lista usuarios ordenados de forma ascendente por consecutivo', async () => {
      await crearUsuario(dbMock, {
        nombre: 'Ana López',
        edad: 28,
        sexo: 'M',
        cargo: 'mesero',
      });
      await crearUsuario(dbMock, {
        nombre: 'Beto Juárez',
        edad: 32,
        sexo: 'H',
        cargo: 'cocina',
      });

      const lista = await listarUsuarios(dbMock);
      expect(lista.length).toBe(2);
      expect(lista[0].id).toBe('01');
      expect(lista[1].id).toBe('02');
    });

    it('9. Actualiza campos de un usuario sin alterar su ID', async () => {
      await crearUsuario(dbMock, {
        nombre: 'Ana López',
        edad: 28,
        sexo: 'M',
        cargo: 'mesero',
      });

      await actualizarUsuario(dbMock, '01', {
        cargo: 'capitán de meseros',
        sueldo: 600,
      });

      expect(mockRtdb['usuario/01']['perfil/cargo']).toBe('capitán de meseros');
      expect(mockRtdb['usuario/01']['perfil/sueldo']).toBe(600);
    });

    it('10. Elimina un usuario por ID', async () => {
      await crearUsuario(dbMock, {
        nombre: 'Ana López',
        edad: 28,
        sexo: 'M',
        cargo: 'mesero',
      });

      await eliminarUsuario(dbMock, '01');
      expect(mockRtdb['usuario/01']).toBeUndefined();
    });
  });
});
