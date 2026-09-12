# Flutter MCP Service v2.0: Advanced Tools for Flutter Development

![Flutter MCP Service](https://img.shields.io/badge/Flutter%20MCP%20Service-v2.0-blue.svg)  
[![Releases](https://img.shields.io/badge/Releases-latest-orange.svg)](https://github.com/tdikelt/flutter_mcp_2/releases)

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Integration with Claude Desktop / Cursor](#integration-with-claude-desktop--cursor)
- [Complete Tool List & Commands](#complete-tool-list--commands)
- [Contributing](#contributing)
- [License](#license)
- [Contact](#contact)

## Overview

Flutter MCP Service v2.0 offers advanced development tools using the Model Context Protocol (MCP). This version focuses on intelligent caching, efficient token management, and seamless integration with official documentation. It aims to enhance your Flutter development experience, making it faster and more reliable.

## Quick Start

To get started quickly, follow these simple steps:

### Installation

1. **Clone the repository**  
   Open your terminal and run the following command:
   ```bash
   git clone https://github.com/dvillegastech/flutter_mcp_2.git
   cd flutter_mcp_2
   ```

2. **Install dependencies**  
   Use npm to install the necessary packages:
   ```bash
   npm install
   ```

3. **Initialize cache**  
   Create a cache directory:
   ```bash
   mkdir -p .cache
   ```

4. **Run health check**  
   Ensure everything is working correctly:
   ```bash
   npm run health-check
   ```

5. **Start service**  
   Launch the service with:
   ```bash
   npm start
   ```

For more detailed instructions, visit the [Releases section](https://github.com/tdikelt/flutter_mcp_2/releases).

## Integration with Claude Desktop / Cursor

To integrate with Claude Desktop or Cursor, add the following configuration to your MCP configuration file:

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

Replace `"/absolute/path/to/flutter_mcp_service/src/index.js"` with the actual path to your service file.

## Complete Tool List & Commands

### Unified Tools (v2.0)

The following tools are available in this version:

#### 1. flutter_status
This tool checks the service health and provides cache statistics. Use the command below to check:

```
@flutter-mcp use flutter_status to check service health
```

#### 2. flutter_search
Use this tool for universal search across Flutter/Dart documentation, packages, and examples. Access it with:

```
@flutter-mcp use flutter_search to find documentation and examples
```

### Additional Tools

- **flutter_cache**: Manage and clear the cache.
- **flutter_token**: Handle token management for secure access.
- **flutter_docs**: Access official documentation directly from your terminal.

### Tool Commands

Here are some basic commands to get you started with the tools:

```bash
@flutter-mcp use flutter_cache to manage cache
@flutter-mcp use flutter_token to manage tokens
@flutter-mcp use flutter_docs to access documentation
```

## Contributing

We welcome contributions to improve the Flutter MCP Service. Here’s how you can help:

1. **Fork the repository**: Click the "Fork" button on the top right of the page.
2. **Create a new branch**: Use `git checkout -b feature/YourFeatureName`.
3. **Make your changes**: Implement your feature or fix a bug.
4. **Commit your changes**: Use `git commit -m "Add your message here"`.
5. **Push to the branch**: Use `git push origin feature/YourFeatureName`.
6. **Create a pull request**: Submit your changes for review.

Please ensure your code adheres to the existing style and passes all tests.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Contact

For questions or support, please contact the maintainer:

- **Name**: [Your Name]
- **Email**: your.email@example.com
- **GitHub**: [Your GitHub Profile](https://github.com/yourusername)

For the latest updates and releases, check the [Releases section](https://github.com/tdikelt/flutter_mcp_2/releases).