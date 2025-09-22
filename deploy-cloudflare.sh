#!/bin/bash

# AI GYM Frontend - Script de Deploy a Cloudflare Pages
# Automatiza el proceso de deployment

set -e  # Exit on any error

echo "🚀 AI GYM Frontend - Deploy to Cloudflare Pages"
echo "================================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo -e "${RED}❌ Error: Wrangler CLI no está instalado${NC}"
    echo -e "${YELLOW}💡 Instálalo con: npm install -g wrangler${NC}"
    exit 1
fi

# Check if pnpm is installed
if ! command -v pnpm &> /dev/null; then
    echo -e "${RED}❌ Error: pnpm no está instalado${NC}"
    echo -e "${YELLOW}💡 Instálalo con: npm install -g pnpm${NC}"
    exit 1
fi

# Environment selection
ENVIRONMENT=${1:-"production"}
echo -e "${BLUE}🔧 Deploying to: ${ENVIRONMENT}${NC}"

# Navigate to frontend directory
cd ai-gym-frontend/ai-gym-frontend

echo -e "${YELLOW}📦 Installing dependencies...${NC}"
pnpm install

echo -e "${YELLOW}🏗️  Building application...${NC}"
# Use the same build command that works locally and in Docker
sed -i.bak 's/"build": ".*"/"build": "vite build"/' package.json
pnpm run build

# Restore original package.json
mv package.json.bak package.json

# Go back to root directory
cd ../..

echo -e "${YELLOW}🌐 Deploying to Cloudflare Pages...${NC}"

# Deploy using wrangler
if [ "$ENVIRONMENT" = "production" ]; then
    wrangler pages deploy ai-gym-frontend/ai-gym-frontend/dist --project-name=aigym-frontend
elif [ "$ENVIRONMENT" = "staging" ]; then
    wrangler pages deploy ai-gym-frontend/ai-gym-frontend/dist --project-name=aigym-frontend-staging
else
    echo -e "${RED}❌ Environment debe ser 'production' o 'staging'${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Deploy completado exitosamente!${NC}"
echo -e "${BLUE}🌍 Tu aplicación estará disponible en:${NC}"

if [ "$ENVIRONMENT" = "production" ]; then
    echo -e "${GREEN}   Production: https://aigym-frontend.pages.dev${NC}"
else
    echo -e "${GREEN}   Staging: https://aigym-frontend-staging.pages.dev${NC}"
fi

echo ""
echo -e "${YELLOW}📝 Notas importantes:${NC}"
echo -e "   • Configura las variables de entorno en el dashboard de Cloudflare"
echo -e "   • VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY"
echo -e "   • Dashboard: https://dash.cloudflare.com/pages"
echo ""
