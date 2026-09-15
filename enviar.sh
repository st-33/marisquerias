#!/bin/bash
set -e

# Mensaje de commit recibido o valor por defecto
MENSAJE=${1:-"chore: actualizacion de trabajo y sincronizacion de ramas"}

echo "🔍 Verificando estado del repositorio..."

# Si no hay cambios en disco ni en stage, no commitear al pedo
if [ -z "$(git status --porcelain)" ]; then
  echo "ℹ️  No hay cambios pendientes para commitear."
else
  echo "📦 Agregando y confirmando cambios..."
  git add .
  git commit -m "$MENSAJE"
fi

echo "🚀 Sincronizando con GitHub (main)..."
git push origin main

echo "✅ Sincronización completa: main al día en la nube."

