const { spawn } = require('child_process');

// Capturar argumentos pasados por el supervisor de AI Studio / npm
const rawArgs = process.argv.slice(2);
let port = '3000';

for (let i = 0; i < rawArgs.length; i++) {
  if (rawArgs[i] === '--port' && rawArgs[i + 1]) {
    port = rawArgs[i + 1];
    i++;
  } else if (rawArgs[i].startsWith('--port=')) {
    port = rawArgs[i].split('=')[1];
  }
}

// Expo CLI solo acepta para --host: "lan" | "tunnel" | "localhost".
// Por defecto usa "lan" (bind en todas las interfaces / 0.0.0.0).
// Omitimos '--host 0.0.0.0' para evitar el AssertionError del CLI de Expo.
const expoCli = require.resolve('expo/bin/cli');
const child = spawn(process.execPath, [expoCli, 'start', '.', '--web', '--port', port], {
  stdio: 'inherit',
  env: process.env,
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
  } else {
    process.exit(code ?? 0);
  }
});

process.on('SIGINT', () => child.kill('SIGINT'));
process.on('SIGTERM', () => child.kill('SIGTERM'));
