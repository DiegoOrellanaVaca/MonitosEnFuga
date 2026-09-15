/**
 * Componente principal de Monitos en Fuga.
 *
 * Responsabilidades:
 *  - decidir que pantalla se muestra (inicio, juego o resultado);
 *  - escuchar el teclado de los dos jugadores y enviar cada accion al backend;
 *  - pedir el estado de la partida cada medio segundo para ver el tiempo,
 *    el incendio, los arboles y la comida que genera el servidor.
 *
 * Las reglas no estan aqui: el servidor decide si una accion es valida y cual
 * es el nuevo estado. React solo dibuja lo que recibe.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { crearPartida, enviarAccion, obtenerPartida, terminarPartida } from './api';
import { Accion, Direccion, IdJugador, Partida } from './types/juego';
import { Arena } from './components/Arena';
import { BarraSuperior } from './components/BarraSuperior';
import { PanelJugador, Teclas } from './components/PanelJugador';
import { PantallaInicio } from './components/PantallaInicio';
import { PantallaResultado } from './components/PantallaResultado';

type Pantalla = 'inicio' | 'juego' | 'resultado';

/** Cada cuanto se le pide el estado al servidor. */
const INTERVALO_SINCRONIZACION_MS = 500;
/** Cada cuanto se repite el movimiento mientras una tecla sigue presionada. */
const INTERVALO_MOVIMIENTO_MS = 130;

const TECLAS_MOVIMIENTO: Record<string, { jugador: IdJugador; direccion: Direccion }> = {
  KeyW: { jugador: 'p1', direccion: 'arriba' },
  KeyS: { jugador: 'p1', direccion: 'abajo' },
  KeyA: { jugador: 'p1', direccion: 'izquierda' },
  KeyD: { jugador: 'p1', direccion: 'derecha' },
  ArrowUp: { jugador: 'p2', direccion: 'arriba' },
  ArrowDown: { jugador: 'p2', direccion: 'abajo' },
  ArrowLeft: { jugador: 'p2', direccion: 'izquierda' },
  ArrowRight: { jugador: 'p2', direccion: 'derecha' }
};

const TECLAS_ACCION: Record<string, { jugador: IdJugador; tipo: 'atacar' | 'defender' }> = {
  KeyF: { jugador: 'p1', tipo: 'atacar' },
  KeyG: { jugador: 'p1', tipo: 'defender' },
  KeyL: { jugador: 'p2', tipo: 'atacar' },
  KeyK: { jugador: 'p2', tipo: 'defender' }
};

const TECLAS_P1: Teclas = { mover: 'W A S D', golpear: 'F', hojas: 'G' };
const TECLAS_P2: Teclas = { mover: '← ↑ ↓ →', golpear: 'L', hojas: 'K' };

export default function App() {
  const [pantalla, setPantalla] = useState<Pantalla>('inicio');
  const [idPartida, setIdPartida] = useState<string | null>(null);
  const [partida, setPartida] = useState<Partida | null>(null);
  const [cargando, setCargando] = useState(false);
  const [errorConexion, setErrorConexion] = useState<string | null>(null);

  /** Momento de la peticion cuyo estado se esta mostrando, para no pintar respuestas viejas. */
  const marcaUltimoEstado = useRef(0);
  /** Evita acumular peticiones del mismo jugador si el servidor tarda en responder. */
  const enviandoAccion = useRef<Record<IdJugador, boolean>>({ p1: false, p2: false });

  const aplicarEstado = useCallback((nueva: Partida | null, marca: number) => {
    if (!nueva || marca < marcaUltimoEstado.current) return;

    marcaUltimoEstado.current = marca;
    setPartida(nueva);
    setErrorConexion(null);
    if (nueva.estado === 'terminada') {
      setPantalla('resultado');
    }
  }, []);

  const iniciarPartida = useCallback(async () => {
    setCargando(true);
    setErrorConexion(null);
    try {
      const nueva = await crearPartida();
      marcaUltimoEstado.current = Date.now();
      setPartida(nueva);
      setIdPartida(nueva.id);
      setPantalla('juego');
    } catch {
      setErrorConexion('No se pudo conectar con el servidor. Revisa que Express este encendido.');
    } finally {
      setCargando(false);
    }
  }, []);

  const enviar = useCallback(
    async (accion: Accion) => {
      if (!idPartida || enviandoAccion.current[accion.jugador]) return;

      enviandoAccion.current[accion.jugador] = true;
      const marca = Date.now();
      try {
        const respuesta = await enviarAccion(idPartida, accion);
        aplicarEstado(respuesta.partida, marca);
      } catch {
        setErrorConexion('Se perdio la conexion con el servidor.');
      } finally {
        enviandoAccion.current[accion.jugador] = false;
      }
    },
    [idPartida, aplicarEstado]
  );

  const terminar = useCallback(async () => {
    if (!idPartida) return;
    try {
      const finalizada = await terminarPartida(idPartida);
      aplicarEstado(finalizada, Date.now());
    } catch {
      setErrorConexion('No se pudo terminar la partida.');
    }
  }, [idPartida, aplicarEstado]);

  // Teclado de los dos jugadores.
  useEffect(() => {
    if (pantalla !== 'juego') return;

    const teclasPresionadas = new Set<string>();

    const alPresionar = (evento: KeyboardEvent) => {
      const esTeclaDelJuego = TECLAS_MOVIMIENTO[evento.code] || TECLAS_ACCION[evento.code];
      if (!esTeclaDelJuego) return;
      evento.preventDefault();

      if (TECLAS_MOVIMIENTO[evento.code]) {
        teclasPresionadas.add(evento.code);
        return;
      }

      // Atacar y defender se envian una sola vez por pulsacion.
      const accion = TECLAS_ACCION[evento.code];
      if (!evento.repeat) {
        enviar({ jugador: accion.jugador, tipo: accion.tipo });
      }
    };

    const alSoltar = (evento: KeyboardEvent) => {
      teclasPresionadas.delete(evento.code);
    };

    const temporizador = window.setInterval(() => {
      teclasPresionadas.forEach((codigo) => {
        const movimiento = TECLAS_MOVIMIENTO[codigo];
        enviar({ jugador: movimiento.jugador, tipo: 'mover', direccion: movimiento.direccion });
      });
    }, INTERVALO_MOVIMIENTO_MS);

    window.addEventListener('keydown', alPresionar);
    window.addEventListener('keyup', alSoltar);

    return () => {
      window.clearInterval(temporizador);
      window.removeEventListener('keydown', alPresionar);
      window.removeEventListener('keyup', alSoltar);
    };
  }, [pantalla, enviar]);

  // Sincronizacion periodica con el servidor (tiempo, incendio, arboles, comida).
  useEffect(() => {
    if (pantalla !== 'juego' || !idPartida) return;

    const temporizador = window.setInterval(async () => {
      const marca = Date.now();
      try {
        const actual = await obtenerPartida(idPartida);
        aplicarEstado(actual, marca);
      } catch {
        setErrorConexion('Se perdio la conexion con el servidor.');
      }
    }, INTERVALO_SINCRONIZACION_MS);

    return () => window.clearInterval(temporizador);
  }, [pantalla, idPartida, aplicarEstado]);

  if (pantalla === 'inicio' || !partida) {
    return <PantallaInicio onIniciar={iniciarPartida} cargando={cargando} error={errorConexion} />;
  }

  return (
    <div className="aplicacion">
      <BarraSuperior partida={partida} onTerminar={terminar} />

      <main className="zona-juego">
        <Arena partida={partida} />
      </main>

      <footer className="pie-juego">
        <PanelJugador jugador={partida.jugadores.p1} teclas={TECLAS_P1} />
        <PanelJugador jugador={partida.jugadores.p2} teclas={TECLAS_P2} />
      </footer>

      {errorConexion && (
        <p className="mensaje-error aviso-conexion" data-testid="error-conexion">
          {errorConexion}
        </p>
      )}

      {pantalla === 'resultado' && (
        <PantallaResultado partida={partida} onJugarDeNuevo={iniciarPartida} cargando={cargando} />
      )}
    </div>
  );
}
