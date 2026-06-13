#!/bin/bash
# Script de inicialização do bot (opcional, para Linux/Mac)
# No Windows, use: npm install e npm start

set -e

echo "╔════════════════════════════════════════════════════════════╗"
echo "║         🤖 Bot Staff Rivex - Inicializando                  ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Verificar se Node.js está instalado
if ! command -v node &> /dev/null; then
    echo "❌ Node.js não está instalado!"
    echo "Instale em: https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js encontrado: $(node --version)"
echo "✅ npm encontrado: $(npm --version)"
echo ""

# Verificar se package-lock.json existe (dependências já instaladas)
if [ ! -f "node_modules/discord.js/package.json" ]; then
    echo "📦 Instalando dependências..."
    npm install
    echo ""
fi

# Verificar se .env existe
if [ ! -f ".env" ]; then
    echo "⚠️  Arquivo .env não encontrado!"
    echo "📋 Criando .env a partir de .env.example..."
    cp .env.example .env
    echo "⚠️  Por favor, edite o arquivo .env com seus dados:"
    echo "   - DISCORD_TOKEN"
    echo "   - GUILD_ID"
    echo "   - IDs dos cargos"
    echo ""
    exit 1
fi

# Verificar se .env está preenchido
if grep -q "seu_token_aqui" .env; then
    echo "❌ Erro: Arquivo .env não está preenchido!"
    echo "📝 Por favor, edite o arquivo .env com seus dados"
    exit 1
fi

echo "╔════════════════════════════════════════════════════════════╗"
echo "║         🚀 Iniciando Bot Staff Rivex...                     ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Iniciar o bot
node index.js
