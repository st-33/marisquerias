/**
 * SQLite Storage Adapter - Platform Resolution
 *
 * Metro bundler will automatically select:
 * - index.native.ts for iOS/Android (uses expo-sqlite)
 * - index.web.ts for web (no-op fallback)
 *
 * This file (index.ts) is used for TypeScript type resolution.
 */

export * from './index.web';
