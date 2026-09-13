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

echo "🚀 Sincronizando con GitHub (rama-2 y main)..."
# 1. Subir rama de trabajo
git push origin rama-2

# 2. Replicar a main para Google AI Studio sin salir de rama-2
git checkout main
git merge rama-2 --ff-only
git push origin main
git checkout rama-2

echo "✅ Sincronización completa: rama-2 y main al día en GitHub."

