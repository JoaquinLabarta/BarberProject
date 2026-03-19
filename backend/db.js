// ============================================================
// CONEXIÓN Y CONFIGURACIÓN DE LA BASE DE DATOS SQLITE
// ------------------------------------------------------------
// AQUÍ SE CREAN LAS TABLAS NECESARIAS Y SE DEFINE LA CONEXIÓN.
// SI QUIERES AÑADIR NUEVAS TABLAS EN EL FUTURO, HAZLO AQUÍ.
// ============================================================

const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const CONFIG = require('./config');

// Nos aseguramos de que exista la carpeta "data" donde se guardará el .db
const dataDir = path.dirname(CONFIG.DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Creamos/abrimos la base de datos SQLite.
const db = new sqlite3.Database(CONFIG.DB_PATH);

// Función para inicializar las tablas.
function inicializarBaseDeDatos() {
  db.serialize(() => {
    // --------------------------------------------------------
    // TABLA DE USUARIOS
    // --------------------------------------------------------
    // Campos principales:
    // - role: 'barbero' o 'cliente'
    // - email: se usa para iniciar sesión (único)
    // - password_hash: contraseña encriptada
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        telefono TEXT NOT NULL,
        direccion TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('barbero', 'cliente')),
        creado_en DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // --------------------------------------------------------
    // TABLA DE TURNOS
    // --------------------------------------------------------
    // Representa los turnos tomados por los clientes.
    // - date: fecha del turno (YYYY-MM-DD)
    // - start_time / end_time: hora de inicio/fin (HH:MM)
    // - status: 'programado', 'completado', 'no_asistio', 'cancelado_cliente'
    db.run(`
      CREATE TABLE IF NOT EXISTS appointments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_id INTEGER NOT NULL,
        date TEXT NOT NULL,
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('programado', 'completado', 'no_asistio', 'cancelado_cliente')),
        creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
        actualizado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (client_id) REFERENCES users(id)
      )
    `);

    // --------------------------------------------------------
    // TABLA DE HORARIOS DEL BARBERO
    // --------------------------------------------------------
    // Aquí se guarda la franja horaria disponible para cada día.
    // Por simplicidad, 1 fila por día:
    // - date: fecha (YYYY-MM-DD)
    // - start_time / end_time: franja disponible
    // - slot_duration_minutes: duración de cada turno generado
    db.run(`
      CREATE TABLE IF NOT EXISTS barber_schedules (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL UNIQUE,
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        slot_duration_minutes INTEGER NOT NULL
      )
    `);

    // --------------------------------------------------------
    // USUARIO BARBERO POR DEFECTO
    // --------------------------------------------------------
    // Creamos un barbero inicial si no existe ninguno.
    // PUEDES CAMBIAR ESTOS DATOS O ELIMINAR ESTE BLOQUE SI PREFIERES
    // CREAR EL BARBERO DESDE OTRO LADO.
    const bcrypt = require('bcryptjs');
    const passwordPorDefecto = 'npoblete1'; // <-- CAMBIA ESTA CONTRASEÑA LUEGO
    const passwordHash = bcrypt.hashSync(passwordPorDefecto, 10);

    db.get(`SELECT COUNT(*) AS count FROM users WHERE role = 'barbero'`, [], (err, row) => {
      if (err) {
        console.error('Error comprobando barbero por defecto:', err);
        return;
      }
      if (row.count === 0) {
        db.run(
          `
          INSERT INTO users (nombre, email, telefono, direccion, password_hash, role)
          VALUES (?, ?, ?, ?, ?, 'barbero')
        `,
          [
            'Nicolas',
            'nicopoblete@gmail.com',
            '5492215942001',
            'Calle 56 y 6',
            passwordHash
          ],
          (insertErr) => {
            if (insertErr) {
              console.error('Error creando barbero por defecto:', insertErr);
            } else {
              console.log('Barbero por defecto creado: email=barbero@barberia.com, password=barbero123');
              console.log('POR SEGURIDAD, CAMBIA ESTOS DATOS EN LA BASE O EN EL CÓDIGO.');
            }
          }
        );
      }
    });
  });
}

module.exports = {
  db,
  inicializarBaseDeDatos
};

