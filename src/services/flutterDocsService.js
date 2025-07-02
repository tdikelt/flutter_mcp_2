import axios from 'axios';
import * as cheerio from 'cheerio';
import { getCacheManager } from '../cache/cacheManager.js';
import { getTokenManager } from '../utils/tokenManager.js';
import { errorHandler } from '../utils/errorHandler.js';

const cache = getCacheManager();
const tokenManager = getTokenManager();

export class FlutterDocsService {
  constructor() {
    this.baseUrl = 'https://api.flutter.dev';
    this.pubUrl = 'https://pub.dev';
    this.dartUrl = 'https://api.dart.dev';
    
    // Rate limiting
    this.requestQueue = [];
    this.lastRequestTime = 0;
    this.minRequestInterval = 500; // 2 requests per second max
  }

  async fetchFlutterClass(className, library = 'widgets') {
    const cacheKey = { className, library };
    const cached = await cache.get('flutterDocs', cacheKey);
    if (cached) return cached;

    try {
      const url = `${this.baseUrl}/flutter/${library}/${className}-class.html`;
      
      const response = await errorHandler.executeWithProtection(
        'flutter-docs',
        async () => {
          await this.rateLimit();
          return axios.get(url, { timeout: 10000 });
        },
        {
          retry: true,
          timeout: 15000,
          fallback: () => ({
            error: 'Documentation temporarily unavailable',
            className,
            library
          })
        }
      );

      const documentation = this.parseFlutterDocumentation(response.data, className);
      await cache.set('flutterDocs', cacheKey, documentation);
      
      return documentation;
    } catch (error) {
      console.error(`Error fetching Flutter class ${className}:`, error.message);
      return null;
    }
  }

  async fetchDartClass(className, library = 'core') {
    const cacheKey = { className, library, type: 'dart' };
    const cached = await cache.get('flutterDocs', cacheKey);
    if (cached) return cached;

    try {
      const url = `${this.dartUrl}/stable/dart-${library}/${className}-class.html`;
      
      const response = await errorHandler.executeWithProtection(
        'dart-docs',
        async () => {
          await this.rateLimit();
          return axios.get(url, { timeout: 10000 });
        }
      );

      const documentation = this.parseDartDocumentation(response.data, className);
      await cache.set('flutterDocs', cacheKey, documentation);
      
      return documentation;
    } catch (error) {
      console.error(`Error fetching Dart class ${className}:`, error.message);
      return null;
    }
  }

  async fetchPackageDocumentation(packageName, version = 'latest') {
    const cacheKey = { packageName, version };
    const cached = await cache.get('pubPackage', cacheKey);
    if (cached) return cached;

    try {
      // First get package info
      const packageInfo = await this.fetchPackageInfo(packageName, version);
      if (!packageInfo) return null;

      // Then fetch documentation
      const docUrl = `${this.pubUrl}/documentation/${packageName}/${packageInfo.version}/index.html`;
      
      const response = await errorHandler.executeWithProtection(
        'pub-docs',
        async () => {
          await this.rateLimit();
          return axios.get(docUrl, { timeout: 10000 });
        }
      );

      const documentation = this.parsePackageDocumentation(response.data, packageName);
      documentation.packageInfo = packageInfo;
      
      await cache.set('pubPackage', cacheKey, documentation);
      return documentation;
    } catch (error) {
      console.error(`Error fetching package documentation for ${packageName}:`, error.message);
      return null;
    }
  }

  async fetchPackageInfo(packageName, version = 'latest') {
    try {
      const url = `${this.pubUrl}/api/packages/${packageName}`;
      
      const response = await errorHandler.executeWithProtection(
        'pub-api',
        async () => {
          await this.rateLimit();
          return axios.get(url, { timeout: 10000 });
        }
      );

      const data = response.data;
      const latestVersion = data.latest.version;
      const requestedVersion = version === 'latest' ? latestVersion : version;
      
      // Find the specific version
      const versionInfo = data.versions.find(v => v.version === requestedVersion) || data.latest;
      
      return {
        name: packageName,
        version: versionInfo.version,
        description: versionInfo.pubspec.description,
        homepage: versionInfo.pubspec.homepage,
        repository: versionInfo.pubspec.repository,
        dependencies: versionInfo.pubspec.dependencies || {},
        devDependencies: versionInfo.pubspec.dev_dependencies || {},
        score: data.score,
        popularity: data.metrics?.popularity,
        likes: data.metrics?.likes,
        points: data.metrics?.points,
        grantedPoints: data.metrics?.grantedPoints,
        maxPoints: data.metrics?.maxPoints
      };
    } catch (error) {
      console.error(`Error fetching package info for ${packageName}:`, error.message);
      return null;
    }
  }

  parseFlutterDocumentation(html, className) {
    const $ = cheerio.load(html);
    
    return {
      className,
      description: this.extractDescription($),
      constructors: this.extractConstructors($),
      properties: this.extractProperties($),
      methods: this.extractMethods($),
      staticMethods: this.extractStaticMethods($),
      inheritance: this.extractInheritance($),
      implementedTypes: this.extractImplementedTypes($),
      examples: this.extractExamples($),
      annotations: this.extractAnnotations($),
      availability: this.extractAvailability($)
    };
  }

  parseDartDocumentation(html, className) {
    // Similar to Flutter but with Dart-specific parsing
    const $ = cheerio.load(html);
    
    return {
      className,
      library: 'dart:core',
      description: this.extractDescription($),
      constructors: this.extractConstructors($),
      properties: this.extractProperties($),
      methods: this.extractMethods($),
      operators: this.extractOperators($),
      staticMethods: this.extractStaticMethods($),
      inheritance: this.extractInheritance($),
      examples: this.extractExamples($)
    };
  }

  parsePackageDocumentation(html, packageName) {
    const $ = cheerio.load(html);
    
    return {
      packageName,
      libraries: this.extractLibraries($),
      mainClasses: this.extractMainClasses($),
      functions: this.extractTopLevelFunctions($),
      constants: this.extractConstants($),
      typedefs: this.extractTypedefs($),
      readme: this.extractReadme($)
    };
  }

  // HTML parsing helpers
  extractDescription($) {
    return $('.section-summary').text().trim() || 
           $('section.desc').text().trim() ||
           '';
  }

  extractConstructors($) {
    const constructors = [];
    
    $('#constructors .constructor').each((_, elem) => {
      const $elem = $(elem);
      constructors.push({
        name: $elem.find('.name').text().trim(),
        signature: $elem.find('.signature').text().trim(),
        description: $elem.find('.description').text().trim(),
        parameters: this.extractParameters($elem),
        isConst: $elem.find('.const').length > 0,
        isFactory: $elem.find('.factory').length > 0
      });
    });
    
    return constructors;
  }

  extractProperties($) {
    const properties = [];
    
    $('#instance-properties .property').each((_, elem) => {
      const $elem = $(elem);
      properties.push({
        name: $elem.find('.name').text().trim(),
        type: $elem.find('.type').text().trim(),
        description: $elem.find('.description').text().trim(),
        isReadOnly: $elem.find('.read-only').length > 0,
        isFinal: $elem.find('.final').length > 0,
        isLate: $elem.find('.late').length > 0
      });
    });
    
    return properties;
  }

  extractMethods($) {
    const methods = [];
    
    $('#instance-methods .method').each((_, elem) => {
      const $elem = $(elem);
      methods.push({
        name: $elem.find('.name').text().trim(),
        signature: $elem.find('.signature').text().trim(),
        returnType: $elem.find('.return-type').text().trim(),
        description: $elem.find('.description').text().trim(),
        parameters: this.extractParameters($elem),
        isAsync: $elem.find('.async').length > 0,
        isOverride: $elem.find('.override').length > 0
      });
    });
    
    return methods;
  }

  extractParameters($elem) {
    const parameters = [];
    
    $elem.find('.parameter').each((_, param) => {
      const $param = $(param);
      parameters.push({
        name: $param.find('.param-name').text().trim(),
        type: $param.find('.param-type').text().trim(),
        isRequired: $param.find('.required').length > 0,
        isNamed: $param.find('.named').length > 0,
        defaultValue: $param.find('.default-value').text().trim()
      });
    });
    
    return parameters;
  }

  extractStaticMethods($) {
    const methods = [];
    
    $('#static-methods .method').each((_, elem) => {
      const $elem = $(elem);
      methods.push({
        name: $elem.find('.name').text().trim(),
        signature: $elem.find('.signature').text().trim(),
        returnType: $elem.find('.return-type').text().trim(),
        description: $elem.find('.description').text().trim()
      });
    });
    
    return methods;
  }

  extractInheritance($) {
    return {
      extends: $('.inheritance .extends').text().trim(),
      implements: $('.inheritance .implements').map((_, elem) => $(elem).text().trim()).get(),
      mixins: $('.inheritance .mixins').map((_, elem) => $(elem).text().trim()).get()
    };
  }

  extractImplementedTypes($) {
    return $('.implemented-types .type').map((_, elem) => $(elem).text().trim()).get();
  }

  extractExamples($) {
    const examples = [];
    
    $('.example').each((_, elem) => {
      const $elem = $(elem);
      examples.push({
        title: $elem.find('.example-title').text().trim(),
        code: $elem.find('pre code').text().trim(),
        description: $elem.find('.example-description').text().trim()
      });
    });
    
    return examples;
  }

  extractAnnotations($) {
    return $('.annotations .annotation').map((_, elem) => $(elem).text().trim()).get();
  }

  extractAvailability($) {
    return {
      since: $('.availability .since').text().trim(),
      platforms: $('.availability .platform').map((_, elem) => $(elem).text().trim()).get()
    };
  }

  extractOperators($) {
    const operators = [];
    
    $('#operators .operator').each((_, elem) => {
      const $elem = $(elem);
      operators.push({
        operator: $elem.find('.operator-symbol').text().trim(),
        signature: $elem.find('.signature').text().trim(),
        description: $elem.find('.description').text().trim()
      });
    });
    
    return operators;
  }

  extractLibraries($) {
    return $('.library-list .library').map((_, elem) => {
      const $elem = $(elem);
      return {
        name: $elem.find('.library-name').text().trim(),
        description: $elem.find('.library-desc').text().trim()
      };
    }).get();
  }

  extractMainClasses($) {
    return $('.class-list .class').map((_, elem) => {
      const $elem = $(elem);
      return {
        name: $elem.find('.class-name').text().trim(),
        description: $elem.find('.class-desc').text().trim()
      };
    }).get();
  }

  extractTopLevelFunctions($) {
    return $('.function-list .function').map((_, elem) => {
      const $elem = $(elem);
      return {
        name: $elem.find('.function-name').text().trim(),
        signature: $elem.find('.function-signature').text().trim()
      };
    }).get();
  }

  extractConstants($) {
    return $('.constant-list .constant').map((_, elem) => {
      const $elem = $(elem);
      return {
        name: $elem.find('.constant-name').text().trim(),
        value: $elem.find('.constant-value').text().trim()
      };
    }).get();
  }

  extractTypedefs($) {
    return $('.typedef-list .typedef').map((_, elem) => {
      const $elem = $(elem);
      return {
        name: $elem.find('.typedef-name').text().trim(),
        definition: $elem.find('.typedef-definition').text().trim()
      };
    }).get();
  }

  extractReadme($) {
    return $('.readme-content').html() || '';
  }

  // Rate limiting
  async rateLimit() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.minRequestInterval) {
      const delay = this.minRequestInterval - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    this.lastRequestTime = Date.now();
  }

  // Search functionality
  async searchFlutterDocs(query, options = {}) {
    const { limit = 10, searchType = 'all' } = options;
    const results = [];
    
    // Search widgets
    if (searchType === 'all' || searchType === 'widgets') {
      const widgetResults = await this.searchCategory(query, 'widgets', limit);
      results.push(...widgetResults);
    }
    
    // Search material
    if (searchType === 'all' || searchType === 'material') {
      const materialResults = await this.searchCategory(query, 'material', limit);
      results.push(...materialResults);
    }
    
    // Search cupertino
    if (searchType === 'all' || searchType === 'cupertino') {
      const cupertinoResults = await this.searchCategory(query, 'cupertino', limit);
      results.push(...cupertinoResults);
    }
    
    return results.slice(0, limit);
  }

  async searchCategory(query, category, limit) {
    // This would ideally use a search API, but for now we'll use predefined common widgets
    const commonWidgets = {
      widgets: ['Container', 'Row', 'Column', 'Stack', 'ListView', 'GridView', 'Text', 'Image'],
      material: ['Scaffold', 'AppBar', 'FloatingActionButton', 'Card', 'Drawer', 'BottomNavigationBar'],
      cupertino: ['CupertinoApp', 'CupertinoNavigationBar', 'CupertinoButton', 'CupertinoTextField']
    };
    
    const categoryWidgets = commonWidgets[category] || [];
    const matches = categoryWidgets.filter(widget => 
      widget.toLowerCase().includes(query.toLowerCase())
    );
    
    return matches.map(widget => ({
      type: 'class',
      category,
      name: widget,
      url: `${this.baseUrl}/flutter/${category}/${widget}-class.html`
    }));
  }
}

// Singleton instance
let docsServiceInstance = null;

export function getFlutterDocsService() {
  if (!docsServiceInstance) {
    docsServiceInstance = new FlutterDocsService();
  }
  return docsServiceInstance;
}