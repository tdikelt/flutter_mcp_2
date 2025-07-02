export function analyzeCodeStructure(code) {
  const structure = {
    widgetTreeDepth: 0,
    methodLength: 0,
    stateUpdateCount: 0,
    hasStatelessWidgets: false,
    hasInteractiveWidgets: false,
    hasTextWidgets: false,
    hasComplexCallbacks: false,
    duplicatedCode: [],
    hasPublicMethods: false,
    hasBusinessLogicInUI: false,
    hasProperSeparation: false,
    tightCoupling: 0,
    hasDataFetching: false,
    hasStateManagement: false,
    hasComplexObjectCreation: false,
  };

  structure.widgetTreeDepth = calculateMaxDepth(code);
  structure.methodLength = calculateAverageMethodLength(code);
  structure.stateUpdateCount = (code.match(/setState/g) || []).length;
  
  structure.hasStatelessWidgets = /extends\s+StatelessWidget/.test(code);
  structure.hasInteractiveWidgets = /GestureDetector|InkWell|Button|onTap|onPressed/.test(code);
  structure.hasTextWidgets = /Text\s*\(/.test(code);
  structure.hasComplexCallbacks = /Function\s*\([^)]{20,}\)/.test(code);
  
  structure.duplicatedCode = findDuplicatedCode(code);
  structure.hasPublicMethods = /^\s*(?!_)\w+\s*\(/m.test(code);
  
  structure.hasBusinessLogicInUI = detectBusinessLogicInUI(code);
  structure.hasProperSeparation = checkLayerSeparation(code);
  structure.tightCoupling = calculateCoupling(code);
  
  structure.hasDataFetching = /http\.|dio\.|fetch|repository/i.test(code);
  structure.hasStateManagement = /setState|ChangeNotifier|ValueNotifier|Stream/.test(code);
  structure.hasComplexObjectCreation = /factory|fromJson|toJson/.test(code);

  return structure;
}

function calculateMaxDepth(code) {
  let maxDepth = 0;
  let currentDepth = 0;
  
  for (const char of code) {
    if (char === '{' || char === '(' || char === '[') {
      currentDepth++;
      maxDepth = Math.max(maxDepth, currentDepth);
    } else if (char === '}' || char === ')' || char === ']') {
      currentDepth--;
    }
  }
  
  return maxDepth;
}

function calculateAverageMethodLength(code) {
  const methods = code.match(/\w+\s*\([^)]*\)\s*(?:async\s*)?\{[^}]*\}/g) || [];
  if (methods.length === 0) return 0;
  
  const totalLength = methods.reduce((sum, method) => sum + method.length, 0);
  return Math.round(totalLength / methods.length);
}

function findDuplicatedCode(code) {
  const lines = code.split('\n');
  const duplicates = [];
  const seen = new Map();
  
  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (trimmed.length > 20 && !trimmed.startsWith('//') && !trimmed.startsWith('import')) {
      if (seen.has(trimmed)) {
        duplicates.push({
          line: trimmed,
          locations: [seen.get(trimmed), index + 1],
        });
      } else {
        seen.set(trimmed, index + 1);
      }
    }
  });
  
  return duplicates;
}

function detectBusinessLogicInUI(code) {
  const businessLogicPatterns = [
    /calculate|compute|process|transform|validate/i,
    /http\.|dio\.|fetch.*\(/,
    /SELECT|INSERT|UPDATE|DELETE/i,
    /\.(save|load|delete|update)\s*\(/,
  ];
  
  const inBuildMethod = code.includes('Widget build');
  if (!inBuildMethod) return false;
  
  const buildMethodMatch = code.match(/Widget\s+build[^{]*\{([^}]*)\}/s);
  if (!buildMethodMatch) return false;
  
  const buildContent = buildMethodMatch[1];
  return businessLogicPatterns.some(pattern => pattern.test(buildContent));
}

function checkLayerSeparation(code) {
  const hasModels = /class\s+\w+Model/.test(code);
  const hasServices = /class\s+\w+Service/.test(code);
  const hasRepositories = /class\s+\w+Repository/.test(code);
  const hasControllers = /class\s+\w+Controller/.test(code);
  
  const separationScore = 
    (hasModels ? 1 : 0) + 
    (hasServices ? 1 : 0) + 
    (hasRepositories ? 1 : 0) + 
    (hasControllers ? 1 : 0);
  
  return separationScore >= 2;
}

function calculateCoupling(code) {
  const classes = (code.match(/class\s+\w+/g) || []).length;
  if (classes === 0) return 0;
  
  const directDependencies = (code.match(/new\s+\w+|=\s*\w+\(/g) || []).length;
  const injectedDependencies = (code.match(/\w+\s+\w+\s*[,)]|required\s+this\.\w+/g) || []).length;
  
  const couplingRatio = directDependencies / (directDependencies + injectedDependencies + 1);
  return Math.min(1, couplingRatio);
}