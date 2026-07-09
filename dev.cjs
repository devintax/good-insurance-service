const { spawn } = require('child_process');
const path = require('path');

console.log('Starting Good Insurance Agency Lead Generation...\n');

const server = spawn('node', ['server.js'], {
  cwd: __dirname,
  stdio: 'inherit',
  shell: true,
  env: { ...process.env }
});

server.on('error', (err) => {
  console.error('Server error:', err);
});

process.on('SIGINT', () => {
  console.log('\nStopping server...');
  server.kill();
  process.exit();
});