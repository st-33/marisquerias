import type { FormState } from '../../logica/formularioProducto';
import type { ArticuloOrigenMenu, PlatilloOrigenMenu } from '../../../../../../capacidades/menu/useGestionMenu';
import type { EtiquetasMenu } from '../../logica/etiquetas';

export type PestanaProducto = 'basico' | 'variantes' | 'inventario';

export type ModalProductoProps = {
  modo: 'addProd' | 'editProd';
  formData: FormState;
  onFormDataChange: (form: FormState) => void;
  pestana: PestanaProducto;
  onPestanaChange: (pestana: PestanaProducto) => void;
  articulosInventario: ArticuloOrigenMenu[];
  platillosCocina: PlatilloOrigenMenu[];
  areas?: any[];
  etiquetas: EtiquetasMenu;
  isSaving: boolean;
  onIrAInventario: () => void;
  onIrALibroPlatillos: () => void;
  onGuardar: () => void;
  onCancelar: () => void;
};
