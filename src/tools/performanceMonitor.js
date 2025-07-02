export async function monitorPerformanceMetrics(args) {
  const { 
    monitoringType = 'comprehensive',
    duration = 60,  // seconds
    includeNetworkAnalysis = true,
    includeBatteryImpact = true 
  } = args;
  
  try {
    const monitoringCode = generateMonitoringCode(monitoringType);
    const dashboardCode = generateDashboardCode();
    const analyticsSetup = generateAnalyticsSetup();
    
    const metrics = {
      fps: generateFPSMonitoring(),
      memory: generateMemoryMonitoring(),
      cpu: generateCPUMonitoring(),
      network: includeNetworkAnalysis ? generateNetworkMonitoring() : null,
      battery: includeBatteryImpact ? generateBatteryMonitoring() : null,
    };
    
    const analysis = {
      targetMetrics: getTargetMetrics(),
      criticalThresholds: getCriticalThresholds(),
      monitoringStrategy: determineMonitoringStrategy(monitoringType),
    };
    
    const implementation = {
      setup: generateSetupInstructions(),
      integration: generateIntegrationCode(metrics),
      reporting: generateReportingCode(),
      alerts: generateAlertSystem(),
    };
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            monitoringCode,
            dashboardCode,
            analyticsSetup,
            metrics,
            analysis,
            implementation,
            bestPractices: getMonitoringBestPractices(),
          }, null, 2),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error generating performance monitoring: ${error.message}`,
        },
      ],
    };
  }
}

function generateMonitoringCode(type) {
  const baseCode = `
import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:flutter/scheduler.dart';

class PerformanceMonitor {
  static final PerformanceMonitor _instance = PerformanceMonitor._internal();
  factory PerformanceMonitor() => _instance;
  PerformanceMonitor._internal();
  
  final _metrics = <String, dynamic>{};
  final _listeners = <Function>[];
  Timer? _metricsTimer;
  
  void startMonitoring() {
    if (_metricsTimer != null) return;
    
    _metricsTimer = Timer.periodic(Duration(seconds: 1), (_) {
      _collectMetrics();
      _notifyListeners();
    });
    
    // Register frame callbacks
    SchedulerBinding.instance.addTimingsCallback(_onFrameTimings);
  }
  
  void stopMonitoring() {
    _metricsTimer?.cancel();
    _metricsTimer = null;
    SchedulerBinding.instance.removeTimingsCallback(_onFrameTimings);
  }
  
  void _collectMetrics() {
    // Collect current metrics
    _metrics['timestamp'] = DateTime.now().millisecondsSinceEpoch;
    _metrics['memoryUsage'] = _getCurrentMemoryUsage();
    _metrics['cpuUsage'] = _estimateCPUUsage();
  }
  
  void _onFrameTimings(List<FrameTiming> timings) {
    for (final timing in timings) {
      final fps = 1000 / timing.totalSpan.inMilliseconds;
      _metrics['fps'] = fps;
      _metrics['frameBuildTime'] = timing.buildDuration.inMicroseconds;
      _metrics['frameRasterTime'] = timing.rasterDuration.inMicroseconds;
      
      if (fps < 55) {
        _logPerformanceIssue('Low FPS detected: \${fps.toStringAsFixed(1)}');
      }
    }
  }
  
  Map<String, dynamic> _getCurrentMemoryUsage() {
    // This would integrate with platform channels for real memory data
    return {
      'used': 128.5,  // MB
      'available': 256.0,
      'percentage': 50.2,
    };
  }
  
  double _estimateCPUUsage() {
    // CPU usage estimation based on frame times
    final buildTime = _metrics['frameBuildTime'] ?? 0;
    final rasterTime = _metrics['frameRasterTime'] ?? 0;
    final totalTime = buildTime + rasterTime;
    
    // Rough estimation: if frame takes >16ms, CPU is likely stressed
    return (totalTime / 16667) * 100;  // percentage
  }
  
  void _logPerformanceIssue(String issue) {
    if (kDebugMode) {
      print('[PERFORMANCE] \$issue');
    }
    
    _metrics['lastIssue'] = {
      'message': issue,
      'timestamp': DateTime.now().toIso8601String(),
    };
  }
  
  void addListener(Function(Map<String, dynamic>) listener) {
    _listeners.add(listener);
  }
  
  void removeListener(Function listener) {
    _listeners.remove(listener);
  }
  
  void _notifyListeners() {
    for (final listener in _listeners) {
      listener(_metrics);
    }
  }
  
  Map<String, dynamic> get currentMetrics => Map.from(_metrics);
}`;

  if (type === 'comprehensive') {
    return baseCode + '\n\n' + generateComprehensiveMonitoring();
  } else if (type === 'lightweight') {
    return baseCode + '\n\n' + generateLightweightMonitoring();
  }
  
  return baseCode;
}

function generateComprehensiveMonitoring() {
  return `
// Comprehensive monitoring with detailed metrics
extension ComprehensiveMonitoring on PerformanceMonitor {
  void enableDetailedMonitoring() {
    // Widget rebuild tracking
    debugProfileBuildsEnabled = true;
    
    // Paint tracking
    debugProfilePaintsEnabled = true;
    
    // Layout tracking
    debugProfileLayoutsEnabled = true;
  }
  
  Map<String, dynamic> collectDetailedMetrics() {
    return {
      'rendering': {
        'fps': _metrics['fps'] ?? 0,
        'jank': _detectJank(),
        'droppedFrames': _metrics['droppedFrames'] ?? 0,
      },
      'memory': {
        'heap': _getHeapUsage(),
        'graphics': _getGraphicsMemory(),
        'leaks': _detectMemoryLeaks(),
      },
      'cpu': {
        'usage': _metrics['cpuUsage'] ?? 0,
        'mainThread': _getMainThreadUsage(),
        'rasterThread': _getRasterThreadUsage(),
      },
    };
  }
  
  bool _detectJank() {
    final fps = _metrics['fps'] ?? 60;
    return fps < 55;  // Below 55 FPS is considered jank
  }
  
  Map<String, dynamic> _getHeapUsage() {
    // Platform-specific implementation
    return {
      'used': 85.2,
      'capacity': 128.0,
      'external': 12.3,
    };
  }
  
  double _getGraphicsMemory() {
    // Estimate based on loaded images and render objects
    return 24.5;  // MB
  }
  
  List<String> _detectMemoryLeaks() {
    // Simple leak detection based on growing memory
    return [];
  }
  
  double _getMainThreadUsage() {
    final buildTime = _metrics['frameBuildTime'] ?? 0;
    return (buildTime / 16667) * 100;
  }
  
  double _getRasterThreadUsage() {
    final rasterTime = _metrics['frameRasterTime'] ?? 0;
    return (rasterTime / 16667) * 100;
  }
}`;
}

function generateLightweightMonitoring() {
  return `
// Lightweight monitoring for production
extension LightweightMonitoring on PerformanceMonitor {
  void enableProductionMonitoring() {
    // Only essential metrics
    _metricsTimer = Timer.periodic(Duration(seconds: 5), (_) {
      _collectEssentialMetrics();
    });
  }
  
  void _collectEssentialMetrics() {
    _metrics['fps'] = _calculateAverageFPS();
    _metrics['memory'] = _getMemoryPressure();
    _metrics['errors'] = _getErrorCount();
  }
  
  double _calculateAverageFPS() {
    // Rolling average of last 5 seconds
    return 59.8;
  }
  
  String _getMemoryPressure() {
    final usage = _getCurrentMemoryUsage();
    if (usage['percentage'] > 80) return 'high';
    if (usage['percentage'] > 60) return 'medium';
    return 'low';
  }
  
  int _getErrorCount() {
    // Track Flutter errors
    return 0;
  }
}`;
}

function generateDashboardCode() {
  return `
import 'package:flutter/material.dart';
import 'performance_monitor.dart';

class PerformanceDashboard extends StatefulWidget {
  @override
  _PerformanceDashboardState createState() => _PerformanceDashboardState();
}

class _PerformanceDashboardState extends State<PerformanceDashboard> {
  final _monitor = PerformanceMonitor();
  Map<String, dynamic> _metrics = {};
  
  @override
  void initState() {
    super.initState();
    _monitor.startMonitoring();
    _monitor.addListener(_updateMetrics);
  }
  
  @override
  void dispose() {
    _monitor.removeListener(_updateMetrics);
    super.dispose();
  }
  
  void _updateMetrics(Map<String, dynamic> metrics) {
    setState(() {
      _metrics = metrics;
    });
  }
  
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Performance Dashboard'),
      ),
      body: GridView.count(
        crossAxisCount: 2,
        padding: EdgeInsets.all(16),
        children: [
          _buildMetricCard('FPS', '\${_metrics['fps']?.toStringAsFixed(1) ?? '--'}', Colors.green),
          _buildMetricCard('Memory', '\${_metrics['memoryUsage']?['percentage']?.toStringAsFixed(1) ?? '--'}%', Colors.blue),
          _buildMetricCard('CPU', '\${_metrics['cpuUsage']?.toStringAsFixed(1) ?? '--'}%', Colors.orange),
          _buildMetricCard('Frame Time', '\${((_metrics['frameBuildTime'] ?? 0) / 1000).toStringAsFixed(1)}ms', Colors.purple),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: _exportMetrics,
        child: Icon(Icons.share),
      ),
    );
  }
  
  Widget _buildMetricCard(String title, String value, Color color) {
    return Card(
      child: Padding(
        padding: EdgeInsets.all(16),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(title, style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            SizedBox(height: 8),
            Text(value, style: TextStyle(fontSize: 36, color: color)),
          ],
        ),
      ),
    );
  }
  
  void _exportMetrics() {
    // Export metrics for analysis
    final report = _generateReport();
    // Share or save report
  }
  
  String _generateReport() {
    return '''
Performance Report
Generated: \${DateTime.now()}

FPS Average: \${_metrics['fps']}
Memory Usage: \${_metrics['memoryUsage']}
CPU Usage: \${_metrics['cpuUsage']}%

Issues Detected: \${_metrics['lastIssue'] ?? 'None'}
''';
  }
}`;
}

function generateAnalyticsSetup() {
  return `
// Analytics integration for performance tracking
class PerformanceAnalytics {
  static void trackPerformanceEvent(String event, Map<String, dynamic> parameters) {
    // Send to analytics service
    if (kReleaseMode) {
      // Production tracking
      _sendToAnalytics(event, parameters);
    } else {
      // Debug logging
      print('[ANALYTICS] \$event: \$parameters');
    }
  }
  
  static void _sendToAnalytics(String event, Map<String, dynamic> params) {
    // Integration with Firebase Analytics, Sentry, etc.
    switch (event) {
      case 'low_fps':
        // Track FPS drops
        break;
      case 'memory_pressure':
        // Track memory issues
        break;
      case 'crash':
        // Track crashes with performance context
        break;
    }
  }
  
  static void startSession() {
    trackPerformanceEvent('session_start', {
      'device': _getDeviceInfo(),
      'app_version': _getAppVersion(),
    });
  }
  
  static Map<String, String> _getDeviceInfo() {
    return {
      'model': 'iPhone 13',
      'os': 'iOS 15.0',
      'memory': '6GB',
    };
  }
  
  static String _getAppVersion() {
    return '1.0.0';
  }
}`;
}

function generateFPSMonitoring() {
  return {
    code: `
class FPSMonitor {
  static final _fpsHistory = <double>[];
  static const _historyLimit = 60;  // Last 60 seconds
  
  static void recordFPS(double fps) {
    _fpsHistory.add(fps);
    if (_fpsHistory.length > _historyLimit) {
      _fpsHistory.removeAt(0);
    }
  }
  
  static double get averageFPS {
    if (_fpsHistory.isEmpty) return 60.0;
    return _fpsHistory.reduce((a, b) => a + b) / _fpsHistory.length;
  }
  
  static double get minFPS {
    if (_fpsHistory.isEmpty) return 60.0;
    return _fpsHistory.reduce((a, b) => a < b ? a : b);
  }
  
  static int get jankCount {
    return _fpsHistory.where((fps) => fps < 55).length;
  }
  
  static double get jankPercentage {
    if (_fpsHistory.isEmpty) return 0.0;
    return (jankCount / _fpsHistory.length) * 100;
  }
}`,
    usage: 'FPSMonitor.recordFPS(timing.fps)',
    thresholds: {
      excellent: 60,
      good: 55,
      poor: 30,
    },
  };
}

function generateMemoryMonitoring() {
  return {
    code: `
class MemoryMonitor {
  static Timer? _memoryTimer;
  static final _memoryHistory = <MemoryReading>[];
  
  static void startMonitoring() {
    _memoryTimer = Timer.periodic(Duration(seconds: 5), (_) {
      _checkMemory();
    });
  }
  
  static void _checkMemory() {
    final reading = MemoryReading(
      timestamp: DateTime.now(),
      usedMB: _getUsedMemory(),
      availableMB: _getAvailableMemory(),
    );
    
    _memoryHistory.add(reading);
    
    // Check for memory pressure
    if (reading.percentage > 80) {
      _handleMemoryPressure();
    }
  }
  
  static void _handleMemoryPressure() {
    // Clear image cache
    imageCache.clear();
    imageCache.clearLiveImages();
    
    // Trigger garbage collection hint
    // Platform specific implementation
    
    PerformanceAnalytics.trackPerformanceEvent('memory_pressure', {
      'used_mb': _memoryHistory.last.usedMB,
      'percentage': _memoryHistory.last.percentage,
    });
  }
  
  static double _getUsedMemory() {
    // Platform channel to get actual memory
    return 128.5;  // MB
  }
  
  static double _getAvailableMemory() {
    // Platform channel to get available memory
    return 256.0;  // MB
  }
}

class MemoryReading {
  final DateTime timestamp;
  final double usedMB;
  final double availableMB;
  
  MemoryReading({
    required this.timestamp,
    required this.usedMB,
    required this.availableMB,
  });
  
  double get percentage => (usedMB / (usedMB + availableMB)) * 100;
}`,
    platformChannels: {
      android: 'MemoryInfo via ActivityManager',
      ios: 'task_info via mach_task_basic_info',
    },
  };
}

function generateCPUMonitoring() {
  return {
    code: `
class CPUMonitor {
  static final _samples = <CPUSample>[];
  static const _sampleWindow = 100;  // samples
  
  static void recordSample(FrameTiming timing) {
    final sample = CPUSample(
      buildTime: timing.buildDuration.inMicroseconds,
      rasterTime: timing.rasterDuration.inMicroseconds,
      totalTime: timing.totalSpan.inMicroseconds,
    );
    
    _samples.add(sample);
    if (_samples.length > _sampleWindow) {
      _samples.removeAt(0);
    }
    
    _analyzePerformance();
  }
  
  static void _analyzePerformance() {
    final avgBuildTime = _samples.map((s) => s.buildTime).reduce((a, b) => a + b) / _samples.length;
    final avgRasterTime = _samples.map((s) => s.rasterTime).reduce((a, b) => a + b) / _samples.length;
    
    // Check for performance issues
    if (avgBuildTime > 8000) {  // 8ms
      print('[CPU] High build time: \${avgBuildTime / 1000}ms');
    }
    
    if (avgRasterTime > 8000) {  // 8ms
      print('[CPU] High raster time: \${avgRasterTime / 1000}ms');
    }
  }
  
  static Map<String, double> get averages {
    if (_samples.isEmpty) return {};
    
    return {
      'build': _samples.map((s) => s.buildTime).reduce((a, b) => a + b) / _samples.length / 1000,
      'raster': _samples.map((s) => s.rasterTime).reduce((a, b) => a + b) / _samples.length / 1000,
      'total': _samples.map((s) => s.totalTime).reduce((a, b) => a + b) / _samples.length / 1000,
    };
  }
}

class CPUSample {
  final int buildTime;
  final int rasterTime;
  final int totalTime;
  
  CPUSample({
    required this.buildTime,
    required this.rasterTime,
    required this.totalTime,
  });
}`,
  };
}

function generateNetworkMonitoring() {
  return {
    code: `
class NetworkMonitor {
  static final _requests = <NetworkRequest>[];
  static int _totalBytes = 0;
  
  static void logRequest(NetworkRequest request) {
    _requests.add(request);
    _totalBytes += request.responseSize;
    
    // Check for slow requests
    if (request.duration.inMilliseconds > 3000) {
      PerformanceAnalytics.trackPerformanceEvent('slow_network_request', {
        'url': request.url,
        'duration_ms': request.duration.inMilliseconds,
        'size_bytes': request.responseSize,
      });
    }
  }
  
  static NetworkStats get stats {
    if (_requests.isEmpty) {
      return NetworkStats.empty();
    }
    
    final totalRequests = _requests.length;
    final avgDuration = _requests.map((r) => r.duration.inMilliseconds).reduce((a, b) => a + b) / totalRequests;
    final failureRate = _requests.where((r) => !r.success).length / totalRequests;
    
    return NetworkStats(
      totalRequests: totalRequests,
      totalBytes: _totalBytes,
      averageLatency: avgDuration,
      failureRate: failureRate,
    );
  }
}

class NetworkRequest {
  final String url;
  final DateTime startTime;
  final Duration duration;
  final int responseSize;
  final bool success;
  
  NetworkRequest({
    required this.url,
    required this.startTime,
    required this.duration,
    required this.responseSize,
    required this.success,
  });
}

class NetworkStats {
  final int totalRequests;
  final int totalBytes;
  final double averageLatency;
  final double failureRate;
  
  NetworkStats({
    required this.totalRequests,
    required this.totalBytes,
    required this.averageLatency,
    required this.failureRate,
  });
  
  factory NetworkStats.empty() => NetworkStats(
    totalRequests: 0,
    totalBytes: 0,
    averageLatency: 0,
    failureRate: 0,
  );
}`,
    integration: 'Integrate with HTTP client interceptors',
  };
}

function generateBatteryMonitoring() {
  return {
    code: `
class BatteryMonitor {
  static final _batteryChannel = MethodChannel('app/battery');
  static Timer? _batteryTimer;
  static double _startLevel = 100;
  static DateTime _startTime = DateTime.now();
  
  static Future<void> startMonitoring() async {
    _startLevel = await _getBatteryLevel();
    _startTime = DateTime.now();
    
    _batteryTimer = Timer.periodic(Duration(minutes: 5), (_) async {
      await _checkBatteryDrain();
    });
  }
  
  static Future<void> _checkBatteryDrain() async {
    final currentLevel = await _getBatteryLevel();
    final elapsed = DateTime.now().difference(_startTime);
    final drain = _startLevel - currentLevel;
    final drainRate = drain / elapsed.inMinutes * 60;  // % per hour
    
    if (drainRate > 20) {  // More than 20% per hour
      PerformanceAnalytics.trackPerformanceEvent('high_battery_drain', {
        'drain_rate': drainRate,
        'elapsed_minutes': elapsed.inMinutes,
      });
    }
  }
  
  static Future<double> _getBatteryLevel() async {
    try {
      final level = await _batteryChannel.invokeMethod<int>('getBatteryLevel');
      return level?.toDouble() ?? 100;
    } catch (e) {
      return 100;
    }
  }
  
  static Future<Map<String, dynamic>> getBatteryStats() async {
    final currentLevel = await _getBatteryLevel();
    final elapsed = DateTime.now().difference(_startTime);
    final drain = _startLevel - currentLevel;
    
    return {
      'current_level': currentLevel,
      'drain_percentage': drain,
      'drain_rate_per_hour': drain / elapsed.inMinutes * 60,
      'monitoring_duration': elapsed.inMinutes,
    };
  }
}`,
    platformImplementation: {
      android: 'BatteryManager.BATTERY_PROPERTY_CAPACITY',
      ios: 'UIDevice.current.batteryLevel',
    },
  };
}

function getTargetMetrics() {
  return {
    fps: {
      target: 60,
      minimum: 55,
      critical: 30,
    },
    memory: {
      target: '< 150MB',
      warning: '> 200MB',
      critical: '> 300MB',
    },
    cpu: {
      buildTime: '< 8ms',
      rasterTime: '< 8ms',
      total: '< 16ms',
    },
    network: {
      latency: '< 300ms',
      timeout: '30s',
      retries: 3,
    },
    battery: {
      normalDrain: '< 10% per hour',
      acceptable: '< 15% per hour',
      high: '> 20% per hour',
    },
  };
}

function getCriticalThresholds() {
  return {
    fps: {
      threshold: 30,
      action: 'Reduce animations and complex layouts',
    },
    memory: {
      threshold: 300,  // MB
      action: 'Clear caches and dispose unused resources',
    },
    cpu: {
      threshold: 80,  // percentage
      action: 'Optimize build methods and reduce computations',
    },
    crashRate: {
      threshold: 0.1,  // 0.1%
      action: 'Investigate and fix stability issues',
    },
  };
}

function determineMonitoringStrategy(type) {
  const strategies = {
    comprehensive: {
      interval: 1,  // seconds
      metrics: ['fps', 'memory', 'cpu', 'network', 'battery'],
      overhead: 'medium',
      useCase: 'Development and testing',
    },
    balanced: {
      interval: 5,
      metrics: ['fps', 'memory', 'cpu'],
      overhead: 'low',
      useCase: 'Beta testing',
    },
    lightweight: {
      interval: 30,
      metrics: ['fps', 'crashes'],
      overhead: 'minimal',
      useCase: 'Production',
    },
  };
  
  return strategies[type] || strategies.balanced;
}

function generateSetupInstructions() {
  return `
# Performance Monitoring Setup

1. Add dependencies:
   \`\`\`yaml
   dependencies:
     flutter:
       sdk: flutter
   \`\`\`

2. Initialize monitoring in main():
   \`\`\`dart
   void main() {
     PerformanceMonitor().startMonitoring();
     runApp(MyApp());
   }
   \`\`\`

3. Add dashboard to debug builds:
   \`\`\`dart
   if (kDebugMode) {
     routes['/performance'] = (context) => PerformanceDashboard();
   }
   \`\`\`

4. Configure platform-specific code:
   - Android: Add to MainActivity.kt
   - iOS: Add to AppDelegate.swift

5. Set up crash reporting integration
6. Configure analytics endpoints
`;
}

function generateIntegrationCode(metrics) {
  return `
// Integration wrapper for all metrics
class PerformanceIntegration {
  static void initialize() {
    // Start all monitors
    PerformanceMonitor().startMonitoring();
    FPSMonitor.startRecording();
    MemoryMonitor.startMonitoring();
    
    // Set up error handling
    FlutterError.onError = (FlutterErrorDetails details) {
      _logError(details);
    };
    
    // Set up isolate error handling
    Isolate.current.addErrorListener(RawReceivePort((pair) async {
      final List<dynamic> errorAndStacktrace = pair;
      _logError(FlutterErrorDetails(
        exception: errorAndStacktrace.first,
        stack: errorAndStacktrace.last,
      ));
    }).sendPort);
  }
  
  static void _logError(FlutterErrorDetails details) {
    // Log with performance context
    final metrics = PerformanceMonitor().currentMetrics;
    
    PerformanceAnalytics.trackPerformanceEvent('error', {
      'error': details.exception.toString(),
      'fps': metrics['fps'],
      'memory': metrics['memoryUsage'],
      'cpu': metrics['cpuUsage'],
    });
  }
}`;
}

function generateReportingCode() {
  return `
// Performance reporting system
class PerformanceReporter {
  static Future<void> generateReport({
    required DateTime startTime,
    required DateTime endTime,
  }) async {
    final report = PerformanceReport(
      startTime: startTime,
      endTime: endTime,
      metrics: await _collectMetrics(),
      issues: _identifyIssues(),
      recommendations: _generateRecommendations(),
    );
    
    // Save or send report
    await _saveReport(report);
  }
  
  static Future<Map<String, dynamic>> _collectMetrics() async {
    return {
      'fps': {
        'average': FPSMonitor.averageFPS,
        'minimum': FPSMonitor.minFPS,
        'jank_percentage': FPSMonitor.jankPercentage,
      },
      'memory': await MemoryMonitor.getStats(),
      'cpu': CPUMonitor.averages,
      'network': NetworkMonitor.stats.toJson(),
      'battery': await BatteryMonitor.getBatteryStats(),
    };
  }
  
  static List<PerformanceIssue> _identifyIssues() {
    final issues = <PerformanceIssue>[];
    
    if (FPSMonitor.jankPercentage > 5) {
      issues.add(PerformanceIssue(
        type: 'jank',
        severity: 'high',
        description: 'High jank rate detected',
        value: FPSMonitor.jankPercentage,
      ));
    }
    
    // Add more issue detection
    
    return issues;
  }
  
  static List<String> _generateRecommendations() {
    final recommendations = <String>[];
    
    if (FPSMonitor.averageFPS < 55) {
      recommendations.add('Optimize rendering performance');
    }
    
    // Add more recommendations
    
    return recommendations;
  }
  
  static Future<void> _saveReport(PerformanceReport report) async {
    // Save to file or send to server
    final json = report.toJson();
    // Implementation specific
  }
}`;
}

function generateAlertSystem() {
  return `
// Real-time performance alerts
class PerformanceAlerts {
  static final _thresholds = {
    'fps': 30.0,
    'memory': 300.0,  // MB
    'cpu': 80.0,  // %
  };
  
  static void checkThresholds(Map<String, dynamic> metrics) {
    // FPS Alert
    if (metrics['fps'] != null && metrics['fps'] < _thresholds['fps']!) {
      _triggerAlert(PerformanceAlert(
        type: 'fps',
        severity: 'critical',
        message: 'FPS dropped below 30',
        value: metrics['fps'],
        timestamp: DateTime.now(),
      ));
    }
    
    // Memory Alert
    final memoryUsage = metrics['memoryUsage']?['used'];
    if (memoryUsage != null && memoryUsage > _thresholds['memory']!) {
      _triggerAlert(PerformanceAlert(
        type: 'memory',
        severity: 'warning',
        message: 'High memory usage detected',
        value: memoryUsage,
        timestamp: DateTime.now(),
      ));
    }
    
    // CPU Alert
    if (metrics['cpuUsage'] != null && metrics['cpuUsage'] > _thresholds['cpu']!) {
      _triggerAlert(PerformanceAlert(
        type: 'cpu',
        severity: 'warning',
        message: 'High CPU usage detected',
        value: metrics['cpuUsage'],
        timestamp: DateTime.now(),
      ));
    }
  }
  
  static void _triggerAlert(PerformanceAlert alert) {
    // Log alert
    print('[ALERT] \${alert.message}');
    
    // Send to monitoring service
    PerformanceAnalytics.trackPerformanceEvent('performance_alert', alert.toJson());
    
    // Show in-app notification if in debug mode
    if (kDebugMode) {
      _showDebugNotification(alert);
    }
  }
  
  static void _showDebugNotification(PerformanceAlert alert) {
    // Show overlay or snackbar
  }
}

class PerformanceAlert {
  final String type;
  final String severity;
  final String message;
  final dynamic value;
  final DateTime timestamp;
  
  PerformanceAlert({
    required this.type,
    required this.severity,
    required this.message,
    required this.value,
    required this.timestamp,
  });
  
  Map<String, dynamic> toJson() => {
    'type': type,
    'severity': severity,
    'message': message,
    'value': value,
    'timestamp': timestamp.toIso8601String(),
  };
}`;
}

function getMonitoringBestPractices() {
  return [
    {
      category: 'Development',
      practices: [
        'Enable comprehensive monitoring during development',
        'Use performance overlay to visualize issues',
        'Profile on real devices, not just emulators',
        'Test with realistic data sets',
      ],
    },
    {
      category: 'Testing',
      practices: [
        'Run performance tests on low-end devices',
        'Test with limited network conditions',
        'Monitor memory usage during long sessions',
        'Automate performance regression tests',
      ],
    },
    {
      category: 'Production',
      practices: [
        'Use lightweight monitoring to minimize overhead',
        'Sample metrics instead of continuous monitoring',
        'Set up alerts for critical thresholds',
        'Aggregate data before sending to servers',
      ],
    },
    {
      category: 'Analysis',
      practices: [
        'Track performance trends over time',
        'Correlate performance with user engagement',
        'Compare metrics across app versions',
        'Identify device-specific issues',
      ],
    },
  ];
}