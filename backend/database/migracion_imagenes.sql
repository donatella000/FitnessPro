-- =====================================================================
-- FitnessPro - Migración: ícono de cada actividad y foto de perfil
-- =====================================================================
-- Se ejecuta UNA sola vez sobre una base que ya tiene datos: no borra nada.
-- (Si se ejecuta dos veces, MySQL avisa que las columnas ya existen.)
-- =====================================================================

USE gimnasio;

-- Ícono de la actividad (imagen en formato data URL). Si está vacío,
-- la portada usa el ícono incluido para Musculación, Yoga, Pilates y Spinning.
ALTER TABLE actividades ADD COLUMN icono MEDIUMTEXT NULL AFTER tipo;

-- Foto de perfil del usuario (imagen en formato data URL, ya achicada por la página)
ALTER TABLE usuarios ADD COLUMN foto MEDIUMTEXT NULL AFTER sexo;
