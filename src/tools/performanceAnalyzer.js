import { parseWidgetTree } from '../utils/treeParser.js';

export async function analyzePerformance(args) {
  const { widgetTree, checkRebuildOptimization = true, checkMemoryLeaks = true } = args;
  
  const analysis = {
    rebuildIssues: [],
    memoryLeaks: [],
    performanceBottlenecks: [],
    optimizationSuggestions: [],
    metrics: {},
  };

  try {
    const treeStructure = parseWidgetTree(widgetTree);
    
    analysis.metrics = calculatePerformanceMetrics(treeStructure);
    
    if (checkRebuildOptimization) {
      analysis.rebuildIssues = detectRebuildIssues(widgetTree, treeStructure);
    }
    
    if (checkMemoryLeaks) {
      analysis.memoryLeaks = detectMemoryLeaks(widgetTree, treeStructure);
    }
    
    analysis.performanceBottlenecks = detectBottlenecks(widgetTree, treeStructure);
    analysis.optimizationSuggestions = generateOptimizations(analysis, treeStructure);

    const score = calculatePerformanceScore(analysis);
    const report = generatePerformanceReport(analysis, score);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            analysis,
            score,
            report,
            criticalIssues: getCriticalIssues(analysis),
          }, null, 2),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error analyzing performance: ${error.message}`,
        },
      ],
    };
  }
}

function calculatePerformanceMetrics(treeStructure) {
  return {
    totalWidgets: treeStructure.nodeCount,
    treeDepth: treeStructure.maxDepth,
    averageBranchingFactor: treeStructure.avgBranching,
    statefulWidgetCount: treeStructure.statefulCount,
    rebuildsPerFrame: estimateRebuilds(treeStructure),
    estimatedMemoryUsage: estimateMemoryUsage(treeStructure),
  };
}

function detectRebuildIssues(code, structure) {
  const issues = [];

  if (code.includes('setState') && !code.includes('if (mounted)')) {
    issues.push({
      type: 'unsafe_rebuild',
      severity: 'high',
      message: 'setState called without checking mounted state',
      location: 'setState usage',
      fix: 'Always check if (mounted) before setState',
    });
  }

  const setStateMatches = [...code.matchAll(/setState\s*\(\s*\(\)\s*\{[^}]*\}\s*\)/g)];
  setStateMatches.forEach((match, index) => {
    const stateUpdate = match[0];
    if (stateUpdate.length > 200) {
      issues.push({
        type: 'heavy_setState',
        severity: 'medium',
        message: 'Large setState callback detected',
        location: `setState #${index + 1}`,
        fix: 'Move complex logic outside setState callback',
      });
    }
  });

  if (!code.includes('const') && structure.statelessCount > 5) {
    issues.push({
      type: 'missing_const',
      severity: 'medium',
      message: 'Stateless widgets without const constructors',
      count: structure.statelessCount,
      fix: 'Use const constructors for static widgets',
    });
  }

  if (code.includes('StreamBuilder') && !code.includes('distinct')) {
    issues.push({
      type: 'unoptimized_stream',
      severity: 'low',
      message: 'StreamBuilder without distinct() may cause unnecessary rebuilds',
      fix: 'Use stream.distinct() to prevent duplicate rebuilds',
    });
  }

  const expensiveInBuild = ['MediaQuery.of', 'Theme.of', 'Navigator.of'];
  expensiveInBuild.forEach(call => {
    const callCount = (code.match(new RegExp(call.replace('.', '\\.'), 'g')) || []).length;
    if (callCount > 2) {
      issues.push({
        type: 'expensive_build_calls',
        severity: 'medium',
        message: `Multiple ${call} calls in build method`,
        count: callCount,
        fix: `Cache ${call} result in a variable`,
      });
    }
  });

  return issues;
}

function detectMemoryLeaks(code, structure) {
  const leaks = [];

  const disposableControllers = [
    'AnimationController', 'TextEditingController', 'ScrollController',
    'PageController', 'TabController', 'StreamController'
  ];

  disposableControllers.forEach(controller => {
    if (code.includes(controller)) {
      const hasDispose = code.includes('.dispose()');
      const properlyDisposed = new RegExp(`${controller}[^;]*\\.dispose\\(\\)`).test(code);
      
      if (!hasDispose || !properlyDisposed) {
        leaks.push({
          type: 'controller_leak',
          severity: 'high',
          controller,
          message: `${controller} may not be properly disposed`,
          fix: `Dispose ${controller} in dispose() method`,
        });
      }
    }
  });

  if (code.includes('StreamSubscription') && !code.includes('.cancel()')) {
    leaks.push({
      type: 'stream_leak',
      severity: 'high',
      message: 'StreamSubscription not cancelled',
      fix: 'Cancel StreamSubscription in dispose()',
    });
  }

  if (code.includes('addListener') && !code.includes('removeListener')) {
    leaks.push({
      type: 'listener_leak',
      severity: 'medium',
      message: 'Listener added but not removed',
      fix: 'Remove listeners in dispose()',
    });
  }

  const timerPattern = /Timer\s*\(/;
  if (timerPattern.test(code) && !code.includes('?.cancel()')) {
    leaks.push({
      type: 'timer_leak',
      severity: 'medium',
      message: 'Timer may not be cancelled',
      fix: 'Store Timer reference and cancel in dispose()',
    });
  }

  return leaks;
}

function detectBottlenecks(code, structure) {
  const bottlenecks = [];

  const expensiveWidgets = [
    { name: 'BackdropFilter', impact: 'very_high' },
    { name: 'Opacity', impact: 'high' },
    { name: 'ClipPath', impact: 'high' },
    { name: 'CustomPaint', impact: 'medium' },
    { name: 'ShaderMask', impact: 'high' },
  ];

  expensiveWidgets.forEach(({ name, impact }) => {
    if (code.includes(name)) {
      const count = (code.match(new RegExp(name, 'g')) || []).length;
      bottlenecks.push({
        type: 'expensive_widget',
        widget: name,
        impact,
        count,
        message: `${name} is computationally expensive`,
        suggestion: `Minimize usage of ${name} or use alternatives`,
      });
    }
  });

  if (structure.maxDepth > 10) {
    bottlenecks.push({
      type: 'deep_nesting',
      depth: structure.maxDepth,
      impact: 'medium',
      message: 'Deeply nested widget tree detected',
      suggestion: 'Extract widgets to reduce nesting',
    });
  }

  const buildMethodLength = code.match(/Widget\s+build\s*\([^)]*\)\s*\{([^}]*)\}/s)?.[1]?.length || 0;
  if (buildMethodLength > 1000) {
    bottlenecks.push({
      type: 'large_build_method',
      size: buildMethodLength,
      impact: 'high',
      message: 'Build method is too large',
      suggestion: 'Break down into smaller widget components',
    });
  }

  if (!code.includes('RepaintBoundary') && structure.hasCustomPaint) {
    bottlenecks.push({
      type: 'missing_repaint_boundary',
      impact: 'medium',
      message: 'CustomPaint without RepaintBoundary',
      suggestion: 'Wrap CustomPaint with RepaintBoundary',
    });
  }

  return bottlenecks;
}

function generateOptimizations(analysis, structure) {
  const optimizations = [];

  if (analysis.rebuildIssues.length > 0) {
    optimizations.push({
      category: 'Rebuild Optimization',
      priority: 'high',
      suggestions: [
        'Use const widgets where possible',
        'Implement shouldRebuild in custom widgets',
        'Use ValueListenableBuilder for targeted rebuilds',
        'Cache expensive computations',
      ],
    });
  }

  if (analysis.performanceBottlenecks.some(b => b.type === 'expensive_widget')) {
    optimizations.push({
      category: 'Widget Optimization',
      priority: 'high',
      suggestions: [
        'Replace Opacity with AnimatedOpacity for animations',
        'Use ColorFiltered instead of Opacity for static transparency',
        'Cache rendered images when using filters',
        'Use RepaintBoundary to isolate expensive widgets',
      ],
    });
  }

  if (structure.statefulCount > structure.nodeCount * 0.4) {
    optimizations.push({
      category: 'State Management',
      priority: 'medium',
      suggestions: [
        'Consider using state management solution (Provider, Riverpod, BLoC)',
        'Extract business logic from widgets',
        'Use StatelessWidget where state is not needed',
        'Implement proper widget keys for list items',
      ],
    });
  }

  if (analysis.memoryLeaks.length > 0) {
    optimizations.push({
      category: 'Memory Management',
      priority: 'critical',
      suggestions: [
        'Implement proper dispose() methods',
        'Cancel all subscriptions and timers',
        'Remove all listeners in dispose()',
        'Use weak references where appropriate',
      ],
    });
  }

  return optimizations;
}

function estimateRebuilds(structure) {
  const statefulRatio = structure.statefulCount / structure.nodeCount;
  const depthFactor = structure.maxDepth / 10;
  
  return Math.round(10 * statefulRatio * (1 + depthFactor));
}

function estimateMemoryUsage(structure) {
  const baseMemoryPerWidget = 50;
  const statefulOverhead = 100;
  
  const totalMemory = 
    structure.nodeCount * baseMemoryPerWidget +
    structure.statefulCount * statefulOverhead;
  
  return {
    estimatedKB: Math.round(totalMemory / 1024),
    rating: totalMemory > 100000 ? 'High' : totalMemory > 50000 ? 'Medium' : 'Low',
  };
}

function calculatePerformanceScore(analysis) {
  let score = 100;
  
  analysis.rebuildIssues.forEach(issue => {
    score -= issue.severity === 'high' ? 10 : 5;
  });
  
  analysis.memoryLeaks.forEach(leak => {
    score -= leak.severity === 'high' ? 15 : 8;
  });
  
  analysis.performanceBottlenecks.forEach(bottleneck => {
    if (bottleneck.impact === 'very_high') score -= 12;
    else if (bottleneck.impact === 'high') score -= 8;
    else score -= 4;
  });
  
  return Math.max(0, Math.min(100, score));
}

function generatePerformanceReport(analysis, score) {
  const grade = 
    score >= 90 ? 'A' :
    score >= 80 ? 'B' :
    score >= 70 ? 'C' :
    score >= 60 ? 'D' : 'F';
  
  return {
    grade,
    score,
    summary: {
      totalIssues: 
        analysis.rebuildIssues.length + 
        analysis.memoryLeaks.length + 
        analysis.performanceBottlenecks.length,
      criticalIssues: 
        analysis.memoryLeaks.filter(l => l.severity === 'high').length +
        analysis.rebuildIssues.filter(r => r.severity === 'high').length,
      estimatedImpact: score < 70 ? 'Significant performance impact' : 'Minor performance impact',
    },
    topPriorities: getTopPriorities(analysis),
  };
}

function getCriticalIssues(analysis) {
  const critical = [];
  
  analysis.memoryLeaks
    .filter(leak => leak.severity === 'high')
    .forEach(leak => critical.push({
      type: 'Memory Leak',
      description: leak.message,
      fix: leak.fix,
    }));
  
  analysis.rebuildIssues
    .filter(issue => issue.severity === 'high')
    .forEach(issue => critical.push({
      type: 'Rebuild Issue',
      description: issue.message,
      fix: issue.fix,
    }));
  
  return critical;
}

function getTopPriorities(analysis) {
  const priorities = [];
  
  if (analysis.memoryLeaks.length > 0) {
    priorities.push('Fix memory leaks by implementing proper dispose methods');
  }
  
  if (analysis.rebuildIssues.some(i => i.type === 'missing_const')) {
    priorities.push('Add const constructors to reduce rebuilds');
  }
  
  if (analysis.performanceBottlenecks.some(b => b.type === 'expensive_widget')) {
    priorities.push('Replace or optimize expensive widgets');
  }
  
  return priorities.slice(0, 3);
}