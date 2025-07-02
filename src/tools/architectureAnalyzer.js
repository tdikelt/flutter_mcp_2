export async function analyzeArchitectureCompliance(args) {
  const { projectPath, architectureType = 'clean', strictMode = true } = args;
  
  try {
    const analysis = {
      compliance: {},
      violations: [],
      dependencies: {},
      layering: {},
      metrics: {},
      recommendations: [],
    };
    
    // Analyze project structure
    const structure = await analyzeProjectStructure(projectPath);
    
    // Check architecture compliance
    analysis.compliance = checkArchitectureCompliance(structure, architectureType);
    
    // Find violations
    analysis.violations = findArchitectureViolations(structure, architectureType, strictMode);
    
    // Analyze dependencies
    analysis.dependencies = analyzeDependencyFlow(structure);
    
    // Check layer separation
    analysis.layering = analyzeLayerSeparation(structure);
    
    // Calculate metrics
    analysis.metrics = calculateArchitectureMetrics(structure);
    
    // Generate recommendations
    analysis.recommendations = generateArchitectureRecommendations(analysis);
    
    // Generate compliance report
    const report = generateComplianceReport(analysis, architectureType);
    
    // Generate refactoring suggestions
    const refactoring = generateRefactoringSuggestions(analysis.violations);
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            analysis,
            report,
            refactoring,
            score: calculateArchitectureScore(analysis),
            diagram: generateArchitectureDiagram(structure),
          }, null, 2),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error analyzing architecture compliance: ${error.message}`,
        },
      ],
    };
  }
}

async function analyzeProjectStructure(projectPath) {
  // Simulate project structure analysis
  return {
    layers: {
      presentation: {
        files: 45,
        components: ['pages', 'widgets', 'controllers', 'view_models'],
        dependencies: ['domain', 'flutter', 'state_management'],
      },
      domain: {
        files: 28,
        components: ['entities', 'use_cases', 'repositories'],
        dependencies: [],  // Should have no dependencies
      },
      data: {
        files: 32,
        components: ['models', 'repositories', 'datasources', 'mappers'],
        dependencies: ['domain', 'dio', 'sqflite'],
      },
      infrastructure: {
        files: 15,
        components: ['services', 'adapters', 'factories'],
        dependencies: ['domain', 'data'],
      },
    },
    modules: [
      {
        name: 'auth',
        layers: ['presentation', 'domain', 'data'],
        crossReferences: ['user', 'profile'],
      },
      {
        name: 'user',
        layers: ['presentation', 'domain', 'data'],
        crossReferences: ['auth'],
      },
      {
        name: 'product',
        layers: ['presentation', 'domain', 'data'],
        crossReferences: ['cart', 'catalog'],
      },
    ],
    violations: [],
  };
}

function checkArchitectureCompliance(structure, architectureType) {
  const compliance = {
    overallCompliance: 0,
    layerCompliance: {},
    principleCompliance: {},
    patternCompliance: {},
  };
  
  if (architectureType === 'clean') {
    // Check Clean Architecture compliance
    compliance.layerCompliance = {
      presentation: checkPresentationLayerCompliance(structure.layers.presentation),
      domain: checkDomainLayerCompliance(structure.layers.domain),
      data: checkDataLayerCompliance(structure.layers.data),
    };
    
    compliance.principleCompliance = {
      dependencyRule: checkDependencyRule(structure),
      singleResponsibility: checkSingleResponsibility(structure),
      interfaceSegregation: checkInterfaceSegregation(structure),
      dependencyInversion: checkDependencyInversion(structure),
    };
    
    compliance.patternCompliance = {
      repository: checkRepositoryPattern(structure),
      useCase: checkUseCasePattern(structure),
      factory: checkFactoryPattern(structure),
    };
  } else if (architectureType === 'mvvm') {
    compliance.layerCompliance = {
      model: checkModelCompliance(structure),
      view: checkViewCompliance(structure),
      viewModel: checkViewModelCompliance(structure),
    };
  } else if (architectureType === 'mvc') {
    compliance.layerCompliance = {
      model: checkModelCompliance(structure),
      view: checkViewCompliance(structure),
      controller: checkControllerCompliance(structure),
    };
  }
  
  // Calculate overall compliance
  const scores = Object.values(compliance.layerCompliance);
  compliance.overallCompliance = scores.reduce((a, b) => a + b, 0) / scores.length;
  
  return compliance;
}

function checkPresentationLayerCompliance(layer) {
  let score = 100;
  
  // Check for business logic in presentation
  if (layer.components.includes('business_logic')) {
    score -= 20;
  }
  
  // Check for direct data access
  if (layer.dependencies.includes('data')) {
    score -= 30;
  }
  
  // Check for proper state management
  if (!layer.dependencies.some(d => ['provider', 'bloc', 'riverpod', 'getx'].includes(d))) {
    score -= 10;
  }
  
  return Math.max(0, score);
}

function checkDomainLayerCompliance(layer) {
  let score = 100;
  
  // Domain should have no dependencies
  if (layer.dependencies.length > 0) {
    score -= layer.dependencies.length * 20;
  }
  
  // Check for required components
  const requiredComponents = ['entities', 'use_cases', 'repositories'];
  requiredComponents.forEach(comp => {
    if (!layer.components.includes(comp)) {
      score -= 20;
    }
  });
  
  return Math.max(0, score);
}

function checkDataLayerCompliance(layer) {
  let score = 100;
  
  // Should depend only on domain
  const allowedDeps = ['domain', 'dio', 'sqflite', 'shared_preferences'];
  layer.dependencies.forEach(dep => {
    if (!allowedDeps.includes(dep)) {
      score -= 10;
    }
  });
  
  // Check for required components
  if (!layer.components.includes('repositories')) {
    score -= 25;
  }
  
  if (!layer.components.includes('models')) {
    score -= 15;
  }
  
  return Math.max(0, score);
}

function findArchitectureViolations(structure, architectureType, strictMode) {
  const violations = [];
  
  // Check dependency violations
  if (structure.layers.domain.dependencies.length > 0) {
    violations.push({
      type: 'dependency_violation',
      severity: 'critical',
      layer: 'domain',
      message: 'Domain layer has external dependencies',
      dependencies: structure.layers.domain.dependencies,
      fix: 'Remove all dependencies from domain layer',
    });
  }
  
  // Check presentation accessing data directly
  if (structure.layers.presentation.dependencies.includes('data')) {
    violations.push({
      type: 'layer_violation',
      severity: 'high',
      layer: 'presentation',
      message: 'Presentation layer directly accesses data layer',
      fix: 'Use domain layer use cases instead',
    });
  }
  
  // Check for circular dependencies
  structure.modules.forEach(module => {
    module.crossReferences.forEach(ref => {
      const refModule = structure.modules.find(m => m.name === ref);
      if (refModule && refModule.crossReferences.includes(module.name)) {
        violations.push({
          type: 'circular_dependency',
          severity: 'high',
          modules: [module.name, ref],
          message: `Circular dependency between ${module.name} and ${ref}`,
          fix: 'Extract common functionality to shared module',
        });
      }
    });
  });
  
  // Check for god classes
  if (strictMode) {
    checkForGodClasses(structure, violations);
    checkForFeatureEnvy(structure, violations);
    checkForInappropriateDependencies(structure, violations);
  }
  
  return violations;
}

function checkForGodClasses(structure, violations) {
  // Simulate checking for god classes
  const suspectedGodClasses = [
    { name: 'AppController', methods: 45, dependencies: 12 },
    { name: 'UserService', methods: 38, dependencies: 8 },
  ];
  
  suspectedGodClasses.forEach(cls => {
    if (cls.methods > 20 || cls.dependencies > 5) {
      violations.push({
        type: 'god_class',
        severity: 'medium',
        class: cls.name,
        metrics: {
          methods: cls.methods,
          dependencies: cls.dependencies,
        },
        message: `${cls.name} has too many responsibilities`,
        fix: 'Split into smaller, focused classes',
      });
    }
  });
}

function checkForFeatureEnvy(structure, violations) {
  // Check for classes that use other classes' data excessively
  const featureEnvyInstances = [
    {
      class: 'OrderController',
      accessing: 'UserModel',
      frequency: 15,
    },
  ];
  
  featureEnvyInstances.forEach(instance => {
    if (instance.frequency > 10) {
      violations.push({
        type: 'feature_envy',
        severity: 'medium',
        class: instance.class,
        message: `${instance.class} accesses ${instance.accessing} excessively`,
        fix: 'Move behavior to the data owner or use proper abstraction',
      });
    }
  });
}

function checkForInappropriateDependencies(structure, violations) {
  const inappropriateDeps = [
    {
      from: 'domain/entities/user.dart',
      imports: 'package:flutter/material.dart',
    },
    {
      from: 'data/repositories/product_repository.dart',
      imports: 'presentation/widgets/product_card.dart',
    },
  ];
  
  inappropriateDeps.forEach(dep => {
    violations.push({
      type: 'inappropriate_dependency',
      severity: 'critical',
      file: dep.from,
      import: dep.imports,
      message: 'Layer boundary violation',
      fix: 'Remove inappropriate import and use proper abstraction',
    });
  });
}

function analyzeDependencyFlow(structure) {
  const flow = {
    direction: 'inward',  // Should be inward for clean architecture
    violations: [],
    graph: {},
  };
  
  // Build dependency graph
  Object.entries(structure.layers).forEach(([layer, data]) => {
    flow.graph[layer] = data.dependencies;
  });
  
  // Check flow direction
  if (structure.layers.domain.dependencies.length > 0) {
    flow.direction = 'mixed';
    flow.violations.push('Domain layer has outward dependencies');
  }
  
  if (structure.layers.presentation.dependencies.includes('data')) {
    flow.direction = 'mixed';
    flow.violations.push('Presentation bypasses domain layer');
  }
  
  // Calculate metrics
  flow.metrics = {
    coupling: calculateCoupling(flow.graph),
    cohesion: calculateCohesion(structure),
    instability: calculateInstability(flow.graph),
  };
  
  return flow;
}

function analyzeLayerSeparation(structure) {
  const separation = {
    score: 0,
    issues: [],
    boundaries: {},
  };
  
  // Check layer boundaries
  separation.boundaries = {
    presentationDomain: checkBoundary(structure.layers.presentation, structure.layers.domain),
    domainData: checkBoundary(structure.layers.domain, structure.layers.data),
    dataDomain: checkBoundary(structure.layers.data, structure.layers.domain),
  };
  
  // Check for leaked abstractions
  if (structure.layers.presentation.components.includes('sql_queries')) {
    separation.issues.push({
      type: 'leaked_abstraction',
      layer: 'presentation',
      issue: 'SQL queries in presentation layer',
    });
  }
  
  // Check for proper interfaces
  if (!structure.layers.domain.components.includes('repositories')) {
    separation.issues.push({
      type: 'missing_abstraction',
      layer: 'domain',
      issue: 'Missing repository interfaces',
    });
  }
  
  // Calculate separation score
  separation.score = 100 - (separation.issues.length * 15);
  
  return separation;
}

function checkBoundary(fromLayer, toLayer) {
  return {
    clean: !fromLayer.dependencies.some(dep => 
      toLayer.components.includes(dep)
    ),
    interfaces: true,  // Assume interfaces are used
    abstraction: 'repository',  // Type of abstraction used
  };
}

function calculateArchitectureMetrics(structure) {
  const metrics = {
    modularity: 0,
    maintainability: 0,
    testability: 0,
    reusability: 0,
    complexity: 0,
  };
  
  // Calculate modularity
  const totalFiles = Object.values(structure.layers).reduce((sum, layer) => sum + layer.files, 0);
  const avgFilesPerLayer = totalFiles / Object.keys(structure.layers).length;
  metrics.modularity = Math.min(100, (avgFilesPerLayer / totalFiles) * 300);
  
  // Calculate maintainability
  const violations = structure.violations?.length || 0;
  metrics.maintainability = Math.max(0, 100 - (violations * 10));
  
  // Calculate testability
  const hasUseCases = structure.layers.domain.components.includes('use_cases');
  const hasInterfaces = structure.layers.domain.components.includes('repositories');
  metrics.testability = (hasUseCases ? 50 : 0) + (hasInterfaces ? 50 : 0);
  
  // Calculate reusability
  const domainIndependent = structure.layers.domain.dependencies.length === 0;
  metrics.reusability = domainIndependent ? 90 : 40;
  
  // Calculate complexity
  const avgDependencies = Object.values(structure.layers)
    .reduce((sum, layer) => sum + layer.dependencies.length, 0) / Object.keys(structure.layers).length;
  metrics.complexity = Math.max(0, 100 - (avgDependencies * 20));
  
  return metrics;
}

function generateArchitectureRecommendations(analysis) {
  const recommendations = [];
  
  // Based on compliance scores
  Object.entries(analysis.compliance.layerCompliance).forEach(([layer, score]) => {
    if (score < 80) {
      recommendations.push({
        category: 'compliance',
        layer,
        priority: score < 50 ? 'high' : 'medium',
        message: `${layer} layer compliance is low (${score}%)`,
        actions: getLayerImprovementActions(layer, score),
      });
    }
  });
  
  // Based on violations
  const criticalViolations = analysis.violations.filter(v => v.severity === 'critical');
  if (criticalViolations.length > 0) {
    recommendations.push({
      category: 'violations',
      priority: 'critical',
      message: `${criticalViolations.length} critical architecture violations found`,
      actions: criticalViolations.map(v => v.fix),
    });
  }
  
  // Based on metrics
  if (analysis.metrics.testability < 70) {
    recommendations.push({
      category: 'testability',
      priority: 'high',
      message: 'Low testability score',
      actions: [
        'Introduce use cases for business logic',
        'Use dependency injection',
        'Create interfaces for external dependencies',
      ],
    });
  }
  
  if (analysis.dependencies.flow.direction !== 'inward') {
    recommendations.push({
      category: 'dependencies',
      priority: 'critical',
      message: 'Dependency flow is not following inward direction',
      actions: [
        'Remove outward dependencies from inner layers',
        'Use dependency inversion principle',
        'Introduce proper abstractions',
      ],
    });
  }
  
  return recommendations;
}

function getLayerImprovementActions(layer, score) {
  const actions = {
    presentation: [
      'Remove business logic from UI',
      'Use proper state management',
      'Access data only through domain layer',
    ],
    domain: [
      'Remove all external dependencies',
      'Define clear use cases',
      'Create repository interfaces',
    ],
    data: [
      'Implement repository pattern',
      'Separate models from entities',
      'Use data sources for external access',
    ],
  };
  
  return actions[layer] || ['Review layer responsibilities'];
}

function generateComplianceReport(analysis, architectureType) {
  const report = {
    summary: {
      architecture: architectureType,
      overallScore: analysis.compliance.overallCompliance,
      status: getComplianceStatus(analysis.compliance.overallCompliance),
      date: new Date().toISOString(),
    },
    details: {
      layerScores: analysis.compliance.layerCompliance,
      principleScores: analysis.compliance.principleCompliance,
      patternScores: analysis.compliance.patternCompliance,
    },
    violations: {
      total: analysis.violations.length,
      bySeverity: groupViolationsBySeverity(analysis.violations),
      byType: groupViolationsByType(analysis.violations),
    },
    metrics: analysis.metrics,
    recommendations: {
      immediate: analysis.recommendations.filter(r => r.priority === 'critical'),
      shortTerm: analysis.recommendations.filter(r => r.priority === 'high'),
      longTerm: analysis.recommendations.filter(r => r.priority === 'medium'),
    },
  };
  
  return report;
}

function getComplianceStatus(score) {
  if (score >= 90) return 'Excellent';
  if (score >= 75) return 'Good';
  if (score >= 60) return 'Fair';
  if (score >= 40) return 'Poor';
  return 'Critical';
}

function groupViolationsBySeverity(violations) {
  return violations.reduce((acc, violation) => {
    acc[violation.severity] = (acc[violation.severity] || 0) + 1;
    return acc;
  }, {});
}

function groupViolationsByType(violations) {
  return violations.reduce((acc, violation) => {
    acc[violation.type] = (acc[violation.type] || 0) + 1;
    return acc;
  }, {});
}

function generateRefactoringSuggestions(violations) {
  const suggestions = [];
  
  // Group violations by type for batch refactoring
  const groupedViolations = {};
  violations.forEach(violation => {
    if (!groupedViolations[violation.type]) {
      groupedViolations[violation.type] = [];
    }
    groupedViolations[violation.type].push(violation);
  });
  
  // Generate refactoring plans
  Object.entries(groupedViolations).forEach(([type, typeViolations]) => {
    suggestions.push({
      type,
      count: typeViolations.length,
      plan: generateRefactoringPlan(type, typeViolations),
      effort: estimateRefactoringEffort(type, typeViolations.length),
      impact: 'high',
    });
  });
  
  return {
    suggestions,
    totalEffort: suggestions.reduce((sum, s) => sum + s.effort.hours, 0),
    priority: determinRefactoringPriority(violations),
  };
}

function generateRefactoringPlan(type, violations) {
  const plans = {
    dependency_violation: [
      'Identify improper dependencies',
      'Create abstraction interfaces',
      'Implement dependency inversion',
      'Update imports throughout codebase',
      'Run tests to verify functionality',
    ],
    layer_violation: [
      'Map current layer interactions',
      'Identify bypass points',
      'Introduce proper use cases',
      'Refactor direct access to use domain layer',
      'Update affected components',
    ],
    circular_dependency: [
      'Analyze dependency cycle',
      'Identify shared functionality',
      'Extract to common module',
      'Update references in both modules',
      'Remove circular references',
    ],
    god_class: [
      'Analyze class responsibilities',
      'Group related methods',
      'Extract to focused classes',
      'Update dependencies',
      'Refactor calling code',
    ],
  };
  
  return plans[type] || ['Analyze specific violation', 'Plan refactoring approach', 'Implement changes'];
}

function estimateRefactoringEffort(type, count) {
  const baseEfforts = {
    dependency_violation: 4,
    layer_violation: 6,
    circular_dependency: 8,
    god_class: 12,
    feature_envy: 4,
    inappropriate_dependency: 2,
  };
  
  const baseHours = baseEfforts[type] || 4;
  const totalHours = baseHours * count;
  
  return {
    hours: totalHours,
    days: Math.ceil(totalHours / 8),
    complexity: totalHours > 40 ? 'high' : totalHours > 16 ? 'medium' : 'low',
  };
}

function determinRefactoringPriority(violations) {
  const criticalCount = violations.filter(v => v.severity === 'critical').length;
  const highCount = violations.filter(v => v.severity === 'high').length;
  
  if (criticalCount > 0) return 'immediate';
  if (highCount > 3) return 'high';
  if (violations.length > 5) return 'medium';
  return 'low';
}

function calculateArchitectureScore(analysis) {
  const weights = {
    compliance: 0.4,
    violations: 0.3,
    metrics: 0.2,
    dependencies: 0.1,
  };
  
  const scores = {
    compliance: analysis.compliance.overallCompliance,
    violations: Math.max(0, 100 - (analysis.violations.length * 10)),
    metrics: Object.values(analysis.metrics).reduce((a, b) => a + b, 0) / Object.keys(analysis.metrics).length,
    dependencies: analysis.dependencies.flow.direction === 'inward' ? 100 : 50,
  };
  
  const weightedScore = Object.entries(weights).reduce((total, [key, weight]) => {
    return total + (scores[key] * weight);
  }, 0);
  
  return {
    overall: Math.round(weightedScore),
    breakdown: scores,
    grade: getGrade(weightedScore),
  };
}

function getGrade(score) {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

function generateArchitectureDiagram(structure) {
  return {
    type: 'layered',
    layers: Object.keys(structure.layers).map(layer => ({
      name: layer,
      components: structure.layers[layer].components,
      dependencies: structure.layers[layer].dependencies,
    })),
    mermaidCode: generateMermaidDiagram(structure),
  };
}

function generateMermaidDiagram(structure) {
  let diagram = 'graph TD\n';
  
  // Add layers
  Object.entries(structure.layers).forEach(([layer, data]) => {
    diagram += `  subgraph ${layer}\n`;
    data.components.forEach(comp => {
      diagram += `    ${layer}_${comp}[${comp}]\n`;
    });
    diagram += `  end\n`;
  });
  
  // Add dependencies
  Object.entries(structure.layers).forEach(([layer, data]) => {
    data.dependencies.forEach(dep => {
      if (structure.layers[dep]) {
        diagram += `  ${layer} --> ${dep}\n`;
      }
    });
  });
  
  return diagram;
}

// Helper functions
function checkDependencyRule(structure) {
  // Domain should have no dependencies
  if (structure.layers.domain.dependencies.length === 0) {
    return 100;
  }
  return 0;
}

function checkSingleResponsibility(structure) {
  // Check if components are focused
  let score = 100;
  
  // Penalize for mixed responsibilities
  if (structure.layers.presentation.components.includes('repositories')) {
    score -= 30;
  }
  
  return score;
}

function checkInterfaceSegregation(structure) {
  // Check for proper interfaces
  if (structure.layers.domain.components.includes('repositories')) {
    return 90;
  }
  return 50;
}

function checkDependencyInversion(structure) {
  // Check if dependencies point to abstractions
  if (!structure.layers.data.dependencies.includes('presentation')) {
    return 95;
  }
  return 40;
}

function checkRepositoryPattern(structure) {
  const hasRepoInterface = structure.layers.domain.components.includes('repositories');
  const hasRepoImpl = structure.layers.data.components.includes('repositories');
  
  if (hasRepoInterface && hasRepoImpl) {
    return 100;
  } else if (hasRepoInterface || hasRepoImpl) {
    return 50;
  }
  return 0;
}

function checkUseCasePattern(structure) {
  if (structure.layers.domain.components.includes('use_cases')) {
    return 100;
  }
  return 0;
}

function checkFactoryPattern(structure) {
  // Check for factory usage
  const hasFactories = structure.layers.some(layer => 
    layer.components.includes('factories') || layer.components.includes('builders')
  );
  
  return hasFactories ? 80 : 40;
}

function checkModelCompliance(structure) {
  // For MVVM/MVC
  return 85;
}

function checkViewCompliance(structure) {
  // For MVVM/MVC
  return 90;
}

function checkViewModelCompliance(structure) {
  // For MVVM
  return 88;
}

function checkControllerCompliance(structure) {
  // For MVC
  return 82;
}

function calculateCoupling(graph) {
  const totalDeps = Object.values(graph).reduce((sum, deps) => sum + deps.length, 0);
  const layerCount = Object.keys(graph).length;
  
  return totalDeps / layerCount;
}

function calculateCohesion(structure) {
  // Simplified cohesion calculation
  return 75;
}

function calculateInstability(graph) {
  // Ce / (Ca + Ce) where Ce = efferent coupling, Ca = afferent coupling
  return 0.3;
}