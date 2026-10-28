import {
  clasificarErrorArranque,
  sanitizarCodigo,
  type TipoErrorArranque,
} from '../erroresArranque';

describe('clasificarErrorArranque — Variantes Canónicas de Error', () => {
  test('variante 1: codigo_invalido (código inexistente o formato erróneo)', () => {
    const error = new Error('El código de acceso no existe en Unidad Secundaria');
    const res = clasificarErrorArranque(error, 'XYZ-99');
    expect(res.tipo).toBe<TipoErrorArranque>('codigo_invalido');
    expect(res.mensaje).toBe('El código no existe o expiró. Verifica con tu especialista.');
    expect(res.permiteReintentar).toBe(true);
    expect(res.accionTexto).toBe('Reintentar');
  });

  test('variante 2: codigo_revocado (código revocado por Torre de Control)', () => {
    const error = new Error('El código de acceso fue revocado');
    const res = clasificarErrorArranque(error, 'REV-01');
    expect(res.tipo).toBe<TipoErrorArranque>('codigo_revocado');
    expect(res.mensaje).toBe(
      'Este código fue revocado. Contacta a tu especialista para uno nuevo.'
    );
    expect(res.permiteReintentar).toBe(false);
    expect(res.accionTexto).toBe('Salir');
  });

  test('variante 3: codigo_expirado (código vencido o agotado)', () => {
    const error = new Error('El código de acceso ha expirado');
    const res = clasificarErrorArranque(error, 'EXP-01');
    expect(res.tipo).toBe<TipoErrorArranque>('codigo_expirado');
    expect(res.mensaje).toBe('El código expiró. Solicita uno nuevo.');
    expect(res.permiteReintentar).toBe(false);
    expect(res.accionTexto).toBe('Salir');
  });

  test('variante 4: sin_conexion (falla de red durante resolución)', () => {
    const error = new Error('Network request failed: sin conexión');
    const res = clasificarErrorArranque(error, 'NET-01');
    expect(res.tipo).toBe<TipoErrorArranque>('sin_conexion');
    expect(res.mensaje).toBe('Sin conexión. Revisa tu red y reintenta.');
    expect(res.permiteReintentar).toBe(true);
    expect(res.accionTexto).toBe('Reintentar');
  });

  test('variante 5: npb_incompatible (capacidades no soportadas por la aplicación)', () => {
    const error = new Error(
      'NPB incompatible con este APK. Faltantes: capacidad:reservaciones, rol:auditor'
    );
    const res = clasificarErrorArranque(error, 'INC-01');
    expect(res.tipo).toBe<TipoErrorArranque>('npb_incompatible');
    expect(res.mensaje).toContain('capacidad:reservaciones, rol:auditor');
    expect(res.faltantes).toEqual(['capacidad:reservaciones', 'rol:auditor']);
    expect(res.permiteReintentar).toBe(false);
    expect(res.accionTexto).toBe('Salir');
  });

  test('variante 6: desconocido (error inesperado)', () => {
    const error = new Error('Unexpected internal fault in cipher generator');
    const res = clasificarErrorArranque(error, 'UNK-01');
    expect(res.tipo).toBe<TipoErrorArranque>('desconocido');
    expect(res.mensaje).toBe('Ocurrió un error. Intenta de nuevo o contacta soporte.');
    expect(res.permiteReintentar).toBe(true);
    expect(res.accionTexto).toBe('Reintentar');
    expect(res.detalleTecnico).toContain('Unexpected internal fault');
  });

  test('sanitizarCodigo remueve caracteres prohibidos y no expone datos sensibles', () => {
    expect(sanitizarCodigo('  test-123_abc*  ')).toBe('TEST-123ABC');
    expect(sanitizarCodigo('')).toBe('');
    expect(sanitizarCodigo(undefined)).toBe('');
  });
});
