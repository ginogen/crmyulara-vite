#!/bin/bash

# Asegurar que el directorio de componentes UI exista
mkdir -p dist/components/ui

# Copiar el componente Select
echo "Copiando componente Select..."
cp src/components/ui/Select.tsx dist/components/ui/

# Limpiar la caché
echo "Limpiando caché..."
rm -rf node_modules/.vite

# Ejecutar el build
echo "Ejecutando build..."
npm run build

echo "Build completado" 