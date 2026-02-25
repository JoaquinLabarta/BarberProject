###############################################################
# Dockerfile - Barbería Turnos
# -------------------------------------------------------------
# Este contenedor levanta el backend Express y sirve el frontend.
# Base de datos SQLite queda en /app/data (montable con volumen).
###############################################################

FROM node:20

# Carpeta de trabajo dentro del contenedor
WORKDIR /app

# Copiamos package.json primero para aprovechar cache de Docker
COPY package.json ./

# Instalamos dependencias (producción)
RUN npm install --omit=dev

# Copiamos el resto del proyecto
COPY backend ./backend
COPY frontend ./frontend

# Carpeta de datos (SQLite)
RUN mkdir -p /app/data

# Puerto por defecto (coincide con backend/config.js)
EXPOSE 3000

# Variables recomendadas (puedes sobrescribir por docker-compose/.env)
ENV NODE_ENV=production
ENV PORT=3000
ENV DB_PATH=/app/data/barberia.db

# Arranque
CMD ["node", "backend/server.js"]

