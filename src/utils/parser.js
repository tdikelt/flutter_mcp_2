export function parseFlutterCode(code) {
  const structure = {
    widgets: [],
    methods: [],
    classes: [],
    imports: [],
  };

  const importRegex = /import\s+['"]([^'"]+)['"]/g;
  const classRegex = /class\s+(\w+)\s+extends\s+(\w+)/g;
  const methodRegex = /(\w+)\s+(\w+)\s*\([^)]*\)\s*(?:async\s*)?\{/g;
  const widgetRegex = /(\w+)\s*\(/g;

  let match;
  while ((match = importRegex.exec(code)) !== null) {
    structure.imports.push(match[1]);
  }

  while ((match = classRegex.exec(code)) !== null) {
    structure.classes.push({
      name: match[1],
      extends: match[2],
      isStateful: match[2] === 'StatefulWidget',
      isStateless: match[2] === 'StatelessWidget',
    });
  }

  while ((match = methodRegex.exec(code)) !== null) {
    structure.methods.push({
      returnType: match[1],
      name: match[2],
      isAsync: code.substring(match.index, match.index + 100).includes('async'),
    });
  }

  const flutterWidgets = new Set([
    'Container', 'Row', 'Column', 'Stack', 'Scaffold', 
    'Text', 'Image', 'Icon', 'Button', 'ListView',
  ]);

  while ((match = widgetRegex.exec(code)) !== null) {
    if (flutterWidgets.has(match[1]) || match[1].endsWith('Widget')) {
      structure.widgets.push(match[1]);
    }
  }

  return structure;
}