const fs = require('fs');
const path = require('path');

const localEnvPath = path.join(__dirname, '.env.development.local');

const useLocal = process.argv[2] === 'local';

const envContent = `VITE_USE_LOCAL_SERVER=${useLocal}`;

fs.writeFileSync(localEnvPath, envContent);

console.log(`Switched to ${useLocal ? 'local' : 'Glitch'} server`);