import { parseWidgetTree } from '../utils/treeParser.js';

export async function diagnoseRenderIssues(args) {
  const { widgetCode, includeVisualizations = true, checkConstraints = true } = args;
  
  try {
    const issues = {
      overflowErrors: [],
      constraintViolations: [],
      infiniteDimensions: [],
      layoutIssues: [],
      solutions: [],
    };
    
    // Detect overflow issues
    issues.overflowErrors = detectOverflowIssues(widgetCode);
    
    // Check constraint violations
    if (checkConstraints) {
      issues.constraintViolations = detectConstraintViolations(widgetCode);
    }
    
    // Find infinite dimension problems
    issues.infiniteDimensions = detectInfiniteDimensions(widgetCode);
    
    // General layout issues
    issues.layoutIssues = detectLayoutIssues(widgetCode);
    
    // Generate solutions
    issues.solutions = generateSolutions(issues);
    
    // Create debug overlays if requested
    const debugCode = includeVisualizations ? 
      generateDebugOverlays(widgetCode, issues) : null;
    
    const severity = calculateSeverity(issues);
    const fixPriority = prioritizeFixes(issues);
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            issues,
            severity,
            fixPriority,
            debugCode,
            summary: generateDiagnosticSummary(issues),
            preventionTips: generatePreventionTips(issues),
          }, null, 2),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error diagnosing render issues: ${error.message}`,
        },
      ],
    };
  }
}

function detectOverflowIssues(code) {
  const overflowIssues = [];
  
  // Check for Row overflow
  if (code.includes('Row') && !code.includes('Flexible') && !code.includes('Expanded')) {
    const rowMatches = code.matchAll(/Row\s*\([^)]*children:\s*\[[^\]]*\]/gs);
    for (const match of rowMatches) {
      const rowContent = match[0];
      const childCount = (rowContent.match(/,/g) || []).length + 1;
      
      if (childCount > 3 && !rowContent.includes('MainAxisSize.min')) {
        overflowIssues.push({
          type: 'horizontal_overflow',
          widget: 'Row',
          location: findLineNumber(code, match.index),
          severity: 'high',
          message: 'Row with multiple children may overflow horizontally',
          code: rowContent.substring(0, 100) + '...',
        });
      }
    }
  }
  
  // Check for Column in Column without proper constraints
  if (code.includes('Column')) {
    const nestedColumns = /Column[^{]*{[^}]*Column/gs.test(code);
    if (nestedColumns && !code.includes('Expanded') && !code.includes('Flexible')) {
      overflowIssues.push({
        type: 'vertical_overflow',
        widget: 'Column',
        severity: 'high',
        message: 'Nested Columns without Expanded/Flexible may cause overflow',
      });
    }
  }
  
  // Check for Text overflow
  const textOverflowPattern = /Text\s*\([^)]+\)/g;
  const textMatches = code.matchAll(textOverflowPattern);
  for (const match of textMatches) {
    if (!match[0].includes('overflow:') && !match[0].includes('maxLines:')) {
      overflowIssues.push({
        type: 'text_overflow',
        widget: 'Text',
        location: findLineNumber(code, match.index),
        severity: 'medium',
        message: 'Text widget without overflow handling',
        suggestion: 'Add overflow: TextOverflow.ellipsis',
      });
    }
  }
  
  return overflowIssues;
}

function detectConstraintViolations(code) {
  const violations = [];
  
  // Container with both color and decoration
  const containerPattern = /Container\s*\([^)]*\)/gs;
  const containers = code.matchAll(containerPattern);
  
  for (const match of containers) {
    const containerCode = match[0];
    if (containerCode.includes('color:') && containerCode.includes('decoration:')) {
      violations.push({
        type: 'container_color_decoration',
        widget: 'Container',
        location: findLineNumber(code, match.index),
        severity: 'error',
        message: 'Container cannot have both color and decoration',
        fix: 'Move color inside BoxDecoration',
      });
    }
  }
  
  // Unbounded height/width
  if (code.includes('height: double.infinity') || code.includes('width: double.infinity')) {
    const parent = findParentWidget(code, code.indexOf('double.infinity'));
    violations.push({
      type: 'unbounded_dimensions',
      severity: 'high',
      message: 'Widget with infinite dimensions needs bounded parent',
      parent,
      fix: 'Wrap with Container with fixed dimensions or use Expanded',
    });
  }
  
  // ListView inside Column without proper constraints
  if (code.includes('ListView') && code.includes('Column')) {
    const listViewInColumn = /Column[^}]*ListView(?!\.builder)/;
    if (listViewInColumn.test(code) && !code.includes('Expanded') && !code.includes('shrinkWrap: true')) {
      violations.push({
        type: 'listview_unbounded_height',
        severity: 'error',
        message: 'ListView inside Column needs bounded height',
        fix: 'Either wrap ListView with Expanded or set shrinkWrap: true',
      });
    }
  }
  
  return violations;
}

function detectInfiniteDimensions(code) {
  const infiniteIssues = [];
  
  // Stack without positioned children
  if (code.includes('Stack')) {
    const stackPattern = /Stack\s*\([^)]*children:\s*\[[^\]]*\]/gs;
    const stacks = code.matchAll(stackPattern);
    
    for (const match of stacks) {
      if (!match[0].includes('Positioned')) {
        infiniteIssues.push({
          type: 'stack_infinite_size',
          widget: 'Stack',
          severity: 'warning',
          message: 'Stack without Positioned children takes infinite size',
          suggestion: 'Use Positioned or give Stack explicit dimensions',
        });
      }
    }
  }
  
  // IntrinsicHeight/Width performance warning
  if (code.includes('IntrinsicHeight') || code.includes('IntrinsicWidth')) {
    infiniteIssues.push({
      type: 'intrinsic_performance',
      severity: 'warning',
      message: 'IntrinsicHeight/Width can be expensive',
      suggestion: 'Consider alternatives if used in scrollable lists',
    });
  }
  
  // CustomScrollView without slivers
  if (code.includes('CustomScrollView') && !code.includes('SliverList')) {
    infiniteIssues.push({
      type: 'custom_scroll_view_empty',
      severity: 'error',
      message: 'CustomScrollView needs sliver children',
    });
  }
  
  return infiniteIssues;
}

function detectLayoutIssues(code) {
  const layoutIssues = [];
  
  // Padding inside Padding
  const doublePadding = /Padding[^}]*Padding/;
  if (doublePadding.test(code)) {
    layoutIssues.push({
      type: 'redundant_padding',
      severity: 'low',
      message: 'Nested Padding widgets can be combined',
      optimization: 'Combine padding values into single Padding widget',
    });
  }
  
  // Multiple Containers
  const multipleContainers = /Container[^}]*Container/;
  if (multipleContainers.test(code)) {
    layoutIssues.push({
      type: 'redundant_containers',
      severity: 'low',
      message: 'Nested Containers can often be combined',
      optimization: 'Merge Container properties',
    });
  }
  
  // Incorrect Flex usage
  if (code.includes('Flex') && !code.includes('direction:')) {
    layoutIssues.push({
      type: 'flex_missing_direction',
      severity: 'error',
      message: 'Flex widget requires direction parameter',
    });
  }
  
  // Center inside Center
  if (/Center[^}]*Center/.test(code)) {
    layoutIssues.push({
      type: 'redundant_center',
      severity: 'low',
      message: 'Nested Center widgets are redundant',
    });
  }
  
  return layoutIssues;
}

function generateSolutions(issues) {
  const solutions = [];
  
  // Solutions for overflow errors
  issues.overflowErrors.forEach(error => {
    if (error.type === 'horizontal_overflow') {
      solutions.push({
        issue: error.type,
        solution: 'Wrap children with Flexible or Expanded',
        code: `Row(
  children: [
    Expanded(
      child: YourWidget(),
    ),
    Flexible(
      child: AnotherWidget(),
    ),
  ],
)`,
      });
    } else if (error.type === 'text_overflow') {
      solutions.push({
        issue: error.type,
        solution: 'Add overflow handling to Text',
        code: `Text(
  'Your long text here',
  overflow: TextOverflow.ellipsis,
  maxLines: 2,
)`,
      });
    }
  });
  
  // Solutions for constraint violations
  issues.constraintViolations.forEach(violation => {
    if (violation.type === 'container_color_decoration') {
      solutions.push({
        issue: violation.type,
        solution: 'Move color inside BoxDecoration',
        code: `Container(
  decoration: BoxDecoration(
    color: Colors.blue,
    // other decoration properties
  ),
  child: YourWidget(),
)`,
      });
    } else if (violation.type === 'listview_unbounded_height') {
      solutions.push({
        issue: violation.type,
        solution: 'Two ways to fix ListView in Column',
        code: `// Option 1: Wrap with Expanded
Column(
  children: [
    Expanded(
      child: ListView(...),
    ),
  ],
)

// Option 2: Use shrinkWrap
Column(
  children: [
    ListView(
      shrinkWrap: true,
      physics: NeverScrollableScrollPhysics(),
      ...
    ),
  ],
)`,
      });
    }
  });
  
  return solutions;
}

function generateDebugOverlays(code, issues) {
  let debugCode = code;
  
  // Add debug paint properties
  const debugOverlay = `
// Debug overlay to visualize layout issues
class DebugOverlay extends StatelessWidget {
  final Widget child;
  
  const DebugOverlay({required this.child});
  
  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        child,
        if (kDebugMode) ...[
          // Render overflow indicator
          Positioned(
            top: 0,
            right: 0,
            child: Container(
              padding: EdgeInsets.all(4),
              color: Colors.red,
              child: Text(
                'OVERFLOW',
                style: TextStyle(color: Colors.white, fontSize: 10),
              ),
            ),
          ),
        ],
      ],
    );
  }
}

// Enable visual debugging
void enableLayoutDebugging() {
  debugPaintSizeEnabled = true;
  debugPaintBaselinesEnabled = true;
  debugPaintLayerBordersEnabled = true;
  debugPaintPointersEnabled = true;
  debugRepaintRainbowEnabled = true;
}`;
  
  // Add constraint debugger
  const constraintDebugger = `
// Widget to debug constraints
class ConstraintDebugger extends StatelessWidget {
  final Widget child;
  final String label;
  
  const ConstraintDebugger({
    required this.child,
    required this.label,
  });
  
  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        return Stack(
          children: [
            child,
            if (kDebugMode)
              Positioned(
                top: 0,
                left: 0,
                child: Container(
                  padding: EdgeInsets.all(2),
                  color: Colors.black87,
                  child: Text(
                    '$label\\nW: ${constraints.maxWidth.toStringAsFixed(1)}\\nH: ${constraints.maxHeight.toStringAsFixed(1)}',
                    style: TextStyle(color: Colors.white, fontSize: 8),
                  ),
                ),
              ),
          ],
        );
      },
    );
  }
}`;
  
  return debugOverlay + '\n\n' + constraintDebugger;
}

function findLineNumber(code, index) {
  const lines = code.substring(0, index).split('\n');
  return lines.length;
}

function findParentWidget(code, childIndex) {
  const beforeChild = code.substring(0, childIndex);
  const widgets = ['Container', 'Row', 'Column', 'Stack', 'Scaffold'];
  
  let lastWidget = 'Unknown';
  let lastIndex = -1;
  
  widgets.forEach(widget => {
    const index = beforeChild.lastIndexOf(widget);
    if (index > lastIndex) {
      lastIndex = index;
      lastWidget = widget;
    }
  });
  
  return lastWidget;
}

function calculateSeverity(issues) {
  let score = 0;
  
  const allIssues = [
    ...issues.overflowErrors,
    ...issues.constraintViolations,
    ...issues.infiniteDimensions,
    ...issues.layoutIssues,
  ];
  
  allIssues.forEach(issue => {
    if (issue.severity === 'error') score += 10;
    else if (issue.severity === 'high') score += 7;
    else if (issue.severity === 'medium') score += 4;
    else if (issue.severity === 'warning') score += 2;
    else score += 1;
  });
  
  if (score === 0) return 'none';
  if (score < 10) return 'low';
  if (score < 25) return 'medium';
  if (score < 50) return 'high';
  return 'critical';
}

function prioritizeFixes(issues) {
  const priorities = [];
  
  // First priority: Errors that prevent rendering
  issues.constraintViolations
    .filter(v => v.severity === 'error')
    .forEach(violation => {
      priorities.push({
        priority: 1,
        issue: violation.type,
        action: violation.fix,
        impact: 'Prevents widget from rendering',
      });
    });
  
  // Second priority: Overflow issues
  issues.overflowErrors.forEach(error => {
    priorities.push({
      priority: 2,
      issue: error.type,
      action: error.suggestion || 'Fix overflow',
      impact: 'Visible rendering issues',
    });
  });
  
  // Third priority: Performance issues
  issues.infiniteDimensions
    .filter(i => i.type === 'intrinsic_performance')
    .forEach(issue => {
      priorities.push({
        priority: 3,
        issue: issue.type,
        action: issue.suggestion,
        impact: 'Performance degradation',
      });
    });
  
  return priorities.sort((a, b) => a.priority - b.priority);
}

function generateDiagnosticSummary(issues) {
  const totalIssues = 
    issues.overflowErrors.length +
    issues.constraintViolations.length +
    issues.infiniteDimensions.length +
    issues.layoutIssues.length;
  
  return {
    totalIssues,
    criticalIssues: issues.constraintViolations.filter(v => v.severity === 'error').length,
    overflowRisk: issues.overflowErrors.length > 0,
    performanceIssues: issues.infiniteDimensions.some(i => i.type === 'intrinsic_performance'),
    recommendation: totalIssues > 5 ? 
      'Major refactoring recommended' : 
      totalIssues > 0 ? 
      'Minor fixes needed' : 
      'No render issues detected',
  };
}

function generatePreventionTips(issues) {
  const tips = [
    'Always test layouts on different screen sizes',
    'Use Flutter Inspector to visualize constraints',
    'Enable debug painting during development',
  ];
  
  if (issues.overflowErrors.length > 0) {
    tips.push('Use Flexible/Expanded for dynamic content in Row/Column');
  }
  
  if (issues.constraintViolations.length > 0) {
    tips.push('Understand Flutter\'s constraint system: "Constraints go down, Sizes go up"');
  }
  
  if (issues.layoutIssues.length > 0) {
    tips.push('Avoid unnecessary nesting of layout widgets');
  }
  
  return tips;
}