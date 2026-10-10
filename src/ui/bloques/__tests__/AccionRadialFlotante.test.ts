import fs from 'fs';
import path from 'path';
import { ejecutarAccionFab } from '../accionFlotante';

describe('FabRadial', () => {
  test('ejecuta la acción exactamente una vez sin depender del resultado de la animación', () => {
    const onPress = jest.fn();

    ejecutarAccionFab({
      key: 'accion',
      label: 'Acción',
      icon: null,
      onPress,
    });

    expect(onPress).toHaveBeenCalledTimes(1);

    const fuente = fs.readFileSync(path.resolve(__dirname, '../AccionRadialFlotante.tsx'), 'utf8');
    expect(fuente).toContain('ejecutarAccionFab(item);');

    expect(fuente).not.toMatch(/withTiming\([^;]+finished/s);
  });
});
