import { parseFlutterCode } from '../utils/parser.js';
import { analyzeCodeStructure } from '../utils/codeAnalyzer.js';

export async function generateWidgetTest(args) {
  const { widgetCode, testFramework = 'flutter_test', includeGoldenTests = false } = args;
  
  try {
    const parsedCode = parseFlutterCode(widgetCode);
    const structure = analyzeCodeStructure(widgetCode);
    
    const testSuite = {
      imports: generateTestImports(parsedCode, testFramework),
      setup: generateTestSetup(parsedCode),
      tests: [],
      goldenTests: [],
    };

    // Generate widget existence tests
    testSuite.tests.push(...generateExistenceTests(parsedCode));
    
    // Generate interaction tests
    if (structure.hasInteractiveWidgets) {
      testSuite.tests.push(...generateInteractionTests(widgetCode, parsedCode));
    }
    
    // Generate state tests for StatefulWidgets
    if (parsedCode.classes.some(c => c.isStateful)) {
      testSuite.tests.push(...generateStateTests(widgetCode, parsedCode));
    }
    
    // Generate edge case tests
    testSuite.tests.push(...generateEdgeCaseTests(parsedCode));
    
    // Generate golden tests if requested
    if (includeGoldenTests) {
      testSuite.goldenTests = generateGoldenTests(parsedCode);
    }
    
    // Generate accessibility tests
    testSuite.tests.push(...generateAccessibilityTests(parsedCode));
    
    const generatedCode = formatTestCode(testSuite);
    const coverage = estimateTestCoverage(testSuite, parsedCode);
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            testCode: generatedCode,
            coverage,
            testCount: testSuite.tests.length + testSuite.goldenTests.length,
            recommendations: generateTestRecommendations(parsedCode, structure),
          }, null, 2),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error generating widget tests: ${error.message}`,
        },
      ],
    };
  }
}

function generateTestImports(parsedCode, framework) {
  const imports = [
    `import 'package:${framework}/flutter_test.dart';`,
    `import 'package:flutter/material.dart';`,
  ];
  
  // Add imports based on widget usage
  if (parsedCode.imports.some(i => i.includes('provider'))) {
    imports.push(`import 'package:provider/provider.dart';`);
  }
  
  return imports;
}

function generateTestSetup(parsedCode) {
  const mainWidget = parsedCode.classes[0]?.name || 'MyWidget';
  
  return `
  Widget createWidgetUnderTest() {
    return MaterialApp(
      home: Scaffold(
        body: ${mainWidget}(),
      ),
    );
  }`;
}

function generateExistenceTests(parsedCode) {
  const tests = [];
  const widgetName = parsedCode.classes[0]?.name || 'MyWidget';
  
  tests.push({
    name: `${widgetName} builds without error`,
    code: `
    testWidgets('${widgetName} builds without error', (WidgetTester tester) async {
      await tester.pumpWidget(createWidgetUnderTest());
      expect(find.byType(${widgetName}), findsOneWidget);
    });`,
  });
  
  // Test for specific widgets found in the code
  const commonWidgets = ['Text', 'Container', 'Column', 'Row', 'Button'];
  parsedCode.widgets.forEach(widget => {
    if (commonWidgets.some(w => widget.includes(w))) {
      tests.push({
        name: `finds ${widget} widget`,
        code: `
    testWidgets('finds ${widget} widget', (WidgetTester tester) async {
      await tester.pumpWidget(createWidgetUnderTest());
      expect(find.byType(${widget}), findsWidgets);
    });`,
      });
    }
  });
  
  return tests;
}

function generateInteractionTests(code, parsedCode) {
  const tests = [];
  
  // Test button taps
  if (code.includes('onPressed') || code.includes('onTap')) {
    tests.push({
      name: 'handles tap interactions',
      code: `
    testWidgets('handles tap interactions', (WidgetTester tester) async {
      bool tapped = false;
      
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: Builder(
              builder: (context) => YourWidget(
                onTap: () => tapped = true,
              ),
            ),
          ),
        ),
      );
      
      await tester.tap(find.byType(InkWell).first);
      await tester.pump();
      
      expect(tapped, isTrue);
    });`,
    });
  }
  
  // Test text input
  if (code.includes('TextField') || code.includes('TextFormField')) {
    tests.push({
      name: 'handles text input',
      code: `
    testWidgets('handles text input', (WidgetTester tester) async {
      await tester.pumpWidget(createWidgetUnderTest());
      
      await tester.enterText(find.byType(TextField).first, 'Test input');
      await tester.pump();
      
      expect(find.text('Test input'), findsOneWidget);
    });`,
    });
  }
  
  // Test scrolling
  if (code.includes('ScrollView') || code.includes('ListView')) {
    tests.push({
      name: 'handles scrolling',
      code: `
    testWidgets('handles scrolling', (WidgetTester tester) async {
      await tester.pumpWidget(createWidgetUnderTest());
      
      await tester.drag(find.byType(ListView).first, const Offset(0, -300));
      await tester.pump();
      
      // Verify scroll position changed
    });`,
    });
  }
  
  return tests;
}

function generateStateTests(code, parsedCode) {
  const tests = [];
  const statefulWidget = parsedCode.classes.find(c => c.isStateful);
  
  if (statefulWidget) {
    tests.push({
      name: 'updates state correctly',
      code: `
    testWidgets('updates state correctly', (WidgetTester tester) async {
      await tester.pumpWidget(createWidgetUnderTest());
      
      // Initial state
      expect(find.text('0'), findsOneWidget);
      
      // Trigger state change
      await tester.tap(find.byIcon(Icons.add));
      await tester.pump();
      
      // Verify state updated
      expect(find.text('1'), findsOneWidget);
    });`,
    });
    
    // Test setState behavior
    if (code.includes('setState')) {
      tests.push({
        name: 'setState triggers rebuild',
        code: `
    testWidgets('setState triggers rebuild', (WidgetTester tester) async {
      await tester.pumpWidget(createWidgetUnderTest());
      
      final initialBuildCount = tester.element(find.byType(${statefulWidget.name})).widget.hashCode;
      
      await tester.tap(find.byType(ElevatedButton).first);
      await tester.pump();
      
      final afterBuildCount = tester.element(find.byType(${statefulWidget.name})).widget.hashCode;
      expect(initialBuildCount, isNot(equals(afterBuildCount)));
    });`,
      });
    }
  }
  
  return tests;
}

function generateEdgeCaseTests(parsedCode) {
  const tests = [];
  
  tests.push({
    name: 'handles null or empty data',
    code: `
    testWidgets('handles null or empty data', (WidgetTester tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: YourWidget(data: null),
          ),
        ),
      );
      
      expect(tester.takeException(), isNull);
    });`,
  });
  
  tests.push({
    name: 'handles extremely long text',
    code: `
    testWidgets('handles extremely long text', (WidgetTester tester) async {
      final longText = 'A' * 1000;
      
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: YourWidget(text: longText),
          ),
        ),
      );
      
      expect(find.text(longText), findsOneWidget);
      expect(tester.takeException(), isNull);
    });`,
  });
  
  tests.push({
    name: 'handles rapid interactions',
    code: `
    testWidgets('handles rapid interactions', (WidgetTester tester) async {
      await tester.pumpWidget(createWidgetUnderTest());
      
      // Rapidly tap button
      for (int i = 0; i < 10; i++) {
        await tester.tap(find.byType(ElevatedButton).first);
      }
      
      await tester.pump();
      expect(tester.takeException(), isNull);
    });`,
  });
  
  return tests;
}

function generateGoldenTests(parsedCode) {
  const goldenTests = [];
  const widgetName = parsedCode.classes[0]?.name || 'MyWidget';
  
  goldenTests.push({
    name: 'matches golden file',
    code: `
    testWidgets('${widgetName} matches golden file', (WidgetTester tester) async {
      await tester.pumpWidget(createWidgetUnderTest());
      
      await expectLater(
        find.byType(${widgetName}),
        matchesGoldenFile('goldens/${widgetName.toLowerCase()}.png'),
      );
    });`,
  });
  
  // Golden tests for different states
  goldenTests.push({
    name: 'matches golden file in dark mode',
    code: `
    testWidgets('${widgetName} matches golden file in dark mode', (WidgetTester tester) async {
      await tester.pumpWidget(
        MaterialApp(
          theme: ThemeData.dark(),
          home: ${widgetName}(),
        ),
      );
      
      await expectLater(
        find.byType(${widgetName}),
        matchesGoldenFile('goldens/${widgetName.toLowerCase()}_dark.png'),
      );
    });`,
  });
  
  // Different screen sizes
  goldenTests.push({
    name: 'matches golden file on tablet',
    code: `
    testWidgets('${widgetName} matches golden file on tablet', (WidgetTester tester) async {
      tester.binding.window.physicalSizeTestValue = const Size(1024, 768);
      tester.binding.window.devicePixelRatioTestValue = 1.0;
      
      await tester.pumpWidget(createWidgetUnderTest());
      
      await expectLater(
        find.byType(${widgetName}),
        matchesGoldenFile('goldens/${widgetName.toLowerCase()}_tablet.png'),
      );
    });`,
  });
  
  return goldenTests;
}

function generateAccessibilityTests(parsedCode) {
  const tests = [];
  
  tests.push({
    name: 'meets accessibility guidelines',
    code: `
    testWidgets('meets accessibility guidelines', (WidgetTester tester) async {
      final SemanticsHandle handle = tester.ensureSemantics();
      await tester.pumpWidget(createWidgetUnderTest());
      
      // Check for semantic labels
      expect(tester.getSemantics(find.byType(Image)), isNotNull);
      
      // Check for button labels
      final buttons = find.byType(ElevatedButton);
      if (buttons.evaluate().isNotEmpty) {
        expect(
          tester.getSemantics(buttons.first),
          matchesSemantics(label: isNotNull),
        );
      }
      
      handle.dispose();
    });`,
  });
  
  tests.push({
    name: 'supports screen readers',
    code: `
    testWidgets('supports screen readers', (WidgetTester tester) async {
      await tester.pumpWidget(createWidgetUnderTest());
      
      // Verify important elements have semantic labels
      final semantics = tester.getSemantics(find.byType(Scaffold));
      expect(semantics.label, isNotNull);
    });`,
  });
  
  return tests;
}

function formatTestCode(testSuite) {
  let code = '';
  
  // Add imports
  code += testSuite.imports.join('\n') + '\n\n';
  
  // Add main test function
  code += 'void main() {\n';
  
  // Add setup
  code += testSuite.setup + '\n';
  
  // Add regular tests
  code += '\n  group(\'Widget Tests\', () {\n';
  testSuite.tests.forEach(test => {
    code += test.code + '\n';
  });
  code += '  });\n';
  
  // Add golden tests if any
  if (testSuite.goldenTests.length > 0) {
    code += '\n  group(\'Golden Tests\', () {\n';
    testSuite.goldenTests.forEach(test => {
      code += test.code + '\n';
    });
    code += '  });\n';
  }
  
  code += '}\n';
  
  return code;
}

function estimateTestCoverage(testSuite, parsedCode) {
  const totalTests = testSuite.tests.length + testSuite.goldenTests.length;
  const widgetCount = parsedCode.widgets.length;
  const methodCount = parsedCode.methods.length;
  
  const coverage = {
    estimatedPercentage: Math.min(95, (totalTests / (widgetCount + methodCount)) * 100),
    coveredAreas: [],
    uncoveredAreas: [],
  };
  
  // Determine covered areas
  if (testSuite.tests.some(t => t.name.includes('builds without error'))) {
    coverage.coveredAreas.push('Widget construction');
  }
  
  if (testSuite.tests.some(t => t.name.includes('interaction'))) {
    coverage.coveredAreas.push('User interactions');
  }
  
  if (testSuite.tests.some(t => t.name.includes('state'))) {
    coverage.coveredAreas.push('State management');
  }
  
  if (testSuite.goldenTests.length > 0) {
    coverage.coveredAreas.push('Visual regression');
  }
  
  // Determine uncovered areas
  if (!testSuite.tests.some(t => t.name.includes('performance'))) {
    coverage.uncoveredAreas.push('Performance testing');
  }
  
  if (!testSuite.tests.some(t => t.name.includes('animation'))) {
    coverage.uncoveredAreas.push('Animation testing');
  }
  
  return coverage;
}

function generateTestRecommendations(parsedCode, structure) {
  const recommendations = [];
  
  if (structure.hasBusinessLogicInUI) {
    recommendations.push({
      type: 'architecture',
      message: 'Consider extracting business logic to make testing easier',
      priority: 'high',
    });
  }
  
  if (!parsedCode.methods.some(m => m.name.includes('test'))) {
    recommendations.push({
      type: 'testing',
      message: 'Add unit tests for individual methods',
      priority: 'medium',
    });
  }
  
  if (structure.hasDataFetching) {
    recommendations.push({
      type: 'mocking',
      message: 'Use mock data providers for network requests in tests',
      priority: 'high',
    });
  }
  
  recommendations.push({
    type: 'integration',
    message: 'Consider adding integration tests for complete user flows',
    priority: 'medium',
  });
  
  return recommendations;
}