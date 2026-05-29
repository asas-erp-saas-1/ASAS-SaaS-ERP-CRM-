// Custom Build Validation Hook
// Ensures that environments are strictly separated and no secrets are hardcoded.

const fs = require('fs');
const path = require('path');

function validateEnvironment() {
  console.log('[BUILD VALIDATION] Checking environment integrity...');
  
  // 1. Check for hardcoded secrets
  const srcPath = path.join(__dirname, '../src');
  
  function scanDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        scanDir(fullPath);
      } else if (stat.isFile() && (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx'))) {
        const content = fs.readFileSync(fullPath, 'utf-8');
        
        // Match simple patterns of hardcoded PKs/SKs
        if (/sk_[a-zA-Z0-9]{24,}/.test(content) || /pk_[a-zA-Z0-9]{24,}/.test(content)) {
          console.error(`[FATAL] Hardcoded API key detected in ${fullPath}`);
          process.exit(1);
        }
        
        // Ensure supabase anon is only accessed through strict files, or blocked
        if (content.includes('process.env.SUPABASE_SERVICE_ROLE_KEY') && !fullPath.includes('kernel') && !fullPath.includes('realtime')) {
          console.error(`[FATAL] Service Role Key accessed outside of Kernel/Realtime in ${fullPath}`);
          process.exit(1);
        }
      }
    }
  }

  scanDir(srcPath);

  // 2. Ensure package.json has test commands available or mock ones
  const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf-8'));
  if (!pkg.scripts['build']) {
    console.error(`[FATAL] Missing build script.`);
    process.exit(1);
  }

  console.log('[BUILD VALIDATION] PASSED.');
}

validateEnvironment();
