import { ref, get } from 'firebase/database';
import type { Database } from 'firebase/database';

export type HealthStatus = 'ok' | 'timeout' | 'error' | 'open';

export type CircuitState = {
  failures: number;
  openUntil: number; // epoch ms
};

const breakers = new Map<string, CircuitState>();

function now() {
  return Date.now();
}

export function getBreaker(key: string): CircuitState {
  const s = breakers.get(key) || { failures: 0, openUntil: 0 };
  breakers.set(key, s);
  return s;
}

export function resetBreaker(key: string) {
  breakers.set(key, { failures: 0, openUntil: 0 });
}

export function recordFailure(key: string, baseCooldownMs = 2000) {
  const s = getBreaker(key);
  s.failures += 1;
  const cooldown = Math.min(30000, baseCooldownMs * Math.pow(2, s.failures - 1));
  s.openUntil = now() + cooldown;
}

export async function checkRtdb(db: Database, timeoutMs = 1500): Promise<HealthStatus> {
  const key = 'rtdb';
  const s = getBreaker(key);
  if (s.openUntil > now()) return 'open';

  const timeout = new Promise<never>((_, rej) =>
    setTimeout(() => rej(new Error('timeout')), timeoutMs)
  );
  try {
    await Promise.race([get(ref(db, '.info/connected')), timeout]);
    resetBreaker(key);
    return 'ok';
  } catch (e: any) {
    if (e && e.message === 'timeout') {
      recordFailure(key);
      return 'timeout';
    }
    recordFailure(key);
    return 'error';
  }
}
