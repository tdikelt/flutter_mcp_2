export function parseWidgetTree(widgetTree) {
  const structure = {
    nodeCount: 0,
    maxDepth: 0,
    avgBranching: 0,
    statefulCount: 0,
    statelessCount: 0,
    hasCustomPaint: false,
    nodes: [],
  };

  try {
    const lines = widgetTree.split('\n');
    let currentDepth = 0;
    let branchingFactors = [];
    let currentBranches = 0;
    
    lines.forEach(line => {
      const trimmed = line.trim();
      if (!trimmed) return;
      
      const openBrackets = (trimmed.match(/[\{\(\[]/g) || []).length;
      const closeBrackets = (trimmed.match(/[\}\)\]]/g) || []).length;
      
      currentDepth += openBrackets - closeBrackets;
      structure.maxDepth = Math.max(structure.maxDepth, currentDepth);
      
      if (isWidgetDeclaration(trimmed)) {
        structure.nodeCount++;
        
        if (trimmed.includes('StatefulWidget')) {
          structure.statefulCount++;
        } else if (trimmed.includes('StatelessWidget')) {
          structure.statelessCount++;
        }
        
        if (trimmed.includes('CustomPaint')) {
          structure.hasCustomPaint = true;
        }
        
        structure.nodes.push({
          type: extractWidgetType(trimmed),
          depth: currentDepth,
          line: trimmed,
        });
        
        currentBranches++;
      }
      
      if (closeBrackets > openBrackets && currentBranches > 0) {
        branchingFactors.push(currentBranches);
        currentBranches = 0;
      }
    });
    
    if (branchingFactors.length > 0) {
      structure.avgBranching = 
        branchingFactors.reduce((a, b) => a + b, 0) / branchingFactors.length;
    }
    
  } catch (error) {
    console.error('Error parsing widget tree:', error);
  }
  
  return structure;
}

function isWidgetDeclaration(line) {
  const widgetPatterns = [
    /\w+\s*\(/,
    /child:\s*\w+/,
    /children:\s*\[/,
    /Widget\s+\w+/,
  ];
  
  return widgetPatterns.some(pattern => pattern.test(line));
}

function extractWidgetType(line) {
  const match = line.match(/(\w+)\s*\(/);
  if (match) return match[1];
  
  const childMatch = line.match(/child:\s*(\w+)/);
  if (childMatch) return childMatch[1];
  
  return 'Unknown';
}