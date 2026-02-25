// ============================================================
// CONFIGURACIÓN GENERAL DEL SISTEMA DE BARBERÍA
// ------------------------------------------------------------
// TODO LO QUE QUIERAS CAMBIAR A FUTURO (duración de turnos,
// reglas, textos de pago, etc.) INTENTA CENTRALIZARLO AQUÍ.
// ============================================================

// Carga variables de entorno desde un archivo .env si existe
// (útil fuera de Docker; en Docker normalmente se pasan por environment).
require('dotenv').config();
const path = require('path');

const CONFIG = {
  // ----------------------------------------------------------
  // PARÁMETROS DE NEGOCIO
  // ----------------------------------------------------------

  // Duración por defecto de un turno (en minutos).
  // PUEDES CAMBIAR ESTE VALOR SIN ROMPER EL RESTO DEL CÓDIGO.
  // También puedes definirlo por variable de entorno:
  // - DURACION_TURNO_MINUTOS=60
  DURACION_TURNO_MINUTOS: Number(process.env.DURACION_TURNO_MINUTOS || 60),

  // Horas mínimas de anticipación para permitir cancelación.
  // En tu caso es 1 hora, pero puedes modificarlo después.
  // También puedes definirlo por variable de entorno:
  // - HORAS_MINIMAS_CANCELACION=1
  HORAS_MINIMAS_CANCELACION: Number(process.env.HORAS_MINIMAS_CANCELACION || 1),

  // Mensaje que se muestra al cliente al sacar un turno
  // explicando que el pago es solo en efectivo presencial.
  // Puedes cambiar el texto libremente.
  // También puedes definirlo por variable de entorno:
  // - MENSAJE_PAGO_EFECTIVO="..."
  MENSAJE_PAGO_EFECTIVO:
    process.env.MENSAJE_PAGO_EFECTIVO ||
    'El pago del servicio se realiza únicamente en efectivo y de forma presencial en la barbería.',

  // Zona horaria de referencia (solo informativa en este código).
  // Asumimos que el servidor corre en Argentina (UTC-3).
  ZONA_HORARIA: process.env.ZONA_HORARIA || 'America/Argentina/Buenos_Aires',

  // ----------------------------------------------------------
  // CONFIGURACIÓN DE AUTENTICACIÓN (JWT)
  // ----------------------------------------------------------

  // CLAVE SECRETA PARA FIRMAR TOKENS JWT
  // IMPORTANTE: EN PRODUCCIÓN CAMBIA ESTE VALOR POR UNO SEGURO.
  // En Docker/producción DEBERÍAS pasar esto por variable de entorno.
  // - JWT_SECRET="tu_clave_larga_y_segura"
  JWT_SECRET: process.env.JWT_SECRET || 'CAMBIA_ESTA_CLAVE_SECRETA_EN_PRODUCCION',

  // Tiempo de expiración de los tokens (formato JWT, por ej. "7d").
  JWT_EXPIRATION: process.env.JWT_EXPIRATION || '7d',

  // ----------------------------------------------------------
  // BASE DE DATOS SQLITE
  // ----------------------------------------------------------

  // Ruta al archivo de base de datos SQLite.
  // Si quieres moverla a otra carpeta, cambia aquí.
  // También puedes definirlo por variable de entorno:
  // - DB_PATH=/app/data/barberia.db
  DB_PATH: process.env.DB_PATH || path.join(__dirname, '..', 'data', 'barberia.db'),

  // ----------------------------------------------------------
  // CONFIGURACIÓN DEL SERVIDOR HTTP
  // ----------------------------------------------------------

  // Puerto en el que se levantará el servidor Express.
  SERVER_PORT: Number(process.env.PORT || 3000)
};

module.exports = CONFIG;

