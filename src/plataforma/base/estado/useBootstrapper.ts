import { useEffect, useState } from 'react';
import { logger } from '../../core/monitoring';
import { cargarEstadoPersistido } from '../../core/store';

/**
 * 🚀 BOOTSTRAPPER DEL SISTEMA
 * Se encarga de despertar la aplicación y cargar la memoria a largo plazo.
 * Retorna true cuando el sistema está listo para operar.
 */
export function useBootstrapper() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    const arrancar = async () => {
      try {
        logger.info('BOOTSTRAP', '🔌 Iniciando carga de estado...');
        await cargarEstadoPersistido();
        if (mounted) {
          logger.info('BOOTSTRAP', '✅ Estado cargado. Sistema listo.');
          setIsReady(true);
        }
      } catch (error) {
        logger.error('BOOTSTRAP', '❌ Error fatal al cargar estado', error as Error);
        // Incluso con error, debemos dejar pasar para no bloquear la app eternamente
        if (mounted) setIsReady(true);
      }
    };

    arrancar();

    return () => {
      mounted = false;
    };
  }, []);

  return isReady;
}
