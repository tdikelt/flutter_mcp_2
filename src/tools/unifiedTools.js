import { analyzeWidget } from './widgetAnalyzer.js';
import { validateFlutterDocs } from './docsValidator.js';
import { analyzePubPackage } from './pubAnalyzer.js';
import { analyzePerformance } from './performanceAnalyzer.js';
import { suggestImprovements } from './improvementSuggester.js';
import { getCacheManager } from '../cache/cacheManager.js';
import { getTokenManager } from '../utils/tokenManager.js';
import { errorHandler } from '../utils/errorHandler.js';
import { getFlutterDocsService } from '../services/flutterDocsService.js';
import axios from 'axios';
import * as cheerio from 'cheerio';

const cache = getCacheManager();
const tokenManager = getTokenManager();
const docsService = getFlutterDocsService();

// Universal Flutter search tool
export async function flutterSearch(args) {
  const { query, limit = 10, maxTokens = 4000 } = args;
  
  try {
    // Auto-detect query type
    const queryType = detectQueryType(query);
    
    // Search across multiple sources in parallel
    const searchPromises = [];
    
    if (queryType.includes('widget') || queryType.includes('class')) {
      searchPromises.push(searchFlutterDocs(query));
    }
    
    if (queryType.includes('package')) {
      searchPromises.push(searchPubPackages(query));
    }
    
    if (queryType.includes('code')) {
      searchPromises.push(searchCodeExamples(query));
    }
    
    const results = await Promise.all(searchPromises);
    const flatResults = results.flat().slice(0, limit);
    
    // Format and truncate results
    const formattedResults = formatSearchResults(flatResults);
    const truncatedResults = tokenManager.smartTruncate(formattedResults, maxTokens);
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(truncatedResults, null, 2)
        }
      ]
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error searching Flutter resources: ${error.message}`
        }
      ]
    };
  }
}

// Smart Flutter documentation and analysis tool
export async function flutterAnalyze(args) {
  const { 
    identifier, 
    topic = 'all', 
    maxTokens = 4000,
    includeExamples = true,
    includeAnalysis = true 
  } = args;
  
  try {
    const identifierType = detectIdentifierType(identifier);
    const results = {};
    
    // Fetch relevant information based on identifier type
    if (identifierType === 'widget' || identifierType === 'class') {
      if (topic === 'all' || topic === 'docs') {
        results.documentation = await fetchFlutterDocumentation(identifier);
      }
      
      if (includeAnalysis && (topic === 'all' || topic === 'analysis')) {
        // If code is provided, analyze it
        if (args.code) {
          results.analysis = await analyzeWidget({ widgetCode: args.code });
          results.performance = await analyzePerformance({ code: args.code });
        }
      }
      
      if (includeExamples && (topic === 'all' || topic === 'examples')) {
        results.examples = await fetchCodeExamples(identifier);
      }
    } else if (identifierType === 'package') {
      results.packageInfo = await analyzePubPackage({ 
        packageName: identifier,
        checkDependencies: true,
        checkScores: true 
      });
    }
    
    // Generate improvement suggestions if code is provided
    if (args.code && includeAnalysis) {
      results.suggestions = await suggestImprovements({ 
        code: args.code,
        focusAreas: ['performance', 'accessibility', 'maintainability']
      });
    }
    
    // Truncate results to fit token limit
    const truncatedResults = tokenManager.smartTruncate(results, maxTokens);
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(truncatedResults, null, 2)
        }
      ]
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error analyzing Flutter resource: ${error.message}`
        }
      ]
    };
  }
}

// Health check and status tool
export async function flutterStatus(args) {
  try {
    const status = {
      cache: cache.getStats(),
      errorHandling: errorHandler.getStatus(),
      timestamp: new Date().toISOString(),
      version: '2.0.0',
      capabilities: {
        search: true,
        analysis: true,
        documentation: true,
        packageAnalysis: true,
        performanceCheck: true,
        caching: true,
        tokenManagement: true
      }
    };
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(status, null, 2)
        }
      ]
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error getting status: ${error.message}`
        }
      ]
    };
  }
}

// Helper functions
function detectQueryType(query) {
  const types = [];
  const lowerQuery = query.toLowerCase();
  
  // Check for widget indicators
  if (lowerQuery.includes('widget') || 
      lowerQuery.includes('container') || 
      lowerQuery.includes('scaffold') ||
      lowerQuery.includes('button')) {
    types.push('widget');
  }
  
  // Check for package indicators
  if (lowerQuery.includes('package') || 
      lowerQuery.includes('pub.dev') || 
      lowerQuery.includes('dependency')) {
    types.push('package');
  }
  
  // Check for code indicators
  if (lowerQuery.includes('example') || 
      lowerQuery.includes('how to') || 
      lowerQuery.includes('implement')) {
    types.push('code');
  }
  
  // Default to all types if no specific indicator
  if (types.length === 0) {
    types.push('widget', 'package', 'code');
  }
  
  return types;
}

function detectIdentifierType(identifier) {
  // Flutter widget patterns
  const flutterWidgets = ['Container', 'Scaffold', 'Text', 'Column', 'Row', 'ListView'];
  if (flutterWidgets.some(w => identifier.includes(w))) {
    return 'widget';
  }
  
  // Dart core library patterns
  if (identifier.startsWith('dart:')) {
    return 'dart';
  }
  
  // Package pattern
  if (identifier.includes(':') || identifier.includes('/')) {
    return 'package';
  }
  
  // Check if it looks like a class name (PascalCase)
  if (/^[A-Z][a-zA-Z0-9]*$/.test(identifier)) {
    return 'class';
  }
  
  return 'package'; // Default to package
}

async function searchFlutterDocs(query) {
  const cacheKey = { query, type: 'flutter_docs_search' };
  const cached = await cache.get('flutterDocs', cacheKey);
  if (cached) return cached;
  
  try {
    const results = await docsService.searchFlutterDocs(query);
    await cache.set('flutterDocs', cacheKey, results);
    return results;
  } catch (error) {
    console.error('Error searching Flutter docs:', error);
    return [];
  }
}

async function searchPubPackages(query) {
  const cacheKey = { query, type: 'pub_search' };
  const cached = await cache.get('pubPackage', cacheKey);
  if (cached) return cached;
  
  try {
    const response = await errorHandler.executeWithProtection(
      'pub.dev',
      async () => {
        const res = await axios.get(`https://pub.dev/api/search?q=${encodeURIComponent(query)}`);
        return res.data;
      }
    );
    
    const results = response.packages.map(pkg => ({
      type: 'package',
      name: pkg.package,
      description: pkg.description,
      version: pkg.version,
      score: pkg.score
    }));
    
    await cache.set('pubPackage', cacheKey, results);
    return results;
  } catch (error) {
    console.error('Error searching pub packages:', error);
    return [];
  }
}

async function searchCodeExamples(query) {
  // This would search through Flutter cookbook, examples, etc.
  return [
    {
      type: 'example',
      title: 'Basic Container Example',
      code: `Container(
  width: 200,
  height: 200,
  color: Colors.blue,
  child: Text('Hello World'),
)`,
      source: 'Flutter Documentation'
    }
  ];
}

async function fetchFlutterDocumentation(identifier) {
  const cacheKey = { identifier, type: 'flutter_doc' };
  const cached = await cache.get('flutterDocs', cacheKey);
  if (cached) return cached;
  
  try {
    let documentation;
    
    // Determine the type and fetch accordingly
    if (identifier.startsWith('dart:')) {
      const [, library, className] = identifier.match(/dart:(\w+)\.(\w+)/) || [];
      documentation = await docsService.fetchDartClass(className, library);
    } else if (identifier.includes(':')) {
      // Package format: package:provider/provider.dart
      const [packagePart] = identifier.split('/');
      const packageName = packagePart.split(':')[1];
      documentation = await docsService.fetchPackageDocumentation(packageName);
    } else {
      // Flutter widget
      documentation = await docsService.fetchFlutterClass(identifier);
    }
    
    await cache.set('flutterDocs', cacheKey, documentation);
    return documentation;
  } catch (error) {
    console.error('Error fetching Flutter documentation:', error);
    return null;
  }
}

async function fetchCodeExamples(identifier) {
  // Fetch code examples for the identifier
  return [
    {
      title: `${identifier} Example`,
      code: '// Example code here',
      description: 'Example usage'
    }
  ];
}

function formatSearchResults(results) {
  return {
    totalResults: results.length,
    results: results.map(r => ({
      type: r.type,
      name: r.name || r.title,
      description: r.description,
      relevance: r.score || 1.0,
      metadata: {
        url: r.url,
        version: r.version,
        source: r.source
      }
    }))
  };
}

// Export consolidated tools
export const unifiedTools = [
  {
    name: 'flutter_search',
    description: 'Universal search across Flutter/Dart documentation, packages, and examples',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query'
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results (default: 10)'
        },
        maxTokens: {
          type: 'number',
          description: 'Maximum tokens in response (default: 4000)'
        }
      },
      required: ['query']
    },
    handler: flutterSearch
  },
  {
    name: 'flutter_analyze',
    description: 'Smart Flutter documentation fetcher and code analyzer',
    inputSchema: {
      type: 'object',
      properties: {
        identifier: {
          type: 'string',
          description: 'Widget name, class name, or package identifier'
        },
        code: {
          type: 'string',
          description: 'Optional code to analyze'
        },
        topic: {
          type: 'string',
          description: 'Specific topic: all, docs, analysis, examples (default: all)'
        },
        maxTokens: {
          type: 'number',
          description: 'Maximum tokens in response (default: 4000)'
        },
        includeExamples: {
          type: 'boolean',
          description: 'Include code examples (default: true)'
        },
        includeAnalysis: {
          type: 'boolean',
          description: 'Include code analysis (default: true)'
        }
      },
      required: ['identifier']
    },
    handler: flutterAnalyze
  },
  {
    name: 'flutter_status',
    description: 'Health check and cache statistics',
    inputSchema: {
      type: 'object',
      properties: {}
    },
    handler: flutterStatus
  }
];

// Backward compatibility exports
export { flutterSearch as searchFlutterResources };
export { flutterAnalyze as analyzeFlutterCode };
export { flutterStatus as healthCheck };