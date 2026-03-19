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
const frontendPath = path.join(__dirname, '..', 'frontend');
// Esto dejalo así asumiendo que tus archivos CSS y JS siguen dentro de /frontend
app.use('/frontend', express.static(frontendPath));

// Si alguien abre la raíz "/", devolvemos el index.html que ahora está en la raíz.
app.get('/', (req, res) => {
  // ACÁ ESTÁ EL CAMBIO: sube un nivel (..) y busca el index.html directamente
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// ------------------------------------------------------------
// INICIAR SERVIDOR
// ------------------------------------------------------------
app.listen(CONFIG.SERVER_PORT, () => {
  console.log(`Servidor de barbería escuchando en http://localhost:${CONFIG.SERVER_PORT}`);
});

