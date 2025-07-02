// Example usage of Flutter MCP Service tools

// Example 1: Analyzing a Flutter Widget
const widgetAnalysisExample = {
  tool: 'analyze_widget',
  arguments: {
    widgetCode: `
class MyCustomWidget extends StatefulWidget {
  @override
  _MyCustomWidgetState createState() => _MyCustomWidgetState();
}

class _MyCustomWidgetState extends State<MyCustomWidget> {
  final _controller = TextEditingController();
  
  @override
  Widget build(BuildContext context) {
    return Container(
      color: Colors.blue,
      child: Column(
        children: [
          Image.asset('assets/logo.png'),
          TextField(controller: _controller),
          IconButton(
            icon: Icon(Icons.send),
            onPressed: () {
              setState(() {
                // Process data
              });
            },
          ),
        ],
      ),
    );
  }
}`,
    checkAccessibility: true,
    checkPerformance: true,
  }
};

// Example 2: Validating Flutter Documentation compliance
const docsValidationExample = {
  tool: 'validate_flutter_docs',
  arguments: {
    code: `
Container(
  color: Colors.red,
  decoration: BoxDecoration(
    border: Border.all(color: Colors.blue),
  ),
  child: Text('Hello'),
)`,
    widgetType: 'Container'
  }
};

// Example 3: Analyzing a pub.dev package
const pubAnalysisExample = {
  tool: 'analyze_pub_package',
  arguments: {
    packageName: 'flutter_bloc',
    checkDependencies: true,
    checkScores: true
  }
};

// Example 4: Getting improvement suggestions
const improvementExample = {
  tool: 'suggest_improvements',
  arguments: {
    code: `
class ProductList extends StatelessWidget {
  final List<Product> products;
  
  @override
  Widget build(BuildContext context) {
    return ListView(
      children: products.map((product) => 
        ProductCard(product: product)
      ).toList(),
    );
  }
}`,
    focusArea: 'performance'
  }
};

// Example 5: Analyzing performance
const performanceExample = {
  tool: 'analyze_performance',
  arguments: {
    widgetTree: `
Scaffold(
  body: Column(
    children: [
      AnimatedContainer(
        duration: Duration(seconds: 1),
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
          child: Container(
            child: ListView(
              children: List.generate(100, (index) => 
                ListTile(title: Text('Item $index'))
              ),
            ),
          ),
        ),
      ),
    ],
  ),
)`,
    checkRebuildOptimization: true,
    checkMemoryLeaks: true
  }
};

// Export examples for testing
export const examples = {
  widgetAnalysis: widgetAnalysisExample,
  docsValidation: docsValidationExample,
  pubAnalysis: pubAnalysisExample,
  improvement: improvementExample,
  performance: performanceExample,
};