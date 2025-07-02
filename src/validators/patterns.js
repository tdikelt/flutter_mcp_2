export function getFlutterPatterns() {
  return {
    repository: {
      name: 'Repository Pattern',
      description: 'Abstracts data source implementation from business logic',
      example: `
abstract class UserRepository {
  Future<User> getUser(String id);
  Future<void> saveUser(User user);
}

class UserRepositoryImpl implements UserRepository {
  final ApiClient apiClient;
  
  UserRepositoryImpl(this.apiClient);
  
  @override
  Future<User> getUser(String id) async {
    final response = await apiClient.get('/users/$id');
    return User.fromJson(response.data);
  }
}`,
    },
    factory: {
      name: 'Factory Pattern',
      description: 'Creates objects without specifying exact classes',
      example: `
class WidgetFactory {
  static Widget createButton({
    required String type,
    required String label,
    required VoidCallback onPressed,
  }) {
    switch (type) {
      case 'elevated':
        return ElevatedButton(onPressed: onPressed, child: Text(label));
      case 'text':
        return TextButton(onPressed: onPressed, child: Text(label));
      default:
        return OutlinedButton(onPressed: onPressed, child: Text(label));
    }
  }
}`,
    },
    bloc: {
      name: 'BLoC Pattern',
      description: 'Business Logic Component for state management',
      example: `
class CounterBloc {
  final _counterController = StreamController<int>();
  Stream<int> get counter => _counterController.stream;
  
  int _count = 0;
  
  void increment() {
    _count++;
    _counterController.sink.add(_count);
  }
  
  void dispose() {
    _counterController.close();
  }
}`,
    },
    singleton: {
      name: 'Singleton Pattern',
      description: 'Ensures single instance of a class',
      example: `
class AppConfig {
  static final AppConfig _instance = AppConfig._internal();
  
  factory AppConfig() => _instance;
  
  AppConfig._internal();
  
  String apiUrl = 'https://api.example.com';
  bool isDarkMode = false;
}`,
    },
  };
}