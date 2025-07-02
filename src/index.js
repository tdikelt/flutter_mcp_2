import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { 
  CallToolRequestSchema, 
  ListToolsRequestSchema 
} from '@modelcontextprotocol/sdk/types.js';

// Import unified tools
import { unifiedTools } from './tools/unifiedTools.js';

// Import legacy tools for backward compatibility
import { analyzeWidget } from './tools/widgetAnalyzer.js';
import { validateFlutterDocs } from './tools/docsValidator.js';
import { analyzePubPackage } from './tools/pubAnalyzer.js';
import { suggestImprovements } from './tools/improvementSuggester.js';
import { analyzePerformance } from './tools/performanceAnalyzer.js';
import { analyzeArchitectureCompliance as analyzeArchitecture } from './tools/architectureAnalyzer.js';
import { analyzeBundleSize } from './tools/bundleSizeAnalyzer.js';
import { generateWidgetTest as generateTests } from './tools/testGenerator.js';
import { traceStateFlow as traceState } from './tools/stateTracer.js';
import { generateCleanArchitecture } from './tools/cleanArchitectureGenerator.js';
import { generateL10nSetup as generateL10n } from './tools/l10nGenerator.js';
import { monitorPerformanceMetrics as monitorPerformance } from './tools/performanceMonitor.js';
import { diagnoseRenderIssues } from './tools/renderDiagnostics.js';
import { analyzeTestCoverage } from './tools/testCoverageAnalyzer.js';

const server = new Server(
  {
    name: 'flutter-mcp-service',
    version: '2.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Create a map for unified tool handlers
const unifiedToolHandlers = unifiedTools.reduce((acc, tool) => {
  acc[tool.name] = tool.handler;
  return acc;
}, {});

// Legacy tool mappings for backward compatibility
const legacyTools = [
  {
    name: 'analyze_widget',
    description: 'Analyze Flutter widget code for best practices, performance, and accessibility',
    inputSchema: {
      type: 'object',
      properties: {
        widgetCode: {
          type: 'string',
          description: 'The Flutter widget code to analyze',
        },
        checkAccessibility: {
          type: 'boolean',
          description: 'Check for accessibility issues',
          default: true,
        },
        checkPerformance: {
          type: 'boolean',
          description: 'Check for performance optimizations',
          default: true,
        },
      },
      required: ['widgetCode'],
    },
  },
  {
    name: 'validate_flutter_docs',
    description: 'Validate code against official Flutter documentation and best practices',
    inputSchema: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          description: 'Flutter/Dart code to validate',
        },
        widgetType: {
          type: 'string',
          description: 'Specific widget type to focus on',
        },
      },
      required: ['code'],
    },
  },
  {
    name: 'analyze_pub_package',
    description: 'Analyze a package from pub.dev for quality, popularity, and compatibility',
    inputSchema: {
      type: 'object',
      properties: {
        packageName: {
          type: 'string',
          description: 'Name of the package on pub.dev',
        },
        checkDependencies: {
          type: 'boolean',
          description: 'Analyze package dependencies',
          default: true,
        },
        checkScores: {
          type: 'boolean',
          description: 'Retrieve pub.dev scores',
          default: true,
        },
      },
      required: ['packageName'],
    },
  },
  {
    name: 'suggest_improvements',
    description: 'Suggest improvements for Flutter code based on official documentation',
    inputSchema: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          description: 'Flutter code to improve',
        },
        focusArea: {
          type: 'string',
          enum: ['performance', 'accessibility', 'maintainability', 'all'],
          description: 'Area to focus improvements on',
          default: 'all',
        },
      },
      required: ['code'],
    },
  },
  {
    name: 'analyze_performance',
    description: 'Analyze Flutter widget tree for performance issues',
    inputSchema: {
      type: 'object',
      properties: {
        widgetTree: {
          type: 'string',
          description: 'Flutter widget tree code',
        },
        checkRebuildOptimization: {
          type: 'boolean',
          description: 'Check for unnecessary rebuilds',
          default: true,
        },
        checkMemoryLeaks: {
          type: 'boolean',
          description: 'Check for potential memory leaks',
          default: true,
        },
      },
      required: ['widgetTree'],
    },
  },
  {
    name: 'analyze_architecture',
    description: 'Analyze Flutter project architecture for compliance with Clean, MVVM, or MVC patterns',
    inputSchema: {
      type: 'object',
      properties: {
        projectStructure: {
          type: 'object',
          description: 'Project directory structure and file organization',
        },
        pattern: {
          type: 'string',
          enum: ['clean', 'mvvm', 'mvc', 'auto'],
          description: 'Architecture pattern to check against',
          default: 'auto',
        },
        checkDependencies: {
          type: 'boolean',
          description: 'Check for dependency violations',
          default: true,
        },
      },
      required: ['projectStructure'],
    },
  },
  {
    name: 'analyze_bundle_size',
    description: 'Analyze Flutter app bundle size across platforms with optimization recommendations',
    inputSchema: {
      type: 'object',
      properties: {
        platform: {
          type: 'string',
          enum: ['android', 'ios', 'web', 'all'],
          description: 'Platform to analyze',
          default: 'all',
        },
        buildPath: {
          type: 'string',
          description: 'Path to build output directory',
        },
        includeAssets: {
          type: 'boolean',
          description: 'Include asset analysis',
          default: true,
        },
      },
      required: ['buildPath'],
    },
  },
  {
    name: 'generate_tests',
    description: 'Generate Flutter widget tests including golden tests and accessibility tests',
    inputSchema: {
      type: 'object',
      properties: {
        widgetCode: {
          type: 'string',
          description: 'Widget code to generate tests for',
        },
        testType: {
          type: 'string',
          enum: ['unit', 'widget', 'integration', 'golden', 'all'],
          description: 'Type of tests to generate',
          default: 'widget',
        },
        includeAccessibility: {
          type: 'boolean',
          description: 'Include accessibility tests',
          default: true,
        },
      },
      required: ['widgetCode'],
    },
  },
  {
    name: 'trace_state',
    description: 'Trace state flow and rebuilds in Flutter widgets with optimization recommendations',
    inputSchema: {
      type: 'object',
      properties: {
        widgetCode: {
          type: 'string',
          description: 'Widget code to trace state in',
        },
        traceRebuildPaths: {
          type: 'boolean',
          description: 'Trace widget rebuild paths',
          default: true,
        },
        generateVisualization: {
          type: 'boolean',
          description: 'Generate state flow visualization',
          default: true,
        },
      },
      required: ['widgetCode'],
    },
  },
  {
    name: 'generate_clean_architecture',
    description: 'Generate a complete Clean Architecture structure for Flutter project',
    inputSchema: {
      type: 'object',
      properties: {
        projectName: {
          type: 'string',
          description: 'Name of the project/feature',
        },
        features: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of features to generate',
        },
        stateManagement: {
          type: 'string',
          enum: ['riverpod', 'bloc', 'provider', 'getx'],
          description: 'State management solution',
          default: 'riverpod',
        },
        includeDI: {
          type: 'boolean',
          description: 'Include dependency injection setup',
          default: true,
        },
      },
      required: ['projectName', 'features'],
    },
  },
  {
    name: 'generate_l10n',
    description: 'Generate complete localization setup for Flutter with ARB files',
    inputSchema: {
      type: 'object',
      properties: {
        languages: {
          type: 'array',
          items: { type: 'string' },
          description: 'Language codes to support (e.g., ["en", "es", "fr"])',
        },
        translations: {
          type: 'object',
          description: 'Initial translations to include',
        },
        includeRTL: {
          type: 'boolean',
          description: 'Include RTL language support',
          default: true,
        },
        includePluralization: {
          type: 'boolean',
          description: 'Include pluralization examples',
          default: true,
        },
      },
      required: ['languages'],
    },
  },
  {
    name: 'monitor_performance',
    description: 'Generate comprehensive performance monitoring setup for Flutter apps',
    inputSchema: {
      type: 'object',
      properties: {
        monitoringType: {
          type: 'string',
          enum: ['comprehensive', 'balanced', 'lightweight'],
          description: 'Level of monitoring to implement',
          default: 'balanced',
        },
        includeNetwork: {
          type: 'boolean',
          description: 'Monitor network performance',
          default: true,
        },
        includeMemory: {
          type: 'boolean',
          description: 'Monitor memory usage',
          default: true,
        },
        includeAnalytics: {
          type: 'boolean',
          description: 'Include analytics integration',
          default: true,
        },
      },
      required: ['monitoringType'],
    },
  },
  {
    name: 'diagnose_render_issues',
    description: 'Diagnose and fix rendering issues in Flutter widgets',
    inputSchema: {
      type: 'object',
      properties: {
        widgetCode: {
          type: 'string',
          description: 'Widget code with potential rendering issues',
        },
        errorType: {
          type: 'string',
          enum: ['overflow', 'constraint', 'layout', 'all'],
          description: 'Type of rendering issue to check',
          default: 'all',
        },
        includeVisualization: {
          type: 'boolean',
          description: 'Include debug visualization code',
          default: true,
        },
      },
      required: ['widgetCode'],
    },
  },
  {
    name: 'analyze_test_coverage',
    description: 'Analyze test coverage with detailed reports and recommendations',
    inputSchema: {
      type: 'object',
      properties: {
        coverageData: {
          type: 'object',
          description: 'Coverage data from lcov or similar',
        },
        projectStructure: {
          type: 'object',
          description: 'Project file structure',
        },
        targetCoverage: {
          type: 'number',
          description: 'Target coverage percentage',
          default: 80,
        },
        generateReport: {
          type: 'boolean',
          description: 'Generate visual coverage report',
          default: true,
        },
      },
      required: ['coverageData', 'projectStructure'],
    },
  },
];

server.setRequestHandler(ListToolsRequestSchema, async () => {
  // Combine unified tools with legacy tools
  const allTools = [
    ...unifiedTools.map(tool => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema
    })),
    ...legacyTools
  ];
  
  return { tools: allTools };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    // Check if it's a unified tool first
    if (unifiedToolHandlers[name]) {
      return await unifiedToolHandlers[name](args);
    }
    
    // Handle legacy tools
    switch (name) {
      case 'analyze_widget':
        return await analyzeWidget(args);
      
      case 'validate_flutter_docs':
        return await validateFlutterDocs(args);
      
      case 'analyze_pub_package':
        return await analyzePubPackage(args);
      
      case 'suggest_improvements':
        return await suggestImprovements(args);
      
      case 'analyze_performance':
        return await analyzePerformance(args);
      
      case 'analyze_architecture':
        return await analyzeArchitecture(args);
      
      case 'analyze_bundle_size':
        return await analyzeBundleSize(args);
      
      case 'generate_tests':
        return await generateTests(args);
      
      case 'trace_state':
        return await traceState(args);
      
      case 'generate_clean_architecture':
        return await generateCleanArchitecture(args);
      
      case 'generate_l10n':
        return await generateL10n(args);
      
      case 'monitor_performance':
        return await monitorPerformance(args);
      
      case 'diagnose_render_issues':
        return await diagnoseRenderIssues(args);
      
      case 'analyze_test_coverage':
        return await analyzeTestCoverage(args);
      
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error.message}`,
        },
      ],
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Flutter MCP Service v2.0.0 running on stdio');
  console.error('New unified tools available: flutter_search, flutter_analyze, flutter_status');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});