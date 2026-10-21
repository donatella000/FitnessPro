const db = require('../config/db');
const { MercadoPagoConfig, Preference, Payment } = require('mercadopago');

const ROL_ALUMNO = 3;
const METODOS_PRESENCIALES = ['efectivo', 'tarjeta', 'transferencia'];

const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN
});

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// Mercado Pago no acepta direcciones localhost como páginas de regreso.
// Mientras se trabaje en la computadora, el pago se confirma con "verificarPagos".
const FRONTEND_ES_LOCAL = /localhost|127\.0\.0\.1/.test(FRONTEND_URL);
const HORAS_VENCIMIENTO_PENDIENTE = 72;

// ==========================================================
// FUNCIONES AUXILIARES
// ==========================================================

// Busca un plan activo con los datos necesarios para cobrarlo
const buscarPlanActivo = async (id_suscripcion) => {
  const [filas] = await db.query(`
    SELECT s.id_suscripcion, s.nombre, s.precio, s.duracion_dias, s.cantidad_turnos, a.nombre AS actividad
    FROM suscripciones s
    INNER JOIN actividades a ON s.id_actividad = a.id_actividad
    WHERE s.id_suscripcion = ? AND s.activo = 1 AND a.activo = 1
  `, [id_suscripcion]);
  return filas[0] || null;
};

// Crea la suscripción del alumno a partir de un pago aprobado.
// - Si no tiene otra vigente de la misma actividad, empieza hoy.
// - Si ya tiene una vigente, la nueva empieza al día siguiente de que termine,
//   para que no pierda los días que le quedaban.
// Debe llamarse dentro de una transacción (recibe la conexión).
const activarSuscripcion = async (conexion, id_pago) => {
  const [datos] = await conexion.query(`
    SELECT p.id_usuario, p.id_suscripcion, s.id_actividad, s.duracion_dias, s.cantidad_turnos
    FROM pagos p
    INNER JOIN suscripciones s ON p.id_suscripcion = s.id_suscripcion
    WHERE p.id_pago = ?
  `, [id_pago]);

  const pago = datos[0];

  const [vigente] = await conexion.query(`
    SELECT COALESCE(DATE_ADD(MAX(sa.fecha_fin), INTERVAL 1 DAY), CURDATE()) AS fecha_inicio
    FROM suscripciones_alumno sa
    INNER JOIN suscripciones s ON sa.id_suscripcion = s.id_suscripcion
    WHERE sa.id_usuario = ?
      AND s.id_actividad = ?
      AND sa.fecha_fin >= CURDATE()
      AND sa.turnos_usados < sa.turnos_totales
  `, [pago.id_usuario, pago.id_actividad]);

  const fecha_inicio = vigente[0].fecha_inicio;

  await conexion.query(`
    INSERT INTO suscripciones_alumno
      (id_usuario, id_suscripcion, id_pago, fecha_inicio, fecha_fin, turnos_totales)
    VALUES (?, ?, ?, ?, DATE_ADD(?, INTERVAL ? DAY), ?)
  `, [
    pago.id_usuario, pago.id_suscripcion, id_pago,
    fecha_inicio, fecha_inicio, pago.duracion_dias, pago.cantidad_turnos
  ]);
};

// Consulta un pago en Mercado Pago y actualiza la base según su estado.
// La usan el webhook y la confirmación desde el frontend.
// Es segura de llamar varias veces: si el pago ya estaba aprobado, no hace nada.
const procesarPagoMercadoPago = async (paymentId) => {
  const pagoMP = await new Payment(client).get({ id: paymentId });
  const id_pago = Number(pagoMP.external_reference);

  if (!id_pago) return null;

  const conexion = await db.getConnection();
  try {
    await conexion.beginTransaction();

    // FOR UPDATE bloquea la fila para que dos notificaciones simultáneas
    // no activen la suscripción dos veces
    const [filas] = await conexion.query(
      'SELECT id_pago, estado, monto, recargo FROM pagos WHERE id_pago = ? FOR UPDATE',
      [id_pago]
    );

    if (filas.length === 0) {
      await conexion.rollback();
      return null;
    }

    const pago = filas[0];

    if (pago.estado === 'aprobado') {
      await conexion.commit();
      return { id_pago, estado: 'aprobado' };
    }

    let estadoFinal = pago.estado;

    if (pagoMP.status === 'approved') {
      // Control de seguridad: el monto cobrado tiene que cubrir el registrado
      const montoEsperado = Number(pago.monto) + Number(pago.recargo);
      if (Number(pagoMP.transaction_amount) < montoEsperado) {
        await conexion.rollback();
        console.error(`Pago ${id_pago}: monto cobrado menor al esperado.`);
        return { id_pago, estado: 'pendiente' };
      }

      await conexion.query(`
        UPDATE pagos SET estado = 'aprobado', mp_payment_id = ?, fecha_pago = NOW()
        WHERE id_pago = ?
      `, [String(paymentId), id_pago]);

      await activarSuscripcion(conexion, id_pago);
      estadoFinal = 'aprobado';
    } else if (['rejected', 'cancelled'].includes(pagoMP.status)) {
      await conexion.query(
        "UPDATE pagos SET estado = 'rechazado', mp_payment_id = ? WHERE id_pago = ?",
        [String(paymentId), id_pago]
      );
      estadoFinal = 'rechazado';
    }

    await conexion.commit();
    return { id_pago, estado: estadoFinal };
  } catch (error) {
    await conexion.rollback();
    throw error;
  } finally {
    conexion.release();
  }
};

const CONSULTA_PAGOS = `
  SELECT
    p.id_pago, p.id_usuario, u.nombre, u.apellido, u.dni,
    p.id_suscripcion, s.nombre AS suscripcion, a.nombre AS actividad,
    p.monto, p.recargo, (p.monto + p.recargo) AS total,
    p.metodo_pago, p.estado, p.fecha_pago,
    sa.fecha_inicio, sa.fecha_fin AS vencimiento,
    CONCAT(r.nombre, ' ', r.apellido) AS registrado_por
  FROM pagos p
  INNER JOIN usuarios u ON p.id_usuario = u.id_usuario
  INNER JOIN suscripciones s ON p.id_suscripcion = s.id_suscripcion
  INNER JOIN actividades a ON s.id_actividad = a.id_actividad
  LEFT JOIN suscripciones_alumno sa ON sa.id_pago = p.id_pago
  LEFT JOIN usuarios r ON p.registrado_por = r.id_usuario
`;

// ==========================================================
// 1. COBRO PRESENCIAL (Admin y Profesor)
// ==========================================================
// Body: { id_usuario, id_suscripcion, metodo_pago: 'efectivo'|'tarjeta'|'transferencia', recargo? }
// El monto es el precio actual del plan. El pago queda aprobado al instante.
const registrarPagoPresencial = async (req, res) => {
  const { id_usuario, id_suscripcion, metodo_pago, recargo } = req.body;
  const conexion = await db.getConnection();

  try {
    if (!id_usuario || !id_suscripcion || !metodo_pago) {
      return res.status(400).json({ mensaje: 'Debe indicar el alumno, la suscripción y el método de pago.' });
    }
    if (!METODOS_PRESENCIALES.includes(metodo_pago)) {
      return res.status(400).json({ mensaje: 'El método de pago debe ser efectivo, tarjeta o transferencia.' });
    }
    if (recargo !== undefined && Number(recargo) < 0) {
      return res.status(400).json({ mensaje: 'El recargo no puede ser negativo.' });
    }

    const [alumno] = await conexion.query(
      'SELECT id_usuario FROM usuarios WHERE id_usuario = ? AND id_rol = ? AND activo = 1',
      [id_usuario, ROL_ALUMNO]
    );
    if (alumno.length === 0) {
      return res.status(404).json({ mensaje: 'El alumno no existe o está dado de baja.' });
    }

    const plan = await buscarPlanActivo(id_suscripcion);
    if (!plan) {
      return res.status(404).json({ mensaje: 'La suscripción no existe o está dada de baja.' });
    }

    await conexion.beginTransaction();

    const [resultado] = await conexion.query(`
      INSERT INTO pagos (id_usuario, id_suscripcion, monto, recargo, metodo_pago, estado, registrado_por)
      VALUES (?, ?, ?, ?, ?, 'aprobado', ?)
    `, [id_usuario, id_suscripcion, plan.precio, recargo || 0, metodo_pago, req.usuario.id_usuario]);

    await activarSuscripcion(conexion, resultado.insertId);
    await conexion.commit();

    const [pago] = await db.query(`${CONSULTA_PAGOS} WHERE p.id_pago = ?`, [resultado.insertId]);

    return res.status(201).json({ mensaje: '¡Pago registrado exitosamente!', pago: pago[0] });
  } catch (error) {
    await conexion.rollback();
    console.error('Error al registrar pago presencial:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor al registrar el pago.' });
  } finally {
    conexion.release();
  }
};

// ==========================================================
// 2. CREAR LINK DE PAGO EN MERCADO PAGO (usuario logueado)
// ==========================================================
// Se registra el pago como 'pendiente' y su id viaja a Mercado Pago
// como external_reference, para identificarlo cuando vuelva la respuesta.
const crearPreferenciaPago = async (req, res) => {
  try {
    const { id_suscripcion } = req.body;
    const { id_usuario } = req.usuario;

    if (!id_suscripcion) {
      return res.status(400).json({ mensaje: 'Debe indicar la suscripción a pagar.' });
    }

    const plan = await buscarPlanActivo(id_suscripcion);
    if (!plan) {
      return res.status(404).json({ mensaje: 'La suscripción no existe o está dada de baja.' });
    }

    const [usuarios] = await db.query('SELECT mail FROM usuarios WHERE id_usuario = ?', [id_usuario]);

    const [resultado] = await db.query(`
      INSERT INTO pagos (id_usuario, id_suscripcion, monto, metodo_pago, estado)
      VALUES (?, ?, ?, 'mercadopago', 'pendiente')
    `, [id_usuario, id_suscripcion, plan.precio]);

    const id_pago = resultado.insertId;

    const cuerpo = {
      items: [{
        id: String(plan.id_suscripcion),
        title: `FitnessPro - ${plan.nombre}`,
        quantity: 1,
        unit_price: Number(plan.precio),
        currency_id: 'ARS'
      }],
      payer: { email: usuarios[0].mail },
      external_reference: String(id_pago)
    };

    // Las páginas de regreso solo se envían con una dirección pública (no localhost)
    if (!FRONTEND_ES_LOCAL) {
      cuerpo.back_urls = {
        success: `${FRONTEND_URL}/pago-exitoso`,
        failure: `${FRONTEND_URL}/pago-fallido`,
        pending: `${FRONTEND_URL}/pago-pendiente`
      };
      cuerpo.auto_return = 'approved';
    }

    // El webhook solo funciona con una dirección pública (no con localhost).
    // Si está configurada en el .env, se le indica a Mercado Pago dónde avisar.
    if (process.env.BACKEND_PUBLIC_URL) {
      cuerpo.notification_url = `${process.env.BACKEND_PUBLIC_URL}/api/pagos/webhook`;
    }

    const respuesta = await new Preference(client).create({ body: cuerpo });

    await db.query('UPDATE pagos SET mp_preference_id = ? WHERE id_pago = ?', [respuesta.id, id_pago]);

    return res.json({ init_point: respuesta.init_point, id_pago });
  } catch (error) {
    console.error('Error al crear preferencia de Mercado Pago:', error);
    return res.status(500).json({ mensaje: 'Error al generar el link de pago con Mercado Pago.' });
  }
};

// ==========================================================
// 3. CONFIRMAR PAGO AL VOLVER DE MERCADO PAGO (usuario logueado)
// ==========================================================
// La página /pago-exitoso del frontend recibe en la URL el parámetro
// payment_id y lo manda acá. El backend lo verifica directamente con
// Mercado Pago, así que no se puede falsificar desde el navegador.
// Necesario mientras se trabaje en localhost, donde el webhook no llega.
const confirmarPago = async (req, res) => {
  try {
    const { payment_id } = req.body;

    if (!payment_id) {
      return res.status(400).json({ mensaje: 'Falta el identificador del pago.' });
    }

    const resultado = await procesarPagoMercadoPago(payment_id);

    if (!resultado) {
      return res.status(404).json({ mensaje: 'No se encontró el pago.' });
    }

    const mensajes = {
      aprobado: '¡Pago aprobado! Tu suscripción ya está activa.',
      rechazado: 'El pago fue rechazado. Podés intentarlo de nuevo.',
      pendiente: 'El pago está pendiente de acreditación.'
    };

    return res.json({ estado: resultado.estado, mensaje: mensajes[resultado.estado] });
  } catch (error) {
    console.error('Error al confirmar pago:', error);
    return res.status(500).json({ mensaje: 'Error al verificar el pago con Mercado Pago.' });
  }
};

// ==========================================================
// 3 bis. VERIFICAR PAGOS PENDIENTES (usuario logueado)
// ==========================================================
// Busca en Mercado Pago los pagos que el usuario dejó iniciados y actualiza
// su estado. Funciona aunque Mercado Pago no pueda volver a la página
// (como pasa en localhost) y aunque el webhook no llegue.
// Los pendientes sin ningún intento de pago después de 72 horas se dan por vencidos.
const verificarPagos = async (req, res) => {
  try {
    const [pendientes] = await db.query(`
      SELECT id_pago, TIMESTAMPDIFF(HOUR, fecha_pago, NOW()) AS horas
      FROM pagos
      WHERE id_usuario = ? AND estado = 'pendiente' AND metodo_pago = 'mercadopago'
      ORDER BY id_pago DESC
      LIMIT 10
    `, [req.usuario.id_usuario]);

    let aprobados = 0;
    let siguenPendientes = 0;
    let errores = 0;

    for (const pago of pendientes) {
      try {
        const busqueda = await new Payment(client).search({
          options: { external_reference: String(pago.id_pago), sort: 'date_created', criteria: 'desc' }
        });
        const resultados = busqueda.results || [];

        if (resultados.length > 0) {
          const elegido = resultados.find((r) => r.status === 'approved') || resultados[0];
          const resultado = await procesarPagoMercadoPago(elegido.id);
          if (resultado?.estado === 'aprobado') aprobados++;
          else if (resultado?.estado === 'pendiente') siguenPendientes++;
        } else if (pago.horas >= HORAS_VENCIMIENTO_PENDIENTE) {
          await db.query("UPDATE pagos SET estado = 'rechazado' WHERE id_pago = ? AND estado = 'pendiente'", [pago.id_pago]);
        } else {
          siguenPendientes++;
        }
      } catch (error) {
        errores++;
        console.error(`Error al verificar el pago ${pago.id_pago}:`, error.message || error);
      }
    }

    let mensaje = 'No hay pagos pendientes de verificar.';
    if (aprobados > 0) mensaje = '¡Tu pago se acreditó! Tu abono ya está activo.';
    else if (siguenPendientes > 0) mensaje = 'Todavía no vemos el pago acreditado. Si ya pagaste, esperá unos minutos y volvé a verificar.';
    else if (errores > 0) mensaje = 'No se pudo consultar Mercado Pago en este momento. Probá de nuevo más tarde.';

    return res.json({ aprobados, pendientes: siguenPendientes, errores, mensaje });
  } catch (error) {
    console.error('Error al verificar pagos:', error);
    return res.status(500).json({ mensaje: 'Error al verificar los pagos con Mercado Pago.' });
  }
};

// ==========================================================
// 4. WEBHOOK DE MERCADO PAGO (público, sin token)
// ==========================================================
const recibirWebhook = async (req, res) => {
  try {
    const tipo = req.query.type || req.query.topic || req.body?.type;
    const paymentId = req.query['data.id'] || req.body?.data?.id || req.query.id;

    if (tipo === 'payment' && paymentId) {
      await procesarPagoMercadoPago(paymentId);
    }

    // Mercado Pago necesita recibir 200 para no reintentar
    return res.sendStatus(200);
  } catch (error) {
    console.error('Error al procesar webhook de Mercado Pago:', error);
    return res.sendStatus(500);
  }
};

// ==========================================================
// 5. LISTAR PAGOS
// ==========================================================
// Alumno: solo sus pagos aprobados (historial).
// Admin/Profesor: todos. Filtros: ?id_usuario=5  ?estado=pendiente
const listarPagos = async (req, res) => {
  try {
    const condiciones = [];
    const valores = [];

    if (req.usuario.id_rol === ROL_ALUMNO) {
      condiciones.push('p.id_usuario = ?', "p.estado = 'aprobado'");
      valores.push(req.usuario.id_usuario);
    } else {
      if (req.query.id_usuario) {
        condiciones.push('p.id_usuario = ?');
        valores.push(req.query.id_usuario);
      }
      if (req.query.estado) {
        condiciones.push('p.estado = ?');
        valores.push(req.query.estado);
      }
    }

    const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';
    const [pagos] = await db.query(`${CONSULTA_PAGOS} ${where} ORDER BY p.fecha_pago DESC, p.id_pago DESC`, valores);

    return res.json(pagos);
  } catch (error) {
    console.error('Error al listar pagos:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor al listar los pagos.' });
  }
};

// ==========================================================
// 6. VER UN PAGO
// ==========================================================
const obtenerPagoPorId = async (req, res) => {
  try {
    const [pagos] = await db.query(`${CONSULTA_PAGOS} WHERE p.id_pago = ?`, [req.params.id]);

    if (pagos.length === 0) {
      return res.status(404).json({ mensaje: 'Pago no encontrado.' });
    }

    if (req.usuario.id_rol === ROL_ALUMNO && pagos[0].id_usuario !== req.usuario.id_usuario) {
      return res.status(403).json({ mensaje: 'No tenés permiso para ver este pago.' });
    }

    return res.json(pagos[0]);
  } catch (error) {
    console.error('Error al obtener pago:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor al obtener el pago.' });
  }
};

// ==========================================================
// 7. ANULAR UN PAGO (Solo Admin)
// ==========================================================
// Para corregir un cobro cargado por error. Elimina el pago y la suscripción
// que generó, siempre que el alumno no haya reservado ningún turno con ella.
const anularPago = async (req, res) => {
  const { id } = req.params;
  const conexion = await db.getConnection();

  try {
    const [pagos] = await conexion.query('SELECT id_pago FROM pagos WHERE id_pago = ?', [id]);
    if (pagos.length === 0) {
      return res.status(404).json({ mensaje: 'Pago no encontrado.' });
    }

    const [usados] = await conexion.query(`
      SELECT COUNT(*) AS cantidad
      FROM turnos t
      INNER JOIN suscripciones_alumno sa ON t.id_suscripcion_alumno = sa.id_suscripcion_alumno
      WHERE sa.id_pago = ?
    `, [id]);

    if (usados[0].cantidad > 0) {
      return res.status(400).json({
        mensaje: 'No se puede anular: el alumno ya reservó turnos con la suscripción de este pago.'
      });
    }

    await conexion.beginTransaction();
    await conexion.query('DELETE FROM suscripciones_alumno WHERE id_pago = ?', [id]);
    await conexion.query('DELETE FROM pagos WHERE id_pago = ?', [id]);
    await conexion.commit();

    return res.json({ mensaje: 'Pago anulado junto con la suscripción que había generado.' });
  } catch (error) {
    await conexion.rollback();
    console.error('Error al anular pago:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor al anular el pago.' });
  } finally {
    conexion.release();
  }
};

module.exports = {
  registrarPagoPresencial,
  crearPreferenciaPago,
  confirmarPago,
  verificarPagos,
  recibirWebhook,
  listarPagos,
  obtenerPagoPorId,
  anularPago
};