export async function generateCleanArchitecture(args) {
  const { 
    projectName, 
    features = [],
    stateManagement = 'riverpod',
    includeTests = true,
    includeDI = true 
  } = args;
  
  try {
    const architecture = {
      structure: generateProjectStructure(projectName, features),
      layers: generateLayers(),
      dependencies: generateDependencies(stateManagement),
      core: generateCoreComponents(),
      features: features.map(f => generateFeature(f, stateManagement)),
      setup: generateSetupInstructions(projectName, stateManagement),
    };
    
    const files = generateAllFiles(architecture, stateManagement, includeDI);
    const tests = includeTests ? generateTestStructure(architecture) : null;
    const documentation = generateArchitectureDocumentation(architecture);
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            architecture,
            files,
            tests,
            documentation,
            commands: getSetupCommands(projectName),
            bestPractices: getCleanArchitectureBestPractices(),
          }, null, 2),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error generating clean architecture: ${error.message}`,
        },
      ],
    };
  }
}

function generateProjectStructure(projectName, features) {
  return `
${projectName}/
├── lib/
│   ├── core/
│   │   ├── error/
│   │   │   ├── exceptions.dart
│   │   │   └── failures.dart
│   │   ├── network/
│   │   │   ├── network_info.dart
│   │   │   └── api_client.dart
│   │   ├── usecases/
│   │   │   └── usecase.dart
│   │   ├── utils/
│   │   │   ├── constants.dart
│   │   │   ├── extensions.dart
│   │   │   └── validators.dart
│   │   └── widgets/
│   │       ├── loading_widget.dart
│   │       └── error_widget.dart
│   │
│   ├── features/
${features.map(f => `│   ├── ${f}/
│   │   ├── data/
│   │   │   ├── datasources/
│   │   │   │   ├── ${f}_local_datasource.dart
│   │   │   │   └── ${f}_remote_datasource.dart
│   │   │   ├── models/
│   │   │   │   └── ${f}_model.dart
│   │   │   └── repositories/
│   │   │       └── ${f}_repository_impl.dart
│   │   ├── domain/
│   │   │   ├── entities/
│   │   │   │   └── ${f}.dart
│   │   │   ├── repositories/
│   │   │   │   └── ${f}_repository.dart
│   │   │   └── usecases/
│   │   │       ├── get_${f}.dart
│   │   │       └── create_${f}.dart
│   │   └── presentation/
│   │       ├── pages/
│   │       │   └── ${f}_page.dart
│   │       ├── widgets/
│   │       │   └── ${f}_widget.dart
│   │       └── providers/
│   │           └── ${f}_provider.dart`).join('\n')}
│   │
│   ├── injection_container.dart
│   └── main.dart
│
├── test/
│   ├── core/
│   ├── features/
│   └── fixtures/
│
└── pubspec.yaml`;
}

function generateLayers() {
  return {
    presentation: {
      description: 'UI layer with widgets, pages, and state management',
      dependencies: ['domain'],
      components: ['Pages', 'Widgets', 'State Management', 'Routes'],
    },
    domain: {
      description: 'Business logic layer with entities and use cases',
      dependencies: [],
      components: ['Entities', 'Use Cases', 'Repository Interfaces'],
    },
    data: {
      description: 'Data layer with repositories and data sources',
      dependencies: ['domain'],
      components: ['Repository Implementations', 'Models', 'Data Sources', 'Mappers'],
    },
  };
}

function generateDependencies(stateManagement) {
  const baseDeps = `
dependencies:
  flutter:
    sdk: flutter
  
  # Core
  equatable: ^2.0.5
  dartz: ^0.10.1
  
  # Network
  dio: ^5.0.0
  connectivity_plus: ^3.0.2
  
  # Local Storage
  shared_preferences: ^2.0.17
  hive: ^2.2.3
  hive_flutter: ^1.1.0
  
  # Dependency Injection
  get_it: ^7.2.0
  injectable: ^2.1.0`;

  const stateManagementDeps = {
    riverpod: `
  # State Management
  flutter_riverpod: ^2.1.3
  riverpod_annotation: ^1.1.1`,
    bloc: `
  # State Management
  flutter_bloc: ^8.1.1
  bloc: ^8.1.0`,
    provider: `
  # State Management
  provider: ^6.0.5`,
  };

  return baseDeps + (stateManagementDeps[stateManagement] || '');
}

function generateCoreComponents() {
  return {
    failures: `
import 'package:equatable/equatable.dart';

abstract class Failure extends Equatable {
  final String message;
  
  const Failure(this.message);
  
  @override
  List<Object> get props => [message];
}

class ServerFailure extends Failure {
  const ServerFailure(String message) : super(message);
}

class CacheFailure extends Failure {
  const CacheFailure(String message) : super(message);
}

class NetworkFailure extends Failure {
  const NetworkFailure(String message) : super(message);
}`,

    exceptions: `
class ServerException implements Exception {
  final String message;
  ServerException(this.message);
}

class CacheException implements Exception {
  final String message;
  CacheException(this.message);
}

class NetworkException implements Exception {
  final String message;
  NetworkException(this.message);
}`,

    usecase: `
import 'package:dartz/dartz.dart';
import 'package:equatable/equatable.dart';
import '../error/failures.dart';

abstract class UseCase<Type, Params> {
  Future<Either<Failure, Type>> call(Params params);
}

class NoParams extends Equatable {
  @override
  List<Object> get props => [];
}`,

    networkInfo: `
import 'package:connectivity_plus/connectivity_plus.dart';

abstract class NetworkInfo {
  Future<bool> get isConnected;
}

class NetworkInfoImpl implements NetworkInfo {
  final Connectivity connectivity;
  
  NetworkInfoImpl(this.connectivity);
  
  @override
  Future<bool> get isConnected async {
    final result = await connectivity.checkConnectivity();
    return result != ConnectivityResult.none;
  }
}`,

    apiClient: `
import 'package:dio/dio.dart';

class ApiClient {
  final Dio dio;
  final String baseUrl;
  
  ApiClient({
    required this.baseUrl,
    Dio? dio,
  }) : dio = dio ?? Dio() {
    this.dio.options = BaseOptions(
      baseUrl: baseUrl,
      connectTimeout: const Duration(seconds: 30),
      receiveTimeout: const Duration(seconds: 30),
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    );
    
    // Add interceptors
    this.dio.interceptors.add(LogInterceptor(
      requestBody: true,
      responseBody: true,
    ));
  }
  
  // Add auth token
  void setAuthToken(String token) {
    dio.options.headers['Authorization'] = 'Bearer \$token';
  }
  
  // Remove auth token
  void removeAuthToken() {
    dio.options.headers.remove('Authorization');
  }
}`,
  };
}

function generateFeature(featureName, stateManagement) {
  const feature = {
    name: featureName,
    entity: generateEntity(featureName),
    model: generateModel(featureName),
    repository: generateRepository(featureName),
    repositoryImpl: generateRepositoryImpl(featureName),
    datasources: generateDatasources(featureName),
    usecases: generateUsecases(featureName),
    presentation: generatePresentation(featureName, stateManagement),
  };
  
  return feature;
}

function generateEntity(name) {
  return `
import 'package:equatable/equatable.dart';

class ${capitalize(name)} extends Equatable {
  final String id;
  final String name;
  final String description;
  final DateTime createdAt;
  final DateTime updatedAt;
  
  const ${capitalize(name)}({
    required this.id,
    required this.name,
    required this.description,
    required this.createdAt,
    required this.updatedAt,
  });
  
  @override
  List<Object?> get props => [id, name, description, createdAt, updatedAt];
}`;
}

function generateModel(name) {
  return `
import '../../domain/entities/${name}.dart';

class ${capitalize(name)}Model extends ${capitalize(name)} {
  const ${capitalize(name)}Model({
    required String id,
    required String name,
    required String description,
    required DateTime createdAt,
    required DateTime updatedAt,
  }) : super(
    id: id,
    name: name,
    description: description,
    createdAt: createdAt,
    updatedAt: updatedAt,
  );
  
  factory ${capitalize(name)}Model.fromJson(Map<String, dynamic> json) {
    return ${capitalize(name)}Model(
      id: json['id'],
      name: json['name'],
      description: json['description'],
      createdAt: DateTime.parse(json['created_at']),
      updatedAt: DateTime.parse(json['updated_at']),
    );
  }
  
  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'description': description,
      'created_at': createdAt.toIso8601String(),
      'updated_at': updatedAt.toIso8601String(),
    };
  }
  
  factory ${capitalize(name)}Model.fromEntity(${capitalize(name)} entity) {
    return ${capitalize(name)}Model(
      id: entity.id,
      name: entity.name,
      description: entity.description,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    );
  }
}`;
}

function generateRepository(name) {
  return `
import 'package:dartz/dartz.dart';
import '../../../../core/error/failures.dart';
import '../entities/${name}.dart';

abstract class ${capitalize(name)}Repository {
  Future<Either<Failure, List<${capitalize(name)}>>> getAll${capitalize(name)}s();
  Future<Either<Failure, ${capitalize(name)}>> get${capitalize(name)}(String id);
  Future<Either<Failure, ${capitalize(name)}>> create${capitalize(name)}(${capitalize(name)} ${name});
  Future<Either<Failure, ${capitalize(name)}>> update${capitalize(name)}(${capitalize(name)} ${name});
  Future<Either<Failure, void>> delete${capitalize(name)}(String id);
}`;
}

function generateRepositoryImpl(name) {
  return `
import 'package:dartz/dartz.dart';
import '../../../../core/error/exceptions.dart';
import '../../../../core/error/failures.dart';
import '../../../../core/network/network_info.dart';
import '../../domain/entities/${name}.dart';
import '../../domain/repositories/${name}_repository.dart';
import '../datasources/${name}_local_datasource.dart';
import '../datasources/${name}_remote_datasource.dart';

class ${capitalize(name)}RepositoryImpl implements ${capitalize(name)}Repository {
  final ${capitalize(name)}RemoteDataSource remoteDataSource;
  final ${capitalize(name)}LocalDataSource localDataSource;
  final NetworkInfo networkInfo;
  
  ${capitalize(name)}RepositoryImpl({
    required this.remoteDataSource,
    required this.localDataSource,
    required this.networkInfo,
  });
  
  @override
  Future<Either<Failure, List<${capitalize(name)}>>> getAll${capitalize(name)}s() async {
    if (await networkInfo.isConnected) {
      try {
        final remote${capitalize(name)}s = await remoteDataSource.getAll${capitalize(name)}s();
        await localDataSource.cache${capitalize(name)}s(remote${capitalize(name)}s);
        return Right(remote${capitalize(name)}s);
      } on ServerException catch (e) {
        return Left(ServerFailure(e.message));
      }
    } else {
      try {
        final local${capitalize(name)}s = await localDataSource.getCached${capitalize(name)}s();
        return Right(local${capitalize(name)}s);
      } on CacheException catch (e) {
        return Left(CacheFailure(e.message));
      }
    }
  }
  
  @override
  Future<Either<Failure, ${capitalize(name)}>> get${capitalize(name)}(String id) async {
    if (await networkInfo.isConnected) {
      try {
        final remote${capitalize(name)} = await remoteDataSource.get${capitalize(name)}(id);
        return Right(remote${capitalize(name)});
      } on ServerException catch (e) {
        return Left(ServerFailure(e.message));
      }
    } else {
      return Left(NetworkFailure('No internet connection'));
    }
  }
  
  @override
  Future<Either<Failure, ${capitalize(name)}>> create${capitalize(name)}(${capitalize(name)} ${name}) async {
    if (await networkInfo.isConnected) {
      try {
        final created${capitalize(name)} = await remoteDataSource.create${capitalize(name)}(${name});
        return Right(created${capitalize(name)});
      } on ServerException catch (e) {
        return Left(ServerFailure(e.message));
      }
    } else {
      return Left(NetworkFailure('No internet connection'));
    }
  }
  
  @override
  Future<Either<Failure, ${capitalize(name)}>> update${capitalize(name)}(${capitalize(name)} ${name}) async {
    if (await networkInfo.isConnected) {
      try {
        final updated${capitalize(name)} = await remoteDataSource.update${capitalize(name)}(${name});
        return Right(updated${capitalize(name)});
      } on ServerException catch (e) {
        return Left(ServerFailure(e.message));
      }
    } else {
      return Left(NetworkFailure('No internet connection'));
    }
  }
  
  @override
  Future<Either<Failure, void>> delete${capitalize(name)}(String id) async {
    if (await networkInfo.isConnected) {
      try {
        await remoteDataSource.delete${capitalize(name)}(id);
        return const Right(null);
      } on ServerException catch (e) {
        return Left(ServerFailure(e.message));
      }
    } else {
      return Left(NetworkFailure('No internet connection'));
    }
  }
}`;
}

function generateDatasources(name) {
  const remote = `
import '../../../../core/error/exceptions.dart';
import '../../../../core/network/api_client.dart';
import '../models/${name}_model.dart';

abstract class ${capitalize(name)}RemoteDataSource {
  Future<List<${capitalize(name)}Model>> getAll${capitalize(name)}s();
  Future<${capitalize(name)}Model> get${capitalize(name)}(String id);
  Future<${capitalize(name)}Model> create${capitalize(name)}(${capitalize(name)}Model ${name});
  Future<${capitalize(name)}Model> update${capitalize(name)}(${capitalize(name)}Model ${name});
  Future<void> delete${capitalize(name)}(String id);
}

class ${capitalize(name)}RemoteDataSourceImpl implements ${capitalize(name)}RemoteDataSource {
  final ApiClient apiClient;
  
  ${capitalize(name)}RemoteDataSourceImpl({required this.apiClient});
  
  @override
  Future<List<${capitalize(name)}Model>> getAll${capitalize(name)}s() async {
    try {
      final response = await apiClient.dio.get('/${name}s');
      
      if (response.statusCode == 200) {
        return (response.data as List)
            .map((json) => ${capitalize(name)}Model.fromJson(json))
            .toList();
      } else {
        throw ServerException('Failed to load ${name}s');
      }
    } catch (e) {
      throw ServerException(e.toString());
    }
  }
  
  @override
  Future<${capitalize(name)}Model> get${capitalize(name)}(String id) async {
    try {
      final response = await apiClient.dio.get('/${name}s/\$id');
      
      if (response.statusCode == 200) {
        return ${capitalize(name)}Model.fromJson(response.data);
      } else {
        throw ServerException('Failed to load ${name}');
      }
    } catch (e) {
      throw ServerException(e.toString());
    }
  }
  
  @override
  Future<${capitalize(name)}Model> create${capitalize(name)}(${capitalize(name)}Model ${name}) async {
    try {
      final response = await apiClient.dio.post(
        '/${name}s',
        data: ${name}.toJson(),
      );
      
      if (response.statusCode == 201) {
        return ${capitalize(name)}Model.fromJson(response.data);
      } else {
        throw ServerException('Failed to create ${name}');
      }
    } catch (e) {
      throw ServerException(e.toString());
    }
  }
  
  @override
  Future<${capitalize(name)}Model> update${capitalize(name)}(${capitalize(name)}Model ${name}) async {
    try {
      final response = await apiClient.dio.put(
        '/${name}s/\${${name}.id}',
        data: ${name}.toJson(),
      );
      
      if (response.statusCode == 200) {
        return ${capitalize(name)}Model.fromJson(response.data);
      } else {
        throw ServerException('Failed to update ${name}');
      }
    } catch (e) {
      throw ServerException(e.toString());
    }
  }
  
  @override
  Future<void> delete${capitalize(name)}(String id) async {
    try {
      final response = await apiClient.dio.delete('/${name}s/\$id');
      
      if (response.statusCode != 204) {
        throw ServerException('Failed to delete ${name}');
      }
    } catch (e) {
      throw ServerException(e.toString());
    }
  }
}`;

  const local = `
import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import '../../../../core/error/exceptions.dart';
import '../models/${name}_model.dart';

abstract class ${capitalize(name)}LocalDataSource {
  Future<List<${capitalize(name)}Model>> getCached${capitalize(name)}s();
  Future<void> cache${capitalize(name)}s(List<${capitalize(name)}Model> ${name}s);
}

class ${capitalize(name)}LocalDataSourceImpl implements ${capitalize(name)}LocalDataSource {
  final SharedPreferences sharedPreferences;
  static const CACHED_${name.toUpperCase()}S = 'CACHED_${name.toUpperCase()}S';
  
  ${capitalize(name)}LocalDataSourceImpl({required this.sharedPreferences});
  
  @override
  Future<List<${capitalize(name)}Model>> getCached${capitalize(name)}s() {
    final jsonString = sharedPreferences.getString(CACHED_${name.toUpperCase()}S);
    
    if (jsonString != null) {
      return Future.value(
        (json.decode(jsonString) as List)
            .map((json) => ${capitalize(name)}Model.fromJson(json))
            .toList(),
      );
    } else {
      throw CacheException('No cached ${name}s found');
    }
  }
  
  @override
  Future<void> cache${capitalize(name)}s(List<${capitalize(name)}Model> ${name}s) {
    final jsonString = json.encode(
      ${name}s.map((${name}) => ${name}.toJson()).toList(),
    );
    
    return sharedPreferences.setString(
      CACHED_${name.toUpperCase()}S,
      jsonString,
    );
  }
}`;

  return { remote, local };
}

function generateUsecases(name) {
  const getAll = `
import 'package:dartz/dartz.dart';
import '../../../../core/error/failures.dart';
import '../../../../core/usecases/usecase.dart';
import '../entities/${name}.dart';
import '../repositories/${name}_repository.dart';

class GetAll${capitalize(name)}s implements UseCase<List<${capitalize(name)}>, NoParams> {
  final ${capitalize(name)}Repository repository;
  
  GetAll${capitalize(name)}s(this.repository);
  
  @override
  Future<Either<Failure, List<${capitalize(name)}>>> call(NoParams params) async {
    return await repository.getAll${capitalize(name)}s();
  }
}`;

  const getOne = `
import 'package:dartz/dartz.dart';
import 'package:equatable/equatable.dart';
import '../../../../core/error/failures.dart';
import '../../../../core/usecases/usecase.dart';
import '../entities/${name}.dart';
import '../repositories/${name}_repository.dart';

class Get${capitalize(name)} implements UseCase<${capitalize(name)}, Get${capitalize(name)}Params> {
  final ${capitalize(name)}Repository repository;
  
  Get${capitalize(name)}(this.repository);
  
  @override
  Future<Either<Failure, ${capitalize(name)}>> call(Get${capitalize(name)}Params params) async {
    return await repository.get${capitalize(name)}(params.id);
  }
}

class Get${capitalize(name)}Params extends Equatable {
  final String id;
  
  const Get${capitalize(name)}Params({required this.id});
  
  @override
  List<Object> get props => [id];
}`;

  const create = `
import 'package:dartz/dartz.dart';
import 'package:equatable/equatable.dart';
import '../../../../core/error/failures.dart';
import '../../../../core/usecases/usecase.dart';
import '../entities/${name}.dart';
import '../repositories/${name}_repository.dart';

class Create${capitalize(name)} implements UseCase<${capitalize(name)}, Create${capitalize(name)}Params> {
  final ${capitalize(name)}Repository repository;
  
  Create${capitalize(name)}(this.repository);
  
  @override
  Future<Either<Failure, ${capitalize(name)}>> call(Create${capitalize(name)}Params params) async {
    return await repository.create${capitalize(name)}(params.${name});
  }
}

class Create${capitalize(name)}Params extends Equatable {
  final ${capitalize(name)} ${name};
  
  const Create${capitalize(name)}Params({required this.${name}});
  
  @override
  List<Object> get props => [${name}];
}`;

  return { getAll, getOne, create };
}

function generatePresentation(name, stateManagement) {
  if (stateManagement === 'riverpod') {
    return generateRiverpodPresentation(name);
  } else if (stateManagement === 'bloc') {
    return generateBlocPresentation(name);
  } else {
    return generateProviderPresentation(name);
  }
}

function generateRiverpodPresentation(name) {
  const provider = `
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/usecases/usecase.dart';
import '../../domain/entities/${name}.dart';
import '../../domain/usecases/get_all_${name}s.dart';

final ${name}sProvider = FutureProvider<List<${capitalize(name)}>>((ref) async {
  final usecase = ref.read(getAll${capitalize(name)}sProvider);
  final result = await usecase(NoParams());
  
  return result.fold(
    (failure) => throw Exception(failure.message),
    (${name}s) => ${name}s,
  );
});

final getAll${capitalize(name)}sProvider = Provider<GetAll${capitalize(name)}s>((ref) {
  return GetAll${capitalize(name)}s(ref.read(${name}RepositoryProvider));
});

final ${name}RepositoryProvider = Provider<${capitalize(name)}Repository>((ref) {
  throw UnimplementedError('Initialize in injection container');
});`;

  const page = `
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/${name}_provider.dart';

class ${capitalize(name)}Page extends ConsumerWidget {
  const ${capitalize(name)}Page({Key? key}) : super(key: key);
  
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final ${name}sAsync = ref.watch(${name}sProvider);
    
    return Scaffold(
      appBar: AppBar(
        title: Text('${capitalize(name)}s'),
      ),
      body: ${name}sAsync.when(
        data: (${name}s) => ListView.builder(
          itemCount: ${name}s.length,
          itemBuilder: (context, index) {
            final ${name} = ${name}s[index];
            return ListTile(
              title: Text(${name}.name),
              subtitle: Text(${name}.description),
              onTap: () {
                // Navigate to detail
              },
            );
          },
        ),
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, stack) => Center(
          child: Text('Error: \$error'),
        ),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () {
          // Navigate to create
        },
        child: const Icon(Icons.add),
      ),
    );
  }
}`;

  return { provider, page };
}

function generateBlocPresentation(name) {
  const bloc = `
import 'package:bloc/bloc.dart';
import 'package:equatable/equatable.dart';
import '../../../../core/usecases/usecase.dart';
import '../../domain/entities/${name}.dart';
import '../../domain/usecases/get_all_${name}s.dart';

part '${name}_event.dart';
part '${name}_state.dart';

class ${capitalize(name)}Bloc extends Bloc<${capitalize(name)}Event, ${capitalize(name)}State> {
  final GetAll${capitalize(name)}s getAll${capitalize(name)}s;
  
  ${capitalize(name)}Bloc({
    required this.getAll${capitalize(name)}s,
  }) : super(${capitalize(name)}Initial()) {
    on<GetAll${capitalize(name)}sEvent>(_onGetAll${capitalize(name)}s);
  }
  
  Future<void> _onGetAll${capitalize(name)}s(
    GetAll${capitalize(name)}sEvent event,
    Emitter<${capitalize(name)}State> emit,
  ) async {
    emit(${capitalize(name)}Loading());
    
    final result = await getAll${capitalize(name)}s(NoParams());
    
    result.fold(
      (failure) => emit(${capitalize(name)}Error(failure.message)),
      (${name}s) => emit(${capitalize(name)}Loaded(${name}s)),
    );
  }
}`;

  const event = `
part of '${name}_bloc.dart';

abstract class ${capitalize(name)}Event extends Equatable {
  const ${capitalize(name)}Event();
  
  @override
  List<Object> get props => [];
}

class GetAll${capitalize(name)}sEvent extends ${capitalize(name)}Event {}`;

  const state = `
part of '${name}_bloc.dart';

abstract class ${capitalize(name)}State extends Equatable {
  const ${capitalize(name)}State();
  
  @override
  List<Object> get props => [];
}

class ${capitalize(name)}Initial extends ${capitalize(name)}State {}

class ${capitalize(name)}Loading extends ${capitalize(name)}State {}

class ${capitalize(name)}Loaded extends ${capitalize(name)}State {
  final List<${capitalize(name)}> ${name}s;
  
  const ${capitalize(name)}Loaded(this.${name}s);
  
  @override
  List<Object> get props => [${name}s];
}

class ${capitalize(name)}Error extends ${capitalize(name)}State {
  final String message;
  
  const ${capitalize(name)}Error(this.message);
  
  @override
  List<Object> get props => [message];
}`;

  const page = `
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../bloc/${name}_bloc.dart';

class ${capitalize(name)}Page extends StatelessWidget {
  const ${capitalize(name)}Page({Key? key}) : super(key: key);
  
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('${capitalize(name)}s'),
      ),
      body: BlocBuilder<${capitalize(name)}Bloc, ${capitalize(name)}State>(
        builder: (context, state) {
          if (state is ${capitalize(name)}Loading) {
            return const Center(child: CircularProgressIndicator());
          } else if (state is ${capitalize(name)}Loaded) {
            return ListView.builder(
              itemCount: state.${name}s.length,
              itemBuilder: (context, index) {
                final ${name} = state.${name}s[index];
                return ListTile(
                  title: Text(${name}.name),
                  subtitle: Text(${name}.description),
                  onTap: () {
                    // Navigate to detail
                  },
                );
              },
            );
          } else if (state is ${capitalize(name)}Error) {
            return Center(
              child: Text('Error: \${state.message}'),
            );
          }
          return const SizedBox();
        },
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () {
          context.read<${capitalize(name)}Bloc>().add(GetAll${capitalize(name)}sEvent());
        },
        child: const Icon(Icons.refresh),
      ),
    );
  }
}`;

  return { bloc, event, state, page };
}

function generateProviderPresentation(name) {
  const provider = `
import 'package:flutter/foundation.dart';
import '../../../../core/usecases/usecase.dart';
import '../../domain/entities/${name}.dart';
import '../../domain/usecases/get_all_${name}s.dart';

class ${capitalize(name)}Provider extends ChangeNotifier {
  final GetAll${capitalize(name)}s getAll${capitalize(name)}s;
  
  ${capitalize(name)}Provider({required this.getAll${capitalize(name)}s});
  
  List<${capitalize(name)}> _${name}s = [];
  List<${capitalize(name)}> get ${name}s => _${name}s;
  
  bool _isLoading = false;
  bool get isLoading => _isLoading;
  
  String? _error;
  String? get error => _error;
  
  Future<void> load${capitalize(name)}s() async {
    _isLoading = true;
    _error = null;
    notifyListeners();
    
    final result = await getAll${capitalize(name)}s(NoParams());
    
    result.fold(
      (failure) {
        _error = failure.message;
        _isLoading = false;
        notifyListeners();
      },
      (${name}s) {
        _${name}s = ${name}s;
        _isLoading = false;
        notifyListeners();
      },
    );
  }
}`;

  const page = `
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/${name}_provider.dart';

class ${capitalize(name)}Page extends StatefulWidget {
  const ${capitalize(name)}Page({Key? key}) : super(key: key);
  
  @override
  State<${capitalize(name)}Page> createState() => _${capitalize(name)}PageState();
}

class _${capitalize(name)}PageState extends State<${capitalize(name)}Page> {
  @override
  void initState() {
    super.initState();
    Future.microtask(() =>
      context.read<${capitalize(name)}Provider>().load${capitalize(name)}s()
    );
  }
  
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('${capitalize(name)}s'),
      ),
      body: Consumer<${capitalize(name)}Provider>(
        builder: (context, provider, child) {
          if (provider.isLoading) {
            return const Center(child: CircularProgressIndicator());
          }
          
          if (provider.error != null) {
            return Center(
              child: Text('Error: \${provider.error}'),
            );
          }
          
          return ListView.builder(
            itemCount: provider.${name}s.length,
            itemBuilder: (context, index) {
              final ${name} = provider.${name}s[index];
              return ListTile(
                title: Text(${name}.name),
                subtitle: Text(${name}.description),
                onTap: () {
                  // Navigate to detail
                },
              );
            },
          );
        },
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () {
          // Navigate to create
        },
        child: const Icon(Icons.add),
      ),
    );
  }
}`;

  return { provider, page };
}

function generateAllFiles(architecture, stateManagement, includeDI) {
  const files = {};
  
  // Core files
  files['lib/core/error/failures.dart'] = architecture.core.failures;
  files['lib/core/error/exceptions.dart'] = architecture.core.exceptions;
  files['lib/core/usecases/usecase.dart'] = architecture.core.usecase;
  files['lib/core/network/network_info.dart'] = architecture.core.networkInfo;
  files['lib/core/network/api_client.dart'] = architecture.core.apiClient;
  
  // Feature files
  architecture.features.forEach(feature => {
    const name = feature.name;
    
    // Domain layer
    files[`lib/features/${name}/domain/entities/${name}.dart`] = feature.entity;
    files[`lib/features/${name}/domain/repositories/${name}_repository.dart`] = feature.repository;
    files[`lib/features/${name}/domain/usecases/get_all_${name}s.dart`] = feature.usecases.getAll;
    files[`lib/features/${name}/domain/usecases/get_${name}.dart`] = feature.usecases.getOne;
    files[`lib/features/${name}/domain/usecases/create_${name}.dart`] = feature.usecases.create;
    
    // Data layer
    files[`lib/features/${name}/data/models/${name}_model.dart`] = feature.model;
    files[`lib/features/${name}/data/repositories/${name}_repository_impl.dart`] = feature.repositoryImpl;
    files[`lib/features/${name}/data/datasources/${name}_remote_datasource.dart`] = feature.datasources.remote;
    files[`lib/features/${name}/data/datasources/${name}_local_datasource.dart`] = feature.datasources.local;
    
    // Presentation layer
    if (stateManagement === 'riverpod') {
      files[`lib/features/${name}/presentation/providers/${name}_provider.dart`] = feature.presentation.provider;
      files[`lib/features/${name}/presentation/pages/${name}_page.dart`] = feature.presentation.page;
    } else if (stateManagement === 'bloc') {
      files[`lib/features/${name}/presentation/bloc/${name}_bloc.dart`] = feature.presentation.bloc;
      files[`lib/features/${name}/presentation/pages/${name}_page.dart`] = feature.presentation.page;
    } else {
      files[`lib/features/${name}/presentation/providers/${name}_provider.dart`] = feature.presentation.provider;
      files[`lib/features/${name}/presentation/pages/${name}_page.dart`] = feature.presentation.page;
    }
  });
  
  // Dependency injection
  if (includeDI) {
    files['lib/injection_container.dart'] = generateDIContainer(architecture.features, stateManagement);
  }
  
  // Main file
  files['lib/main.dart'] = generateMainFile(stateManagement);
  
  return files;
}

function generateDIContainer(features, stateManagement) {
  return `
import 'package:get_it/get_it.dart';
import 'package:dio/dio.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'core/network/api_client.dart';
import 'core/network/network_info.dart';

${features.map(f => `// ${capitalize(f.name)} imports
import 'features/${f.name}/data/datasources/${f.name}_local_datasource.dart';
import 'features/${f.name}/data/datasources/${f.name}_remote_datasource.dart';
import 'features/${f.name}/data/repositories/${f.name}_repository_impl.dart';
import 'features/${f.name}/domain/repositories/${f.name}_repository.dart';
import 'features/${f.name}/domain/usecases/get_all_${f.name}s.dart';
import 'features/${f.name}/domain/usecases/get_${f.name}.dart';
import 'features/${f.name}/domain/usecases/create_${f.name}.dart';`).join('\n')}

final sl = GetIt.instance;

Future<void> init() async {
  //! Features
${features.map(f => `  // ${capitalize(f.name)}
  _register${capitalize(f.name)}();`).join('\n')}
  
  //! Core
  sl.registerLazySingleton<NetworkInfo>(
    () => NetworkInfoImpl(sl()),
  );
  
  sl.registerLazySingleton<ApiClient>(
    () => ApiClient(baseUrl: 'https://api.example.com'),
  );
  
  //! External
  final sharedPreferences = await SharedPreferences.getInstance();
  sl.registerLazySingleton(() => sharedPreferences);
  sl.registerLazySingleton(() => Connectivity());
}

${features.map(f => `void _register${capitalize(f.name)}() {
  // Use cases
  sl.registerLazySingleton(() => GetAll${capitalize(f.name)}s(sl()));
  sl.registerLazySingleton(() => Get${capitalize(f.name)}(sl()));
  sl.registerLazySingleton(() => Create${capitalize(f.name)}(sl()));
  
  // Repository
  sl.registerLazySingleton<${capitalize(f.name)}Repository>(
    () => ${capitalize(f.name)}RepositoryImpl(
      remoteDataSource: sl(),
      localDataSource: sl(),
      networkInfo: sl(),
    ),
  );
  
  // Data sources
  sl.registerLazySingleton<${capitalize(f.name)}RemoteDataSource>(
    () => ${capitalize(f.name)}RemoteDataSourceImpl(apiClient: sl()),
  );
  
  sl.registerLazySingleton<${capitalize(f.name)}LocalDataSource>(
    () => ${capitalize(f.name)}LocalDataSourceImpl(sharedPreferences: sl()),
  );
}`).join('\n\n')}`;
}

function generateMainFile(stateManagement) {
  const imports = {
    riverpod: "import 'package:flutter_riverpod/flutter_riverpod.dart';",
    bloc: "import 'package:flutter_bloc/flutter_bloc.dart';",
    provider: "import 'package:provider/provider.dart';",
  };
  
  const wrappers = {
    riverpod: 'ProviderScope(child: MyApp())',
    bloc: 'MyApp()',
    provider: 'MyApp()',
  };
  
  return `
import 'package:flutter/material.dart';
${imports[stateManagement] || ''}
import 'injection_container.dart' as di;

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await di.init();
  runApp(${wrappers[stateManagement]});
}

class MyApp extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Clean Architecture App',
      theme: ThemeData(
        primarySwatch: Colors.blue,
        useMaterial3: true,
      ),
      home: const HomePage(),
    );
  }
}

class HomePage extends StatelessWidget {
  const HomePage({Key? key}) : super(key: key);
  
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Clean Architecture'),
      ),
      body: const Center(
        child: Text('Welcome to Clean Architecture'),
      ),
    );
  }
}`;
}

function generateTestStructure(architecture) {
  const tests = {
    structure: `
test/
├── core/
│   ├── network/
│   │   └── network_info_test.dart
│   └── fixtures/
│       └── fixture_reader.dart
├── features/
${architecture.features.map(f => `│   ├── ${f.name}/
│   │   ├── data/
│   │   │   ├── datasources/
│   │   │   │   ├── ${f.name}_local_datasource_test.dart
│   │   │   │   └── ${f.name}_remote_datasource_test.dart
│   │   │   ├── models/
│   │   │   │   └── ${f.name}_model_test.dart
│   │   │   └── repositories/
│   │   │       └── ${f.name}_repository_impl_test.dart
│   │   ├── domain/
│   │   │   └── usecases/
│   │   │       ├── get_all_${f.name}s_test.dart
│   │   │       └── get_${f.name}_test.dart
│   │   └── presentation/
│   │       └── pages/
│   │           └── ${f.name}_page_test.dart`).join('\n')}
└── fixtures/`,
    
    exampleTest: `
import 'package:flutter_test/flutter_test.dart';
import 'package:mockito/mockito.dart';
import 'package:dartz/dartz.dart';

// Example test for use case
void main() {
  late GetAllItems getAllItems;
  late MockItemRepository mockRepository;
  
  setUp(() {
    mockRepository = MockItemRepository();
    getAllItems = GetAllItems(mockRepository);
  });
  
  test('should get list of items from repository', () async {
    // arrange
    final tItems = [Item(id: '1', name: 'Test')];
    when(mockRepository.getAllItems())
        .thenAnswer((_) async => Right(tItems));
    
    // act
    final result = await getAllItems(NoParams());
    
    // assert
    expect(result, Right(tItems));
    verify(mockRepository.getAllItems());
    verifyNoMoreInteractions(mockRepository);
  });
}`,
  };
  
  return tests;
}

function generateArchitectureDocumentation(architecture) {
  return `
# Clean Architecture Documentation

## Overview
This project follows Clean Architecture principles with clear separation of concerns.

## Architecture Layers

### 1. Domain Layer (innermost)
- **Entities**: Core business objects
- **Use Cases**: Application-specific business rules
- **Repository Interfaces**: Contracts for data layer

### 2. Data Layer
- **Models**: Data transfer objects with serialization
- **Repository Implementations**: Concrete implementations
- **Data Sources**: Remote (API) and Local (Cache) sources

### 3. Presentation Layer (outermost)
- **Pages**: Screen widgets
- **Widgets**: Reusable UI components
- **State Management**: ${architecture.stateManagement}

## Dependency Rule
Dependencies point inward. Inner layers know nothing about outer layers.

## Data Flow
1. UI triggers an event/action
2. State management calls use case
3. Use case executes business logic
4. Repository fetches/stores data
5. Data flows back through layers
6. UI updates with new state

## Testing Strategy
- Unit tests for each layer
- Integration tests for critical paths
- Widget tests for UI components

## Best Practices
1. Keep frameworks and tools in outer layers
2. Use dependency injection
3. Program to interfaces, not implementations
4. Follow single responsibility principle
5. Write tests first (TDD)
`;
}

function generateSetupInstructions(projectName, stateManagement) {
  return `
# Setup Instructions for ${projectName}

1. Create new Flutter project:
   flutter create ${projectName}

2. Add dependencies to pubspec.yaml

3. Copy generated files to project

4. Run dependency injection setup:
   flutter pub run build_runner build --delete-conflicting-outputs

5. Configure API base URL in injection_container.dart

6. Run the app:
   flutter run

## State Management: ${stateManagement}
${getStateManagementSetup(stateManagement)}
`;
}

function getStateManagementSetup(stateManagement) {
  const setups = {
    riverpod: `
- Wrap app with ProviderScope
- Use ConsumerWidget for UI
- Access providers with ref.watch/read`,
    bloc: `
- Provide blocs with BlocProvider
- Use BlocBuilder for UI updates
- Dispatch events to trigger state changes`,
    provider: `
- Wrap app with MultiProvider
- Use Consumer or context.watch
- Call notifyListeners() for updates`,
  };
  
  return setups[stateManagement] || '';
}

function getSetupCommands(projectName) {
  return [
    `flutter create ${projectName}`,
    'cd ${projectName}',
    'flutter pub add equatable dartz dio connectivity_plus shared_preferences get_it',
    'flutter pub add flutter_riverpod riverpod_annotation',
    'flutter pub add dev:build_runner dev:mockito dev:flutter_test',
    'flutter pub get',
    'flutter pub run build_runner build --delete-conflicting-outputs',
  ];
}

function getCleanArchitectureBestPractices() {
  return [
    {
      principle: 'Dependency Rule',
      description: 'Source code dependencies must point only inward',
      example: 'Domain layer has no dependencies on outer layers',
    },
    {
      principle: 'Independence',
      description: 'Business logic is independent of UI, database, frameworks',
      example: 'Use cases dont know about Flutter widgets',
    },
    {
      principle: 'Testability',
      description: 'Business rules can be tested without UI, database, or external elements',
      example: 'Use cases tested with mock repositories',
    },
    {
      principle: 'Single Responsibility',
      description: 'Each class has one reason to change',
      example: 'Repository only handles data operations',
    },
    {
      principle: 'Abstraction',
      description: 'Depend on abstractions, not concretions',
      example: 'Use repository interfaces in use cases',
    },
  ];
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}