import { useCallback, useEffect, useState } from 'react';
import type { Database } from 'firebase/database';
import {
  RegistroVentasRepository,
  type RegistroVenta,
} from '../../sistema/persistencia/registroVentas.repo';

export function useRegistroVentasDelDia({
  db,
  tenantPath,
  timestamp,
}: {
  db: Database;
  tenantPath: string;
  timestamp: number;
}) {
  const [registros, setRegistros] = useState<RegistroVenta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recarga, setRecarga] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const cargar = async () => {
      if (!tenantPath) {
        if (!cancelled) {
          setRegistros([]);
          setLoading(false);
        }
        return;
      }

      setError(null);

      try {
        const datos = await new RegistroVentasRepository(db, tenantPath).obtenerDia(timestamp);
        if (!cancelled) {
          setRegistros(
            Object.values(datos).sort((a, b) => a.numero - b.numero || a.timestamp - b.timestamp)
          );
        }
      } catch (cause) {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : String(cause));
          setRegistros([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void cargar();
    return () => {
      cancelled = true;
    };
  }, [db, tenantPath, timestamp, recarga]);

  const recargar = useCallback(() => {
    setLoading(true);
    setRecarga((actual) => actual + 1);
  }, []);

  return { registros, loading, error, recargar };
}
