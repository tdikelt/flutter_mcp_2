import { analyzeCodeStructure } from '../utils/codeAnalyzer.js';
import { getFlutterPatterns } from '../validators/patterns.js';

export async function suggestImprovements(args) {
  const { code, focusArea = 'all' } = args;
  
  const improvements = {
    performance: [],
    accessibility: [],
    maintainability: [],
    architecture: [],
    patterns: [],
  };

  try {
    const codeStructure = analyzeCodeStructure(code);
    
    if (focusArea === 'all' || focusArea === 'performance') {
      improvements.performance = suggestPerformanceImprovements(code, codeStructure);
    }
    
    if (focusArea === 'all' || focusArea === 'accessibility') {
      improvements.accessibility = suggestAccessibilityImprovements(code, codeStructure);
    }
    
    if (focusArea === 'all' || focusArea === 'maintainability') {
      improvements.maintainability = suggestMaintainabilityImprovements(code, codeStructure);
    }
    
    improvements.architecture = suggestArchitecturalImprovements(code, codeStructure);
    improvements.patterns = suggestPatternImprovements(code, codeStructure);

    const prioritizedImprovements = prioritizeImprovements(improvements);
    const implementationGuide = generateImplementationGuide(prioritizedImprovements);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            improvements,
            prioritized: prioritizedImprovements,
            implementationGuide,
            estimatedImpact: calculateImpact(improvements),
          }, null, 2),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error suggesting improvements: ${error.message}`,
        },
      ],
    };
  }
}

function suggestPerformanceImprovements(code, structure) {
  const suggestions = [];

  if (!code.includes('const') && structure.hasStatelessWidgets) {
    suggestions.push({
      title: 'Use const constructors',
      description: 'Add const keyword to improve widget rebuild performance',
      example: 'const Text("Hello") instead of Text("Hello")',
      impact: 'high',
      difficulty: 'easy',
    });
  }

  if (code.includes('setState') && structure.stateUpdateCount > 2) {
    suggestions.push({
      title: 'Optimize setState usage',
      description: 'Consider using ValueNotifier or state management for frequent updates',
      example: 'ValueNotifier<int> counter = ValueNotifier(0);',
      impact: 'high',
      difficulty: 'medium',
    });
  }

  if (code.includes('ListView') && !code.includes('.builder')) {
    suggestions.push({
      title: 'Use ListView.builder for dynamic lists',
      description: 'ListView.builder provides better performance for large lists',
      example: 'ListView.builder(itemCount: items.length, itemBuilder: (context, index) => ...)',
      impact: 'high',
      difficulty: 'easy',
    });
  }

  if (structure.widgetTreeDepth > 6) {
    suggestions.push({
      title: 'Reduce widget tree depth',
      description: 'Extract nested widgets into separate components',
      impact: 'medium',
      difficulty: 'medium',
    });
  }

  if (code.includes('AnimatedContainer') || code.includes('AnimatedOpacity')) {
    suggestions.push({
      title: 'Consider implicit animations performance',
      description: 'For complex animations, use AnimationController for better control',
      impact: 'medium',
      difficulty: 'hard',
    });
  }

  return suggestions;
}

function suggestAccessibilityImprovements(code, structure) {
  const suggestions = [];

  if (!code.includes('Semantics') && structure.hasInteractiveWidgets) {
    suggestions.push({
      title: 'Add Semantics widgets',
      description: 'Wrap interactive elements with Semantics for screen readers',
      example: 'Semantics(label: "Submit button", child: ElevatedButton(...))',
      impact: 'high',
      difficulty: 'easy',
    });
  }

  if (code.includes('Image') && !code.includes('semanticLabel')) {
    suggestions.push({
      title: 'Add semantic labels to images',
      description: 'Provide descriptions for images to support screen readers',
      example: 'Image.asset("path", semanticLabel: "Company logo")',
      impact: 'high',
      difficulty: 'easy',
    });
  }

  if (code.includes('Color(') && !code.includes('MaterialColor')) {
    suggestions.push({
      title: 'Ensure color contrast compliance',
      description: 'Use theme colors or verify WCAG AA contrast ratios',
      impact: 'medium',
      difficulty: 'medium',
    });
  }

  if (!code.includes('textScaleFactor') && structure.hasTextWidgets) {
    suggestions.push({
      title: 'Support dynamic text scaling',
      description: 'Ensure text scales properly with system settings',
      impact: 'medium',
      difficulty: 'easy',
    });
  }

  return suggestions;
}

function suggestMaintainabilityImprovements(code, structure) {
  const suggestions = [];

  if (structure.methodLength > 50) {
    suggestions.push({
      title: 'Break down large methods',
      description: 'Extract logic into smaller, focused methods',
      impact: 'high',
      difficulty: 'medium',
    });
  }

  if (!code.includes('typedef') && structure.hasComplexCallbacks) {
    suggestions.push({
      title: 'Use typedefs for callbacks',
      description: 'Define type aliases for complex function signatures',
      example: 'typedef OnItemSelected = void Function(String id);',
      impact: 'medium',
      difficulty: 'easy',
    });
  }

  if (structure.duplicatedCode.length > 0) {
    suggestions.push({
      title: 'Extract duplicated code',
      description: 'Create reusable widgets or methods for repeated code',
      duplicates: structure.duplicatedCode,
      impact: 'high',
      difficulty: 'medium',
    });
  }

  if (!code.includes('assert') && structure.hasPublicMethods) {
    suggestions.push({
      title: 'Add debug assertions',
      description: 'Use assert statements to catch errors during development',
      example: 'assert(value != null, "Value must not be null");',
      impact: 'low',
      difficulty: 'easy',
    });
  }

  return suggestions;
}

function suggestArchitecturalImprovements(code, structure) {
  const suggestions = [];

  if (structure.hasBusinessLogicInUI) {
    suggestions.push({
      title: 'Separate business logic from UI',
      description: 'Move business logic to controllers or services',
      pattern: 'Consider MVC, MVP, or BLoC pattern',
      impact: 'high',
      difficulty: 'hard',
    });
  }

  if (!structure.hasProperSeparation) {
    suggestions.push({
      title: 'Implement proper layer separation',
      description: 'Organize code into presentation, domain, and data layers',
      impact: 'high',
      difficulty: 'hard',
    });
  }

  if (structure.tightCoupling > 0.7) {
    suggestions.push({
      title: 'Reduce coupling between components',
      description: 'Use dependency injection or interfaces',
      impact: 'medium',
      difficulty: 'medium',
    });
  }

  return suggestions;
}

function suggestPatternImprovements(code, structure) {
  const suggestions = [];
  const patterns = getFlutterPatterns();

  if (!code.includes('Repository') && structure.hasDataFetching) {
    suggestions.push({
      title: 'Implement Repository pattern',
      description: 'Abstract data sources behind a repository interface',
      pattern: patterns.repository,
      impact: 'medium',
      difficulty: 'medium',
    });
  }

  if (structure.hasStateManagement && !usesKnownStateManagement(code)) {
    suggestions.push({
      title: 'Use established state management',
      description: 'Consider Provider, Riverpod, or BLoC for state management',
      impact: 'high',
      difficulty: 'medium',
    });
  }

  if (code.includes('Factory') || structure.hasComplexObjectCreation) {
    suggestions.push({
      title: 'Apply Factory pattern correctly',
      description: 'Use factory constructors or factory methods appropriately',
      pattern: patterns.factory,
      impact: 'low',
      difficulty: 'easy',
    });
  }

  return suggestions;
}

function usesKnownStateManagement(code) {
  const stateManagementKeywords = [
    'Provider', 'Riverpod', 'BlocProvider', 'GetX', 
    'MobX', 'Redux', 'StateNotifier', 'ChangeNotifier'
  ];
  
  return stateManagementKeywords.some(keyword => code.includes(keyword));
}

function prioritizeImprovements(improvements) {
  const allImprovements = [];
  
  Object.entries(improvements).forEach(([category, items]) => {
    items.forEach(item => {
      allImprovements.push({
        ...item,
        category,
        score: calculatePriorityScore(item),
      });
    });
  });
  
  return allImprovements
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
}

function calculatePriorityScore(improvement) {
  const impactScores = { high: 3, medium: 2, low: 1 };
  const difficultyScores = { easy: 3, medium: 2, hard: 1 };
  
  const impact = impactScores[improvement.impact] || 0;
  const difficulty = difficultyScores[improvement.difficulty] || 0;
  
  return impact * difficulty;
}

function generateImplementationGuide(improvements) {
  const guide = {
    quickWins: [],
    mediumEffort: [],
    majorRefactoring: [],
  };
  
  improvements.forEach(improvement => {
    if (improvement.difficulty === 'easy' && improvement.impact === 'high') {
      guide.quickWins.push({
        title: improvement.title,
        steps: generateSteps(improvement),
      });
    } else if (improvement.difficulty === 'medium') {
      guide.mediumEffort.push({
        title: improvement.title,
        steps: generateSteps(improvement),
      });
    } else if (improvement.difficulty === 'hard') {
      guide.majorRefactoring.push({
        title: improvement.title,
        steps: generateSteps(improvement),
      });
    }
  });
  
  return guide;
}

function generateSteps(improvement) {
  const steps = [];
  
  switch (improvement.title) {
    case 'Use const constructors':
      steps.push('Identify stateless widgets with fixed content');
      steps.push('Add const keyword before constructor calls');
      steps.push('Run flutter analyze to verify changes');
      break;
    
    case 'Add Semantics widgets':
      steps.push('Identify all interactive widgets');
      steps.push('Wrap each with appropriate Semantics widget');
      steps.push('Add meaningful labels and hints');
      steps.push('Test with screen reader');
      break;
    
    default:
      steps.push('Review current implementation');
      steps.push('Plan refactoring approach');
      steps.push('Implement changes incrementally');
      steps.push('Test thoroughly');
  }
  
  return steps;
}

function calculateImpact(improvements) {
  const counts = {
    total: 0,
    highImpact: 0,
    implemented: 0,
  };
  
  Object.values(improvements).forEach(categoryImprovements => {
    categoryImprovements.forEach(improvement => {
      counts.total++;
      if (improvement.impact === 'high') {
        counts.highImpact++;
      }
    });
  });
  
  return {
    potentialImprovement: counts.highImpact > 5 ? 'Significant' : 'Moderate',
    effortRequired: counts.total > 10 ? 'High' : 'Medium',
    recommendedApproach: counts.highImpact > 3 ? 'Prioritize high-impact changes' : 'Incremental improvements',
  };
}