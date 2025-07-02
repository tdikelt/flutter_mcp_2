# 🚀 Guía Rápida para Probar Flutter MCP Service en Local

## Opción 1: Prueba Directa (Más Rápido)

### 1. Instalar Dependencias
```bash
cd /Users/david/Desktop/flutter_mcp/flutter_mcp_service
npm install
```

### 2. Inicializar el Caché
```bash
mkdir -p .cache
```

### 3. Probar las Herramientas Directamente
```bash
# Probar el health check
npm run health-check

# Ejecutar el servicio en modo desarrollo
npm run dev
```

### 4. Probar Herramientas Individuales
```bash
# Ejecutar el script de pruebas
node test-all-tools.js
```

## Opción 2: Configurar con Claude Desktop

### 1. Localizar el archivo de configuración de Claude Desktop

En macOS, el archivo está en:
```bash
~/Library/Application Support/Claude/claude_desktop_config.json
```

### 2. Editar la configuración

Abre el archivo y agrega tu servicio MCP:

```json
{
  "mcpServers": {
    "flutter-mcp": {
      "command": "node",
      "args": ["/Users/david/Desktop/flutter_mcp/flutter_mcp_service/src/index.js"]
    }
  }
}
```

### 3. Reiniciar Claude Desktop

Cierra completamente Claude Desktop y vuelve a abrirlo.

### 4. Verificar la conexión

En Claude, escribe:
```
Can you use the flutter_status tool to check the MCP service?
```

## Opción 3: Prueba con Docker

### 1. Construir la imagen
```bash
cd /Users/david/Desktop/flutter_mcp/flutter_mcp_service
npm run build:docker
```

### 2. Ejecutar con docker-compose
```bash
npm run docker:run
```

## Opción 4: Prueba Manual de Herramientas

### 1. Crear un script de prueba
```bash
cd /Users/david/Desktop/flutter_mcp/flutter_mcp_service
```

Crea un archivo `test-manual.js`:

```javascript
import { flutterSearch, flutterAnalyze, flutterStatus } from './src/tools/unifiedTools.js';

async function testTools() {
  console.log('🧪 Probando Flutter MCP Service v2.0\n');

  // Test 1: Status
  console.log('1️⃣ Probando flutter_status...');
  const status = await flutterStatus({});
  console.log('Resultado:', JSON.stringify(JSON.parse(status.content[0].text), null, 2));

  // Test 2: Search
  console.log('\n2️⃣ Probando flutter_search...');
  const search = await flutterSearch({
    query: 'Container',
    limit: 3
  });
  console.log('Resultado:', search.content[0].text);

  // Test 3: Analyze
  console.log('\n3️⃣ Probando flutter_analyze...');
  const analysis = await flutterAnalyze({
    identifier: 'Container',
    code: `
Container(
  width: 100,
  height: 100,
  color: Colors.blue,
  child: Text('Hello'),
)
    `,
    topic: 'all'
  });
  console.log('Resultado:', analysis.content[0].text);
}

testTools().catch(console.error);
```

### 2. Ejecutar el script
```bash
node test-manual.js
```

## Comandos Útiles para Debugging

### Ver logs en tiempo real
```bash
# En una terminal
npm run dev

# En otra terminal, ejecutar pruebas
node test-all-tools.js
```

### Limpiar caché si hay problemas
```bash
rm -rf .cache
mkdir .cache
```

### Verificar instalación
```bash
# Verificar Node.js (debe ser 18+)
node --version

# Verificar que todas las dependencias estén instaladas
npm list

# Ver estado del caché
ls -la .cache/
```

## Probar Herramientas Legacy

```javascript
// test-legacy.js
import { analyzeWidget } from './src/tools/widgetAnalyzer.js';

async function testLegacy() {
  const result = await analyzeWidget({
    widgetCode: `
class MyWidget extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      child: Column(
        children: [
          Text('Hello'),
          Text('World'),
        ],
      ),
    );
  }
}
    `,
    checkAccessibility: true,
    checkPerformance: true
  });

  console.log(JSON.parse(result.content[0].text));
}

testLegacy().catch(console.error);
```

## Solución de Problemas Comunes

### Error: Cannot find module
```bash
# Reinstalar dependencias
rm -rf node_modules package-lock.json
npm install
```

### Error: SQLITE_CANTOPEN
```bash
# Crear directorio de caché
mkdir -p .cache
chmod 755 .cache
```

### Error: Port already in use
```bash
# Matar procesos Node.js
killall node
```

## Próximos Pasos

1. **Integrar con tu IDE**: Configura VS Code o tu editor favorito
2. **Personalizar**: Ajusta TTLs y configuraciones en `.env`
3. **Monitorear**: Usa `flutter_status` regularmente para ver estadísticas
4. **Contribuir**: Agrega nuevas herramientas según tus necesidades

¡Listo! Tu servidor MCP Flutter está funcionando localmente 🎉