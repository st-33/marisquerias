export type InventoryErrorCode = 'INSUFFICIENT_STOCK' | 'INVENTORY_DEDUCTION_FAILED';

export type InventoryDeductionResult =
  | { success: true; skipped?: boolean }
  | {
      success: false;
      error: string;
      code: InventoryErrorCode;
      itemId?: string;
    };

export function classifyInventoryError(error: unknown): {
  code: InventoryErrorCode;
  message: string;
} {
  const message = error instanceof Error ? error.message : String(error);
  const code = message.includes('Stock insuficiente para itemId=')
    ? 'INSUFFICIENT_STOCK'
    : 'INVENTORY_DEDUCTION_FAILED';
  return { code, message };
}
