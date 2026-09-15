/** Barra superior: titulo, identificador de la partida, temporizador y boton para terminar. */

import { Partida } from '../types/juego';

interface Props {
  partida: Partida;
  onTerminar: () => void;
}

/** Convierte milisegundos a un texto mm:ss. */
function formatearTiempo(milisegundos: number): string {
  const totalSegundos = Math.ceil(milisegundos / 1000);
  const minutos = Math.floor(totalSegundos / 60);
  const segundos = totalSegundos % 60;
  return `${minutos}:${segundos.toString().padStart(2, '0')}`;
}

export function BarraSuperior({ partida, onTerminar }: Props) {
  const quedaPocoTiempo = partida.tiempoRestanteMs <= 15_000;

  return (
    <header className="barra-superior">
      <div className="barra-izquierda">
        <span className="barra-titulo">
          MONITOS <span>EN FUGA</span>
        </span>
        <span className="barra-id">
          partida <strong data-testid="id-partida">{partida.id}</strong>
        </span>
      </div>

      <div className={`temporizador ${quedaPocoTiempo ? 'temporizador-alerta' : ''}`}>
        <span className="temporizador-etiqueta">Tiempo restante</span>
        <span className="temporizador-valor" data-testid="temporizador">
          {formatearTiempo(partida.tiempoRestanteMs)}
        </span>
      </div>

      <div className="barra-derecha">
        <span className="estado-partida" data-testid="estado-partida">
          {partida.estado === 'en_curso' ? 'En juego' : 'Terminada'}
        </span>
        <button className="boton-secundario" onClick={onTerminar} data-testid="boton-terminar">
          Terminar partida
        </button>
      </div>
    </header>
  );
}
