export async function generateL10nSetup(args) {
  const { 
    supportedLocales = ['en', 'es', 'fr', 'de'],
    extractExisting = true,
    includeRTL = false,
    usePlurals = true,
    useGenderRules = false
  } = args;
  
  try {
    const setup = {
      configuration: generateL10nConfiguration(supportedLocales, includeRTL),
      structure: generateL10nStructure(supportedLocales),
      implementation: generateImplementationCode(supportedLocales, usePlurals, useGenderRules),
      extractedStrings: extractExisting ? await extractStringsFromCode() : null,
      arbFiles: generateARBFiles(supportedLocales, usePlurals, useGenderRules),
      integration: generateIntegrationGuide(),
      bestPractices: getL10nBestPractices(),
    };
    
    const files = generateAllL10nFiles(setup);
    const documentation = generateL10nDocumentation(setup);
    const commands = getL10nCommands();
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            setup,
            files,
            documentation,
            commands,
            tooling: recommendL10nTools(),
          }, null, 2),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error generating L10n setup: ${error.message}`,
        },
      ],
    };
  }
}

function generateL10nConfiguration(locales, includeRTL) {
  const rtlLocales = ['ar', 'he', 'fa', 'ur'];
  const hasRTL = includeRTL || locales.some(l => rtlLocales.includes(l));
  
  return {
    pubspec: `
# Add to pubspec.yaml
dependencies:
  flutter:
    sdk: flutter
  flutter_localizations:
    sdk: flutter
  intl: ^0.18.1

dev_dependencies:
  flutter_test:
    sdk: flutter

flutter:
  generate: true

# Create l10n.yaml in project root`,
    
    l10nYaml: `
arb-dir: lib/l10n
template-arb-file: app_en.arb
output-localization-file: app_localizations.dart
output-class: AppLocalizations
synthetic-package: false
${hasRTL ? 'use-escaping: true' : ''}`,

    analysisOptions: `
# Add to analysis_options.yaml
analyzer:
  exclude:
    - "**/*.g.dart"
    - "**/*.freezed.dart"
    - ".dart_tool/**"
    - "lib/l10n/**"`,
  };
}

function generateL10nStructure(locales) {
  return `
lib/
├── l10n/
│   ├── app_en.arb          # Template file (source of truth)
${locales.filter(l => l !== 'en').map(l => `│   ├── app_${l}.arb          # ${getLocaleName(l)} translations`).join('\n')}
│   └── l10n.dart           # Export file
├── core/
│   └── localization/
│       ├── locale_provider.dart
│       ├── locale_service.dart
│       └── language_constants.dart
└── main.dart               # Updated with localization`;
}

function generateImplementationCode(locales, usePlurals, useGender) {
  const mainApp = `
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_gen/gen_l10n/app_localizations.dart';
import 'core/localization/locale_provider.dart';

void main() {
  runApp(MyApp());
}

class MyApp extends StatefulWidget {
  @override
  State<MyApp> createState() => _MyAppState();
  
  static void setLocale(BuildContext context, Locale newLocale) {
    _MyAppState? state = context.findAncestorStateOfType<_MyAppState>();
    state?.setLocale(newLocale);
  }
}

class _MyAppState extends State<MyApp> {
  Locale? _locale;
  
  setLocale(Locale locale) {
    setState(() {
      _locale = locale;
    });
  }
  
  @override
  void didChangeDependencies() {
    getLocale().then((locale) => setLocale(locale));
    super.didChangeDependencies();
  }
  
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'Flutter Localization',
      theme: ThemeData(
        primarySwatch: Colors.blue,
      ),
      locale: _locale,
      supportedLocales: AppLocalizations.supportedLocales,
      localizationsDelegates: [
        AppLocalizations.delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      localeResolutionCallback: (locale, supportedLocales) {
        for (var supportedLocale in supportedLocales) {
          if (supportedLocale.languageCode == locale?.languageCode &&
              supportedLocale.countryCode == locale?.countryCode) {
            return supportedLocale;
          }
        }
        for (var supportedLocale in supportedLocales) {
          if (supportedLocale.languageCode == locale?.languageCode) {
            return supportedLocale;
          }
        }
        return supportedLocales.first;
      },
      home: HomePage(),
    );
  }
}`;

  const localeProvider = `
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

const String LANGUAGE_CODE = 'languageCode';

// Supported languages
const String ENGLISH = 'en';
const String SPANISH = 'es';
const String FRENCH = 'fr';
const String GERMAN = 'de';

Future<Locale> setLocale(String languageCode) async {
  SharedPreferences prefs = await SharedPreferences.getInstance();
  await prefs.setString(LANGUAGE_CODE, languageCode);
  return _locale(languageCode);
}

Future<Locale> getLocale() async {
  SharedPreferences prefs = await SharedPreferences.getInstance();
  String languageCode = prefs.getString(LANGUAGE_CODE) ?? ENGLISH;
  return _locale(languageCode);
}

Locale _locale(String languageCode) {
  switch (languageCode) {
    case ENGLISH:
      return Locale(ENGLISH, 'US');
    case SPANISH:
      return Locale(SPANISH, 'ES');
    case FRENCH:
      return Locale(FRENCH, 'FR');
    case GERMAN:
      return Locale(GERMAN, 'DE');
    default:
      return Locale(ENGLISH, 'US');
  }
}

// Get translated language name
String getTranslatedLanguageName(BuildContext context, String languageCode) {
  switch (languageCode) {
    case ENGLISH:
      return 'English';
    case SPANISH:
      return 'Español';
    case FRENCH:
      return 'Français';
    case GERMAN:
      return 'Deutsch';
    default:
      return 'English';
  }
}`;

  const localeService = `
import 'package:flutter/material.dart';
import 'locale_provider.dart';

class LocaleService {
  static final LocaleService _instance = LocaleService._internal();
  factory LocaleService() => _instance;
  LocaleService._internal();
  
  final List<Locale> supportedLocales = [
${locales.map(l => `    Locale('${l}'),`).join('\n')}
  ];
  
  Future<void> changeLocale(BuildContext context, String languageCode) async {
    Locale locale = await setLocale(languageCode);
    MyApp.setLocale(context, locale);
  }
  
  bool isRTL(String languageCode) {
    return ['ar', 'he', 'fa', 'ur'].contains(languageCode);
  }
}`;

  const languageSelector = `
import 'package:flutter/material.dart';
import 'package:flutter_gen/gen_l10n/app_localizations.dart';
import 'core/localization/locale_service.dart';

class LanguageSelector extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final currentLocale = Localizations.localeOf(context);
    
    return PopupMenuButton<String>(
      icon: Icon(Icons.language),
      onSelected: (String languageCode) async {
        await LocaleService().changeLocale(context, languageCode);
      },
      itemBuilder: (BuildContext context) {
        return LocaleService().supportedLocales.map((Locale locale) {
          return PopupMenuItem<String>(
            value: locale.languageCode,
            child: Row(
              children: [
                Text(getLanguageFlag(locale.languageCode)),
                SizedBox(width: 8),
                Text(getTranslatedLanguageName(context, locale.languageCode)),
                if (currentLocale.languageCode == locale.languageCode)
                  Padding(
                    padding: EdgeInsets.only(left: 8),
                    child: Icon(Icons.check, size: 16),
                  ),
              ],
            ),
          );
        }).toList();
      },
    );
  }
  
  String getLanguageFlag(String code) {
    switch (code) {
      case 'en': return '🇺🇸';
      case 'es': return '🇪🇸';
      case 'fr': return '🇫🇷';
      case 'de': return '🇩🇪';
      default: return '🌐';
    }
  }
}`;

  const usage = `
// Using translations in widgets
import 'package:flutter_gen/gen_l10n/app_localizations.dart';

class ExampleWidget extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    
    return Column(
      children: [
        Text(l10n.welcomeMessage),
        Text(l10n.itemCount(5)), // Plural
        ${useGender ? 'Text(l10n.userGreeting("John", "male")), // Gender' : ''}
        ElevatedButton(
          onPressed: () {},
          child: Text(l10n.continueButton),
        ),
      ],
    );
  }
}`;

  return {
    mainApp,
    localeProvider,
    localeService,
    languageSelector,
    usage,
  };
}

async function extractStringsFromCode() {
  // Simulate extracting hardcoded strings
  return {
    foundStrings: [
      { text: 'Welcome to our app', location: 'lib/screens/home.dart:45', key: 'welcomeMessage' },
      { text: 'Continue', location: 'lib/widgets/button.dart:23', key: 'continueButton' },
      { text: 'Cancel', location: 'lib/widgets/button.dart:30', key: 'cancelButton' },
      { text: 'Please enter your email', location: 'lib/screens/login.dart:67', key: 'emailHint' },
      { text: 'Password must be at least 8 characters', location: 'lib/utils/validators.dart:12', key: 'passwordError' },
      { text: 'Settings', location: 'lib/screens/settings.dart:15', key: 'settingsTitle' },
      { text: 'Profile', location: 'lib/screens/profile.dart:20', key: 'profileTitle' },
      { text: 'Logout', location: 'lib/widgets/drawer.dart:45', key: 'logoutButton' },
    ],
    statistics: {
      totalStrings: 156,
      extracted: 8,
      remaining: 148,
      byFile: {
        'lib/screens': 45,
        'lib/widgets': 38,
        'lib/utils': 15,
        'lib/core': 58,
      },
    },
  };
}

function generateARBFiles(locales, usePlurals, useGender) {
  const templateARB = {
    '@@locale': 'en',
    '@@author': 'Flutter Developer',
    
    // App info
    'appTitle': 'My Flutter App',
    '@appTitle': {
      'description': 'The application title',
    },
    
    // Common
    'welcomeMessage': 'Welcome to our app',
    '@welcomeMessage': {
      'description': 'Welcome message shown on home screen',
    },
    
    'continueButton': 'Continue',
    '@continueButton': {
      'description': 'Label for continue button',
    },
    
    'cancelButton': 'Cancel',
    '@cancelButton': {
      'description': 'Label for cancel button',
    },
    
    'saveButton': 'Save',
    '@saveButton': {
      'description': 'Label for save button',
    },
    
    // Forms
    'emailHint': 'Please enter your email',
    '@emailHint': {
      'description': 'Hint text for email input field',
    },
    
    'passwordError': 'Password must be at least 8 characters',
    '@passwordError': {
      'description': 'Error message for invalid password',
    },
    
    'requiredField': 'This field is required',
    '@requiredField': {
      'description': 'Generic required field error',
    },
    
    // Navigation
    'settingsTitle': 'Settings',
    '@settingsTitle': {
      'description': 'Settings screen title',
    },
    
    'profileTitle': 'Profile',
    '@profileTitle': {
      'description': 'Profile screen title',
    },
    
    'homeTitle': 'Home',
    '@homeTitle': {
      'description': 'Home screen title',
    },
    
    // Actions
    'logoutButton': 'Logout',
    '@logoutButton': {
      'description': 'Logout button label',
    },
    
    'deleteConfirmation': 'Are you sure you want to delete this item?',
    '@deleteConfirmation': {
      'description': 'Delete confirmation message',
    },
  };
  
  // Add plurals if enabled
  if (usePlurals) {
    Object.assign(templateARB, {
      'itemCount': '{count, plural, =0{No items} =1{1 item} other{{count} items}}',
      '@itemCount': {
        'description': 'Item count with pluralization',
        'placeholders': {
          'count': {
            'type': 'int',
            'example': '5',
          },
        },
      },
      
      'daysRemaining': '{days, plural, =0{Today} =1{Tomorrow} other{In {days} days}}',
      '@daysRemaining': {
        'description': 'Days remaining with pluralization',
        'placeholders': {
          'days': {
            'type': 'int',
          },
        },
      },
    });
  }
  
  // Add gender rules if enabled
  if (useGender) {
    Object.assign(templateARB, {
      'userGreeting': '{gender, select, male{Welcome Mr. {name}} female{Welcome Ms. {name}} other{Welcome {name}}}',
      '@userGreeting': {
        'description': 'Greeting with gender selection',
        'placeholders': {
          'name': {
            'type': 'String',
          },
          'gender': {
            'type': 'String',
          },
        },
      },
    });
  }
  
  // Generate translations for other locales
  const translations = {
    es: {
      'appTitle': 'Mi Aplicación Flutter',
      'welcomeMessage': 'Bienvenido a nuestra aplicación',
      'continueButton': 'Continuar',
      'cancelButton': 'Cancelar',
      'saveButton': 'Guardar',
      'emailHint': 'Por favor ingrese su correo electrónico',
      'passwordError': 'La contraseña debe tener al menos 8 caracteres',
      'requiredField': 'Este campo es obligatorio',
      'settingsTitle': 'Configuración',
      'profileTitle': 'Perfil',
      'homeTitle': 'Inicio',
      'logoutButton': 'Cerrar sesión',
      'deleteConfirmation': '¿Está seguro de que desea eliminar este elemento?',
    },
    fr: {
      'appTitle': 'Mon Application Flutter',
      'welcomeMessage': 'Bienvenue dans notre application',
      'continueButton': 'Continuer',
      'cancelButton': 'Annuler',
      'saveButton': 'Enregistrer',
      'emailHint': 'Veuillez saisir votre email',
      'passwordError': 'Le mot de passe doit contenir au moins 8 caractères',
      'requiredField': 'Ce champ est obligatoire',
      'settingsTitle': 'Paramètres',
      'profileTitle': 'Profil',
      'homeTitle': 'Accueil',
      'logoutButton': 'Déconnexion',
      'deleteConfirmation': 'Êtes-vous sûr de vouloir supprimer cet élément?',
    },
    de: {
      'appTitle': 'Meine Flutter App',
      'welcomeMessage': 'Willkommen in unserer App',
      'continueButton': 'Weiter',
      'cancelButton': 'Abbrechen',
      'saveButton': 'Speichern',
      'emailHint': 'Bitte geben Sie Ihre E-Mail ein',
      'passwordError': 'Das Passwort muss mindestens 8 Zeichen lang sein',
      'requiredField': 'Dieses Feld ist erforderlich',
      'settingsTitle': 'Einstellungen',
      'profileTitle': 'Profil',
      'homeTitle': 'Startseite',
      'logoutButton': 'Abmelden',
      'deleteConfirmation': 'Sind Sie sicher, dass Sie dieses Element löschen möchten?',
    },
  };
  
  const arbFiles = {
    'app_en.arb': JSON.stringify(templateARB, null, 2),
  };
  
  locales.filter(l => l !== 'en').forEach(locale => {
    const localeARB = {
      '@@locale': locale,
      ...translations[locale],
    };
    
    if (usePlurals) {
      Object.assign(localeARB, getPluralsForLocale(locale));
    }
    
    if (useGender) {
      Object.assign(localeARB, getGenderRulesForLocale(locale));
    }
    
    arbFiles[`app_${locale}.arb`] = JSON.stringify(localeARB, null, 2);
  });
  
  return arbFiles;
}

function getPluralsForLocale(locale) {
  const plurals = {
    es: {
      'itemCount': '{count, plural, =0{Sin elementos} =1{1 elemento} other{{count} elementos}}',
      'daysRemaining': '{days, plural, =0{Hoy} =1{Mañana} other{En {days} días}}',
    },
    fr: {
      'itemCount': '{count, plural, =0{Aucun élément} =1{1 élément} other{{count} éléments}}',
      'daysRemaining': '{days, plural, =0{Aujourd\'hui} =1{Demain} other{Dans {days} jours}}',
    },
    de: {
      'itemCount': '{count, plural, =0{Keine Elemente} =1{1 Element} other{{count} Elemente}}',
      'daysRemaining': '{days, plural, =0{Heute} =1{Morgen} other{In {days} Tagen}}',
    },
  };
  
  return plurals[locale] || {};
}

function getGenderRulesForLocale(locale) {
  const genderRules = {
    es: {
      'userGreeting': '{gender, select, male{Bienvenido Sr. {name}} female{Bienvenida Sra. {name}} other{Bienvenido/a {name}}}',
    },
    fr: {
      'userGreeting': '{gender, select, male{Bienvenue M. {name}} female{Bienvenue Mme {name}} other{Bienvenue {name}}}',
    },
    de: {
      'userGreeting': '{gender, select, male{Willkommen Herr {name}} female{Willkommen Frau {name}} other{Willkommen {name}}}',
    },
  };
  
  return genderRules[locale] || {};
}

function generateIntegrationGuide() {
  return `
# Flutter Localization Integration Guide

## 1. Initial Setup
1. Add dependencies to pubspec.yaml
2. Create l10n.yaml in project root
3. Create lib/l10n directory
4. Add ARB files

## 2. Generate Localization Files
\`\`\`bash
flutter gen-l10n
\`\`\`

## 3. Update Main App
- Import generated localizations
- Add localization delegates
- Configure supported locales

## 4. Use in Widgets
\`\`\`dart
final l10n = AppLocalizations.of(context)!;
Text(l10n.welcomeMessage)
\`\`\`

## 5. Add Language Selector
- Implement language picker
- Save preference
- Update app locale

## 6. Testing
- Test all locales
- Verify RTL layouts
- Check text overflow
- Test plurals and gender rules

## 7. Continuous Localization
- Extract new strings regularly
- Update translations
- Use localization management tools
`;
}

function generateAllL10nFiles(setup) {
  const files = {};
  
  // Configuration files
  files['l10n.yaml'] = setup.configuration.l10nYaml;
  
  // ARB files
  Object.entries(setup.arbFiles).forEach(([filename, content]) => {
    files[`lib/l10n/${filename}`] = content;
  });
  
  // Implementation files
  files['lib/main.dart'] = setup.implementation.mainApp;
  files['lib/core/localization/locale_provider.dart'] = setup.implementation.localeProvider;
  files['lib/core/localization/locale_service.dart'] = setup.implementation.localeService;
  files['lib/widgets/language_selector.dart'] = setup.implementation.languageSelector;
  
  // Export file
  files['lib/l10n/l10n.dart'] = `
export 'package:flutter_gen/gen_l10n/app_localizations.dart';
export '../core/localization/locale_provider.dart';
export '../core/localization/locale_service.dart';`;
  
  return files;
}

function generateL10nDocumentation(setup) {
  return `
# Localization Documentation

## Supported Languages
${setup.configuration.supportedLocales.map(l => `- ${getLocaleName(l)} (${l})`).join('\n')}

## File Structure
${setup.structure}

## Adding New Translations

### 1. Add to Template (app_en.arb)
\`\`\`json
"newKey": "English text",
"@newKey": {
  "description": "Description for translators"
}
\`\`\`

### 2. Add Translations
Update all app_*.arb files with translations

### 3. Generate Code
\`\`\`bash
flutter gen-l10n
\`\`\`

### 4. Use in Code
\`\`\`dart
Text(l10n.newKey)
\`\`\`

## Pluralization
\`\`\`json
"itemCount": "{count, plural, =0{No items} =1{One item} other{{count} items}}"
\`\`\`

## Gender Rules
\`\`\`json
"greeting": "{gender, select, male{Mr.} female{Ms.} other{}} {name}"
\`\`\`

## Date/Time Formatting
\`\`\`dart
final formattedDate = DateFormat.yMMMd(l10n.localeName).format(date);
\`\`\`

## RTL Support
- Automatic for Arabic, Hebrew, etc.
- Use Directionality widget when needed
- Test layouts in both directions

## Best Practices
1. Keep keys descriptive and hierarchical
2. Always add descriptions for translators
3. Use placeholders for dynamic content
4. Test with longest translations
5. Consider cultural differences
`;
}

function getL10nCommands() {
  return {
    setup: [
      'flutter pub add flutter_localizations --sdk=flutter',
      'flutter pub add intl',
      'flutter pub get',
    ],
    generate: [
      'flutter gen-l10n',
      'flutter gen-l10n --arb-dir=lib/l10n --output-dir=lib/generated',
    ],
    extract: [
      '# Extract strings using external tools',
      'flutter pub global activate intl_translation',
      'flutter pub global run intl_translation:extract_to_arb --output-dir=lib/l10n lib/main.dart',
    ],
    validate: [
      'flutter analyze',
      'flutter test',
    ],
  };
}

function getL10nBestPractices() {
  return [
    {
      category: 'Key Naming',
      practices: [
        'Use descriptive, hierarchical keys (e.g., settings_privacy_title)',
        'Group related translations with common prefixes',
        'Avoid generic keys like "message1", "text2"',
        'Use camelCase for consistency',
      ],
    },
    {
      category: 'Translation Management',
      practices: [
        'Keep source language (usually English) as source of truth',
        'Add descriptions for context',
        'Mark UI strings that should not be translated',
        'Version control all ARB files',
      ],
    },
    {
      category: 'Technical Considerations',
      practices: [
        'Handle missing translations gracefully',
        'Test with longest possible translations',
        'Consider text directionality (LTR/RTL)',
        'Use proper date/time/number formatting',
      ],
    },
    {
      category: 'Performance',
      practices: [
        'Lazy load translations for large apps',
        'Cache selected locale',
        'Minimize locale switching overhead',
        'Use const widgets where possible',
      ],
    },
  ];
}

function recommendL10nTools() {
  return {
    management: [
      {
        name: 'Crowdin',
        description: 'Professional localization platform',
        features: ['Translation memory', 'Screenshots', 'API integration'],
      },
      {
        name: 'POEditor',
        description: 'Simple translation management',
        features: ['REST API', 'GitHub integration', 'Translation orders'],
      },
      {
        name: 'Lokalise',
        description: 'Developer-friendly platform',
        features: ['Flutter SDK', 'OTA updates', 'Screenshots'],
      },
    ],
    development: [
      {
        name: 'Flutter Intl (VS Code)',
        description: 'IDE extension for Flutter i18n',
        features: ['ARB file management', 'Code generation', 'Extract strings'],
      },
      {
        name: 'arb_editor',
        description: 'Desktop ARB file editor',
        features: ['Visual editing', 'Validation', 'Search/replace'],
      },
    ],
    testing: [
      {
        name: 'flutter_pseudo_localization',
        description: 'Test UI with pseudo translations',
        usage: 'Identify text overflow and hardcoded strings',
      },
    ],
  };
}

function getLocaleName(code) {
  const names = {
    'en': 'English',
    'es': 'Spanish',
    'fr': 'French',
    'de': 'German',
    'it': 'Italian',
    'pt': 'Portuguese',
    'ru': 'Russian',
    'zh': 'Chinese',
    'ja': 'Japanese',
    'ko': 'Korean',
    'ar': 'Arabic',
    'he': 'Hebrew',
  };
  
  return names[code] || code.toUpperCase();
}