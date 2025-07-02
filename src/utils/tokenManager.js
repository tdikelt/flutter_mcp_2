import { encode } from 'gpt-3-encoder';

export class TokenManager {
  constructor(options = {}) {
    this.maxTokens = options.maxTokens || 4000;
    this.approximationRatio = 1.3; // Average tokens per word
  }

  // Accurate token counting using GPT-3 encoder
  countTokens(text) {
    try {
      return encode(text).length;
    } catch (error) {
      // Fallback to approximation if encoding fails
      return this.approximateTokens(text);
    }
  }

  // Fast approximation for quick estimates
  approximateTokens(text) {
    const words = text.split(/\s+/).length;
    return Math.ceil(words * this.approximationRatio);
  }

  // Check if text is within token limit
  isWithinLimit(text, limit = this.maxTokens) {
    return this.countTokens(text) <= limit;
  }

  // Truncate text to fit within token limit
  truncateToLimit(text, limit = this.maxTokens, options = {}) {
    const {
      preserveStructure = true,
      addEllipsis = true,
      priority = 'start' // 'start', 'end', or 'balanced'
    } = options;

    const currentTokens = this.countTokens(text);
    if (currentTokens <= limit) {
      return text;
    }

    // Calculate how much to keep
    const ratio = limit / currentTokens;
    const estimatedLength = Math.floor(text.length * ratio * 0.9); // 90% to be safe

    let truncated;
    switch (priority) {
      case 'end':
        truncated = text.substring(text.length - estimatedLength);
        if (addEllipsis) truncated = '...' + truncated;
        break;
      case 'balanced':
        const halfLength = Math.floor(estimatedLength / 2);
        const start = text.substring(0, halfLength);
        const end = text.substring(text.length - halfLength);
        truncated = start + (addEllipsis ? '\n...[truncated]...\n' : '\n') + end;
        break;
      case 'start':
      default:
        truncated = text.substring(0, estimatedLength);
        if (addEllipsis) truncated += '...';
    }

    // Fine-tune to ensure we're under the limit
    while (this.countTokens(truncated) > limit && truncated.length > 10) {
      truncated = truncated.substring(0, truncated.length - 10);
    }

    return truncated;
  }

  // Smart truncation for structured content (JSON, code, etc.)
  smartTruncate(content, limit = this.maxTokens) {
    if (typeof content === 'string') {
      return this.truncateToLimit(content, limit);
    }

    if (typeof content === 'object') {
      return this.truncateObject(content, limit);
    }

    return String(content);
  }

  // Truncate objects intelligently
  truncateObject(obj, limit) {
    const priorityKeys = ['summary', 'description', 'title', 'name', 'error', 'message'];
    const deprioritizeKeys = ['metadata', 'debug', 'raw', 'internal'];
    
    // Start with high-priority fields
    let result = {};
    let currentTokens = 2; // Account for {}

    // Add priority fields first
    for (const key of priorityKeys) {
      if (obj[key] !== undefined) {
        const value = this.truncateValue(obj[key], Math.floor(limit * 0.3));
        const valueTokens = this.countTokens(JSON.stringify({ [key]: value }));
        
        if (currentTokens + valueTokens <= limit) {
          result[key] = value;
          currentTokens += valueTokens;
        }
      }
    }

    // Add other fields
    for (const [key, value] of Object.entries(obj)) {
      if (!priorityKeys.includes(key) && !deprioritizeKeys.includes(key)) {
        const truncatedValue = this.truncateValue(value, Math.floor((limit - currentTokens) * 0.5));
        const valueTokens = this.countTokens(JSON.stringify({ [key]: truncatedValue }));
        
        if (currentTokens + valueTokens <= limit) {
          result[key] = truncatedValue;
          currentTokens += valueTokens;
        }
      }
    }

    // Add deprioritized fields if space remains
    for (const key of deprioritizeKeys) {
      if (obj[key] !== undefined && currentTokens < limit * 0.9) {
        const remainingTokens = limit - currentTokens;
        const value = this.truncateValue(obj[key], Math.floor(remainingTokens * 0.8));
        const valueTokens = this.countTokens(JSON.stringify({ [key]: value }));
        
        if (currentTokens + valueTokens <= limit) {
          result[key] = value;
          currentTokens += valueTokens;
        }
      }
    }

    return result;
  }

  // Truncate individual values based on type
  truncateValue(value, limit) {
    if (typeof value === 'string') {
      return this.truncateToLimit(value, limit);
    }
    
    if (Array.isArray(value)) {
      const itemLimit = Math.floor(limit / Math.max(value.length, 1));
      const truncated = value
        .slice(0, Math.min(value.length, 10)) // Max 10 items
        .map(item => this.truncateValue(item, itemLimit));
      
      if (value.length > truncated.length) {
        truncated.push(`... and ${value.length - truncated.length} more items`);
      }
      
      return truncated;
    }
    
    if (typeof value === 'object' && value !== null) {
      return this.truncateObject(value, limit);
    }
    
    return value;
  }

  // Split large content into chunks
  splitIntoChunks(text, chunkSize = this.maxTokens) {
    const chunks = [];
    const lines = text.split('\n');
    let currentChunk = '';
    let currentTokens = 0;

    for (const line of lines) {
      const lineTokens = this.approximateTokens(line);
      
      if (currentTokens + lineTokens > chunkSize && currentChunk) {
        chunks.push(currentChunk.trim());
        currentChunk = '';
        currentTokens = 0;
      }
      
      currentChunk += line + '\n';
      currentTokens += lineTokens;
    }

    if (currentChunk) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }

  // Get token budget information
  getTokenBudget(used, total = this.maxTokens) {
    return {
      used,
      total,
      remaining: total - used,
      percentage: Math.round((used / total) * 100),
      withinBudget: used <= total
    };
  }
}

// Singleton instance
let tokenManagerInstance = null;

export function getTokenManager(options) {
  if (!tokenManagerInstance) {
    tokenManagerInstance = new TokenManager(options);
  }
  return tokenManagerInstance;
}