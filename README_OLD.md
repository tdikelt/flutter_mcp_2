# Flutter MCP Service

A powerful MCP (Model Context Protocol) service designed specifically for Flutter developers. This service provides advanced widget analysis, validation against official documentation, pub.dev package analysis, and improvement suggestions based on Flutter best practices.

## Key Features

### 🔍 Widget Analysis (`analyze_widget`)
- Analyzes Flutter widget code for performance issues
- Checks accessibility and best practices
- Calculates complexity and nesting metrics
- Detects common state management issues

### 📚 Documentation Validation (`validate_flutter_docs`)
- Validates code against official Flutter documentation
- Detects deprecated APIs and suggests replacements
- Verifies correct usage of widgets and properties
- Provides links to relevant documentation

### 📦 Pub.dev Package Analysis (`analyze_pub_package`)
- Analyzes package quality and popularity
- Verifies Flutter compatibility
- Reviews dependencies and detects outdated versions
- Performs basic security checks

### 💡 Improvement Suggestions (`suggest_improvements`)
- Suggests performance improvements
- Accessibility recommendations
- Maintainability and architecture improvements
- Step-by-step implementation guides

### ⚡ Performance Analysis (`analyze_performance`)
- Detects unnecessary rebuild issues
- Identifies potential memory leaks
- Finds performance bottlenecks
- Calculates performance metrics

## Installation

```bash
# Clone the repository
git clone <repository-url>
cd flutter_mcp_service

# Install dependencies
npm install
```

## Usage

### Start the service

```bash
npm start
```

### Development mode (with auto-reload)

```bash
npm run dev
```

## Claude Desktop Integration

Add the following configuration to your Claude Desktop configuration file:

```json
{
  "mcpServers": {
    "flutter-mcp": {
      "command": "node",
      "args": ["/path/to/flutter_mcp_service/src/index.js"]
    }
  }
}
```

## Usage Examples

### Analyze a widget

```javascript
{
  "tool": "analyze_widget",
  "arguments": {
    "widgetCode": "class MyWidget extends StatelessWidget {...}",
    "checkAccessibility": true,
    "checkPerformance": true
  }
}
```

### Validate against official documentation

```javascript
{
  "tool": "validate_flutter_docs",
  "arguments": {
    "code": "Container(color: Colors.red, decoration: BoxDecoration(...))",
    "widgetType": "Container"
  }
}
```

### Analyze a pub.dev package

```javascript
{
  "tool": "analyze_pub_package",
  "arguments": {
    "packageName": "provider",
    "checkDependencies": true,
    "checkScores": true
  }
}
```

## Project Structure

```
flutter_mcp_service/
├── src/
│   ├── index.js              # Main entry point
│   ├── tools/                # Tool implementations
│   │   ├── widgetAnalyzer.js
│   │   ├── docsValidator.js
│   │   ├── pubAnalyzer.js
│   │   ├── improvementSuggester.js
│   │   └── performanceAnalyzer.js
│   ├── utils/                # Shared utilities
│   │   ├── parser.js
│   │   ├── codeAnalyzer.js
│   │   └── treeParser.js
│   └── validators/           # Validators and patterns
│       ├── bestPractices.js
│       ├── apiPatterns.js
│       └── patterns.js
├── tests/                    # Unit tests
├── docs/                     # Additional documentation
├── package.json
└── README.md
```

## Detected Best Practices

- **Performance**: const constructors usage, ListView.builder, keys in lists
- **Accessibility**: Semantics widgets, image labels, tooltips
- **Memory**: Controller disposal, subscription cancellation
- **Architecture**: Layer separation, design patterns, immutable state

## Contributing

Contributions are welcome! Please:
1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.