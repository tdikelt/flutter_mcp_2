# Development Guide

Want to contribute or just understand how this works? Here's what you need to know.

## Getting Started

```bash
git clone https://github.com/dvillegastech/flutter_mcp_2.git
cd flutter_mcp_service
npm install
npm run dev
```

That's it. The dev script watches for changes and restarts automatically.

## Project Layout

```
src/
├── tools/           # Each tool is a separate file
├── services/        # External API integrations  
├── utils/           # Shared utilities
├── cache/           # Cache implementation
└── index.js         # Main entry point & router
```

## Adding a New Tool

Let's say you want to add a tool that checks for unused dependencies.

### 1. Create the tool

`src/tools/dependencyChecker.js`:
```javascript
export async function checkUnusedDependencies(args) {
  const { packageJsonPath } = args;
  
  // Your logic here
  const unusedDeps = await findUnusedDependencies(packageJsonPath);
  
  return {
    content: [{
      type: 'text',
      text: JSON.stringify({ unused: unusedDeps }, null, 2)
    }]
  };
}
```

### 2. Register it

In `index.js`, add to the tools array:
```javascript
{
  name: 'check_unused_dependencies',
  description: 'Find unused npm dependencies',
  inputSchema: {
    type: 'object',
    properties: {
      packageJsonPath: {
        type: 'string',
        description: 'Path to package.json'
      }
    },
    required: ['packageJsonPath']
  }
}
```

And add the handler:
```javascript
case 'check_unused_dependencies':
  return await checkUnusedDependencies(args);
```

### 3. Test it

Create a quick test:
```javascript
// test-deps.js
import { checkUnusedDependencies } from './src/tools/dependencyChecker.js';

const result = await checkUnusedDependencies({
  packageJsonPath: './package.json'
});
console.log(result);
```

## Working with Cache

The cache is automatic. Just wrap your expensive operations:

```javascript
const cached = await cache.get('myTool', args);
if (cached) return cached;

const result = await expensiveOperation();
await cache.set('myTool', args, result);
return result;
```

## Debugging Tips

### 1. Console logs work fine
```javascript
console.error('[DEBUG] Processing widget:', widgetName);
```
Output goes to stderr so it doesn't interfere with MCP protocol.

### 2. Test tools standalone
```javascript
node -e "import('./src/tools/widgetAnalyzer.js').then(m => m.analyzeWidget({widgetCode: 'Container()'}).then(console.log))"
```

### 3. Check the cache
```bash
sqlite3 .cache/flutter_mcp.db "SELECT key, hit_count FROM cache ORDER BY hit_count DESC LIMIT 10;"
```

### 4. Monitor performance
```javascript
const start = Date.now();
// ... your code ...
console.error(`[PERF] Operation took ${Date.now() - start}ms`);
```

## Common Patterns

### Parallel API calls
```javascript
const [flutterDocs, pubInfo] = await Promise.all([
  fetchFlutterDocs(widget),
  fetchPubInfo(widget)
]);
```

### Error handling
```javascript
try {
  return await riskyOperation();
} catch (error) {
  console.error('Operation failed:', error);
  return {
    content: [{
      type: 'text',
      text: `Error: ${error.message}`
    }]
  };
}
```

### Token-aware responses
```javascript
const result = await analyze(code);
const truncated = tokenManager.smartTruncate(result, maxTokens);
```

## Testing

Run the health check:
```bash
npm run health-check
```

Test all tools:
```bash
node test-all-tools.js
```

Integration tests (if you add jest):
```bash
npm run test:integration
```

## Performance Guidelines

1. **Cache everything cacheable** - API responses, analysis results
2. **Fail fast** - Validate inputs early
3. **Parallelize** - Don't await sequentially if you can avoid it
4. **Stream when possible** - For large responses, consider streaming

## Code Style

We're not super strict, but:
- Use async/await, not callbacks
- Meaningful variable names > comments
- Early returns > deep nesting
- Errors should be helpful to users

## Deployment

For production:
```bash
NODE_ENV=production npm start
```

Or use Docker:
```bash
docker build -t flutter-mcp .
docker run flutter-mcp
```

## Troubleshooting

**"Cannot find module"** - Delete node_modules and reinstall
**"Database locked"** - Another instance running? Check processes
**"Circuit breaker open"** - External service is down, wait a minute
**Slow responses** - Check cache hit rate with `flutter_status`

## PRs Welcome

Found a bug? Want to add a feature? 
1. Fork it
2. Fix/add it
3. Test it
4. PR it

We'll review and merge if it makes sense. Keep changes focused - one feature per PR.

Questions? Open an issue on GitHub.