#!/bin/bash

# Eliminar todos los archivos .d.ts para evitar el error TS6305
echo "Eliminando archivos .d.ts..."
find src -name "*.d.ts" -type f -delete || true

# Ejecutar la compilación sin emitir archivos .d.ts
echo "Compilando TypeScript..."
npx tsc --noEmit

# Construir el proyecto con Vite
echo "Construyendo con Vite..."
npx vite build 