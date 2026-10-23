-- =====================================================================
-- FitnessPro - Migración: puntos configurables, bienvenida y cumpleaños
-- =====================================================================
-- Se puede ejecutar sobre una base que ya tiene datos: no borra nada.
-- =====================================================================

USE gimnasio;

-- Nuevos motivos de movimiento de puntos
ALTER TABLE movimientos_puntos
  MODIFY motivo ENUM('asistencia', 'canje', 'ajuste', 'bienvenida', 'cumpleanios') NOT NULL;

-- Puntos por asistencia: 10
UPDATE configuracion SET valor = '10' WHERE clave = 'puntos_por_asistencia';

-- Puntos de regalo por registro y por cumpleaños
INSERT INTO configuracion (clave, valor, descripcion) VALUES
('puntos_bienvenida', '500', 'Puntos de regalo para cada alumno nuevo'),
('puntos_cumpleanios', '200', 'Puntos de regalo el día del cumpleaños del alumno')
ON DUPLICATE KEY UPDATE valor = VALUES(valor), descripcion = VALUES(descripcion);
