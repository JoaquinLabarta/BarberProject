// ============================================================
// SERVIDOR PRINCIPAL EXPRESS
// ------------------------------------------------------------
// AQUÍ SE INICIA LA API Y SE SIRVE EL FRONTEND WEB.
// PARA LEVANTAR EL SERVIDOR:
// 1) Instala Node.js (https://nodejs.org)
// 2) En esta carpeta del proyecto, ejecuta:
//       npm install
//       npm start
// 3) Abre tu navegador en:
//       http://localhost:3000
// ============================================================

const express = require('express');
const cors = require('cors');
const path = require('path');

const { inicializarBaseDeDatos } = require('./db');
const CONFIG = require('./config');

// Rutas separadas por funcionalidad
const authRoutes = require('./routesAuth');
const appointmentsRoutes = require('./routesAppointments');
const barberRoutes = require('./routesBarber');

const app = express();

// ------------------------------------------------------------
// MIDDLEWARES GLOBALES
// ------------------------------------------------------------
app.use(cors());
app.use(express.json());

// ------------------------------------------------------------
// INICIALIZACIÓN DE BASE DE DATOS
// ------------------------------------------------------------
inicializarBaseDeDatos();

// ------------------------------------------------------------
// RUTAS DE API (BACKEND)
// ------------------------------------------------------------
app.use('/api/auth', authRoutes);
app.use('/api/turnos', appointmentsRoutes);
app.use('/api/barbero', barberRoutes);

// Ruta simple de prueba para comprobar que la API funciona
app.get('/api', (req, res) => {
  res.json({ mensaje: 'API de barbería funcionando correctamente.' });
});

// ------------------------------------------------------------
// SERVIR FRONTEND ESTÁTICO
// ------------------------------------------------------------
// AQUÍ SERVIMOS LOS ARCHIVOS HTML/CSS/JS DEL FRONTEND.
// Puedes cambiar la carpeta "frontend" si lo deseas.
const frontendPath = path.join(__dirname, '..', 'frontend');
app.use(express.static(frontendPath));

// Si alguien abre la raíz "/", devolvemos el index.html del frontend.
app.get('/', (req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// ------------------------------------------------------------
// INICIAR SERVIDOR
// ------------------------------------------------------------
app.listen(CONFIG.SERVER_PORT, () => {
  console.log(`Servidor de barbería escuchando en http://localhost:${CONFIG.SERVER_PORT}`);
});

