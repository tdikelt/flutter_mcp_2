export function getFlutterBestPractices() {
  return {
    widgetDesign: [
      'Prefer composition over inheritance',
      'Extract widgets into separate files when they grow large',
      'Use const constructors whenever possible',
      'Avoid deeply nested widget trees',
    ],
    stateManagement: [
      'Lift state up to the common ancestor',
      'Use immutable state objects',
      'Avoid calling setState in loops',
      'Dispose controllers and subscriptions properly',
    ],
    performance: [
      'Use ListView.builder for long lists',
      'Implement keys for list items',
      'Cache expensive computations',
      'Use RepaintBoundary for expensive widgets',
    ],
    accessibility: [
      'Provide semantic labels for images',
      'Add tooltips to icon buttons',
      'Ensure proper contrast ratios',
      'Support screen readers with Semantics widgets',
    ],
  };
}