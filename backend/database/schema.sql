DROP DATABASE IF EXISTS gimnasio;
CREATE DATABASE gimnasio;
USE gimnasio;

CREATE TABLE rol (
	id_rol INT PRIMARY KEY AUTO_INCREMENT,
    descripcion TEXT NOT NULL
);

CREATE TABLE canjes(
	id_producto INT PRIMARY KEY AUTO_INCREMENT,
    descripcion TEXT NOT NULL,
    valor_puntos INT NOT NULL
);

CREATE TABLE clases(
	id_clase INT PRIMARY KEY AUTO_INCREMENT,
    descripcion TEXT NOT NULL,
    nombre_profesor VARCHAR (50)
);

CREATE TABLE horarios_clase (
	id_horario INT PRIMARY KEY AUTO_INCREMENT,
    id_clase INT NOT NULL,
    dia_semana VARCHAR (20) NOT NULL,
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,
    cupo_libre INT NOT NULL,
    FOREIGN KEY (id_clase) REFERENCES clases (id_clase)
);

CREATE TABLE suscripcion (
	id_suscripcion INT PRIMARY KEY AUTO_INCREMENT,
    descripcion TEXT NOT NULL,
    precio INT NOT NULL,
    id_clase INT NOT NULL,
    recargo DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    fecha_limite DATE NOT NULL,
    veces_por_mes INT NOT NULL,
    FOREIGN KEY (id_clase) REFERENCES clases (id_clase)
);

CREATE TABLE usuarios (
	id_usuario INT PRIMARY KEY AUTO_INCREMENT,
    dni INT NOT NULL UNIQUE,
    nombre VARCHAR (50) NOT NULL,
    apellido VARCHAR (50) NOT NULL,
    password_hash VARCHAR(255) NOT NULL, 
    id_rol INT NOT NULL,
	mail VARCHAR (100) NOT NULL UNIQUE,
    caracteristica_cel INT NOT NULL,
    celular INT NOT NULL,
    calle VARCHAR (50) NOT NULL,
    numero INT NOT NULL,
    fecha_registro DATE NOT NULL,
    caracteristica INT NOT NULL,
    contacto_emergencia INT NOT NULL,
    puntos INT NOT NULL DEFAULT 0,
    id_suscripcion INT NULL,
    FOREIGN KEY (id_rol) REFERENCES rol (id_rol),
    FOREIGN KEY (id_suscripcion) REFERENCES suscripcion (id_suscripcion)

);    

CREATE TABLE ejercicios(
	id_ejercicios INT PRIMARY KEY AUTO_INCREMENT,
    grupo_muscular TEXT NOT NULL,
    descripcion VARCHAR (50)
);

CREATE TABLE turnos (
	id_turno INT PRIMARY KEY AUTO_INCREMENT,
    id_usuario INT NOT NULL,
    id_horario INT NOT NULL,
    asistio TINYINT NOT NULL,
    FOREIGN KEY (id_usuario) REFERENCES usuarios (id_usuario),
    FOREIGN KEY (id_horario) REFERENCES horarios_clase (id_horario)
);


CREATE TABLE rutina (
	id_rutina INT PRIMARY KEY AUTO_INCREMENT,
    id_usuario INT NOT NULL,
    dia INT NOT NULL,
    id_ejercicio_1 INT NOT NULL,
    repeticiones_1 INT NOT NULL,
    series_1 INT NOT NULL,
	peso_1 INT NOT NULL,
    id_ejercicio_2 INT NOT NULL,
    repeticiones_2 INT NOT NULL,
    series_2 INT NOT NULL,
	peso_2 INT NOT NULL,
    id_ejercicio_3 INT NOT NULL,
    repeticiones_3 INT NOT NULL,
    series_3 INT NOT NULL,
	peso_3 INT NOT NULL,
    id_ejercicio_4 INT NOT NULL,
    repeticiones_4 INT NOT NULL,
    series_4 INT NOT NULL,
	peso_4 INT NOT NULL,
    id_ejercicio_5 INT NOT NULL,
    repeticiones_5 INT NOT NULL,
    series_5 INT NOT NULL,
	peso_5 INT NOT NULL,
    id_ejercicio_6 INT NOT NULL,
    repeticiones_6 INT NOT NULL,
    series_6 INT NOT NULL,
	peso_6 INT NOT NULL,
    id_ejercicio_7 INT NOT NULL,
    repeticiones_7 INT NOT NULL,
    series_7 INT NOT NULL,
	peso_7 INT NOT NULL,
    id_ejercicio_8 INT NOT NULL, 
	repeticiones_8 INT NOT NULL,
	series_8 INT NOT NULL, 
	peso_8 INT NOT NULL,
    FOREIGN KEY (id_usuario) REFERENCES usuarios (id_usuario),
    FOREIGN KEY (id_ejercicio_1) REFERENCES ejercicios (id_ejercicios),
    FOREIGN KEY (id_ejercicio_2) REFERENCES ejercicios (id_ejercicios),
    FOREIGN KEY (id_ejercicio_3) REFERENCES ejercicios (id_ejercicios),
    FOREIGN KEY (id_ejercicio_4) REFERENCES ejercicios (id_ejercicios),
    FOREIGN KEY (id_ejercicio_5) REFERENCES ejercicios (id_ejercicios),
    FOREIGN KEY (id_ejercicio_6) REFERENCES ejercicios (id_ejercicios),
    FOREIGN KEY (id_ejercicio_7) REFERENCES ejercicios (id_ejercicios),
    FOREIGN KEY (id_ejercicio_8) REFERENCES ejercicios (id_ejercicios)
);

CREATE TABLE pagos (
	id_pagos INT PRIMARY KEY AUTO_INCREMENT,
    id_usuario INT NOT NULL,
    id_suscripcion INT NOT NULL,
    fecha_inicio_validez DATE NOT NULL,
    fecha_pago DATE NOT NULL,
    fecha_fin_validez DATE NOT NULL,
    monto_recargo INT NOT NULL,
    metodo_pago TEXT NOT NULL,
	FOREIGN KEY (id_usuario) REFERENCES usuarios (id_usuario),
    FOREIGN KEY (id_suscripcion) REFERENCES suscripcion (id_suscripcion)
);

INSERT INTO rol (id_rol, descripcion) VALUES
(1, 'administrador'),
(2, 'profesor'),
(3, 'alumno') AS nuevos_valores
ON DUPLICATE KEY UPDATE descripcion = nuevos_valores.descripcion;

SELECT * FROM rol;