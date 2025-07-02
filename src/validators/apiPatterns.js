export const flutterAPIPatterns = {
  deprecated: {
    widgets: {
      'FlatButton': 'TextButton',
      'RaisedButton': 'ElevatedButton',
      'OutlineButton': 'OutlinedButton',
      'ButtonTheme': 'TextButtonTheme/ElevatedButtonTheme',
    },
    methods: {
      'overflow': 'clipBehavior',
      'disabledElevation': 'Deprecated in Material 3',
      'highlightElevation': 'Deprecated in Material 3',
    },
  },
  patterns: {
    navigation: {
      correct: 'Navigator.of(context).push',
      incorrect: 'Navigator.push',
      reason: 'Use Navigator.of(context) for better context handling',
    },
    mediaQuery: {
      correct: 'MediaQuery.maybeOf(context)',
      incorrect: 'MediaQuery.of(context)',
      reason: 'maybeOf prevents crashes when MediaQuery is not available',
    },
    theme: {
      correct: 'Theme.of(context).colorScheme',
      incorrect: 'Theme.of(context).accentColor',
      reason: 'accentColor is deprecated, use colorScheme',
    },
  },
  requirements: {
    'Scaffold': ['Must have body or appBar', 'Should not be nested'],
    'Column': ['Children in Expanded/Flexible when in bounded height'],
    'Row': ['Children in Expanded/Flexible when in bounded width'],
    'Stack': ['At least one Positioned child for proper layout'],
  },
};