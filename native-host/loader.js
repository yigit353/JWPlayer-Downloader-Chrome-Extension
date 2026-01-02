#!/Users/yigit/.nvm/versions/node/v24.1.0/bin/node

// Simple wrapper that just runs host.js
// Using require to avoid any ESM/dynamic import issues

const { execSync, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const logFile = '/tmp/jwplayer-native-host.log';
fs.appendFileSync(logFile, `=== Loader started at ${new Date().toISOString()} ===\n`);
fs.appendFileSync(logFile, `CWD: ${process.cwd()}\n`);
fs.appendFileSync(logFile, `__dirname: ${__dirname}\n`);

// Change to script directory
process.chdir(__dirname);
fs.appendFileSync(logFile, `Changed to: ${process.cwd()}\n`);

// Spawn node with proper ESM support
const child = spawn(process.execPath, ['host.js'], {
  cwd: __dirname,
  stdio: 'inherit'
});

child.on('error', (err) => {
  fs.appendFileSync(logFile, `Spawn error: ${err.message}\n`);
  process.exit(1);
});

child.on('exit', (code) => {
  fs.appendFileSync(logFile, `Child exited with code: ${code}\n`);
  process.exit(code || 0);
});
