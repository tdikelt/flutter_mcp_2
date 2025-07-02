export async function traceStateFlow(args) {
  const { widgetCode, stateManagementType = 'auto', includeVisualization = true } = args;
  
  try {
    const stateFlow = {
      stateChanges: [],
      rebuilds: [],
      dataFlow: [],
      mutations: [],
      optimizationOpportunities: [],
    };
    
    // Detect state management type
    const detectedType = stateManagementType === 'auto' ? 
      detectStateManagement(widgetCode) : stateManagementType;
    
    // Trace state changes
    stateFlow.stateChanges = traceStateChanges(widgetCode, detectedType);
    
    // Identify rebuilds
    stateFlow.rebuilds = identifyRebuilds(widgetCode);
    
    // Map data flow
    stateFlow.dataFlow = mapDataFlow(widgetCode, detectedType);
    
    // Detect mutations
    stateFlow.mutations = detectStateMutations(widgetCode);
    
    // Find optimization opportunities
    stateFlow.optimizationOpportunities = findOptimizations(stateFlow);
    
    // Generate visualization
    const visualization = includeVisualization ? 
      generateStateFlowDiagram(stateFlow) : null;
    
    const analysis = analyzeStateEfficiency(stateFlow);
    const recommendations = generateStateRecommendations(analysis, detectedType);
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            stateManagementType: detectedType,
            stateFlow,
            analysis,
            recommendations,
            visualization,
            debugTools: generateDebugTools(detectedType),
          }, null, 2),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error tracing state flow: ${error.message}`,
        },
      ],
    };
  }
}

function detectStateManagement(code) {
  if (code.includes('Provider.of') || code.includes('context.watch')) return 'provider';
  if (code.includes('BlocBuilder') || code.includes('BlocProvider')) return 'bloc';
  if (code.includes('GetX') || code.includes('Obx')) return 'getx';
  if (code.includes('Consumer') && code.includes('ChangeNotifier')) return 'provider';
  if (code.includes('StreamBuilder')) return 'streams';
  if (code.includes('ValueListenableBuilder')) return 'value_notifier';
  if (code.includes('setState')) return 'setState';
  return 'unknown';
}

function traceStateChanges(code, stateType) {
  const changes = [];
  
  if (stateType === 'setState') {
    // Find all setState calls
    const setStatePattern = /setState\s*\(\s*\(\)\s*(?:=>\s*)?{([^}]*)}\s*\)/g;
    const matches = [...code.matchAll(setStatePattern)];
    
    matches.forEach((match, index) => {
      const stateUpdate = match[1].trim();
      changes.push({
        id: `setState_${index}`,
        type: 'setState',
        trigger: findTrigger(code, match.index),
        updates: parseStateUpdates(stateUpdate),
        location: findLineNumber(code, match.index),
        impact: estimateImpact(code, match.index),
      });
    });
  } else if (stateType === 'provider') {
    // Find Provider state changes
    const notifyPattern = /notifyListeners\s*\(\)/g;
    const contextReadPattern = /context\.(read|watch)<([^>]+)>/g;
    
    [...code.matchAll(notifyPattern)].forEach((match, index) => {
      changes.push({
        id: `notify_${index}`,
        type: 'notifyListeners',
        trigger: findTrigger(code, match.index),
        location: findLineNumber(code, match.index),
        scope: 'provider',
      });
    });
    
    [...code.matchAll(contextReadPattern)].forEach((match, index) => {
      changes.push({
        id: `provider_${index}`,
        type: match[1] === 'read' ? 'read' : 'watch',
        provider: match[2],
        location: findLineNumber(code, match.index),
        rebuilds: match[1] === 'watch',
      });
    });
  }
  
  return changes;
}

function identifyRebuilds(code) {
  const rebuilds = [];
  
  // Check for unnecessary rebuilds
  const buildMethodPattern = /Widget\s+build\s*\([^)]*\)\s*{/g;
  const buildMethods = [...code.matchAll(buildMethodPattern)];
  
  buildMethods.forEach((match, index) => {
    const methodEnd = findMatchingBrace(code, match.index);
    const buildContent = code.substring(match.index, methodEnd);
    
    const rebuild = {
      widget: findWidgetName(code, match.index),
      location: findLineNumber(code, match.index),
      triggers: [],
      frequency: 'unknown',
      necessary: true,
    };
    
    // Check what triggers rebuilds
    if (buildContent.includes('setState')) {
      rebuild.triggers.push('setState');
    }
    if (buildContent.includes('context.watch')) {
      rebuild.triggers.push('provider_watch');
    }
    if (buildContent.includes('StreamBuilder')) {
      rebuild.triggers.push('stream_updates');
    }
    
    // Check for unnecessary rebuilds
    if (buildContent.includes('MediaQuery.of(context)')) {
      rebuild.unnecessary = 'MediaQuery causes rebuild on size changes';
    }
    if (buildContent.includes('Theme.of(context)')) {
      rebuild.unnecessary = 'Theme causes rebuild on theme changes';
    }
    
    rebuilds.push(rebuild);
  });
  
  return rebuilds;
}

function mapDataFlow(code, stateType) {
  const dataFlow = {
    sources: [],
    transformations: [],
    consumers: [],
    flow: [],
  };
  
  // Identify data sources
  if (code.includes('Future') || code.includes('async')) {
    dataFlow.sources.push({
      type: 'async',
      methods: findAsyncMethods(code),
    });
  }
  
  if (code.includes('Stream')) {
    dataFlow.sources.push({
      type: 'stream',
      streams: findStreams(code),
    });
  }
  
  // Map transformations
  const mapPattern = /\.map\s*\(/g;
  const wherePattern = /\.where\s*\(/g;
  
  [...code.matchAll(mapPattern)].forEach(match => {
    dataFlow.transformations.push({
      type: 'map',
      location: findLineNumber(code, match.index),
    });
  });
  
  [...code.matchAll(wherePattern)].forEach(match => {
    dataFlow.transformations.push({
      type: 'filter',
      location: findLineNumber(code, match.index),
    });
  });
  
  // Find consumers
  if (code.includes('builder:')) {
    dataFlow.consumers.push({
      type: 'builder',
      widgets: findBuilderWidgets(code),
    });
  }
  
  // Create flow diagram
  dataFlow.flow = createFlowPath(dataFlow);
  
  return dataFlow;
}

function detectStateMutations(code) {
  const mutations = [];
  
  // Direct mutations
  const directMutationPattern = /(\w+)\.add\(|(\w+)\.remove\(|(\w+)\.clear\(|(\w+)\[.+\]\s*=/g;
  const matches = [...code.matchAll(directMutationPattern)];
  
  matches.forEach(match => {
    mutations.push({
      type: 'direct_mutation',
      variable: match[1] || match[2] || match[3] || match[4],
      location: findLineNumber(code, match.index),
      severity: 'high',
      issue: 'Direct state mutation can cause unexpected behavior',
      fix: 'Create a new instance instead of mutating',
    });
  });
  
  // Mutations inside setState
  const setStatePattern = /setState\s*\([^{]*{([^}]*)}/g;
  const setStateMatches = [...code.matchAll(setStatePattern)];
  
  setStateMatches.forEach(match => {
    const content = match[1];
    if (content.includes('.add(') || content.includes('.remove(')) {
      mutations.push({
        type: 'mutation_in_setState',
        location: findLineNumber(code, match.index),
        severity: 'medium',
        issue: 'Mutating collections inside setState',
        fix: 'Use spread operator or List.from() to create new list',
      });
    }
  });
  
  return mutations;
}

function findOptimizations(stateFlow) {
  const optimizations = [];
  
  // Check for excessive rebuilds
  const rebuildCount = stateFlow.rebuilds.length;
  if (rebuildCount > 5) {
    optimizations.push({
      type: 'excessive_rebuilds',
      count: rebuildCount,
      suggestion: 'Consider using more granular state management',
      solutions: [
        'Use ValueListenableBuilder for specific values',
        'Implement const constructors where possible',
        'Use Keys to preserve widget state',
      ],
    });
  }
  
  // Check for unnecessary state updates
  stateFlow.stateChanges.forEach(change => {
    if (change.impact === 'full_tree') {
      optimizations.push({
        type: 'broad_state_update',
        location: change.location,
        suggestion: 'State update affects entire widget tree',
        solutions: [
          'Move state closer to where it\'s used',
          'Use context.select for specific values',
          'Consider splitting into smaller widgets',
        ],
      });
    }
  });
  
  // Check for state mutations
  if (stateFlow.mutations.length > 0) {
    optimizations.push({
      type: 'state_mutations',
      count: stateFlow.mutations.length,
      suggestion: 'Avoid mutating state directly',
      solutions: [
        'Use immutable data structures',
        'Create new instances when updating state',
        'Consider using packages like freezed',
      ],
    });
  }
  
  return optimizations;
}

function generateStateFlowDiagram(stateFlow) {
  const diagram = {
    type: 'mermaid',
    code: generateMermaidDiagram(stateFlow),
    description: 'State flow visualization',
  };
  
  // ASCII diagram for terminal
  const asciiDiagram = generateASCIIDiagram(stateFlow);
  
  return {
    mermaid: diagram,
    ascii: asciiDiagram,
    summary: {
      totalStateChanges: stateFlow.stateChanges.length,
      totalRebuilds: stateFlow.rebuilds.length,
      mutations: stateFlow.mutations.length,
      optimizationPotential: stateFlow.optimizationOpportunities.length,
    },
  };
}

function generateMermaidDiagram(stateFlow) {
  let diagram = 'graph TD\n';
  
  // Add state sources
  stateFlow.dataFlow.sources.forEach((source, index) => {
    diagram += `  S${index}[${source.type}] --> `;
  });
  
  // Add transformations
  stateFlow.dataFlow.transformations.forEach((transform, index) => {
    diagram += `T${index}[${transform.type}]\n  T${index} --> `;
  });
  
  // Add consumers
  stateFlow.dataFlow.consumers.forEach((consumer, index) => {
    diagram += `C${index}[${consumer.type}]\n`;
  });
  
  return diagram;
}

function generateASCIIDiagram(stateFlow) {
  let diagram = '\nState Flow Diagram:\n\n';
  
  diagram += 'Sources\n';
  diagram += '   |\n';
  diagram += '   v\n';
  diagram += 'State Updates\n';
  diagram += '   |\n';
  diagram += '   v\n';
  diagram += 'Widget Rebuilds\n';
  diagram += '   |\n';
  diagram += '   v\n';
  diagram += 'UI Updates\n\n';
  
  diagram += `Total State Changes: ${stateFlow.stateChanges.length}\n`;
  diagram += `Total Rebuilds: ${stateFlow.rebuilds.length}\n`;
  diagram += `Detected Mutations: ${stateFlow.mutations.length}\n`;
  
  return diagram;
}

function analyzeStateEfficiency(stateFlow) {
  const analysis = {
    efficiency: 'good',
    bottlenecks: [],
    unnecessaryRebuilds: [],
    stateComplexity: 'low',
  };
  
  // Calculate efficiency score
  const rebuildRatio = stateFlow.rebuilds.length / Math.max(stateFlow.stateChanges.length, 1);
  if (rebuildRatio > 3) {
    analysis.efficiency = 'poor';
    analysis.bottlenecks.push('Too many rebuilds per state change');
  } else if (rebuildRatio > 1.5) {
    analysis.efficiency = 'fair';
  }
  
  // Find unnecessary rebuilds
  stateFlow.rebuilds.forEach(rebuild => {
    if (rebuild.unnecessary) {
      analysis.unnecessaryRebuilds.push({
        widget: rebuild.widget,
        reason: rebuild.unnecessary,
        location: rebuild.location,
      });
    }
  });
  
  // Assess state complexity
  if (stateFlow.dataFlow.transformations.length > 5) {
    analysis.stateComplexity = 'high';
  } else if (stateFlow.dataFlow.transformations.length > 2) {
    analysis.stateComplexity = 'medium';
  }
  
  return analysis;
}

function generateStateRecommendations(analysis, stateType) {
  const recommendations = [];
  
  if (analysis.efficiency === 'poor') {
    recommendations.push({
      priority: 'high',
      title: 'Optimize rebuild frequency',
      description: 'Too many widgets rebuilding on state changes',
      actions: [
        'Use const constructors for static widgets',
        'Implement shouldRebuild methods',
        'Split large widgets into smaller ones',
      ],
    });
  }
  
  if (analysis.unnecessaryRebuilds.length > 0) {
    recommendations.push({
      priority: 'medium',
      title: 'Remove unnecessary rebuilds',
      description: 'Some widgets rebuild without needing to',
      actions: analysis.unnecessaryRebuilds.map(r => 
        `Fix ${r.widget}: ${r.reason}`
      ),
    });
  }
  
  if (stateType === 'setState' && analysis.stateComplexity !== 'low') {
    recommendations.push({
      priority: 'high',
      title: 'Consider advanced state management',
      description: 'setState may not be suitable for complex state',
      actions: [
        'Consider Provider for simple state sharing',
        'Use Riverpod for more control',
        'BLoC for complex business logic',
      ],
    });
  }
  
  return recommendations;
}

function generateDebugTools(stateType) {
  const tools = {
    logging: generateLoggingCode(stateType),
    visualization: generateVisualizationCode(),
    monitoring: generateMonitoringCode(stateType),
  };
  
  return tools;
}

function generateLoggingCode(stateType) {
  if (stateType === 'setState') {
    return `
// Add logging to track setState calls
@override
void setState(VoidCallback fn) {
  print('[STATE] setState called at: \${DateTime.now()}');
  super.setState(fn);
}`;
  } else if (stateType === 'provider') {
    return `
// Add logging to Provider changes
class LoggingChangeNotifier extends ChangeNotifier {
  @override
  void notifyListeners() {
    print('[PROVIDER] State updated at: \${DateTime.now()}');
    super.notifyListeners();
  }
}`;
  }
  
  return '// Add appropriate logging for your state management';
}

function generateVisualizationCode() {
  return `
// Widget to visualize rebuilds
class RebuildIndicator extends StatefulWidget {
  final Widget child;
  final String name;
  
  const RebuildIndicator({
    required this.child,
    required this.name,
  });
  
  @override
  _RebuildIndicatorState createState() => _RebuildIndicatorState();
}

class _RebuildIndicatorState extends State<RebuildIndicator> {
  int _buildCount = 0;
  
  @override
  Widget build(BuildContext context) {
    _buildCount++;
    
    return Stack(
      children: [
        widget.child,
        if (kDebugMode)
          Positioned(
            top: 0,
            right: 0,
            child: Container(
              padding: EdgeInsets.all(4),
              color: Colors.red,
              child: Text(
                '\${widget.name}: \$_buildCount',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 10,
                ),
              ),
            ),
          ),
      ],
    );
  }
}`;
}

function generateMonitoringCode(stateType) {
  return `
// Performance monitoring for state updates
class StatePerformanceMonitor {
  static final _stopwatch = Stopwatch();
  static final _metrics = <String, List<int>>{};
  
  static void startMeasure(String operation) {
    _stopwatch.reset();
    _stopwatch.start();
  }
  
  static void endMeasure(String operation) {
    _stopwatch.stop();
    _metrics.putIfAbsent(operation, () => []).add(_stopwatch.elapsedMicroseconds);
    
    if (kDebugMode) {
      final average = _metrics[operation]!.reduce((a, b) => a + b) ~/ _metrics[operation]!.length;
      print('[PERF] $operation: \${_stopwatch.elapsedMicroseconds}μs (avg: \${average}μs)');
    }
  }
  
  static Map<String, int> getAverages() {
    return _metrics.map((key, values) => 
      MapEntry(key, values.reduce((a, b) => a + b) ~/ values.length)
    );
  }
}`;
}

// Helper functions
function findTrigger(code, position) {
  const before = code.substring(Math.max(0, position - 200), position);
  if (before.includes('onPressed:')) return 'button_press';
  if (before.includes('onTap:')) return 'tap';
  if (before.includes('onChanged:')) return 'input_change';
  if (before.includes('Timer')) return 'timer';
  return 'unknown';
}

function parseStateUpdates(stateUpdate) {
  const updates = [];
  const lines = stateUpdate.split(';').filter(l => l.trim());
  
  lines.forEach(line => {
    const match = line.match(/(\w+)\s*=\s*(.+)/);
    if (match) {
      updates.push({
        variable: match[1],
        value: match[2].trim(),
      });
    }
  });
  
  return updates;
}

function findLineNumber(code, index) {
  return code.substring(0, index).split('\n').length;
}

function estimateImpact(code, position) {
  const after = code.substring(position, Math.min(code.length, position + 500));
  if (after.includes('build(')) return 'full_tree';
  if (after.includes('child')) return 'subtree';
  return 'local';
}

function findMatchingBrace(code, start) {
  let count = 0;
  let inString = false;
  let stringChar = '';
  
  for (let i = start; i < code.length; i++) {
    const char = code[i];
    
    if (!inString && (char === '"' || char === "'")) {
      inString = true;
      stringChar = char;
    } else if (inString && char === stringChar) {
      inString = false;
    }
    
    if (!inString) {
      if (char === '{') count++;
      if (char === '}') count--;
      if (count === 0 && i > start) return i;
    }
  }
  
  return code.length;
}

function findWidgetName(code, position) {
  const before = code.substring(Math.max(0, position - 100), position);
  const match = before.match(/class\s+(\w+)\s+extends/);
  return match ? match[1] : 'Unknown';
}

function findAsyncMethods(code) {
  const methods = [];
  const pattern = /(\w+)\s*\([^)]*\)\s*async/g;
  const matches = [...code.matchAll(pattern)];
  
  matches.forEach(match => {
    methods.push(match[1]);
  });
  
  return methods;
}

function findStreams(code) {
  const streams = [];
  const pattern = /Stream<([^>]+)>\s+(\w+)/g;
  const matches = [...code.matchAll(pattern)];
  
  matches.forEach(match => {
    streams.push({
      type: match[1],
      name: match[2],
    });
  });
  
  return streams;
}

function findBuilderWidgets(code) {
  const builders = [];
  const pattern = /(\w+Builder)/g;
  const matches = [...code.matchAll(pattern)];
  
  matches.forEach(match => {
    if (!builders.includes(match[1])) {
      builders.push(match[1]);
    }
  });
  
  return builders;
}

function createFlowPath(dataFlow) {
  const path = [];
  
  dataFlow.sources.forEach(source => {
    path.push({ step: 'source', type: source.type });
  });
  
  dataFlow.transformations.forEach(transform => {
    path.push({ step: 'transform', type: transform.type });
  });
  
  dataFlow.consumers.forEach(consumer => {
    path.push({ step: 'consume', type: consumer.type });
  });
  
  return path;
}