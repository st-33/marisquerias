/**
 * Mock manual de @sentry/react-native para entorno Jest.
 * @sentry/react-native usa ESM puro — no es transpilable por ts-jest sin configuración nativa.
 * Este stub silencia el módulo en tests sin romper imports.
 */
const noop = () => {};
const noopPromise = () => Promise.resolve();

module.exports = {
  init: noop,
  captureException: noop,
  captureMessage: noop,
  captureEvent: noop,
  addBreadcrumb: noop,
  setUser: noop,
  setTag: noop,
  setExtra: noop,
  setContext: noop,
  configureScope: noop,
  withScope: (cb) => cb({ setTag: noop, setExtra: noop, setContext: noop }),
  reactNativeTracingIntegration: () => ({}),
  wrap: (component) => component,
};
