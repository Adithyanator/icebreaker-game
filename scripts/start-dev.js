const { execSync, spawn } = require('child_process');

try {
  if (process.platform === 'win32') {
    execSync(
      'powershell -Command "Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }"',
      { stdio: 'ignore' }
    );
  }
} catch (e) {}

const child = spawn('npx', ['next', 'dev', '-p', '3000'], {
  stdio: 'inherit',
  shell: true,
});

child.on('exit', (code) => process.exit(code || 0));
