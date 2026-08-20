import { Database } from 'firebase/database';
import { useState } from 'react';
import { MenuRepository } from '../../sistema/persistencia';

// Mappings for cleaning IDs (Same as script)
const ID_MAPPING: Record<string, string> = {
  'aguacate-7': 'ing_aguacate',
  'camaron-1': 'ing_camaron',
  'cebolla-5': 'ing_cebolla',
  'cerveza-8': 'ing_cerveza_corona',
  'cilantro-11': 'ing_cilantro',
  'crema-13': 'ing_crema',
  'durazno-15': 'ing_durazno',
  'helado-14': 'ing_helado',
  'limon-6': 'ing_limon',
  'ostion-10': 'ing_ostion',
  'pescado-3': 'ing_pescado',
  'pulpo-2': 'ing_pulpo',
  'queso-12': 'ing_queso',
  'refresco-9': 'ing_coca_cola',
  'tomate-4': 'ing_tomate',
};

export function useAdminTools({ db, tenantPath }: { db: Database; tenantPath: string }) {
  const [repairing, setRepairing] = useState(false);
  const [repairLog, setRepairLog] = useState<string[]>([]);

  const log = (msg: string) => {
    console.log(`[AdminTools] ${msg}`);
    setRepairLog((prev) => [...prev, msg]);
  };

  const repairDatabase = async () => {
    if (repairing) return;
    setRepairing(true);
    setRepairLog([]);
    log('🚀 Iniciando reparación de base de datos de productos y recetas...');

    try {
      const menuRepo = new MenuRepository(db, tenantPath);

      // Fix Recipes in Products
      log('🍳 Analizando recetas de productos...');
      const productos = await menuRepo.obtenerProductos();

      for (const [pid, prod] of Object.entries(productos)) {
        let changed = false;
        const newReceta = { ...(prod.receta || {}) };

        // A. Update existing recipes
        if (newReceta.ingredientes) {
          const newIngs: Record<string, number> = {};
          for (const [ingId, qty] of Object.entries(newReceta.ingredientes)) {
            const targetId = ID_MAPPING[ingId] || ingId;
            newIngs[targetId] = qty;
            if (targetId !== ingId) changed = true;
          }
          newReceta.ingredientes = newIngs;
        }

        if (changed) {
          log(`  💾 Guardando cambios en ${prod.nombre}`);
          await menuRepo.actualizarProducto(pid, { receta: newReceta });
        }
      }

      log('✅ Reparación de recetas completada con éxito.');
    } catch (err: any) {
      log(`❌ Error crítico: ${err.message}`);
      console.error(err);
    } finally {
      setRepairing(false);
    }
  };

  return { repairDatabase, repairing, repairLog };
}
