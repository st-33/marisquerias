/**
 * 🧠 HOOK: useModernAlert
 * SOLO LÓGICA - Sin UI
 * Gestiona estado de alertas modernas
 */

import { useState } from 'react';

export type AlertType = 'success' | 'warning' | 'error' | 'info' | 'confirm';

export type AlertConfig = {
  type: AlertType;
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
};

export function useModernAlert() {
  const [visible, setVisible] = useState(false);
  const [config, setConfig] = useState<AlertConfig | null>(null);

  const show = (alertConfig: AlertConfig) => {
    setConfig(alertConfig);
    setVisible(true);
  };

  const hide = () => {
    setVisible(false);
    setTimeout(() => setConfig(null), 300); // Esperar animación
  };

  const handleConfirm = () => {
    config?.onConfirm?.();
    hide();
  };

  const handleCancel = () => {
    config?.onCancel?.();
    hide();
  };

  // Helpers para tipos específicos
  const success = (title: string, message?: string, onConfirm?: () => void) => {
    show({ type: 'success', title, message, onConfirm });
  };

  const error = (title: string, message?: string, onConfirm?: () => void) => {
    show({ type: 'error', title, message, onConfirm });
  };

  const warning = (title: string, message?: string, onConfirm?: () => void) => {
    show({ type: 'warning', title, message, onConfirm });
  };

  const info = (title: string, message?: string, onConfirm?: () => void) => {
    show({ type: 'info', title, message, onConfirm });
  };

  const confirm = (
    title: string,
    message?: string,
    onConfirm?: () => void,
    onCancel?: () => void
  ) => {
    show({ type: 'confirm', title, message, onConfirm, onCancel });
  };

  return {
    visible,
    config,
    show,
    hide,
    handleConfirm,
    handleCancel,
    // Helpers
    success,
    error,
    warning,
    info,
    confirm,
  };
}
