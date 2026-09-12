#!/bin/bash

# Mensaje por defecto si no se proporciona uno
MENSAJE=${1:-"Actualización automática (Registro)"}

echo "🚀 Iniciando sincronización con GitHub..."

# Agregar todos los cambios
git add .

# Realizar el commit
git commit -m "$MENSAJE"

# Subir a la rama principal
git push origin principal

echo "✅ Registro completado con éxito."
