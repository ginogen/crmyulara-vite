#!/bin/bash

# Limpiar directorios de build y caché
echo "Limpiando directorios..."
rm -rf dist
rm -rf node_modules/.vite
rm -rf .netlify/functions-serve

# Asegurar que el directorio de componentes UI exista
mkdir -p dist/components/ui

# Copiar el componente Select
echo "Copiando componente Select..."
cp src/components/ui/Select.tsx dist/components/ui/

# Instalar dependencias si es necesario
echo "Verificando dependencias..."
npm install

# Ejecutar el build
echo "Ejecutando build..."
NODE_ENV=production npm run build

echo "Build completado" 