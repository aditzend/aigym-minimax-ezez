# 🌐 AI GYM - Deploy a Cloudflare Pages

Guía completa para desplegar la aplicación AI GYM Frontend en Cloudflare Pages.

## 📋 Prerequisitos

### 1. Instalar Wrangler CLI
```bash
npm install -g wrangler
```

### 2. Autenticarse con Cloudflare
```bash
wrangler auth login
```

### 3. Verificar configuración
```bash
wrangler whoami
```

## 🚀 Métodos de Deploy

### Método 1: Script Automático (Recomendado)
```bash
# Deploy a producción
./deploy-cloudflare.sh production

# Deploy a staging
./deploy-cloudflare.sh staging
```

### Método 2: Wrangler Manual
```bash
# Construir la aplicación
cd ai-gym-frontend/ai-gym-frontend
pnpm install
pnpm run build

# Deploy con wrangler
cd ../..
wrangler pages deploy ai-gym-frontend/ai-gym-frontend/dist --project-name=aigym-frontend
```

### Método 3: GitHub Actions (Deploy Automático)
El deploy se ejecuta automáticamente en:
- **Production:** Push a `main` o `master`
- **Staging:** Push a `develop` o `staging`
- **Manual:** Usando workflow_dispatch

## ⚙️ Configuración de Variables de Entorno

### En Cloudflare Dashboard:
1. Ve a [Cloudflare Pages Dashboard](https://dash.cloudflare.com/pages)
2. Selecciona tu proyecto `aigym-frontend`
3. Ve a **Settings** > **Environment variables**
4. Agrega las siguientes variables:

#### Production Environment:
```
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-clave-anonima-de-supabase
NODE_VERSION=18
```

#### Preview/Staging Environment:
```
VITE_SUPABASE_URL=https://tu-proyecto-staging.supabase.co
VITE_SUPABASE_ANON_KEY=tu-clave-staging-de-supabase
NODE_VERSION=18
```

### En GitHub Secrets (para GitHub Actions):
1. Ve a tu repositorio en GitHub
2. **Settings** > **Secrets and variables** > **Actions**
3. Agrega estos secrets:

```
CLOUDFLARE_API_TOKEN=tu-cloudflare-api-token
CLOUDFLARE_ACCOUNT_ID=tu-cloudflare-account-id
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-clave-anonima-de-supabase
```

## 🔧 Configuración de Build

### Build Settings en Cloudflare:
- **Build command:** `cd ai-gym-frontend/ai-gym-frontend && pnpm install && pnpm run build`
- **Build output directory:** `ai-gym-frontend/ai-gym-frontend/dist`
- **Root directory:** `.` (raíz del repositorio)
- **Node.js version:** `18`

### Framework Detection:
Cloudflare debería detectar automáticamente que es una aplicación **Vite** basada en:
- Presencia de `vite.config.ts`
- Script `"build": "vite build"` en package.json

## 🌍 URLs de Deploy

Una vez desplegado, tu aplicación estará disponible en:

### Producción:
- **Cloudflare URL:** `https://aigym-frontend.pages.dev`
- **Custom Domain:** `https://aigym.your-domain.com` (si configurado)

### Staging:
- **Cloudflare URL:** `https://aigym-frontend-staging.pages.dev`
- **Custom Domain:** `https://staging.aigym.your-domain.com` (si configurado)

## 🛠️ Troubleshooting

### Error: "Build failed"
1. Verifica que las variables de entorno estén configuradas
2. Asegúrate de que `pnpm` esté disponible en el build
3. Revisa los logs de build en Cloudflare dashboard

### Error: "Module not found"
- Confirma que todos los archivos `src/lib/*` están en el repositorio
- Verifica que las dependencias estén en `package.json`

### Error: "Page not found" (404 en routes)
- Confirma que el redirect `/* -> /index.html` esté configurado
- Verifica que `wrangler.toml` tenga las reglas de redirect

### Error: "Environment variables not working"
- Variables deben empezar con `VITE_` para ser accesibles en el frontend
- Asegúrate de configurarlas tanto en build como en runtime

## 🔒 Configuración de Dominio Personalizado

### 1. En Cloudflare Dashboard:
1. Ve a tu proyecto Pages
2. **Custom domains** > **Set up a custom domain**
3. Ingresa tu dominio: `aigym.your-domain.com`
4. Sigue las instrucciones para configurar DNS

### 2. Actualizar wrangler.toml:
```toml
[custom_domains]
aigym.your-domain.com = true
```

## 📈 Monitoreo y Analytics

### Cloudflare Analytics:
- Ve a **Analytics** en tu dashboard Pages
- Monitorea requests, bandwidth, y errores
- Configura alertas para downtime

### Performance:
- Cloudflare optimiza automáticamente CSS/JS
- CDN global para latencia mínima
- Cache automático de assets estáticos

## 🚀 Deploy de Actualizaciones

### Deploy Automático (GitHub Actions):
- Simplemente haz push a `main` para producción
- Push a `develop` para staging

### Deploy Manual:
```bash
# Actualizar código
git pull origin main

# Deploy
./deploy-cloudflare.sh production
```

## 📝 Notas Importantes

1. **Build Time:** ~2-5 minutos típicamente
2. **Cache:** Los assets se cachean automáticamente
3. **SSL:** HTTPS habilitado automáticamente
4. **Global CDN:** Disponible en 200+ ubicaciones
5. **Rollback:** Fácil rollback a versiones anteriores en dashboard

¡Tu aplicación AI GYM estará live en minutos! 🎉
