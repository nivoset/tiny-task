#!/usr/bin/env node

/**
 * Release script for TinyTask
 * Usage: node scripts/release.js [patch|minor|major]
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const packagePath = join(__dirname, '..', 'package.json');

function getCurrentVersion() {
  const packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));
  return packageJson.version;
}

function updateVersion(type) {
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
  return newVersion;
}

function runCommand(command) {
  try {
    execSync(command, { stdio: 'inherit', cwd: join(__dirname, '..') });
  } catch (error) {
    console.error(`Command failed: ${command}`);
    process.exit(1);
  }
}

function main() {
  const type = process.argv[2] || 'patch';
  
  if (!['patch', 'minor', 'major'].includes(type)) {
    console.error('Usage: node scripts/release.js [patch|minor|major]');
    process.exit(1);
  }
  
  console.log(`🚀 Starting release process for ${type} version...`);
  
  const currentVersion = getCurrentVersion();
  console.log(`Current version: ${currentVersion}`);
  
  // Update version
  const newVersion = updateVersion(type);
  console.log(`New version: ${newVersion}`);
  
  // Run tests and build
  console.log('\n🧪 Running tests...');
  runCommand('npm test');
  
  console.log('\n📦 Building project...');
  runCommand('npm run build');
  
  // Create git tag
  console.log('\n🏷️  Creating git tag...');
  runCommand(`git add package.json`);
  runCommand(`git commit -m "chore: bump version to ${newVersion}"`);
  runCommand(`git tag v${newVersion}`);
  
  console.log('\n✅ Release preparation completed!');
  console.log('\nTo publish to NPM:');
  console.log(`  npm publish`);
  console.log('\nTo push to GitHub:');
  console.log(`  git push origin main --tags`);
}

main(); 