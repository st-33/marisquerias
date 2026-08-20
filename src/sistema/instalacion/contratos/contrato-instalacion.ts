/**
 * 📝 CONTRATO DE ENTRADA PARA LA INSTALACIÓN
 * Define los datos necesarios para iniciar la vinculación del dispositivo.
 */
export interface ContratoInstalacion {
  /** Código de acceso al local / sucursal (ej: "PUEBLA-01") */
  accessCode: string;

  /** Alias opcional descriptivo para identificar físicamente el dispositivo (ej: "Tablet Caja Principal") */
  aliasDispositivo?: string;
}
