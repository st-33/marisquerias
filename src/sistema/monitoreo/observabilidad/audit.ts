import { ref, push } from 'firebase/database';
import type { Database } from 'firebase/database';

export type AuditEntry = {
  actor: { id?: string; role?: string };
  scope: string; // e.g., 'billing','orders','printing'
  action: string; // e.g., 'bill_requested','bill_print_sent','paid'
  meta?: Record<string, any>;
  ts: number;
};

export function writeAudit(db: Database, tenantPath: string, entry: AuditEntry) {
  return push(ref(db, `${tenantPath}/audits`), entry);
}

export type Notification = {
  canal: 'cocina' | 'admin' | 'global';
  tipo: string; // e.g., 'cuenta','reimpresion'
  payload?: Record<string, any>;
  readAt?: number | null;
  ts: number;
};

export function sendNotification(db: Database, tenantPath: string, notif: Notification) {
  return push(ref(db, `${tenantPath}/notificaciones`), notif);
}
