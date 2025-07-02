# Flutter MCP Service Development Guide

## Table of Contents
1. [Getting Started](#getting-started)
2. [Project Structure](#project-structure)
3. [Development Workflow](#development-workflow)
4. [Adding New Tools](#adding-new-tools)
5. [Testing](#testing)
6. [Debugging](#debugging)
7. [Performance Optimization](#performance-optimization)
8. [Contributing](#contributing)

## Getting Started

### Prerequisites
- Node.js 18+ (for ES modules support)
- npm or yarn
- Git
- SQLite3 (installed automatically)

### Initial Setup
```bash
# Clone the repository
git clone <repository-url>
cd flutter_mcp_service

# Install dependencies
npm install

# Create cache directory
mkdir -p .cache

# Run in development mode
npm run dev
```

### Environment Variables
Create a `.env` file for local development:
```env
# Cache settings
CACHE_DIR=./.cache
MEMORY_CACHE_TTL=300
WIDGET_ANALYSIS_TTL=86400
PUB_PACKAGE_TTL=43200

# Token settings
MAX_TOKENS=4000
TOKEN_APPROXIMATION_RATIO=1.3

# Error handling
CIRCUIT_BREAKER_THRESHOLD=5
CIRCUIT_BREAKER_TIMEOUT=60000
MAX_RETRIES=3

# Logging
LOG_LEVEL=info
```

## Project Structure

```
flutter_mcp_service/
├── src/
│   ├── index.js                 # Main entry point
│   ├── cache/
│   │   └── cacheManager.js      # Cache system implementation
│   ├── services/
│   │   └── flutterDocsService.js # External API integration
│   ├── tools/
│   │   ├── unifiedTools.js      # New consolidated tools
│   │   ├── widgetAnalyzer.js    # Widget analysis tool
│   │   └── [other tools]
│   ├── utils/
│   │   ├── errorHandler.js      # Error handling utilities
│   │   ├── tokenManager.js      # Token management
│   │   └── parser.js            # Code parsing utilities
│   └── validators/
│       └── bestPractices.js     # Validation rules
├── tests/
│   ├── integration/
│   └── unit/
├── docs/
│   ├── ARCHITECTURE.md
│   ├── DEVELOPMENT.md
│   └── API.md
├── docker/
│   ├── Dockerfile
│   └── docker-compose.yml
├── package.json
└── README.md
```

## Development Workflow

### 1. Feature Development

#### Creating a New Feature Branch
```bash
git checkout -b feature/your-feature-name
```

#### Development Cycle
1. Write tests first (TDD approach)
2. Implement the feature
3. Run tests locally
4. Update documentation
5. Submit PR

### 2. Code Style

We follow these conventions:
- ES6+ modules
- Async/await over callbacks
- JSDoc comments for public APIs
- Meaningful variable names
- Max line length: 100 characters

Example:
```javascript
/**
 * Analyzes a Flutter widget for performance issues
 * @param {Object} args - Analysis arguments
 * @param {string} args.widgetCode - The widget code to analyze
 * @param {boolean} [args.checkPerformance=true] - Check performance
 * @returns {Promise<Object>} Analysis results
 */
export async function analyzeWidget(args) {
  const { widgetCode, checkPerformance = true } = args;
  
  // Check cache first
  const cached = await cache.get('widgetAnalysis', args);
  if (cached) return cached;
  
  // Perform analysis
  const result = await performAnalysis(widgetCode);
  
  // Cache and return
  await cache.set('widgetAnalysis', args, result);
  return result;
}
```

## Adding New Tools

### 1. Create Tool Implementation

Create a new file in `src/tools/`:
```javascript
// src/tools/myNewTool.js
import { getCacheManager } from '../cache/cacheManager.js';
import { errorHandler } from '../utils/errorHandler.js';

const cache = getCacheManager();

export async function myNewTool(args) {
  const { param1, param2 } = args;
  
  try {
    // Implementation
    const result = await doSomething(param1, param2);
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(result, null, 2)
      }]
    };
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: `Error: ${error.message}`
      }]
    };
  }
}
```

### 2. Register Tool in index.js

Add to the legacy tools array:
```javascript
{
  name: 'my_new_tool',
  description: 'Description of what the tool does',
  inputSchema: {
    type: 'object',
    properties: {
      param1: {
        type: 'string',
        description: 'First parameter'
      },
      param2: {
        type: 'boolean',
        description: 'Second parameter',
        default: true
      }
    },
    required: ['param1']
  }
}
```

Add to the switch statement:
```javascript
case 'my_new_tool':
  return await myNewTool(args);
```

### 3. Add Tests

Create test file `tests/unit/myNewTool.test.js`:
```javascript
import { describe, it, expect } from '@jest/globals';
import { myNewTool } from '../../src/tools/myNewTool.js';

describe('myNewTool', () => {
  it('should return expected result', async () => {
    const result = await myNewTool({
      param1: 'test',
      param2: true
    });
    
    expect(result.content[0].type).toBe('text');
    expect(JSON.parse(result.content[0].text)).toHaveProperty('success');
  });
});
```

## Testing

### Running Tests
```bash
# Run all tests
npm test

# Run specific test file
npm test -- myNewTool.test.js

# Run with coverage
npm run test:coverage

# Run integration tests
npm run test:integration
```

### Test Structure
```javascript
describe('ComponentName', () => {
  beforeEach(() => {
    // Setup
  });
  
  afterEach(() => {
    // Cleanup
  });
  
  describe('methodName', () => {
    it('should do something', async () => {
      // Arrange
      const input = { /* ... */ };
      
      // Act
      const result = await methodName(input);
      
      // Assert
      expect(result).toEqual(expected);
    });
  });
});
```

## Debugging

### 1. Enable Debug Logging
```javascript
// Add debug statements
console.error('[DEBUG] Widget analysis started:', widgetCode.substring(0, 50));
```

### 2. Using VS Code Debugger

Create `.vscode/launch.json`:
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug MCP Service",
      "program": "${workspaceFolder}/src/index.js",
      "console": "integratedTerminal"
    }
  ]
}
```

### 3. Testing Individual Tools
```bash
# Use the test script
node test-all-tools.js

# Or test specific tool
node -e "import('./src/tools/widgetAnalyzer.js').then(m => m.analyzeWidget({widgetCode: 'Container()'}).then(console.log))"
```

## Performance Optimization

### 1. Cache Optimization
- Monitor cache hit rates with `flutter_status`
- Adjust TTL values based on usage patterns
- Use cache warming for frequently accessed data

### 2. Token Optimization
```javascript
// Efficient token usage
const result = await analyze(code);
const truncated = tokenManager.smartTruncate(result, maxTokens);
```

### 3. Database Optimization
```sql
-- Add indexes for frequently queried fields
CREATE INDEX idx_cache_type_key ON cache(type, key);
CREATE INDEX idx_cache_expires ON cache(expires_at);
```

### 4. Memory Management
- Monitor memory usage
- Implement cleanup routines
- Use streaming for large data

## Contributing

### 1. Code Review Checklist
- [ ] Tests pass
- [ ] Documentation updated
- [ ] No hardcoded values
- [ ] Error handling implemented
- [ ] Cache strategy defined
- [ ] Token limits respected

### 2. Pull Request Template
```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No console.log statements
```

### 3. Release Process
1. Update version in package.json
2. Update CHANGELOG.md
3. Run full test suite
4. Build and test Docker image
5. Tag release
6. Publish to npm (if applicable)

## Troubleshooting

### Common Issues

#### 1. SQLite Errors
```bash
# Rebuild native dependencies
npm rebuild better-sqlite3
```

#### 2. Memory Issues
```javascript
// Increase Node.js memory
node --max-old-space-size=4096 src/index.js
```

#### 3. Cache Corruption
```bash
# Clear cache
rm -rf .cache
mkdir .cache
```

## Resources

- [MCP SDK Documentation](https://github.com/modelcontextprotocol/sdk)
- [Flutter API Reference](https://api.flutter.dev/)
- [Pub.dev API](https://pub.dev/help/api)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)