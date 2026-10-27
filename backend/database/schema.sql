-- =====================================================================
-- FitnessPro - Esquema de base de datos (MySQL 8.0.19 o superior)
-- =====================================================================
-- Convenciones:
--   * dia_semana: 1 = lunes ... 7 = domingo  (en MySQL: WEEKDAY(fecha) + 1)
--   * Nada se borra físicamente si tiene historial: se usa el campo "activo"
--     (borrado lógico) para no romper pagos, turnos o estadísticas viejas.
--   * Las reglas de negocio (1 turno por día por actividad, límite semanal,
--     ventanas de 1 min / 2 hs / 10 min) se validan en el backend.
-- =====================================================================

DROP DATABASE IF EXISTS gimnasio;
CREATE DATABASE gimnasio CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE gimnasio;

-- ---------------------------------------------------------------------
-- USUARIOS Y ROLES
-- ---------------------------------------------------------------------
CREATE TABLE rol (
    id_rol      INT PRIMARY KEY,
    descripcion VARCHAR(30) NOT NULL UNIQUE
);

CREATE TABLE usuarios (
    id_usuario              INT PRIMARY KEY AUTO_INCREMENT,
    dni                     INT UNSIGNED NOT NULL UNIQUE,
    nombre                  VARCHAR(50)  NOT NULL,
    apellido                VARCHAR(50)  NOT NULL,
    mail                    VARCHAR(100) NOT NULL UNIQUE,
    password_hash           VARCHAR(255) NOT NULL,
    id_rol                  INT NOT NULL DEFAULT 3,
    -- 1 = debe cambiar la contraseña al ingresar (alta por admin/profe o
    -- contraseña temporal de "olvidé mi contraseña")
    debe_cambiar_password   TINYINT NOT NULL DEFAULT 0,
    -- Recuperación de contraseña ("olvidé mi contraseña")
    reset_token             VARCHAR(255) NULL,
    reset_token_expira      DATETIME NULL,
    telefono                VARCHAR(20)  NULL,
    calle                   VARCHAR(80)  NULL,
    numero                  VARCHAR(10)  NULL,
    fecha_nacimiento        DATE NULL,
    sexo                    ENUM('M', 'F', 'Otro') NULL,
    foto                    MEDIUMTEXT NULL,   -- foto de perfil (data URL)
    contacto_emergencia_nombre VARCHAR(100) NULL,
    contacto_emergencia_tel    VARCHAR(20)  NULL,
    puntos                  INT NOT NULL DEFAULT 0,   -- saldo actual
    activo                  TINYINT NOT NULL DEFAULT 1,
    fecha_registro          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_rol) REFERENCES rol (id_rol)
);

-- ---------------------------------------------------------------------
-- ACTIVIDADES, CLASES Y HORARIOS (el "esqueleto" que arma el admin)
-- ---------------------------------------------------------------------
-- Actividad: Musculación, Yoga, Pilates, Spinning...
CREATE TABLE actividades (
    id_actividad INT PRIMARY KEY AUTO_INCREMENT,
    nombre       VARCHAR(50) NOT NULL UNIQUE,
    descripcion  TEXT NULL,
    -- 'musculacion': turnos libres por hora, sin elegir profesor
    -- 'clase': el alumno elige profesor y horario
    tipo         ENUM('musculacion', 'clase') NOT NULL DEFAULT 'clase',
    icono        MEDIUMTEXT NULL,   -- imagen (data URL); vacío = ícono incluido en la página
    activo       TINYINT NOT NULL DEFAULT 1
);

-- Clase: una actividad dictada por un profesor (ej: Pilates con Marcos).
-- Para musculación se crea una única clase con id_profesor NULL.
CREATE TABLE clases (
    id_clase     INT PRIMARY KEY AUTO_INCREMENT,
    id_actividad INT NOT NULL,
    id_profesor  INT NULL,
    activo       TINYINT NOT NULL DEFAULT 1,
    FOREIGN KEY (id_actividad) REFERENCES actividades (id_actividad),
    FOREIGN KEY (id_profesor)  REFERENCES usuarios (id_usuario)
);

-- Horario semanal que se repite (ej: martes 08:00 a 09:00, cupo 20).
-- El cupo libre NO se guarda: se calcula contando los turnos de esa fecha.
CREATE TABLE horarios_clase (
    id_horario   INT PRIMARY KEY AUTO_INCREMENT,
    id_clase     INT NOT NULL,
    dia_semana   TINYINT NOT NULL CHECK (dia_semana BETWEEN 1 AND 7),
    hora_inicio  TIME NOT NULL,
    hora_fin     TIME NOT NULL,
    cupo_maximo  INT NOT NULL CHECK (cupo_maximo > 0),
    activo       TINYINT NOT NULL DEFAULT 1,
    CHECK (hora_fin > hora_inicio),
    FOREIGN KEY (id_clase) REFERENCES clases (id_clase)
);

-- Turnos de trabajo de los profesores en la sala de musculación.
-- Solo informativo: se muestra en la portada. El alumno no elige profesor al reservar.
CREATE TABLE profesores_sala (
    id_profesor_sala INT PRIMARY KEY AUTO_INCREMENT,
    id_actividad     INT NOT NULL,                 -- actividad de tipo 'musculacion'
    id_profesor      INT NOT NULL,
    dia_semana       TINYINT NOT NULL CHECK (dia_semana BETWEEN 1 AND 7),
    hora_inicio      TIME NOT NULL,
    hora_fin         TIME NOT NULL,
    CHECK (hora_fin > hora_inicio),
    FOREIGN KEY (id_actividad) REFERENCES actividades (id_actividad),
    FOREIGN KEY (id_profesor)  REFERENCES usuarios (id_usuario)
);

-- ---------------------------------------------------------------------
-- SUSCRIPCIONES Y PAGOS
-- ---------------------------------------------------------------------
-- Plan que ofrece el gimnasio (ej: "Yoga mensual 3x semana").
CREATE TABLE suscripciones (
    id_suscripcion   INT PRIMARY KEY AUTO_INCREMENT,
    id_actividad     INT NOT NULL,
    nombre           VARCHAR(80) NOT NULL,
    duracion_dias    INT NOT NULL CHECK (duracion_dias > 0),     -- 30 / 180 / 360
    veces_por_semana TINYINT NOT NULL CHECK (veces_por_semana BETWEEN 1 AND 7),
    cantidad_turnos  INT NOT NULL CHECK (cantidad_turnos > 0),   -- ej: 12 / 72 / 144
    precio           DECIMAL(10,2) NOT NULL,
    activo           TINYINT NOT NULL DEFAULT 1,
    FOREIGN KEY (id_actividad) REFERENCES actividades (id_actividad)
);

-- Registro de cada pago (Mercado Pago o presencial).
CREATE TABLE pagos (
    id_pago           INT PRIMARY KEY AUTO_INCREMENT,
    id_usuario        INT NOT NULL,
    id_suscripcion    INT NOT NULL,
    monto             DECIMAL(10,2) NOT NULL,   -- precio cobrado en ese momento
    recargo           DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    metodo_pago       ENUM('mercadopago', 'efectivo', 'tarjeta', 'transferencia') NOT NULL,
    estado            ENUM('pendiente', 'aprobado', 'rechazado') NOT NULL DEFAULT 'pendiente',
    mp_preference_id  VARCHAR(100) NULL,
    mp_payment_id     VARCHAR(100) NULL,
    registrado_por    INT NULL,                 -- admin/profe si fue presencial
    fecha_pago        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_usuario)     REFERENCES usuarios (id_usuario),
    FOREIGN KEY (id_suscripcion) REFERENCES suscripciones (id_suscripcion),
    FOREIGN KEY (registrado_por) REFERENCES usuarios (id_usuario)
);

-- Suscripción contratada por un alumno. Se crea cuando un pago queda aprobado.
-- Un alumno puede tener varias activas a la vez (ej: musculación + yoga).
CREATE TABLE suscripciones_alumno (
    id_suscripcion_alumno INT PRIMARY KEY AUTO_INCREMENT,
    id_usuario       INT NOT NULL,
    id_suscripcion   INT NOT NULL,
    id_pago          INT NOT NULL UNIQUE,
    fecha_inicio     DATE NOT NULL,
    fecha_fin        DATE NOT NULL,
    turnos_totales   INT NOT NULL,
    turnos_usados    INT NOT NULL DEFAULT 0,
    FOREIGN KEY (id_usuario)     REFERENCES usuarios (id_usuario),
    FOREIGN KEY (id_suscripcion) REFERENCES suscripciones (id_suscripcion),
    FOREIGN KEY (id_pago)        REFERENCES pagos (id_pago)
);

-- ---------------------------------------------------------------------
-- TURNOS Y ASISTENCIAS
-- ---------------------------------------------------------------------
-- Reserva de un alumno para un horario en una fecha concreta.
CREATE TABLE turnos (
    id_turno              INT PRIMARY KEY AUTO_INCREMENT,
    id_usuario            INT NOT NULL,
    id_horario            INT NOT NULL,
    id_suscripcion_alumno INT NOT NULL,
    fecha                 DATE NOT NULL,
    estado                ENUM('reservado', 'cancelado', 'asistido', 'ausente')
                          NOT NULL DEFAULT 'reservado',
    fecha_reserva         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_cancelacion     DATETIME NULL,
    FOREIGN KEY (id_usuario)            REFERENCES usuarios (id_usuario),
    FOREIGN KEY (id_horario)            REFERENCES horarios_clase (id_horario),
    FOREIGN KEY (id_suscripcion_alumno) REFERENCES suscripciones_alumno (id_suscripcion_alumno),
    INDEX idx_turnos_horario_fecha (id_horario, fecha),
    INDEX idx_turnos_usuario_fecha (id_usuario, fecha)
);

-- Ingreso efectivo al gimnasio (por molinete o carga manual).
CREATE TABLE asistencias (
    id_asistencia    INT PRIMARY KEY AUTO_INCREMENT,
    id_turno         INT NULL UNIQUE,
    id_usuario       INT NOT NULL,
    fecha_hora       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    tipo             ENUM('molinete', 'manual') NOT NULL,
    registrado_por   INT NULL,                  -- admin/profe si fue manual
    puntos_otorgados INT NOT NULL DEFAULT 0,
    FOREIGN KEY (id_turno)       REFERENCES turnos (id_turno),
    FOREIGN KEY (id_usuario)     REFERENCES usuarios (id_usuario),
    FOREIGN KEY (registrado_por) REFERENCES usuarios (id_usuario)
);

-- Aperturas manuales del molinete desde el dashboard.
CREATE TABLE aperturas_molinete (
    id_apertura  INT PRIMARY KEY AUTO_INCREMENT,
    id_usuario   INT NOT NULL,                  -- admin/profe que la abrió
    fecha_hora   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_usuario) REFERENCES usuarios (id_usuario)
);

-- ---------------------------------------------------------------------
-- EJERCICIOS Y RUTINAS (musculación: 3 días, máximo 8 ejercicios por día)
-- ---------------------------------------------------------------------
CREATE TABLE ejercicios (
    id_ejercicio   INT PRIMARY KEY AUTO_INCREMENT,
    nombre         VARCHAR(100) NOT NULL UNIQUE,
    grupo_muscular VARCHAR(50)  NOT NULL,
    descripcion    TEXT NULL,
    activo         TINYINT NOT NULL DEFAULT 1
);

CREATE TABLE rutinas (
    id_rutina      INT PRIMARY KEY AUTO_INCREMENT,
    id_alumno      INT NOT NULL,
    id_creador     INT NULL,                    -- admin/profe que la armó
    nombre         VARCHAR(80) NULL,
    activa         TINYINT NOT NULL DEFAULT 1,
    fecha_creacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_alumno)  REFERENCES usuarios (id_usuario),
    FOREIGN KEY (id_creador) REFERENCES usuarios (id_usuario)
);

-- Una fila por ejercicio. "orden" de 1 a 8 + UNIQUE garantiza
-- el máximo de 8 ejercicios por día.
CREATE TABLE rutina_ejercicios (
    id_rutina_ejercicio INT PRIMARY KEY AUTO_INCREMENT,
    id_rutina    INT NOT NULL,
    dia          TINYINT NOT NULL CHECK (dia BETWEEN 1 AND 3),
    orden        TINYINT NOT NULL CHECK (orden BETWEEN 1 AND 8),
    id_ejercicio INT NOT NULL,
    series       TINYINT NOT NULL,
    repeticiones TINYINT NOT NULL,
    peso_kg      DECIMAL(5,1) NULL,             -- NULL = sin peso (ej: abdominales)
    observaciones VARCHAR(255) NULL,
    UNIQUE (id_rutina, dia, orden),
    FOREIGN KEY (id_rutina)    REFERENCES rutinas (id_rutina) ON DELETE CASCADE,
    FOREIGN KEY (id_ejercicio) REFERENCES ejercicios (id_ejercicio)
);

-- ---------------------------------------------------------------------
-- PUNTOS Y PREMIOS
-- ---------------------------------------------------------------------
-- Catálogo de premios canjeables.
CREATE TABLE premios (
    id_premio    INT PRIMARY KEY AUTO_INCREMENT,
    nombre       VARCHAR(100) NOT NULL,
    descripcion  TEXT NULL,
    valor_puntos INT NOT NULL CHECK (valor_puntos > 0),
    stock        INT NULL,                      -- NULL = ilimitado
    activo       TINYINT NOT NULL DEFAULT 1
);

-- Canjes realizados por los alumnos.
CREATE TABLE canjes (
    id_canje      INT PRIMARY KEY AUTO_INCREMENT,
    id_usuario    INT NOT NULL,
    id_premio     INT NOT NULL,
    puntos_usados INT NOT NULL,
    estado        ENUM('pendiente', 'entregado') NOT NULL DEFAULT 'pendiente',
    fecha         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_usuario) REFERENCES usuarios (id_usuario),
    FOREIGN KEY (id_premio)  REFERENCES premios (id_premio)
);

-- Historial de todo movimiento de puntos (suma o resta).
CREATE TABLE movimientos_puntos (
    id_movimiento  INT PRIMARY KEY AUTO_INCREMENT,
    id_usuario     INT NOT NULL,
    cantidad       INT NOT NULL,                -- positivo suma, negativo resta
    motivo         ENUM('asistencia', 'canje', 'ajuste', 'bienvenida', 'cumpleanios') NOT NULL,
    descripcion    VARCHAR(255) NULL,
    registrado_por INT NULL,
    fecha          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_usuario)     REFERENCES usuarios (id_usuario),
    FOREIGN KEY (registrado_por) REFERENCES usuarios (id_usuario)
);

-- ---------------------------------------------------------------------
-- CONFIGURACIÓN GENERAL (valores que el admin puede modificar)
-- ---------------------------------------------------------------------
CREATE TABLE configuracion (
    clave       VARCHAR(50) PRIMARY KEY,
    valor       VARCHAR(100) NOT NULL,
    descripcion VARCHAR(255) NULL
);

-- =====================================================================
-- DATOS INICIALES
-- =====================================================================
INSERT INTO rol (id_rol, descripcion) VALUES
(1, 'administrador'),
(2, 'profesor'),
(3, 'alumno');

INSERT INTO usuarios (dni, nombre, apellido, mail, password_hash, id_rol)
VALUES (
    11111111,
    'Admin',
    'FitnessPro',
    'fitnesspro.pps@gmail.com',
    '$2b$10$zTwA8fhPqZtDhfIwgG77e.5b/FfsucIyuN2/ANPZAsKOGQzqbzRrm',
    1
);

INSERT INTO configuracion (clave, valor, descripcion) VALUES
('puntos_por_asistencia',      '10',  'Puntos que suma el alumno por cada asistencia'),
('puntos_bienvenida',          '500', 'Puntos de regalo para cada alumno nuevo'),
('puntos_cumpleanios',         '200', 'Puntos de regalo el día del cumpleaños del alumno'),
('margen_ingreso_minutos',     '10',  'Minutos antes/después del inicio en que el molinete permite ingresar'),
('limite_reserva_minutos',     '1',   'Minutos antes del inicio hasta los que se puede reservar'),
('limite_cancelacion_minutos', '120', 'Minutos antes del inicio hasta los que se puede cancelar'),
('dias_visibles_turnos',       '7',   'Días que ve el alumno en la grilla (hoy + 6)');

-- Verificación
SELECT id_usuario, mail, id_rol, LENGTH(password_hash) AS largo_hash FROM usuarios;
