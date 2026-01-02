#!/Users/yigit/.nvm/versions/node/v24.1.0/bin/node

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const logFile = '/tmp/jwplayer-native-host.log';
fs.appendFileSync(logFile, `\n=== Loader started at ${new Date().toISOString()} ===\n`);

const scriptDir = __dirname;
process.chdir(scriptDir);
fs.appendFileSync(logFile, `Working dir: ${scriptDir}\n`);
fs.appendFileSync(logFile, `stdin isTTY: ${process.stdin.isTTY}, isRaw: ${process.stdin.isRaw}\n`);

const child = spawn(process.execPath, ['host.js'], {
  cwd: scriptDir,
  stdio: ['pipe', 'pipe', 'pipe']
});

process.stdin.pipe(child.stdin);
child.stdout.pipe(process.stdout);

child.stderr.on('data', (data) => {
  fs.appendFileSync(logFile, `STDERR: ${data.toString()}\n`);
});

child.on('error', (err) => {
  fs.appendFileSync(logFile, `Spawn error: ${err.message}\n`);
  process.exit(1);
});

child.on('exit', (code, signal) => {
  fs.appendFileSync(logFile, `Child exited with code: ${code}, signal: ${signal}\n`);
  process.exit(code || 0);
});

process.stdin.on('end', () => {
  fs.appendFileSync(logFile, `Loader stdin ended\n`);
});

process.stdin.on('error', (err) => {
  fs.appendFileSync(logFile, `Loader stdin error: ${err.message}\n`);
});
