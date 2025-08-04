#!/usr/bin/env node

/**
 * Release script for @tiny ecosystem
 * Usage: node scripts/release.js [patch|minor|major] [package-name]
 * 
 * Examples:
 *   node scripts/release.js patch                    # Bump all packages
 *   node scripts/release.js minor @tiny/task         # Bump specific package
 *   node scripts/release.js major @tiny/core         # Bump specific package
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Get all package.json files in the workspace
function getPackagePaths() {
  const packagesDir = join(rootDir, 'packages');
  const packages = readdirSync(packagesDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => join(packagesDir, dirent.name, 'package.json'))
    .filter(path => {
      try {
        readFileSync(path, 'utf8');
        return true;
      } catch {
        return false;
      }
    });
  
  return packages;
}

function getCurrentVersion(packagePath) {
  const packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));
  return packageJson.version;
}

function updateVersion(packagePath, type) {
  const packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));
  const [major, minor, patch] = packageJson.version.split('.').map(Number);
  
  let newVersion;
  switch (type) {
    case 'major':
      newVersion = `${major + 1}.0.0`;
      break;
    case 'minor':
      newVersion = `${major}.${minor + 1}.0`;
      break;
    case 'patch':
    default:
      newVersion = `${major}.${minor}.${patch + 1}`;
      break;
  }
  
  packageJson.version = newVersion;
  writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + '\n');
  return { name: packageJson.name, version: newVersion };
}

function runCommand(command, cwd = rootDir) {
  try {
    execSync(command, { stdio: 'inherit', cwd });
  } catch (error) {
    console.error(`Command failed: ${command}`);
    process.exit(1);
  }
}

function findPackageByName(packageName) {
  const packagePaths = getPackagePaths();
  return packagePaths.find(path => {
    const packageJson = JSON.parse(readFileSync(path, 'utf8'));
    return packageJson.name === packageName;
  });
}

function main() {
  const type = process.argv[2] || 'patch';
  const packageName = process.argv[3];
  
  if (!['patch', 'minor', 'major'].includes(type)) {
    console.error('Usage: node scripts/release.js [patch|minor|major] [package-name]');
    console.error('\nExamples:');
    console.error('  node scripts/release.js patch                    # Bump all packages');
    console.error('  node scripts/release.js minor @tiny/task         # Bump specific package');
    console.error('  node scripts/release.js major @tiny/core         # Bump specific package');
    process.exit(1);
  }
  
  console.log(`🚀 Starting release process for ${type} version...`);
  
  let packagesToUpdate;
  
  if (packageName) {
    // Update specific package
    const packagePath = findPackageByName(packageName);
    if (!packagePath) {
      console.error(`Package ${packageName} not found`);
      process.exit(1);
    }
    packagesToUpdate = [packagePath];
    console.log(`Targeting package: ${packageName}`);
  } else {
    // Update all packages
    packagesToUpdate = getPackagePaths();
    console.log(`Targeting all packages: ${packagesToUpdate.length} packages`);
  }
  
  // Show current versions
  console.log('\n📋 Current versions:');
  packagesToUpdate.forEach(path => {
    const currentVersion = getCurrentVersion(path);
    const packageJson = JSON.parse(readFileSync(path, 'utf8'));
    console.log(`  ${packageJson.name}: ${currentVersion}`);
  });
  
  // Update versions
  console.log('\n🔄 Updating versions...');
  const updatedPackages = packagesToUpdate.map(path => updateVersion(path, type));
  
  updatedPackages.forEach(({ name, version }) => {
    console.log(`  ${name}: ${version}`);
  });
  
  // Run tests and build
  console.log('\n🧪 Running tests...');
  runCommand('npm test');
  
  console.log('\n📦 Building project...');
  runCommand('npm run build');
  
  // Create git tag
  console.log('\n🏷️  Creating git tag...');
  runCommand('git add .');
  
  const packageNames = updatedPackages.map(p => p.name).join(', ');
  const versions = updatedPackages.map(p => p.version).join(', ');
  runCommand(`git commit -m "chore: bump versions to ${versions} (${packageNames})"`);
  
  // Create tags for each package
  updatedPackages.forEach(({ name, version }) => {
    const tagName = `${name}@${version}`;
    runCommand(`git tag ${tagName}`);
    console.log(`  Created tag: ${tagName}`);
  });
  
  console.log('\n✅ Release preparation completed!');
  console.log('\nTo publish packages to NPM:');
  if (packageName) {
    console.log(`  cd packages/${packageName.split('/').pop()}`);
    console.log(`  npm publish --access=public`);
  } else {
    console.log('  # Publish all packages:');
    packagesToUpdate.forEach(path => {
      const packageJson = JSON.parse(readFileSync(path, 'utf8'));
      const packageDir = packageJson.name.split('/').pop();
      console.log(`  cd packages/${packageDir} && npm publish --access=public && cd ../..`);
    });
  }
  console.log('\nTo push to GitHub:');
  console.log(`  git push origin main --tags`);
}

main(); 