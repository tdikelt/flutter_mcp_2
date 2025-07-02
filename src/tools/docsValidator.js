import axios from 'axios';
import * as cheerio from 'cheerio';
import { flutterAPIPatterns } from '../validators/apiPatterns.js';

const FLUTTER_DOCS_BASE = 'https://api.flutter.dev/flutter';
const FLUTTER_WIDGETS_CATALOG = 'https://docs.flutter.dev/ui/widgets';

export async function validateFlutterDocs(args) {
  const { code, widgetType } = args;
  
  const validationResults = {
    deprecatedAPIs: [],
    incorrectUsage: [],
    recommendations: [],
    documentationLinks: [],
  };

  try {
    const usedWidgets = extractWidgets(code);
    const usedMethods = extractMethods(code);

    for (const widget of usedWidgets) {
      const widgetValidation = await validateWidget(widget, code);
      if (widgetValidation.issues.length > 0) {
        validationResults.incorrectUsage.push(...widgetValidation.issues);
      }
      if (widgetValidation.deprecated) {
        validationResults.deprecatedAPIs.push({
          widget,
          replacement: widgetValidation.replacement,
          reason: widgetValidation.reason,
        });
      }
      if (widgetValidation.docLink) {
        validationResults.documentationLinks.push({
          widget,
          link: widgetValidation.docLink,
        });
      }
    }

    const propertyValidation = validateProperties(code, usedWidgets);
    validationResults.incorrectUsage.push(...propertyValidation);

    const bestPractices = checkBestPractices(code, usedWidgets);
    validationResults.recommendations.push(...bestPractices);

    if (widgetType) {
      const specificValidation = await validateSpecificWidget(widgetType, code);
      validationResults.recommendations.push(...specificValidation);
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            validationResults,
            summary: generateValidationSummary(validationResults),
            score: calculateComplianceScore(validationResults),
          }, null, 2),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error validating against Flutter documentation: ${error.message}`,
        },
      ],
    };
  }
}

function extractWidgets(code) {
  const widgetPattern = /\b([A-Z][a-zA-Z]*)\s*\(/g;
  const matches = [...code.matchAll(widgetPattern)];
  const widgets = matches.map(match => match[1]);
  
  const flutterWidgets = [
    'Container', 'Row', 'Column', 'Stack', 'Scaffold', 'AppBar',
    'Text', 'Image', 'Icon', 'IconButton', 'ElevatedButton', 'TextButton',
    'ListView', 'GridView', 'SingleChildScrollView', 'CustomScrollView',
    'AnimatedBuilder', 'AnimatedContainer', 'Hero', 'Transform',
    'GestureDetector', 'InkWell', 'Draggable', 'DragTarget',
  ];
  
  return widgets.filter(w => flutterWidgets.includes(w));
}

function extractMethods(code) {
  const methodPattern = /\.(\w+)\s*\(/g;
  const matches = [...code.matchAll(methodPattern)];
  return matches.map(match => match[1]);
}

async function validateWidget(widget, code) {
  const validation = {
    issues: [],
    deprecated: false,
    replacement: null,
    reason: null,
    docLink: `${FLUTTER_DOCS_BASE}/widgets/${widget}-class.html`,
  };

  const deprecatedWidgets = {
    'FlatButton': { replacement: 'TextButton', reason: 'Deprecated in Flutter 2.0' },
    'RaisedButton': { replacement: 'ElevatedButton', reason: 'Deprecated in Flutter 2.0' },
    'OutlineButton': { replacement: 'OutlinedButton', reason: 'Deprecated in Flutter 2.0' },
  };

  if (deprecatedWidgets[widget]) {
    validation.deprecated = true;
    validation.replacement = deprecatedWidgets[widget].replacement;
    validation.reason = deprecatedWidgets[widget].reason;
  }

  const widgetRules = getWidgetRules(widget);
  if (widgetRules) {
    for (const rule of widgetRules) {
      if (!rule.validate(code)) {
        validation.issues.push({
          widget,
          issue: rule.message,
          severity: rule.severity,
        });
      }
    }
  }

  return validation;
}

function getWidgetRules(widget) {
  const rules = {
    'Container': [
      {
        validate: (code) => {
          const containerMatch = code.match(/Container\s*\([^)]*\)/);
          if (containerMatch) {
            const hasChild = containerMatch[0].includes('child:');
            const hasDecoration = containerMatch[0].includes('decoration:');
            const hasColor = containerMatch[0].includes('color:');
            return !(hasDecoration && hasColor);
          }
          return true;
        },
        message: 'Cannot provide both color and decoration properties',
        severity: 'error',
      },
    ],
    'Column': [
      {
        validate: (code) => {
          const columnMatch = code.match(/Column\s*\([^{]*{[^}]*}\s*\)/);
          if (columnMatch && columnMatch[0].includes('Expanded')) {
            return true;
          }
          if (columnMatch && columnMatch[0].includes('Flexible')) {
            return true;
          }
          return !code.includes('RenderFlex overflowed');
        },
        message: 'Consider using Expanded or Flexible for children that might overflow',
        severity: 'warning',
      },
    ],
    'ListView': [
      {
        validate: (code) => {
          const listViewMatch = code.match(/ListView\s*\([^)]*\)/);
          if (listViewMatch) {
            return listViewMatch[0].includes('shrinkWrap: true') || 
                   !code.includes('Column') || 
                   code.includes('Expanded');
          }
          return true;
        },
        message: 'ListView inside Column requires shrinkWrap: true or wrap with Expanded',
        severity: 'error',
      },
    ],
  };

  return rules[widget] || null;
}

function validateProperties(code, widgets) {
  const issues = [];

  if (code.includes('setState') && !code.includes('mounted')) {
    issues.push({
      property: 'setState',
      issue: 'Always check mounted before calling setState',
      severity: 'warning',
      suggestion: 'if (mounted) { setState(() { ... }); }',
    });
  }

  if (code.includes('MediaQuery.of(context)') && !code.includes('MediaQuery.maybeOf')) {
    issues.push({
      property: 'MediaQuery',
      issue: 'Consider using MediaQuery.maybeOf for safer null handling',
      severity: 'info',
    });
  }

  return issues;
}

function checkBestPractices(code, widgets) {
  const recommendations = [];

  if (widgets.includes('Container') && !hasConstraints(code)) {
    recommendations.push({
      type: 'best_practice',
      message: 'Container without constraints can expand infinitely',
      suggestion: 'Provide width/height or use constraints',
    });
  }

  if (code.includes('Key(') && !code.includes('ValueKey') && !code.includes('UniqueKey')) {
    recommendations.push({
      type: 'best_practice',
      message: 'Use specific Key types (ValueKey, UniqueKey, ObjectKey) instead of generic Key',
    });
  }

  if (widgets.includes('Image') && !code.includes('errorBuilder')) {
    recommendations.push({
      type: 'robustness',
      message: 'Add errorBuilder to Image widgets for better error handling',
    });
  }

  return recommendations;
}

async function validateSpecificWidget(widgetType, code) {
  const recommendations = [];
  
  const widgetGuidelines = {
    'Form': [
      'Use GlobalKey<FormState> for form validation',
      'Implement proper validation for each TextFormField',
      'Handle form submission with proper error states',
    ],
    'AnimatedBuilder': [
      'Ensure animation controller is properly disposed',
      'Use const constructors for child widgets that don\'t animate',
      'Consider AnimatedWidget for simpler cases',
    ],
    'StreamBuilder': [
      'Always handle all ConnectionState cases',
      'Provide initialData when possible',
      'Handle error states explicitly',
    ],
  };

  if (widgetGuidelines[widgetType]) {
    widgetGuidelines[widgetType].forEach(guideline => {
      recommendations.push({
        type: 'guideline',
        widget: widgetType,
        message: guideline,
      });
    });
  }

  return recommendations;
}

function hasConstraints(code) {
  const constraintProperties = ['width:', 'height:', 'constraints:'];
  return constraintProperties.some(prop => code.includes(prop));
}

function generateValidationSummary(results) {
  return {
    totalIssues: results.incorrectUsage.length + results.deprecatedAPIs.length,
    criticalIssues: results.incorrectUsage.filter(i => i.severity === 'error').length,
    deprecatedAPIs: results.deprecatedAPIs.length,
    recommendations: results.recommendations.length,
    documentationAvailable: results.documentationLinks.length,
  };
}

function calculateComplianceScore(results) {
  let score = 100;
  
  results.incorrectUsage.forEach(issue => {
    if (issue.severity === 'error') score -= 10;
    else if (issue.severity === 'warning') score -= 5;
    else score -= 2;
  });
  
  score -= results.deprecatedAPIs.length * 15;
  
  return Math.max(0, score);
}