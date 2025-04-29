#!/bin/bash

# Eliminar todos los archivos .d.ts para evitar el error TS6305
echo "Eliminando archivos .d.ts..."
find src -name "*.d.ts" -type f -delete || true

# Asegurarse de que el componente select se pueda importar correctamente
echo "Preparando el archivo select.tsx..."
mkdir -p dist/components/ui
cp src/components/ui/select.tsx dist/components/ui/select 2>/dev/null || true

# Ejecutar la compilación sin emitir archivos .d.ts
echo "Compilando TypeScript..."
npx tsc --noEmit

# Construir el proyecto con Vite
echo "Construyendo con Vite..."
npx vite build 