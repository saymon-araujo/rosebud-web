#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const sourceDir = process.cwd(); // Current directory is source
const targetDirName = 'rosebud-ui-only';
const targetDir = path.join(path.dirname(sourceDir), targetDirName);

// UI-relevant directories to copy
const directoriesToCopy = [
  'app',
  'components',
  'context',
  'hooks',
  'lib',
  'public',
  'styles'
];

// Configuration files to copy
const filesToCopy = [
  'package.json',
  'tsconfig.json',
  'components.json',
  'next.config.mjs',
  'postcss.config.mjs',
  'next-env.d.ts',
  'tailwind.config.ts'
];

// Directories to exclude (will be ignored during copying)
const excludeDirs = [
  '.git',
  '.next',
  'node_modules',
  'supabase'
];

// Clean and create target directory
function setupTargetDirectory() {
  console.log(`Setting up target directory: ${targetDir}`);
  
  if (fs.existsSync(targetDir)) {
    console.log('Target directory exists. Removing...');
    execSync(`rm -rf "${targetDir}"`);
  }
  
  console.log('Creating fresh target directory...');
  fs.mkdirSync(targetDir, { recursive: true });
}

// Copy directory with exclusions
function copyDirectoryWithExclusions(source, target) {
  if (!fs.existsSync(target)) {
    fs.mkdirSync(target, { recursive: true });
  }

  const entries = fs.readdirSync(source, { withFileTypes: true });

  for (const entry of entries) {
    const sourcePath = path.join(source, entry.name);
    const targetPath = path.join(target, entry.name);
    
    // Skip excluded directories
    if (entry.isDirectory() && excludeDirs.includes(entry.name)) {
      continue;
    }
    
    if (entry.isDirectory()) {
      copyDirectoryWithExclusions(sourcePath, targetPath);
    } else {
      fs.copyFileSync(sourcePath, targetPath);
    }
  }
}

// Copy individual files
function copyFiles() {
  console.log('Copying individual files...');
  
  for (const file of filesToCopy) {
    const sourcePath = path.join(sourceDir, file);
    const targetPath = path.join(targetDir, file);
    
    if (fs.existsSync(sourcePath)) {
      fs.copyFileSync(sourcePath, targetPath);
      console.log(`Copied: ${file}`);
    } else {
      console.log(`Warning: ${file} not found in source directory.`);
    }
  }
}

// Create README
function createReadme() {
  console.log('Creating README...');
  
  const readmeContent = `# Rosebud UI

This repository contains only the UI-related files for the Rosebud application. It has been optimized for v0 submission by removing build artifacts, git history, and other non-UI elements.

## Structure
- \`app/\` - Pages and routes
- \`components/\` - UI components
- \`context/\` - React context providers for UI state management
- \`hooks/\` - Custom React hooks for UI functionality
- \`lib/\` - Utility functions and helpers
- \`public/\` - Static assets and resources
- \`styles/\` - CSS and styling files

## Key UI Features
The main UI features can be found in:
- \`app/dashboard/\` - Dashboard pages and UI flows
- \`app/journal/\` - Journal UI components
- \`app/reminders/\` - Reminders UI components
- \`components/\` - Shared UI components
- \`context/\` - UI state management

## UI Context
The application uses React Context API for UI state management and Tailwind CSS for styling.
`;

  fs.writeFileSync(path.join(targetDir, 'README.md'), readmeContent);
}

// Validate UI dependencies in package.json
function validateUIDependencies() {
  console.log('Validating UI dependencies...');
  
  const packageJsonPath = path.join(sourceDir, 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    console.log('Warning: package.json not found.');
    return;
  }
  
  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    // Essential UI dependencies to check for
    const essentialUIDeps = [
      'react', 
      'react-dom', 
      'next', 
      '@radix-ui',
      'tailwindcss',
      'class-variance-authority',
      'clsx',
      'tailwind-merge'
    ];
    
    const dependencies = { 
      ...packageJson.dependencies || {}, 
      ...packageJson.devDependencies || {}
    };
    
    const missingDeps = essentialUIDeps.filter(dep => 
      !Object.keys(dependencies).some(key => key === dep || key.startsWith(`${dep}/`))
    );
    
    if (missingDeps.length > 0) {
      console.log(`Warning: Some essential UI dependencies may be missing: ${missingDeps.join(', ')}`);
    } else {
      console.log('All essential UI dependencies found.');
    }
  } catch (error) {
    console.error('Error validating package.json:', error.message);
  }
}

// Create minimal .env file for UI
function createEnvFile() {
  console.log('Creating minimal .env file...');
  
  const envContent = `# UI Environment Variables
NEXT_PUBLIC_APP_NAME="Rosebud"
NEXT_PUBLIC_APP_VERSION="1.0.0"
NEXT_PUBLIC_API_MOCKING=true
`;

  fs.writeFileSync(path.join(targetDir, '.env.local'), envContent);
  console.log('Created .env.local with minimal UI environment variables');
}

// Update package.json to remove backend dependencies
function updatePackageJson() {
  console.log('Updating package.json...');
  
  const packageJsonPath = path.join(targetDir, 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    console.log('Warning: package.json not found in target directory.');
    return;
  }
  
  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    // Remove backend dependencies
    if (packageJson.dependencies) {
      delete packageJson.dependencies['@supabase/supabase-js'];
      // Add more backend dependencies to remove if needed
    }
    
    // Update scripts
    if (packageJson.scripts) {
      packageJson.scripts = {
        "dev": "next dev",
        "build": "next build",
        "start": "next start",
        "lint": "next lint"
      };
    }
    
    // Update project name
    packageJson.name = "rosebud-ui-only";
    
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
    console.log('Updated package.json to remove backend dependencies');
  } catch (error) {
    console.error('Error updating package.json:', error.message);
  }
}

// Main execution
function main() {
  console.log('Starting UI-only version creation...');
  
  // Validate UI dependencies
  validateUIDependencies();
  
  // Setup target directory
  setupTargetDirectory();
  
  // Copy directories
  console.log('Copying directories...');
  for (const dir of directoriesToCopy) {
    const sourceSubDir = path.join(sourceDir, dir);
    const targetSubDir = path.join(targetDir, dir);
    
    if (fs.existsSync(sourceSubDir)) {
      console.log(`Copying directory: ${dir}`);
      copyDirectoryWithExclusions(sourceSubDir, targetSubDir);
    } else {
      console.log(`Warning: Directory ${dir} not found in source.`);
    }
  }
  
  // Copy files
  copyFiles();
  
  // Create README
  createReadme();
  
  // Create env file
  createEnvFile();
  
  // Update package.json
  updatePackageJson();
  
  // Print summary
  const fileCount = parseInt(execSync(`find "${targetDir}" -type f | wc -l`).toString().trim());
  const dirSize = execSync(`du -sh "${targetDir}"`).toString().trim();
  
  console.log('\nSummary:');
  console.log(`Files: ${fileCount}`);
  console.log(`Size: ${dirSize}`);
  console.log(`Location: ${targetDir}`);
  console.log('\nUI-only version created successfully!');
}

main(); 