// ============================================================
// RUTAS DE TURNOS (APPOINTMENTS)
// ------------------------------------------------------------
// AQUÍ SE IMPLEMENTA:
//  - obtención de turnos disponibles según horario del barbero
//  - reserva de turno (máximo 1 activo por cliente)
//  - cancelación con 1h de anticipación (configurable)
//  - historial de turnos del cliente
// ============================================================

const express = require('express');
const router = express.Router();

const { requireAuth } = require('./middlewareAuth');
const { db } = require('./db');
const CONFIG = require('./config');

// ------------------------------------------------------------
// FUNCIONES AUXILIARES DE FECHA/HORA
// ------------------------------------------------------------

// Convierte "HH:MM" a minutos desde las 00:00.
function horaATotalMinutos(horaStr) {
  const [h, m] = horaStr.split(':').map(Number);
  return h * 60 + m;
}

// Convierte minutos desde las 00:00 a string "HH:MM".
function minutosAHoraStr(totalMinutos) {
  const h = String(Math.floor(totalMinutos / 60)).padStart(2, '0');
  const m = String(totalMinutos % 60).padStart(2, '0');
  return `${h}:${m}`;
}

/// Une fecha "YYYY-MM-DD" y hora "HH:MM" a un objeto Date usando la zona horaria local
// del servidor (evita interpretar el string como UTC).
function combinarFechaHora(dateStr, timeStr) {
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hour, minute] = timeStr.split(':').map(Number);
  return new Date(year, month - 1, day, hour || 0, minute || 0, 0, 0);
}

// ------------------------------------------------------------
// OBTENER TURNOS DISPONIBLES PARA UNA FECHA
// ------------------------------------------------------------
// GET /api/turnos/disponibles?date=YYYY-MM-DD
// - Usa la tabla barber_schedules para esa fecha.
// - Genera intervalos de duración slot_duration_minutes.
// - Excluye los que ya están reservados (status = 'programado').
// - Excluye horarios en el pasado (respecto a la hora actual).
router.get('/disponibles', requireAuth, (req, res) => {
  const { date } = req.query;

  if (!date) {
    return res.status(400).json({ mensaje: 'Debe indicar la fecha (date=YYYY-MM-DD).' });
  }

  // Obtenemos el horario configurado del barbero para esa fecha.
  db.get(
    `SELECT * FROM barber_schedules WHERE date = ?`,
    [date],
    (err, schedule) => {
      if (err) {
        console.error('Error leyendo horario del barbero:', err);
        return res.status(500).json({ mensaje: 'Error interno al leer horarios.' });
      }

      if (!schedule) {
        // No hay horario cargado para ese día.
        return res.json({ fecha: date, disponibles: [] });
      }

      const inicioMin = horaATotalMinutos(schedule.start_time);
      const finMin = horaATotalMinutos(schedule.end_time);
      const duracion =
        schedule.slot_duration_minutes || CONFIG.DURACION_TURNO_MINUTOS;

      const ahora = new Date();
      ahora.setMinutes(ahora.getMinutes() - 5);

      // Obtenemos los turnos ya reservados ese día.
      db.all(
        `
        SELECT start_time FROM appointments
        WHERE date = ? AND status = 'programado'
      `,
        [date],
        (err2, filas) => {
          if (err2) {
            console.error('Error leyendo turnos existentes:', err2);
            return res.status(500).json({ mensaje: 'Error interno al leer turnos.' });
          }

          const ocupados = new Set(filas.map((f) => f.start_time));
          const disponibles = [];

          for (let t = inicioMin; t + duracion <= finMin; t += duracion) {
            const horaInicioStr = minutosAHoraStr(t);
          
            if (ocupados.has(horaInicioStr)) {
              continue;
            }
          
            // Saltamos horarios en el pasado usando nuestra variable 'ahora' modificada.
            const fechaHoraTurno = combinarFechaHora(date, horaInicioStr);
            if (fechaHoraTurno <= ahora) {
              continue;
            }
          
            disponibles.push({
              date,
              start_time: horaInicioStr,
              end_time: minutosAHoraStr(t + duracion)
            });
          }

          return res.json({ fecha: date, disponibles });
        }
      );
    }
  );
});

// ------------------------------------------------------------
// RESERVAR UN TURNO (CLIENTE)
// ------------------------------------------------------------
// POST /api/turnos/reservar
// Body:
//  - date (YYYY-MM-DD)
//  - start_time (HH:MM)
// REGLAS:
//  - Solo rol 'cliente'.
//  - Máximo 1 turno con status 'programado' por cliente.
router.post('/reservar', requireAuth, (req, res) => {
  if (req.user.role !== 'cliente') {
    return res.status(403).json({ mensaje: 'Solo los clientes pueden reservar turnos.' });
  }

  const { date, start_time } = req.body;

  if (!date || !start_time) {
    return res.status(400).json({ mensaje: 'Debe indicar fecha y hora de inicio.' });
  }

  const ahora = new Date();
  ahora.setMinutes(ahora.getMinutes() - 5); // Le damos 5 minutos de tolerancia para reservar el turno actual
  const fechaHoraTurno = combinarFechaHora(date, start_time);

  if (fechaHoraTurno <= ahora) {
    return res.status(400).json({ mensaje: 'El horario seleccionado ya no está disponible.' });
  }

  // 1) Verificamos que el cliente no tenga ya un turno programado.
  db.get(
    `
    SELECT COUNT(*) AS count
    FROM appointments
    WHERE client_id = ? AND status = 'programado'
  `,
    [req.user.id],
    (err, row) => {
      if (err) {
        console.error('Error comprobando turnos activos del cliente:', err);
        return res.status(500).json({ mensaje: 'Error interno.' });
      }

      if (row.count > 0) {
        return res.status(400).json({
          mensaje:
            'Ya tienes un turno confirmado. Debes cancelarlo (con la anticipación requerida) antes de reservar otro.'
        });
      }

      // 2) Obtenemos el horario del barbero para esa fecha.
      db.get(
        `SELECT * FROM barber_schedules WHERE date = ?`,
        [date],
        (err2, schedule) => {
          if (err2) {
            console.error('Error leyendo horario del barbero:', err2);
            return res.status(500).json({ mensaje: 'Error interno al leer horarios.' });
          }

          if (!schedule) {
            return res
              .status(400)
              .json({ mensaje: 'No hay horario disponible para ese día.' });
          }

          const duracion =
            schedule.slot_duration_minutes || CONFIG.DURACION_TURNO_MINUTOS;

          // 3) Comprobamos que la hora esté dentro de la franja.
          const inicioMin = horaATotalMinutos(schedule.start_time);
          const finMin = horaATotalMinutos(schedule.end_time);
          const inicioSolicitado = horaATotalMinutos(start_time);
          const finSolicitado = inicioSolicitado + duracion;

          if (
            inicioSolicitado < inicioMin ||
            finSolicitado > finMin ||
            (inicioSolicitado - inicioMin) % duracion !== 0
          ) {
            return res.status(400).json({
              mensaje:
                'La hora seleccionada no coincide con un turno disponible de la franja horaria.'
            });
          }

          // 4) Verificamos que ese horario no esté ya ocupado.
          db.get(
            `
            SELECT * FROM appointments
            WHERE date = ? AND start_time = ? AND status = 'programado'
          `,
            [date, start_time],
            (err3, existing) => {
              if (err3) {
                console.error('Error comprobando turno existente:', err3);
                return res
                  .status(500)
                  .json({ mensaje: 'Error interno al validar turno.' });
              }

              if (existing) {
                return res
                  .status(400)
                  .json({ mensaje: 'Ese horario ya fue reservado por otro cliente.' });
              }

              const end_time = minutosAHoraStr(finSolicitado);

              // 5) Insertamos el turno.
              db.run(
                `
                INSERT INTO appointments (client_id, date, start_time, end_time, status)
                VALUES (?, ?, ?, ?, 'programado')
              `,
                [req.user.id, date, start_time, end_time],
                function (err4) {
                  if (err4) {
                    console.error('Error creando turno:', err4);
                    return res
                      .status(500)
                      .json({ mensaje: 'Error interno al crear el turno.' });
                  }

                  return res.status(201).json({
                    mensaje: 'Turno reservado con éxito.',
                    turno: {
                      id: this.lastID,
                      client_id: req.user.id,
                      date,
                      start_time,
                      end_time,
                      status: 'programado'
                    },
                    pago: CONFIG.MENSAJE_PAGO_EFECTIVO
                  });
                }
              );
            }
          );
        }
      );
    }
  );
});

// ------------------------------------------------------------
// CANCELAR TURNO (CLIENTE)
// ------------------------------------------------------------
// POST /api/turnos/cancelar/:id
// REGLAS:
//  - Solo el cliente dueño del turno puede cancelarlo.
//  - Solo si falta al menos HORAS_MINIMAS_CANCELACION.
router.post('/cancelar/:id', requireAuth, (req, res) => {
  if (req.user.role !== 'cliente') {
    return res
      .status(403)
      .json({ mensaje: 'Solo los clientes pueden cancelar sus turnos.' });
  }

  const id = parseInt(req.params.id, 10);

  db.get(
    `
    SELECT * FROM appointments
    WHERE id = ? AND client_id = ?
  `,
    [id, req.user.id],
    (err, turno) => {
      if (err) {
        console.error('Error leyendo turno para cancelar:', err);
        return res.status(500).json({ mensaje: 'Error interno.' });
      }

      if (!turno) {
        return res.status(404).json({ mensaje: 'Turno no encontrado.' });
      }

      if (turno.status !== 'programado') {
        return res
          .status(400)
          .json({ mensaje: 'Solo se pueden cancelar turnos programados.' });
      }

      const ahora = new Date();
      const fechaHoraTurno = combinarFechaHora(turno.date, turno.start_time);

      const diffMs = fechaHoraTurno - ahora;
      const diffHoras = diffMs / (1000 * 60 * 60);

      if (diffHoras < CONFIG.HORAS_MINIMAS_CANCELACION) {
        return res.status(400).json({
          mensaje: `Solo se puede cancelar el turno con al menos ${CONFIG.HORAS_MINIMAS_CANCELACION} hora(s) de anticipación.`
        });
      }

      db.run(
        `
        UPDATE appointments
        SET status = 'cancelado_cliente',
            actualizado_en = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
        [id],
        (err2) => {
          if (err2) {
            console.error('Error cancelando turno:', err2);
            return res.status(500).json({ mensaje: 'Error interno al cancelar turno.' });
          }

          return res.json({ mensaje: 'Turno cancelado correctamente.' });
        }
      );
    }
  );
});

// ------------------------------------------------------------
// OBTENER TURNO ACTUAL / PRÓXIMO DEL CLIENTE
// ------------------------------------------------------------
// GET /api/turnos/mi-proximo
router.get('/mi-proximo', requireAuth, (req, res) => {
  if (req.user.role !== 'cliente') {
    return res
      .status(403)
      .json({ mensaje: 'Solo los clientes pueden consultar su próximo turno.' });
  }

  db.get(
    `
    SELECT *
    FROM appointments
    WHERE client_id = ? AND status = 'programado'
    ORDER BY date ASC, start_time ASC
    LIMIT 1
  `,
    [req.user.id],
    (err, turno) => {
      if (err) {
        console.error('Error leyendo próximo turno:', err);
        return res.status(500).json({ mensaje: 'Error interno.' });
      }

      return res.json({ turno });
    }
  );
});

// ------------------------------------------------------------
// HISTORIAL DE TURNOS DEL CLIENTE
// ------------------------------------------------------------
// GET /api/turnos/historial
router.get('/historial', requireAuth, (req, res) => {
  if (req.user.role !== 'cliente') {
    return res
      .status(403)
      .json({ mensaje: 'Solo los clientes pueden ver su historial.' });
  }

  db.all(
    `
    SELECT *
    FROM appointments
    WHERE client_id = ?
    ORDER BY date DESC, start_time DESC
  `,
    [req.user.id],
    (err, turnos) => {
      if (err) {
        console.error('Error leyendo historial de turnos:', err);
        return res.status(500).json({ mensaje: 'Error interno.' });
      }

      return res.json({ turnos });
    }
  );
});

module.exports = router;

