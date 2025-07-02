#!/usr/bin/env node

import { flutterStatus } from '../src/tools/unifiedTools.js';
import chalk from 'chalk';

async function healthCheck() {
  console.log(chalk.cyan('\n🏥 Flutter MCP Service Health Check\n'));
  
  const checks = {
    service: { status: 'checking', message: '' },
    cache: { status: 'checking', message: '' },
    tools: { status: 'checking', message: '' },
    memory: { status: 'checking', message: '' }
  };

  try {
    // Check 1: Service Status
    console.log(chalk.gray('Checking service status...'));
    const statusResult = await flutterStatus({});
    const status = JSON.parse(statusResult.content[0].text);
    
    if (status && status.version) {
      checks.service.status = 'pass';
      checks.service.message = `Version ${status.version}`;
    } else {
      checks.service.status = 'fail';
      checks.service.message = 'Could not retrieve version';
    }

    // Check 2: Cache System
    console.log(chalk.gray('Checking cache system...'));
    if (status.cache && status.cache.memory) {
      const hitRate = status.cache.hitRate || 0;
      checks.cache.status = 'pass';
      checks.cache.message = `Hit rate: ${hitRate}%`;
      
      // Warn if hit rate is low
      if (hitRate < 50 && status.cache.memory.hits + status.cache.memory.misses > 10) {
        checks.cache.status = 'warn';
        checks.cache.message += ' (below optimal)';
      }
    } else {
      checks.cache.status = 'fail';
      checks.cache.message = 'Cache system not responding';
    }

    // Check 3: Tool Availability
    console.log(chalk.gray('Checking tool availability...'));
    const capabilities = status.capabilities || {};
    const expectedCapabilities = [
      'search', 'analysis', 'documentation', 
      'packageAnalysis', 'performanceCheck', 'caching'
    ];
    
    const missingCapabilities = expectedCapabilities.filter(
      cap => !capabilities[cap]
    );
    
    if (missingCapabilities.length === 0) {
      checks.tools.status = 'pass';
      checks.tools.message = 'All tools available';
    } else {
      checks.tools.status = 'warn';
      checks.tools.message = `Missing: ${missingCapabilities.join(', ')}`;
    }

    // Check 4: Memory Usage
    console.log(chalk.gray('Checking memory usage...'));
    const memUsage = process.memoryUsage();
    const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);
    const heapPercentage = Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100);
    
    checks.memory.status = heapPercentage < 80 ? 'pass' : 'warn';
    checks.memory.message = `${heapUsedMB}MB / ${heapTotalMB}MB (${heapPercentage}%)`;

    // Display results
    console.log(chalk.cyan('\n📊 Health Check Results:\n'));
    
    Object.entries(checks).forEach(([name, check]) => {
      const icon = check.status === 'pass' ? '✅' : 
                   check.status === 'warn' ? '⚠️' : '❌';
      const color = check.status === 'pass' ? chalk.green :
                    check.status === 'warn' ? chalk.yellow : chalk.red;
      
      console.log(`  ${icon} ${chalk.white(name.padEnd(10))} ${color(check.message)}`);
    });

    // Overall status
    const failedChecks = Object.values(checks).filter(c => c.status === 'fail').length;
    const warnChecks = Object.values(checks).filter(c => c.status === 'warn').length;
    
    console.log('\n' + chalk.cyan('Overall Status: '));
    if (failedChecks > 0) {
      console.log(chalk.red(`  ❌ UNHEALTHY (${failedChecks} checks failed)`));
      process.exit(1);
    } else if (warnChecks > 0) {
      console.log(chalk.yellow(`  ⚠️  DEGRADED (${warnChecks} warnings)`));
      process.exit(0);
    } else {
      console.log(chalk.green('  ✅ HEALTHY'));
      process.exit(0);
    }

  } catch (error) {
    console.error(chalk.red('\n❌ Health check failed:'), error.message);
    process.exit(1);
  }
}

// Run health check
healthCheck().catch(error => {
  console.error(chalk.red('Fatal error:'), error);
  process.exit(1);
});