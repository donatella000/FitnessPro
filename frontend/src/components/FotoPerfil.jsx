import { useEffect, useRef, useState } from 'react';
import api, { mensajeDeError } from '../services/api';
import { fotoCuadrada, leerArchivo } from '../utils/imagenes';
import '../styles/FotoPerfil.css';

// En celulares y tablets la cámara se abre directamente desde el selector de archivos.
// En la computadora se usa la cámara web con una vista previa.
const esPantallaTactil = () => window.matchMedia?.('(pointer: coarse)').matches;

// Foto de perfil: elegir una imagen del dispositivo o sacar una en el momento
export default function FotoPerfil({ idUsuario, foto, nombre, onCambio }) {
  const [vista, setVista] = useState(foto || null);
  const [aviso, setAviso] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [camaraAbierta, setCamaraAbierta] = useState(false);

  const inputArchivo = useRef(null);
  const inputCamara = useRef(null);
  const video = useRef(null);
  const flujo = useRef(null);

  useEffect(() => setVista(foto || null), [foto]);

  const apagarCamara = () => {
    flujo.current?.getTracks().forEach((pista) => pista.stop());
    flujo.current = null;
    setCamaraAbierta(false);
  };

  // Apaga la cámara si se sale de la pantalla con la cámara prendida
  useEffect(() => () => flujo.current?.getTracks().forEach((pista) => pista.stop()), []);

  const guardar = async (dataUrl) => {
    setGuardando(true);
    setAviso(null);
    try {
      await api.put(`/usuarios/${idUsuario}/foto`, { foto: dataUrl });
      setVista(dataUrl);
      onCambio?.(dataUrl);
      setAviso({ tipo: 'ok', texto: 'Foto actualizada.' });
    } catch (error) {
      setAviso({ tipo: 'error', texto: mensajeDeError(error) });
    } finally {
      setGuardando(false);
    }
  };

  const alElegirArchivo = async (e) => {
    const archivo = e.target.files?.[0];
    e.target.value = '';
    if (!archivo) return;
    if (!archivo.type.startsWith('image/')) {
      setAviso({ tipo: 'error', texto: 'El archivo elegido no es una imagen.' });
      return;
    }
    try {
      const dataUrl = await leerArchivo(archivo);
      await guardar(await fotoCuadrada(dataUrl));
    } catch (error) {
      setAviso({ tipo: 'error', texto: error.message });
    }
  };

  const sacarFoto = async () => {
    setAviso(null);
    if (esPantallaTactil() || !navigator.mediaDevices?.getUserMedia) {
      inputCamara.current?.click();
      return;
    }
    try {
      flujo.current = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
      setCamaraAbierta(true);
      // Se espera a que el <video> exista para conectarle la cámara
      requestAnimationFrame(() => {
        if (video.current) video.current.srcObject = flujo.current;
      });
    } catch {
      setAviso({
        tipo: 'error',
        texto: 'No se pudo usar la cámara. Revisá que el navegador tenga permiso para usarla, o elegí una imagen.',
      });
    }
  };

  const capturar = async () => {
    const dataUrl = await fotoCuadrada(video.current);
    apagarCamara();
    await guardar(dataUrl);
  };

  const quitar = async () => {
    if (!window.confirm('¿Quitar tu foto de perfil?')) return;
    setGuardando(true);
    try {
      await api.delete(`/usuarios/${idUsuario}/foto`);
      setVista(null);
      onCambio?.(null);
      setAviso({ tipo: 'ok', texto: 'Foto eliminada.' });
    } catch (error) {
      setAviso({ tipo: 'error', texto: mensajeDeError(error) });
    } finally {
      setGuardando(false);
    }
  };

  const inicial = (nombre || '?').charAt(0).toUpperCase();

  return (
    <div className="foto-perfil">
      <div className="foto-perfil__marco">
        {camaraAbierta ? (
          <video ref={video} className="foto-perfil__video" autoPlay playsInline muted />
        ) : vista ? (
          <img src={vista} alt="Tu foto de perfil" className="foto-perfil__imagen" />
        ) : (
          <span className="foto-perfil__inicial" aria-hidden="true">{inicial}</span>
        )}
      </div>

      <div className="foto-perfil__acciones">
        {camaraAbierta ? (
          <>
            <button type="button" className="btn" onClick={capturar}>Sacar foto</button>
            <button type="button" className="btn btn--secundario" onClick={apagarCamara}>Cancelar</button>
          </>
        ) : (
          <>
            <button type="button" className="btn" onClick={() => inputArchivo.current?.click()} disabled={guardando}>
              Elegir imagen
            </button>
            <button type="button" className="btn btn--secundario" onClick={sacarFoto} disabled={guardando}>
              Sacar una foto
            </button>
            {vista && (
              <button type="button" className="btn btn--peligro" onClick={quitar} disabled={guardando}>
                Quitar foto
              </button>
            )}
          </>
        )}
        {guardando && <span className="foto-perfil__estado">Guardando…</span>}
        {aviso && <span className={`foto-perfil__estado foto-perfil__estado--${aviso.tipo}`}>{aviso.texto}</span>}
      </div>

      <input ref={inputArchivo} type="file" accept="image/*" hidden onChange={alElegirArchivo} />
      {/* En el celular, "capture" abre la cámara frontal directamente */}
      <input ref={inputCamara} type="file" accept="image/*" capture="user" hidden onChange={alElegirArchivo} />
    </div>
  );
}
