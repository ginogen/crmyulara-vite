#!/bin/bash

# Limpiar directorios de build y caché
echo "Limpiando directorios..."
rm -rf dist
rm -rf node_modules/.vite
rm -rf .netlify/functions-serve

# Asegurar que los directorios existan
echo "Creando directorios..."
mkdir -p dist/components/ui/select

# Copiar los componentes UI
echo "Copiando componentes UI..."
cp -r src/components/ui/select/* dist/components/ui/select/
cp src/components/ui/Modal.tsx dist/components/ui/
cp src/components/ui/Breadcrumb.tsx dist/components/ui/

# Instalar dependencias si es necesario
echo "Verificando dependencias..."
npm install

# Ejecutar el build
echo "Ejecutando build..."
NODE_ENV=production npm run build

echo "Build completado" 