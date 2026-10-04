import { useCallback, useEffect, useState } from 'react';
import api, { mensajeDeError } from '../../services/api';
import Aviso from './Aviso';

const ROLES = { 1: 'Administrador', 2: 'Profesor', 3: 'Alumno' };
const FORM_VACIO = { dni: '', nombre: '', apellido: '', mail: '', id_rol: '3' };

// Admin: gestiona todos los usuarios y puede crear profesores y administradores.
// Profesor: solo ve y crea alumnos.
export default function UsuariosGestion({ esAdmin }) {
  const [usuarios, setUsuarios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [aviso, setAviso] = useState(null);

  const [buscar, setBuscar] = useState('');
  const [rol, setRol] = useState(esAdmin ? '' : '3');
  const [verInactivos, setVerInactivos] = useState(false);

  const [form, setForm] = useState(FORM_VACIO);
  const [guardando, setGuardando] = useState(false);

  const [editando, setEditando] = useState(null); // { id_usuario, nombre, apellido, mail, dni }

  const cargar = useCallback(async () => {
    try {
      const params = {};
      if (buscar.trim()) params.buscar = buscar.trim();
      if (!esAdmin) params.rol = 3;
      else if (rol) params.rol = rol;
      if (verInactivos) params.incluirInactivos = 1;

      const { data } = await api.get('/usuarios', { params });
      setUsuarios(data);
    } catch (error) {
      setAviso({ tipo: 'error', texto: mensajeDeError(error) });
    } finally {
      setCargando(false);
    }
  }, [buscar, rol, verInactivos, esAdmin]);

  // Espera 300 ms después de la última tecla antes de buscar
  useEffect(() => {
    const espera = setTimeout(cargar, 300);
    return () => clearTimeout(espera);
  }, [cargar]);

  const cambiarForm = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const crear = async (e) => {
    e.preventDefault();
    setGuardando(true);
    setAviso(null);
    try {
      const cuerpo = {
        dni: form.dni.trim(),
        nombre: form.nombre.trim(),
        apellido: form.apellido.trim(),
        mail: form.mail.trim().toLowerCase(),
      };
      if (esAdmin) cuerpo.id_rol = Number(form.id_rol);

      const { data } = await api.post('/usuarios', cuerpo);
      setAviso({ tipo: 'ok', texto: data.mensaje });
      setForm(FORM_VACIO);
      cargar();
    } catch (error) {
      setAviso({ tipo: 'error', texto: mensajeDeError(error) });
    } finally {
      setGuardando(false);
    }
  };

  const guardarEdicion = async () => {
    try {
      const { id_usuario, ...datos } = editando;
      await api.put(`/usuarios/${id_usuario}`, datos);
      setAviso({ tipo: 'ok', texto: 'Datos actualizados.' });
      setEditando(null);
      cargar();
    } catch (error) {
      setAviso({ tipo: 'error', texto: mensajeDeError(error) });
    }
  };

  const cambiarEstado = async (usuario) => {
    try {
      const { data } = usuario.activo
        ? await api.delete(`/usuarios/${usuario.id_usuario}`)
        : await api.put(`/usuarios/${usuario.id_usuario}/reactivar`);
      setAviso({ tipo: 'ok', texto: data.mensaje });
      cargar();
    } catch (error) {
      setAviso({ tipo: 'error', texto: mensajeDeError(error) });
    }
  };

  const cambiarEdicion = (e) => setEditando((d) => ({ ...d, [e.target.name]: e.target.value }));

  return (
    <>
      <Aviso aviso={aviso} onCerrar={() => setAviso(null)} />

      <section className="seccion">
        <h2 className="seccion__titulo">{esAdmin ? 'Nuevo usuario' : 'Nuevo alumno'}</h2>
        <p className="seccion__ayuda">
          La contraseña inicial es el DNI. Al ingresar por primera vez, el sistema le pide que la cambie
          y que complete el resto de sus datos.
        </p>

        <form className="form" onSubmit={crear}>
          <label className="campo">
            DNI
            <input name="dni" inputMode="numeric" value={form.dni} onChange={cambiarForm} required />
          </label>
          <label className="campo">
            Nombre
            <input name="nombre" value={form.nombre} onChange={cambiarForm} required />
          </label>
          <label className="campo">
            Apellido
            <input name="apellido" value={form.apellido} onChange={cambiarForm} required />
          </label>
          <label className="campo">
            Correo electrónico
            <input name="mail" type="email" value={form.mail} onChange={cambiarForm} required />
          </label>
          {esAdmin && (
            <label className="campo">
              Rol
              <select name="id_rol" value={form.id_rol} onChange={cambiarForm}>
                <option value="3">Alumno</option>
                <option value="2">Profesor</option>
                <option value="1">Administrador</option>
              </select>
            </label>
          )}
          <div className="form__acciones">
            <button type="submit" className="btn" disabled={guardando}>
              {guardando ? 'Creando…' : esAdmin ? 'Crear usuario' : 'Crear alumno'}
            </button>
          </div>
        </form>
      </section>

      <section className="seccion">
        <h2 className="seccion__titulo">{esAdmin ? 'Usuarios' : 'Alumnos'}</h2>

        <div className="form form--compacto" style={{ marginBottom: 16 }}>
          <label className="campo">
            Buscar
            <input
              placeholder="Nombre, apellido, DNI o correo"
              value={buscar}
              onChange={(e) => setBuscar(e.target.value)}
            />
          </label>
          {esAdmin && (
            <label className="campo">
              Rol
              <select value={rol} onChange={(e) => setRol(e.target.value)}>
                <option value="">Todos</option>
                <option value="3">Alumnos</option>
                <option value="2">Profesores</option>
                <option value="1">Administradores</option>
              </select>
            </label>
          )}
          <div className="casillas">
            <label>
              <input type="checkbox" checked={verInactivos} onChange={(e) => setVerInactivos(e.target.checked)} />
              Mostrar dados de baja
            </label>
          </div>
        </div>

        {cargando ? (
          <p className="cargando">Cargando…</p>
        ) : (
          <div className="tabla-contenedor">
            <table className="tabla">
              <thead>
                <tr>
                  <th>Apellido y nombre</th>
                  <th>DNI</th>
                  <th>Correo</th>
                  {esAdmin && <th>Rol</th>}
                  <th>Puntos</th>
                  <th>Estado</th>
                  <th aria-label="Acciones" />
                </tr>
              </thead>
              <tbody>
                {usuarios.length === 0 && (
                  <tr>
                    <td colSpan={esAdmin ? 7 : 6} className="tabla__vacia">
                      No hay usuarios que coincidan con la búsqueda.
                    </td>
                  </tr>
                )}

                {usuarios.map((u) =>
                  editando?.id_usuario === u.id_usuario ? (
                    <tr key={u.id_usuario}>
                      <td>
                        <input className="input-tabla" name="apellido" value={editando.apellido} onChange={cambiarEdicion} aria-label="Apellido" />
                        <input className="input-tabla" name="nombre" value={editando.nombre} onChange={cambiarEdicion} aria-label="Nombre" style={{ marginTop: 6 }} />
                      </td>
                      <td>
                        <input className="input-tabla" name="dni" value={editando.dni} onChange={cambiarEdicion} aria-label="DNI" />
                      </td>
                      <td>
                        <input className="input-tabla" name="mail" type="email" value={editando.mail} onChange={cambiarEdicion} aria-label="Correo" />
                      </td>
                      {esAdmin && <td>{ROLES[u.id_rol]}</td>}
                      <td>{u.puntos}</td>
                      <td />
                      <td>
                        <div className="tabla__acciones">
                          <button type="button" className="btn btn--chico" onClick={guardarEdicion}>Guardar</button>
                          <button type="button" className="btn btn--chico btn--secundario" onClick={() => setEditando(null)}>Cancelar</button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    <tr key={u.id_usuario} className={u.activo ? '' : 'is-inactivo'}>
                      <td>{u.apellido}, {u.nombre}</td>
                      <td>{u.dni}</td>
                      <td>{u.mail}</td>
                      {esAdmin && <td>{ROLES[u.id_rol]}</td>}
                      <td>{u.puntos}</td>
                      <td>
                        <span className={`estado${u.activo ? '' : ' estado--off'}`}>
                          {u.activo ? 'Activo' : 'De baja'}
                        </span>
                      </td>
                      <td>
                        <div className="tabla__acciones">
                          <button
                            type="button"
                            className="btn btn--chico btn--secundario"
                            onClick={() => setEditando({
                              id_usuario: u.id_usuario, nombre: u.nombre, apellido: u.apellido, mail: u.mail, dni: String(u.dni),
                            })}
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            className={`btn btn--chico ${u.activo ? 'btn--peligro' : 'btn--secundario'}`}
                            onClick={() => cambiarEstado(u)}
                          >
                            {u.activo ? 'Dar de baja' : 'Reactivar'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}