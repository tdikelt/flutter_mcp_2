# Flutter MCP Service Architecture

## Overview

Flutter MCP Service v2.0 is a comprehensive Model Context Protocol (MCP) service designed specifically for Flutter developers. It provides advanced analysis, validation, and code generation capabilities with enterprise-grade features.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        Client Applications                   │
│                   (Claude Desktop, VS Code, etc.)           │
└─────────────────────────────────────────────────────────────┘
                                 │
                                 │ MCP Protocol
                                 ▼
┌─────────────────────────────────────────────────────────────┐
│                         MCP Server                          │
│  ┌─────────────────────────────────────────────────────┐  │
│  │                    Request Handler                   │  │
│  │              (index.js - Tool Router)               │  │
│  └─────────────────────────────────────────────────────┘  │
│                              │                              │
│  ┌───────────────┬───────────┴────────────┬──────────────┐│
│  │ Unified Tools │    Legacy Tools        │   Services   ││
│  │               │                        │              ││
│  │ • flutter_    │ • analyze_widget      │ • Flutter    ││
│  │   search      │ • validate_flutter_   │   Docs       ││
│  │ • flutter_    │   docs                │ • Cache      ││
│  │   analyze     │ • analyze_pub_package │   Manager    ││
│  │ • flutter_    │ • suggest_            │ • Token      ││
│  │   status      │   improvements        │   Manager    ││
│  │               │ • [14 more tools]     │ • Error      ││
│  │               │                        │   Handler    ││
│  └───────────────┴────────────────────────┴──────────────┘│
│                              │                              │
│  ┌─────────────────────────────────────────────────────┐  │
│  │                    Core Systems                      │  │
│  │                                                      │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────────────┐ │  │
│  │  │  Cache   │  │  Token   │  │  Error Handler   │ │  │
│  │  │  System  │  │  Manager │  │  & Circuit       │ │  │
│  │  │          │  │          │  │  Breaker         │ │  │
│  │  │ • SQLite │  │ • GPT-3  │  │                  │ │  │
│  │  │ • TTL    │  │   Encoder│  │ • Retry Logic    │ │  │
│  │  │ • Memory │  │ • Smart  │  │ • Rate Limiting  │ │  │
│  │  │   Cache  │  │   Truncate│ │ • Logging        │ │  │
│  │  └──────────┘  └──────────┘  └──────────────────┘ │  │
│  └─────────────────────────────────────────────────────┘  │
│                              │                              │
│  ┌─────────────────────────────────────────────────────┐  │
│  │              External Integrations                   │  │
│  │                                                      │  │
│  │  • api.flutter.dev (Official Documentation)         │  │
│  │  • pub.dev (Package Repository)                     │  │
│  │  • api.dart.dev (Dart Documentation)               │  │
│  └─────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Component Architecture

### 1. **MCP Server Layer**
- **Purpose**: Handles MCP protocol communication
- **Components**:
  - `index.js`: Main entry point and request router
  - Tool registration and dispatch
  - Error handling and response formatting

### 2. **Tool Layer**

#### Unified Tools (New in v2.0)
- **flutter_search**: Universal search across Flutter ecosystem
- **flutter_analyze**: Smart analysis and documentation fetcher
- **flutter_status**: Health check and system status

#### Legacy Tools (Backward Compatible)
- Widget analysis and validation
- Performance monitoring
- Architecture compliance checking
- Test generation
- Bundle size analysis
- And 9 more specialized tools

### 3. **Core Systems**

#### Cache Manager
```javascript
class CacheManager {
  - SQLite persistent storage
  - In-memory cache (NodeCache)
  - TTL-based expiration
  - LRU eviction policy
  - Size-based cleanup
  - Statistics tracking
}
```

#### Token Manager
```javascript
class TokenManager {
  - Accurate token counting (GPT-3 encoder)
  - Smart truncation algorithms
  - Structure-preserving truncation
  - Token budget management
  - Content prioritization
}
```

#### Error Handler
```javascript
class RobustErrorHandler {
  - Circuit breaker pattern
  - Exponential backoff retry
  - Service-specific breakers
  - Error logging and statistics
  - Timeout protection
}
```

### 4. **Service Layer**

#### Flutter Docs Service
- Fetches official Flutter/Dart documentation
- Parses and structures API documentation
- Handles package documentation from pub.dev
- Rate-limited requests
- HTML parsing with Cheerio

## Data Flow

### Request Processing
1. Client sends MCP request
2. Server validates and routes to appropriate tool
3. Tool checks cache for existing results
4. If cache miss, tool executes with error protection
5. External API calls go through circuit breaker
6. Results are processed and token-limited
7. Results are cached with appropriate TTL
8. Response sent back to client

### Caching Strategy
```
Request → Memory Cache → SQLite Cache → External API
   ↓          ↓              ↓              ↓
Response ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← Result
```

## Design Patterns

### 1. **Singleton Pattern**
- Cache Manager
- Token Manager
- Error Handler
- Flutter Docs Service

### 2. **Decorator Pattern**
- `@withErrorHandling` for automatic error protection
- `withCache` for automatic caching

### 3. **Strategy Pattern**
- Token truncation strategies
- Cache eviction policies

### 4. **Circuit Breaker Pattern**
- Prevents cascading failures
- Automatic recovery
- Service isolation

### 5. **Repository Pattern**
- Cache abstraction
- Data access layer

## Performance Optimizations

### 1. **Parallel Processing**
- Concurrent API requests when possible
- Promise.all for multiple searches
- Non-blocking I/O

### 2. **Intelligent Caching**
- Multi-level cache (memory + disk)
- Service-specific TTLs
- Smart invalidation

### 3. **Token Optimization**
- Early token counting
- Progressive truncation
- Priority-based content selection

### 4. **Rate Limiting**
- 2 requests/second to external APIs
- Request queuing
- Jitter for distributed requests

## Security Considerations

### 1. **Input Validation**
- Schema validation for all inputs
- SQL injection prevention (parameterized queries)
- XSS prevention in HTML parsing

### 2. **API Key Management**
- No hardcoded credentials
- Environment variable support
- Secure storage recommendations

### 3. **Error Information**
- No sensitive data in error messages
- Structured logging
- Debug mode controls

## Scalability

### 1. **Horizontal Scaling**
- Stateless design
- Independent service instances
- Shared cache capability

### 2. **Resource Management**
- Automatic cache cleanup
- Memory usage monitoring
- Connection pooling

### 3. **Performance Monitoring**
- Built-in metrics collection
- Cache hit rates
- Error rates by service

## Future Enhancements

### 1. **Planned Features**
- WebSocket support
- Real-time documentation updates
- AI-powered code suggestions
- Custom rule engine

### 2. **Integration Points**
- CI/CD pipeline integration
- IDE plugin support
- Custom analyzer rules

### 3. **Performance Goals**
- Sub-100ms response time
- 95%+ cache hit rate
- 99.9% uptime target