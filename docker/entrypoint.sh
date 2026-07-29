#!/bin/sh
set -e

echo "[entrypoint] Aplicando migrations Prisma..."
npx prisma migrate deploy

echo "[entrypoint] Iniciando shopee-offers na porta ${PORT:-3000}..."
exec node dist/server.js
