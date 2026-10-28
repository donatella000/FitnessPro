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
-- Desactiva la protección de Workbench durante el script (se reactiva al final)
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
(12, 40666777, 'Tomás',    'Romero',    'tomas@prueba.com',    @clave, 3, '291 5666777', '1979-03-15', 'M'),
-- Profesores de sala de musculación
(13, 30666777, 'Cristian', 'Paz',       'cristian@prueba.com', @clave, 2, '291 4666777', '1993-12-05', 'M'),
(14, 30777888, 'Paula',    'Vega',      'paula@prueba.com',    @clave, 2, '291 4777888', '1991-05-21', 'F');

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

-- Profesores de sala de musculación (turno mañana y turno tarde)
INSERT INTO profesores_sala (id_actividad, id_profesor, dia_semana, hora_inicio, hora_fin)
SELECT 1, p.id_profesor, d.dia, p.desde, p.hasta
FROM (SELECT 1 AS dia UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5) AS d
CROSS JOIN (
  SELECT 2 AS id_profesor, '08:00:00' AS desde, '15:00:00' AS hasta   -- Marcos: mañana
  UNION ALL SELECT 13, '08:00:00', '12:00:00'                         -- Cristian: mañana
  UNION ALL SELECT 14, '15:00:00', '22:00:00'                         -- Paula: tarde
) AS p;

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

-- ---------------------------------------------------------------------
-- MÁS ALUMNOS, CON HISTORIAL 2025-2026 (para que las estadísticas se vean reales)
-- ---------------------------------------------------------------------
-- 24 alumnos más (en total 30), inscriptos en distintos meses de 2025 y 2026,
-- con más inscripciones en septiembre. Cada uno pagó su abono mensual mes a mes
-- desde que se inscribió; algunos dejaron de venir después de unos meses
-- (columna meses) y el resto sigue activo hasta hoy.

INSERT INTO usuarios
  (id_usuario, dni, nombre, apellido, mail, password_hash, id_rol, telefono, fecha_nacimiento, sexo, fecha_registro)
VALUES
(15, 41002055, 'Valentina', 'Acosta', 'valentina.acosta@prueba.com', @clave, 3, '291 6015105', '1999-04-11', 'F', '2025-01-14 10:00:00'),
(16, 41002192, 'Martín', 'Benítez', 'martin.benitez@prueba.com', @clave, 3, '291 6016112', '1990-08-02', 'M', '2025-02-10 10:00:00'),
(17, 41002329, 'Camila', 'Castro', 'camila.castro@prueba.com', @clave, 3, '291 6017119', '1996-12-19', 'F', '2025-04-07 10:00:00'),
(18, 41002466, 'Nicolás', 'Domínguez', 'nicolas.dominguez@prueba.com', @clave, 3, '291 6018126', '1985-03-27', 'M', '2025-05-19 10:00:00'),
(19, 41002603, 'Florencia', 'Escobar', 'florencia.escobar@prueba.com', @clave, 3, '291 6019133', '2002-06-30', 'F', '2025-07-08 10:00:00'),
(20, 41002740, 'Agustín', 'Ferreyra', 'agustin.ferreyra@prueba.com', @clave, 3, '291 6020140', '1994-10-05', 'M', '2025-08-21 10:00:00'),
(21, 41002877, 'Micaela', 'Giménez', 'micaela.gimenez@prueba.com', @clave, 3, '291 6021147', '2000-02-14', 'F', '2025-09-02 10:00:00'),
(22, 41003014, 'Santiago', 'Herrera', 'santiago.herrera@prueba.com', @clave, 3, '291 6022154', '1998-09-23', 'M', '2025-09-09 10:00:00'),
(23, 41003151, 'Julieta', 'Ibáñez', 'julieta.ibañez@prueba.com', @clave, 3, '291 6023161', '1992-01-08', 'F', '2025-09-16 10:00:00'),
(24, 41003288, 'Facundo', 'Juárez', 'facundo.juarez@prueba.com', @clave, 3, '291 6024168', '1988-07-17', 'M', '2025-09-25 10:00:00'),
(25, 41003425, 'Rocío', 'Ledesma', 'rocio.ledesma@prueba.com', @clave, 3, '291 6025175', '1983-11-29', 'F', '2025-10-13 10:00:00'),
(26, 41003562, 'Ezequiel', 'Molina', 'ezequiel.molina@prueba.com', @clave, 3, '291 6026182', '1975-05-04', 'M', '2025-12-01 10:00:00'),
(27, 41003699, 'Agustina', 'Navarro', 'agustina.navarro@prueba.com', @clave, 3, '291 6027189', '2003-03-21', 'F', '2026-01-12 10:00:00'),
(28, 41003836, 'Gonzalo', 'Ortiz', 'gonzalo.ortiz@prueba.com', @clave, 3, '291 6028196', '1997-08-09', 'M', '2026-02-03 10:00:00'),
(29, 41003973, 'Carolina', 'Paz', 'carolina.paz@prueba.com', @clave, 3, '291 6029203', '1989-04-16', 'F', '2026-02-23 10:00:00'),
(30, 41004110, 'Lucas', 'Quiroga', 'lucas.quiroga@prueba.com', @clave, 3, '291 6030210', '2001-12-07', 'M', '2026-03-09 10:00:00'),
(31, 41004247, 'Milagros', 'Ramos', 'milagros.ramos@prueba.com', @clave, 3, '291 6031217', '1995-10-26', 'F', '2026-03-30 10:00:00'),
(32, 41004384, 'Joaquín', 'Suárez', 'joaquin.suarez@prueba.com', @clave, 3, '291 6032224', '1993-06-13', 'M', '2026-04-20 10:00:00'),
(33, 41004521, 'Daniela', 'Torres', 'daniela.torres@prueba.com', @clave, 3, '291 6033231', '1980-02-02', 'F', '2026-06-15 10:00:00'),
(34, 41004658, 'Matías', 'Urquiza', 'matias.urquiza@prueba.com', @clave, 3, '291 6034238', '2004-09-18', 'M', '2026-07-06 10:00:00'),
(35, 41004795, 'Brenda', 'Vázquez', 'brenda.vazquez@prueba.com', @clave, 3, '291 6035245', '1991-07-24', 'F', '2026-08-10 10:00:00'),
(36, 41004932, 'Tobías', 'Zalazar', 'tobias.zalazar@prueba.com', @clave, 3, '291 6036252', '2000-05-01', 'M', '2026-09-01 10:00:00'),
(37, 41005069, 'Antonella', 'Sosa', 'antonella.sosa@prueba.com', @clave, 3, '291 6037259', '1998-01-30', 'F', '2026-09-08 10:00:00'),
(38, 41005206, 'Federico', 'Luna', 'federico.luna@prueba.com', @clave, 3, '291 6038266', '1986-11-11', 'M', '2026-09-22 10:00:00');

-- Plan de cada alumno: suscripción mensual, clase y horario donde entrena, desde cuándo y por cuántos meses
DROP TEMPORARY TABLE IF EXISTS plan_alumno;
CREATE TEMPORARY TABLE plan_alumno (
  id_usuario INT PRIMARY KEY, id_suscripcion INT, id_clase INT, hora TIME, dias VARCHAR(10), inicio DATE, meses INT NULL
);
INSERT INTO plan_alumno (id_usuario, id_suscripcion, id_clase, hora, dias, inicio, meses) VALUES
(15, 1, 1, '09:00:00', '1,3,5', DATE_ADD('2025-01-14', INTERVAL 2 DAY), NULL),
(16, 13, 5, '20:00:00', '1,3,5', DATE_ADD('2025-02-10', INTERVAL 2 DAY), 6),
(17, 4, 3, '19:00:00', '1,3', DATE_ADD('2025-04-07', INTERVAL 2 DAY), NULL),
(18, 1, 1, '18:00:00', '1,3,5', DATE_ADD('2025-05-19', INTERVAL 2 DAY), 8),
(19, 10, 4, '18:00:00', '2,4', DATE_ADD('2025-07-08', INTERVAL 2 DAY), NULL),
(20, 1, 1, '19:00:00', '1,3,5', DATE_ADD('2025-08-21', INTERVAL 2 DAY), NULL),
(21, 1, 1, '10:00:00', '1,3,5', DATE_ADD('2025-09-02', INTERVAL 2 DAY), NULL),
(22, 13, 5, '20:00:00', '1,3,5', DATE_ADD('2025-09-09', INTERVAL 2 DAY), 4),
(23, 4, 2, '08:00:00', '2,4', DATE_ADD('2025-09-16', INTERVAL 2 DAY), NULL),
(24, 1, 1, '20:00:00', '1,3,5', DATE_ADD('2025-09-25', INTERVAL 2 DAY), NULL),
(25, 10, 4, '18:00:00', '2,4', DATE_ADD('2025-10-13', INTERVAL 2 DAY), 5),
(26, 1, 1, '08:00:00', '1,3,5', DATE_ADD('2025-12-01', INTERVAL 2 DAY), NULL),
(27, 13, 5, '20:00:00', '1,3,5', DATE_ADD('2026-01-12', INTERVAL 2 DAY), NULL),
(28, 1, 1, '12:00:00', '1,3,5', DATE_ADD('2026-02-03', INTERVAL 2 DAY), NULL),
(29, 4, 3, '19:00:00', '1,3', DATE_ADD('2026-02-23', INTERVAL 2 DAY), 3),
(30, 1, 1, '17:00:00', '1,3,5', DATE_ADD('2026-03-09', INTERVAL 2 DAY), NULL),
(31, 10, 4, '18:00:00', '2,4', DATE_ADD('2026-03-30', INTERVAL 2 DAY), NULL),
(32, 1, 1, '21:00:00', '1,3,5', DATE_ADD('2026-04-20', INTERVAL 2 DAY), NULL),
(33, 4, 2, '08:00:00', '2,4', DATE_ADD('2026-06-15', INTERVAL 2 DAY), NULL),
(34, 13, 5, '20:00:00', '1,3,5', DATE_ADD('2026-07-06', INTERVAL 2 DAY), NULL),
(35, 1, 1, '11:00:00', '1,3,5', DATE_ADD('2026-08-10', INTERVAL 2 DAY), NULL),
(36, 1, 1, '18:00:00', '1,3,5', DATE_ADD('2026-09-01', INTERVAL 2 DAY), NULL),
(37, 4, 3, '19:00:00', '1,3', DATE_ADD('2026-09-08', INTERVAL 2 DAY), NULL),
(38, 1, 1, '09:00:00', '1,3,5', DATE_ADD('2026-09-22', INTERVAL 2 DAY), NULL);

-- Tabla auxiliar con los meses de abono de cada alumno (0, 1, 2, ...)
DROP TEMPORARY TABLE IF EXISTS meses_n;
CREATE TEMPORARY TABLE meses_n (k INT PRIMARY KEY);
INSERT INTO meses_n (k) SELECT n - 1 FROM numeros WHERE n <= 30;

-- Un pago por mes: desde el inicio hasta que dejó de venir, o hasta hoy si sigue activo
INSERT INTO pagos (id_usuario, id_suscripcion, monto, metodo_pago, estado, registrado_por, fecha_pago)
SELECT p.id_usuario, p.id_suscripcion, s.precio,
       ELT(1 + MOD(p.id_usuario + m.k, 3), 'efectivo', 'mercadopago', 'tarjeta'),
       'aprobado',
       IF(MOD(p.id_usuario + m.k, 3) = 1, NULL, 1),
       TIMESTAMP(DATE_ADD(p.inicio, INTERVAL 30 * m.k DAY), '18:00:00')
FROM plan_alumno p
JOIN meses_n m
JOIN suscripciones s ON s.id_suscripcion = p.id_suscripcion
WHERE DATE_ADD(p.inicio, INTERVAL 30 * m.k DAY) <= CURDATE()
  AND (p.meses IS NULL OR m.k < p.meses);

-- El abono que generó cada pago (30 días desde el pago)
INSERT INTO suscripciones_alumno (id_usuario, id_suscripcion, id_pago, fecha_inicio, fecha_fin, turnos_totales)
SELECT pg.id_usuario, pg.id_suscripcion, pg.id_pago, DATE(pg.fecha_pago),
       DATE_ADD(DATE(pg.fecha_pago), INTERVAL 30 DAY), s.cantidad_turnos
FROM pagos pg
JOIN plan_alumno p ON p.id_usuario = pg.id_usuario
JOIN suscripciones s ON s.id_suscripcion = pg.id_suscripcion;

-- Días desde el 1/1/2025 hasta hoy, para generar el historial de turnos
-- (MySQL no deja unir una tabla temporal consigo misma, por eso se copia)
DROP TEMPORARY TABLE IF EXISTS numeros_b;
CREATE TEMPORARY TABLE numeros_b (n INT PRIMARY KEY);
INSERT INTO numeros_b (n) SELECT n FROM numeros;
DROP TEMPORARY TABLE IF EXISTS dias;
CREATE TEMPORARY TABLE dias (fecha DATE PRIMARY KEY);
INSERT INTO dias (fecha)
SELECT DATE_ADD('2025-01-01', INTERVAL (a.n - 1) + 45 * (b.n - 1) DAY)
FROM numeros a JOIN numeros_b b
WHERE (a.n - 1) + 45 * (b.n - 1) <= DATEDIFF(CURDATE(), '2025-01-01');

-- Turnos de cada abono en los días y la hora de su clase (antes de la semana actual).
-- Uno de cada cinco queda como ausente.
INSERT INTO turnos (id_usuario, id_horario, id_suscripcion_alumno, fecha, estado, fecha_reserva)
SELECT sa.id_usuario, h.id_horario, sa.id_suscripcion_alumno, d.fecha,
       IF(MOD(sa.id_usuario * 3 + DAYOFYEAR(d.fecha), 5) = 0, 'reservado', 'asistido'),
       TIMESTAMP(DATE_SUB(d.fecha, INTERVAL 1 DAY), '12:00:00')
FROM suscripciones_alumno sa
JOIN plan_alumno p ON p.id_usuario = sa.id_usuario
JOIN dias d ON d.fecha >= sa.fecha_inicio AND d.fecha < sa.fecha_fin
JOIN horarios_clase h
  ON h.id_clase = p.id_clase AND h.hora_inicio = p.hora
 AND h.dia_semana = WEEKDAY(d.fecha) + 1
WHERE FIND_IN_SET(WEEKDAY(d.fecha) + 1, p.dias) > 0
  AND YEARWEEK(d.fecha, 1) < YEARWEEK(CURDATE(), 1);

-- Regalo de bienvenida de los alumnos nuevos, en su fecha de alta
INSERT INTO movimientos_puntos (id_usuario, cantidad, motivo, descripcion, fecha)
SELECT id_usuario, 500, 'bienvenida', 'Regalo de bienvenida', fecha_registro
FROM usuarios WHERE id_usuario BETWEEN 15 AND 38;

DROP TEMPORARY TABLE IF EXISTS plan_alumno;
DROP TEMPORARY TABLE IF EXISTS meses_n;
DROP TEMPORARY TABLE IF EXISTS dias;
DROP TEMPORARY TABLE IF EXISTS numeros_b;

-- Asistencias de los turnos a los que fueron (por molinete, 5 minutos antes)
INSERT INTO asistencias (id_turno, id_usuario, fecha_hora, tipo, puntos_otorgados)
SELECT t.id_turno, t.id_usuario, TIMESTAMP(t.fecha, h.hora_inicio) - INTERVAL 5 MINUTE, 'molinete', 10
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
(7, 500, 'bienvenida', 'Regalo de bienvenida', NULL, NOW() - INTERVAL 21 DAY),
(8, 500, 'bienvenida', 'Regalo de bienvenida', NULL, NOW() - INTERVAL 16 DAY),
(9, 500, 'bienvenida', 'Regalo de bienvenida', NULL, NOW() - INTERVAL 21 DAY),
(10, 500, 'bienvenida', 'Regalo de bienvenida', NULL, NOW() - INTERVAL 41 DAY),
(11, 500, 'bienvenida', 'Regalo de bienvenida', NULL, NOW() - INTERVAL 2 DAY),
(12, 500, 'bienvenida', 'Regalo de bienvenida', NULL, NOW() - INTERVAL 75 DAY),
(9, 300, 'ajuste', 'Promoción de apertura', 1, NOW() - INTERVAL 18 DAY);

-- Lucía ya canjeó una botella y la retiró
INSERT INTO canjes (id_usuario, id_premio, puntos_usados, estado, fecha) VALUES
(9, 4, 800, 'entregado', NOW() - INTERVAL 3 DAY);

INSERT INTO movimientos_puntos (id_usuario, cantidad, motivo, descripcion, fecha) VALUES
(9, -800, 'canje', 'Canje: Botella FitnessPro', NOW() - INTERVAL 3 DAY);

-- Canjes de otros alumnos durante 2025 y 2026
INSERT INTO canjes (id_usuario, id_premio, puntos_usados, estado, fecha) VALUES
(15, 4, 800, 'entregado', '2025-06-10 19:00:00'),
(17, 3, 1000, 'entregado', '2025-11-04 18:30:00'),
(20, 2, 1200, 'entregado', '2026-02-17 20:00:00'),
(21, 4, 800, 'entregado', '2026-04-22 11:00:00'),
(24, 2, 1200, 'entregado', '2026-07-30 19:15:00'),
(26, 3, 1000, 'pendiente', NOW() - INTERVAL 1 DAY);
INSERT INTO movimientos_puntos (id_usuario, cantidad, motivo, descripcion, fecha)
SELECT c.id_usuario, -c.puntos_usados, 'canje', CONCAT('Canje: ', p.nombre), c.fecha
FROM canjes c JOIN premios p ON p.id_premio = c.id_premio
WHERE c.id_usuario BETWEEN 15 AND 38;

-- Saldo de cada alumno = suma de sus movimientos
UPDATE usuarios u
SET puntos = COALESCE((SELECT SUM(m.cantidad) FROM movimientos_puntos m WHERE m.id_usuario = u.id_usuario), 0)
WHERE u.id_rol = 3;

-- Fechas de alta de los alumnos originales y de los profesores, repartidas en 2025-2026
UPDATE usuarios SET fecha_registro = '2024-12-02 09:00:00' WHERE id_rol = 2;
UPDATE usuarios SET fecha_registro = '2025-09-11 10:00:00' WHERE id_usuario = 7;   -- Juan
UPDATE usuarios SET fecha_registro = '2025-03-08 10:00:00' WHERE id_usuario = 8;   -- Ana
UPDATE usuarios SET fecha_registro = '2026-09-03 10:00:00' WHERE id_usuario = 9;   -- Lucía
UPDATE usuarios SET fecha_registro = '2025-11-20 10:00:00' WHERE id_usuario = 10;  -- Pedro
UPDATE usuarios SET fecha_registro = NOW() - INTERVAL 2 DAY WHERE id_usuario = 11; -- Sofía
UPDATE usuarios SET fecha_registro = '2025-06-15 10:00:00' WHERE id_usuario = 12;  -- Tomás
UPDATE movimientos_puntos m JOIN usuarios u ON u.id_usuario = m.id_usuario
SET m.fecha = u.fecha_registro
WHERE m.motivo = 'bienvenida' AND u.id_usuario BETWEEN 7 AND 12;

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
