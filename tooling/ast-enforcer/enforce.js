const fs = require('fs');
const path = require('path');
const rules = require('./rules.js');

function scanDirectory(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const stat = fs.statSync(path.join(dir, file));
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.next' && file !== 'dist') {
        scanDirectory(path.join(dir, file), fileList);
      }
    } else if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js')) {
      fileList.push(path.join(dir, file));
    }
  }
  return fileList;
}

function runEnforcement() {
  console.log("🚀 Running AST Boundary Enforcement...");
  
  const allFiles = scanDirectory('./packages').concat(scanDirectory('./apps'));
  let violations = 0;

  for (const filePath of allFiles) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const importRegex = /import\s+.*\s+from\s+['"](.*)['"]/g;
    
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      const importedModule = match[1];
      
      for (const rule of rules.forbiddenImports) {
        if (rule.pattern.test(importedModule)) {
          // Check if current file is in an allowed directory
          const isAllowed = rule.allowedIn.some(allowedPath => {
            const normalizedFilePath = filePath.replace(/\\/g, '/');
            return normalizedFilePath.includes(allowedPath.replace(/^\//, ''));
          });

          if (!isAllowed) {
            console.error(`\n❌ [AST VIOLATION] ${rule.message}`);
            console.error(`   File: ${filePath}`);
            console.error(`   Imported Module: ${importedModule}`);
            violations++;
          }
        }
      }
    }
  }

  if (violations > 0) {
    console.error(`\n🚨 Enforcement Failed with ${violations} violations.`);
    process.exit(1); // Fail CI
  } else {
    console.log("\n✅ AST Enforcement Passed. No boundary violations detected.");
  }
}

runEnforcement();
