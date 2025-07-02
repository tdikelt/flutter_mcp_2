#!/usr/bin/env node

import { program } from 'commander';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs';
import { checkDependencies, getServicePath } from '../lib/utils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

program
  .name('flutter-mcp')
  .description('Flutter MCP Service - Advanced Flutter development tools')
  .version('2.0.0');

program
  .command('start')
  .description('Start the Flutter MCP service')
  .option('-p, --port <port>', 'Port to run the service on', '3000')
  .option('-m, --mode <mode>', 'Mode to run in (stdio, http)', 'stdio')
  .action(async (options) => {
    const spinner = ora('Starting Flutter MCP Service...').start();
    
    try {
      // Check dependencies
      await checkDependencies();
      
      // Get service path
      const servicePath = await getServicePath();
      const indexPath = join(servicePath, 'src', 'index.js');
      
      spinner.succeed('Dependencies verified');
      
      console.log(chalk.cyan('\n🚀 Starting Flutter MCP Service v2.0.0'));
      console.log(chalk.gray(`Mode: ${options.mode}`));
      
      if (options.mode === 'stdio') {
        console.log(chalk.yellow('\nService is running in stdio mode.'));
        console.log(chalk.yellow('Configure your MCP client to connect to this process.\n'));
      }
      
      // Start the service
      const service = spawn('node', [indexPath], {
        stdio: 'inherit',
        env: {
          ...process.env,
          MCP_MODE: options.mode,
          MCP_PORT: options.port
        }
      });
      
      service.on('error', (err) => {
        console.error(chalk.red('Failed to start service:'), err);
        process.exit(1);
      });
      
      service.on('exit', (code) => {
        if (code !== 0) {
          console.error(chalk.red(`Service exited with code ${code}`));
          process.exit(code);
        }
      });
      
    } catch (error) {
      spinner.fail('Failed to start service');
      console.error(chalk.red(error.message));
      process.exit(1);
    }
  });

program
  .command('status')
  .description('Check service status and cache statistics')
  .action(async () => {
    try {
      const servicePath = await getServicePath();
      const cacheDir = join(servicePath, '.cache');
      
      console.log(chalk.cyan('\n📊 Flutter MCP Service Status\n'));
      
      // Check if cache exists
      if (fs.existsSync(cacheDir)) {
        const stats = fs.statSync(cacheDir);
        console.log(chalk.green('✓ Cache directory exists'));
        console.log(chalk.gray(`  Location: ${cacheDir}`));
        console.log(chalk.gray(`  Created: ${stats.birthtime.toLocaleString()}`));
        
        // Check cache database
        const dbPath = join(cacheDir, 'flutter_mcp.db');
        if (fs.existsSync(dbPath)) {
          const dbStats = fs.statSync(dbPath);
          console.log(chalk.green('\n✓ Cache database exists'));
          console.log(chalk.gray(`  Size: ${(dbStats.size / 1024 / 1024).toFixed(2)} MB`));
        } else {
          console.log(chalk.yellow('\n⚠ Cache database not found'));
        }
      } else {
        console.log(chalk.yellow('⚠ Cache directory not found'));
        console.log(chalk.gray('  Run "flutter-mcp init" to initialize'));
      }
      
      // Check Node.js version
      console.log(chalk.green(`\n✓ Node.js ${process.version}`));
      
      // List available tools
      console.log(chalk.cyan('\n🔧 Available Tools:\n'));
      console.log(chalk.white('  Unified Tools (New):'));
      console.log(chalk.gray('    • flutter_search - Universal search'));
      console.log(chalk.gray('    • flutter_analyze - Smart analysis'));
      console.log(chalk.gray('    • flutter_status - Health check'));
      
      console.log(chalk.white('\n  Legacy Tools:'));
      console.log(chalk.gray('    • analyze_widget'));
      console.log(chalk.gray('    • validate_flutter_docs'));
      console.log(chalk.gray('    • analyze_pub_package'));
      console.log(chalk.gray('    • ... and 11 more'));
      
    } catch (error) {
      console.error(chalk.red('Error checking status:'), error.message);
      process.exit(1);
    }
  });

program
  .command('init')
  .description('Initialize Flutter MCP Service')
  .action(async () => {
    const spinner = ora('Initializing Flutter MCP Service...').start();
    
    try {
      const servicePath = await getServicePath();
      const cacheDir = join(servicePath, '.cache');
      
      // Create cache directory
      if (!fs.existsSync(cacheDir)) {
        fs.mkdirSync(cacheDir, { recursive: true });
        spinner.succeed('Cache directory created');
      } else {
        spinner.info('Cache directory already exists');
      }
      
      // Check and install dependencies
      spinner.start('Checking dependencies...');
      await checkDependencies();
      spinner.succeed('All dependencies installed');
      
      console.log(chalk.green('\n✓ Flutter MCP Service initialized successfully!'));
      console.log(chalk.cyan('\nNext steps:'));
      console.log(chalk.gray('  1. Run "flutter-mcp start" to start the service'));
      console.log(chalk.gray('  2. Configure your MCP client (Claude Desktop, VS Code, etc.)'));
      console.log(chalk.gray('  3. Start using Flutter development tools!'));
      
    } catch (error) {
      spinner.fail('Initialization failed');
      console.error(chalk.red(error.message));
      process.exit(1);
    }
  });

program
  .command('config')
  .description('Show configuration for MCP clients')
  .action(() => {
    console.log(chalk.cyan('\n📋 MCP Client Configuration\n'));
    
    console.log(chalk.white('For Claude Desktop, add to your configuration:'));
    console.log(chalk.gray('\n{'));
    console.log(chalk.gray('  "mcpServers": {'));
    console.log(chalk.gray('    "flutter-mcp": {'));
    console.log(chalk.gray('      "command": "npx",'));
    console.log(chalk.gray('      "args": ["@flutter-mcp/service", "start"]'));
    console.log(chalk.gray('    }'));
    console.log(chalk.gray('  }'));
    console.log(chalk.gray('}\n'));
    
    console.log(chalk.white('For local development:'));
    console.log(chalk.gray('\n{'));
    console.log(chalk.gray('  "mcpServers": {'));
    console.log(chalk.gray('    "flutter-mcp": {'));
    console.log(chalk.gray('      "command": "node",'));
    console.log(chalk.gray(`      "args": ["${join(process.cwd(), 'src', 'index.js')}"]`));
    console.log(chalk.gray('    }'));
    console.log(chalk.gray('  }'));
    console.log(chalk.gray('}'));
  });

program
  .command('clean')
  .description('Clean cache and temporary files')
  .option('-a, --all', 'Remove all data including database')
  .action(async (options) => {
    const spinner = ora('Cleaning cache...').start();
    
    try {
      const servicePath = await getServicePath();
      const cacheDir = join(servicePath, '.cache');
      
      if (fs.existsSync(cacheDir)) {
        if (options.all) {
          // Remove entire cache directory
          fs.rmSync(cacheDir, { recursive: true, force: true });
          spinner.succeed('Cache completely removed');
        } else {
          // Just clear cache contents
          const dbPath = join(cacheDir, 'flutter_mcp.db');
          if (fs.existsSync(dbPath)) {
            fs.unlinkSync(dbPath);
            spinner.succeed('Cache database cleared');
          } else {
            spinner.info('No cache to clean');
          }
        }
      } else {
        spinner.info('No cache directory found');
      }
      
    } catch (error) {
      spinner.fail('Failed to clean cache');
      console.error(chalk.red(error.message));
      process.exit(1);
    }
  });

program.parse();

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}