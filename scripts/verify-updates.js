#!/usr/bin/env node

/**
 * Dependency Update Verification Script
 * 
 * This script verifies that all updated dependencies are properly installed
 * and compatible with each other without requiring a full application build.
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying Updated Dependencies...\n');

// Read package.json
const packageJsonPath = path.join(__dirname, '../package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

// Key dependencies to verify
const criticalDependencies = {
  // Core framework
  'next': '15.5.3',
  'react': '19.1.1',
  'react-dom': '19.1.1',
  
  // Styling
  'tailwindcss': '4.1.13',
  'framer-motion': '12.23.13',
  
  // UI Components
  '@radix-ui/react-dialog': '1.1.15',
  '@radix-ui/react-tabs': '1.1.13',
  
  // Forms
  'react-hook-form': '7.62.0',
  'zod': '4.1.9',
  
  // Testing
  '@playwright/test': '1.55.0',
  
  // TypeScript
  'typescript': '5.9.2',
};

// Verification functions
function verifyPackageVersions() {
  console.log('📦 Checking package.json versions...');
  let allCorrect = true;
  
  for (const [pkg, expectedVersion] of Object.entries(criticalDependencies)) {
    const actualVersion = packageJson.dependencies?.[pkg] || packageJson.devDependencies?.[pkg];
    
    if (!actualVersion) {
      console.log(`❌ ${pkg}: Not found in package.json`);
      allCorrect = false;
    } else {
      const cleanExpected = expectedVersion.replace(/[\^~]/, '');
      const cleanActual = actualVersion.replace(/[\^~]/, '');
      
      if (cleanActual === cleanExpected) {
        console.log(`✅ ${pkg}: ${actualVersion}`);
      } else {
        console.log(`⚠️  ${pkg}: Expected ${expectedVersion}, found ${actualVersion}`);
        allCorrect = false;
      }
    }
  }
  
  return allCorrect;
}

function verifyNodeModules() {
  console.log('\n📁 Checking node_modules installation...');
  const nodeModulesPath = path.join(__dirname, '../node_modules');
  
  if (!fs.existsSync(nodeModulesPath)) {
    console.log('❌ node_modules directory not found');
    return false;
  }
  
  let installedCount = 0;
  let missingPackages = [];
  
  for (const pkg of Object.keys(criticalDependencies)) {
    const pkgPath = path.join(nodeModulesPath, pkg);
    if (fs.existsSync(pkgPath)) {
      installedCount++;
    } else {
      missingPackages.push(pkg);
    }
  }
  
  console.log(`✅ ${installedCount}/${Object.keys(criticalDependencies).length} critical packages found`);
  
  if (missingPackages.length > 0) {
    console.log(`❌ Missing packages: ${missingPackages.join(', ')}`);
    return false;
  }
  
  return true;
}

function verifyImports() {
  console.log('\n🔗 Testing critical imports...');
  
  const imports = [
    { name: 'React', module: 'react' },
    { name: 'Next.js', module: 'next/package.json' },
    { name: 'Tailwind Config', module: '../tailwind.config.ts' },
    { name: 'TypeScript Config', module: '../tsconfig.json' },
  ];
  
  let allImportsWork = true;
  
  for (const { name, module } of imports) {
    try {
      if (module.endsWith('.json') || module.endsWith('.ts')) {
        // Check file exists
        const filePath = path.resolve(__dirname, module);
        if (fs.existsSync(filePath)) {
          console.log(`✅ ${name}: Configuration file found`);
        } else {
          console.log(`❌ ${name}: Configuration file missing`);
          allImportsWork = false;
        }
      } else {
        // Try to require the module
        require.resolve(module);
        console.log(`✅ ${name}: Module can be imported`);
      }
    } catch (error) {
      console.log(`❌ ${name}: Import failed - ${error.message}`);
      allImportsWork = false;
    }
  }
  
  return allImportsWork;
}

function verifyCompatibility() {
  console.log('\n🔄 Checking React 19 + Next.js 15 compatibility...');
  
  try {
    // Check if React version is compatible with Next.js
    const reactVersion = packageJson.dependencies?.react || '';
    const nextVersion = packageJson.dependencies?.next || '';
    
    const reactMajor = parseInt(reactVersion.match(/\d+/)?.[0] || '0');
    const nextMajor = parseInt(nextVersion.match(/\d+/)?.[0] || '0');
    
    if (reactMajor === 19 && nextMajor === 15) {
      console.log('✅ React 19 + Next.js 15 compatibility confirmed');
      return true;
    } else {
      console.log(`⚠️  Version mismatch: React ${reactMajor}, Next.js ${nextMajor}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Compatibility check failed: ${error.message}`);
    return false;
  }
}

function generateReport() {
  console.log('\n📊 Generating Update Report...');
  
  const report = {
    timestamp: new Date().toISOString(),
    packageJsonVersions: verifyPackageVersions(),
    nodeModulesInstallation: verifyNodeModules(),
    importTests: verifyImports(),
    compatibilityCheck: verifyCompatibility(),
  };
  
  const allPassed = Object.values(report).every(result => 
    typeof result === 'boolean' ? result : true
  );
  
  console.log('\n' + '='.repeat(50));
  console.log('📋 VERIFICATION SUMMARY');
  console.log('='.repeat(50));
  
  console.log(`📦 Package Versions: ${report.packageJsonVersions ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`📁 Node Modules: ${report.nodeModulesInstallation ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`🔗 Import Tests: ${report.importTests ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`🔄 Compatibility: ${report.compatibilityCheck ? '✅ PASS' : '❌ FAIL'}`);
  
  console.log('\n' + '='.repeat(50));
  
  if (allPassed) {
    console.log('🎉 ALL CHECKS PASSED! Dependencies are updated and compatible.');
    console.log('\n📋 Next Steps:');
    console.log('   1. Run: npm run build (to test full build)');
    console.log('   2. Run: npm run test:all (to run all tests)');
    console.log('   3. Run: npm run dev (to start development server)');
  } else {
    console.log('⚠️  SOME CHECKS FAILED! Review the issues above.');
    console.log('\n🔧 Troubleshooting:');
    console.log('   1. Run: npm install --ignore-scripts');
    console.log('   2. Check WSL compatibility issues');
    console.log('   3. Consider using pnpm or yarn instead of npm');
  }
  
  return allPassed;
}

// Run all verifications
async function main() {
  try {
    const success = generateReport();
    process.exit(success ? 0 : 1);
  } catch (error) {
    console.error('❌ Verification script failed:', error);
    process.exit(1);
  }
}

main();

