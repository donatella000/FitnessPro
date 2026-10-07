import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { mensajeDeError } from '../../services/api';
import Aviso from '../gestion/Aviso';

const CAMPOS = [
  'mail', 'telefono', 'calle', 'numero', 'fecha_nacimiento', 'sexo',
  'contacto_emergencia_nombre', 'contacto_emergencia_tel',
];

// Datos personales del usuario logueado
export default function AlumnoPerfil({ perfil, onGuardado }) {
  const [form, setForm] = useState(null);
  const [aviso, setAviso] = useState(null);
  const [guardando, setGuardando] = useState(false);

  // Cuando llegan los datos, se cargan en el formulario
  useEffect(() => {
    if (!perfil) return;
    const inicial = {};
    CAMPOS.forEach((c) => {
      inicial[c] = perfil[c] ? String(perfil[c]).slice(0, c === 'fecha_nacimiento' ? 10 : undefined) : '';
    });
    setForm(inicial);
  }, [perfil]);

  if (!perfil || !form) return <p className="dash__status">Cargando tus datos…</p>;

  const cambiar = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const guardar = async (e) => {
    e.preventDefault();
    setGuardando(true);
    setAviso(null);
    try {
      await api.put(`/usuarios/${perfil.id_usuario}`, form);
      setAviso({ tipo: 'ok', texto: 'Tus datos se guardaron.' });
      onGuardado();
    } catch (error) {
      setAviso({ tipo: 'error', texto: mensajeDeError(error) });
    } finally {
      setGuardando(false);
    }
  };

  return (
    <section className="alumno__seccion">
      <h2 className="seccion__titulo">Mis datos</h2>
      <p className="seccion__ayuda">
        {perfil.nombre} {perfil.apellido}, DNI {perfil.dni}. Para corregir tu nombre o tu DNI, acercate a recepción.
      </p>

      <Aviso aviso={aviso} onCerrar={() => setAviso(null)} />

      <form className="form" onSubmit={guardar}>
        <label className="campo">
          Correo electrónico
          <input name="mail" type="email" value={form.mail} onChange={cambiar} required />
        </label>
        <label className="campo">
          Teléfono
          <input name="telefono" type="tel" value={form.telefono} onChange={cambiar} placeholder="Ej.: 291 4123456" />
        </label>
        <label className="campo">
          Fecha de nacimiento
          <input name="fecha_nacimiento" type="date" value={form.fecha_nacimiento} onChange={cambiar} />
        </label>
        <label className="campo">
          Sexo
          <select name="sexo" value={form.sexo} onChange={cambiar}>
            <option value="">Elegí una opción</option>
            <option value="F">Femenino</option>
            <option value="M">Masculino</option>
            <option value="Otro">Otro</option>
          </select>
        </label>
        <label className="campo">
          Calle
          <input name="calle" value={form.calle} onChange={cambiar} />
        </label>
        <label className="campo">
          Número
          <input name="numero" value={form.numero} onChange={cambiar} />
        </label>
        <label className="campo">
          Contacto de emergencia
          <input name="contacto_emergencia_nombre" value={form.contacto_emergencia_nombre} onChange={cambiar} placeholder="Nombre" />
        </label>
        <label className="campo">
          Teléfono de emergencia
          <input name="contacto_emergencia_tel" type="tel" value={form.contacto_emergencia_tel} onChange={cambiar} />
        </label>
        <div className="form__acciones">
          <button type="submit" className="btn" disabled={guardando}>
            {guardando ? 'Guardando…' : 'Guardar cambios'}
          </button>
          <Link to="/cambiar-password" className="btn btn--secundario">Cambiar contraseña</Link>
        </div>
      </form>
    </section>
  );
}