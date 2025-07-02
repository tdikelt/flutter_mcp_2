#!/usr/bin/env node

import chalk from 'chalk';
import ora from 'ora';
import { checkSystemRequirements, getServicePath, installServiceDependencies } from '../lib/utils.js';

async function postInstall() {
  console.log(chalk.cyan('\n🚀 Flutter MCP Service Post-Install Setup\n'));
  
  const spinner = ora('Checking system requirements...').start();
  
  try {
    // Check system requirements
    const requirements = await checkSystemRequirements();
    spinner.succeed('System requirements checked');
    
    console.log(chalk.gray(`  Node.js: ${requirements.node.version}`));
    console.log(chalk.gray(`  npm: ${requirements.npm.version || 'not found'}`));
    
    // Try to find and setup the main service
    try {
      spinner.start('Locating Flutter MCP Service...');
      const servicePath = await getServicePath();
      spinner.succeed('Service located');
      
      // Install service dependencies if needed
      spinner.start('Checking service dependencies...');
      await installServiceDependencies(servicePath);
      spinner.succeed('Service ready');
      
    } catch (error) {
      spinner.warn('Service not found locally');
      console.log(chalk.yellow('\n⚠️  The main service will be downloaded on first run.'));
    }
    
    // Success message
    console.log(chalk.green('\n✅ Installation complete!\n'));
    
    console.log(chalk.cyan('Quick Start:'));
    console.log(chalk.gray('  1. Run: flutter-mcp init'));
    console.log(chalk.gray('  2. Run: flutter-mcp start'));
    console.log(chalk.gray('  3. Configure your MCP client\n'));
    
    console.log(chalk.cyan('For configuration help:'));
    console.log(chalk.gray('  flutter-mcp config\n'));
    
  } catch (error) {
    spinner.fail('Setup failed');
    console.error(chalk.red('\n❌ Error during setup:'), error.message);
    console.log(chalk.yellow('\nYou can still use the service, but may need manual setup.'));
    console.log(chalk.gray('Run "flutter-mcp init" to complete setup.\n'));
  }
}

// Only run if called directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  postInstall().catch(console.error);
}