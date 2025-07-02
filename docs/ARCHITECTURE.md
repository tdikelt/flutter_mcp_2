# Architecture Overview

This MCP service is built to help Flutter developers with code analysis, documentation lookup, and best practices. Here's how it all fits together.

## Core Design

The service follows a simple plugin architecture where each tool is independent and can be called via MCP protocol. Think of it as a toolbox where each tool does one thing well.

```
Client (Claude/Cursor) → MCP Protocol → Router → Tool → Response
```

## Key Components

### 1. Tools
Each tool lives in `src/tools/` and exports a single async function. Tools are self-contained - they handle their own validation, caching, and error handling.

**New unified tools (v2.0):**
- `flutter_search` - Universal search that's smart enough to know if you're looking for a widget, package, or example
- `flutter_analyze` - One-stop shop for docs and analysis
- `flutter_status` - Health check and stats

**Legacy tools:** Still around for backwards compatibility. Each focuses on a specific task like widget analysis, performance checks, or test generation.

### 2. Cache System
We use a two-level cache to keep things fast:
- **Memory cache**: Super fast, expires after 5 minutes
- **SQLite cache**: Persists between restarts, configurable TTL per data type

The cache is smart - it knows Flutter docs don't change often (24h TTL) but package info might (12h TTL).

### 3. Token Management
Since LLMs have token limits, we built a smart truncation system that:
- Counts tokens accurately using GPT-3 encoder
- Prioritizes important content (descriptions, examples > metadata)
- Maintains JSON structure when truncating objects

### 4. Error Handling
We implemented circuit breakers for external APIs. If pub.dev goes down, we won't keep hammering it - we'll back off and try again later. Each service has its own breaker so one failure doesn't affect others.

## Data Flow Example

Let's say you search for "Container":

1. **Request comes in** → Router sends to `flutter_search`
2. **Check cache** → Memory first, then SQLite
3. **Cache miss?** → Query multiple sources in parallel:
   - Flutter docs API
   - Pub.dev search
   - Local examples
4. **Process results** → Merge, rank by relevance
5. **Token check** → Truncate if needed
6. **Cache result** → Store for next time
7. **Return** → Send back to client

## External Services

We integrate with:
- `api.flutter.dev` - Official widget/class documentation
- `pub.dev` - Package info and search
- `api.dart.dev` - Dart core library docs

All external calls go through:
- Rate limiting (2 req/sec)
- Circuit breakers
- Retry with exponential backoff
- Response caching

## Performance Tricks

1. **Parallel requests** - When searching, we hit all sources at once
2. **Progressive loading** - Return partial results fast, details later
3. **Smart caching** - Different TTLs for different data types
4. **Lazy imports** - Tools only load what they need

## Security Notes

- No API keys stored in code
- Input validation on all tools
- SQL injection prevention via parameterized queries
- No execution of user code (analysis only)

## Extension Points

Want to add a new tool? Easy:

1. Create `src/tools/yourTool.js`
2. Export an async function that returns MCP response format
3. Register in `index.js`
4. Add to README

The beauty is each tool is independent - you can't break existing tools by adding new ones.

## Why These Choices?

- **SQLite over Redis**: Simpler deployment, no extra services
- **Node.js over Python**: Better MCP SDK support, async by default
- **Unified tools**: Learned from user feedback - fewer, smarter tools > many specific ones
- **Circuit breakers**: Production experience - external services will fail

That's the gist. The code is pretty readable if you want to dive deeper into any component.