# AI Gym Frontend - Docker & Kubernetes Deployment

Este documento explica cómo construir y desplegar la aplicación AI Gym Frontend usando Docker y Kubernetes.

## Arquitectura

La aplicación consiste en:
- **Frontend**: React/Vite application
- **Backend**: Supabase (serverless functions - no se incluyen en el contenedor)
- **Base de datos**: Supabase (externa)

## Construcción del Contenedor

### Construir la imagen Docker

```bash
# Construir la imagen
docker build -t ai-gym-frontend:latest .

# O con un tag específico
docker build -t your-registry/ai-gym-frontend:v1.0.0 .
```

### Ejecutar localmente con Docker Compose

```bash
# Ejecutar con docker-compose
docker-compose up -d

# La aplicación estará disponible en http://localhost:3000
```

### Ejecutar directamente con Docker

```bash
# Ejecutar el contenedor
docker run -p 3000:80 ai-gym-frontend:latest
```

## Despliegue en Kubernetes

### 1. Construir y subir la imagen

```bash
# Construir la imagen
docker build -t your-registry/ai-gym-frontend:v1.0.0 .

# Subir al registry
docker push your-registry/ai-gym-frontend:v1.0.0
```

### 2. Configurar el despliegue

Edita el archivo `k8s-deployment.yaml` y:
- Reemplaza `your-registry/ai-gym-frontend:latest` con tu imagen
- Reemplaza `your-domain.com` con tu dominio real
- Ajusta los recursos según tus necesidades

### 3. Desplegar en Kubernetes

```bash
# Aplicar el despliegue
kubectl apply -f k8s-deployment.yaml

# Verificar el estado
kubectl get pods
kubectl get services
kubectl get ingress
```

### 4. Escalado

```bash
# Escalar el despliegue
kubectl scale deployment ai-gym-frontend --replicas=5

# Auto-scaling (requiere metrics server)
kubectl autoscale deployment ai-gym-frontend --cpu-percent=70 --min=3 --max=10
```

## Configuración

### Variables de Entorno

La aplicación requiere las siguientes variables de entorno para funcionar correctamente. Todas las variables deben comenzar con `VITE_` para que Vite las incluya en el build.

#### Variables Obligatorias

**Supabase Configuration:**
- `VITE_SUPABASE_URL` - URL de tu proyecto Supabase (ej: `https://tu-proyecto.supabase.co`)
- `VITE_SUPABASE_ANON_KEY` - Clave anónima de Supabase (public key)

#### Variables de Build

**Build Configuration:**
- `BUILD_MODE` - Modo de construcción (`prod` para producción, omitir para desarrollo)
- `NODE_ENV` - Entorno de Node.js (`production`, `development`)

#### Variables Opcionales (para funcionalidades avanzadas)

**Monitoring y Observabilidad:**
- `REACT_APP_VERSION` - Versión de la aplicación (ej: `1.0.0`)
- `REACT_APP_JAEGER_ENDPOINT` - Endpoint para Jaeger tracing (ej: `http://jaeger-collector:14268/api/traces`)

**Error Reporting:**
- `REACT_APP_ERROR_REPORTING_ENDPOINT` - Endpoint para reportes de errores

#### Configuración de Variables de Entorno

**Para desarrollo local (.env.local):**
```bash
# Copia el archivo env-example.txt a .env.local
cp env-example.txt .env.local

# Edita .env.local con tus valores reales
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu_clave_anonima_aqui
```

**Archivo de ejemplo disponible:** `env-example.txt`

**Para Docker/Kubernetes:**
```bash
# Variables en docker-compose.yml
environment:
  - VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
  - VITE_SUPABASE_ANON_KEY=tu_clave_anonima_aqui
  - NODE_ENV=production
```

**Para Kubernetes (ConfigMap/Secret):**
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: ai-gym-config
data:
  VITE_SUPABASE_URL: "https://tu-proyecto.supabase.co"
  NODE_ENV: "production"
---
apiVersion: v1
kind: Secret
metadata:
  name: ai-gym-secrets
type: Opaque
data:
  # Base64 encoded values
  VITE_SUPABASE_ANON_KEY: "dHhfY2xhdmVfYW5vbmltYQ=="
```

**Importante:**
- Las variables `VITE_*` son incluidas en el bundle del frontend y son visibles en el navegador
- **Nunca pongas claves secretas o service keys en variables `VITE_*`**
- Las claves service role de Supabase solo deben usarse en el backend (funciones de Supabase)

### Nginx Configuration

El archivo `nginx.conf` incluye:
- Soporte para React Router (SPA routing)
- Compresión gzip
- Headers de seguridad básicos
- Cache optimizado para assets estáticos

## Monitoreo y Health Checks

La configuración incluye:
- **Liveness Probe**: Verifica que la aplicación responda
- **Readiness Probe**: Verifica que la aplicación esté lista para recibir tráfico
- **Health Check**: Para docker-compose

## Troubleshooting

### Logs del contenedor

```bash
# Ver logs en Docker
docker logs <container-id>

# Ver logs en Kubernetes
kubectl logs -f deployment/ai-gym-frontend
```

### Debug del contenedor

```bash
# Acceder al contenedor
kubectl exec -it <pod-name> -- /bin/sh

# Verificar archivos
ls -la /usr/share/nginx/html/
```

### Problemas comunes

1. **Error de build**: Asegúrate de que todos los archivos estén en el contexto correcto
2. **Error 404 en rutas**: Verifica la configuración de nginx para SPA routing
3. **Problemas de memoria**: Ajusta los límites de recursos en el deployment

## Optimizaciones

- **Multi-stage build**: Reduce el tamaño final de la imagen
- **Cache de capas**: Optimiza las reconstrucciones
- **Compresión**: Habilita gzip para mejor performance
- **CDN**: Considera usar un CDN para assets estáticos en producción

## Seguridad

- Ejecuta como usuario no-root en el contenedor
- Actualiza regularmente las imágenes base
- Usa secrets para configuración sensible
- Implementa network policies en Kubernetes
