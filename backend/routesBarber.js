// ============================================================
// RUTAS PARA EL BARBERO
// ------------------------------------------------------------
// EL BARBERO PUEDE:
//  - definir/modificar su franja horaria diaria
//  - ver los turnos de un día
//  - marcar asistencia / no asistencia de cada turno
// ============================================================

const express = require('express');
const router = express.Router();

const { requireAuth, requireRole } = require('./middlewareAuth');
const { db } = require('./db');
const CONFIG = require('./config');

// Middleware combinado: requiere estar logueado y ser barbero.
const soloBarbero = [requireAuth, requireRole('barbero')];

// ------------------------------------------------------------
// DEFINIR O ACTUALIZAR HORARIO DEL BARBERO PARA UNA FECHA
// ------------------------------------------------------------
// POST /api/barbero/horario
// Body:
//  - date (YYYY-MM-DD)
//  - start_time (HH:MM)
//  - end_time (HH:MM)
//  - slot_duration_minutes (opcional, si no se envía se usa CONFIG.DURACION_TURNO_MINUTOS)
router.post('/horario', soloBarbero, (req, res) => {
  const { date, start_time, end_time, slot_duration_minutes } = req.body;

  if (!date || !start_time || !end_time) {
    return res
      .status(400)
      .json({ mensaje: 'Debe indicar fecha, hora de inicio y hora de fin.' });
  }

  const duracion = slot_duration_minutes || CONFIG.DURACION_TURNO_MINUTOS;

  const [hInicio, mInicio] = start_time.split(':').map(Number);
  const [hFin, mFin] = end_time.split(':').map(Number);
  const totalInicio = hInicio * 60 + mInicio;
  const totalFin = hFin * 60 + mFin;

  if (totalFin <= totalInicio) {
    return res
      .status(400)
      .json({ mensaje: 'La hora de fin debe ser mayor a la hora de inicio.' });
  }

  if ((totalFin - totalInicio) < duracion) {
    return res
      .status(400)
      .json({ mensaje: 'La franja debe ser al menos de la duración de un turno.' });
  }

  db.run(
    `
    INSERT INTO barber_schedules (date, start_time, end_time, slot_duration_minutes)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(date) DO UPDATE SET
      start_time = excluded.start_time,
      end_time = excluded.end_time,
      slot_duration_minutes = excluded.slot_duration_minutes
  `,
    [date, start_time, end_time, duracion],
    (err) => {
      if (err) {
        console.error('Error guardando horario del barbero:', err);
        return res.status(500).json({ mensaje: 'Error interno al guardar horario.' });
      }

      return res.json({
        mensaje: 'Horario guardado correctamente.',
        horario: { date, start_time, end_time, slot_duration_minutes: duracion }
      });
    }
  );
});

// ------------------------------------------------------------
// OBTENER HORARIO DEL BARBERO PARA UNA FECHA
// ------------------------------------------------------------
// GET /api/barbero/horario?date=YYYY-MM-DD
router.get('/horario', soloBarbero, (req, res) => {
  const { date } = req.query;

  if (!date) {
    return res.status(400).json({ mensaje: 'Debe indicar la fecha.' });
  }

  db.get(
    `SELECT * FROM barber_schedules WHERE date = ?`,
    [date],
    (err, schedule) => {
      if (err) {
        console.error('Error leyendo horario del barbero:', err);
        return res.status(500).json({ mensaje: 'Error interno al leer horario.' });
      }

      return res.json({ horario: schedule || null });
    }
  );
});

// ------------------------------------------------------------
// VER TURNOS DE UN DÍA (BARBERO)
// ------------------------------------------------------------
// GET /api/barbero/turnos?date=YYYY-MM-DD
router.get('/turnos', soloBarbero, (req, res) => {
  const { date } = req.query;

  if (!date) {
    return res.status(400).json({ mensaje: 'Debe indicar la fecha.' });
  }

  db.all(
    `
    SELECT a.*, u.nombre AS cliente_nombre, u.telefono AS cliente_telefono
    FROM appointments a
    JOIN users u ON a.client_id = u.id
    WHERE a.date = ?
    ORDER BY a.start_time ASC
  `,
    [date],
    (err, turnos) => {
      if (err) {
        console.error('Error leyendo turnos del día:', err);
        return res.status(500).json({ mensaje: 'Error interno al leer turnos.' });
      }

      return res.json({ fecha: date, turnos });
    }
  );
});

// ------------------------------------------------------------
// MARCAR ASISTENCIA DE UN TURNO
// ------------------------------------------------------------
// POST /api/barbero/turnos/:id/asistencia
// Body:
//  - estado: 'completado' | 'no_asistio'
router.post('/turnos/:id/asistencia', soloBarbero, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { estado } = req.body;

  if (!['completado', 'no_asistio'].includes(estado)) {
    return res.status(400).json({
      mensaje: "El estado debe ser 'completado' o 'no_asistio'."
    });
  }

  db.get(
    `SELECT * FROM appointments WHERE id = ?`,
    [id],
    (err, turno) => {
      if (err) {
        console.error('Error leyendo turno:', err);
        return res.status(500).json({ mensaje: 'Error interno.' });
      }

      if (!turno) {
        return res.status(404).json({ mensaje: 'Turno no encontrado.' });
      }

      db.run(
        `
        UPDATE appointments
        SET status = ?, actualizado_en = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
        [estado, id],
        (err2) => {
          if (err2) {
            console.error('Error actualizando estado de turno:', err2);
            return res
              .status(500)
              .json({ mensaje: 'Error interno al actualizar estado del turno.' });
          }

          return res.json({ mensaje: 'Estado de asistencia actualizado.' });
        }
      );
    }
  );
});

module.exports = router;

