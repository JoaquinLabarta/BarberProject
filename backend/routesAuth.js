// ============================================================
// RUTAS DE AUTENTICACIÓN (REGISTRO Y LOGIN)
// ------------------------------------------------------------
// - Registro de clientes.
// - Inicio de sesión para barbero y clientes.
// ============================================================

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db } = require('./db');
const CONFIG = require('./config');

const router = express.Router();

// ------------------------------------------------------------
// REGISTRO DE CLIENTE
// ------------------------------------------------------------
// Espera en el body:
// - nombre
// - email
// - telefono
// - direccion
// - password
router.post('/registro', (req, res) => {
  const { nombre, email, telefono, direccion, password } = req.body;

  if (!nombre || !email || !telefono || !direccion || !password) {
    return res.status(400).json({ mensaje: 'Todos los campos son obligatorios.' });
  }

  const passwordHash = bcrypt.hashSync(password, 10);

  db.run(
    `
    INSERT INTO users (nombre, email, telefono, direccion, password_hash, role)
    VALUES (?, ?, ?, ?, ?, 'cliente')
  `,
    [nombre, email, telefono, direccion, passwordHash],
    function (err) {
      if (err) {
        if (err.code === 'SQLITE_CONSTRAINT') {
          return res.status(400).json({ mensaje: 'Ya existe un usuario con ese email.' });
        }
        console.error('Error registrando usuario:', err);
        return res.status(500).json({ mensaje: 'Error interno al registrar usuario.' });
      }

      return res.status(201).json({ mensaje: 'Cliente registrado con éxito.' });
    }
  );
});

// ------------------------------------------------------------
// LOGIN (BARBERO O CLIENTE)
// ------------------------------------------------------------
// Espera en el body:
// - email
// - password
router.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ mensaje: 'Email y contraseña son obligatorios.' });
  }

  db.get(`SELECT * FROM users WHERE email = ?`, [email], (err, user) => {
    if (err) {
      console.error('Error buscando usuario en login:', err);
      return res.status(500).json({ mensaje: 'Error interno.' });
    }
    if (!user) {
      return res.status(401).json({ mensaje: 'Credenciales inválidas.' });
    }

    const passwordOk = bcrypt.compareSync(password, user.password_hash);
    if (!passwordOk) {
      return res.status(401).json({ mensaje: 'Credenciales inválidas.' });
    }

    // Creamos token JWT con datos mínimos necesarios.
    const token = jwt.sign(
      {
        id: user.id,
        role: user.role,
        nombre: user.nombre,
        email: user.email
      },
      CONFIG.JWT_SECRET,
      { expiresIn: CONFIG.JWT_EXPIRATION }
    );

    return res.json({
      mensaje: 'Inicio de sesión exitoso.',
      token,
      usuario: {
        id: user.id,
        nombre: user.nombre,
        email: user.email,
        role: user.role
      }
    });
  });
});

module.exports = router;

