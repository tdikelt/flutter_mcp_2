# Flutter MCP Service v2.0

Advanced Flutter development tools via Model Context Protocol (MCP) with intelligent caching, token management, and official documentation integration.

## 🚀 Quick Start

### Installation
```bash
# Clone the repository
git clone https://github.com/dvillegastech/flutter_mcp_2.git
cd flutter_mcp_service

# Install dependencies
npm install

# Initialize cache
mkdir -p .cache

# Run health check
npm run health-check

# Start service
npm start
```

### Integration with Claude Desktop / Cursor

Add to your MCP configuration file:
```json
{
  "mcpServers": {
    "flutter-mcp": {
      "command": "node",
      "args": ["/absolute/path/to/flutter_mcp_service/src/index.js"]
    }
  }
}
```

## 📋 Complete Tool List & Commands

### 🆕 Unified Tools (v2.0)

#### 1. flutter_status
Check service health and cache statistics.
```
@flutter-mcp use flutter_status to check service health
```

#### 2. flutter_search
Universal search across Flutter/Dart documentation, packages, and examples.
```
@flutter-mcp use flutter_search with query "Container" and limit 5
@flutter-mcp use flutter_search to find ListView examples
```

Parameters:
- `query` (required): Search term
- `limit` (optional): Max results (default: 10)
- `maxTokens` (optional): Response size limit (default: 4000)

#### 3. flutter_analyze
Smart Flutter documentation fetcher and code analyzer.
```
@flutter-mcp use flutter_analyze with identifier "Container"
@flutter-mcp use flutter_analyze with identifier "Container" and this code:
Container(
  width: 100,
  height: 100,
  color: Colors.blue,
)
```

Parameters:
- `identifier` (required): Widget/class name or package
- `code` (optional): Code to analyze
- `topic` (optional): "all", "docs", "analysis", "examples" (default: "all")
- `maxTokens` (optional): Response size limit
- `includeExamples` (optional): Include code examples (default: true)
- `includeAnalysis` (optional): Include code analysis (default: true)

### 🔧 Legacy Tools (Backward Compatible)

#### 4. analyze_widget
Analyze Flutter widget code for best practices, performance, and accessibility.
```
@flutter-mcp use analyze_widget with this widgetCode:
class MyWidget extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      child: Text('Hello World'),
    );
  }
}
```

Parameters:
- `widgetCode` (required): Flutter widget code
- `checkAccessibility` (optional): Check accessibility (default: true)
- `checkPerformance` (optional): Check performance (default: true)

#### 5. validate_flutter_docs
Validate code against official Flutter documentation.
```
@flutter-mcp use validate_flutter_docs with this code:
Container(
  color: Colors.red,
  decoration: BoxDecoration(color: Colors.blue), // This will be flagged
)
```

Parameters:
- `code` (required): Flutter/Dart code
- `widgetType` (optional): Specific widget to focus on

#### 6. analyze_pub_package
Analyze packages from pub.dev for quality and compatibility.
```
@flutter-mcp use analyze_pub_package with packageName "provider"
@flutter-mcp use analyze_pub_package with packageName "dio" and checkDependencies true
```

Parameters:
- `packageName` (required): Package name from pub.dev
- `checkDependencies` (optional): Analyze dependencies (default: true)
- `checkScores` (optional): Retrieve pub.dev scores (default: true)

#### 7. suggest_improvements
Get improvement suggestions based on Flutter best practices.
```
@flutter-mcp use suggest_improvements for this code:
ListView(
  children: List.generate(1000, (i) => Text('Item $i')),
)
```

Parameters:
- `code` (required): Flutter code
- `focusArea` (optional): "performance", "accessibility", "maintainability", "all"

#### 8. analyze_performance
Analyze Flutter widget tree for performance issues.
```
@flutter-mcp use analyze_performance with this widgetTree:
Column(
  children: [
    for (int i = 0; i < 100; i++)
      Container(child: Text('Item $i')),
  ],
)
```

Parameters:
- `widgetTree` (required): Widget tree code
- `checkRebuildOptimization` (optional): Check rebuilds (default: true)
- `checkMemoryLeaks` (optional): Check memory leaks (default: true)

#### 9. analyze_architecture
Analyze project architecture compliance.
```
@flutter-mcp use analyze_architecture with projectStructure {
  "lib": {
    "features": ["auth", "home", "profile"],
    "core": ["network", "database"],
    "shared": ["widgets", "utils"]
  }
} and pattern "clean"
```

Parameters:
- `projectStructure` (required): Project directory structure
- `pattern` (optional): "clean", "mvvm", "mvc", "auto"
- `checkDependencies` (optional): Check dependency violations (default: true)

#### 10. analyze_bundle_size
Analyze app bundle size with optimization recommendations.
```
@flutter-mcp use analyze_bundle_size with buildPath "/path/to/build" and platform "android"
```

Parameters:
- `buildPath` (required): Path to build output
- `platform` (optional): "android", "ios", "web", "all"
- `includeAssets` (optional): Include asset analysis (default: true)

#### 11. generate_tests
Generate comprehensive Flutter tests.
```
@flutter-mcp use generate_tests for this widgetCode:
class CounterButton extends StatelessWidget {
  final VoidCallback onPressed;
  final int count;
  
  const CounterButton({required this.onPressed, required this.count});
  
  @override
  Widget build(BuildContext context) {
    return ElevatedButton(
      onPressed: onPressed,
      child: Text('Count: $count'),
    );
  }
}
```

Parameters:
- `widgetCode` (required): Widget code
- `testType` (optional): "unit", "widget", "integration", "golden", "all"
- `includeAccessibility` (optional): Include accessibility tests (default: true)

#### 12. trace_state
Trace state flow and rebuilds in Flutter widgets.
```
@flutter-mcp use trace_state with this widgetCode:
class MyStatefulWidget extends StatefulWidget {
  // ... widget code
}
```

Parameters:
- `widgetCode` (required): Widget code
- `traceRebuildPaths` (optional): Trace rebuilds (default: true)
- `generateVisualization` (optional): Generate visualization (default: true)

#### 13. generate_clean_architecture
Generate Clean Architecture structure.
```
@flutter-mcp use generate_clean_architecture with projectName "todo_app" and features ["auth", "todos", "settings"]
```

Parameters:
- `projectName` (required): Project/feature name
- `features` (required): List of features
- `stateManagement` (optional): "riverpod", "bloc", "provider", "getx"
- `includeDI` (optional): Include dependency injection (default: true)

#### 14. generate_l10n
Generate localization setup with ARB files.
```
@flutter-mcp use generate_l10n with languages ["en", "es", "fr"]
```

Parameters:
- `languages` (required): Language codes to support
- `translations` (optional): Initial translations
- `includeRTL` (optional): Include RTL support (default: true)
- `includePluralization` (optional): Include pluralization (default: true)

#### 15. monitor_performance
Generate performance monitoring setup.
```
@flutter-mcp use monitor_performance with monitoringType "balanced"
```

Parameters:
- `monitoringType` (required): "comprehensive", "balanced", "lightweight"
- `includeNetwork` (optional): Monitor network (default: true)
- `includeMemory` (optional): Monitor memory (default: true)
- `includeAnalytics` (optional): Include analytics (default: true)

#### 16. diagnose_render_issues
Diagnose and fix rendering issues.
```
@flutter-mcp use diagnose_render_issues with this widgetCode:
Row(
  children: [
    Expanded(child: Text('Long text')),
    Container(width: double.infinity), // This will cause issues
  ],
)
```

Parameters:
- `widgetCode` (required): Widget code with issues
- `errorType` (optional): "overflow", "constraint", "layout", "all"
- `includeVisualization` (optional): Include debug visualization (default: true)

#### 17. analyze_test_coverage
Analyze test coverage with recommendations.
```
@flutter-mcp use analyze_test_coverage with coverageData {...} and targetCoverage 80
```

Parameters:
- `coverageData` (required): Coverage data from lcov
- `projectStructure` (required): Project file structure
- `targetCoverage` (optional): Target percentage (default: 80)
- `generateReport` (optional): Generate visual report (default: true)

## 🎯 Usage Examples

### Basic Widget Analysis
```
@flutter-mcp analyze this Flutter widget for issues:
Container(
  child: Column(
    children: List.generate(100, (i) => Text('Item $i')),
  ),
)
```

### Package Research
```
@flutter-mcp search for "state management" packages and analyze the top result
```

### Performance Optimization Workflow
```
1. @flutter-mcp analyze_performance for my widget tree
2. @flutter-mcp suggest_improvements based on performance issues
3. @flutter-mcp generate_tests for the optimized code
```

### Full Project Analysis
```
@flutter-mcp analyze_architecture for my project and suggest clean architecture improvements
```

## 🔧 Development Commands

```bash
# Development with auto-reload
npm run dev

# Run tests
npm test
npm run test:integration
npm run test:coverage

# Health check
npm run health-check

# Linting and formatting
npm run lint
npm run format

# Docker
npm run build:docker
npm run docker:run

# Clean cache
npm run clean
```

## 📊 Features

- **Intelligent Caching**: SQLite + in-memory cache with TTL
- **Token Management**: Smart truncation with GPT-3 encoder
- **Error Handling**: Circuit breaker pattern with retry logic
- **Rate Limiting**: Respectful API usage (2 req/sec)
- **Official Docs Integration**: Real-time Flutter/Dart documentation
- **Multi-platform**: npm, Docker, direct installation
- **Health Monitoring**: Built-in health checks and statistics

## 🏗️ Architecture

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for detailed architecture documentation.

## 🤝 Contributing

See [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) for development guidelines.

## 📄 License

MIT License - see LICENSE file for details.

## 🙏 Acknowledgments

- Flutter team for excellent documentation
- MCP SDK contributors
- Inspired by adamsmaka/flutter-mcp

---

Made with ❤️ for the Flutter community