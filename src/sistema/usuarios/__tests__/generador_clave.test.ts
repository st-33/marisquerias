import { resolverClaveNominal } from '../generador_clave';
import type { UsuarioNegocio } from '../tipos';

describe('Resolvedor de Clave Nominal (generador_clave)', () => {
  it('1. Asigna el primer nombre como clave si está libre', () => {
    const resultado = resolverClaveNominal('Ana Isabel López', []);
    expect(resultado.tieneConflicto).toBe(false);
    expect(resultado.clave).toBe('Ana');
    expect(resultado.primerNombreCandidato).toBe('Ana');
    expect(resultado.segundoNombreCandidato).toBe('Isabel');
  });

  it('2. Usa el segundo nombre si el primer nombre ya está en uso', () => {
    const usuariosExistentes: UsuarioNegocio[] = [
      {
        id: '01',
        nombre: 'Ana María Gómez',
        clave: 'Ana',
        edad: 30,
        sexo: 'M',
        perfil: { cargo: 'mesero' },
      },
    ];

    const resultado = resolverClaveNominal('Ana Isabel López', usuariosExistentes);
    expect(resultado.tieneConflicto).toBe(false);
    expect(resultado.clave).toBe('Isabel');
  });

  it('3. Detecta conflicto explícito si ambos nombres ya están en uso (sin sufijos silenciosos)', () => {
    const usuariosExistentes: UsuarioNegocio[] = [
      {
        id: '01',
        nombre: 'Ana Gómez',
        clave: 'Ana',
        edad: 30,
        sexo: 'M',
        perfil: { cargo: 'mesero' },
      },
      {
        id: '02',
        nombre: 'Isabel Torres',
        clave: 'Isabel',
        edad: 25,
        sexo: 'M',
        perfil: { cargo: 'cocina' },
      },
    ];

    const resultado = resolverClaveNominal('Ana Isabel López', usuariosExistentes);
    expect(resultado.tieneConflicto).toBe(true);
    expect(resultado.clave).toBe('');
    expect(resultado.error).toContain('Colisión nominal');
    // Verifica que NO se agregaron números ni sufijos aleatorios
    expect(resultado.clave).not.toBe('Ana2');
    expect(resultado.clave).not.toBe('Ana_1');
  });

  it('4. Detecta conflicto si solo tiene un nombre y ya está ocupado', () => {
    const usuariosExistentes: UsuarioNegocio[] = [
      {
        id: '01',
        nombre: 'Carlos López',
        clave: 'Carlos',
        edad: 40,
        sexo: 'H',
        perfil: { cargo: 'cajero' },
      },
    ];

    const resultado = resolverClaveNominal('Carlos', usuariosExistentes);
    expect(resultado.tieneConflicto).toBe(true);
    expect(resultado.clave).toBe('');
    expect(resultado.segundoNombreCandidato).toBeNull();
  });

  it('5. La comparación es insensible a mayúsculas, minúsculas y tildes', () => {
    const usuariosExistentes: UsuarioNegocio[] = [
      {
        id: '01',
        nombre: 'Jesús Ramírez',
        clave: 'Jesús',
        edad: 35,
        sexo: 'H',
        perfil: { cargo: 'parrillero' },
      },
    ];

    // "jesus" sin tilde y en minúsculas debe detectar la colisión
    const resultado = resolverClaveNominal('Jesus Alberto Mendoza', usuariosExistentes);
    expect(resultado.tieneConflicto).toBe(false);
    expect(resultado.clave).toBe('Alberto');
  });

  it('6. Rechaza nombres vacíos o espacios en blanco', () => {
    const resultado = resolverClaveNominal('   ', []);
    expect(resultado.tieneConflicto).toBe(true);
    expect(resultado.error).toBeDefined();
  });
});
