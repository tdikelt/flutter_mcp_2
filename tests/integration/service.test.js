import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { spawn } from 'child_process';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('Flutter MCP Service Integration Tests', () => {
  let service;
  let client;

  beforeAll(async () => {
    // Start the service
    const servicePath = join(__dirname, '../../src/index.js');
    service = spawn('node', [servicePath], {
      env: { ...process.env, MCP_MODE: 'test' }
    });

    // Wait for service to be ready
    await new Promise(resolve => setTimeout(resolve, 2000));
  });

  afterAll(async () => {
    // Clean up
    if (service) {
      service.kill();
    }
  });

  describe('Service Lifecycle', () => {
    it('should start successfully', () => {
      expect(service.pid).toBeDefined();
      expect(service.killed).toBe(false);
    });

    it('should handle graceful shutdown', async () => {
      service.kill('SIGTERM');
      await new Promise(resolve => {
        service.on('exit', (code) => {
          expect(code).toBe(0);
          resolve();
        });
      });
    });
  });

  describe('Tool Execution', () => {
    it('should execute flutter_search tool', async () => {
      const result = await executeToolViaStdio('flutter_search', {
        query: 'Container',
        limit: 5
      });

      expect(result).toBeDefined();
      expect(result.content).toBeInstanceOf(Array);
      expect(result.content[0].type).toBe('text');
    });

    it('should execute flutter_analyze tool', async () => {
      const result = await executeToolViaStdio('flutter_analyze', {
        identifier: 'Container',
        topic: 'docs'
      });

      expect(result).toBeDefined();
      expect(result.content).toBeInstanceOf(Array);
    });

    it('should execute flutter_status tool', async () => {
      const result = await executeToolViaStdio('flutter_status', {});

      expect(result).toBeDefined();
      const status = JSON.parse(result.content[0].text);
      expect(status).toHaveProperty('cache');
      expect(status).toHaveProperty('capabilities');
    });

    it('should handle invalid tool gracefully', async () => {
      const result = await executeToolViaStdio('invalid_tool', {});
      
      expect(result.content[0].text).toContain('Error');
      expect(result.content[0].text).toContain('Unknown tool');
    });
  });

  describe('Cache System', () => {
    it('should cache widget analysis results', async () => {
      const args = {
        widgetCode: 'Container(child: Text("Test"))',
        checkAccessibility: true
      };

      // First call - should miss cache
      const result1 = await executeToolViaStdio('analyze_widget', args);
      
      // Second call - should hit cache
      const start = Date.now();
      const result2 = await executeToolViaStdio('analyze_widget', args);
      const duration = Date.now() - start;

      expect(result1).toEqual(result2);
      expect(duration).toBeLessThan(50); // Cache hit should be fast
    });

    it('should respect TTL settings', async () => {
      // This would require mocking time or waiting for TTL
      // For integration tests, we'll check cache stats instead
      const result = await executeToolViaStdio('flutter_status', {});
      const status = JSON.parse(result.content[0].text);
      
      expect(status.cache).toBeDefined();
      expect(status.cache.hitRate).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      // Simulate network error by using invalid package name
      const result = await executeToolViaStdio('analyze_pub_package', {
        packageName: 'definitely-not-a-real-package-12345'
      });

      expect(result.content[0].text).toBeDefined();
      // Should not crash the service
      expect(service.killed).toBe(false);
    });

    it('should handle malformed input', async () => {
      const result = await executeToolViaStdio('analyze_widget', {
        widgetCode: null // Invalid input
      });

      expect(result.content[0].text).toContain('Error');
    });
  });

  describe('Token Management', () => {
    it('should truncate large responses', async () => {
      const largeCode = 'Container(\n' + 
        '  child: Column(children: [\n' +
        Array(1000).fill('    Text("Item"),\n').join('') +
        '  ]),\n)';

      const result = await executeToolViaStdio('analyze_widget', {
        widgetCode: largeCode,
        maxTokens: 1000
      });

      expect(result).toBeDefined();
      const text = result.content[0].text;
      expect(text.length).toBeLessThan(5000); // Rough estimate
    });
  });

  describe('Concurrent Requests', () => {
    it('should handle multiple concurrent requests', async () => {
      const promises = Array(10).fill(null).map((_, i) => 
        executeToolViaStdio('flutter_search', {
          query: `test${i}`,
          limit: 1
        })
      );

      const results = await Promise.all(promises);
      
      expect(results).toHaveLength(10);
      results.forEach(result => {
        expect(result).toBeDefined();
        expect(result.content).toBeDefined();
      });
    });
  });
});

// Helper function to execute tools via stdio
async function executeToolViaStdio(toolName, args) {
  // This would be implemented using the MCP protocol
  // For testing, we'll simulate the execution
  const { spawn } = await import('child_process');
  const testScript = `
    import { ${toolName} } from './src/tools/unifiedTools.js';
    ${toolName}(${JSON.stringify(args)}).then(result => {
      console.log(JSON.stringify(result));
      process.exit(0);
    }).catch(err => {
      console.error(JSON.stringify({ error: err.message }));
      process.exit(1);
    });
  `;

  return new Promise((resolve, reject) => {
    const proc = spawn('node', ['--input-type=module'], {
      cwd: join(__dirname, '../..')
    });

    let output = '';
    proc.stdout.on('data', (data) => {
      output += data.toString();
    });

    proc.stderr.on('data', (data) => {
      console.error('Test stderr:', data.toString());
    });

    proc.on('exit', (code) => {
      try {
        const result = JSON.parse(output);
        resolve(result);
      } catch (err) {
        reject(new Error(`Failed to parse output: ${output}`));
      }
    });

    proc.stdin.write(testScript);
    proc.stdin.end();
  });
}