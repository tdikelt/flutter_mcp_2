import { parseFlutterCode } from '../utils/parser.js';
import { getFlutterBestPractices } from '../validators/bestPractices.js';
import { getCacheManager } from '../cache/cacheManager.js';

const cache = getCacheManager();

export async function analyzeWidget(args) {
  const { widgetCode, checkAccessibility = true, checkPerformance = true } = args;
  
  // Check cache first
  const cacheKey = { widgetCode, checkAccessibility, checkPerformance };
  const cachedResult = await cache.get('widgetAnalysis', cacheKey);
  if (cachedResult) {
    return cachedResult;
  }
  
  const issues = [];
  const suggestions = [];
  const metrics = {
    complexity: 0,
    nestingLevel: 0,
    widgetCount: 0,
  };

  try {
    const widgetRegex = /(\w+)\s*\(/g;
    const widgets = [...widgetCode.matchAll(widgetRegex)].map(match => match[1]);
    metrics.widgetCount = widgets.length;

    const nestingLevel = calculateNestingLevel(widgetCode);
    metrics.nestingLevel = nestingLevel;

    if (checkAccessibility) {
      const accessibilityIssues = checkAccessibilityIssues(widgetCode);
      issues.push(...accessibilityIssues);
    }

    if (checkPerformance) {
      const performanceIssues = checkPerformanceIssues(widgetCode, widgets);
      issues.push(...performanceIssues);
    }

    const stateManagementIssues = checkStateManagement(widgetCode);
    issues.push(...stateManagementIssues);

    if (nestingLevel > 5) {
      suggestions.push({
        type: 'refactoring',
        message: 'Consider extracting nested widgets into separate components',
        severity: 'medium',
      });
    }

    if (!widgetCode.includes('const') && hasStaticWidgets(widgetCode)) {
      suggestions.push({
        type: 'performance',
        message: 'Use const constructors for widgets that don\'t change',
        severity: 'low',
      });
    }

    const result = {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            metrics,
            issues,
            suggestions,
            summary: generateSummary(metrics, issues, suggestions),
          }, null, 2),
        },
      ],
    };
    
    // Cache the result
    await cache.set('widgetAnalysis', cacheKey, result);
    
    return result;
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error analyzing widget: ${error.message}`,
        },
      ],
    };
  }
}

function calculateNestingLevel(code) {
  let maxLevel = 0;
  let currentLevel = 0;
  
  for (const char of code) {
    if (char === '(' || char === '{' || char === '[') {
      currentLevel++;
      maxLevel = Math.max(maxLevel, currentLevel);
    } else if (char === ')' || char === '}' || char === ']') {
      currentLevel--;
    }
  }
  
  return maxLevel;
}

function checkAccessibilityIssues(code) {
  const issues = [];
  
  if (code.includes('Image') && !code.includes('semanticLabel')) {
    issues.push({
      type: 'accessibility',
      message: 'Images should have semanticLabel for screen readers',
      line: findLineNumber(code, 'Image'),
      severity: 'medium',
    });
  }
  
  if (code.includes('IconButton') && !code.includes('tooltip')) {
    issues.push({
      type: 'accessibility',
      message: 'IconButton should have a tooltip for better accessibility',
      line: findLineNumber(code, 'IconButton'),
      severity: 'medium',
    });
  }
  
  if ((code.includes('GestureDetector') || code.includes('InkWell')) && !code.includes('Semantics')) {
    issues.push({
      type: 'accessibility',
      message: 'Interactive widgets should be wrapped with Semantics for screen readers',
      severity: 'high',
    });
  }
  
  return issues;
}

function checkPerformanceIssues(code, widgets) {
  const issues = [];
  
  if (code.includes('setState') && code.includes('build')) {
    const setStateCount = (code.match(/setState/g) || []).length;
    if (setStateCount > 3) {
      issues.push({
        type: 'performance',
        message: 'Multiple setState calls detected. Consider using state management solution',
        severity: 'medium',
      });
    }
  }
  
  if (code.includes('ListView') && !code.includes('ListView.builder')) {
    issues.push({
      type: 'performance',
      message: 'Use ListView.builder for better performance with large lists',
      severity: 'medium',
    });
  }
  
  const expensiveWidgets = ['BackdropFilter', 'Opacity', 'ClipPath'];
  expensiveWidgets.forEach(widget => {
    if (widgets.includes(widget)) {
      issues.push({
        type: 'performance',
        message: `${widget} is computationally expensive. Use sparingly or consider alternatives`,
        severity: 'low',
      });
    }
  });
  
  return issues;
}

function checkStateManagement(code) {
  const issues = [];
  
  if (code.includes('StatefulWidget') && !code.includes('dispose')) {
    issues.push({
      type: 'memory',
      message: 'StatefulWidget should implement dispose() to clean up resources',
      severity: 'high',
    });
  }
  
  if (code.includes('StreamController') && !code.includes('.close()')) {
    issues.push({
      type: 'memory',
      message: 'StreamController should be closed in dispose()',
      severity: 'high',
    });
  }
  
  return issues;
}

function hasStaticWidgets(code) {
  const staticWidgets = ['Text', 'Icon', 'Container', 'Padding', 'Center'];
  return staticWidgets.some(widget => code.includes(widget));
}

function findLineNumber(code, searchTerm) {
  const lines = code.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(searchTerm)) {
      return i + 1;
    }
  }
  return null;
}

function generateSummary(metrics, issues, suggestions) {
  const severityCounts = {
    high: issues.filter(i => i.severity === 'high').length,
    medium: issues.filter(i => i.severity === 'medium').length,
    low: issues.filter(i => i.severity === 'low').length,
  };
  
  return {
    overallHealth: calculateHealth(severityCounts),
    totalIssues: issues.length,
    criticalIssues: severityCounts.high,
    suggestions: suggestions.length,
    complexity: metrics.nestingLevel > 5 ? 'High' : metrics.nestingLevel > 3 ? 'Medium' : 'Low',
  };
}

function calculateHealth(severityCounts) {
  const score = 100 - (severityCounts.high * 20 + severityCounts.medium * 10 + severityCounts.low * 5);
  if (score >= 80) return 'Excellent';
  if (score >= 60) return 'Good';
  if (score >= 40) return 'Fair';
  return 'Needs Improvement';
}