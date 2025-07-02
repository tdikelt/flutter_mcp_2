import { exec } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';
import fs from 'fs';
import which from 'which';
import chalk from 'chalk';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export async function checkDependencies() {
  const errors = [];
  
  // Check Node.js version
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.split('.')[0].substring(1));
  
  if (majorVersion < 18) {
    errors.push(`Node.js 18+ required (found ${nodeVersion})`);
  }
  
  // Check if main service is accessible
  try {
    const servicePath = await getServicePath();
    const packagePath = join(servicePath, 'package.json');
    
    if (!fs.existsSync(packagePath)) {
      errors.push('Flutter MCP Service not found. Please install the service first.');
    }
  } catch (error) {
    errors.push(`Service location error: ${error.message}`);
  }
  
  if (errors.length > 0) {
    throw new Error('Dependency check failed:\n' + errors.join('\n'));
  }
  
  return true;
}

export async function getServicePath() {
  // Try different paths to find the service
  const possiblePaths = [
    // Development path (when running from npm-wrapper)
    resolve(__dirname, '../../'),
    // Installed via npm global
    resolve(__dirname, '../../../flutter-mcp-service'),
    // Local development
    resolve(process.cwd(), '../'),
    // Current directory
    process.cwd()
  ];
  
  for (const path of possiblePaths) {
    const indexPath = join(path, 'src', 'index.js');
    if (fs.existsSync(indexPath)) {
      return path;
    }
  }
  
  throw new Error('Could not locate Flutter MCP Service. Please ensure it is installed.');
}

export async function installServiceDependencies(servicePath) {
  console.log(chalk.cyan('Installing service dependencies...'));
  
  try {
    await execAsync('npm install', {
      cwd: servicePath,
      stdio: 'inherit'
    });
    
    console.log(chalk.green('✓ Dependencies installed successfully'));
  } catch (error) {
    throw new Error(`Failed to install dependencies: ${error.message}`);
  }
}

export async function checkSystemRequirements() {
  const requirements = {
    node: { installed: false, version: null },
    npm: { installed: false, version: null },
    git: { installed: false, version: null }
  };
  
  // Check Node.js
  requirements.node.version = process.version;
  requirements.node.installed = true;
  
  // Check npm
  try {
    const { stdout } = await execAsync('npm --version');
    requirements.npm.version = stdout.trim();
    requirements.npm.installed = true;
  } catch (error) {
    // npm not found
  }
  
  // Check git
  try {
    const { stdout } = await execAsync('git --version');
    requirements.git.version = stdout.trim();
    requirements.git.installed = true;
  } catch (error) {
    // git not found
  }
  
  return requirements;
}

export function generateMCPConfig(mode = 'npx') {
  if (mode === 'npx') {
    return {
      mcpServers: {
        'flutter-mcp': {
          command: 'npx',
          args: ['@flutter-mcp/service', 'start']
        }
      }
    };
  } else if (mode === 'local') {
    const servicePath = process.cwd();
    return {
      mcpServers: {
        'flutter-mcp': {
          command: 'node',
          args: [join(servicePath, 'src', 'index.js')]
        }
      }
    };
  }
}

export function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export async function detectPackageManager() {
  // Check for lock files
  const cwd = process.cwd();
  
  if (fs.existsSync(join(cwd, 'yarn.lock'))) {
    return 'yarn';
  } else if (fs.existsSync(join(cwd, 'pnpm-lock.yaml'))) {
    return 'pnpm';
  } else if (fs.existsSync(join(cwd, 'package-lock.json'))) {
    return 'npm';
  }
  
  // Check what's available in PATH
  try {
    await which('yarn');
    return 'yarn';
  } catch {
    try {
      await which('pnpm');
      return 'pnpm';
    } catch {
      return 'npm';
    }
  }
}