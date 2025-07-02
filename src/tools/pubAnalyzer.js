import axios from 'axios';
import yaml from 'yaml';

const PUB_API_BASE = 'https://pub.dev/api';

export async function analyzePubPackage(args) {
  const { packageName, checkDependencies = true, checkScores = true } = args;
  
  try {
    const packageInfo = await fetchPackageInfo(packageName);
    const analysis = {
      package: {
        name: packageInfo.name,
        version: packageInfo.latest.version,
        description: packageInfo.latest.pubspec.description,
        homepage: packageInfo.latest.pubspec.homepage,
        repository: packageInfo.latest.pubspec.repository,
      },
      metrics: {},
      dependencies: {},
      compatibility: {},
      recommendations: [],
    };

    if (checkScores) {
      const scores = await fetchPackageScores(packageName);
      analysis.metrics = {
        likes: scores.likeCount,
        pubPoints: scores.grantedPoints,
        maxPoints: scores.maxPoints,
        popularity: scores.popularityScore,
        health: calculateHealthScore(scores),
      };
      
      analysis.recommendations.push(...generateScoreRecommendations(scores));
    }

    if (checkDependencies) {
      const dependencies = packageInfo.latest.pubspec.dependencies || {};
      const devDependencies = packageInfo.latest.pubspec.dev_dependencies || {};
      
      analysis.dependencies = {
        runtime: await analyzeDependencies(dependencies),
        dev: await analyzeDependencies(devDependencies),
      };
      
      analysis.recommendations.push(...generateDependencyRecommendations(analysis.dependencies));
    }

    const compatibility = await checkFlutterCompatibility(packageInfo);
    analysis.compatibility = compatibility;
    
    if (compatibility.issues.length > 0) {
      analysis.recommendations.push(...compatibility.issues.map(issue => ({
        type: 'compatibility',
        message: issue,
        severity: 'warning',
      })));
    }

    const securityCheck = await performSecurityCheck(packageName, packageInfo);
    if (securityCheck.issues.length > 0) {
      analysis.security = securityCheck;
      analysis.recommendations.push(...securityCheck.issues.map(issue => ({
        type: 'security',
        message: issue.message,
        severity: issue.severity,
      })));
    }

    analysis.summary = generatePackageSummary(analysis);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(analysis, null, 2),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error analyzing package: ${error.message}`,
        },
      ],
    };
  }
}

async function fetchPackageInfo(packageName) {
  try {
    const response = await axios.get(`${PUB_API_BASE}/packages/${packageName}`);
    return response.data;
  } catch (error) {
    if (error.response?.status === 404) {
      throw new Error(`Package '${packageName}' not found on pub.dev`);
    }
    throw error;
  }
}

async function fetchPackageScores(packageName) {
  try {
    const response = await axios.get(`${PUB_API_BASE}/packages/${packageName}/score`);
    return response.data;
  } catch (error) {
    console.error('Error fetching scores:', error.message);
    return null;
  }
}

function calculateHealthScore(scores) {
  if (!scores) return 'Unknown';
  const percentage = (scores.grantedPoints / scores.maxPoints) * 100;
  
  if (percentage >= 90) return 'Excellent';
  if (percentage >= 75) return 'Good';
  if (percentage >= 50) return 'Fair';
  return 'Poor';
}

async function analyzeDependencies(deps) {
  const analysis = {
    count: Object.keys(deps).length,
    packages: {},
  };

  for (const [depName, version] of Object.entries(deps)) {
    try {
      const depInfo = await fetchPackageInfo(depName);
      const latestVersion = depInfo.latest.version;
      const isOutdated = !isVersionCompatible(version, latestVersion);
      
      analysis.packages[depName] = {
        specified: version,
        latest: latestVersion,
        isOutdated,
        lastUpdated: depInfo.latest.published,
      };
    } catch (error) {
      analysis.packages[depName] = {
        specified: version,
        error: 'Failed to fetch package info',
      };
    }
  }

  return analysis;
}

function isVersionCompatible(specified, latest) {
  if (specified === 'any' || specified === latest) return true;
  
  if (specified.startsWith('^')) {
    const specParts = specified.substring(1).split('.').map(Number);
    const latestParts = latest.split('.').map(Number);
    
    return specParts[0] === latestParts[0] && 
           (latestParts[1] >= specParts[1] || 
            (latestParts[1] === specParts[1] && latestParts[2] >= specParts[2]));
  }
  
  return false;
}

async function checkFlutterCompatibility(packageInfo) {
  const compatibility = {
    flutter: false,
    dart: null,
    platforms: [],
    issues: [],
  };

  const pubspec = packageInfo.latest.pubspec;
  
  if (pubspec.environment) {
    compatibility.dart = pubspec.environment.sdk;
    
    if (pubspec.dependencies?.flutter) {
      compatibility.flutter = true;
    }
  }

  if (pubspec.flutter) {
    if (pubspec.flutter.plugin) {
      compatibility.platforms = Object.keys(pubspec.flutter.plugin.platforms || {});
    }
  }

  if (!compatibility.flutter && packageInfo.latest.pubspec.description?.toLowerCase().includes('flutter')) {
    compatibility.issues.push('Package mentions Flutter but doesn\'t declare Flutter dependency');
  }

  if (compatibility.dart && !isValidDartConstraint(compatibility.dart)) {
    compatibility.issues.push('Dart SDK constraint might be too restrictive');
  }

  return compatibility;
}

function isValidDartConstraint(constraint) {
  if (!constraint.includes('>=') || !constraint.includes('<')) {
    return false;
  }
  return true;
}

async function performSecurityCheck(packageName, packageInfo) {
  const security = {
    issues: [],
    score: 100,
  };

  if (!packageInfo.latest.pubspec.homepage && !packageInfo.latest.pubspec.repository) {
    security.issues.push({
      message: 'Package lacks homepage or repository URL',
      severity: 'low',
    });
    security.score -= 10;
  }

  const age = Date.now() - new Date(packageInfo.latest.published).getTime();
  const daysSinceUpdate = age / (1000 * 60 * 60 * 24);
  
  if (daysSinceUpdate > 365) {
    security.issues.push({
      message: `Package hasn't been updated in ${Math.floor(daysSinceUpdate)} days`,
      severity: 'medium',
    });
    security.score -= 20;
  }

  if (packageInfo.versions.length < 3) {
    security.issues.push({
      message: 'Package has very few releases, might be unstable',
      severity: 'low',
    });
    security.score -= 15;
  }

  return security;
}

function generateScoreRecommendations(scores) {
  const recommendations = [];
  
  if (!scores) {
    return [{
      type: 'metrics',
      message: 'Package scores not available',
      severity: 'info',
    }];
  }

  const percentage = (scores.grantedPoints / scores.maxPoints) * 100;
  
  if (percentage < 75) {
    recommendations.push({
      type: 'quality',
      message: `Package health score is ${percentage.toFixed(1)}%. Consider packages with higher scores`,
      severity: 'warning',
    });
  }

  if (scores.popularityScore < 0.5) {
    recommendations.push({
      type: 'popularity',
      message: 'Package has low popularity. Consider more widely adopted alternatives',
      severity: 'info',
    });
  }

  return recommendations;
}

function generateDependencyRecommendations(deps) {
  const recommendations = [];
  
  let outdatedCount = 0;
  for (const dep of Object.values(deps.runtime.packages)) {
    if (dep.isOutdated) outdatedCount++;
  }
  
  if (outdatedCount > 0) {
    recommendations.push({
      type: 'dependencies',
      message: `${outdatedCount} outdated dependencies found`,
      severity: 'warning',
    });
  }

  if (deps.runtime.count > 20) {
    recommendations.push({
      type: 'dependencies',
      message: 'High number of dependencies may increase bundle size and complexity',
      severity: 'info',
    });
  }

  return recommendations;
}

function generatePackageSummary(analysis) {
  const summary = {
    overallRating: 'Good',
    strengths: [],
    concerns: [],
    recommendation: '',
  };

  if (analysis.metrics.health === 'Excellent' || analysis.metrics.health === 'Good') {
    summary.strengths.push('High package quality score');
  }

  if (analysis.metrics.popularity > 0.7) {
    summary.strengths.push('Popular and well-adopted package');
  }

  if (analysis.compatibility.flutter) {
    summary.strengths.push('Flutter-compatible');
  }

  if (analysis.recommendations.filter(r => r.severity === 'warning').length > 2) {
    summary.overallRating = 'Fair';
    summary.concerns.push('Multiple warnings detected');
  }

  if (analysis.security && analysis.security.score < 70) {
    summary.overallRating = 'Poor';
    summary.concerns.push('Security concerns identified');
  }

  summary.recommendation = summary.overallRating === 'Good' || summary.overallRating === 'Excellent' 
    ? 'Package is recommended for use'
    : 'Consider alternatives or proceed with caution';

  return summary;
}