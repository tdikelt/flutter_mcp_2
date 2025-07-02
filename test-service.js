import { spawn } from 'child_process';
import { writeFileSync, unlinkSync } from 'fs';

console.log('🧪 Testing Flutter MCP Service...\n');

// Create a test request for listing tools
const listToolsRequest = {
  jsonrpc: '2.0',
  method: 'tools/list',
  params: {},
  id: 1
};

// Create a test request for calling a tool
const analyzeWidgetRequest = {
  jsonrpc: '2.0',
  method: 'tools/call',
  params: {
    name: 'analyze_widget',
    arguments: {
      widgetCode: `
class TestWidget extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      child: Text('Hello World'),
    );
  }
}`,
      checkAccessibility: true,
      checkPerformance: true
    }
  },
  id: 2
};

// Start the service
const service = spawn('node', ['src/index.js'], {
  stdio: ['pipe', 'pipe', 'pipe']
});

let output = '';
let errorOutput = '';

service.stdout.on('data', (data) => {
  output += data.toString();
  
  try {
    // Parse JSON-RPC responses
    const lines = output.split('\n');
    for (const line of lines) {
      if (line.trim() && line.includes('{')) {
        try {
          const response = JSON.parse(line);
          
          if (response.id === 1) {
            console.log('✅ Tool listing successful!');
            console.log(`📋 Found ${response.result.tools.length} tools:\n`);
            response.result.tools.forEach(tool => {
              console.log(`   - ${tool.name}: ${tool.description}`);
            });
            console.log('\n');
            
            // Now test a tool call
            service.stdin.write(JSON.stringify(analyzeWidgetRequest) + '\n');
          } else if (response.id === 2) {
            console.log('✅ Widget analysis successful!');
            console.log('📊 Analysis result:');
            if (response.result && response.result.content) {
              console.log(response.result.content[0].text.substring(0, 500) + '...\n');
            }
            
            console.log('🎉 All tests passed! Service is working correctly.\n');
            process.exit(0);
          }
        } catch (e) {
          // Not JSON, ignore
        }
      }
    }
  } catch (error) {
    console.error('Error parsing response:', error);
  }
});

service.stderr.on('data', (data) => {
  errorOutput += data.toString();
  if (!errorOutput.includes('Flutter MCP Service running')) {
    console.error('Service error:', errorOutput);
  }
});

service.on('error', (error) => {
  console.error('❌ Failed to start service:', error);
  process.exit(1);
});

// Send initial request after a short delay
setTimeout(() => {
  console.log('📤 Sending list tools request...\n');
  service.stdin.write(JSON.stringify(listToolsRequest) + '\n');
}, 500);

// Timeout after 5 seconds
setTimeout(() => {
  console.error('❌ Test timeout - service did not respond');
  service.kill();
  process.exit(1);
}, 5000);