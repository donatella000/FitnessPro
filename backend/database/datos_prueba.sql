-- =====================================================================
-- FitnessPro - Datos de prueba
-- =====================================================================
-- Ejecutar SIEMPRE después de schema.sql, sobre la base recién creada.
-- Si la base ya tiene datos, primero volver a ejecutar schema.sql.
--
-- Todos los usuarios de prueba tienen la contraseña: prueba123
-- (el admin conserva la suya).
--
-- Las fechas se calculan a partir del día en que se ejecuta el script,
-- así los abonos siempre quedan vigentes y hay historial de asistencias.
-- =====================================================================

USE gimnasio;
SET NAMES utf8mb4;
SET SQL_SAFE_UPDATES = 0;

-- Tabla auxiliar con los números del 1 al 45, para generar fechas pasadas
DROP TEMPORARY TABLE IF EXISTS numeros;
CREATE TEMPORARY TABLE numeros (n INT PRIMARY KEY);
INSERT INTO numeros (n) VALUES
(1),(2),(3),(4),(5),(6),(7),(8),(9),(10),(11),(12),(13),(14),(15),
(16),(17),(18),(19),(20),(21),(22),(23),(24),(25),(26),(27),(28),(29),(30),
(31),(32),(33),(34),(35),(36),(37),(38),(39),(40),(41),(42),(43),(44),(45);

-- ---------------------------------------------------------------------
-- USUARIOS (el id 1 es el admin creado por schema.sql)
-- ---------------------------------------------------------------------
SET @clave = '$2b$10$DmrK5W4HWaM8kQ40utNSlux67/cPpNKnEyGxtioOyVIJV2Kb1TqIm'; -- prueba123

INSERT INTO usuarios
  (id_usuario, dni, nombre, apellido, mail, password_hash, id_rol, telefono, fecha_nacimiento, sexo)
VALUES
-- Profesores
(2,  30111222, 'Marcos',   'Gómez',     'marcos@prueba.com',   @clave, 2, '291 4111222', '1990-04-12', 'M'),
(3,  30222333, 'Matías',   'Ruiz',      'matias@prueba.com',   @clave, 2, '291 4222333', '1992-08-25', 'M'),
(4,  30333444, 'Milagros', 'Sosa',      'milagros@prueba.com', @clave, 2, '291 4333444', '1994-02-03', 'F'),
(5,  30444555, 'Víctor',   'Díaz',      'victor@prueba.com',   @clave, 2, '291 4444555', '1988-11-17', 'M'),
(6,  30555666, 'Baltazar', 'Ríos',      'baltazar@prueba.com', @clave, 2, '291 4555666', '1996-06-30', 'M'),
-- Alumnos
(7,  40111222, 'Juan',     'Pérez',     'juan@prueba.com',     @clave, 3, '291 5111222', '1998-05-14', 'M'),
(8,  40222333, 'Ana',      'López',     'ana@prueba.com',      @clave, 3, '291 5222333', '1995-09-02', 'F'),
(9,  40333444, 'Lucía',    'Fernández', 'lucia@prueba.com',    @clave, 3, '291 5333444', '2001-01-20', 'F'),
(10, 40444555, 'Pedro',    'Martínez',  'pedro@prueba.com',    @clave, 3, '291 5444555', '1987-11-30', 'M'),
(11, 40555666, 'Sofía',    'García',    'sofia@prueba.com',    @clave, 3, '291 5555666', '2003-07-08', 'F'),
(12, 40666777, 'Tomás',    'Romero',    'tomas@prueba.com',    @clave, 3, '291 5666777', '1979-03-15', 'M');

-- ---------------------------------------------------------------------
-- ACTIVIDADES Y CLASES
-- ---------------------------------------------------------------------
INSERT INTO actividades (id_actividad, nombre, descripcion, tipo) VALUES
(1, 'Musculación',      'Sala de musculación con turnos libres por hora.', 'musculacion'),
(2, 'Yoga',             'Clases de yoga para todos los niveles.',          'clase'),
(3, 'Pilates reformer', 'Pilates en máquina reformer, grupos reducidos.',  'clase'),
(4, 'Spinning',         'Entrenamiento aeróbico en bicicleta fija.',        'clase');

INSERT INTO clases (id_clase, id_actividad, id_profesor) VALUES
(1, 1, NULL), -- Musculación (sin profesor)
(2, 2, 3),    -- Yoga con Matías
(3, 2, 4),    -- Yoga con Milagros
(4, 3, 5),    -- Pilates con Víctor
(5, 4, 6);    -- Spinning con Baltazar

-- ---------------------------------------------------------------------
-- HORARIOS
-- ---------------------------------------------------------------------
-- Musculación: lunes a viernes, de 8 a 22, un turno por hora, cupo 20 (70 horarios)
INSERT INTO horarios_clase (id_clase, dia_semana, hora_inicio, hora_fin, cupo_maximo)
SELECT 1, d.dia, MAKETIME(h.hora, 0, 0), MAKETIME(h.hora + 1, 0, 0), 20
FROM (SELECT 1 AS dia UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5) AS d
CROSS JOIN (
  SELECT 8 AS hora UNION ALL SELECT 9 UNION ALL SELECT 10 UNION ALL SELECT 11 UNION ALL SELECT 12
  UNION ALL SELECT 13 UNION ALL SELECT 14 UNION ALL SELECT 15 UNION ALL SELECT 16 UNION ALL SELECT 17
  UNION ALL SELECT 18 UNION ALL SELECT 19 UNION ALL SELECT 20 UNION ALL SELECT 21
) AS h
ORDER BY d.dia, h.hora;

-- Clases con profesor
INSERT INTO horarios_clase (id_clase, dia_semana, hora_inicio, hora_fin, cupo_maximo) VALUES
(2, 2, '08:00', '09:00', 15), -- Yoga Matías: martes
(2, 4, '08:00', '09:00', 15), -- Yoga Matías: jueves
(3, 1, '19:00', '20:00', 15), -- Yoga Milagros: lunes
(3, 3, '19:00', '20:00', 15), -- Yoga Milagros: miércoles
(4, 2, '18:00', '19:00', 8),  -- Pilates Víctor: martes
(4, 4, '18:00', '19:00', 8),  -- Pilates Víctor: jueves
(4, 6, '10:00', '11:00', 8),  -- Pilates Víctor: sábado
(5, 1, '20:00', '21:00', 12), -- Spinning Baltazar: lunes
(5, 3, '20:00', '21:00', 12), -- Spinning Baltazar: miércoles
(5, 5, '20:00', '21:00', 12); -- Spinning Baltazar: viernes

-- ---------------------------------------------------------------------
-- SUSCRIPCIONES (semestral -20%, anual -30%)
-- ---------------------------------------------------------------------
INSERT INTO suscripciones
  (id_suscripcion, id_actividad, nombre, duracion_dias, veces_por_semana, cantidad_turnos, precio)
VALUES
(1,  1, 'Musculación mensual 3x semana',       30, 3, 12,  50000),
(2,  1, 'Musculación semestral 3x semana',    180, 3, 72, 240000),
(3,  1, 'Musculación anual 3x semana',        360, 3, 144, 420000),
(4,  2, 'Yoga mensual 2x semana',              30, 2, 8,   30000),
(5,  2, 'Yoga semestral 2x semana',           180, 2, 48, 144000),
(6,  2, 'Yoga anual 2x semana',               360, 2, 96, 252000),
(7,  2, 'Yoga mensual 3x semana',              30, 3, 12,  40000),
(8,  2, 'Yoga semestral 3x semana',           180, 3, 72, 192000),
(9,  2, 'Yoga anual 3x semana',               360, 3, 144, 336000),
(10, 3, 'Pilates reformer mensual 2x semana',  30, 2, 8,   45000),
(11, 3, 'Pilates reformer semestral 2x semana', 180, 2, 48, 216000),
(12, 3, 'Pilates reformer anual 2x semana',   360, 2, 96, 378000),
(13, 4, 'Spinning mensual 3x semana',          30, 3, 12,  35000),
(14, 4, 'Spinning semestral 3x semana',       180, 3, 72, 168000),
(15, 4, 'Spinning anual 3x semana',           360, 3, 144, 294000);

-- ---------------------------------------------------------------------
-- PAGOS Y SUSCRIPCIONES DE LOS ALUMNOS
-- ---------------------------------------------------------------------
-- Juan:   Musculación mensual, vigente
-- Ana:    Yoga mensual 2x, vigente
-- Lucía:  Musculación y Spinning, vigentes
-- Pedro:  Pilates semestral, vigente
-- Tomás:  Musculación mensual, VENCIDA (para probar el molinete con abono vencido)
-- Sofía:  sin abono (para probar el pago)
INSERT INTO pagos
  (id_pago, id_usuario, id_suscripcion, monto, metodo_pago, estado, mp_payment_id, registrado_por, fecha_pago)
VALUES
(1, 7,  1,  50000, 'efectivo',      'aprobado', NULL,          1,    TIMESTAMP(CURDATE() - INTERVAL 20 DAY, '10:00:00')),
(2, 8,  4,  30000, 'mercadopago',   'aprobado', 'PRUEBA-0002', NULL, TIMESTAMP(CURDATE() - INTERVAL 15 DAY, '18:30:00')),
(3, 9,  1,  50000, 'tarjeta',       'aprobado', NULL,          1,    TIMESTAMP(CURDATE() - INTERVAL 20 DAY, '09:15:00')),
(4, 9,  13, 35000, 'transferencia', 'aprobado', NULL,          1,    TIMESTAMP(CURDATE() - INTERVAL 20 DAY, '09:20:00')),
(5, 10, 11, 216000, 'mercadopago',  'aprobado', 'PRUEBA-0005', NULL, TIMESTAMP(CURDATE() - INTERVAL 40 DAY, '20:00:00')),
(6, 12, 1,  50000, 'efectivo',      'aprobado', NULL,          1,    TIMESTAMP(CURDATE() - INTERVAL 45 DAY, '11:00:00'));

INSERT INTO suscripciones_alumno
  (id_suscripcion_alumno, id_usuario, id_suscripcion, id_pago, fecha_inicio, fecha_fin, turnos_totales)
VALUES
(1, 7,  1,  1, CURDATE() - INTERVAL 20 DAY, CURDATE() + INTERVAL 10 DAY,  12),
(2, 8,  4,  2, CURDATE() - INTERVAL 15 DAY, CURDATE() + INTERVAL 15 DAY,  8),
(3, 9,  1,  3, CURDATE() - INTERVAL 20 DAY, CURDATE() + INTERVAL 10 DAY,  12),
(4, 9,  13, 4, CURDATE() - INTERVAL 20 DAY, CURDATE() + INTERVAL 10 DAY,  12),
(5, 10, 11, 5, CURDATE() - INTERVAL 40 DAY, CURDATE() + INTERVAL 140 DAY, 48),
(6, 12, 1,  6, CURDATE() - INTERVAL 45 DAY, CURDATE() - INTERVAL 15 DAY,  12);

-- ---------------------------------------------------------------------
-- HISTORIAL DE TURNOS (solo semanas anteriores a la actual, así cada
-- alumno puede reservar normalmente esta semana)
-- 'asistido' = fue; 'reservado' en el pasado = se muestra como ausente
-- ---------------------------------------------------------------------

-- Juan: musculación lunes, miércoles y viernes a las 18
INSERT INTO turnos (id_usuario, id_horario, id_suscripcion_alumno, fecha, estado, fecha_reserva)
SELECT 7, h.id_horario, 1, CURDATE() - INTERVAL d.n DAY,
       IF(d.n % 4 = 0, 'reservado', 'asistido'),
       TIMESTAMP(CURDATE() - INTERVAL (d.n + 1) DAY, '12:00:00')
FROM numeros d
JOIN horarios_clase h
  ON h.id_clase = 1 AND h.hora_inicio = '18:00:00'
 AND h.dia_semana = WEEKDAY(CURDATE() - INTERVAL d.n DAY) + 1
WHERE d.n BETWEEN 1 AND 19
  AND h.dia_semana IN (1, 3, 5)
  AND YEARWEEK(CURDATE() - INTERVAL d.n DAY, 1) < YEARWEEK(CURDATE(), 1);

-- Lucía: musculación martes y jueves a las 9
INSERT INTO turnos (id_usuario, id_horario, id_suscripcion_alumno, fecha, estado, fecha_reserva)
SELECT 9, h.id_horario, 3, CURDATE() - INTERVAL d.n DAY,
       IF(d.n % 5 = 0, 'reservado', 'asistido'),
       TIMESTAMP(CURDATE() - INTERVAL (d.n + 1) DAY, '20:00:00')
FROM numeros d
JOIN horarios_clase h
  ON h.id_clase = 1 AND h.hora_inicio = '09:00:00'
 AND h.dia_semana = WEEKDAY(CURDATE() - INTERVAL d.n DAY) + 1
WHERE d.n BETWEEN 1 AND 19
  AND h.dia_semana IN (2, 4)
  AND YEARWEEK(CURDATE() - INTERVAL d.n DAY, 1) < YEARWEEK(CURDATE(), 1);

-- Lucía: spinning lunes, miércoles y viernes a las 20
INSERT INTO turnos (id_usuario, id_horario, id_suscripcion_alumno, fecha, estado, fecha_reserva)
SELECT 9, h.id_horario, 4, CURDATE() - INTERVAL d.n DAY, 'asistido',
       TIMESTAMP(CURDATE() - INTERVAL (d.n + 1) DAY, '20:00:00')
FROM numeros d
JOIN horarios_clase h
  ON h.id_clase = 5
 AND h.dia_semana = WEEKDAY(CURDATE() - INTERVAL d.n DAY) + 1
WHERE d.n BETWEEN 1 AND 19
  AND YEARWEEK(CURDATE() - INTERVAL d.n DAY, 1) < YEARWEEK(CURDATE(), 1);

-- Ana: yoga con Milagros, lunes y miércoles a las 19
INSERT INTO turnos (id_usuario, id_horario, id_suscripcion_alumno, fecha, estado, fecha_reserva)
SELECT 8, h.id_horario, 2, CURDATE() - INTERVAL d.n DAY,
       IF(d.n % 6 = 0, 'reservado', 'asistido'),
       TIMESTAMP(CURDATE() - INTERVAL (d.n + 2) DAY, '09:00:00')
FROM numeros d
JOIN horarios_clase h
  ON h.id_clase = 3
 AND h.dia_semana = WEEKDAY(CURDATE() - INTERVAL d.n DAY) + 1
WHERE d.n BETWEEN 1 AND 14
  AND YEARWEEK(CURDATE() - INTERVAL d.n DAY, 1) < YEARWEEK(CURDATE(), 1);

-- Pedro: pilates martes y jueves a las 18
INSERT INTO turnos (id_usuario, id_horario, id_suscripcion_alumno, fecha, estado, fecha_reserva)
SELECT 10, h.id_horario, 5, CURDATE() - INTERVAL d.n DAY, 'asistido',
       TIMESTAMP(CURDATE() - INTERVAL (d.n + 1) DAY, '10:00:00')
FROM numeros d
JOIN horarios_clase h
  ON h.id_clase = 4 AND h.hora_inicio = '18:00:00'
 AND h.dia_semana = WEEKDAY(CURDATE() - INTERVAL d.n DAY) + 1
WHERE d.n BETWEEN 1 AND 39
  AND YEARWEEK(CURDATE() - INTERVAL d.n DAY, 1) < YEARWEEK(CURDATE(), 1);

-- Tomás: musculación lunes, miércoles y viernes a las 8, durante su abono vencido
INSERT INTO turnos (id_usuario, id_horario, id_suscripcion_alumno, fecha, estado, fecha_reserva)
SELECT 12, h.id_horario, 6, CURDATE() - INTERVAL d.n DAY, 'asistido',
       TIMESTAMP(CURDATE() - INTERVAL (d.n + 1) DAY, '19:00:00')
FROM numeros d
JOIN horarios_clase h
  ON h.id_clase = 1 AND h.hora_inicio = '08:00:00'
 AND h.dia_semana = WEEKDAY(CURDATE() - INTERVAL d.n DAY) + 1
WHERE d.n BETWEEN 18 AND 40
  AND h.dia_semana IN (1, 3, 5);

-- Asistencias de los turnos a los que fueron (por molinete, 5 minutos antes)
INSERT INTO asistencias (id_turno, id_usuario, fecha_hora, tipo, puntos_otorgados)
SELECT t.id_turno, t.id_usuario, TIMESTAMP(t.fecha, h.hora_inicio) - INTERVAL 5 MINUTE, 'molinete', 100
FROM turnos t
JOIN horarios_clase h ON t.id_horario = h.id_horario
WHERE t.estado = 'asistido';

-- Turnos usados de cada suscripción
UPDATE suscripciones_alumno sa
SET turnos_usados = (
  SELECT COUNT(*) FROM turnos t
  WHERE t.id_suscripcion_alumno = sa.id_suscripcion_alumno AND t.estado = 'asistido'
);

-- ---------------------------------------------------------------------
-- EJERCICIOS Y RUTINA
-- ---------------------------------------------------------------------
INSERT INTO ejercicios (id_ejercicio, nombre, grupo_muscular) VALUES
(1,  'Sentadilla con barra',            'Piernas'),
(2,  'Prensa',                          'Piernas'),
(3,  'Estocadas',                       'Piernas'),
(4,  'Peso muerto rumano',              'Piernas'),
(5,  'Sillón de cuádriceps',            'Piernas'),
(6,  'Camilla de isquiotibiales',       'Piernas'),
(7,  'Press de banca',                  'Pecho'),
(8,  'Press inclinado con mancuernas',  'Pecho'),
(9,  'Aperturas con mancuernas',        'Pecho'),
(10, 'Dominadas',                       'Espalda'),
(11, 'Remo con barra',                  'Espalda'),
(12, 'Jalón al pecho',                  'Espalda'),
(13, 'Press militar',                   'Hombros'),
(14, 'Elevaciones laterales',           'Hombros'),
(15, 'Curl de bíceps con barra',        'Brazos'),
(16, 'Extensión de tríceps en polea',   'Brazos'),
(17, 'Abdominales oblicuos',            'Abdomen'),
(18, 'Plancha',                         'Abdomen');

-- Rutina de Juan, armada por Marcos
INSERT INTO rutinas (id_rutina, id_alumno, id_creador, nombre) VALUES
(1, 7, 2, 'Rutina de inicio');

INSERT INTO rutina_ejercicios
  (id_rutina, dia, orden, id_ejercicio, series, repeticiones, peso_kg, observaciones)
VALUES
-- Día 1: piernas
(1, 1, 1, 1,  4, 10, 20,   NULL),
(1, 1, 2, 17, 4, 10, NULL, NULL),
(1, 1, 3, 2,  4, 10, 40,   NULL),
(1, 1, 4, 3,  3, 12, 10,   'Con mancuernas'),
(1, 1, 5, 5,  3, 12, 25,   NULL),
-- Día 2: pecho y tríceps
(1, 2, 1, 7,  4, 10, 30,   NULL),
(1, 2, 2, 8,  3, 10, 12,   NULL),
(1, 2, 3, 9,  3, 12, 8,    NULL),
(1, 2, 4, 16, 3, 12, 15,   NULL),
(1, 2, 5, 18, 3, 1,  NULL, 'Sostener 40 segundos'),
-- Día 3: espalda, hombros y bíceps
(1, 3, 1, 10, 4, 8,  NULL, 'Con asistencia si hace falta'),
(1, 3, 2, 11, 4, 10, 25,   NULL),
(1, 3, 3, 12, 3, 12, 35,   NULL),
(1, 3, 4, 13, 3, 10, 15,   NULL),
(1, 3, 5, 14, 3, 12, 5,    NULL),
(1, 3, 6, 15, 3, 10, 15,   NULL);

-- ---------------------------------------------------------------------
-- PREMIOS, PUNTOS Y CANJES
-- ---------------------------------------------------------------------
INSERT INTO premios (id_premio, nombre, descripcion, valor_puntos, stock) VALUES
(1, 'Remera FitnessPro',                 'Remera de algodón con el logo.',   2000, 10),
(2, 'Gorra FitnessPro',                  NULL,                              1200, 15),
(3, '30% de descuento en proteína ENA',  'Válido en el local adherido.',    1000, NULL),
(4, 'Botella FitnessPro',                'Botella deportiva de 750 cm³.',     800, 19);

-- Puntos ganados por cada asistencia
INSERT INTO movimientos_puntos (id_usuario, cantidad, motivo, descripcion, fecha)
SELECT id_usuario, puntos_otorgados, 'asistencia', CONCAT('Asistencia al turno #', id_turno), fecha_hora
FROM asistencias;

-- Ajustes manuales
INSERT INTO movimientos_puntos (id_usuario, cantidad, motivo, descripcion, registrado_por, fecha) VALUES
(7, 1500, 'ajuste', 'Bonificación de bienvenida', 1, NOW() - INTERVAL 18 DAY),
(9, 1000, 'ajuste', 'Promoción de apertura',      1, NOW() - INTERVAL 18 DAY);

-- Lucía ya canjeó una botella y la retiró
INSERT INTO canjes (id_usuario, id_premio, puntos_usados, estado, fecha) VALUES
(9, 4, 800, 'entregado', NOW() - INTERVAL 3 DAY);

INSERT INTO movimientos_puntos (id_usuario, cantidad, motivo, descripcion, fecha) VALUES
(9, -800, 'canje', 'Canje: Botella FitnessPro', NOW() - INTERVAL 3 DAY);

-- Saldo de cada alumno = suma de sus movimientos
UPDATE usuarios u
SET puntos = COALESCE((SELECT SUM(m.cantidad) FROM movimientos_puntos m WHERE m.id_usuario = u.id_usuario), 0)
WHERE u.id_rol = 3;

DROP TEMPORARY TABLE IF EXISTS numeros;
SET SQL_SAFE_UPDATES = 1;

-- ---------------------------------------------------------------------
-- VERIFICACIÓN
-- ---------------------------------------------------------------------
SELECT u.nombre, u.apellido, r.descripcion AS rol, u.puntos
FROM usuarios u JOIN rol r ON u.id_rol = r.id_rol
ORDER BY u.id_rol, u.id_usuario;

SELECT u.nombre, s.nombre AS suscripcion, sa.fecha_inicio, sa.fecha_fin,
       sa.turnos_totales, sa.turnos_usados
FROM suscripciones_alumno sa
JOIN usuarios u ON sa.id_usuario = u.id_usuario
JOIN suscripciones s ON sa.id_suscripcion = s.id_suscripcion
ORDER BY u.id_usuario;