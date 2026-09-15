/** Pantalla final: ganador, puntajes y motivo por el que termino la partida. */

import { MotivoFin, Partida } from '../types/juego';

interface Props {
  partida: Partida;
  onJugarDeNuevo: () => void;
  cargando: boolean;
}

const TEXTOS_MOTIVO: Record<MotivoFin, string> = {
  ko: 'Un mono se quedo sin vida.',
  tiempo: 'Se acabo el tiempo: el incendio consumio la jungla.',
  abandono: 'Los monos terminaron la partida antes de tiempo.'
};

export function PantallaResultado({ partida, onJugarDeNuevo, cargando }: Props) {
  const { p1, p2 } = partida.jugadores;

  const textoGanador =
    partida.ganador === 'empate' || partida.ganador === null
      ? 'Empate'
      : `Gana ${partida.jugadores[partida.ganador].nombre}`;

  return (
    <div className="capa-resultado" data-testid="pantalla-resultado">
      <div className="tarjeta-resultado">
        <h2>Fin de la partida</h2>
        <p className="resultado-ganador" data-testid="ganador">
          {textoGanador}
        </p>
        <p className="resultado-motivo" data-testid="motivo-fin">
          {partida.motivoFin ? TEXTOS_MOTIVO[partida.motivoFin] : ''}
        </p>

        <table className="tabla-resultado">
          <thead>
            <tr>
              <th>Mono</th>
              <th>Puntos</th>
              <th>Vida</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>{p1.nombre}</td>
              <td data-testid="puntos-final-p1">{p1.puntos}</td>
              <td>{p1.vida}</td>
            </tr>
            <tr>
              <td>{p2.nombre}</td>
              <td data-testid="puntos-final-p2">{p2.puntos}</td>
              <td>{p2.vida}</td>
            </tr>
          </tbody>
        </table>

        <button
          className="boton-principal"
          onClick={onJugarDeNuevo}
          disabled={cargando}
          data-testid="boton-reiniciar"
        >
          {cargando ? 'Creando partida...' : 'Jugar de nuevo'}
        </button>
      </div>
    </div>
  );
}
