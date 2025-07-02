import { spawn } from 'child_process';

console.log('🧪 Testing All Flutter MCP Service Tools...\n');

// Define test cases for each tool
const testCases = [
  {
    name: 'analyze_widget',
    args: {
      widgetCode: `
class TestWidget extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      child: Text('Test'),
    );
  }
}`
    }
  },
  {
    name: 'validate_flutter_docs',
    args: {
      code: 'Container(child: Text("Hello"))'
    }
  },
  {
    name: 'analyze_pub_package',
    args: {
      packageName: 'http',
      checkDependencies: false,
      checkScores: false
    }
  },
  {
    name: 'suggest_improvements',
    args: {
      code: 'Widget build(BuildContext context) { return Container(); }'
    }
  },
  {
    name: 'analyze_performance',
    args: {
      widgetTree: 'ListView(children: List.generate(100, (i) => Text("Item $i")))'
    }
  },
  {
    name: 'analyze_architecture',
    args: {
      projectStructure: {
        'lib/': {
          'main.dart': 'file',
          'core/': { 'errors/': 'dir' },
          'features/': { 'auth/': { 'data/': 'dir', 'domain/': 'dir', 'presentation/': 'dir' } }
        }
      }
    }
  },
  {
    name: 'analyze_bundle_size',
    args: {
      buildPath: '/fake/build/path',
      platform: 'android'
    }
  },
  {
    name: 'generate_tests',
    args: {
      widgetCode: 'class MyButton extends StatelessWidget { @override Widget build(BuildContext context) { return ElevatedButton(onPressed: () {}, child: Text("Click")); } }'
    }
  },
  {
    name: 'trace_state',
    args: {
      widgetCode: 'class Counter extends StatefulWidget { @override _CounterState createState() => _CounterState(); }'
    }
  },
  {
    name: 'generate_clean_architecture',
    args: {
      projectName: 'test_app',
      features: ['auth', 'home']
    }
  },
  {
    name: 'generate_l10n',
    args: {
      languages: ['en', 'es'],
      translations: { welcome: { en: 'Welcome', es: 'Bienvenido' } }
    }
  },
  {
    name: 'monitor_performance',
    args: {
      monitoringType: 'balanced'
    }
  },
  {
    name: 'diagnose_render_issues',
    args: {
      widgetCode: 'Container(height: double.infinity, child: Text("Test"))'
    }
  },
  {
    name: 'analyze_test_coverage',
    args: {
      coverageData: { 'lib/main.dart': { lines: { total: 100, covered: 80 } } },
      projectStructure: { 'lib/': { 'main.dart': 'file' } }
    }
  }
];

// Start the service
const service = spawn('node', ['src/index.js'], {
  stdio: ['pipe', 'pipe', 'pipe']
});

let output = '';
let currentTestIndex = 0;
let testResults = [];

service.stdout.on('data', (data) => {
  output += data.toString();
  
  try {
    const lines = output.split('\n');
    for (const line of lines) {
      if (line.trim() && line.includes('{')) {
        try {
          const response = JSON.parse(line);
          
          if (response.id && response.id <= testCases.length) {
            const testCase = testCases[response.id - 1];
            
            if (response.result) {
              testResults.push({ tool: testCase.name, status: 'PASS' });
              console.log(`✅ ${testCase.name}: PASS`);
            } else if (response.error) {
              testResults.push({ tool: testCase.name, status: 'FAIL', error: response.error.message });
              console.log(`❌ ${testCase.name}: FAIL - ${response.error.message}`);
            }
            
            if (testResults.length === testCases.length) {
              // All tests complete
              console.log('\n📊 Test Summary:');
              const passed = testResults.filter(r => r.status === 'PASS').length;
              const failed = testResults.filter(r => r.status === 'FAIL').length;
              console.log(`   Passed: ${passed}/${testCases.length}`);
              console.log(`   Failed: ${failed}/${testCases.length}`);
              
              if (failed === 0) {
                console.log('\n🎉 All tools are working correctly!');
              } else {
                console.log('\n⚠️  Some tools failed. Check the errors above.');
              }
              
              service.kill();
              process.exit(failed > 0 ? 1 : 0);
            }
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
  const errorMsg = data.toString();
  if (!errorMsg.includes('Flutter MCP Service running')) {
    console.error('Service error:', errorMsg);
  }
});

service.on('error', (error) => {
  console.error('❌ Failed to start service:', error);
  process.exit(1);
});

// Send test requests after service starts
setTimeout(() => {
  console.log('Starting tool tests...\n');
  
  testCases.forEach((testCase, index) => {
    const request = {
      jsonrpc: '2.0',
      method: 'tools/call',
      params: {
        name: testCase.name,
        arguments: testCase.args
      },
      id: index + 1
    };
    
    setTimeout(() => {
      service.stdin.write(JSON.stringify(request) + '\n');
    }, index * 100); // Stagger requests
  });
}, 500);

// Timeout after 30 seconds
setTimeout(() => {
  console.error('\n❌ Test timeout - not all tools responded');
  service.kill();
  process.exit(1);
}, 30000);